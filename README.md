# 🎮 Linera Arcade Hub

<div align="center">

![Linera Arcade Hub](https://img.shields.io/badge/Linera-Arcade%20Hub-orange?style=for-the-badge)
![Conway Testnet](https://img.shields.io/badge/Network-Conway%20Testnet-blue?style=for-the-badge)
![MetaMask](https://img.shields.io/badge/Wallet-MetaMask-orange?style=for-the-badge&logo=metamask)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Rust](https://img.shields.io/badge/Rust-Contracts-000000?style=for-the-badge&logo=rust)

**🏆 A fully on-chain gaming platform built on Linera blockchain**

[�� Live Demo](https://linera-arcade-hub.vercel.app) • [📖 Documentation](#-documentation) • [🚀 Quick Start](#-quick-start)

</div>

---

## ✨ Features

| Game | Description | Status |
|------|-------------|--------|
| 🎯 **Prediction Pulse** | On-chain betting/prediction market | ✅ **Fully Working** |
| 🧬 **Game of Life** | Conway's cellular automaton on blockchain | ✅ **Fully Working** |
| 👤 **Player Profile** | On-chain identity & stats tracking | ✅ **Fully Working** |

### 🔥 All Operations Are Real On-Chain Transactions

- Every action requires MetaMask signature
- State persists on Linera Conway Testnet
- No mock data - 100% blockchain-powered

---

## 🎬 Verified On-Chain Results

### ✅ Prediction Pulse - Create Round & Place Bet
\`\`\`
[PredictionPulse] Creating round: {title: "Will BTC hit 100k?", optionA: "Yes", optionB: "No"}
[MetaMask] Requesting signature for owner: 0xe1641a049381149afaacef386ee58fda5ad9be32
[MetaMask] Signature obtained successfully ✅
[PredictionPulse] Raw query result: {poolA: "10.", poolB: "0.", bettorsA: 1, status: "OPEN"}
\`\`\`

### ✅ Game of Life - Randomize Grid (516 cells on-chain)
\`\`\`
[GoL] Randomizing grid with seed: 88686
[MetaMask] Signature obtained successfully ✅
[GoL] Grid info: {generation: 0, running: false, liveCount: 516, width: 32, height: 32}
\`\`\`

### ✅ Game of Life - Step Simulation
\`\`\`
[GoL] Stepping simulation: {count: 1}
[MetaMask] Signature obtained successfully ✅
[GoL] Grid info: {generation: 6, liveCount: 294}
\`\`\`

### ✅ Game of Life - Load Pattern
\`\`\`
[GoL] Loading pattern: {pattern: 'BLOCK', x: 5, y: 5}
[MetaMask] Signature obtained successfully ✅
[GoL] Live cells: [{x:5,y:5}, {x:6,y:5}, {x:5,y:6}, {x:6,y:6}]
\`\`\`

---

## 🏗️ Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
├─────────────────────────────────────────────────────────────┤
│  WalletContext  │  PredictionPulse  │  GameOfLife  │ Profile │
└────────┬────────┴────────┬──────────┴──────┬───────┴────┬────┘
         │                 │                 │            │
         ▼                 ▼                 ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│              @linera/client (WASM) + MetaMaskSigner          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  LINERA CONWAY TESTNET                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│  PlayerProfile  │   GameOfLife    │    PredictionPulse      │
│    Contract     │    Contract     │       Contract          │
└─────────────────┴─────────────────┴─────────────────────────┘
\`\`\`

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Git

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/mohamedwael201193/Linera-Arcade-hub.git
cd Linera-Arcade-hub

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) and connect your MetaMask wallet!

---

## 🔧 Environment Variables

Create a \`.env\` file in the root directory:

\`\`\`env
# Linera Network Configuration
VITE_LINERA_NETWORK=conway
VITE_LINERA_FAUCET_URL=https://faucet.testnet-conway.linera.net
VITE_LINERA_VALIDATOR_URL=https://validator-1.testnet-conway.linera.net

# Deployed Contract IDs (Conway Testnet)
VITE_PLAYER_PROFILE_APP_ID=04353e734bfefbf1044903b7ab68eafb710f4a7b286bd8222072f4bdaaa17377
VITE_GOL_APP_ID=ba94f855a925323524f1341e365a716e8145be404aa92d03b7ac101d4cc4075f
VITE_PREDICTION_PULSE_APP_ID=903e732c0207570b5e37519bac97f841d64dfc06817c0060caf696a6af67fe0d
\`\`\`

---

## 📦 Smart Contracts

All contracts are written in Rust using \`linera-sdk\` and deployed to Conway Testnet.

### Deployed Contract IDs

| Contract | App ID |
|----------|--------|
| **Player Profile** | \`04353e734bfefbf1044903b7ab68eafb710f4a7b286bd8222072f4bdaaa17377\` |
| **Game of Life** | \`ba94f855a925323524f1341e365a716e8145be404aa92d03b7ac101d4cc4075f\` |
| **Prediction Pulse** | \`903e732c0207570b5e37519bac97f841d64dfc06817c0060caf696a6af67fe0d\` |

### Contract Structure

\`\`\`
contracts/
├── Cargo.toml              # Workspace manifest
├── player_profile/         # On-chain player identity
│   └── src/
│       ├── lib.rs          # Types & ABI
│       ├── contract.rs     # Business logic
│       ├── service.rs      # GraphQL queries
│       └── state.rs        # On-chain state
├── game_of_life/           # Conway's Game of Life
│   └── src/
│       ├── lib.rs
│       ├── contract.rs
│       ├── service.rs
│       └── state.rs
└── prediction_pulse/       # Betting/prediction market
    └── src/
        ├── lib.rs
        ├── contract.rs
        ├── service.rs
        └── state.rs
\`\`\`

### GraphQL Mutations (camelCase)

**Prediction Pulse:**
- \`createRound(title, optionA, optionB, endTime)\`
- \`placeBet(roundId, choice, amount)\`
- \`resolveRound(roundId, winner)\`
- \`claimWinnings(roundId)\`

**Game of Life:**
- \`toggle(x, y)\` - Toggle cell state
- \`step\` - Advance one generation
- \`randomize(seed)\` - Randomize grid
- \`loadPattern(pattern, x, y)\` - Load preset pattern (BLOCK, BLINKER, GLIDER, etc.)
- \`clear\` - Reset grid

---

## 🦊 MetaMask Integration

This project uses a custom \`MetaMaskSigner\` that implements the Linera \`Signer\` interface:

\`\`\`typescript
// Every mutation triggers MetaMask popup
export class MetaMaskSigner implements Signer {
  async sign(owner: string, value: Uint8Array): Promise<string> {
    const msgHex = bytesToHex(value)
    const signature = await this._provider.request({
      method: 'personal_sign',
      params: [msgHex, owner],
    })
    return signature // WITH 0x prefix
  }
}
\`\`\`

**Key Implementation Files:**
- \`src/lib/metamaskSigner.ts\` - Signer implementation
- \`src/lib/lineraClient.ts\` - Linera client setup
- \`src/contexts/WalletContext.tsx\` - Global wallet state

---

## 🌐 Vercel Deployment

### Step-by-Step Guide

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "Add New Project"**
3. **Import your GitHub repository:** \`mohamedwael201193/Linera-Arcade-hub\`
4. **Configure Build Settings:**
   - Framework Preset: \`Vite\`
   - Build Command: \`npm run build\`
   - Output Directory: \`dist\`
   - Install Command: \`npm install\`

5. **Add Environment Variables** (click "Environment Variables"):

| Variable | Value |
|----------|-------|
| \`VITE_LINERA_NETWORK\` | \`conway\` |
| \`VITE_LINERA_FAUCET_URL\` | \`https://faucet.testnet-conway.linera.net\` |
| \`VITE_LINERA_VALIDATOR_URL\` | \`https://validator-1.testnet-conway.linera.net\` |
| \`VITE_PLAYER_PROFILE_APP_ID\` | \`04353e734bfefbf1044903b7ab68eafb710f4a7b286bd8222072f4bdaaa17377\` |
| \`VITE_GOL_APP_ID\` | \`ba94f855a925323524f1341e365a716e8145be404aa92d03b7ac101d4cc4075f\` |
| \`VITE_PREDICTION_PULSE_APP_ID\` | \`903e732c0207570b5e37519bac97f841d64dfc06817c0060caf696a6af67fe0d\` |

6. **Click "Deploy"**

### Required Headers (Auto-configured)

The \`vite.config.ts\` already includes Cross-Origin Isolation headers required for WASM:

\`\`\`typescript
headers: {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
}
\`\`\`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS v4, Framer Motion |
| **Blockchain** | Linera Conway Testnet |
| **Wallet** | MetaMask (personal_sign) |
| **Client** | @linera/client (WASM) |
| **Contracts** | Rust + linera-sdk + async_graphql |

---

## 📚 Key Learnings

### async_graphql Naming Conventions

| Rust | GraphQL |
|------|---------|
| \`snake_case\` fields | \`camelCase\` fields |
| \`PascalCase\` enum variants | \`SCREAMING_CASE\` values |
| \`CreateRound\` operation | \`createRound\` mutation |

### Linera Time Units

\`\`\`rust
// Rust returns microseconds, JS sends seconds
let now = self.runtime.system_time().micros();
let now_seconds = now / 1_000_000;  // Convert to seconds for comparison
\`\`\`

### Amount Format

\`\`\`typescript
// Linera Amount requires decimal point
amount: "10."  // ✅ Valid
amount: "10"   // ❌ Invalid
\`\`\`

---

## 🏆 Buildathon Features

This project demonstrates:

- ✅ **Full on-chain game state management**
- ✅ **MetaMask wallet integration** with custom Signer
- ✅ **Real-time blockchain queries** via GraphQL
- ✅ **Multiple smart contracts** working together
- ✅ **Cross-Origin Isolated WASM** execution
- ✅ **Conway's Game of Life** running entirely on-chain
- ✅ **Prediction market** with real betting pools

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- [Linera Protocol](https://linera.io) for the blockchain platform
- [MetaMask](https://metamask.io) for wallet integration
- The Linera community for documentation and support

---

<div align="center">

**🏆 Built for the Linera Buildathon**

![Powered by Linera](https://img.shields.io/badge/Powered%20by-Linera-orange?style=flat-square)

</div>
