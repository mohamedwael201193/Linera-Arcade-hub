// Copyright (c) Linera Arcade Hub
// SPDX-License-Identifier: Apache-2.0

//! State definitions for the Player Profile application

use linera_sdk::views::{linera_views, MapView, RootView, ViewStorageContext};

use player_profile::PlayerProfile;

/// The application state stored on-chain
/// 
/// This uses a MapView to store profiles keyed by owner address (String).
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = ViewStorageContext)]
pub struct PlayerProfileState {
    /// Map from owner address to player profile
    pub profiles: MapView<String, PlayerProfile>,
}
