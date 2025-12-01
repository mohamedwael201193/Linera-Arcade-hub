//! TypingArena contract state.

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use typing_arena::{Challenge, TypingResult, TypistStats};

/// The application state stored on-chain.
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct TypingArenaState {
    /// Counter for generating unique challenge IDs.
    pub next_challenge_id: RegisterView<u64>,
    
    /// All challenges, keyed by challenge ID.
    pub challenges: MapView<u64, Challenge>,
    
    /// Results indexed by "challenge_id:player" key.
    pub results: MapView<String, TypingResult>,
    
    /// Player statistics indexed by owner string.
    pub player_stats: MapView<String, TypistStats>,
    
    /// Admin chain ID (creator of the contract).
    pub admin: RegisterView<Option<String>>,
}

impl TypingArenaState {
    /// Make a result key from challenge_id and player
    fn result_key(challenge_id: u64, player: &str) -> String {
        format!("{}:{}", challenge_id, player)
    }

    /// Get the next challenge ID and increment the counter.
    pub async fn get_next_challenge_id(&mut self) -> u64 {
        let id = *self.next_challenge_id.get();
        self.next_challenge_id.set(id + 1);
        id
    }

    /// Get a challenge by ID.
    pub async fn get_challenge(&self, challenge_id: u64) -> Option<Challenge> {
        self.challenges.get(&challenge_id).await.ok().flatten()
    }

    /// Save a challenge.
    pub async fn save_challenge(&mut self, challenge: Challenge) {
        let id = challenge.id;
        let _ = self.challenges.insert(&id, challenge);
    }

    /// Get a result by challenge and player.
    pub async fn get_result(&self, challenge_id: u64, player: &str) -> Option<TypingResult> {
        let key = Self::result_key(challenge_id, player);
        self.results.get(&key).await.ok().flatten()
    }

    /// Save a result.
    pub async fn save_result(&mut self, result: TypingResult) {
        let key = Self::result_key(result.challenge_id, &result.player);
        let _ = self.results.insert(&key, result);
    }

    /// Get player stats.
    pub async fn get_player_stats(&self, owner: &str) -> TypistStats {
        self.player_stats
            .get(&owner.to_string())
            .await
            .ok()
            .flatten()
            .unwrap_or_default()
    }

    /// Save player stats.
    pub async fn save_player_stats(&mut self, owner: &str, stats: TypistStats) {
        let _ = self.player_stats.insert(&owner.to_string(), stats);
    }

    /// Get all challenges as a list (sorted by ID descending - newest first).
    pub async fn get_all_challenges(&self) -> Vec<Challenge> {
        let mut challenges = Vec::new();
        let keys: Vec<u64> = self.challenges.indices().await.unwrap_or_default();
        for key in keys {
            if let Some(challenge) = self.challenges.get(&key).await.ok().flatten() {
                challenges.push(challenge);
            }
        }
        challenges.sort_by(|a, b| b.id.cmp(&a.id));
        challenges
    }

    /// Get all results for a specific challenge (sorted by WPM descending).
    pub async fn get_challenge_results(&self, challenge_id: u64) -> Vec<TypingResult> {
        let mut results = Vec::new();
        let prefix = format!("{}:", challenge_id);
        let keys: Vec<String> = self.results.indices().await.unwrap_or_default();
        for key in keys {
            if key.starts_with(&prefix) {
                if let Some(result) = self.results.get(&key).await.ok().flatten() {
                    results.push(result);
                }
            }
        }
        // Sort by WPM descending (leaderboard order)
        results.sort_by(|a, b| b.wpm.cmp(&a.wpm));
        results
    }

    /// Get all results by a specific player.
    pub async fn get_player_results(&self, player: &str) -> Vec<TypingResult> {
        let suffix = format!(":{}", player);
        let mut results = Vec::new();
        let keys: Vec<String> = self.results.indices().await.unwrap_or_default();
        for key in keys {
            if key.ends_with(&suffix) {
                if let Some(result) = self.results.get(&key).await.ok().flatten() {
                    results.push(result);
                }
            }
        }
        results
    }
}
