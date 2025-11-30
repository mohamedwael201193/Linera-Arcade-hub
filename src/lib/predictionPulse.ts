/**
 * Prediction Pulse Application Helper
 * 
 * This module provides TypeScript helpers for interacting with the 
 * on-chain PredictionPulse Linera application on Conway testnet.
 * 
 * IMPORTANT: This module requires a deployed PredictionPulse contract.
 * Set VITE_PREDICTION_PULSE_APP_ID in your .env file after deployment.
 * 
 * NOTE: async_graphql automatically converts Rust snake_case to camelCase in GraphQL.
 * - Query method names: snake_case in Rust -> camelCase in GraphQL
 * - Field names in SimpleObject: snake_case in Rust -> camelCase in GraphQL
 * - Mutation names from GraphQLMutationRoot: PascalCase variant -> camelCase mutation
 * - Mutation parameters from GraphQLMutationRoot: snake_case -> camelCase
 * 
 * NO DEMO/MOCK CODE - All operations hit the real Conway network.
 */

import {
  getCurrentOwner,
  mutateApplication,
  queryApplication,
} from './lineraClient'

// Types matching the GraphQL schema (camelCase, auto-converted from Rust)
// NOTE: async_graphql::Enum uses SCREAMING_CASE by default
export type RoundStatus = 'OPEN' | 'CLOSED' | 'RESOLVED' | 'CANCELLED'

export interface Round {
  id: number
  title: string
  optionA: string
  optionB: string
  endTime: number
  status: RoundStatus
  winner: boolean | null  // true = option A wins, false = option B wins
  poolA: string  // Amount as string
  poolB: string  // Amount as string
  bettorsA: number
  bettorsB: number
  creator: string
  createdAt: number
}

export interface Bet {
  roundId: number
  owner: string
  choice: boolean  // true = option A, false = option B
  amount: string   // Amount as string
  placedAt: number
  claimed: boolean
}

export interface PlayerStats {
  roundsPlayed: number
  roundsWon: number
  totalWagered: string  // Amount as string
  totalWon: string      // Amount as string
}

/**
 * Require an environment variable, throwing a clear error if missing.
 */
function requireEnv(name: string): string {
  const value = import.meta.env[name]
  if (!value || value === 'REPLACE_WITH_DEPLOYED_ID') {
    const error = `Missing ${name}. Did you deploy the PredictionPulse contract and set it in .env?`
    console.error(`[PredictionPulse] ${error}`)
    throw new Error(error)
  }
  return value
}

/**
 * Get the PredictionPulse application ID from environment
 */
function getPredictionAppId(): string {
  return requireEnv('VITE_PREDICTION_PULSE_APP_ID')
}

/**
 * Get all rounds
 * GraphQL: rounds query with camelCase field names
 */
export async function getRounds(): Promise<Round[]> {
  const appId = getPredictionAppId()
  
  try {
    console.log('[PredictionPulse] Querying rounds from app:', appId)
    const result = await queryApplication(appId, `
      query {
        rounds {
          id
          title
          optionA
          optionB
          endTime
          status
          winner
          poolA
          poolB
          bettorsA
          bettorsB
          creator
          createdAt
        }
      }
    `)
    console.log('[PredictionPulse] Raw query result:', JSON.stringify(result))
    
    const typedResult = result as { data?: { rounds?: Round[] }, errors?: unknown[] }
    if (typedResult.errors) {
      console.error('[PredictionPulse] GraphQL errors:', typedResult.errors)
    }
    
    return typedResult?.data?.rounds || []
  } catch (error) {
    console.error('[PredictionPulse] Failed to get rounds:', error)
    throw error
  }
}

/**
 * Get open rounds
 * GraphQL: openRounds query (async_graphql converts open_rounds -> openRounds)
 */
export async function getOpenRounds(): Promise<Round[]> {
  const appId = getPredictionAppId()
  
  try {
    const result = await queryApplication(appId, `
      query {
        openRounds {
          id
          title
          optionA
          optionB
          endTime
          status
          winner
          poolA
          poolB
          bettorsA
          bettorsB
          creator
          createdAt
        }
      }
    `) as { data?: { openRounds?: Round[] }, errors?: unknown[] }
    
    if (result.errors) {
      console.error('[PredictionPulse] GraphQL errors:', result.errors)
    }
    
    return result?.data?.openRounds || []
  } catch (error) {
    console.error('[PredictionPulse] Failed to get open rounds:', error)
    throw error
  }
}

