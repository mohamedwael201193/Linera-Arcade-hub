//! TypingArena contract implementation.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use typing_arena::{Challenge, ChallengeStatus, Operation, TypingArenaAbi, TypingResult};
use state::TypingArenaState;

/// The TypingArena contract.
pub struct TypingArenaContract {
    state: TypingArenaState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(TypingArenaContract);

impl WithContractAbi for TypingArenaContract {
    type Abi = TypingArenaAbi;
}

impl Contract for TypingArenaContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = TypingArenaState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        TypingArenaContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Set the admin to the creator's chain
        let chain_id = self.runtime.chain_id().to_string();
        self.state.admin.set(Some(chain_id));
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let owner = self.runtime.chain_id().to_string();
        let now_micros = self.runtime.system_time().micros();
        // Convert microseconds to seconds for time comparisons
        let now_seconds = now_micros / 1_000_000;

        match operation {
            Operation::CreateChallenge {
                title,
                text,
                difficulty,
                start_time,
                end_time,
            } => {
                // Validate times
                if end_time <= start_time {
                    return; // End time must be after start time
                }

                // Determine initial status based on current time
                let status = if now_seconds < start_time {
                    ChallengeStatus::Upcoming
                } else if now_seconds < end_time {
                    ChallengeStatus::Active
                } else {
                    ChallengeStatus::Finished
                };

                let challenge_id = self.state.get_next_challenge_id().await;

                let challenge = Challenge {
                    id: challenge_id,
                    creator: owner,
                    title,
                    text,
                    difficulty,
                    status,
                    start_time,
                    end_time,
                    created_at: now_seconds,
                    participant_count: 0,
                    best_wpm: 0,
                    best_player: None,
                };
                self.state.save_challenge(challenge).await;
            }

            Operation::SubmitResult {
                challenge_id,
                wpm,
                accuracy,
                completed,
                time_taken_ms,
            } => {
                if let Some(mut challenge) = self.state.get_challenge(challenge_id).await {
                    // Auto-update challenge status based on time
                    let current_status = if now_seconds < challenge.start_time {
                        ChallengeStatus::Upcoming
                    } else if now_seconds < challenge.end_time {
                        ChallengeStatus::Active
                    } else {
                        ChallengeStatus::Finished
                    };

                    // Update status if it changed (and wasn't cancelled)
                    if challenge.status != ChallengeStatus::Cancelled {
                        challenge.status = current_status;
                    }

                    // Can only submit during active period
                    if challenge.status != ChallengeStatus::Active {
                        return; // Challenge not active
                    }

                    // Validate accuracy is 0-100
                    let accuracy = accuracy.min(100);

                    // Check if player already submitted (allow updates for better scores)
                    let existing = self.state.get_result(challenge_id, &owner).await;
                    let is_new_participant = existing.is_none();
                    
                    // Only accept if this is new or better than previous
                    let should_save = match &existing {
                        None => true,
                        Some(prev) => wpm > prev.wpm || (wpm == prev.wpm && accuracy > prev.accuracy),
                    };

                    if should_save {
                        // Save result
                        let result = TypingResult {
                            challenge_id,
                            player: owner.clone(),
                            wpm,
                            accuracy,
                            completed,
                            time_taken_ms,
                            submitted_at: now_seconds,
                        };
                        self.state.save_result(result).await;

                        // Update challenge stats
                        if is_new_participant {
                            challenge.participant_count += 1;
                        }
                        
                        // Update best score if this is the new best
                        if wpm > challenge.best_wpm {
                            challenge.best_wpm = wpm;
                            challenge.best_player = Some(owner.clone());
                        }
                        self.state.save_challenge(challenge).await;

                        // Update player stats
                        let mut stats = self.state.get_player_stats(&owner).await;
                        
                        if is_new_participant {
                            stats.challenges_completed += 1;
                        }
                        
                        // Estimate words typed based on WPM and time
                        let words_typed = (wpm as u64 * time_taken_ms) / 60000;
                        stats.total_words_typed += words_typed;
                        
                        // Update best WPM if this is personal best
                        if wpm > stats.best_wpm {
                            stats.best_wpm = wpm;
                        }
                        
                        // Recalculate average (simple moving average approximation)
                        if stats.challenges_completed > 0 {
                            let total_wpm = stats.average_wpm as u64 * (stats.challenges_completed - 1) + wpm as u64;
                            stats.average_wpm = (total_wpm / stats.challenges_completed) as u32;
                            
                            let total_acc = stats.average_accuracy as u64 * (stats.challenges_completed - 1) + accuracy as u64;
                            stats.average_accuracy = (total_acc / stats.challenges_completed) as u32;
                        } else {
                            stats.average_wpm = wpm;
                            stats.average_accuracy = accuracy;
                        }
                        
                        self.state.save_player_stats(&owner, stats).await;
                    }
                }
            }

            Operation::CancelChallenge { challenge_id } => {
                if let Some(mut challenge) = self.state.get_challenge(challenge_id).await {
                    // Only creator or admin can cancel
                    let admin = self.state.admin.get().clone();
                    if challenge.creator != owner && admin.as_ref() != Some(&owner) {
                        return; // Not authorized
                    }

                    // Can only cancel upcoming challenges (not yet started)
                    if challenge.status != ChallengeStatus::Upcoming {
                        return; // Can only cancel before start
                    }

                    challenge.status = ChallengeStatus::Cancelled;
                    self.state.save_challenge(challenge).await;
                }
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {
        // No cross-chain messages supported yet
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
