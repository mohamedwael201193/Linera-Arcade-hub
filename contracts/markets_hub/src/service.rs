#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptyMutation, EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};
use state::MarketsHubState;
use std::sync::Arc;

use markets_hub::{MarketMetadata, MarketsHubAbi};

pub struct MarketsHubService {
    state: Arc<MarketsHubState>,
}

linera_sdk::service!(MarketsHubService);

impl WithServiceAbi for MarketsHubService {
    type Abi = MarketsHubAbi;
}

impl Service for MarketsHubService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = MarketsHubState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MarketsHubService {
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
    state: Arc<MarketsHubState>,
}

#[Object]
impl QueryRoot {
    /// Get market by ID
    async fn market(&self, market_id: u64) -> Option<MarketMetadata> {
        self.state.get_market(market_id).await
    }

    /// Get all active markets
    async fn active_markets(&self) -> Vec<MarketMetadata> {
        self.state.get_active_markets().await
    }

    /// Get markets by category
    async fn markets_by_category(&self, category: String) -> Vec<MarketMetadata> {
        self.state.get_markets_by_category(&category).await
    }

    /// Get all markets
    async fn all_markets(&self) -> Vec<MarketMetadata> {
        self.state.get_all_markets().await
    }

    /// Get total market count
    async fn market_count(&self) -> u64 {
        self.state.next_market_id.get()
    }
}