/**
 * Get a specific round by ID
 */
export async function getRound(id: number): Promise<Round | null> {
  const appId = getPredictionAppId()
  
  try {
    const result = await queryApplication(appId, `
      query GetRound($id: Int!) {
        round(id: $id) {
          id
          title
          optionA
          optionB
          endTime
          status
          winner
          poolA
          poolB
          bettorsA
          bettorsB
          creator
          createdAt
        }
      }
    `, { id }) as { data?: { round?: Round }, errors?: unknown[] }
    
    if (result.errors) {
      console.error('[PredictionPulse] GraphQL errors:', result.errors)
    }
    
    return result?.data?.round || null
  } catch (error) {
    console.error('[PredictionPulse] Failed to get round:', error)
    throw error
  }
}

/**
 * Get bets for a specific round
 * GraphQL: roundBets query (async_graphql converts round_bets -> roundBets)
 */
export async function getRoundBets(roundId: number): Promise<Bet[]> {
  const appId = getPredictionAppId()
  
  try {
    const result = await queryApplication(appId, `
      query RoundBets($roundId: Int!) {
        roundBets(roundId: $roundId) {
          roundId
          owner
          choice
          amount
          placedAt
          claimed
        }
      }
    `, { roundId }) as { data?: { roundBets?: Bet[] }, errors?: unknown[] }
    
    if (result.errors) {
      console.error('[PredictionPulse] GraphQL errors:', result.errors)
    }
    
    return result?.data?.roundBets || []
  } catch (error) {
    console.error('[PredictionPulse] Failed to get round bets:', error)
    throw error
  }
}

/**
 * Get bets for a specific player
 * GraphQL: playerBets query (async_graphql converts player_bets -> playerBets)
 */
export async function getPlayerBets(owner?: string): Promise<Bet[]> {
  const appId = getPredictionAppId()
  const playerOwner = owner || getCurrentOwner()
  
  if (!playerOwner) {
    throw new Error('Wallet not connected')
  }
  
  try {
    const result = await queryApplication(appId, `
      query PlayerBets($owner: String!) {
        playerBets(owner: $owner) {
          roundId
          owner
          choice
          amount
          placedAt
          claimed
        }
      }
    `, { owner: playerOwner }) as { data?: { playerBets?: Bet[] }, errors?: unknown[] }
    
    if (result.errors) {
      console.error('[PredictionPulse] GraphQL errors:', result.errors)
    }
    
    return result?.data?.playerBets || []
  } catch (error) {
    console.error('[PredictionPulse] Failed to get player bets:', error)
    throw error
  }
}

/**
 * Get player statistics
 * GraphQL: playerStats query (async_graphql converts player_stats -> playerStats)
 */
export async function getPlayerStats(owner?: string): Promise<PlayerStats> {
  const appId = getPredictionAppId()
  const playerOwner = owner || getCurrentOwner()
  
  if (!playerOwner) {
    return {
      roundsPlayed: 0,
      roundsWon: 0,
      totalWagered: '0',
      totalWon: '0',
    }
  }
  
  try {
    const result = await queryApplication(appId, `
      query PlayerStats($owner: String!) {
        playerStats(owner: $owner) {
          roundsPlayed
          roundsWon
          totalWagered
          totalWon
        }
      }
    `, { owner: playerOwner }) as { data?: { playerStats?: PlayerStats }, errors?: unknown[] }
    
    if (result.errors) {
      console.error('[PredictionPulse] GraphQL errors:', result.errors)
    }
    
    return result?.data?.playerStats || {
      roundsPlayed: 0,
      roundsWon: 0,
      totalWagered: '0',
      totalWon: '0',
    }
  } catch (error) {
    console.error('[PredictionPulse] Failed to get player stats:', error)
    throw error
  }
}

/**
 * Create a new prediction round
 * 
 * GraphQLMutationRoot macro generates camelCase mutation names and parameters:
 * - Mutation: createRound
 * - Parameters: title, optionA, optionB, endTime (camelCase)
 */
