//! Arcade Nexus - Cross-Game Reputation & Live-Ops Layer for Linera Arcade Hub
//!
//! This contract provides:
//! - Seasons with time-limited XP tracking
//! - Cross-game leaderboards
//! - Dynamic quests with XP rewards
//! - Player skill indexing across all games
//!
//! Designed to be AI-friendly for off-chain quest generation.

use async_graphql::SimpleObject;
use linera_sdk::graphql::GraphQLMutationRoot;
use serde::{Deserialize, Serialize};

/// Application binary interface for ArcadeNexus.
pub struct ArcadeNexusAbi;

impl linera_sdk::linera_base_types::ContractAbi for ArcadeNexusAbi {
    type Operation = Operation;
    type Response = ();
}

impl linera_sdk::linera_base_types::ServiceAbi for ArcadeNexusAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}

/// Quest category - which game the quest relates to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, async_graphql::Enum)]
pub enum QuestCategory {
    /// Prediction Pulse game
    Prediction,
    /// Meme Auction game
    Meme,
    /// Typing Arena game
    Typing,
    /// Game of Life
    Life,
    /// Mixed - multiple games
    Mixed,
    /// Other / general
    Other,
}

impl Default for QuestCategory {
    fn default() -> Self {
        QuestCategory::Other
    }
}

/// A season for XP tracking and leaderboards.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Season {
    /// Unique season ID
    pub id: u64,
    /// Season title (e.g., "Winter 2025")
    pub title: String,
    /// Season description
    pub description: String,
    /// Start time in seconds since epoch
    pub start_time: i64,
    /// End time in seconds since epoch
    pub end_time: i64,
    /// Whether the season is currently active
    pub active: bool,
    /// Optional theme (e.g., "Meme Madness", "Speed Typing")
    pub theme: Option<String>,
}

/// Player statistics for a specific season.
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct PlayerSeasonStats {
    /// Player's chain ID
    pub owner: String,
    /// Season ID
    pub season_id: u64,
    /// Total XP earned this season
    pub total_xp: u64,
    /// XP from Prediction Pulse
    pub prediction_score: u64,
    /// XP from Meme Auction
    pub meme_score: u64,
    /// XP from Typing Arena
    pub typing_score: u64,
    /// XP from Game of Life
    pub life_score: u64,
    /// Number of quests completed
    pub completed_quests: u32,
    /// Rank snapshot when season closes (optional)
    pub rank_snapshot: Option<u32>,
}

/// A quest that players can complete for XP.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Quest {
    /// Unique quest ID
    pub id: u64,
    /// Season this quest belongs to
    pub season_id: u64,
    /// Quest title
    pub title: String,
    /// Quest description
    pub description: String,
    /// Category (which game)
    pub category: QuestCategory,
    /// XP reward for completion
    pub reward_xp: u64,
    /// Human-readable requirements
    pub requirements_text: String,
    /// Who created this quest
    pub created_by: String,
    /// Whether quest is active
    pub active: bool,
    /// Whether this was suggested by AI
    pub ai_suggested: bool,
    /// Creation timestamp
    pub created_at: u64,
}

/// Player's progress on a quest.
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct QuestProgress {
    /// Quest ID
    pub quest_id: u64,
    /// Player's chain ID
    pub owner: String,
    /// Whether quest is completed
    pub completed: bool,
    /// Completion timestamp (if completed)
    pub completed_at: Option<i64>,
}

/// Arcade Skill Index - aggregated player score.
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct ArcadeSkillIndex {
    /// Player's chain ID
    pub owner: String,
    /// Season ID
    pub season_id: u64,
    /// Total XP
    pub total_xp: u64,
    /// Overall score (weighted sum of all scores)
    pub overall_score: u64,
    /// Rank hint (Bronze, Silver, Gold, Legendary)
    pub rank_hint: Option<String>,
}

/// Operations that can be performed on the ArcadeNexus contract.
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Create a new season (admin only).
    CreateSeason {
        title: String,
        description: String,
        /// Start time in seconds since epoch
        start_time: i64,
        /// End time in seconds since epoch
        end_time: i64,
        /// Optional theme
        theme: Option<String>,
    },
    
    /// Close a season (admin only).
    CloseSeason {
        season_id: u64,
    },
    
    /// Record XP from a game action.
    RecordGameAction {
        season_id: u64,
        category: QuestCategory,
        points: u64,
    },
    
    /// Create a new quest.
    CreateQuest {
        season_id: u64,
        title: String,
        description: String,
        category: QuestCategory,
        reward_xp: u64,
        requirements_text: String,
        ai_suggested: bool,
    },
    
    /// Mark a quest as completed (claim XP).
    CompleteQuest {
        quest_id: u64,
    },
}
