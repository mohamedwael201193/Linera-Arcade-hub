/**
 * Typing Arena Application Helper
 * 
 * This module provides TypeScript helpers for interacting with the 
 * on-chain TypingArena Linera application on Conway testnet.
 * 
 * IMPORTANT: This module requires a deployed TypingArena contract.
 * Set VITE_TYPING_ARENA_APP_ID in your .env file after deployment.
 * 
 * NOTE: async_graphql automatically converts Rust snake_case to camelCase in GraphQL.
 * - Enum values use SCREAMING_CASE (e.g., UPCOMING, ACTIVE, FINISHED, CANCELLED)
 * 
 * NO DEMO/MOCK CODE - All operations hit the real Conway network.
 */

import {
    getCurrentChainId,
    mutateApplication,
    queryApplication,
} from './lineraClient'

// Types matching the GraphQL schema (camelCase, auto-converted from Rust)
export type ChallengeStatus = 'UPCOMING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'

export interface Challenge {
  id: number
  creator: string
  title: string
  text: string
  difficulty: Difficulty
  status: ChallengeStatus
  startTime: number
  endTime: number
  createdAt: number
  participantCount: number
  bestWpm: number
  bestPlayer: string | null
}

export interface TypingResult {
  challengeId: number
  player: string
  wpm: number
  accuracy: number
  completed: boolean
  timeTakenMs: number
  submittedAt: number
}

export interface TypistStats {
  challengesCompleted: number
  challengesWon: number
  totalWordsTyped: number
  bestWpm: number
  averageWpm: number
  averageAccuracy: number
}

/**
 * Require an environment variable, throwing a clear error if missing.
 */
function requireEnv(name: string): string {
  const value = import.meta.env[name]
  if (!value || value === 'REPLACE_WITH_DEPLOYED_ID') {
    const error = `Missing ${name}. Did you deploy the TypingArena contract and set it in .env?`
    console.error(`[TypingArena] ${error}`)
    throw new Error(error)
  }
  return value
}

/**
 * Get the TypingArena application ID from environment
 */
function getTypingArenaAppId(): string {
  return requireEnv('VITE_TYPING_ARENA_APP_ID')
}

/**
 * Get all challenges (newest first)
 */
export async function getChallenges(): Promise<Challenge[]> {
  const appId = getTypingArenaAppId()
  
  try {
    console.log('[TypingArena] Querying challenges from app:', appId)
    const result = await queryApplication(appId, `
      query {
        challenges {
          id
          creator
          title
          text
          difficulty
          status
          startTime
          endTime
          createdAt
          participantCount
          bestWpm
          bestPlayer
        }
      }
    `)
    console.log('[TypingArena] Raw query result:', JSON.stringify(result))
    
    const typedResult = result as { data?: { challenges?: Challenge[] }, errors?: unknown[] }
    if (typedResult.errors) {
      console.error('[TypingArena] GraphQL errors:', typedResult.errors)
    }
    
    return typedResult?.data?.challenges || []
  } catch (error) {
    console.error('[TypingArena] Failed to get challenges:', error)
    throw error
  }
}

/**
 * Get active challenges
 */
export async function getActiveChallenges(): Promise<Challenge[]> {
  const appId = getTypingArenaAppId()
  
  try {
    const result = await queryApplication(appId, `
      query {
        activeChallenges {
          id
          creator
          title
          text
          difficulty
          status
          startTime
          endTime
          createdAt
          participantCount
          bestWpm
          bestPlayer
        }
      }
    `) as { data?: { activeChallenges?: Challenge[] }, errors?: unknown[] }
    
    return result?.data?.activeChallenges || []
  } catch (error) {
    console.error('[TypingArena] Failed to get active challenges:', error)
    throw error
  }
}

/**
 * Get upcoming challenges
 */
export async function getUpcomingChallenges(): Promise<Challenge[]> {
  const appId = getTypingArenaAppId()
  
  try {
    const result = await queryApplication(appId, `
      query {
        upcomingChallenges {
          id
          creator
          title
          text
          difficulty
          status
          startTime
          endTime
          createdAt
          participantCount
          bestWpm
          bestPlayer
        }
      }
    `) as { data?: { upcomingChallenges?: Challenge[] }, errors?: unknown[] }
    
    return result?.data?.upcomingChallenges || []
  } catch (error) {
    console.error('[TypingArena] Failed to get upcoming challenges:', error)
    throw error
  }
}

