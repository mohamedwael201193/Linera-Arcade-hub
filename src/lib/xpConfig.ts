/**
 * XP Configuration for Arcade Nexus
 * 
 * Defines XP values for various game actions, rank thresholds,
 * and level progression.
 */

// ==================== XP Values ====================

export const XP_VALUES = {
  // Prediction Pulse
  prediction: {
    bet: 10,           // Making any bet
    win: 75,           // Winning (correct prediction)
    correct: 50,       // Correct prediction (legacy/alias)
    streak3: 100,      // 3 correct in a row
    streak5: 250,      // 5 correct in a row
    perfectDay: 500,   // All predictions correct in a day
  },
  
  // Meme Auction
  meme: {
    create: 25,        // Creating a meme auction
    bid: 10,           // Placing a bid
    win: 75,           // Winning an auction
    upvote: 5,         // Upvoting a meme
    topMeme: 200,      // Having the most upvoted meme of the day
  },
  
  // Typing Arena
  typing: {
    participate: 5,    // Just participating (incomplete)
    complete: 20,      // Completing a typing test
    wpm60: 50,         // 60+ WPM
    wpm80: 100,        // 80+ WPM
    wpm100: 200,       // 100+ WPM
    accuracy95: 75,    // 95%+ accuracy
    perfect: 300,      // 100% accuracy with 80+ WPM
  },
  
  // Game of Life
  life: {
    simulation: 15,    // Running a simulation
    pattern: 10,       // Loading a pattern
    generation100: 50, // Reaching 100 generations
    stableConfig: 100, // Finding a stable configuration
    customPattern: 75, // Creating a custom pattern
  },
  
  // Cross-game
  crossGame: {
    dailyLogin: 25,    // Daily login bonus
    playAll4: 150,     // Playing all 4 games in a day
    weekStreak: 300,   // 7-day login streak
    questComplete: 0,  // Quest XP is defined per quest
  },
  
  // Social
  social: {
    profileComplete: 100, // Complete profile setup
    firstFriend: 50,      // Add first friend
    shareResult: 25,      // Share a game result
  },
} as const

// ==================== Rank System ====================

export interface Rank {
  name: string
  minXp: number
  maxXp: number
  color: string
  icon: string
  badgeClass: string
}

export const RANKS: Rank[] = [
  {
    name: 'Bronze',
    minXp: 0,
    maxXp: 999,
    color: '#CD7F32',
    icon: '🥉',
    badgeClass: 'bg-gradient-to-r from-amber-700 to-amber-600 text-white',
  },
  {
    name: 'Silver',
    minXp: 1000,
    maxXp: 4999,
    color: '#C0C0C0',
    icon: '🥈',
    badgeClass: 'bg-gradient-to-r from-gray-400 to-gray-300 text-gray-800',
  },
  {
    name: 'Gold',
    minXp: 5000,
    maxXp: 9999,
    color: '#FFD700',
    icon: '🥇',
    badgeClass: 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-black',
  },
  {
    name: 'Platinum',
    minXp: 10000,
    maxXp: 24999,
    color: '#E5E4E2',
    icon: '💎',
    badgeClass: 'bg-gradient-to-r from-cyan-300 to-cyan-200 text-black',
  },
  {
    name: 'Diamond',
    minXp: 25000,
    maxXp: 49999,
    color: '#B9F2FF',
    icon: '💠',
    badgeClass: 'bg-gradient-to-r from-blue-400 to-blue-300 text-black',
  },
  {
    name: 'Legendary',
    minXp: 50000,
    maxXp: Infinity,
    color: '#9400D3',
    icon: '👑',
    badgeClass: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white',
  },
]

/**
 * Get rank for a given XP amount
 */
export function getRankForXp(xp: number): Rank {
  for (const rank of RANKS) {
    if (xp >= rank.minXp && xp <= rank.maxXp) {
      return rank
    }
  }
  return RANKS[RANKS.length - 1] // Default to Legendary if somehow over
}

/**
 * Get progress to next rank (0-100%)
 */
export function getRankProgress(xp: number): number {
  const currentRank = getRankForXp(xp)
  
  if (currentRank.maxXp === Infinity) {
    return 100 // Already at max rank
  }
  
  const rangeXp = currentRank.maxXp - currentRank.minXp
  const progressXp = xp - currentRank.minXp
  
  return Math.min(100, Math.floor((progressXp / rangeXp) * 100))
}

/**
 * Get XP needed for next rank
 */
export function getXpToNextRank(xp: number): number {
  const currentRank = getRankForXp(xp)
  
  if (currentRank.maxXp === Infinity) {
    return 0 // Already at max rank
  }
  
  return currentRank.maxXp - xp + 1
}

// ==================== Level System ====================

export interface Level {
  level: number
  requiredXp: number
  title: string
}

// XP required for each level (exponential growth)
function calculateLevelXp(level: number): number {
  if (level <= 1) return 0
  // Base: 100 XP for level 2, then 1.5x growth
  return Math.floor(100 * Math.pow(1.5, level - 2))
}

/**
 * Get level for a given XP amount
 */
export function getLevelForXp(xp: number): number {
  let level = 1
  let totalRequired = 0
  
  while (true) {
    const nextLevelXp = calculateLevelXp(level + 1)
    if (totalRequired + nextLevelXp > xp) {
      break
    }
    totalRequired += nextLevelXp
    level++
    
    // Cap at level 100
    if (level >= 100) break
  }
  
  return level
}

/**
 * Get XP progress within current level (0-100%)
 */
export function getLevelProgress(xp: number): number {
  const currentLevel = getLevelForXp(xp)
  const nextLevel = currentLevel + 1
  
  if (currentLevel >= 100) return 100
  
  // Calculate total XP needed for current and next level
  let currentLevelTotalXp = 0
  for (let l = 2; l <= currentLevel; l++) {
    currentLevelTotalXp += calculateLevelXp(l)
  }
  
  const nextLevelXp = calculateLevelXp(nextLevel)
  const progressInLevel = xp - currentLevelTotalXp
  
  return Math.min(100, Math.floor((progressInLevel / nextLevelXp) * 100))
}

/**
 * Get XP needed for next level
 */
export function getXpToNextLevel(xp: number): number {
  const currentLevel = getLevelForXp(xp)
  
  if (currentLevel >= 100) return 0
  
  let currentLevelTotalXp = 0
  for (let l = 2; l <= currentLevel; l++) {
    currentLevelTotalXp += calculateLevelXp(l)
  }
  
  const nextLevelXp = calculateLevelXp(currentLevel + 1)
  const progressInLevel = xp - currentLevelTotalXp
  
  return nextLevelXp - progressInLevel
}

// ==================== Category Colors ====================

export const CATEGORY_COLORS = {
  prediction: {
    primary: 'from-purple-600 to-indigo-600',
    secondary: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500',
  },
  meme: {
    primary: 'from-pink-500 to-rose-500',
    secondary: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500',
  },
  typing: {
    primary: 'from-green-500 to-emerald-500',
    secondary: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500',
  },
  life: {
    primary: 'from-blue-500 to-cyan-500',
    secondary: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500',
  },
  crossGame: {
    primary: 'from-amber-500 to-orange-500',
    secondary: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500',
  },
  social: {
    primary: 'from-cyan-500 to-teal-500',
    secondary: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500',
  },
} as const

// ==================== Formatters ====================

/**
 * Format XP with commas
 */
export function formatXp(xp: number): string {
  return xp.toLocaleString()
}

/**
 * Format XP as compact (e.g., "1.2K")
 */
export function formatXpCompact(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`
  }
  return xp.toString()
}
