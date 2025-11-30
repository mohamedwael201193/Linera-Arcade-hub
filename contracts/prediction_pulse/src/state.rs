//! PredictionPulse contract state.

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use prediction_pulse::{Bet, PlayerStats, Round};

/// The application state stored on-chain.
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct PredictionPulseState {
    /// Counter for generating unique round IDs.
    pub next_round_id: RegisterView<u64>,
    
    /// All prediction rounds, keyed by round ID.
    pub rounds: MapView<u64, Round>,
    
    /// Bets indexed by "round_id:owner" key.
    pub bets: MapView<String, Bet>,
    
    /// Player statistics indexed by owner string.
    pub player_stats: MapView<String, PlayerStats>,
    
    /// Admin chain ID.
    pub admin: RegisterView<Option<String>>,
}

impl PredictionPulseState {
    /// Make a bet key from round_id and owner
    fn bet_key(round_id: u64, owner: &str) -> String {
        format!("{}:{}", round_id, owner)
    }

    /// Get the next round ID and increment the counter.
    pub async fn get_next_round_id(&mut self) -> u64 {
        let id = *self.next_round_id.get();
        self.next_round_id.set(id + 1);
        id
    }

    /// Get a round by ID.
    pub async fn get_round(&self, round_id: u64) -> Option<Round> {
        self.rounds.get(&round_id).await.ok().flatten()
    }

    /// Save a round.
    pub async fn save_round(&mut self, round: Round) {
        let id = round.id;
        let _ = self.rounds.insert(&id, round);
    }

    /// Get a bet by round and owner.
    pub async fn get_bet(&self, round_id: u64, owner: &str) -> Option<Bet> {
        let key = Self::bet_key(round_id, owner);
        self.bets.get(&key).await.ok().flatten()
    }

    /// Save a bet.
    pub async fn save_bet(&mut self, bet: Bet) {
        let key = Self::bet_key(bet.round_id, &bet.owner);
        let _ = self.bets.insert(&key, bet);
    }

    /// Get player stats.
    pub async fn get_player_stats(&self, owner: &str) -> PlayerStats {
        self.player_stats
            .get(&owner.to_string())
            .await
            .ok()
            .flatten()
            .unwrap_or_default()
    }

    /// Save player stats.
    pub async fn save_player_stats(&mut self, owner: &str, stats: PlayerStats) {
        let _ = self.player_stats.insert(&owner.to_string(), stats);
    }

    /// Get all rounds as a list.
    pub async fn get_all_rounds(&self) -> Vec<Round> {
        let mut rounds = Vec::new();
        let keys: Vec<u64> = self.rounds.indices().await.unwrap_or_default();
        for key in keys {
            if let Some(round) = self.rounds.get(&key).await.ok().flatten() {
                rounds.push(round);
            }
        }
        rounds.sort_by(|a, b| b.id.cmp(&a.id));
        rounds
    }

    /// Get all bets for a specific round.
    pub async fn get_round_bets(&self, round_id: u64) -> Vec<Bet> {
        let mut bets = Vec::new();
        let prefix = format!("{}:", round_id);
        let keys: Vec<String> = self.bets.indices().await.unwrap_or_default();
        for key in keys {
            if key.starts_with(&prefix) {
                if let Some(bet) = self.bets.get(&key).await.ok().flatten() {
                    bets.push(bet);
                }
            }
        }
        bets
    }

    /// Get all bets for a specific player.
    pub async fn get_player_bets(&self, owner: &str) -> Vec<Bet> {
        let suffix = format!(":{}", owner);
        let mut bets = Vec::new();
        let keys: Vec<String> = self.bets.indices().await.unwrap_or_default();
        for key in keys {
            if key.ends_with(&suffix) {
                if let Some(bet) = self.bets.get(&key).await.ok().flatten() {
                    bets.push(bet);
                }
            }
        }
        bets
    }
}
