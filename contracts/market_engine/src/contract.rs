#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use state::MarketEngineState;

use market_engine::{MarketEngineAbi, Operation, Outcome, Resolution, Trade};

pub struct MarketEngineContract {
    state: MarketEngineState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(MarketEngineContract);

impl WithContractAbi for MarketEngineContract {
    type Abi = MarketEngineAbi;
}

impl Contract for MarketEngineContract {
    type Message = ();
    type Parameters = ();
    type InstantiationArgument = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MarketEngineState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MarketEngineContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        self.state.init_pools();
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        let owner = self.runtime.authenticated_signer().expect("Missing signer");
        let timestamp = self.runtime.system_time().micros();
        
        // Check if market is resolved
        if self.state.resolution.get().is_some() {
            if !matches!(operation, Operation::Claim) {
                panic!("Market is resolved, only claims allowed");
            }
        }
        
        match operation {
            Operation::Buy { outcome, max_cost } => {
                let max_cost_u64: u64 = max_cost.parse().expect("Invalid max_cost");
                
                // Calculate shares we can afford
                let mut shares = 1u64;
                loop {
                    let cost = self.state.calculate_buy_cost(&outcome, shares);
                    if cost > max_cost_u64 {
                        shares = shares.saturating_sub(1);
                        break;
                    }
                    if shares > 1_000_000 {
                        break; // Safety limit
                    }
                    shares += 1;
                }
                
                if shares == 0 {
                    return "0".to_string();
                }
                
                let actual_cost = self.state.buy(&owner.to_string(), outcome.clone(), shares)
                    .await
                    .expect("Buy failed");
                
                // Record trade
                let trade = Trade {
                    trade_id: self.state.get_next_trade_id(),
                    trader: owner.to_string(),
                    outcome: format!("{:?}", outcome),
                    shares: shares.to_string(),
                    cost: actual_cost.to_string(),
                    timestamp,
                };
                self.state.record_trade(trade).await.expect("Failed to record trade");
                
                shares.to_string()
            }
            Operation::Sell { outcome, shares } => {
                let shares_u64: u64 = shares.parse().expect("Invalid shares");
                
                let proceeds = self.state.sell(&owner.to_string(), outcome.clone(), shares_u64)
                    .await
                    .expect("Sell failed");
                
                // Record trade
                let trade = Trade {
                    trade_id: self.state.get_next_trade_id(),
                    trader: owner.to_string(),
                    outcome: format!("{:?}", outcome),
                    shares: format!("-{}", shares_u64),
                    cost: proceeds.to_string(),
                    timestamp,
                };
                self.state.record_trade(trade).await.expect("Failed to record trade");
                
                proceeds.to_string()
            }
            Operation::Resolve { winning_outcome } => {
                // TODO: Add admin/oracle check
                let resolution = Resolution {
                    resolved_at: timestamp,
                    winning_outcome,
                    resolver: owner.to_string(),
                };
                
                self.state.resolution.set(Some(resolution));
                "Resolved".to_string()
            }
            Operation::Claim => {
                let resolution = self.state.resolution.get().expect("Market not resolved");
                
                // Get user position
                let position = self.state.positions
                    .get(&owner.to_string())
                    .await
                    .ok()
                    .flatten()
                    .unwrap_or_default();
                
                let payout = if resolution.winning_outcome == "Yes" {
                    position.yes_shares.parse::<u64>().unwrap_or(0)
                } else if resolution.winning_outcome == "No" {
                    position.no_shares.parse::<u64>().unwrap_or(0)
                } else {
                    // Invalid - refund all shares
                    position.yes_shares.parse::<u64>().unwrap_or(0)
                        + position.no_shares.parse::<u64>().unwrap_or(0)
                };
                
                // Clear position
                self.state.positions.remove(&owner.to_string()).ok();
                
                payout.to_string()
            }
        }
    }

    async fn execute_message(&mut self, _message: ()) {}

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
