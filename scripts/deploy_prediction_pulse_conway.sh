#!/usr/bin/env bash
# Deploy PredictionPulse contract to Conway testnet
# Run from project root: ./scripts/deploy_prediction_pulse_conway.sh

set -euo pipefail

echo "🎯 Deploying PredictionPulse to Conway testnet..."

# Configuration
FAUCET_URL="${LINERA_FAUCET_URL:-https://faucet.testnet-conway.linera.net}"
CONTRACT_DIR="contracts/prediction_pulse"
TARGET_DIR="target/wasm32-unknown-unknown/release"

# Check if linera CLI is available
if ! command -v linera &> /dev/null; then
    echo "❌ linera CLI not found. Please install it first."
    echo "   cargo install linera-service@0.15.5"
    exit 1
fi

# Build the contract
echo "📦 Building PredictionPulse contract..."
cd "$(dirname "$0")/.."
cd contracts
cargo build --release --target wasm32-unknown-unknown -p prediction_pulse

# Get the WASM files
CONTRACT_WASM="../${TARGET_DIR}/prediction_pulse.wasm"
SERVICE_WASM="../${TARGET_DIR}/prediction_pulse.wasm"

if [[ ! -f "${CONTRACT_WASM}" ]]; then
    echo "❌ Contract WASM not found at ${CONTRACT_WASM}"
    exit 1
fi

# Create a temporary wallet for deployment
echo "🔑 Creating deployment wallet..."
WALLET_DIR=$(mktemp -d)
export LINERA_WALLET="${WALLET_DIR}/wallet.json"
export LINERA_STORAGE="rocksdb:${WALLET_DIR}/storage"

# Initialize wallet from faucet
echo "💰 Requesting tokens from faucet..."
linera wallet init --with-new-chain --faucet "${FAUCET_URL}"

# Get the chain ID
CHAIN_ID=$(linera wallet show | grep "Chain" | head -1 | awk '{print $2}')
echo "📍 Chain ID: ${CHAIN_ID}"

# Publish the bytecode
echo "📤 Publishing bytecode..."
BYTECODE_ID=$(linera publish-bytecode "${CONTRACT_WASM}" "${SERVICE_WASM}")
echo "📋 Bytecode ID: ${BYTECODE_ID}"

# Create the application
echo "🚀 Creating application..."
APP_ID=$(linera create-application "${BYTECODE_ID}")
echo "✅ Application ID: ${APP_ID}"

# Output environment variables for the frontend
echo ""
echo "======================================"
echo "🎉 PredictionPulse deployed successfully!"
echo "======================================"
echo ""
echo "Add these to your .env file:"
echo ""
echo "VITE_PREDICTION_PULSE_APP_ID=${APP_ID}"
echo "VITE_PREDICTION_PULSE_CHAIN_ID=${CHAIN_ID}"
echo ""
echo "======================================"

# Cleanup
rm -rf "${WALLET_DIR}"

echo "🧹 Temporary wallet cleaned up."
echo "✨ Done!"
