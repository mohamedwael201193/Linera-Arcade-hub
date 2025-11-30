#!/usr/bin/env bash
set -euo pipefail
#
# setup_linera_toolchain.sh
#
# Installs Rust toolchain, wasm32 target, protoc, linera-storage-service@0.15.6 
# and linera-service@0.15.6 for Testnet Conway.
#
# This script is idempotent - it checks what's already installed and only
# installs what's missing.
#
# Usage:
#   chmod +x scripts/setup_linera_toolchain.sh
#   ./scripts/setup_linera_toolchain.sh
#
# Or via npm:
#   npm run setup:linera
#

echo "=============================================="
echo "  Linera Toolchain Setup (Conway Testnet)"
echo "=============================================="
echo ""

# Detect OS
OS="$(uname -s)"
echo "Detected OS: $OS"
echo ""

#
# Step 1: Rust Toolchain
#
echo "Step 1: Checking Rust toolchain..."

if command -v rustc &>/dev/null && command -v cargo &>/dev/null; then
    RUST_VERSION=$(rustc --version)
    echo "✓ Rust already installed: $RUST_VERSION"
else
    echo "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # Add cargo to PATH for this script
    export PATH="$HOME/.cargo/bin:$PATH"
    
    echo "✓ Rust installed: $(rustc --version)"
fi

# Ensure PATH includes cargo for rest of script
export PATH="$HOME/.cargo/bin:$PATH"
echo ""

#
# Step 2: wasm32-unknown-unknown target
#
echo "Step 2: Checking wasm32 target..."

if rustup target list --installed | grep -q wasm32-unknown-unknown; then
    echo "✓ wasm32-unknown-unknown target already installed"
else
    echo "Adding wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
    echo "✓ wasm32-unknown-unknown target installed"
fi
echo ""

#
# Step 3: protoc (Protocol Buffers Compiler)
#
echo "Step 3: Checking protoc..."

if command -v protoc &>/dev/null; then
    PROTOC_VERSION=$(protoc --version)
    echo "✓ protoc already installed: $PROTOC_VERSION"
else
    if [[ "$OS" == "Linux" ]]; then
        echo "Installing protoc for Linux..."
        PROTOC_ZIP="protoc-21.11-linux-x86_64.zip"
        curl -LO "https://github.com/protocolbuffers/protobuf/releases/download/v21.11/$PROTOC_ZIP"
        
        mkdir -p "$HOME/.local/bin"
        unzip -o "$PROTOC_ZIP" -d "$HOME/.local" 
        
        # Cleanup
        rm -f "$PROTOC_ZIP"
        
        # Add to PATH
        export PATH="$HOME/.local/bin:$PATH"
        
        echo "✓ protoc installed: $(protoc --version)"
        echo ""
        echo "NOTE: Add to your shell profile for persistence:"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    elif [[ "$OS" == "Darwin" ]]; then
        echo ""
        echo "❌ protoc not found on macOS."
        echo "   Please install it using Homebrew:"
        echo ""
        echo "   brew install protobuf"
        echo ""
        echo "   Then run this script again."
        exit 1
    else
        echo "❌ Unsupported OS: $OS"
        echo "   Please install protoc manually."
        exit 1
    fi
fi
echo ""

#
# Step 4: Linera CLI
#
echo "Step 4: Checking Linera CLI..."

if command -v linera &>/dev/null; then
    LINERA_VERSION=$(linera --version | head -2)
    echo "✓ linera CLI already installed:"
    echo "  $LINERA_VERSION"
else
    echo "Installing linera CLI (this may take several minutes)..."
    echo ""
    
    # Install linera-storage-service first (includes database dependencies)
    echo "Installing linera-storage-service@0.15.6..."
    cargo install --locked linera-storage-service@0.15.6
    
    # Install linera-service (includes the main CLI)
    echo ""
    echo "Installing linera-service@0.15.6..."
    cargo install --locked linera-service@0.15.6
    
    echo ""
    echo "✓ linera CLI installed: $(linera --version | head -1)"
fi
echo ""

#
# Verification
#
echo "=============================================="
echo "         Installation Complete!"
echo "=============================================="
echo ""
echo "Installed versions:"
echo "  - Rust:   $(rustc --version 2>/dev/null || echo 'not found')"
echo "  - Cargo:  $(cargo --version 2>/dev/null || echo 'not found')"
echo "  - protoc: $(protoc --version 2>/dev/null || echo 'not found')"
echo "  - linera: $(linera --version 2>/dev/null | head -1 || echo 'not found')"
echo ""
echo "Next steps:"
echo "  npm run deploy:conway   # Deploy contracts to Conway testnet"
echo "  npm run dev             # Start the frontend"
echo ""
