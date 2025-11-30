// Copyright (c) Linera Arcade Hub
// SPDX-License-Identifier: Apache-2.0

/*!
 * ABI for Conway's Game of Life Application
 * 
 * This is a cellular automaton where each cell is either alive or dead.
 * The grid evolves according to simple rules:
 * - Any live cell with 2-3 neighbors survives
 * - Any dead cell with exactly 3 neighbors becomes alive
 * - All other cells die or stay dead
 */

use async_graphql::{Request, Response, SimpleObject, InputObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

/// Grid dimensions (fixed size for simplicity)
pub const GRID_WIDTH: usize = 32;
pub const GRID_HEIGHT: usize = 32;
pub const GRID_SIZE: usize = GRID_WIDTH * GRID_HEIGHT;

/// The ABI for the Game of Life application
pub struct GameOfLifeAbi;

impl ContractAbi for GameOfLifeAbi {
    type Operation = Operation;
    type Response = OperationResult;
}

impl ServiceAbi for GameOfLifeAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// The state of the grid
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject, PartialEq, Eq)]
pub struct GridState {
    /// Flattened grid of cells (row-major order)
    /// Each u64 represents 64 cells as bits
    pub cells: Vec<u64>,
    /// Current generation number
    pub generation: u64,
    /// Whether the simulation is running
    pub running: bool,
}

impl Default for GridState {
    fn default() -> Self {
        Self::new()
    }
}

impl GridState {
    /// Create a new empty grid
    pub fn new() -> Self {
        // We need GRID_SIZE bits = GRID_SIZE/64 u64s
        let num_words = (GRID_SIZE + 63) / 64;
        Self {
            cells: vec![0u64; num_words],
            generation: 0,
            running: false,
        }
    }
    
    /// Get cell state at (x, y)
    pub fn get(&self, x: usize, y: usize) -> bool {
        if x >= GRID_WIDTH || y >= GRID_HEIGHT {
            return false;
        }
        let idx = y * GRID_WIDTH + x;
        let word_idx = idx / 64;
        let bit_idx = idx % 64;
        (self.cells[word_idx] >> bit_idx) & 1 == 1
    }
    
    /// Set cell state at (x, y)
    pub fn set(&mut self, x: usize, y: usize, alive: bool) {
        if x >= GRID_WIDTH || y >= GRID_HEIGHT {
            return;
        }
        let idx = y * GRID_WIDTH + x;
        let word_idx = idx / 64;
        let bit_idx = idx % 64;
        
        if alive {
            self.cells[word_idx] |= 1u64 << bit_idx;
        } else {
            self.cells[word_idx] &= !(1u64 << bit_idx);
        }
    }
    
    /// Toggle cell state at (x, y)
    pub fn toggle(&mut self, x: usize, y: usize) {
        let current = self.get(x, y);
        self.set(x, y, !current);
    }
    
    /// Count live neighbors for a cell
    pub fn count_neighbors(&self, x: usize, y: usize) -> u8 {
        let mut count = 0u8;
        
        for dy in [-1i32, 0, 1] {
            for dx in [-1i32, 0, 1] {
                if dx == 0 && dy == 0 {
                    continue;
                }
                
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;
                
                if nx >= 0 && nx < GRID_WIDTH as i32 && 
                   ny >= 0 && ny < GRID_HEIGHT as i32 {
                    if self.get(nx as usize, ny as usize) {
                        count += 1;
                    }
                }
            }
        }
        
        count
    }
    
    /// Compute the next generation
    pub fn step(&mut self) {
        let mut next = Self::new();
        next.generation = self.generation + 1;
        next.running = self.running;
        
        for y in 0..GRID_HEIGHT {
            for x in 0..GRID_WIDTH {
                let alive = self.get(x, y);
                let neighbors = self.count_neighbors(x, y);
                
                // Conway's rules:
                // Live cell with 2-3 neighbors survives
                // Dead cell with exactly 3 neighbors becomes alive
                let next_alive = if alive {
                    neighbors == 2 || neighbors == 3
                } else {
                    neighbors == 3
                };
                
                next.set(x, y, next_alive);
            }
        }
        
        *self = next;
    }
    
