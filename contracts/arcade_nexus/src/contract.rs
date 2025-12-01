//! ArcadeNexus contract implementation.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use arcade_nexus::{Operation, ArcadeNexusAbi, PlayerSeasonStats, Quest, QuestCategory, QuestProgress, Season};
use state::ArcadeNexusState;

/// The ArcadeNexus contract.
pub struct ArcadeNexusContract {
    state: ArcadeNexusState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(ArcadeNexusContract);

impl WithContractAbi for ArcadeNexusContract {
    type Abi = ArcadeNexusAbi;
}

impl Contract for ArcadeNexusContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = ArcadeNexusState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        ArcadeNexusContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Set the admin to the creator's chain
        let chain_id = self.runtime.chain_id().to_string();
        self.state.set_admin(chain_id);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let owner = self.runtime.chain_id().to_string();
        let now_micros = self.runtime.system_time().micros();
        // Convert microseconds to seconds for time comparisons
        let now_seconds = (now_micros / 1_000_000) as i64;

        match operation {
            Operation::CreateSeason {
                title,
                description,
                start_time,
                end_time,
                theme,
            } => {
                // Only admin can create seasons (for now, allow anyone)
                // let admin = self.state.get_admin();
                // if admin.as_ref() != Some(&owner) {
                //     return; // Not admin
                // }

                // Validate times
                if end_time <= start_time {
                    return; // Invalid time range
                }

                let season_id = self.state.get_next_season_id().await;

                let season = Season {
                    id: season_id,
                    title,
                    description,
                    start_time,
                    end_time,
                    active: true,
                    theme,
                };
                self.state.save_season(season).await;
            }

            Operation::CloseSeason { season_id } => {
                // Only admin can close seasons (for now, allow anyone)
                // let admin = self.state.get_admin();
                // if admin.as_ref() != Some(&owner) {
                //     return; // Not admin
                // }

                if let Some(mut season) = self.state.get_season(season_id).await {
                    season.active = false;
                    self.state.save_season(season).await;

                    // Optionally set rank snapshots for top players
                    let leaderboard = self.state.get_leaderboard(season_id, 100).await;
                    for (rank, mut stats) in leaderboard.into_iter().enumerate() {
                        stats.rank_snapshot = Some((rank + 1) as u32);
                        self.state.save_player_stats(stats).await;
                    }
                }
            }

            Operation::RecordGameAction {
                season_id,
                category,
                points,
            } => {
                // Check season exists and is active
                let season = match self.state.get_season(season_id).await {
                    Some(s) if s.active => s,
                    _ => return, // Season not found or not active
                };

                // Check if current time is within season
                if now_seconds < season.start_time || now_seconds > season.end_time {
                    return; // Outside season time
                }

                // Get or create player stats
                let mut stats = self.state.get_player_stats(&owner, season_id).await;

                // Add points to total and category-specific score
                stats.total_xp += points;
                match category {
                    QuestCategory::Prediction => stats.prediction_score += points,
                    QuestCategory::Meme => stats.meme_score += points,
                    QuestCategory::Typing => stats.typing_score += points,
                    QuestCategory::Life => stats.life_score += points,
                    QuestCategory::Mixed | QuestCategory::Other => {
                        // For mixed/other, just add to total (already done above)
                    }
                }

                self.state.save_player_stats(stats).await;
            }

            Operation::CreateQuest {
                season_id,
                title,
                description,
                category,
                reward_xp,
                requirements_text,
                ai_suggested,
            } => {
                // Check season exists
                if self.state.get_season(season_id).await.is_none() {
                    return; // Season not found
                }

                let quest_id = self.state.get_next_quest_id().await;

                let quest = Quest {
                    id: quest_id,
                    season_id,
                    title,
                    description,
                    category,
                    reward_xp,
                    requirements_text,
                    created_by: owner,
                    active: true,
                    ai_suggested,
                    created_at: now_seconds as u64,
                };
                self.state.save_quest(quest).await;
            }

            Operation::CompleteQuest { quest_id } => {
                // Get quest
                let quest = match self.state.get_quest(quest_id).await {
                    Some(q) if q.active => q,
                    _ => return, // Quest not found or not active
                };

                // Check season is active
                let season = match self.state.get_season(quest.season_id).await {
                    Some(s) if s.active => s,
                    _ => return, // Season not active
                };

                // Check if already completed
                let progress = self.state.get_quest_progress(&owner, quest_id).await;
                if progress.completed {
                    return; // Already completed
                }

                // Mark quest as completed
                let new_progress = QuestProgress {
                    quest_id,
                    owner: owner.clone(),
                    completed: true,
                    completed_at: Some(now_seconds),
                };
                self.state.save_quest_progress(new_progress).await;

                // Award XP
                let mut stats = self.state.get_player_stats(&owner, quest.season_id).await;
                stats.total_xp += quest.reward_xp;
                stats.completed_quests += 1;

                // Also add to category score
                match quest.category {
                    QuestCategory::Prediction => stats.prediction_score += quest.reward_xp,
                    QuestCategory::Meme => stats.meme_score += quest.reward_xp,
                    QuestCategory::Typing => stats.typing_score += quest.reward_xp,
                    QuestCategory::Life => stats.life_score += quest.reward_xp,
                    QuestCategory::Mixed | QuestCategory::Other => {}
                }

                self.state.save_player_stats(stats).await;
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {
        // No cross-chain messages supported yet
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
