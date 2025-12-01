//! TypingArena service implementation for GraphQL queries.

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
use typing_arena::{Challenge, ChallengeStatus, Operation, TypingArenaAbi, TypingResult, TypistStats};
use state::TypingArenaState;

/// The TypingArena service.
pub struct TypingArenaService {
    state: Arc<TypingArenaState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(TypingArenaService);

impl WithServiceAbi for TypingArenaService {
    type Abi = TypingArenaAbi;
}

impl Service for TypingArenaService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = TypingArenaState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        TypingArenaService {
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
    state: Arc<TypingArenaState>,
}

#[Object]
impl QueryRoot {
    /// Get all challenges (newest first).
    async fn challenges(&self) -> Vec<Challenge> {
        self.state.get_all_challenges().await
    }

    /// Get active challenges.
    async fn active_challenges(&self) -> Vec<Challenge> {
        self.state
            .get_all_challenges()
            .await
            .into_iter()
            .filter(|c| c.status == ChallengeStatus::Active)
            .collect()
    }

    /// Get upcoming challenges.
    async fn upcoming_challenges(&self) -> Vec<Challenge> {
        self.state
            .get_all_challenges()
            .await
            .into_iter()
            .filter(|c| c.status == ChallengeStatus::Upcoming)
            .collect()
    }

    /// Get finished challenges.
    async fn finished_challenges(&self) -> Vec<Challenge> {
        self.state
            .get_all_challenges()
            .await
            .into_iter()
            .filter(|c| c.status == ChallengeStatus::Finished)
            .collect()
    }

    /// Get a specific challenge by ID.
    async fn challenge(&self, id: u64) -> Option<Challenge> {
        self.state.get_challenge(id).await
    }

    /// Get challenges created by a specific owner.
    async fn my_challenges(&self, owner: String) -> Vec<Challenge> {
        self.state
            .get_all_challenges()
            .await
            .into_iter()
            .filter(|c| c.creator == owner)
            .collect()
    }

    /// Get results for a challenge (leaderboard - sorted by WPM).
    async fn challenge_results(&self, challenge_id: u64) -> Vec<TypingResult> {
        self.state.get_challenge_results(challenge_id).await
    }

    /// Get a specific player's result for a challenge.
    async fn player_result(&self, challenge_id: u64, player: String) -> Option<TypingResult> {
        self.state.get_result(challenge_id, &player).await
    }

    /// Get all results by a player.
    async fn player_results(&self, player: String) -> Vec<TypingResult> {
        self.state.get_player_results(&player).await
    }

    /// Get player statistics.
    async fn player_stats(&self, owner: String) -> TypistStats {
        self.state.get_player_stats(&owner).await
    }

    /// Get top typists (by best WPM).
    async fn leaderboard(&self, limit: Option<u32>) -> Vec<TypistStats> {
        // Note: This is a simplified leaderboard - in a real app you'd want
        // to store the player identifier with stats. For now, return empty.
        // The client can aggregate from challenge results.
        Vec::new()
    }
}
