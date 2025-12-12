// Market Engine - Core Trading Logic for Prediction Markets
// Implements constant product AMM (Automated Market Maker) for YES/NO outcome tokens

use async_graphql::{Request, Response, SimpleObject};
use serde::{Deserialize, Serialize};

/// Market outcome
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum Outcome {
    Yes,
    No,
}

/// Market resolution
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
pub struct Resolution {
    pub resolved_at: u64,
    pub winning_outcome: String, // "Yes", "No", or "Invalid"
    pub resolver: String,
}

/// User position
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
pub struct Position {
    pub owner: String,
    pub yes_shares: String,
    pub no_shares: String,
    pub total_invested: String,
}

/// Trade record
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
pub struct Trade {
    pub trade_id: u64,
    pub trader: String,
    pub outcome: String,
    pub shares: String,
    pub cost: String,
    pub timestamp: u64,
}

/// Market state snapshot
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
pub struct MarketState {
    pub yes_pool: String,
    pub no_pool: String,
    pub total_volume: String,
    pub yes_probability: f64,
    pub is_resolved: bool,
    pub resolution: Option<Resolution>,
}

/// Market operations
#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
    /// Buy outcome shares
    Buy { outcome: Outcome, max_cost: String },
    /// Sell outcome shares
    Sell { outcome: Outcome, shares: String },
    /// Resolve market (admin/oracle only)
    Resolve { winning_outcome: String },
    /// Claim winnings after resolution
    Claim,
}

/// Application ABI
pub struct MarketEngineAbi;

impl linera_sdk::abi::ContractAbi for MarketEngineAbi {
    type Operation = Operation;
    type Response = String; // Returns shares/payout amount
}

impl linera_sdk::abi::ServiceAbi for MarketEngineAbi {
    type Query = Request;
    type QueryResponse = Response;
}
