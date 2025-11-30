#!/usr/bin/env bash
# ==============================================================================
# Linera Arcade Hub - Build & Run Script (Localnet)
# ==============================================================================
# This script runs inside the Docker container at /build
# It sets up the Linera local network, builds contracts, and starts the frontend
# Uses the buildathon-template Linera SDK (0.15.x)
# ==============================================================================

set -euo pipefail

echo "=============================================="
echo "  Linera Arcade Hub - Starting (Localnet)..."
echo "=============================================="

# Source nvm to make node/npm available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Helper to optimize WASM files
optimize_wasm() {
    local wasm_file="$1"
    local opt_file="${wasm_file%.wasm}.opt.wasm"
    
    if command -v wasm-opt &> /dev/null; then
        wasm-opt -Oz "$wasm_file" -o "$opt_file" 2>/dev/null || cp "$wasm_file" "$opt_file"
    else
        cp "$wasm_file" "$opt_file"
    fi
    
    if command -v wasm-strip &> /dev/null; then
        wasm-strip "$opt_file" 2>/dev/null || true
    fi
    
    echo "$opt_file"
}

# ------------------------------------------------------------------------------
# Step 1: Start Linera local network with faucet
# ------------------------------------------------------------------------------
echo ""
echo "[1/5] Starting Linera local network..."
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

export LINERA_FAUCET_URL=http://localhost:8080
echo "  ✓ Faucet running at $LINERA_FAUCET_URL"

# ------------------------------------------------------------------------------
# Step 2: Initialize wallet and request chain
# ------------------------------------------------------------------------------
echo ""
echo "[2/5] Initializing wallet..."
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"
echo "  ✓ Wallet initialized with chain"

# ------------------------------------------------------------------------------
# Step 3: Build and deploy contracts (if they exist)
# ------------------------------------------------------------------------------
echo ""
echo "[3/5] Building contracts..."

# Contract directory location (contracts/ instead of apps/)
CONTRACTS_DIR="contracts"
WASM_TARGET="target/wasm32-unknown-unknown/release"

# Build PlayerProfile contract if it exists
if [ -d "${CONTRACTS_DIR}/player_profile" ]; then
    echo "  Building PlayerProfile..."
    cd "${CONTRACTS_DIR}/player_profile"
    cargo build --release --target wasm32-unknown-unknown
    cd /build
    
    # Optimize WASM
    CONTRACT_WASM=$(optimize_wasm "${CONTRACTS_DIR}/${WASM_TARGET}/player_profile_contract.wasm")
    SERVICE_WASM=$(optimize_wasm "${CONTRACTS_DIR}/${WASM_TARGET}/player_profile_service.wasm")
    
    # Deploy the contract
    echo "  Deploying PlayerProfile to local network..."
    PLAYER_PROFILE_APP_ID=$(linera publish-and-create \
        "$CONTRACT_WASM" "$SERVICE_WASM" \
        2>&1 | grep -oP 'Application ID: \K.*' || echo "")
    
    if [ -n "$PLAYER_PROFILE_APP_ID" ]; then
        export VITE_PLAYER_PROFILE_APP_ID="$PLAYER_PROFILE_APP_ID"
        echo "  ✓ PlayerProfile deployed: $PLAYER_PROFILE_APP_ID"
    fi
fi

# Build Game of Life contract if it exists
if [ -d "${CONTRACTS_DIR}/game_of_life" ]; then
    echo "  Building Game of Life..."
    cd "${CONTRACTS_DIR}/game_of_life"
    cargo build --release --target wasm32-unknown-unknown
    cd /build
    
    # Optimize WASM
    CONTRACT_WASM=$(optimize_wasm "${CONTRACTS_DIR}/${WASM_TARGET}/game_of_life_contract.wasm")
    SERVICE_WASM=$(optimize_wasm "${CONTRACTS_DIR}/${WASM_TARGET}/game_of_life_service.wasm")
    
    echo "  Deploying Game of Life to local network..."
    GOL_APP_ID=$(linera publish-and-create \
        "$CONTRACT_WASM" "$SERVICE_WASM" \
        2>&1 | grep -oP 'Application ID: \K.*' || echo "")
    
    if [ -n "$GOL_APP_ID" ]; then
        export VITE_GOL_APP_ID="$GOL_APP_ID"
        echo "  ✓ Game of Life deployed: $GOL_APP_ID"
    fi
fi

# Build Prediction Pulse contract if it exists
if [ -d "${CONTRACTS_DIR}/prediction_pulse" ]; then
    echo "  Building Prediction Pulse..."
    cd "${CONTRACTS_DIR}/prediction_pulse"
    cargo build --release --target wasm32-unknown-unknown
    cd /build
    
    # Optimize WASM
    CONTRACT_WASM=$(optimize_wasm "${CONTRACTS_DIR}/${WASM_TARGET}/prediction_pulse_contract.wasm")
    SERVICE_WASM=$(optimize_wasm "${CONTRACTS_DIR}/${WASM_TARGET}/prediction_pulse_service.wasm")
    
    echo "  Deploying Prediction Pulse to local network..."
    PREDICTION_APP_ID=$(linera publish-and-create \
        "$CONTRACT_WASM" "$SERVICE_WASM" \
        2>&1 | grep -oP 'Application ID: \K.*' || echo "")
    
    if [ -n "$PREDICTION_APP_ID" ]; then
        export VITE_PREDICTION_PULSE_APP_ID="$PREDICTION_APP_ID"
        echo "  ✓ Prediction Pulse deployed: $PREDICTION_APP_ID"
    fi
fi

echo "  ✓ Contracts ready"

# ------------------------------------------------------------------------------
# Step 4: Install frontend dependencies
# ------------------------------------------------------------------------------
echo ""
echo "[4/5] Installing frontend dependencies..."
npm install
echo "  ✓ Dependencies installed"

# ------------------------------------------------------------------------------
# Step 5: Start the frontend dev server
# ------------------------------------------------------------------------------
echo ""
echo "[5/5] Starting frontend..."
echo "=============================================="
echo "  Linera Arcade Hub is now running!"
echo "  Open: http://localhost:5173"
echo "=============================================="
echo ""

# Run Vite dev server on port 5173, accessible from outside container
npm run dev -- --host 0.0.0.0 --port 5173