/**
 * Get finished challenges
 */
export async function getFinishedChallenges(): Promise<Challenge[]> {
  const appId = getTypingArenaAppId()
  
  try {
    const result = await queryApplication(appId, `
      query {
        finishedChallenges {
          id
          creator
          title
          text
          difficulty
          status
          startTime
          endTime
          createdAt
          participantCount
          bestWpm
          bestPlayer
        }
      }
    `) as { data?: { finishedChallenges?: Challenge[] }, errors?: unknown[] }
    
    return result?.data?.finishedChallenges || []
  } catch (error) {
    console.error('[TypingArena] Failed to get finished challenges:', error)
    throw error
  }
}

/**
 * Get a specific challenge by ID
 */
export async function getChallenge(id: number): Promise<Challenge | null> {
  const appId = getTypingArenaAppId()
  
  try {
    const result = await queryApplication(appId, `
      query GetChallenge($id: Int!) {
        challenge(id: $id) {
          id
          creator
          title
          text
          difficulty
          status
          startTime
          endTime
          createdAt
          participantCount
          bestWpm
          bestPlayer
        }
      }
    `, { id }) as { data?: { challenge?: Challenge }, errors?: unknown[] }
    
    return result?.data?.challenge || null
  } catch (error) {
    console.error('[TypingArena] Failed to get challenge:', error)
    throw error
  }
}

/**
 * Get challenges created by the current user
 */
export async function getMyChallenges(): Promise<Challenge[]> {
  const appId = getTypingArenaAppId()
  const chainId = getCurrentChainId()
  
  if (!chainId) {
    throw new Error('Wallet not connected')
  }
  
  try {
    const result = await queryApplication(appId, `
      query MyChallenges($owner: String!) {
        myChallenges(owner: $owner) {
          id
          creator
          title
          text
          difficulty
          status
          startTime
          endTime
          createdAt
          participantCount
          bestWpm
          bestPlayer
        }
      }
    `, { owner: chainId }) as { data?: { myChallenges?: Challenge[] }, errors?: unknown[] }
    
    return result?.data?.myChallenges || []
  } catch (error) {
    console.error('[TypingArena] Failed to get my challenges:', error)
    throw error
  }
}

/**
 * Get results for a challenge (leaderboard - sorted by WPM)
 */
export async function getChallengeResults(challengeId: number): Promise<TypingResult[]> {
  const appId = getTypingArenaAppId()
  
  try {
    const result = await queryApplication(appId, `
      query ChallengeResults($challengeId: Int!) {
        challengeResults(challengeId: $challengeId) {
          challengeId
          player
          wpm
          accuracy
          completed
          timeTakenMs
          submittedAt
        }
      }
    `, { challengeId }) as { data?: { challengeResults?: TypingResult[] }, errors?: unknown[] }
    
    return result?.data?.challengeResults || []
  } catch (error) {
    console.error('[TypingArena] Failed to get challenge results:', error)
    throw error
  }
}

/**
 * Get the current player's result for a challenge
 */
export async function getMyResult(challengeId: number): Promise<TypingResult | null> {
  const appId = getTypingArenaAppId()
  const chainId = getCurrentChainId()
  
  if (!chainId) {
    return null
  }
  
  try {
    const result = await queryApplication(appId, `
      query PlayerResult($challengeId: Int!, $player: String!) {
        playerResult(challengeId: $challengeId, player: $player) {
          challengeId
          player
          wpm
          accuracy
          completed
          timeTakenMs
          submittedAt
        }
      }
    `, { challengeId, player: chainId }) as { data?: { playerResult?: TypingResult }, errors?: unknown[] }
    
    return result?.data?.playerResult || null
  } catch (error) {
    console.error('[TypingArena] Failed to get my result:', error)
    throw error
  }
}

/**
 * Get all results by the current player
 */
export async function getMyResults(): Promise<TypingResult[]> {
  const appId = getTypingArenaAppId()
  const chainId = getCurrentChainId()
  
  if (!chainId) {
    return []
  }
  
  try {
    const result = await queryApplication(appId, `
      query PlayerResults($player: String!) {
        playerResults(player: $player) {
          challengeId
          player
          wpm
          accuracy
          completed
          timeTakenMs
          submittedAt
        }
      }
    `, { player: chainId }) as { data?: { playerResults?: TypingResult[] }, errors?: unknown[] }
    
    return result?.data?.playerResults || []
  } catch (error) {
    console.error('[TypingArena] Failed to get my results:', error)
    throw error
  }
}

