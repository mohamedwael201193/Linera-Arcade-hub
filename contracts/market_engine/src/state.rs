// Market Engine State Management
use linera_sdk::views::{MapView, RegisterView, RootView, View};
use market_engine::{Outcome, Position, Resolution, Trade};

const INITIAL_LIQUIDITY: u64 = 100_000_000; // 100 tokens per side

/// Market Engine application state
#[derive(RootView)]
pub struct MarketEngineState {
    /// YES token pool
    pub yes_pool: RegisterView<u64>,
    /// NO token pool
    pub no_pool: RegisterView<u64>,
    /// Total trading volume
    pub total_volume: RegisterView<u64>,
    /// User positions: owner -> Position
    pub positions: MapView<String, Position>,
    /// Resolution data
    pub resolution: RegisterView<Option<Resolution>>,
    /// Next trade ID
    pub next_trade_id: RegisterView<u64>,
    /// Trade history
    pub trades: MapView<u64, Trade>,
}

impl MarketEngineState {
    /// Initialize pools with equal liquidity
    pub fn init_pools(&mut self) {
        self.yes_pool.set(INITIAL_LIQUIDITY);
        self.no_pool.set(INITIAL_LIQUIDITY);
        self.total_volume.set(0);
        self.next_trade_id.set(1);
    }

    /// Calculate YES probability using constant product formula
    pub fn yes_probability(&self) -> f64 {
        let yes = self.yes_pool.get() as f64;
        let no = self.no_pool.get() as f64;
        
        if yes + no == 0.0 {
            return 0.5;
        }
        
        no / (yes + no)
    }

    /// Calculate cost to buy shares (constant product AMM)
    pub fn calculate_buy_cost(&self, outcome: &Outcome, shares: u64) -> u64 {
        let (pool, other_pool) = match outcome {
            Outcome::Yes => (self.yes_pool.get(), self.no_pool.get()),
            Outcome::No => (self.no_pool.get(), self.yes_pool.get()),
        };
        
        // k = yes_pool * no_pool (constant product)
        let k = (pool as u128) * (other_pool as u128);
        
        // New pool after removing shares
        let new_pool = pool.saturating_sub(shares);
        if new_pool == 0 {
            return u64::MAX; // Can't buy all shares
        }
        
        // Calculate required other_pool to maintain k
        let new_other_pool = (k / new_pool as u128) as u64;
        
        // Cost is the increase in other pool
        new_other_pool.saturating_sub(other_pool)
    }

    /// Calculate proceeds from selling shares
    pub fn calculate_sell_proceeds(&self, outcome: &Outcome, shares: u64) -> u64 {
        let (pool, other_pool) = match outcome {
            Outcome::Yes => (self.yes_pool.get(), self.no_pool.get()),
            Outcome::No => (self.no_pool.get(), self.yes_pool.get()),
        };
        
        let k = (pool as u128) * (other_pool as u128);
        let new_pool = pool + shares;
        let new_other_pool = (k / new_pool as u128) as u64;
        
        other_pool.saturating_sub(new_other_pool)
    }

    /// Execute buy
    pub async fn buy(&mut self, owner: &str, outcome: Outcome, shares: u64) -> Result<u64, String> {
        let cost = self.calculate_buy_cost(&outcome, shares);
        
        // Update pools
        match outcome {
            Outcome::Yes => {
                let yes = self.yes_pool.get();
                let no = self.no_pool.get();
                self.yes_pool.set(yes.saturating_sub(shares));
                self.no_pool.set(no + cost);
            }
            Outcome::No => {
                let yes = self.yes_pool.get();
                let no = self.no_pool.get();
                self.yes_pool.set(yes + cost);
                self.no_pool.set(no.saturating_sub(shares));
            }
        }
        
        // Update position
        self.update_position(owner, outcome, shares as i64, cost).await?;
        
        // Update volume
        let vol = self.total_volume.get();
        self.total_volume.set(vol + cost);
        
        Ok(cost)
    }

    /// Execute sell
    pub async fn sell(&mut self, owner: &str, outcome: Outcome, shares: u64) -> Result<u64, String> {
        let proceeds = self.calculate_sell_proceeds(&outcome, shares);
        
        // Check user has shares
        let position = self.get_position(owner).await;
        let current_shares = match outcome {
            Outcome::Yes => position.yes_shares.parse::<u64>().unwrap_or(0),
            Outcome::No => position.no_shares.parse::<u64>().unwrap_or(0),
        };
        
        if current_shares < shares {
            return Err("Insufficient shares".to_string());
        }
        
        // Update pools
        match outcome {
            Outcome::Yes => {
                let yes = self.yes_pool.get();
                let no = self.no_pool.get();
                self.yes_pool.set(yes + shares);
                self.no_pool.set(no.saturating_sub(proceeds));
            }
            Outcome::No => {
                let yes = self.yes_pool.get();
                let no = self.no_pool.get();
                self.yes_pool.set(yes.saturating_sub(proceeds));
                self.no_pool.set(no + shares);
            }
        }
        
        // Update position
        self.update_position(owner, outcome, -(shares as i64), proceeds).await?;
        
        Ok(proceeds)
    }

    /// Update user position
    async fn update_position(
        &mut self,
        owner: &str,
        outcome: Outcome,
        share_delta: i64,
        cost_delta: u64,
    ) -> Result<(), String> {
        let mut pos = self.get_position(owner).await;
        
        match outcome {
            Outcome::Yes => {
                let mut shares = pos.yes_shares.parse::<i64>().unwrap_or(0);
                shares += share_delta;
                pos.yes_shares = shares.max(0).to_string();
            }
            Outcome::No => {
                let mut shares = pos.no_shares.parse::<i64>().unwrap_or(0);
                shares += share_delta;
                pos.no_shares = shares.max(0).to_string();
            }
        }
        
        let mut invested = pos.total_invested.parse::<u64>().unwrap_or(0);
        if share_delta > 0 {
            invested += cost_delta;
        } else {
            invested = invested.saturating_sub(cost_delta);
        }
        pos.total_invested = invested.to_string();
        
        self.positions
            .insert(&owner.to_string(), pos)
            .map_err(|e| format!("Failed to update position: {}", e))?;
        
        Ok(())
    }

    /// Get user position
    async fn get_position(&self, owner: &str) -> Position {
        self.positions
            .get(&owner.to_string())
            .await
            .ok()
            .flatten()
            .unwrap_or(Position {
                owner: owner.to_string(),
                yes_shares: "0".to_string(),
                no_shares: "0".to_string(),
                total_invested: "0".to_string(),
            })
    }

    /// Record trade
    pub async fn record_trade(&mut self, trade: Trade) -> Result<(), String> {
        self.trades
            .insert(&trade.trade_id, trade)
            .map_err(|e| format!("Failed to record trade: {}", e))
    }

    /// Get next trade ID
    pub fn get_next_trade_id(&mut self) -> u64 {
        let id = self.next_trade_id.get();
        self.next_trade_id.set(id + 1);
        id
    }
}
