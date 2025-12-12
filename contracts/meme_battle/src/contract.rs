//! Meme Battle contract implementation.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};
use meme_battle::{Match, MatchStatus, MemeRef, Operation, MemeBattleAbi, Round, Tournament, TournamentStatus};
use state::MemeBattleState;

/// The Meme Battle contract.
pub struct MemeBattleContract {
    state: MemeBattleState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(MemeBattleContract);

impl WithContractAbi for MemeBattleContract {
    type Abi = MemeBattleAbi;
}

impl Contract for MemeBattleContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MemeBattleState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MemeBattleContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // No special initialization needed
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let owner = self.runtime.chain_id().to_string();
        let now_micros = self.runtime.system_time().micros();
        // Convert microseconds to seconds for time comparisons
        let now_seconds = (now_micros / 1_000_000) as i64;

        match operation {
            Operation::CreateTournament {
                title,
                description,
                season_id,
                meme_refs,
                match_duration_secs,
            } => {
                // Validate power of 2
                let count = meme_refs.len();
                if !count.is_power_of_two() || count < 4 {
                    // Need at least 4 memes, must be power of 2
                    return;
                }

                let tournament_id = self.state.get_next_tournament_id().await;

                // Create first round matches
                let mut matches = Vec::new();
                for i in (0..count).step_by(2) {
                    let match_id = self.state.get_next_match_id().await;
                    matches.push(Match {
                        match_id,
                        meme_a: meme_refs[i].clone(),
                        meme_b: meme_refs[i + 1].clone(),
                        start_time: now_seconds,
                        end_time: now_seconds + match_duration_secs,
                        votes_a: 0,
                        votes_b: 0,
                        status: MatchStatus::Voting,
                        winner: None,
                    });
                }

                let first_round = Round {
                    round_index: 0,
                    matches,
                };

                let tournament = Tournament {
                    tournament_id,
                    title,
                    description,
                    season_id,
                    meme_refs,
                    current_round: 0,
                    rounds: vec![first_round],
                    status: TournamentStatus::Active,
                    created_at: now_seconds,
                    creator: owner,
                };

                self.state.save_tournament(tournament).await;
            }

            Operation::Vote {
                tournament_id,
                match_id,
                choice,
            } => {
                // Check if already voted
                if self.state.get_vote(match_id, &owner).await.is_some() {
                    return; // Already voted
                }

                // Get tournament and find match
                let mut tournament = match self.state.get_tournament(tournament_id).await {
                    Some(t) => t,
                    None => return,
                };

                if tournament.status != TournamentStatus::Active {
                    return;
                }

                let round_idx = tournament.current_round as usize;
                if round_idx >= tournament.rounds.len() {
                    return;
                }

                let round = &mut tournament.rounds[round_idx];
                let match_opt = round.matches.iter_mut().find(|m| m.match_id == match_id);

                if let Some(match_obj) = match_opt {
                    if match_obj.status != MatchStatus::Voting {
                        return;
                    }

                    // Check time
                    if now_seconds > match_obj.end_time {
                        return; // Voting closed
                    }

                    // Record vote
                    if choice == match_obj.meme_a.meme_id {
                        match_obj.votes_a += 1;
                    } else if choice == match_obj.meme_b.meme_id {
                        match_obj.votes_b += 1;
                    } else {
                        return; // Invalid choice
                    }

                    self.state.save_vote(match_id, &owner, choice).await;
                    self.state.save_tournament(tournament).await;

                    // TODO: Send XP to Arcade Nexus (+15 XP per vote)
                    // This requires cross-application messaging which we'll add in integration phase
                }
            }

            Operation::FinalizeMatch {
                tournament_id,
                match_id,
            } => {
                let mut tournament = match self.state.get_tournament(tournament_id).await {
                    Some(t) => t,
                    None => return,
                };

                let round_idx = tournament.current_round as usize;
                if round_idx >= tournament.rounds.len() {
                    return;
                }

                let round = &mut tournament.rounds[round_idx];
                let match_opt = round.matches.iter_mut().find(|m| m.match_id == match_id);

                if let Some(match_obj) = match_opt {
                    if match_obj.status == MatchStatus::Resolved {
                        return; // Already resolved
                    }

                    // Check time passed
                    if now_seconds < match_obj.end_time {
                        return; // Not ended yet
                    }

                    // Determine winner
                    let winner = if match_obj.votes_a > match_obj.votes_b {
                        match_obj.meme_a.meme_id
                    } else if match_obj.votes_b > match_obj.votes_a {
                        match_obj.meme_b.meme_id
                    } else {
                        // Tie: randomly pick (use meme_id as tiebreaker)
                        if match_obj.meme_a.meme_id > match_obj.meme_b.meme_id {
                            match_obj.meme_a.meme_id
                        } else {
                            match_obj.meme_b.meme_id
                        }
                    };

                    match_obj.winner = Some(winner);
                    match_obj.status = MatchStatus::Resolved;

                    self.state.save_tournament(tournament).await;
                }
            }

            Operation::AdvanceRound { tournament_id } => {
                let mut tournament = match self.state.get_tournament(tournament_id).await {
                    Some(t) => t,
                    None => return,
                };

                let round_idx = tournament.current_round as usize;
                if round_idx >= tournament.rounds.len() {
                    return;
                }

                let round = &tournament.rounds[round_idx];

                // Check all matches are resolved
                if !round.matches.iter().all(|m| m.status == MatchStatus::Resolved) {
                    return;
                }

                // Collect winners
                let winners: Vec<MemeRef> = round
                    .matches
                    .iter()
                    .filter_map(|m| {
                        let winner_id = m.winner?;
                        if winner_id == m.meme_a.meme_id {
                            Some(m.meme_a.clone())
                        } else {
                            Some(m.meme_b.clone())
                        }
                    })
                    .collect();

                if winners.len() == 1 {
                    // Tournament complete
                    tournament.status = TournamentStatus::Completed;
                    self.state.save_tournament(tournament).await;
                    
                    // TODO: Award winner XP via Arcade Nexus
                    // The winner's creator gets +100 XP
                    return;
                }

                // Create next round
                let mut next_matches = Vec::new();
                let match_duration = 3600; // 1 hour per match

                for i in (0..winners.len()).step_by(2) {
                    let match_id = self.state.get_next_match_id().await;
                    next_matches.push(Match {
                        match_id,
                        meme_a: winners[i].clone(),
                        meme_b: winners[i + 1].clone(),
                        start_time: now_seconds,
                        end_time: now_seconds + match_duration,
                        votes_a: 0,
                        votes_b: 0,
                        status: MatchStatus::Voting,
                        winner: None,
                    });
                }

                let next_round = Round {
                    round_index: (round_idx + 1) as u32,
                    matches: next_matches,
                };

                tournament.rounds.push(next_round);
                tournament.current_round += 1;
                self.state.save_tournament(tournament).await;
            }
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {
        // No cross-chain messages in this version
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
