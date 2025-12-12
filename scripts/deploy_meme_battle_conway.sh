#!/bin/bash
# Deploy Meme Battle Royale Contract to Conway Testnet
# This script publishes the meme_battle contract bytecode and creates a Meme Battle application

set -e

echo "🏆 Deploying Meme Battle Royale Contract to Conway Testnet..."
echo "============================================"

# Check if linera binary exists
if ! command -v linera &> /dev/null; then
    echo "❌ Error: linera CLI not found"
    echo "Please install Linera toolchain first:"
    echo "  ./scripts/setup_linera_toolchain.sh"
    exit 1
fi

# Get the default wallet
WALLET=$(linera wallet show)
if [ -z "$WALLET" ]; then
    echo "❌ Error: No default wallet configured"
    echo "Please set up a wallet first"
    exit 1
fi

echo "📍 Using wallet: $WALLET"
echo ""

# Navigate to contracts directory
cd "$(dirname "$0")/../contracts" || exit 1

echo "🔨 Building Meme Battle contract..."
cargo build --release --target wasm32-unknown-unknown --package meme_battle

echo "� Publishing bytecode and creating application..."
# Use publish-and-create command (no initialization arguments needed)
RESULT=$(linera publish-and-create \
    target/wasm32-unknown-unknown/release/meme_battle_contract.wasm \
    target/wasm32-unknown-unknown/release/meme_battle_service.wasm \
    2>&1)

echo "$RESULT"

# Extract Application ID from output
APP_ID=$(echo "$RESULT" | grep -oP '(?<=Application ID: )[a-f0-9]+')

if [ -z "$APP_ID" ]; then
    echo "❌ Error: Failed to extract Application ID"
    echo "Output was: $RESULT"
    exit 1
fi

echo ""
echo "============================================"
echo "🎉 Deployment Complete!"
echo "============================================"
echo ""
echo "✅ Meme Battle deployed successfully!"
echo "Add this to your .env file:"
echo ""
echo "VITE_MEME_BATTLE_APP_ID=$APP_ID"
echo ""
echo "Application ID: $APP_ID"
echo ""
echo "To test the contract:"
echo "  linera service --port 8080 &"
echo "  Open browser to http://localhost:8080/chains/<YOUR_CHAIN>/applications/$APP_ID"
echo ""