/**
 * Get player statistics
 */
export async function getPlayerStats(owner?: string): Promise<TypistStats> {
  const appId = getTypingArenaAppId()
  const playerOwner = owner || getCurrentChainId()
  
  if (!playerOwner) {
    return {
      challengesCompleted: 0,
      challengesWon: 0,
      totalWordsTyped: 0,
      bestWpm: 0,
      averageWpm: 0,
      averageAccuracy: 0,
    }
  }
  
  try {
    const result = await queryApplication(appId, `
      query PlayerStats($owner: String!) {
        playerStats(owner: $owner) {
          challengesCompleted
          challengesWon
          totalWordsTyped
          bestWpm
          averageWpm
          averageAccuracy
        }
      }
    `, { owner: playerOwner }) as { data?: { playerStats?: TypistStats }, errors?: unknown[] }
    
    return result?.data?.playerStats || {
      challengesCompleted: 0,
      challengesWon: 0,
      totalWordsTyped: 0,
      bestWpm: 0,
      averageWpm: 0,
      averageAccuracy: 0,
    }
  } catch (error) {
    console.error('[TypingArena] Failed to get player stats:', error)
    throw error
  }
}

/**
 * Create a new challenge
 */
export async function createChallenge(
  title: string,
  text: string,
  difficulty: Difficulty,
  startTime: number,
  endTime: number
): Promise<void> {
  const appId = getTypingArenaAppId()
  
  // async_graphql::Enum uses SCREAMING_CASE by default
  // So EASY, MEDIUM, HARD, EXPERT - NOT PascalCase
  // The difficulty parameter is already in SCREAMING_CASE from the type definition
  
  console.log('[TypingArena] Creating challenge:', { title, text: text.substring(0, 50) + '...', difficulty, startTime, endTime })
  
  try {
    const result = await mutateApplication(appId, `
      mutation CreateChallenge($title: String!, $text: String!, $difficulty: Difficulty!, $startTime: Int!, $endTime: Int!) {
        createChallenge(title: $title, text: $text, difficulty: $difficulty, startTime: $startTime, endTime: $endTime)
      }
    `, { title, text, difficulty, startTime, endTime })
    
    console.log('[TypingArena] Create challenge result:', result)
    
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      console.error('[TypingArena] GraphQL errors:', typedResult.errors)
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[TypingArena] Failed to create challenge:', error)
    throw error
  }
}

/**
 * Submit a result for a challenge
 */
export async function submitResult(
  challengeId: number,
  wpm: number,
  accuracy: number,
  completed: boolean,
  timeTakenMs: number
): Promise<void> {
  const appId = getTypingArenaAppId()
  
  console.log('[TypingArena] Submitting result:', { challengeId, wpm, accuracy, completed, timeTakenMs })
  
  try {
    const result = await mutateApplication(appId, `
      mutation SubmitResult($challengeId: Int!, $wpm: Int!, $accuracy: Int!, $completed: Boolean!, $timeTakenMs: Int!) {
        submitResult(challengeId: $challengeId, wpm: $wpm, accuracy: $accuracy, completed: $completed, timeTakenMs: $timeTakenMs)
      }
    `, { challengeId, wpm, accuracy, completed, timeTakenMs })
    
    console.log('[TypingArena] Submit result:', result)
    
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[TypingArena] Failed to submit result:', error)
    throw error
  }
}

/**
 * Cancel a challenge (creator only, before start)
 */
export async function cancelChallenge(challengeId: number): Promise<void> {
  const appId = getTypingArenaAppId()
  
  console.log('[TypingArena] Cancelling challenge:', { challengeId })
  
  try {
    const result = await mutateApplication(appId, `
      mutation CancelChallenge($challengeId: Int!) {
        cancelChallenge(challengeId: $challengeId)
      }
    `, { challengeId })
    
    console.log('[TypingArena] Cancel challenge result:', result)
  } catch (error) {
    console.error('[TypingArena] Failed to cancel challenge:', error)
    throw error
  }
}

/**
 * Format challenge status for display
 */
