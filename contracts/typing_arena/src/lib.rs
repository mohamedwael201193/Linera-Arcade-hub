//! TypingArena - An on-chain typing challenge game for Linera Arcade Hub.
//!
//! Players compete in typing challenges, submit their results (WPM, accuracy),
//! and climb the leaderboard. All state lives on-chain.

use async_graphql::SimpleObject;
use linera_sdk::graphql::GraphQLMutationRoot;
use serde::{Deserialize, Serialize};

/// Application binary interface for TypingArena.
pub struct TypingArenaAbi;

impl linera_sdk::linera_base_types::ContractAbi for TypingArenaAbi {
    type Operation = Operation;
    type Response = ();
}

impl linera_sdk::linera_base_types::ServiceAbi for TypingArenaAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}

/// Status of a typing challenge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, async_graphql::Enum)]
pub enum ChallengeStatus {
    /// Challenge is upcoming (before start_time)
    Upcoming,
    /// Challenge is active (between start_time and end_time)
    Active,
    /// Challenge has finished (after end_time)
    Finished,
    /// Challenge was cancelled
    Cancelled,
}

impl Default for ChallengeStatus {
    fn default() -> Self {
        ChallengeStatus::Upcoming
    }
}

/// Difficulty level of a challenge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, async_graphql::Enum)]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
    Expert,
}

impl Default for Difficulty {
    fn default() -> Self {
        Difficulty::Medium
    }
}

/// A typing challenge.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Challenge {
    pub id: u64,
    pub creator: String,
    pub title: String,
    pub text: String,
    pub difficulty: Difficulty,
    pub status: ChallengeStatus,
    pub start_time: u64,
    pub end_time: u64,
    pub created_at: u64,
    pub participant_count: u64,
    pub best_wpm: u32,
    pub best_player: Option<String>,
}

/// A player's result for a challenge.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct TypingResult {
    pub challenge_id: u64,
    pub player: String,
    pub wpm: u32,
    pub accuracy: u32,  // Percentage 0-100
    pub completed: bool,
    pub time_taken_ms: u64,
    pub submitted_at: u64,
}

/// Player statistics for typing arena.
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct TypistStats {
    pub challenges_completed: u64,
    pub challenges_won: u64,
    pub total_words_typed: u64,
    pub best_wpm: u32,
    pub average_wpm: u32,
    pub average_accuracy: u32,
}

/// Operations that can be performed on the TypingArena contract.
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Create a new typing challenge.
    CreateChallenge {
        title: String,
        text: String,
        difficulty: Difficulty,
        /// Start time in seconds since epoch
        start_time: u64,
        /// End time in seconds since epoch  
        end_time: u64,
    },
    /// Submit a result for a challenge.
    SubmitResult {
        challenge_id: u64,
        wpm: u32,
        accuracy: u32,
        completed: bool,
        time_taken_ms: u64,
    },
    /// Cancel a challenge (creator only, before start).
    CancelChallenge {
        challenge_id: u64,
    },
}
