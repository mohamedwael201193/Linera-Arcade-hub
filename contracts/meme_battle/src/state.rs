//! Meme Battle contract state.

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use meme_battle::{Tournament, TournamentStatus};

/// The application state stored on-chain.
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct MemeBattleState {
    /// Counter for generating unique tournament IDs.
    pub next_tournament_id: RegisterView<u64>,
    
    /// Counter for generating unique match IDs.
    pub next_match_id: RegisterView<u64>,
    
    /// All tournaments, keyed by tournament ID.
    pub tournaments: MapView<u64, Tournament>,
    
    /// Active tournament IDs (for quick lookup).
    pub active_tournament_ids: MapView<u64, bool>,
    
    /// Votes keyed by "match_id:owner" to prevent double voting.
    pub votes: MapView<String, u64>, // value is meme_id voted for
}

impl MemeBattleState {
    /// Make a vote key from match_id and owner
    fn vote_key(match_id: u64, owner: &str) -> String {
        format!("{}:{}", match_id, owner)
    }

    /// Get the next tournament ID and increment the counter.
    pub async fn get_next_tournament_id(&mut self) -> u64 {
        let id = *self.next_tournament_id.get();
        self.next_tournament_id.set(id + 1);
        id
    }

    /// Get the next match ID and increment the counter.
    pub async fn get_next_match_id(&mut self) -> u64 {
        let id = *self.next_match_id.get();
        self.next_match_id.set(id + 1);
        id
    }

    /// Get a tournament by ID.
    pub async fn get_tournament(&self, tournament_id: u64) -> Option<Tournament> {
        self.tournaments.get(&tournament_id).await.ok().flatten()
    }

    /// Save a tournament.
    pub async fn save_tournament(&mut self, tournament: Tournament) {
        let id = tournament.tournament_id;
        let status = tournament.status;
        let _ = self.tournaments.insert(&id, tournament);
        
        // Update active status
        if status == TournamentStatus::Active {
            let _ = self.active_tournament_ids.insert(&id, true);
        } else {
            let _ = self.active_tournament_ids.remove(&id);
        }
    }

    /// Get a vote for a match by a specific owner.
    pub async fn get_vote(&self, match_id: u64, owner: &str) -> Option<u64> {
        let key = Self::vote_key(match_id, owner);
        self.votes.get(&key).await.ok().flatten()
    }

    /// Save a vote.
    pub async fn save_vote(&mut self, match_id: u64, owner: &str, meme_id: u64) {
        let key = Self::vote_key(match_id, owner);
        let _ = self.votes.insert(&key, meme_id);
    }

    /// Get all active tournaments.
    pub async fn get_active_tournaments(&self) -> Vec<Tournament> {
        let mut tournaments = Vec::new();
        let keys: Vec<u64> = self.active_tournament_ids.indices().await.unwrap_or_default();
        
        for key in keys {
            if let Some(tournament) = self.get_tournament(key).await {
                if tournament.status == TournamentStatus::Active {
                    tournaments.push(tournament);
                }
            }
        }
        
        // Sort by creation time descending (newest first)
        tournaments.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        tournaments
    }

    /// Get all tournaments (active and completed).
    pub async fn get_all_tournaments(&self) -> Vec<Tournament> {
        let mut tournaments = Vec::new();
        let keys: Vec<u64> = self.tournaments.indices().await.unwrap_or_default();
        
        for key in keys {
            if let Some(tournament) = self.tournaments.get(&key).await.ok().flatten() {
                tournaments.push(tournament);
            }
        }
        
        // Sort by creation time descending
        tournaments.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        tournaments
    }
}
