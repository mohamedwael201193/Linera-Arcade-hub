//! ArcadeNexus contract state.

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use arcade_nexus::{PlayerSeasonStats, Quest, QuestProgress, Season};

/// The application state stored on-chain.
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct ArcadeNexusState {
    /// Counter for generating unique season IDs.
    pub next_season_id: RegisterView<u64>,
    
    /// Counter for generating unique quest IDs.
    pub next_quest_id: RegisterView<u64>,
    
    /// All seasons, keyed by season ID.
    pub seasons: MapView<u64, Season>,
    
    /// Player stats keyed by "owner:season_id".
    pub player_stats: MapView<String, PlayerSeasonStats>,
    
    /// All quests, keyed by quest ID.
    pub quests: MapView<u64, Quest>,
    
    /// Quest progress keyed by "owner:quest_id".
    pub quest_progress: MapView<String, QuestProgress>,
    
    /// Admin chain ID (creator of the contract).
    pub admin: RegisterView<Option<String>>,
}

impl ArcadeNexusState {
    /// Make a player stats key from owner and season_id
    fn stats_key(owner: &str, season_id: u64) -> String {
        format!("{}:{}", owner, season_id)
    }

    /// Make a quest progress key from owner and quest_id
    fn progress_key(owner: &str, quest_id: u64) -> String {
        format!("{}:{}", owner, quest_id)
    }

    /// Get the next season ID and increment the counter.
    pub async fn get_next_season_id(&mut self) -> u64 {
        let id = *self.next_season_id.get();
        self.next_season_id.set(id + 1);
        id
    }

    /// Get the next quest ID and increment the counter.
    pub async fn get_next_quest_id(&mut self) -> u64 {
        let id = *self.next_quest_id.get();
        self.next_quest_id.set(id + 1);
        id
    }

    /// Get admin chain ID.
    pub fn get_admin(&self) -> Option<String> {
        self.admin.get().clone()
    }

    /// Set admin chain ID.
    pub fn set_admin(&mut self, admin: String) {
        self.admin.set(Some(admin));
    }

    // ==================== Seasons ====================

    /// Get a season by ID.
    pub async fn get_season(&self, season_id: u64) -> Option<Season> {
        self.seasons.get(&season_id).await.ok().flatten()
    }

    /// Save a season.
    pub async fn save_season(&mut self, season: Season) {
        let id = season.id;
        let _ = self.seasons.insert(&id, season);
    }

    /// Get all seasons.
    pub async fn get_all_seasons(&self) -> Vec<Season> {
        let mut seasons = Vec::new();
        let keys: Vec<u64> = self.seasons.indices().await.unwrap_or_default();
        for key in keys {
            if let Some(season) = self.seasons.get(&key).await.ok().flatten() {
                seasons.push(season);
            }
        }
        // Sort by ID descending (newest first)
        seasons.sort_by(|a, b| b.id.cmp(&a.id));
        seasons
    }

    /// Get active seasons.
    pub async fn get_active_seasons(&self) -> Vec<Season> {
        self.get_all_seasons()
            .await
            .into_iter()
            .filter(|s| s.active)
            .collect()
    }

    // ==================== Player Stats ====================

    /// Get player stats for a season.
    pub async fn get_player_stats(&self, owner: &str, season_id: u64) -> PlayerSeasonStats {
        let key = Self::stats_key(owner, season_id);
        self.player_stats
            .get(&key)
            .await
            .ok()
            .flatten()
            .unwrap_or(PlayerSeasonStats {
                owner: owner.to_string(),
                season_id,
                ..Default::default()
            })
    }

    /// Save player stats.
    pub async fn save_player_stats(&mut self, stats: PlayerSeasonStats) {
        let key = Self::stats_key(&stats.owner, stats.season_id);
        let _ = self.player_stats.insert(&key, stats);
    }

    /// Get all player stats for a season (for leaderboard).
    pub async fn get_leaderboard(&self, season_id: u64, limit: usize) -> Vec<PlayerSeasonStats> {
        let mut stats_list = Vec::new();
        let keys: Vec<String> = self.player_stats.indices().await.unwrap_or_default();
        
        for key in keys {
            if let Some(stats) = self.player_stats.get(&key).await.ok().flatten() {
                if stats.season_id == season_id {
                    stats_list.push(stats);
                }
            }
        }
        
        // Sort by total_xp descending
        stats_list.sort_by(|a, b| b.total_xp.cmp(&a.total_xp));
        
        // Take top N
        stats_list.truncate(limit);
        stats_list
    }

    // ==================== Quests ====================

    /// Get a quest by ID.
    pub async fn get_quest(&self, quest_id: u64) -> Option<Quest> {
        self.quests.get(&quest_id).await.ok().flatten()
    }

    /// Save a quest.
    pub async fn save_quest(&mut self, quest: Quest) {
        let id = quest.id;
        let _ = self.quests.insert(&id, quest);
    }

    /// Get all quests for a season.
    pub async fn get_season_quests(&self, season_id: u64) -> Vec<Quest> {
        let mut quests = Vec::new();
        let keys: Vec<u64> = self.quests.indices().await.unwrap_or_default();
        
        for key in keys {
            if let Some(quest) = self.quests.get(&key).await.ok().flatten() {
                if quest.season_id == season_id {
                    quests.push(quest);
                }
            }
        }
        
        // Sort by ID descending
        quests.sort_by(|a, b| b.id.cmp(&a.id));
        quests
    }

    // ==================== Quest Progress ====================

    /// Get quest progress for a player.
    pub async fn get_quest_progress(&self, owner: &str, quest_id: u64) -> QuestProgress {
        let key = Self::progress_key(owner, quest_id);
        self.quest_progress
            .get(&key)
            .await
            .ok()
            .flatten()
            .unwrap_or(QuestProgress {
                quest_id,
                owner: owner.to_string(),
                completed: false,
                completed_at: None,
            })
    }

    /// Save quest progress.
    pub async fn save_quest_progress(&mut self, progress: QuestProgress) {
        let key = Self::progress_key(&progress.owner, progress.quest_id);
        let _ = self.quest_progress.insert(&key, progress);
    }

    /// Get all quest progress for a player in a season.
    pub async fn get_player_quests(&self, owner: &str, season_id: u64) -> Vec<QuestProgress> {
        let mut progress_list = Vec::new();
        let keys: Vec<String> = self.quest_progress.indices().await.unwrap_or_default();
        
        for key in keys {
            if key.starts_with(&format!("{}:", owner)) {
                if let Some(progress) = self.quest_progress.get(&key).await.ok().flatten() {
                    // Check if quest belongs to this season
                    if let Some(quest) = self.get_quest(progress.quest_id).await {
                        if quest.season_id == season_id {
                            progress_list.push(progress);
                        }
                    }
                }
            }
        }
        
        progress_list
    }
}
