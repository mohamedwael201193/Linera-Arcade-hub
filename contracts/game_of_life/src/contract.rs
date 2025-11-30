// Copyright (c) Linera Arcade Hub
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

//! Contract implementation for Game of Life application

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use game_of_life::{
    GameOfLifeAbi, GridState, Operation, OperationResult, 
    Pattern, GRID_WIDTH, GRID_HEIGHT,
};

use self::state::GameOfLifeState;

/// The contract handler
pub struct GameOfLifeContract {
    state: GameOfLifeState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(GameOfLifeContract);

impl WithContractAbi for GameOfLifeContract {
    type Abi = GameOfLifeAbi;
}

impl Contract for GameOfLifeContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = GameOfLifeState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        GameOfLifeContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Initialize with empty grid
        self.state.grid.set(GridState::new());
    }

    async fn execute_operation(&mut self, operation: Operation) -> OperationResult {
        match operation {
            Operation::Toggle { x, y } => {
                if x as usize >= GRID_WIDTH || y as usize >= GRID_HEIGHT {
                    return OperationResult::Error("Position out of bounds".to_string());
                }
                let mut grid = self.state.grid.get().clone();
                grid.toggle(x as usize, y as usize);
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: grid.generation,
                    live_count: grid.live_count(),
                }
            }
            
            Operation::SetCells { positions, alive } => {
                let mut grid = self.state.grid.get().clone();
                for pos in positions {
                    if (pos.x as usize) < GRID_WIDTH && (pos.y as usize) < GRID_HEIGHT {
                        grid.set(pos.x as usize, pos.y as usize, alive);
                    }
                }
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: grid.generation,
                    live_count: grid.live_count(),
                }
            }
            
            Operation::Step => {
                let mut grid = self.state.grid.get().clone();
                grid.step();
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: grid.generation,
                    live_count: grid.live_count(),
                }
            }
            
            Operation::StepMultiple { count } => {
                let mut grid = self.state.grid.get().clone();
                for _ in 0..count.min(100) { // Limit to prevent gas exhaustion
                    grid.step();
                }
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: grid.generation,
                    live_count: grid.live_count(),
                }
            }
            
            Operation::Start => {
                let mut grid = self.state.grid.get().clone();
                grid.running = true;
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: grid.generation,
                    live_count: grid.live_count(),
                }
            }
            
            Operation::Stop => {
                let mut grid = self.state.grid.get().clone();
                grid.running = false;
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: grid.generation,
                    live_count: grid.live_count(),
                }
            }
            
            Operation::Clear => {
                let mut grid = GridState::new();
                grid.running = false;
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: 0,
                    live_count: 0,
                }
            }
            
            Operation::Randomize { seed } => {
                let mut grid = self.state.grid.get().clone();
                // Use timestamp as additional entropy
                let actual_seed = seed ^ self.runtime.system_time().micros();
                grid.randomize(actual_seed);
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: grid.generation,
                    live_count: grid.live_count(),
                }
            }
            
            Operation::LoadPattern { pattern, x, y } => {
                let mut grid = self.state.grid.get().clone();
                
                if pattern == Pattern::Random {
                    // Special case: fill 8x8 area with random cells
                    let seed = x as u64 ^ (y as u64 * 12345) ^ 
                        self.runtime.system_time().micros();
                    let mut rng = seed;
                    for dy in 0..8 {
                        for dx in 0..8 {
                            rng = rng.wrapping_mul(6364136223846793005).wrapping_add(1);
                            let alive = (rng >> 32) & 1 == 1;
                            let nx = x as usize + dx;
                            let ny = y as usize + dy;
                            if nx < GRID_WIDTH && ny < GRID_HEIGHT {
                                grid.set(nx, ny, alive);
                            }
                        }
                    }
                } else {
                    for (dx, dy) in pattern.cells() {
                        let nx = x as i32 + dx;
                        let ny = y as i32 + dy;
                        if nx >= 0 && (nx as usize) < GRID_WIDTH && 
                           ny >= 0 && (ny as usize) < GRID_HEIGHT {
                            grid.set(nx as usize, ny as usize, true);
                        }
                    }
                }
                
                self.state.grid.set(grid.clone());
                OperationResult::Ok {
                    generation: grid.generation,
                    live_count: grid.live_count(),
                }
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {
        panic!("Game of Life does not support cross-chain messages");
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
