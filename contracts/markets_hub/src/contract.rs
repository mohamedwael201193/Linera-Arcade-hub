#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use state::MarketsHubState;

use markets_hub::{MarketMetadata, MarketStatus, MarketsHubAbi, Operation};

pub struct MarketsHubContract {
    state: MarketsHubState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(MarketsHubContract);

impl WithContractAbi for MarketsHubContract {
    type Abi = MarketsHubAbi;
}

impl Contract for MarketsHubContract {
    type Message = ();
    type Parameters = ();
    type InstantiationArgument = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MarketsHubState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MarketsHubContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        self.state.next_market_id.set(1);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        let owner = self.runtime.authenticated_signer().expect("Missing signer");
        let timestamp = self.runtime.system_time().micros();
        
        match operation {
            Operation::RegisterMarket {
                title,
                description,
                category,
                engine_app_id,
                resolve_time,
            } => {
                let market_id = self.state.get_next_market_id().await;
                
                let market = MarketMetadata {
                    market_id,
                    title,
                    description,
                    category,
                    creator: owner.to_string(),
                    engine_app_id,
                    created_at: timestamp,
                    resolve_time,
                    status: MarketStatus::Active,
                    total_volume: "0".to_string(),
                    yes_probability: 0.5,
                };
                
                self.state.save_market(market).await.expect("Failed to save market");
                market_id
            }
            Operation::UpdateMarket {
                market_id,
                status,
                total_volume,
                yes_probability,
            } => {
                let mut market = self.state.get_market(market_id).await.expect("Market not found");
                market.status = status;
                market.total_volume = total_volume;
                market.yes_probability = yes_probability;
                
                self.state.save_market(market).await.expect("Failed to update market");
                market_id
            }
        }
    }

    async fn execute_message(&mut self, _message: ()) {}

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
