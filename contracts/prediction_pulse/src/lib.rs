//! PredictionPulse - A simple on-chain prediction game for Linera Arcade Hub.

use async_graphql::SimpleObject;
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::Amount;
use serde::{Deserialize, Serialize};

/// Application binary interface for PredictionPulse.
pub struct PredictionPulseAbi;

impl linera_sdk::linera_base_types::ContractAbi for PredictionPulseAbi {
    type Operation = Operation;
    type Response = ();
}

impl linera_sdk::linera_base_types::ServiceAbi for PredictionPulseAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}

/// Status of a prediction round.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, async_graphql::Enum)]
pub enum RoundStatus {
    Open,
    Closed,
    Resolved,
    Cancelled,
}

impl Default for RoundStatus {
    fn default() -> Self {
        RoundStatus::Open
    }
}

/// A prediction round.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Round {
    pub id: u64,
    pub title: String,
    pub option_a: String,
    pub option_b: String,
    pub end_time: u64,
    pub status: RoundStatus,
    pub winner: Option<bool>,
    pub pool_a: Amount,
    pub pool_b: Amount,
    pub bettors_a: u64,
    pub bettors_b: u64,
    pub creator: String,
    pub created_at: u64,
}

/// A bet placed by a user.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Bet {
    pub round_id: u64,
    pub owner: String,
    pub choice: bool,
    pub amount: Amount,
    pub placed_at: u64,
    pub claimed: bool,
}

/// Player stats for the prediction game.
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct PlayerStats {
    pub rounds_played: u64,
    pub rounds_won: u64,
    pub total_wagered: Amount,
    pub total_won: Amount,
}

/// Operations that can be performed on the PredictionPulse contract.
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    CreateRound {
        title: String,
        option_a: String,
        option_b: String,
        end_time: u64,
    },
    PlaceBet {
        round_id: u64,
        choice: bool,
        amount: Amount,
    },
    CloseRound {
        round_id: u64,
    },
    ResolveRound {
        round_id: u64,
        winner: bool,
    },
    CancelRound {
        round_id: u64,
    },
    ClaimWinnings {
        round_id: u64,
    },
}
