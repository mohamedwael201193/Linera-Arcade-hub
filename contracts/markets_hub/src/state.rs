// Markets Hub State Management
use linera_sdk::views::{MapView, RegisterView, RootView, View};
use markets_hub::{MarketMetadata, MarketStatus};

/// Markets Hub application state
#[derive(RootView)]
pub struct MarketsHubState {
    /// Next market ID
    pub next_market_id: RegisterView<u64>,
    /// Market metadata by ID
    pub markets: MapView<u64, MarketMetadata>,
}

impl MarketsHubState {
    /// Get next market ID and increment
    pub async fn get_next_market_id(&mut self) -> u64 {
        let id = self.next_market_id.get();
        self.next_market_id.set(id + 1);
        id
    }

    /// Save market metadata
    pub async fn save_market(&mut self, market: MarketMetadata) -> Result<(), String> {
        self.markets
            .insert(&market.market_id, market)
            .map_err(|e| format!("Failed to save market: {}", e))
    }

    /// Get market by ID
    pub async fn get_market(&self, market_id: u64) -> Option<MarketMetadata> {
        self.markets
            .get(&market_id)
            .await
            .ok()
            .flatten()
    }

    /// Get all active markets
    pub async fn get_active_markets(&self) -> Vec<MarketMetadata> {
        let mut markets = Vec::new();
        
        self.markets
            .for_each_index_value(|_id, market| {
                if matches!(market.status, MarketStatus::Active) {
                    markets.push(market.clone());
                }
                Ok(())
            })
            .await
            .unwrap_or(());
        
        markets
    }

    /// Get markets by category
    pub async fn get_markets_by_category(&self, category: &str) -> Vec<MarketMetadata> {
        let mut markets = Vec::new();
        
        self.markets
            .for_each_index_value(|_id, market| {
                if market.category == category {
                    markets.push(market.clone());
                }
                Ok(())
            })
            .await
            .unwrap_or(());
        
        markets
    }

    /// Get all markets
    pub async fn get_all_markets(&self) -> Vec<MarketMetadata> {
        let mut markets = Vec::new();
        
        self.markets
            .for_each_index_value(|_id, market| {
                markets.push(market.clone());
                Ok(())
            })
            .await
            .unwrap_or(());
        
        markets
    }
}
