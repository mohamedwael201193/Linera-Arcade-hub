// Copyright (c) Linera Arcade Hub
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

//! Service implementation for Game of Life application

mod state;

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot as _,
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};
use game_of_life::{GameOfLifeAbi, Operation, GRID_WIDTH, GRID_HEIGHT};

use self::state::GameOfLifeState;

/// The service handler
#[derive(Clone)]
pub struct GameOfLifeService {
    state: Arc<GameOfLifeState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(GameOfLifeService);

impl WithServiceAbi for GameOfLifeService {
    type Abi = GameOfLifeAbi;
}

impl Service for GameOfLifeService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = GameOfLifeState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        GameOfLifeService {
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
    state: Arc<GameOfLifeState>,
}

#[Object]
impl QueryRoot {
    /// Get the current grid state
    async fn grid(&self) -> GridInfo {
        let grid = self.state.grid.get();
        GridInfo {
            generation: grid.generation,
            running: grid.running,
            live_count: grid.live_count(),
            width: GRID_WIDTH as u32,
            height: GRID_HEIGHT as u32,
        }
    }
    
    /// Get the raw cell data as a base64 string (for efficient transfer)
    async fn cells_raw(&self) -> String {
        let grid = self.state.grid.get();
        // Convert cells to bytes
        let bytes: Vec<u8> = grid.cells.iter()
            .flat_map(|w| w.to_le_bytes())
            .collect();
        base64_encode(&bytes)
    }
    
    /// Get all live cell positions
    async fn live_cells(&self) -> Vec<CellPosition> {
        let grid = self.state.grid.get();
        grid.live_cells()
            .into_iter()
            .map(|(x, y)| CellPosition { x, y })
            .collect()
    }
    
    /// Check if a specific cell is alive
    async fn cell(&self, x: u32, y: u32) -> bool {
        let grid = self.state.grid.get();
        grid.get(x as usize, y as usize)
    }
    
    /// Get grid dimensions
    async fn dimensions(&self) -> Dimensions {
        Dimensions {
            width: GRID_WIDTH as u32,
            height: GRID_HEIGHT as u32,
        }
    }
    
    /// Get simulation statistics
    async fn stats(&self) -> GridStats {
        let grid = self.state.grid.get();
        let live = grid.live_count();
        let total = (GRID_WIDTH * GRID_HEIGHT) as u32;
        GridStats {
            generation: grid.generation,
            live_cells: live,
            dead_cells: total - live,
            density: (live as f64 / total as f64 * 100.0) as f32,
        }
    }
}

/// Grid information
#[derive(async_graphql::SimpleObject)]
struct GridInfo {
    generation: u64,
    running: bool,
    live_count: u32,
    width: u32,
    height: u32,
}

/// Cell position
#[derive(async_graphql::SimpleObject)]
struct CellPosition {
    x: u32,
    y: u32,
}

/// Grid dimensions
#[derive(async_graphql::SimpleObject)]
struct Dimensions {
    width: u32,
    height: u32,
}

/// Grid statistics
#[derive(async_graphql::SimpleObject)]
struct GridStats {
    generation: u64,
    live_cells: u32,
    dead_cells: u32,
    density: f32,
}

/// Simple base64 encoding
fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;
        
        result.push(CHARS[(b0 >> 2) & 0x3F] as char);
        result.push(CHARS[((b0 << 4) | (b1 >> 4)) & 0x3F] as char);
        
        if chunk.len() > 1 {
            result.push(CHARS[((b1 << 2) | (b2 >> 6)) & 0x3F] as char);
        } else {
            result.push('=');
        }
        
        if chunk.len() > 2 {
            result.push(CHARS[b2 & 0x3F] as char);
        } else {
            result.push('=');
        }
    }
    
    result
}
