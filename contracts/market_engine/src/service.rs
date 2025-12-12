#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptyMutation, EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};
use state::MarketEngineState;
use std::sync::Arc;

use market_engine::{MarketEngineAbi, MarketState, Position, Trade};

pub struct MarketEngineService {
    state: Arc<MarketEngineState>,
}

linera_sdk::service!(MarketEngineService);

impl WithServiceAbi for MarketEngineService {
    type Abi = MarketEngineAbi;
}

impl Service for MarketEngineService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = MarketEngineState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MarketEngineService {
            state: Arc::new(state),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<MarketEngineState>,
}

#[Object]
impl QueryRoot {
    /// Get current market state
    async fn market_state(&self) -> MarketState {
        MarketState {
            yes_pool: self.state.yes_pool.get().to_string(),
            no_pool: self.state.no_pool.get().to_string(),
            total_volume: self.state.total_volume.get().to_string(),
            yes_probability: self.state.yes_probability(),
            is_resolved: self.state.resolution.get().is_some(),
            resolution: self.state.resolution.get(),
        }
    }

    /// Get user position
    async fn position(&self, owner: String) -> Option<Position> {
        self.state.positions
            .get(&owner)
            .await
            .ok()
            .flatten()
    }

    /// Get all trades
    async fn trades(&self) -> Vec<Trade> {
        let mut trades = Vec::new();
        
        self.state.trades
            .for_each_index_value(|_id, trade| {
                trades.push(trade.clone());
                Ok(())
            })
            .await
            .unwrap_or(());
        
        trades.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        trades
    }

    /// Calculate buy cost
    async fn buy_cost(&self, outcome: String, shares: String) -> String {
        let outcome = if outcome == "Yes" {
            market_engine::Outcome::Yes
        } else {
            market_engine::Outcome::No
        };
        let shares_u64: u64 = shares.parse().unwrap_or(0);
        
        self.state.calculate_buy_cost(&outcome, shares_u64).to_string()
    }

    /// Calculate sell proceeds
    async fn sell_proceeds(&self, outcome: String, shares: String) -> String {
        let outcome = if outcome == "Yes" {
            market_engine::Outcome::Yes
        } else {
            market_engine::Outcome::No
        };
        let shares_u64: u64 = shares.parse().unwrap_or(0);
        
        self.state.calculate_sell_proceeds(&outcome, shares_u64).to_string()
    }
}
