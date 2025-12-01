//! MemeAuction contract implementation.

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{Amount, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use meme_auction::{Auction, AuctionStatus, Bid, MemeRarity, Operation, MemeAuctionAbi};
use state::MemeAuctionState;

/// The MemeAuction contract.
pub struct MemeAuctionContract {
    state: MemeAuctionState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(MemeAuctionContract);

impl WithContractAbi for MemeAuctionContract {
    type Abi = MemeAuctionAbi;
}

impl Contract for MemeAuctionContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MemeAuctionState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MemeAuctionContract { state, runtime }
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
            Operation::CreateAuction {
                title,
                image_url,
                description,
                rarity,
                starting_price,
                end_time,
            } => {
                // Validate end_time is in the future
                if end_time <= now_seconds {
                    return; // Silently fail - auction end time must be in the future
                }

                let auction_id = self.state.get_next_auction_id().await;
                let meme_id = self.state.get_next_meme_id().await;

                let auction = Auction {
                    id: auction_id,
                    meme_id,
                    title,
                    image_url,
                    description,
                    creator: owner.clone(),
                    rarity,
                    starting_price,
                    current_bid: Amount::ZERO,
                    highest_bidder: None,
                    bid_count: 0,
                    status: AuctionStatus::Open,
                    end_time,
                    created_at: now_seconds,
                };
                self.state.save_auction(auction).await;

                // Update creator stats
                let mut stats = self.state.get_player_stats(&owner).await;
                stats.auctions_created += 1;
                self.state.save_player_stats(&owner, stats).await;
            }

            Operation::PlaceBid { auction_id, amount } => {
                if let Some(mut auction) = self.state.get_auction(auction_id).await {
                    // Check auction is still open
                    if auction.status != AuctionStatus::Open {
                        return; // Auction not open
                    }

                    // Check auction hasn't ended
                    if now_seconds >= auction.end_time {
                        return; // Auction has ended
                    }

                    // Check bid is higher than current bid (or starting price if no bids)
                    let min_bid = if auction.current_bid > Amount::ZERO {
                        auction.current_bid
                    } else {
                        auction.starting_price
                    };

                    if amount <= min_bid {
                        return; // Bid must be higher than current bid
                    }

                    // Can't bid on your own auction
                    if auction.creator == owner {
                        return; // Can't bid on your own auction
                    }

                    // Update auction with new highest bid
                    auction.current_bid = amount;
                    auction.highest_bidder = Some(owner.clone());
                    auction.bid_count += 1;
                    self.state.save_auction(auction).await;

                    // Save bid record
                    let bid = Bid {
                        auction_id,
                        bidder: owner.clone(),
                        amount,
                        placed_at: now_seconds,
                    };
                    self.state.save_bid(bid).await;

                    // Update bidder stats
                    let mut stats = self.state.get_player_stats(&owner).await;
                    stats.total_bids += 1;
                    stats.total_spent = stats.total_spent.saturating_add(amount);
                    self.state.save_player_stats(&owner, stats).await;
                }
            }

            Operation::EndAuction { auction_id } => {
                if let Some(mut auction) = self.state.get_auction(auction_id).await {
                    // Check auction is still open
                    if auction.status != AuctionStatus::Open {
                        return; // Already ended/cancelled
                    }

                    // Check auction end time has passed
                    if now_seconds < auction.end_time {
                        return; // Auction hasn't ended yet
                    }

                    // End the auction
                    auction.status = AuctionStatus::Ended;
                    self.state.save_auction(auction.clone()).await;

                    // If there was a winner, update their stats
                    if let Some(ref winner) = auction.highest_bidder {
                        let mut stats = self.state.get_player_stats(winner).await;
                        stats.auctions_won += 1;
                        self.state.save_player_stats(winner, stats).await;
                    }
                }
            }

            Operation::CancelAuction { auction_id } => {
                if let Some(mut auction) = self.state.get_auction(auction_id).await {
                    // Only creator can cancel
                    if auction.creator != owner {
                        return; // Only creator can cancel
                    }

                    // Can only cancel if no bids
                    if auction.bid_count > 0 {
                        return; // Can't cancel with existing bids
                    }

                    // Can only cancel open auctions
                    if auction.status != AuctionStatus::Open {
                        return; // Already ended/cancelled
                    }

                    auction.status = AuctionStatus::Cancelled;
                    self.state.save_auction(auction).await;
                }
            }

            Operation::ClaimMeme { auction_id } => {
                if let Some(mut auction) = self.state.get_auction(auction_id).await {
                    // Must be ended (not just open)
                    if auction.status != AuctionStatus::Ended {
                        return; // Auction not ended
                    }

                    // Must be the winner
                    if auction.highest_bidder.as_ref() != Some(&owner) {
                        return; // Not the winner
                    }

                    // Mark as claimed
                    auction.status = AuctionStatus::Claimed;
                    self.state.save_auction(auction.clone()).await;

                    // Transfer meme ownership
                    self.state.set_meme_owner(auction.meme_id, owner.clone()).await;

                    // Update winner stats
                    let mut stats = self.state.get_player_stats(&owner).await;
                    stats.memes_collected += 1;
                    self.state.save_player_stats(&owner, stats).await;
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
