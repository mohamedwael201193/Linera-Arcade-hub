//! PredictionPulse service implementation for GraphQL queries.

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
use prediction_pulse::{Bet, Operation, PlayerStats, PredictionPulseAbi, Round, RoundStatus};
use state::PredictionPulseState;

/// The PredictionPulse service.
pub struct PredictionPulseService {
    state: Arc<PredictionPulseState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(PredictionPulseService);

impl WithServiceAbi for PredictionPulseService {
    type Abi = PredictionPulseAbi;
}

impl Service for PredictionPulseService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = PredictionPulseState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        PredictionPulseService {
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
    state: Arc<PredictionPulseState>,
}

#[Object]
impl QueryRoot {
    /// Get all rounds.
    async fn rounds(&self) -> Vec<Round> {
        self.state.get_all_rounds().await
    }

    /// Get open rounds.
    async fn open_rounds(&self) -> Vec<Round> {
        self.state
            .get_all_rounds()
            .await
            .into_iter()
            .filter(|r| r.status == RoundStatus::Open)
            .collect()
    }

    /// Get resolved rounds.
    async fn resolved_rounds(&self) -> Vec<Round> {
        self.state
            .get_all_rounds()
            .await
            .into_iter()
            .filter(|r| r.status == RoundStatus::Resolved)
            .collect()
    }

    /// Get a specific round by ID.
    async fn round(&self, id: u64) -> Option<Round> {
        self.state.get_round(id).await
    }

    /// Get bets for a round.
    async fn round_bets(&self, round_id: u64) -> Vec<Bet> {
        self.state.get_round_bets(round_id).await
    }

    /// Get bets for a player.
    async fn player_bets(&self, owner: String) -> Vec<Bet> {
        self.state.get_player_bets(&owner).await
    }

    /// Get player statistics.
    async fn player_stats(&self, owner: String) -> PlayerStats {
        self.state.get_player_stats(&owner).await
    }
}
