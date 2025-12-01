//! MemeAuction - An on-chain auction house for memes on Linera Arcade Hub.
//!
//! Users can create auctions for memes (with image URLs), place bids,
//! and claim won memes. All state and logic lives on-chain.

use async_graphql::SimpleObject;
use linera_sdk::graphql::GraphQLMutationRoot;
use linera_sdk::linera_base_types::Amount;
use serde::{Deserialize, Serialize};

/// Application binary interface for MemeAuction.
pub struct MemeAuctionAbi;

impl linera_sdk::linera_base_types::ContractAbi for MemeAuctionAbi {
    type Operation = Operation;
    type Response = ();
}

impl linera_sdk::linera_base_types::ServiceAbi for MemeAuctionAbi {
    type Query = async_graphql::Request;
    type QueryResponse = async_graphql::Response;
}

/// Status of an auction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, async_graphql::Enum)]
pub enum AuctionStatus {
    /// Auction is open for bidding
    Open,
    /// Auction has ended (time expired)
    Ended,
    /// Auction was cancelled by creator
    Cancelled,
    /// Winner has claimed the meme
    Claimed,
}

impl Default for AuctionStatus {
    fn default() -> Self {
        AuctionStatus::Open
    }
}

/// Rarity level for memes (affects prestige and display).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, async_graphql::Enum)]
pub enum MemeRarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

impl Default for MemeRarity {
    fn default() -> Self {
        MemeRarity::Common
    }
}

/// A meme being auctioned.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Meme {
    pub id: u64,
    pub title: String,
    pub image_url: String,
    pub description: String,
    pub creator: String,
    pub rarity: MemeRarity,
    pub created_at: u64,
}

/// An auction listing.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Auction {
    pub id: u64,
    pub meme_id: u64,
    pub title: String,
    pub image_url: String,
    pub description: String,
    pub creator: String,
    pub rarity: MemeRarity,
    pub starting_price: Amount,
    pub current_bid: Amount,
    pub highest_bidder: Option<String>,
    pub bid_count: u64,
    pub status: AuctionStatus,
    pub end_time: u64,
    pub created_at: u64,
}

/// A bid record.
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Bid {
    pub auction_id: u64,
    pub bidder: String,
    pub amount: Amount,
    pub placed_at: u64,
}

/// Player statistics for the auction house.
#[derive(Debug, Clone, Default, Serialize, Deserialize, SimpleObject)]
pub struct AuctioneerStats {
    pub auctions_created: u64,
    pub auctions_won: u64,
    pub total_bids: u64,
    pub total_spent: Amount,
    pub memes_collected: u64,
}

/// Operations that can be performed on the MemeAuction contract.
#[derive(Debug, Clone, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Create a new auction for a meme.
    CreateAuction {
        title: String,
        image_url: String,
        description: String,
        rarity: MemeRarity,
        starting_price: Amount,
        /// End time in seconds since epoch
        end_time: u64,
    },
    /// Place a bid on an auction. Amount must be higher than current bid.
    PlaceBid {
        auction_id: u64,
        amount: Amount,
    },
    /// End an auction (can be called by anyone after end_time).
    EndAuction {
        auction_id: u64,
    },
    /// Cancel an auction (creator only, only if no bids).
    CancelAuction {
        auction_id: u64,
    },
    /// Claim a won meme (winner only, after auction ended).
    ClaimMeme {
        auction_id: u64,
    },
}
