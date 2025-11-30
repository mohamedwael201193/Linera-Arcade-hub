// Copyright (c) Linera Arcade Hub
// SPDX-License-Identifier: Apache-2.0

//! State definitions for the Game of Life application

use linera_sdk::views::{linera_views, RegisterView, RootView, ViewStorageContext};
use game_of_life::GridState;

/// The application state stored on-chain
#[derive(RootView, async_graphql::SimpleObject)]
#[view(context = ViewStorageContext)]
pub struct GameOfLifeState {
    /// The current grid state
    pub grid: RegisterView<GridState>,
}
