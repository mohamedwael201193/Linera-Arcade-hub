//! ArcadeNexus service implementation for GraphQL queries.

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
use arcade_nexus::{ArcadeNexusAbi, ArcadeSkillIndex, Operation, PlayerSeasonStats, Quest, QuestProgress, Season};
use state::ArcadeNexusState;

/// The ArcadeNexus service.
pub struct ArcadeNexusService {
    state: Arc<ArcadeNexusState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(ArcadeNexusService);

impl WithServiceAbi for ArcadeNexusService {
    type Abi = ArcadeNexusAbi;
}

impl Service for ArcadeNexusService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = ArcadeNexusState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        ArcadeNexusService {
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
    state: Arc<ArcadeNexusState>,
}

/// Calculate rank hint based on total XP
fn calculate_rank_hint(total_xp: u64) -> String {
    if total_xp >= 10000 {
        "Legendary".to_string()
    } else if total_xp >= 5000 {
        "Gold".to_string()
    } else if total_xp >= 1000 {
        "Silver".to_string()
    } else {
        "Bronze".to_string()
    }
}

#[Object]
impl QueryRoot {
    /// Get all seasons (newest first).
    async fn seasons(&self) -> Vec<Season> {
        self.state.get_all_seasons().await
    }

    /// Get only active seasons.
    async fn active_seasons(&self) -> Vec<Season> {
        self.state.get_active_seasons().await
    }

    /// Get a specific season by ID.
    async fn season(&self, id: u64) -> Option<Season> {
        self.state.get_season(id).await
    }

    /// Get player stats for a season.
    async fn player_season_stats(&self, owner: String, season_id: u64) -> PlayerSeasonStats {
        self.state.get_player_stats(&owner, season_id).await
    }

    /// Get leaderboard for a season (top N players by XP).
    async fn leaderboard(&self, season_id: u64, limit: Option<i32>) -> Vec<PlayerSeasonStats> {
        let limit = limit.unwrap_or(50) as usize;
        self.state.get_leaderboard(season_id, limit).await
    }

    /// Get all quests for a season.
    async fn quests(&self, season_id: u64) -> Vec<Quest> {
        self.state.get_season_quests(season_id).await
    }

    /// Get a specific quest by ID.
    async fn quest(&self, id: u64) -> Option<Quest> {
        self.state.get_quest(id).await
    }

    /// Get player's quest progress for a season.
    async fn player_quests(&self, owner: String, season_id: u64) -> Vec<QuestProgress> {
        self.state.get_player_quests(&owner, season_id).await
    }

    /// Get a player's Arcade Skill Index for a season.
    async fn skill_index(&self, owner: String, season_id: u64) -> ArcadeSkillIndex {
        let stats = self.state.get_player_stats(&owner, season_id).await;
        
        // Calculate overall score (weighted sum)
        let overall_score = stats.total_xp
            + stats.prediction_score
            + stats.meme_score
            + stats.typing_score
            + stats.life_score;
        
        // Calculate rank hint
        let rank_hint = Some(calculate_rank_hint(stats.total_xp));
        
        ArcadeSkillIndex {
            owner: owner.clone(),
            season_id,
            total_xp: stats.total_xp,
            overall_score,
            rank_hint,
        }
    }

    /// Get admin chain ID.
    async fn admin(&self) -> Option<String> {
        self.state.get_admin()
    }
}
