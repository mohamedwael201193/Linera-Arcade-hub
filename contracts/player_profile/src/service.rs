// Copyright (c) Linera Arcade Hub
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

//! Service implementation for Player Profile application
//! 
//! This service exposes a GraphQL API for querying:
//! - Individual profiles by owner
//! - Leaderboard (top profiles by XP)

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot as _,
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};
use player_profile::{Operation, PlayerProfile, PlayerProfileAbi};

use self::state::PlayerProfileState;

/// The service handler
#[derive(Clone)]
pub struct PlayerProfileService {
    state: Arc<PlayerProfileState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(PlayerProfileService);

impl WithServiceAbi for PlayerProfileService {
    type Abi = PlayerProfileAbi;
}

impl Service for PlayerProfileService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = PlayerProfileState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        PlayerProfileService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot { state: self.state.clone() },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

/// GraphQL query root
struct QueryRoot {
    state: Arc<PlayerProfileState>,
}

#[Object]
impl QueryRoot {
    /// Get a profile by owner address
    async fn profile(&self, owner: String) -> Option<PlayerProfile> {
        self.state.profiles.get(&owner).await.ok().flatten()
    }
    
    /// Check if a profile exists for the given owner
    async fn has_profile(&self, owner: String) -> bool {
        self.state.profiles.get(&owner).await.ok().flatten().is_some()
    }
    
    /// Get all profiles (limited for efficiency)
    async fn all_profiles(&self, limit: Option<u32>) -> Vec<ProfileWithOwner> {
        let limit = limit.unwrap_or(100) as usize;
        let mut profiles = Vec::new();
        
        // Iterate through all profiles
        self.state.profiles.for_each_index_value(|owner, profile| {
            if profiles.len() < limit {
                profiles.push(ProfileWithOwner {
                    owner: owner.clone(),
                    profile: profile.into_owned(),
                });
            }
            Ok(())
        }).await.ok();
        
        profiles
    }
    
    /// Get leaderboard sorted by XP (descending)
    async fn leaderboard(&self, limit: Option<u32>) -> Vec<ProfileWithOwner> {
        let limit = limit.unwrap_or(10) as usize;
        let mut profiles = Vec::new();
        
        // Collect all profiles
        self.state.profiles.for_each_index_value(|owner, profile| {
            profiles.push(ProfileWithOwner {
                owner: owner.clone(),
                profile: profile.into_owned(),
            });
            Ok(())
        }).await.ok();
        
        // Sort by XP descending
        profiles.sort_by(|a, b| b.profile.xp.cmp(&a.profile.xp));
        
        // Return top N
        profiles.truncate(limit);
        profiles
    }
    
    /// Get total number of registered profiles
    async fn total_profiles(&self) -> u32 {
        self.state.profiles.count().await.unwrap_or(0) as u32
    }
}

/// A profile with its owner address (for leaderboard display)
#[derive(Clone, async_graphql::SimpleObject)]
struct ProfileWithOwner {
    owner: String,
    profile: PlayerProfile,
}
