//! Meme Battle Royale - Tournament voting game for Linera Arcade Hub
//!
//! This contract provides:
//! - Tournament creation from existing Meme Auction NFTs
//! - Bracket-style voting rounds
//! - Time-boxed matches
//! - Automatic round advancement
//! - Winner determination
//! - Integration with Arcade Nexus for XP rewards

use async_graphql::{InputObject, SimpleObject};
use linera_sdk::graphql::GraphQLMutationRoot;
use serde::{Deserialize, Serialize};

/// Application binary interface for Meme Battle.
pub struct MemeBattleAbi;

impl linera_sdk::linera_base_types::ContractAbi for MemeBattleAbi {
    type Operation = Operation;
    type Response = ();
}

impl linera_sdk::linera_base_types::ServiceAbi for MemeBattleAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}

/// Tournament status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, async_graphql::Enum)]
pub enum TournamentStatus {
    /// Tournament is being set up
    Pending,
    /// Tournament is active and accepting votes
    Active,
    /// Tournament has completed
    Completed,
}

/// Match status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, async_graphql::Enum)]
pub enum MatchStatus {
    /// Match hasn't started yet
    Upcoming,
    /// Match is accepting votes
    Voting,
    /// Match has been resolved
    Resolved,
}

/// Reference to a meme from the Meme Auction contract
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject, InputObject)]
#[graphql(input_name = "MemeRefInput")]
pub struct MemeRef {
    /// Original meme auction app ID
    pub auction_app_id: String,
    /// Meme ID from auction
    pub meme_id: u64,
    /// Cached image URL
    pub image_url: String,
    /// Cached title
    pub title: String,
    /// Creator of the meme
    pub creator: String,
}

/// A match between two memes
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Match {
    /// Unique match ID
    pub match_id: u64,
    /// First meme
    pub meme_a: MemeRef,
    /// Second meme
    pub meme_b: MemeRef,
    /// Match start time (seconds since epoch)
    pub start_time: i64,
    /// Match end time (seconds since epoch)
    pub end_time: i64,
    /// Votes for meme A
    pub votes_a: u64,
    /// Votes for meme B
    pub votes_b: u64,
    /// Match status
    pub status: MatchStatus,
    /// Winner meme ID (if resolved)
    pub winner: Option<u64>,
}

/// A round in the tournament
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Round {
    /// Round index (0 = first round)
    pub round_index: u32,
    /// Matches in this round
    pub matches: Vec<Match>,
}

/// A complete tournament
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Tournament {
    /// Unique tournament ID
    pub tournament_id: u64,
    /// Tournament title
    pub title: String,
    /// Tournament description
    pub description: String,
    /// Associated Arcade Nexus season ID
    pub season_id: u64,
    /// All memes participating in the tournament
    pub meme_refs: Vec<MemeRef>,
    /// Current round index
    pub current_round: u32,
    /// All rounds (past and current)
    pub rounds: Vec<Round>,
    /// Tournament status
    pub status: TournamentStatus,
    /// Tournament creation time
    pub created_at: i64,
    /// Creator of the tournament
    pub creator: String,
}

/// Operations supported by the Meme Battle contract
#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Create a new tournament
    CreateTournament {
        title: String,
        description: String,
        season_id: u64,
        meme_refs: Vec<MemeRef>,
        match_duration_secs: i64,
    },
    /// Vote on a match
    Vote {
        tournament_id: u64,
        match_id: u64,
        choice: u64, // meme_id voted for
    },
    /// Finalize a match (determine winner)
    FinalizeMatch {
        tournament_id: u64,
        match_id: u64,
    },
    /// Advance to the next round
    AdvanceRound {
        tournament_id: u64,
    },
}
