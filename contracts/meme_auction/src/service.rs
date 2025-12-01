//! MemeAuction service implementation for GraphQL queries.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot as _,
    linera_base_types::WithServiceAbi,
    views::{RootView, View},
    Service, ServiceRuntime,
};
use meme_auction::{Auction, AuctioneerStats, AuctionStatus, Bid, MemeAuctionAbi, Operation};
use state::MemeAuctionState;

/// The MemeAuction service.
pub struct MemeAuctionService {
    state: Arc<MemeAuctionState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(MemeAuctionService);

impl WithServiceAbi for MemeAuctionService {
    type Abi = MemeAuctionAbi;
}

impl Service for MemeAuctionService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = MemeAuctionState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MemeAuctionService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Self::Query) -> Self::QueryResponse {
        let schema = Schema::build(
            QueryRoot { state: self.state.clone() },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

/// GraphQL query root.
struct QueryRoot {
    state: Arc<MemeAuctionState>,
}

#[Object]
impl QueryRoot {
    /// Get all auctions (newest first).
    async fn auctions(&self) -> Vec<Auction> {
        self.state.get_all_auctions().await
    }

    /// Get only open auctions.
    async fn open_auctions(&self) -> Vec<Auction> {
        self.state
            .get_all_auctions()
            .await
            .into_iter()
            .filter(|a| a.status == AuctionStatus::Open)
            .collect()
    }

    /// Get ended auctions (waiting to be claimed).
    async fn ended_auctions(&self) -> Vec<Auction> {
        self.state
            .get_all_auctions()
            .await
            .into_iter()
            .filter(|a| a.status == AuctionStatus::Ended)
            .collect()
    }

    /// Get a specific auction by ID.
    async fn auction(&self, id: u64) -> Option<Auction> {
        self.state.get_auction(id).await
    }

    /// Get auctions created by a specific owner.
    async fn my_auctions(&self, owner: String) -> Vec<Auction> {
        self.state
            .get_all_auctions()
            .await
            .into_iter()
            .filter(|a| a.creator == owner)
            .collect()
    }

    /// Get auctions won by a specific owner.
    async fn won_auctions(&self, owner: String) -> Vec<Auction> {
        self.state
            .get_all_auctions()
            .await
            .into_iter()
            .filter(|a| {
                (a.status == AuctionStatus::Ended || a.status == AuctionStatus::Claimed)
                    && a.highest_bidder.as_ref() == Some(&owner)
            })
            .collect()
    }

    /// Get bids for an auction (highest first).
    async fn auction_bids(&self, auction_id: u64) -> Vec<Bid> {
        self.state.get_auction_bids(auction_id).await
    }

    /// Get all bids by a player.
    async fn player_bids(&self, owner: String) -> Vec<Bid> {
        self.state.get_player_bids(&owner).await
    }

    /// Get player statistics.
    async fn player_stats(&self, owner: String) -> AuctioneerStats {
        self.state.get_player_stats(&owner).await
    }

    /// Get meme owner.
    async fn meme_owner(&self, meme_id: u64) -> Option<String> {
        self.state.get_meme_owner(meme_id).await
    }

    /// Get all memes owned by a player.
    async fn player_memes(&self, owner: String) -> Vec<u64> {
        self.state.get_player_memes(&owner).await
    }
}
