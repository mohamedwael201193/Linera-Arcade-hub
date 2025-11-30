//! PredictionPulse contract implementation.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{Amount, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use prediction_pulse::{Bet, Operation, PredictionPulseAbi, Round, RoundStatus};
use state::PredictionPulseState;

/// The PredictionPulse contract.
pub struct PredictionPulseContract {
    state: PredictionPulseState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(PredictionPulseContract);

impl WithContractAbi for PredictionPulseContract {
    type Abi = PredictionPulseAbi;
}

impl Contract for PredictionPulseContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = PredictionPulseState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        PredictionPulseContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Set the admin to the creator's chain
        let chain_id = self.runtime.chain_id().to_string();
        self.state.admin.set(Some(chain_id));
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let owner = self.runtime.chain_id().to_string();
        let now = self.runtime.system_time().micros();

        match operation {
            Operation::CreateRound {
                title,
                option_a,
                option_b,
                end_time,
            } => {
                let id = self.state.get_next_round_id().await;
                let round = Round {
                    id,
                    title,
                    option_a,
                    option_b,
                    end_time,
                    status: RoundStatus::Open,
                    winner: None,
                    pool_a: Amount::ZERO,
                    pool_b: Amount::ZERO,
                    bettors_a: 0,
                    bettors_b: 0,
                    creator: owner,
                    created_at: now,
                };
                self.state.save_round(round).await;
            }
            Operation::PlaceBet {
                round_id,
                choice,
                amount,
            } => {
                let round = self.state.get_round(round_id).await;
                if let Some(mut round) = round {
                    // Convert current time from microseconds to seconds for comparison
                    let now_seconds = now / 1_000_000;
                    if round.status == RoundStatus::Open && now_seconds < round.end_time {
                        // Update pool
                        if choice {
                            round.pool_a = round.pool_a.saturating_add(amount);
                            round.bettors_a += 1;
                        } else {
                            round.pool_b = round.pool_b.saturating_add(amount);
                            round.bettors_b += 1;
                        }
                        self.state.save_round(round).await;

                        // Save bet
                        let bet = Bet {
                            round_id,
                            owner: owner.clone(),
                            choice,
                            amount,
                            placed_at: now,
                            claimed: false,
                        };
                        self.state.save_bet(bet).await;

                        // Update player stats
                        let mut stats = self.state.get_player_stats(&owner).await;
                        stats.rounds_played += 1;
                        stats.total_wagered = stats.total_wagered.saturating_add(amount);
                        self.state.save_player_stats(&owner, stats).await;
                    }
                }
            }
            Operation::CloseRound { round_id } => {
                if let Some(mut round) = self.state.get_round(round_id).await {
                    let admin = self.state.admin.get().clone();
                    if admin.as_ref() == Some(&owner) || round.creator == owner {
                        round.status = RoundStatus::Closed;
                        self.state.save_round(round).await;
                    }
                }
            }
            Operation::ResolveRound { round_id, winner } => {
                if let Some(mut round) = self.state.get_round(round_id).await {
                    let admin = self.state.admin.get().clone();
                    if admin.as_ref() == Some(&owner) || round.creator == owner {
                        round.status = RoundStatus::Resolved;
                        round.winner = Some(winner);
                        self.state.save_round(round).await;
                    }
                }
            }
            Operation::CancelRound { round_id } => {
                if let Some(mut round) = self.state.get_round(round_id).await {
                    let admin = self.state.admin.get().clone();
                    if admin.as_ref() == Some(&owner) || round.creator == owner {
                        round.status = RoundStatus::Cancelled;
                        self.state.save_round(round).await;
                    }
                }
            }
            Operation::ClaimWinnings { round_id } => {
                if let Some(round) = self.state.get_round(round_id).await {
                    if round.status == RoundStatus::Resolved {
                        if let Some(mut bet) = self.state.get_bet(round_id, &owner).await {
                            if !bet.claimed && round.winner == Some(bet.choice) {
                                let total_pool = round.pool_a.saturating_add(round.pool_b);
                                let winning_pool = if bet.choice {
                                    round.pool_a
                                } else {
                                    round.pool_b
                                };
                                
                                // Calculate winnings proportionally
                                // winnings = total_pool * bet.amount / winning_pool
                                if winning_pool > Amount::ZERO {
                                    // Use unit as 1 atto for conversion
                                    let unit = Amount::from_attos(1);
                                    let bet_attos = bet.amount.saturating_div(unit);
                                    let pool_attos = winning_pool.saturating_div(unit);
                                    let total_attos = total_pool.saturating_div(unit);
                                    
                                    // winnings = (bet * total) / pool
                                    let winnings_attos = bet_attos
                                        .saturating_mul(total_attos)
                                        .checked_div(pool_attos)
                                        .unwrap_or(0);
                                    
                                    let winnings = Amount::from_attos(winnings_attos);
                                    
                                    bet.claimed = true;
                                    self.state.save_bet(bet).await;

                                    let mut stats = self.state.get_player_stats(&owner).await;
                                    stats.rounds_won += 1;
                                    stats.total_won = stats.total_won.saturating_add(winnings);
                                    self.state.save_player_stats(&owner, stats).await;
                                }
                            }
                        }
                    }
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
