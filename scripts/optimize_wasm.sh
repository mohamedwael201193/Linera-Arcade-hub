#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# optimize_wasm.sh - Optimize WASM artifacts for size
# ============================================================================
# Uses wasm-opt (Binaryen) and wasm-strip (WABT) to shrink WASM files.
# Safe to run multiple times. Degrades gracefully if tools are missing.
# ============================================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/contracts/target/wasm32-unknown-unknown/release"

echo "=============================================="
echo "  Optimizing WASM artifacts for size"
echo "=============================================="
echo "  Target directory: $TARGET"
echo ""

# Check for optimization tools
HAS_WASM_OPT=false
HAS_WASM_STRIP=false

if command -v wasm-opt >/dev/null 2>&1; then
    HAS_WASM_OPT=true
    echo "✓ wasm-opt found: $(which wasm-opt)"
else
    echo "⚠ wasm-opt not found (install binaryen for better optimization)"
fi

if command -v wasm-strip >/dev/null 2>&1; then
    HAS_WASM_STRIP=true
    echo "✓ wasm-strip found: $(which wasm-strip)"
else
    echo "⚠ wasm-strip not found (install wabt for symbol stripping)"
fi

echo ""

# Function to optimize a single WASM file
opt_one() {
    local crate="$1"   # e.g. player_profile
    local kind="$2"    # contract or service

    local input="$TARGET/${crate}_${kind}.wasm"
    local output="$TARGET/${crate}_${kind}.opt.wasm"

    if [[ ! -f "$input" ]]; then
        echo "⚠ WARN: Input not found: $input"
        return 0
    fi

    # Get original size
    local size_before
    size_before=$(stat -c%s "$input" 2>/dev/null || stat -f%z "$input" 2>/dev/null || echo "?")

    # Start with a copy
    cp "$input" "$output"

    # Run wasm-opt if available
    if [[ "$HAS_WASM_OPT" == "true" ]]; then
        echo "  wasm-opt -Oz: ${crate}_${kind}"
        wasm-opt -Oz "$output" -o "$output" 2>/dev/null || true
    fi

    # Run wasm-strip if available
    if [[ "$HAS_WASM_STRIP" == "true" ]]; then
        echo "  wasm-strip: ${crate}_${kind}"
        wasm-strip "$output" 2>/dev/null || true
    fi

    # Get final size
    local size_after
    size_after=$(stat -c%s "$output" 2>/dev/null || stat -f%z "$output" 2>/dev/null || echo "?")
    
    # Calculate reduction percentage
    if [[ "$size_before" != "?" ]] && [[ "$size_after" != "?" ]] && [[ "$size_before" -gt 0 ]]; then
        local reduction=$(( (size_before - size_after) * 100 / size_before ))
        echo "  ${crate}_${kind}: ${size_before} → ${size_after} bytes (-${reduction}%)"
    else
        echo "  ${crate}_${kind}: ${size_before} → ${size_after} bytes"
    fi
}

echo "Optimizing contracts..."
echo ""

# Optimize all three apps (contract + service)
opt_one player_profile contract
opt_one player_profile service
echo ""

opt_one game_of_life contract
opt_one game_of_life service
echo ""

opt_one prediction_pulse contract
opt_one prediction_pulse service
echo ""

echo "=============================================="
echo "  Optimization complete!"
echo "=============================================="

# Show final sizes
echo ""
echo "Final optimized WASM sizes:"
if ls "$TARGET"/*.opt.wasm 1>/dev/null 2>&1; then
    ls -lh "$TARGET"/*.opt.wasm
else
    echo "No .opt.wasm files found"
fi
echo ""
