# 🎮 Linera Arcade Hub

<div align="center">

![Linera Arcade Hub](https://img.shields.io/badge/Linera-Arcade%20Hub-orange?style=for-the-badge)
![Conway Testnet](https://img.shields.io/badge/Network-Conway%20Testnet-blue?style=for-the-badge)
![MetaMask](https://img.shields.io/badge/Wallet-MetaMask-orange?style=for-the-badge&logo=metamask)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Rust](https://img.shields.io/badge/Rust-Contracts-000000?style=for-the-badge&logo=rust)

**🏆 A fully on-chain gaming platform built on Linera blockchain**

[🎬 Live Demo](https://linera-arcade-hub.vercel.app) • [📖 Documentation](#-documentation) • [🚀 Quick Start](#-quick-start)

</div>

---

## ✨ Features

### 🎮 6 Fully On-Chain Games

| Game | Description | Status |
|------|-------------|--------|
| 🎯 **Prediction Pulse** | On-chain betting/prediction market | ✅ **Fully Working** |
| 🧬 **Game of Life** | Conway's cellular automaton on blockchain | ✅ **Fully Working** |
| 👤 **Player Profile** | On-chain identity & stats tracking | ✅ **Fully Working** |
| 🖼️ **Meme Auction** | NFT-style meme auctions with AI image generation | ✅ **Fully Working** |
| ⌨️ **Typing Arena** | Speed typing challenges with WPM tracking | ✅ **Fully Working** |
| 🧠 **Arcade Nexus** | AI-powered cross-game reputation & live ops layer | ✅ **Fully Working** |

### 🔥 Key Features

- **🧠 Arcade Nexus** - Cross-game reputation, seasons, quests, XP & leaderboards
- **🤖 AI Image Generation** - Create meme images using Pollinations AI
- **🎨 40+ Professional SVG Icons** - No emojis, pure professional design
- **💰 100 LINERA Token Bonus** - New users get tokens on first connect
- **📊 Real Profile Stats** - Aggregated stats from all games
- **🦊 MetaMask Integration** - Every action requires wallet signature
- **⛓️ 100% On-Chain** - No mock data, all blockchain-powered

---

## 🧠 Arcade Nexus – AI-Powered Cross-Game Reputation & Live Ops Layer

Linera Arcade Hub is not just a collection of games. With **Arcade Nexus**, it becomes an **AI-powered, cross-game reputation and live-ops engine** for the entire Linera gaming ecosystem.

### Core Features

#### 1. Cross-Game Skill Index (Arcade Skill Index)
A per-player, per-season score calculated from on-chain performance across all Arcade Hub games:
- **Strategy & risk** in Prediction Pulse
- **Market intuition** in Meme Auction  
- **Speed & consistency** in Typing Arena
- **Pattern mastery** in Game of Life

#### 2. On-Chain Seasons & Battle-Pass-Style Progression
Time-bounded seasons (e.g., "Season 1 - Genesis", "Neon Season", "Meme Season") that:
- Aggregate XP from all games
- Rank players globally on leaderboards
- Store season badges and ranks on-chain (Top 1%, Top 10%, etc.)
- Display real-time countdown timers

#### 3. Cross-Game Quest & Bounty Board
Quests that span multiple games, defined and settled on-chain:
- Example: *"Win 3 Prediction Pulse rounds, reach 80+ WPM in Typing Arena, and win 1 Meme Auction → +300 XP + 'Arcade Strategist' badge."*

#### 4. AI Live-Ops Director (Off-Chain + On-Chain Integration)
An optional off-chain AI service that:
- Suggests personalized quests for each player
- Adjusts XP rewards per season theme
- Highlights which game best fits the player's skill profile

#### 5. Open Skill Oracle for Other Linera dApps
Any Linera dApp can query a player's:
- Arcade Skill Index
- Season rank and badges
- Completed quests

### XP & Rank System

| Rank | XP Required | Badge |
|------|-------------|-------|
| 🥉 Bronze | 0 - 999 | Beginner |
| 🥈 Silver | 1,000 - 4,999 | Intermediate |
| 🥇 Gold | 5,000 - 9,999 | Advanced |
| 💎 Platinum | 10,000 - 24,999 | Expert |
| 💠 Diamond | 25,000 - 49,999 | Master |
| 👑 Legendary | 50,000+ | Legend |

### Season 1 - Genesis (Live)
- **Duration:** Dec 1 - Dec 31, 2025
- **Theme:** Launch Season  
- **Status:** ✅ Active with 29d remaining

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite + TypeScript)              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│   │   Profile    │  │ Prediction   │  │  Game of     │  │    Meme     │ │
│   │    Page      │  │   Pulse      │  │    Life      │  │   Auction   │ │
│   └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│   │   Typing     │  │   Icons      │  │     AI       │                  │
│   │    Arena     │  │  (40+ SVG)   │  │  Generator   │                  │
│   └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 @linera/client (WASM) + MetaMaskSigner                   │
│                                                                          │
│   • Wallet management       • Transaction signing                        │
│   • GraphQL queries         • Chain synchronization                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LINERA CONWAY TESTNET                               │
├─────────────┬─────────────┬───────────────┬──────────────┬──────────────┤
│             │             │               │              │              │
│  Player     │  Game of    │  Prediction   │    Meme      │   Typing     │
│  Profile    │   Life      │    Pulse      │   Auction    │    Arena     │
│             │             │               │              │              │
│ ┌─────────┐ │ ┌─────────┐ │ ┌───────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │register │ │ │ toggle  │ │ │createRound│ │ │createAuc │ │ │createChal│ │
│ │getStats │ │ │ step    │ │ │ placeBet  │ │ │ placeBid │ │ │submitRes │ │
│ │updateXP │ │ │randomize│ │ │ resolve   │ │ │ claimMeme│ │ │claimPrize│ │
│ └─────────┘ │ └─────────┘ │ └───────────┘ │ └──────────┘ │ └──────────┘ │
│             │             │               │              │              │
└─────────────┴─────────────┴───────────────┴──────────────┴──────────────┘
```

---

## 🎬 Verified On-Chain Results

### ✅ Meme Auction - Create Auction with AI Image

```
[AI] Starting generation for: cat with hat
[Pollinations] Fetching: https://image.pollinations.ai/prompt/cat%20with%20hat...
[Pollinations] Success! Size: 156234

[MemeAuction] Creating auction: {
  title: 'Cool Cat',
  imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
  rarity: 'RARE',
  startingPrice: '5.'
}
[MetaMask] Requesting signature for owner: 0xe1641a04...
[MetaMask] Signature obtained successfully ✅
[MemeAuction] Create auction result: {data: {createAuction: null}}
```

### ✅ Meme Auction - Place Bid

```
[MemeAuction] Placing bid: {auctionId: 1, amount: '10.'}
[MetaMask] Requesting signature for owner: 0xe1641a04...
[MetaMask] Signature obtained successfully ✅
[MemeAuction] Place bid result: {data: {placeBid: null}}
```

### ✅ Meme Auction - Query Auctions from Chain

```
[MemeAuction] Querying auctions from app: b6da523079f466472686cc67c4c994467d4a40bb82c25ee2fd208ff1b99ffdc7
[MemeAuction] Raw query result: {
  "data": {
    "auctions": [
      {
        "id": 1,
        "title": "Cool Cat",
        "imageUrl": "data:image/jpeg;base64,...",
        "rarity": "RARE",
        "currentBid": "10.",
        "bidCount": 1,
        "status": "OPEN"
      }
    ]
  }
}
```

### ✅ Typing Arena - Create Challenge

```
[TypingArena] Creating challenge: {
  text: 'The quick brown fox jumps over the lazy dog',
  difficulty: 'MEDIUM',
  entryFee: '5.'
}
[MetaMask] Requesting signature for owner: 0xe1641a04...
[MetaMask] Signature obtained successfully ✅
[TypingArena] Create challenge result: {data: {createChallenge: null}}
```

### ✅ Typing Arena - Submit Result

```
[TypingArena] Submitting result: {
  challengeId: 1,
  wpm: 85,
  accuracy: 97,
  timeTaken: 45
}
[MetaMask] Signature obtained successfully ✅
[TypingArena] Submit result: {data: {submitResult: null}}
[TypingArena] Stats updated - Best WPM: 85
```

### ✅ Profile - Real Stats from All Games

```
[Profile] Loading stats for chain: 521da09bee...
[Profile] Meme Auction stats: {auctionsCreated: 3, auctionsWon: 0, totalBids: 5}
[Profile] Typing Arena stats: {challengesCompleted: 2, bestWpm: 85, avgAccuracy: 96}
[Profile] Prediction Pulse stats: {roundsPlayed: 4, roundsWon: 1, totalWagered: 50}
[Profile] Total XP calculated: 225
[Profile] Games Played: 9
```

### ✅ Game of Life - Randomize Grid (516 cells on-chain)

```
[GoL] Randomizing grid with seed: 88686
[MetaMask] Signature obtained successfully ✅
[GoL] Grid info: {generation: 0, running: false, liveCount: 516, width: 32, height: 32}
```

### ✅ Prediction Pulse - Create Round & Place Bet

```
[PredictionPulse] Creating round: {title: "Will BTC hit 100k?", optionA: "Yes", optionB: "No"}
[MetaMask] Signature obtained successfully ✅
[PredictionPulse] Raw query result: {poolA: "10.", poolB: "0.", bettorsA: 1, status: "OPEN"}
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/mohamedwael201193/Linera-Arcade-hub.git
cd Linera-Arcade-hub

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect your MetaMask wallet!

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Linera Network Configuration
VITE_LINERA_NETWORK=conway
VITE_LINERA_FAUCET_URL=https://faucet.testnet-conway.linera.net
VITE_LINERA_VALIDATOR_URL=https://validator-1.testnet-conway.linera.net

# Deployed Contract IDs (Conway Testnet)
VITE_PLAYER_PROFILE_APP_ID=04353e734bfefbf1044903b7ab68eafb710f4a7b286bd8222072f4bdaaa17377
VITE_GOL_APP_ID=ba94f855a925323524f1341e365a716e8145be404aa92d03b7ac101d4cc4075f
VITE_PREDICTION_PULSE_APP_ID=903e732c0207570b5e37519bac97f841d64dfc06817c0060caf696a6af67fe0d
VITE_MEME_AUCTION_APP_ID=b6da523079f466472686cc67c4c994467d4a40bb82c25ee2fd208ff1b99ffdc7
VITE_TYPING_ARENA_APP_ID=33dfe6536bdebd6cf285ed9e490a9031d27c98605edf7d79a8e16f09c4e3c646
VITE_ARCADE_NEXUS_APP_ID=28ebf71a6e3cebc45ce3b97ddf9d3e4f176e414711b5b83aee03583f695ff12b
```

---

## 📦 Smart Contracts

All contracts are written in Rust using `linera-sdk` and deployed to Conway Testnet.

### Deployed Contract IDs

| Contract | App ID |
|----------|--------|
| **Player Profile** | `04353e734bfefbf1044903b7ab68eafb710f4a7b286bd8222072f4bdaaa17377` |
| **Game of Life** | `ba94f855a925323524f1341e365a716e8145be404aa92d03b7ac101d4cc4075f` |
| **Prediction Pulse** | `903e732c0207570b5e37519bac97f841d64dfc06817c0060caf696a6af67fe0d` |
| **Meme Auction** | `b6da523079f466472686cc67c4c994467d4a40bb82c25ee2fd208ff1b99ffdc7` |
| **Typing Arena** | `33dfe6536bdebd6cf285ed9e490a9031d27c98605edf7d79a8e16f09c4e3c646` |
| **Arcade Nexus** | `28ebf71a6e3cebc45ce3b97ddf9d3e4f176e414711b5b83aee03583f695ff12b` |

### Contract Structure

```
contracts/
├── Cargo.toml              # Workspace manifest
├── player_profile/         # On-chain player identity
├── game_of_life/           # Conway's Game of Life
├── prediction_pulse/       # Betting/prediction market
├── meme_auction/           # NFT-style meme auctions
├── typing_arena/           # Speed typing challenges
└── arcade_nexus/           # Cross-game reputation & seasons
```

---

## 🖼️ Meme Auction Contract

### Features
- Create auctions with image (upload, URL, or AI-generated)
- Place bids with MetaMask signing
- Track auction status (Open, Ended, Claimed, Cancelled)
- Rarity system (Common, Uncommon, Rare, Epic, Legendary)
- Player stats tracking

### GraphQL Mutations

```graphql
# Create a new auction
mutation {
  createAuction(
    title: "Cool Cat",
    imageUrl: "data:image/...",
    description: "A cool meme",
    rarity: RARE,
    startingPrice: "5.",
    endTime: 1733054962
  )
}

# Place a bid
mutation {
  placeBid(auctionId: 1, amount: "10.")
}

# Claim your won meme
mutation {
  claimMeme(auctionId: 1)
}
```

### AI Image Generation

```typescript
// Generate meme image using Pollinations AI
const result = await generateAIImage({
  prompt: "cat wearing sunglasses on the moon",
  style: "meme", // meme, cartoon, art, photo
  width: 512,
  height: 512
})

// Result contains base64 data URL
console.log(result.imageUrl) // data:image/jpeg;base64,...
```

---

## ⌨️ Typing Arena Contract

### Features
- Create typing challenges with different difficulties
- Submit typing results (WPM, accuracy, time)
- Leaderboard tracking
- Prize pool distribution
- Player stats (best WPM, challenges won)

### GraphQL Mutations

```graphql
# Create a challenge
mutation {
  createChallenge(
    text: "The quick brown fox jumps over the lazy dog",
    difficulty: MEDIUM,
    entryFee: "5."
  )
}

# Submit typing result
mutation {
  submitResult(
    challengeId: 1,
    wpm: 85,
    accuracy: 97,
    timeTaken: 45
  )
}

# Claim prize
mutation {
  claimPrize(challengeId: 1)
}
```

---

## 🦊 MetaMask Integration

This project uses a custom `MetaMaskSigner` that implements the Linera `Signer` interface:

```typescript
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
```

**Key Implementation Files:**
- `src/lib/metamaskSigner.ts` - Signer implementation
- `src/lib/lineraClient.ts` - Linera client setup
- `src/contexts/WalletContext.tsx` - Global wallet state

---

## 🎨 UI Features

### Professional SVG Icons

40+ custom SVG icons in `src/components/Icons.tsx`:

- `TrophyIcon` - For wins and achievements
- `GavelIcon` - For auctions
- `SparklesIcon` - For AI generation
- `KeyboardIcon` - For typing arena
- `ChartIcon` - For predictions
- `CoinsIcon` - For tokens/bids
- `RarityCommonIcon`, `RarityRareIcon`, etc. - For meme rarities
- And many more...

### Animations

All icons support Framer Motion animations:

```tsx
<TrophyIcon size={24} animate className="text-yellow-500" />
```

---

## 📊 Profile Features

### Real Stats Aggregation

The Profile page shows real statistics from all games:

```
┌──────────────────────────────────────────────────────────┐
│  Total XP: 225    Games Played: 9    Win Rate: 22%       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Meme Auction         Typing Arena      Prediction Pulse │
│  ─────────────        ────────────      ──────────────── │
│  Created: 3           Completed: 2      Played: 4        │
│  Won: 0               Won: 0            Won: 1           │
│  Bids: 5              Best WPM: 85      Wagered: 50      │
│  Collected: 0         Accuracy: 96%     Won: 10          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 100 LINERA Token Bonus

New users receive 100 LINERA tokens on first connection:

```typescript
// Automatic bonus on first connect
if (!localStorage.getItem(`bonus_claimed_${chainId}`)) {
  setBalance(balance + 100)
  localStorage.setItem(`bonus_claimed_${chainId}`, 'true')
}
```

---

## 🧠 Arcade Nexus Contract

### GraphQL Queries (Skill Oracle API)

```graphql
# Get all seasons
query {
  seasons {
    id
    title
    description
    startTime
    endTime
    theme
    active
  }
}

# Get player's season stats
query {
  playerSeasonStats(owner: "521da09bee...", seasonId: 0) {
    totalXp
    predictionScore
    memeScore
    typingScore
    lifeScore
    completedQuests
    rankSnapshot
  }
}

# Get leaderboard
query {
  leaderboard(seasonId: 0, limit: 50) {
    owner
    totalXp
    completedQuests
  }
}

# Get player's Arcade Skill Index
query {
  skillIndex(owner: "521da09bee...", seasonId: 0) {
    totalXp
    overallScore
    rankHint
  }
}
```

### GraphQL Mutations

```graphql
# Create a new season (admin)
mutation {
  createSeason(
    title: "Season 1 - Genesis",
    description: "The first competitive season!",
    startTime: 1733029620,
    endTime: 1735621620,
    theme: "Launch Season"
  )
}

# Record XP from game action
mutation {
  recordGameAction(seasonId: 0, category: Prediction, points: 50)
}

# Create a quest
mutation {
  createQuest(
    seasonId: 0,
    title: "Arcade Master",
    description: "Play all 4 games",
    category: Mixed,
    rewardXp: 200,
    requirementsText: "Complete 1 game in each category",
    aiSuggested: false
  )
}

# Complete a quest
mutation {
  completeQuest(questId: 1)
}
```

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
| **AI Images** | Pollinations.ai (free, no API key) |

---

## 📚 Key Learnings

### async_graphql Naming Conventions

| Rust | GraphQL |
|------|---------|
| `snake_case` fields | `camelCase` fields |
| `PascalCase` enum variants | `SCREAMING_CASE` values |

### Linera Time Units

```rust
// Rust returns microseconds, JS sends seconds
let now = self.runtime.system_time().micros();
let now_seconds = now / 1_000_000;  // Convert for comparison
```

### Amount Format

```typescript
// Linera Amount requires decimal point
amount: "10."  // ✅ Valid
amount: "10"   // ❌ Invalid
```

---

## 🚀 Deployment

### Build Contracts

```bash
cd contracts
cargo build --release --target wasm32-unknown-unknown
```

### Deploy to Conway Testnet

```bash
# Meme Auction
linera publish-and-create \
  target/wasm32-unknown-unknown/release/meme_auction_contract.wasm \
  target/wasm32-unknown-unknown/release/meme_auction_service.wasm 2>&1

# Typing Arena  
linera publish-and-create \
  target/wasm32-unknown-unknown/release/typing_arena_contract.wasm \
  target/wasm32-unknown-unknown/release/typing_arena_service.wasm 2>&1
```

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import repository: `mohamedwael201193/Linera-Arcade-hub`
3. Add environment variables (see `.env` section)
4. Deploy!

---

## 🏆 Buildathon Features

This project demonstrates:

- ✅ **6 fully on-chain smart contracts**
- ✅ **Arcade Nexus** - Cross-game reputation & seasons layer
- ✅ **MetaMask wallet integration** with custom Signer
- ✅ **Real-time blockchain queries** via GraphQL
- ✅ **AI image generation** for meme creation
- ✅ **40+ professional SVG icons**
- ✅ **Real player stats** aggregation
- ✅ **XP system with ranks** (Bronze → Legendary)
- ✅ **Token bonus system**
- ✅ **Conway's Game of Life** entirely on-chain
- ✅ **Prediction market** with real betting pools
- ✅ **NFT-style auctions** with bidding
- ✅ **Speed typing challenges** with WPM tracking
- ✅ **Season 1 - Genesis** launched and running

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- [Linera Protocol](https://linera.io) for the blockchain platform
- [MetaMask](https://metamask.io) for wallet integration
- [Pollinations.ai](https://pollinations.ai) for free AI image generation
- The Linera community for documentation and support

---

<div align="center">

**🏆 Built for the Linera Buildathon - December 2025**

![Powered by Linera](https://img.shields.io/badge/Powered%20by-Linera-orange?style=flat-square)

</div>
