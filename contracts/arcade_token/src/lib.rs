// Arcade Token - Fungible Token for Arcade Markets
// Simple fungible token implementation for betting in prediction markets

use async_graphql::{Request, Response, SimpleObject};
use linera_sdk::base::{AccountOwner, Amount, Owner};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Token operations
#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
    /// Mint new tokens (admin only)
    Mint { owner: Owner, amount: Amount },
    /// Transfer tokens between accounts
    Transfer { to: AccountOwner, amount: Amount },
    /// Burn tokens
    Burn { amount: Amount },
}

/// Token messages (cross-chain)
#[derive(Debug, Serialize, Deserialize)]
pub enum Message {
    Credit { owner: Owner, amount: Amount },
}

/// GraphQL account entry
#[derive(Clone, Debug, SimpleObject)]
pub struct Account {
    pub owner: String,
    pub balance: String,
}

/// Token state snapshot for GraphQL
#[derive(Clone, Debug, SimpleObject)]
pub struct TokenState {
    pub total_supply: String,
    pub accounts: Vec<Account>,
}

/// Application ABI
pub struct ArcadeTokenAbi;

impl linera_sdk::abi::ContractAbi for ArcadeTokenAbi {
    type Operation = Operation;
    type Response = ();
}

impl linera_sdk::abi::ServiceAbi for ArcadeTokenAbi {
    type Query = Request;
    type QueryResponse = Response;
}
