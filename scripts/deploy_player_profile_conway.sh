#!/usr/bin/env bash
# Deploy PlayerProfile application to Conway testnet
# 
# Prerequisites:
# - Rust toolchain with wasm32-unknown-unknown target
# - linera CLI compatible with Conway testnet (0.15.x)
# - Initialized wallet: linera wallet init --faucet https://faucet.testnet-conway.linera.net
# - A chain: linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"

echo "============================================"
echo "PlayerProfile Conway Deployment Script"
echo "============================================"
echo ""

# Check for linera CLI
if ! command -v linera &> /dev/null; then
    echo "ERROR: linera CLI not found. Please install it first."
    echo "  cargo install linera-service@0.15.5"
    exit 1
fi

# Check linera version
echo "Using linera version:"
linera --version || echo "(version unknown)"
echo ""

# Navigate to contracts directory
cd "$CONTRACTS_DIR"

# Build the WASM binaries
echo "Building PlayerProfile WASM binaries..."
echo ""

cargo build --release --target wasm32-unknown-unknown -p player_profile

# Check if build succeeded
CONTRACT_WASM="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/player_profile_contract.wasm"
SERVICE_WASM="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/player_profile_service.wasm"

if [[ ! -f "$CONTRACT_WASM" ]]; then
    echo "ERROR: Contract WASM not found at $CONTRACT_WASM"
    exit 1
fi

if [[ ! -f "$SERVICE_WASM" ]]; then
    echo "ERROR: Service WASM not found at $SERVICE_WASM"
    exit 1
fi

echo ""
echo "WASM binaries built successfully:"
echo "  Contract: $CONTRACT_WASM ($(stat -c%s "$CONTRACT_WASM" 2>/dev/null || stat -f%z "$CONTRACT_WASM") bytes)"
echo "  Service:  $SERVICE_WASM ($(stat -c%s "$SERVICE_WASM" 2>/dev/null || stat -f%z "$SERVICE_WASM") bytes)"
echo ""

# Deploy to Conway
echo "Deploying to Conway testnet..."
echo ""

# The PlayerProfile app doesn't need instantiation arguments
APPLICATION_ID=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" \
    --json-argument "null" \
    2>&1 | tail -1)

echo ""
echo "============================================"
echo "Deployment successful!"
echo "============================================"
echo ""
echo "Application ID:"
echo "  $APPLICATION_ID"
echo ""
echo "Add this to your .env file:"
echo ""
echo "  export VITE_PLAYER_PROFILE_APP_ID=$APPLICATION_ID"
echo ""
echo "Or copy-paste into .env:"
echo "  VITE_PLAYER_PROFILE_APP_ID=$APPLICATION_ID"
echo ""
