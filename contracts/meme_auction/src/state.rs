//! MemeAuction contract state.

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use meme_auction::{Auction, AuctioneerStats, Bid};

/// The application state stored on-chain.
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct MemeAuctionState {
    /// Counter for generating unique auction IDs.
    pub next_auction_id: RegisterView<u64>,
    
    /// Counter for generating unique meme IDs.
    pub next_meme_id: RegisterView<u64>,
    
    /// All auctions, keyed by auction ID.
    pub auctions: MapView<u64, Auction>,
    
    /// Bid history indexed by "auction_id:bidder" key.
    pub bids: MapView<String, Bid>,
    
    /// Player statistics indexed by owner string.
    pub player_stats: MapView<String, AuctioneerStats>,
    
    /// Meme ownership: meme_id -> owner
    pub meme_owners: MapView<u64, String>,
    
    /// Admin chain ID (creator of the contract).
    pub admin: RegisterView<Option<String>>,
}

impl MemeAuctionState {
    /// Make a bid key from auction_id and bidder
    fn bid_key(auction_id: u64, bidder: &str) -> String {
        format!("{}:{}", auction_id, bidder)
    }

    /// Get the next auction ID and increment the counter.
    pub async fn get_next_auction_id(&mut self) -> u64 {
        let id = *self.next_auction_id.get();
        self.next_auction_id.set(id + 1);
        id
    }

    /// Get the next meme ID and increment the counter.
    pub async fn get_next_meme_id(&mut self) -> u64 {
        let id = *self.next_meme_id.get();
        self.next_meme_id.set(id + 1);
        id
    }

    /// Get an auction by ID.
    pub async fn get_auction(&self, auction_id: u64) -> Option<Auction> {
        self.auctions.get(&auction_id).await.ok().flatten()
    }

    /// Save an auction.
    pub async fn save_auction(&mut self, auction: Auction) {
        let id = auction.id;
        let _ = self.auctions.insert(&id, auction);
    }

    /// Get a bid by auction and bidder.
    pub async fn get_bid(&self, auction_id: u64, bidder: &str) -> Option<Bid> {
        let key = Self::bid_key(auction_id, bidder);
        self.bids.get(&key).await.ok().flatten()
    }

    /// Save a bid.
    pub async fn save_bid(&mut self, bid: Bid) {
        let key = Self::bid_key(bid.auction_id, &bid.bidder);
        let _ = self.bids.insert(&key, bid);
    }

    /// Get player stats.
    pub async fn get_player_stats(&self, owner: &str) -> AuctioneerStats {
        self.player_stats
            .get(&owner.to_string())
            .await
            .ok()
            .flatten()
            .unwrap_or_default()
    }

    /// Save player stats.
    pub async fn save_player_stats(&mut self, owner: &str, stats: AuctioneerStats) {
        let _ = self.player_stats.insert(&owner.to_string(), stats);
    }

    /// Get meme owner.
    pub async fn get_meme_owner(&self, meme_id: u64) -> Option<String> {
        self.meme_owners.get(&meme_id).await.ok().flatten()
    }

    /// Set meme owner.
    pub async fn set_meme_owner(&mut self, meme_id: u64, owner: String) {
        let _ = self.meme_owners.insert(&meme_id, owner);
    }

    /// Get all auctions as a list (sorted by ID descending - newest first).
    pub async fn get_all_auctions(&self) -> Vec<Auction> {
        let mut auctions = Vec::new();
        let keys: Vec<u64> = self.auctions.indices().await.unwrap_or_default();
        for key in keys {
            if let Some(auction) = self.auctions.get(&key).await.ok().flatten() {
                auctions.push(auction);
            }
        }
        auctions.sort_by(|a, b| b.id.cmp(&a.id));
        auctions
    }

    /// Get all bids for a specific auction.
    pub async fn get_auction_bids(&self, auction_id: u64) -> Vec<Bid> {
        let mut bids = Vec::new();
        let prefix = format!("{}:", auction_id);
        let keys: Vec<String> = self.bids.indices().await.unwrap_or_default();
        for key in keys {
            if key.starts_with(&prefix) {
                if let Some(bid) = self.bids.get(&key).await.ok().flatten() {
                    bids.push(bid);
                }
            }
        }
        // Sort by amount descending
        bids.sort_by(|a, b| b.amount.cmp(&a.amount));
        bids
    }

    /// Get all bids by a specific player.
    pub async fn get_player_bids(&self, bidder: &str) -> Vec<Bid> {
        let suffix = format!(":{}", bidder);
        let mut bids = Vec::new();
        let keys: Vec<String> = self.bids.indices().await.unwrap_or_default();
        for key in keys {
            if key.ends_with(&suffix) {
                if let Some(bid) = self.bids.get(&key).await.ok().flatten() {
                    bids.push(bid);
                }
            }
        }
        bids
    }

    /// Get all memes owned by a player.
    pub async fn get_player_memes(&self, owner: &str) -> Vec<u64> {
        let mut meme_ids = Vec::new();
        let keys: Vec<u64> = self.meme_owners.indices().await.unwrap_or_default();
        for key in keys {
            if let Some(meme_owner) = self.meme_owners.get(&key).await.ok().flatten() {
                if meme_owner == owner {
                    meme_ids.push(key);
                }
            }
        }
        meme_ids
    }
}
