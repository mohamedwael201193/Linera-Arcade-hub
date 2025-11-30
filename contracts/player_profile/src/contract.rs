// Copyright (c) Linera Arcade Hub
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

//! Contract implementation for Player Profile application
//! 
//! This contract handles:
//! - Profile registration
//! - Stats updates (from games)
//! - Name changes

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use player_profile::{Operation, OperationResult, PlayerProfile, PlayerProfileAbi, ProfileError};

use self::state::PlayerProfileState;

/// The contract handler
pub struct PlayerProfileContract {
    state: PlayerProfileState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(PlayerProfileContract);

impl WithContractAbi for PlayerProfileContract {
    type Abi = PlayerProfileAbi;
}

impl Contract for PlayerProfileContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = PlayerProfileState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        PlayerProfileContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // No initialization needed
    }

    async fn execute_operation(&mut self, operation: Operation) -> OperationResult {
        // Get the owner (caller) address
        let owner = self.get_owner_address();
        
        match operation {
            Operation::Register { name } => {
                match self.register_profile(&owner, name).await {
                    Ok(_) => OperationResult::ProfileCreated,
                    Err(e) => OperationResult::Error(e.to_string()),
                }
            }
            Operation::UpdateStats { xp_delta, games_delta, wins_delta } => {
                match self.update_stats(&owner, xp_delta, games_delta, wins_delta).await {
                    Ok(profile) => OperationResult::StatsUpdated {
                        new_xp: profile.xp,
                        new_games: profile.games_played,
                        new_wins: profile.wins,
                    },
                    Err(e) => OperationResult::Error(e.to_string()),
                }
            }
            Operation::UpdateName { name } => {
                match self.update_name(&owner, name).await {
                    Ok(_) => OperationResult::ProfileUpdated,
                    Err(e) => OperationResult::Error(e.to_string()),
                }
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {
        // No cross-chain messages supported yet
        panic!("PlayerProfile does not support cross-chain messages");
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl PlayerProfileContract {
    /// Get the owner address as a string
    fn get_owner_address(&mut self) -> String {
        // Use the chain ID as the owner identifier
        format!("{}", self.runtime.chain_id())
    }
    
    /// Get current timestamp in milliseconds
    fn current_time_ms(&mut self) -> u64 {
        self.runtime.system_time().micros() / 1000
    }
    
    /// Validate a player name
    fn validate_name(name: &str) -> Result<(), ProfileError> {
        let trimmed = name.trim();
        if trimmed.len() < 3 {
            return Err(ProfileError::InvalidName(
                "Name must be at least 3 characters".to_string()
            ));
        }
        if trimmed.len() > 20 {
            return Err(ProfileError::InvalidName(
                "Name must be at most 20 characters".to_string()
            ));
        }
        if !trimmed.chars().all(|c| c.is_alphanumeric() || c == '_' || c == ' ' || c == '-') {
            return Err(ProfileError::InvalidName(
                "Name can only contain letters, numbers, spaces, hyphens, and underscores".to_string()
            ));
        }
        Ok(())
    }
    
    /// Register a new profile
    async fn register_profile(&mut self, owner: &str, name: String) -> Result<PlayerProfile, ProfileError> {
        // Validate name
        Self::validate_name(&name)?;
        
        // Check if profile already exists
        if self.state.profiles.get(owner).await
            .map_err(|e| ProfileError::StateError(e.to_string()))?
            .is_some() 
        {
            return Err(ProfileError::ProfileExists);
        }
        
        // Create new profile
        let profile = PlayerProfile {
            name: name.trim().to_string(),
            created_at: self.current_time_ms(),
            xp: 0,
            games_played: 0,
            wins: 0,
        };
        
        // Store the profile
        self.state.profiles.insert(owner, profile.clone())
            .map_err(|e| ProfileError::StateError(e.to_string()))?;
        
        Ok(profile)
    }
    
    /// Update profile stats
    async fn update_stats(
        &mut self, 
        owner: &str, 
        xp_delta: u64, 
        games_delta: u64, 
        wins_delta: u64
    ) -> Result<PlayerProfile, ProfileError> {
        // Get existing profile
        let mut profile = self.state.profiles.get(owner).await
            .map_err(|e| ProfileError::StateError(e.to_string()))?
            .ok_or(ProfileError::ProfileNotFound)?;
        
        // Update stats
        profile.xp = profile.xp.saturating_add(xp_delta);
        profile.games_played = profile.games_played.saturating_add(games_delta);
        profile.wins = profile.wins.saturating_add(wins_delta);
        
        // Store updated profile
        self.state.profiles.insert(owner, profile.clone())
            .map_err(|e| ProfileError::StateError(e.to_string()))?;
        
        Ok(profile)
    }
    
    /// Update profile name
    async fn update_name(&mut self, owner: &str, name: String) -> Result<PlayerProfile, ProfileError> {
        // Validate name
        Self::validate_name(&name)?;
        
        // Get existing profile
        let mut profile = self.state.profiles.get(owner).await
            .map_err(|e| ProfileError::StateError(e.to_string()))?
            .ok_or(ProfileError::ProfileNotFound)?;
        
        // Update name
        profile.name = name.trim().to_string();
        
        // Store updated profile
        self.state.profiles.insert(owner, profile.clone())
            .map_err(|e| ProfileError::StateError(e.to_string()))?;
        
        Ok(profile)
    }
}
