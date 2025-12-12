// Arcade Token State Management
use linera_sdk::{
    base::{AccountOwner, Amount, Owner},
    views::{MapView, RegisterView, RootView, View, ViewStorageContext},
};
use std::collections::BTreeMap;

/// Arcade Token application state
#[derive(RootView)]
pub struct ArcadeToken {
    /// Total token supply
    pub total_supply: RegisterView<Amount>,
    /// Account balances
    pub balances: MapView<AccountOwner, Amount>,
}

impl ArcadeToken {
    /// Get balance of an account
    pub async fn balance(&self, owner: &AccountOwner) -> Amount {
        self.balances.get(owner).await.unwrap_or_default().unwrap_or_default()
    }

    /// Mint new tokens (admin only)
    pub async fn mint(&mut self, owner: Owner, amount: Amount) -> Result<(), String> {
        let account_owner = AccountOwner::User(owner);
        let current_balance = self.balance(&account_owner).await;
        
        self.balances
            .insert(&account_owner, current_balance.saturating_add(amount))
            .map_err(|e| format!("Failed to update balance: {}", e))?;
        
        let total = self.total_supply.get();
        self.total_supply
            .set(total.saturating_add(amount));
        
        Ok(())
    }

    /// Transfer tokens
    pub async fn transfer(&mut self, from: Owner, to: AccountOwner, amount: Amount) -> Result<(), String> {
        let from_account = AccountOwner::User(from);
        let from_balance = self.balance(&from_account).await;
        
        if from_balance < amount {
            return Err("Insufficient balance".to_string());
        }
        
        // Deduct from sender
        let new_from_balance = from_balance.saturating_sub(amount);
        if new_from_balance == Amount::ZERO {
            self.balances.remove(&from_account).map_err(|e| format!("Remove failed: {}", e))?;
        } else {
            self.balances
                .insert(&from_account, new_from_balance)
                .map_err(|e| format!("Update sender failed: {}", e))?;
        }
        
        // Add to receiver
        let to_balance = self.balance(&to).await;
        self.balances
            .insert(&to, to_balance.saturating_add(amount))
            .map_err(|e| format!("Update receiver failed: {}", e))?;
        
        Ok(())
    }

    /// Burn tokens
    pub async fn burn(&mut self, owner: Owner, amount: Amount) -> Result<(), String> {
        let account_owner = AccountOwner::User(owner);
        let balance = self.balance(&account_owner).await;
        
        if balance < amount {
            return Err("Insufficient balance to burn".to_string());
        }
        
        let new_balance = balance.saturating_sub(amount);
        if new_balance == Amount::ZERO {
            self.balances.remove(&account_owner).map_err(|e| format!("Remove failed: {}", e))?;
        } else {
            self.balances
                .insert(&account_owner, new_balance)
                .map_err(|e| format!("Update balance failed: {}", e))?;
        }
        
        let total = self.total_supply.get();
        self.total_supply.set(total.saturating_sub(amount));
        
        Ok(())
    }

    /// Get all accounts with balances
    pub async fn get_accounts(&self) -> Vec<(String, String)> {
        let mut accounts = Vec::new();
        
        self.balances
            .for_each_index_value(|owner, balance| {
                accounts.push((owner.to_string(), balance.to_string()));
                Ok(())
            })
            .await
            .unwrap_or(());
        
        accounts
    }
}