export async function createRound(
  title: string,
  optionA: string,
  optionB: string,
  endTime: number
): Promise<void> {
  const appId = getPredictionAppId()
  
  console.log('[PredictionPulse] Creating round:', { title, optionA, optionB, endTime })
  
  try {
    const result = await mutateApplication(appId, `
      mutation CreateRound($title: String!, $optionA: String!, $optionB: String!, $endTime: Int!) {
        createRound(title: $title, optionA: $optionA, optionB: $optionB, endTime: $endTime)
      }
    `, { title, optionA, optionB, endTime })
    
    console.log('[PredictionPulse] Create round result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string, locations?: unknown, path?: unknown }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      console.error('[PredictionPulse] GraphQL errors:', typedResult.errors)
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[PredictionPulse] Failed to create round:', error)
    throw error
  }
}

/**
 * Place a bet on a round
 * 
 * GraphQLMutationRoot macro generates camelCase mutation names and parameters:
 * - Mutation: placeBet
 * - Parameters: roundId, choice, amount (Amount type needs "10." format)
 */
export async function placeBet(
  roundId: number,
  choice: boolean,
  amount: string
): Promise<void> {
  const appId = getPredictionAppId()
  
  // Format amount with decimal point for Linera Amount type
  const formattedAmount = amount.includes('.') ? amount : `${amount}.`
  
  console.log('[PredictionPulse] Placing bet:', { roundId, choice, amount: formattedAmount })
  
  try {
    const result = await mutateApplication(appId, `
      mutation PlaceBet($roundId: Int!, $choice: Boolean!, $amount: Amount!) {
        placeBet(roundId: $roundId, choice: $choice, amount: $amount)
      }
    `, { roundId, choice, amount: formattedAmount })
    
    console.log('[PredictionPulse] Place bet result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string, locations?: unknown, path?: unknown }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      console.error('[PredictionPulse] GraphQL errors:', typedResult.errors)
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[PredictionPulse] Failed to place bet:', error)
    throw error
  }
}

/**
 * Close a round (admin/creator only)
 */
export async function closeRound(roundId: number): Promise<void> {
  const appId = getPredictionAppId()
  
  try {
    await mutateApplication(appId, `
      mutation CloseRound($roundId: Int!) {
        closeRound(roundId: $roundId)
      }
    `, { roundId })
  } catch (error) {
    console.error('[PredictionPulse] Failed to close round:', error)
    throw error
  }
}

/**
 * Resolve a round (admin/creator only)
 */
export async function resolveRound(roundId: number, winner: boolean): Promise<void> {
  const appId = getPredictionAppId()
  
  try {
    await mutateApplication(appId, `
      mutation ResolveRound($roundId: Int!, $winner: Boolean!) {
        resolveRound(roundId: $roundId, winner: $winner)
      }
    `, { roundId, winner })
  } catch (error) {
    console.error('[PredictionPulse] Failed to resolve round:', error)
    throw error
  }
}

/**
 * Cancel a round (admin/creator only)
 */
export async function cancelRound(roundId: number): Promise<void> {
  const appId = getPredictionAppId()
  
  try {
    await mutateApplication(appId, `
      mutation CancelRound($roundId: Int!) {
        cancelRound(roundId: $roundId)
      }
    `, { roundId })
  } catch (error) {
    console.error('[PredictionPulse] Failed to cancel round:', error)
    throw error
  }
}

/**
 * Claim winnings from a resolved round
 */
export async function claimWinnings(roundId: number): Promise<void> {
  const appId = getPredictionAppId()
  
  try {
    await mutateApplication(appId, `
      mutation ClaimWinnings($roundId: Int!) {
        claimWinnings(roundId: $roundId)
      }
    `, { roundId })
  } catch (error) {
    console.error('[PredictionPulse] Failed to claim winnings:', error)
    throw error
  }
}

/**
 * Format round status for display
 */
export function formatRoundStatus(status: RoundStatus): string {
  switch (status) {
    case 'OPEN': return 'Open for Betting'
    case 'CLOSED': return 'Betting Closed'
    case 'RESOLVED': return 'Resolved'
    case 'CANCELLED': return 'Cancelled'
    default: return status
  }
}

/**
 * Format amount (remove trailing zeros)
 */
export function formatAmount(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/**
 * Calculate potential winnings based on current pools
 */
export function calculatePotentialWinnings(
  betAmount: number,
  choice: boolean,
  round: Round
): number {
  const poolA = parseFloat(round.poolA) || 0
  const poolB = parseFloat(round.poolB) || 0
  const totalPool = poolA + poolB + betAmount
  
  const samePool = choice ? poolA : poolB
  
  // If no one on the same side, you get everything
  if (samePool + betAmount === 0) return 0
  
  const share = betAmount / (samePool + betAmount)
  return share * totalPool
}
