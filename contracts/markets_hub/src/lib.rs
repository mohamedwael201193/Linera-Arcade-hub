// Markets Hub - Central Registry for Prediction Markets
// Manages market metadata, categories, and discovery

use async_graphql::{InputObject, Request, Response, SimpleObject};
use serde::{Deserialize, Serialize};

/// Market metadata
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
#[graphql(input_name = "MarketMetadataInput")]
pub struct MarketMetadata {
    pub market_id: u64,
    pub title: String,
    pub description: String,
    pub category: String,
    pub creator: String,
    pub engine_app_id: String,
    pub created_at: u64,
    pub resolve_time: u64,
    pub status: MarketStatus,
    pub total_volume: String,
    pub yes_probability: f64,
}

/// Market status
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
pub enum MarketStatus {
    Active,
    Locked,
    Resolved,
    Cancelled,
}

/// Hub operations
#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
    /// Register a new market
    RegisterMarket {
        title: String,
        description: String,
        category: String,
        engine_app_id: String,
        resolve_time: u64,
    },
    /// Update market stats
    UpdateMarket {
        market_id: u64,
        status: MarketStatus,
        total_volume: String,
        yes_probability: f64,
    },
}

/// Application ABI
pub struct MarketsHubAbi;

impl linera_sdk::abi::ContractAbi for MarketsHubAbi {
    type Operation = Operation;
    type Response = u64; // Returns market_id
}

impl linera_sdk::abi::ServiceAbi for MarketsHubAbi {
    type Query = Request;
    type QueryResponse = Response;
}
