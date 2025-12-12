#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptyMutation, EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, WithServiceAbi},
    views::{View, ViewStorageContext},
    Service, ServiceRuntime,
};
use state::ArcadeToken;
use std::sync::Arc;

use arcade_token::{Account, ArcadeTokenAbi, TokenState};

pub struct ArcadeTokenService {
    state: Arc<ArcadeToken>,
}

linera_sdk::service!(ArcadeTokenService);

impl WithServiceAbi for ArcadeTokenService {
    type Abi = ArcadeTokenAbi;
}

impl Service for ArcadeTokenService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = ArcadeToken::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        ArcadeTokenService {
            state: Arc::new(state),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<ArcadeToken>,
}

#[Object]
impl QueryRoot {
    /// Get total token supply
    async fn total_supply(&self) -> String {
        self.state.total_supply.get().to_string()
    }

    /// Get balance of an account
    async fn balance(&self, owner: String) -> String {
        let account_owner: AccountOwner = owner.parse().expect("Invalid owner");
        self.state.balance(&account_owner).await.to_string()
    }

    /// Get all accounts with balances
    async fn accounts(&self) -> Vec<Account> {
        self.state
            .get_accounts()
            .await
            .into_iter()
            .map(|(owner, balance)| Account { owner, balance })
            .collect()
    }

    /// Get full token state
    async fn token_state(&self) -> TokenState {
        let accounts = self.accounts().await;
        let total_supply = self.total_supply().await;
        
        TokenState {
            total_supply,
            accounts,
        }
    }
}
