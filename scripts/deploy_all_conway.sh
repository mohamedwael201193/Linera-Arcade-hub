#!/usr/bin/env bash
#
# deploy_all_conway.sh - Deploy all Linera Arcade Hub contracts to Conway testnet
#
# This script:
#   1. Builds all contracts with size-optimized release profile
#   2. Optimizes WASM files with wasm-opt and wasm-strip
#   3. Deploys to Conway testnet with generous timeouts
#   4. Auto-updates .env with the deployed APP IDs
#
# Prerequisites:
#   - Rust toolchain with wasm32-unknown-unknown target
#   - linera CLI matching Conway testnet version (0.15.x)
#   - Optional: wabt (wasm-strip), binaryen (wasm-opt) for smaller WASM

set -euo pipefail

echo "=============================================="
echo "  Linera Arcade Hub - Conway Deployment"
echo "=============================================="
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

# WASM output directory
TARGET="$ROOT/contracts/target/wasm32-unknown-unknown/release"

# Environment file path
ENV_FILE="$ROOT/.env"

# Timeout settings for large WASM uploads (in milliseconds)
SEND_TIMEOUT=60000     # 60 seconds
RECV_TIMEOUT=600000    # 10 minutes

# Helper function to upsert environment variables in .env
upsert_env() {
    local key="$1"
    local value="$2"
    touch "$ENV_FILE"
    if grep -q "^${key}=" "$ENV_FILE"; then
        if [[ "$(uname)" == "Darwin" ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        fi
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# ==============================================================================
# Step 0: Check prerequisites
# ==============================================================================
echo "Step 0: Checking prerequisites..."

if ! command -v linera &> /dev/null; then
    echo "❌ Error: 'linera' CLI not found."
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Error: 'cargo' not found."
    exit 1
fi

if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
    echo "Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

echo "✓ Prerequisites OK"
echo ""

# ==============================================================================
# Step 1: Set up wallet storage
# ==============================================================================
echo "Step 1: Setting up wallet storage..."

DIR="${LINERA_WALLET_DIR:-$HOME/linera-conway-wallet}"
mkdir -p "$DIR"

export LINERA_WALLET="$DIR/wallet.json"
export LINERA_KEYSTORE="$DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$DIR/client.db"

echo "   Wallet: $LINERA_WALLET"
echo ""

# ==============================================================================
# Step 2: Initialize wallet and chain if needed
# ==============================================================================
echo "Step 2: Initializing wallet and chain..."

FAUCET_URL="https://faucet.testnet-conway.linera.net"

if [ ! -f "$LINERA_WALLET" ]; then
    echo "   Creating new wallet from faucet..."
    linera wallet init --faucet "$FAUCET_URL"
    linera wallet request-chain --faucet "$FAUCET_URL"
    echo "✓ New wallet and chain created"
else
    echo "✓ Using existing wallet"
fi

linera wallet show
echo ""

# ==============================================================================
# Step 3: Build all contracts
# ==============================================================================
echo "Step 3: Building contracts (size-optimized)..."

for contract in player_profile game_of_life prediction_pulse; do
    if [ -d "$ROOT/contracts/$contract" ]; then
        echo "   Building $contract..."
        cargo build --release --target wasm32-unknown-unknown \
            --manifest-path "$ROOT/contracts/$contract/Cargo.toml" 2>&1 | tail -3
        echo "   ✓ $contract built"
    fi
done

echo ""

# ==============================================================================
# Step 4: Optimize WASM artifacts
# ==============================================================================
echo "Step 4: Optimizing WASM artifacts..."

if [ -f "$SCRIPT_DIR/optimize_wasm.sh" ]; then
    bash "$SCRIPT_DIR/optimize_wasm.sh"
else
    echo "⚠ optimize_wasm.sh not found, using raw WASM files"
    # Create .opt.wasm copies (unoptimized)
    for f in "$TARGET"/*.wasm; do
        if [[ -f "$f" ]] && [[ "$f" != *.opt.wasm ]]; then
            cp "$f" "${f%.wasm}.opt.wasm"
        fi
    done
fi

echo ""

# ==============================================================================
# Step 5: Deploy contracts to Conway
# ==============================================================================
echo "Step 5: Deploying contracts to Conway testnet..."
echo "   (Using ${SEND_TIMEOUT}ms send / ${RECV_TIMEOUT}ms recv timeouts)"
echo ""

PLAYER_PROFILE_APP_ID=""
GOL_APP_ID=""
PREDICTION_PULSE_APP_ID=""

# Deploy player_profile
if [ -f "$TARGET/player_profile_contract.opt.wasm" ] && [ -f "$TARGET/player_profile_service.opt.wasm" ]; then
    echo "   Deploying player_profile..."
    PLAYER_PROFILE_APP_ID=$(linera \
        --send-timeout-ms $SEND_TIMEOUT \
        --recv-timeout-ms $RECV_TIMEOUT \
        publish-and-create \
        "$TARGET/player_profile_contract.opt.wasm" \
        "$TARGET/player_profile_service.opt.wasm" \
        --json-argument "null" 2>&1 | tail -1) || true
    if [ -n "$PLAYER_PROFILE_APP_ID" ]; then
        echo "   ✓ player_profile: $PLAYER_PROFILE_APP_ID"
    else
        echo "   ⚠ player_profile deployment failed"
    fi
else
    echo "   ⚠ player_profile WASM not found"
fi

# Deploy game_of_life
if [ -f "$TARGET/game_of_life_contract.opt.wasm" ] && [ -f "$TARGET/game_of_life_service.opt.wasm" ]; then
    echo "   Deploying game_of_life..."
    GOL_APP_ID=$(linera \
        --send-timeout-ms $SEND_TIMEOUT \
        --recv-timeout-ms $RECV_TIMEOUT \
        publish-and-create \
        "$TARGET/game_of_life_contract.opt.wasm" \
        "$TARGET/game_of_life_service.opt.wasm" \
        --json-argument "null" 2>&1 | tail -1) || true
    if [ -n "$GOL_APP_ID" ]; then
        echo "   ✓ game_of_life: $GOL_APP_ID"
    else
        echo "   ⚠ game_of_life deployment failed"
    fi
else
    echo "   ⚠ game_of_life WASM not found"
fi

# Deploy prediction_pulse
if [ -f "$TARGET/prediction_pulse_contract.opt.wasm" ] && [ -f "$TARGET/prediction_pulse_service.opt.wasm" ]; then
    echo "   Deploying prediction_pulse..."
    PREDICTION_PULSE_APP_ID=$(linera \
        --send-timeout-ms $SEND_TIMEOUT \
        --recv-timeout-ms $RECV_TIMEOUT \
        publish-and-create \
        "$TARGET/prediction_pulse_contract.opt.wasm" \
        "$TARGET/prediction_pulse_service.opt.wasm" \
        --json-argument "null" 2>&1 | tail -1) || true
    if [ -n "$PREDICTION_PULSE_APP_ID" ]; then
        echo "   ✓ prediction_pulse: $PREDICTION_PULSE_APP_ID"
    else
        echo "   ⚠ prediction_pulse deployment failed"
    fi
else
    echo "   ⚠ prediction_pulse WASM not found"
fi

echo ""

# ==============================================================================
# Step 6: Update .env with deployed APP IDs
# ==============================================================================
echo "Step 6: Updating .env..."

upsert_env "VITE_LINERA_NETWORK" "conway"
upsert_env "VITE_LINERA_FAUCET_URL" "https://faucet.testnet-conway.linera.net"
upsert_env "VITE_LINERA_VALIDATOR_URL" "https://validator-1.testnet-conway.linera.net"

[ -n "$PLAYER_PROFILE_APP_ID" ] && upsert_env "VITE_PLAYER_PROFILE_APP_ID" "$PLAYER_PROFILE_APP_ID"
[ -n "$GOL_APP_ID" ] && upsert_env "VITE_GOL_APP_ID" "$GOL_APP_ID"
[ -n "$PREDICTION_PULSE_APP_ID" ] && upsert_env "VITE_PREDICTION_PULSE_APP_ID" "$PREDICTION_PULSE_APP_ID"

echo ""
echo "=============================================="
echo "         DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""
echo "PlayerProfile:   ${PLAYER_PROFILE_APP_ID:-<not deployed>}"
echo "Game of Life:    ${GOL_APP_ID:-<not deployed>}"
echo "PredictionPulse: ${PREDICTION_PULSE_APP_ID:-<not deployed>}"
echo ""
echo ".env has been updated. Next: npm run dev"
echo ""
