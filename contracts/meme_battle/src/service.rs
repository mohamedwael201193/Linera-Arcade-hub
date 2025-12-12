//! Meme Battle service implementation for GraphQL queries.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot as _,
    linera_base_types::WithServiceAbi,
    views::{RootView, View},
    Service, ServiceRuntime,
};
use meme_battle::{MemeBattleAbi, Operation, Tournament};
use state::MemeBattleState;

/// The Meme Battle service.
pub struct MemeBattleService {
    state: Arc<MemeBattleState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(MemeBattleService);

impl WithServiceAbi for MemeBattleService {
    type Abi = MemeBattleAbi;
}

impl Service for MemeBattleService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = MemeBattleState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MemeBattleService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Self::Query) -> Self::QueryResponse {
        let schema = Schema::build(
            QueryRoot { state: self.state.clone() },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

/// GraphQL query root.
struct QueryRoot {
    state: Arc<MemeBattleState>,
}

#[Object]
impl QueryRoot {
    /// Get a tournament by ID.
    async fn tournament(&self, tournament_id: u64) -> Option<Tournament> {
        self.state.get_tournament(tournament_id).await
    }

    /// Get all active tournaments.
    async fn active_tournaments(&self) -> Vec<Tournament> {
        self.state.get_active_tournaments().await
    }

    /// Get all tournaments (active and completed).
    async fn all_tournaments(&self) -> Vec<Tournament> {
        self.state.get_all_tournaments().await
    }

    /// Check if a user has voted on a specific match.
    async fn user_voted(&self, match_id: u64, owner: String) -> bool {
        self.state.get_vote(match_id, &owner).await.is_some()
    }

    /// Get the choice a user made for a specific match (if they voted).
    async fn user_vote_choice(&self, match_id: u64, owner: String) -> Option<u64> {
        self.state.get_vote(match_id, &owner).await
    }
}
