#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, Owner, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use state::ArcadeToken;

use arcade_token::{ArcadeTokenAbi, Message, Operation};

pub struct ArcadeTokenContract {
    state: ArcadeToken,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(ArcadeTokenContract);

impl WithContractAbi for ArcadeTokenContract {
    type Abi = ArcadeTokenAbi;
}

impl Contract for ArcadeTokenContract {
    type Message = Message;
    type Parameters = ();
    type InstantiationArgument = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = ArcadeToken::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        ArcadeTokenContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        // Initialize with zero supply
        self.state.total_supply.set(Amount::ZERO);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        let owner = self.runtime.authenticated_signer().expect("Missing signer");
        
        match operation {
            Operation::Mint { owner: to_owner, amount } => {
                // In production, add admin check here
                self.state.mint(to_owner, amount).await.expect("Mint failed");
            }
            Operation::Transfer { to, amount } => {
                self.state.transfer(owner, to, amount).await.expect("Transfer failed");
            }
            Operation::Burn { amount } => {
                self.state.burn(owner, amount).await.expect("Burn failed");
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::Credit { owner, amount } => {
                let account = AccountOwner::User(owner);
                self.state.mint(owner, amount).await.expect("Credit failed");
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}
