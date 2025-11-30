// Copyright (c) Linera Arcade Hub
// SPDX-License-Identifier: Apache-2.0

/*!
 * ABI for the Player Profile Application
 * 
 * This application stores player profiles on-chain, including:
 * - Player name
 * - XP (experience points)
 * - Games played count
 * - Wins count
 */

use async_graphql::{Request, Response, SimpleObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

/// The ABI for the Player Profile application
pub struct PlayerProfileAbi;

impl ContractAbi for PlayerProfileAbi {
    type Operation = Operation;
    type Response = OperationResult;
}

impl ServiceAbi for PlayerProfileAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// A player profile stored on-chain
#[derive(Clone, Debug, Default, Serialize, Deserialize, SimpleObject, PartialEq, Eq)]
pub struct PlayerProfile {
    /// The player's display name
    pub name: String,
    /// Timestamp when the profile was created (Unix ms)
    pub created_at: u64,
    /// Experience points earned
    pub xp: u64,
    /// Total games played
    pub games_played: u64,
    /// Total wins
    pub wins: u64,
}

impl std::fmt::Display for PlayerProfile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "PlayerProfile {{ name: {}, xp: {}, games: {}, wins: {} }}",
            self.name, self.xp, self.games_played, self.wins
        )
    }
}

/// Operations that can be executed by the contract
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Register a new profile for the caller
    Register {
        /// The display name (3-20 characters)
        name: String,
    },
    /// Update profile stats (called by game contracts)
    UpdateStats {
        /// XP to add
        #[serde(default)]
        xp_delta: u64,
        /// Games played to add
        #[serde(default)]
        games_delta: u64,
        /// Wins to add
        #[serde(default)]
        wins_delta: u64,
    },
    /// Update the player's name
    UpdateName {
        /// New display name
        name: String,
    },
}

/// Result of an operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationResult {
    /// Profile was created successfully
    ProfileCreated,
    /// Profile was updated successfully
    ProfileUpdated,
    /// Stats were updated successfully
    StatsUpdated { new_xp: u64, new_games: u64, new_wins: u64 },
    /// Operation failed
    Error(String),
}

/// Errors that can occur in the Player Profile application
#[derive(Debug, thiserror::Error)]
pub enum ProfileError {
    #[error("Profile already exists for this owner")]
    ProfileExists,
    
    #[error("Profile not found")]
    ProfileNotFound,
    
    #[error("Invalid name: {0}")]
    InvalidName(String),
    
    #[error("Unauthorized: only the owner can modify this profile")]
    Unauthorized,
    
    #[error("State error: {0}")]
    StateError(String),
}