export function formatChallengeStatus(status: ChallengeStatus): { label: string; color: string; emoji: string } {
  switch (status) {
    case 'UPCOMING': return { label: 'Upcoming', color: 'text-blue-400', emoji: '⏳' }
    case 'ACTIVE': return { label: 'Live Now', color: 'text-green-400', emoji: '🟢' }
    case 'FINISHED': return { label: 'Finished', color: 'text-gray-400', emoji: '🏁' }
    case 'CANCELLED': return { label: 'Cancelled', color: 'text-red-400', emoji: '❌' }
    default: return { label: status, color: 'text-gray-400', emoji: '❓' }
  }
}

/**
 * Format difficulty for display
 */
export function formatDifficulty(difficulty: Difficulty): { label: string; color: string; emoji: string } {
  switch (difficulty) {
    case 'EASY': return { label: 'Easy', color: 'text-green-400', emoji: '🌱' }
    case 'MEDIUM': return { label: 'Medium', color: 'text-yellow-400', emoji: '⚡' }
    case 'HARD': return { label: 'Hard', color: 'text-orange-400', emoji: '🔥' }
    case 'EXPERT': return { label: 'Expert', color: 'text-red-400', emoji: '💀' }
    default: return { label: difficulty, color: 'text-gray-400', emoji: '❓' }
  }
}

/**
 * Get WPM rating
 */
export function getWpmRating(wpm: number): { label: string; color: string; emoji: string } {
  if (wpm >= 100) return { label: 'Legendary', color: 'text-yellow-400', emoji: '🏆' }
  if (wpm >= 80) return { label: 'Expert', color: 'text-purple-400', emoji: '⭐' }
  if (wpm >= 60) return { label: 'Advanced', color: 'text-blue-400', emoji: '🚀' }
  if (wpm >= 40) return { label: 'Intermediate', color: 'text-green-400', emoji: '✨' }
  if (wpm >= 20) return { label: 'Beginner', color: 'text-yellow-500', emoji: '🌱' }
  return { label: 'Novice', color: 'text-gray-400', emoji: '🐣' }
}

/**
 * Calculate time remaining for a challenge
 */
export function getTimeRemaining(endTime: number): { minutes: number; seconds: number; isExpired: boolean } {
  const now = Math.floor(Date.now() / 1000)
  const diff = endTime - now
  
  if (diff <= 0) {
    return { minutes: 0, seconds: 0, isExpired: true }
  }
  
  const minutes = Math.floor(diff / 60)
  const seconds = diff % 60
  
  return { minutes, seconds, isExpired: false }
}

/**
 * Calculate time until challenge starts
 */
export function getTimeUntilStart(startTime: number): { hours: number; minutes: number; seconds: number; isStarted: boolean } {
  const now = Math.floor(Date.now() / 1000)
  const diff = startTime - now
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isStarted: true }
  }
  
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60
  
  return { hours, minutes, seconds, isStarted: false }
}

/**
 * Sample texts for typing challenges
 */
export const SAMPLE_TEXTS = {
  easy: [
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs.",
    "How vexingly quick daft zebras jump.",
    "The five boxing wizards jump quickly.",
  ],
  medium: [
    "Programming is the art of telling another human being what one wants the computer to do. It requires precision, creativity, and patience.",
    "Blockchain technology enables decentralized applications that can revolutionize how we interact with digital systems and each other.",
    "The best code is the code that doesn't need to be written. Every line of code is a liability that must be maintained and understood.",
  ],
  hard: [
    "In the realm of distributed systems, achieving consensus among multiple nodes while maintaining fault tolerance presents unique challenges that require sophisticated algorithms and careful consideration of network partitions.",
    "Cryptographic protocols form the backbone of secure communication systems, utilizing mathematical principles to ensure data integrity, authenticity, and confidentiality across untrusted networks.",
  ],
  expert: [
    "The implementation of zero-knowledge proofs within blockchain ecosystems represents a paradigm shift in privacy-preserving computations, enabling verification of statements without revealing underlying data through complex mathematical constructions such as zk-SNARKs and zk-STARKs.",
  ],
}

/**
 * Get a random text for a difficulty level
 */
export function getRandomText(difficulty: Difficulty): string {
  const diffKey = difficulty.toLowerCase() as keyof typeof SAMPLE_TEXTS
  const texts = SAMPLE_TEXTS[diffKey] || SAMPLE_TEXTS.medium
  return texts[Math.floor(Math.random() * texts.length)]
}