    /// Clear the grid
    pub fn clear(&mut self) {
        for word in &mut self.cells {
            *word = 0;
        }
        self.generation = 0;
        self.running = false;
    }
    
    /// Randomize the grid
    pub fn randomize(&mut self, seed: u64) {
        let mut rng = seed;
        for word in &mut self.cells {
            // Simple LCG for randomness
            rng = rng.wrapping_mul(6364136223846793005).wrapping_add(1);
            *word = rng;
        }
        self.generation = 0;
    }
    
    /// Count total live cells
    pub fn live_count(&self) -> u32 {
        self.cells.iter().map(|w| w.count_ones()).sum()
    }
    
    /// Get cells as a list of (x, y) coordinates
    pub fn live_cells(&self) -> Vec<(u32, u32)> {
        let mut result = Vec::new();
        for y in 0..GRID_HEIGHT {
            for x in 0..GRID_WIDTH {
                if self.get(x, y) {
                    result.push((x as u32, y as u32));
                }
            }
        }
        result
    }
}

/// A position on the grid
#[derive(Clone, Debug, Serialize, Deserialize, InputObject)]
pub struct Position {
    pub x: u32,
    pub y: u32,
}

/// Operations that can be executed by the contract
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Toggle a single cell
    Toggle { x: u32, y: u32 },
    /// Set multiple cells at once
    SetCells { positions: Vec<Position>, alive: bool },
    /// Step the simulation forward one generation
    Step,
    /// Step multiple generations
    StepMultiple { count: u32 },
    /// Start continuous simulation
    Start,
    /// Stop continuous simulation
    Stop,
    /// Clear the grid
    Clear,
    /// Randomize the grid with a seed
    Randomize { seed: u64 },
    /// Load a predefined pattern at position
    LoadPattern { pattern: Pattern, x: u32, y: u32 },
}

/// Predefined patterns
#[derive(Debug, Clone, Copy, Serialize, Deserialize, async_graphql::Enum, PartialEq, Eq)]
pub enum Pattern {
    /// A simple 2x2 still life
    Block,
    /// Oscillator that blinks
    Blinker,
    /// A simple spaceship
    Glider,
    /// Lightweight spaceship
    Lwss,
    /// Generates gliders
    GliderGun,
    /// Random soup
    Random,
}

impl Pattern {
    /// Get the cells for this pattern as (dx, dy) offsets
    pub fn cells(&self) -> Vec<(i32, i32)> {
        match self {
            Pattern::Block => vec![
                (0, 0), (1, 0),
                (0, 1), (1, 1),
            ],
            Pattern::Blinker => vec![
                (0, 0), (1, 0), (2, 0),
            ],
            Pattern::Glider => vec![
                (1, 0),
                (2, 1),
                (0, 2), (1, 2), (2, 2),
            ],
            Pattern::Lwss => vec![
                (1, 0), (4, 0),
                (0, 1),
                (0, 2), (4, 2),
                (0, 3), (1, 3), (2, 3), (3, 3),
            ],
            Pattern::GliderGun => vec![
                // Left block
                (0, 4), (0, 5), (1, 4), (1, 5),
                // Left part
                (10, 4), (10, 5), (10, 6),
                (11, 3), (11, 7),
                (12, 2), (12, 8),
                (13, 2), (13, 8),
                (14, 5),
                (15, 3), (15, 7),
                (16, 4), (16, 5), (16, 6),
                (17, 5),
                // Right part
                (20, 2), (20, 3), (20, 4),
                (21, 2), (21, 3), (21, 4),
                (22, 1), (22, 5),
                (24, 0), (24, 1), (24, 5), (24, 6),
                // Right block
                (34, 2), (34, 3), (35, 2), (35, 3),
            ],
            Pattern::Random => vec![], // Handled specially
        }
    }
}

/// Result of an operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationResult {
    /// Operation succeeded
    Ok {
        generation: u64,
        live_count: u32,
    },
    /// Operation failed
    Error(String),
}
