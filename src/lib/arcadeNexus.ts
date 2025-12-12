/**
 * Arcade Nexus Application Helper
 * 
 * This module provides TypeScript helpers for interacting with the 
 * on-chain Arcade Nexus reputation system on Conway testnet.
 * 
 * Features:
 * - Seasons with start/end dates
 * - Player XP tracking per season per game category
 * - Quests with XP rewards
 * - Leaderboards
 * - Arcade Skill Index calculation
 * 
 * IMPORTANT: This module requires a deployed Arcade Nexus contract.
 * Set VITE_ARCADE_NEXUS_APP_ID in your .env file after deployment.
 * 
 * NOTE: async_graphql automatically converts Rust snake_case to camelCase in GraphQL.
 */

import {
    mutateApplication,
    queryApplication,
} from './lineraClient'

// ==================== Types ====================

export interface Season {
  id: number
  title: string
  description: string
  startTime: number // Unix timestamp in seconds
  endTime: number
  theme: string | null
  active: boolean
}

export interface PlayerSeasonStats {
  owner: string
  seasonId: number
  totalXp: number
  predictionScore: number
  memeScore: number
  typingScore: number
  lifeScore: number
  completedQuests: number
  rankSnapshot: number | null
}

export type QuestCategory = 
  | 'PREDICTION'
  | 'MEME' 
  | 'TYPING'
  | 'LIFE'
  | 'MIXED'
  | 'OTHER'

export interface Quest {
  id: number
  seasonId: number
  title: string
  description: string
  category: QuestCategory
  rewardXp: number
  requirementsText: string
  createdBy: string
  active: boolean
  aiSuggested: boolean
  createdAt: number
}

export interface QuestProgress {
  questId: number
  owner: string
  completed: boolean
  completedAt: number | null
}

export interface ArcadeSkillIndex {
  owner: string
  seasonId: number
  totalXp: number
  overallScore: number
  rankHint: string | null
}

export type GameCategory = 
  | 'PREDICTION'
  | 'MEME'
  | 'TYPING'
  | 'LIFE'

// ==================== Helpers ====================

function requireEnv(name: string): string {
  const value = import.meta.env[name]
  if (!value || value === 'REPLACE_WITH_DEPLOYED_ID') {
    const error = `Missing ${name}. Did you deploy the Arcade Nexus contract and set it in .env?`
    console.error(`[ArcadeNexus] ${error}`)
    throw new Error(error)
  }
  return value
}

function getArcadeNexusAppId(): string {
  return requireEnv('VITE_ARCADE_NEXUS_APP_ID')
}

function handleGraphQLErrors(result: { errors?: Array<{ message: string }> }): void {
  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => e.message).join('; ')
    throw new Error(`GraphQL error: ${errorMessages}`)
  }
}

// Convert JS category to GraphQL enum (contract uses Prediction, Meme, Typing, Life, Mixed, Other)
function categoryToGraphQL(category: GameCategory | QuestCategory): string {
  // async_graphql::Enum uses SCREAMING_CASE by default
  return category // Already in correct format (MEME, PREDICTION, etc.)
}

// ==================== Queries ====================

/**
 * Get all seasons (newest first)
 */
export async function getSeasons(): Promise<Season[]> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Querying seasons')
  
  try {
    const result = await queryApplication(appId, `
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
    `) as { data?: { seasons?: Season[] } }
    
    return result?.data?.seasons || []
  } catch (error) {
    console.error('[ArcadeNexus] Failed to get seasons:', error)
    throw error
  }
}

/**
 * Get only active seasons
 */
export async function getActiveSeasons(): Promise<Season[]> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Querying active seasons')
  
  try {
    const result = await queryApplication(appId, `
      query {
        activeSeasons {
          id
          title
          description
          startTime
          endTime
          theme
          active
        }
      }
    `) as { data?: { activeSeasons?: Season[] } }
    
    return result?.data?.activeSeasons || []
  } catch (error) {
    console.error('[ArcadeNexus] Failed to get active seasons:', error)
    throw error
  }
}

/**
 * Get a specific season by ID
 */
export async function getSeason(id: number): Promise<Season | null> {
  const appId = getArcadeNexusAppId()
  
  try {
    const result = await queryApplication(appId, `
      query {
        season(id: ${id}) {
          id
          title
          description
          startTime
          endTime
          theme
          active
        }
      }
    `) as { data?: { season?: Season } }
    
    return result?.data?.season || null
  } catch (error) {
    console.error('[ArcadeNexus] Failed to get season:', error)
    throw error
  }
}

/**
 * Get player stats for a season
 */
export async function getPlayerSeasonStats(owner: string, seasonId: number): Promise<PlayerSeasonStats> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Querying player stats:', { owner, seasonId })
  
  try {
    const result = await queryApplication(appId, `
      query {
        playerSeasonStats(owner: "${owner}", seasonId: ${seasonId}) {
          owner
          seasonId
          totalXp
          predictionScore
          memeScore
          typingScore
          lifeScore
          completedQuests
          rankSnapshot
        }
      }
    `) as { data?: { playerSeasonStats?: PlayerSeasonStats } }
    
    return result?.data?.playerSeasonStats || {
      owner,
      seasonId,
      totalXp: 0,
      predictionScore: 0,
      memeScore: 0,
      typingScore: 0,
      lifeScore: 0,
      completedQuests: 0,
      rankSnapshot: null,
    }
  } catch (error) {
    console.error('[ArcadeNexus] Failed to get player stats:', error)
    throw error
  }
}

/**
 * Get leaderboard for a season (top N players by XP)
 */
export async function getLeaderboard(seasonId: number, limit: number = 50): Promise<PlayerSeasonStats[]> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Querying leaderboard:', { seasonId, limit })
  
  try {
    const result = await queryApplication(appId, `
      query {
        leaderboard(seasonId: ${seasonId}, limit: ${limit}) {
          owner
          seasonId
          totalXp
          predictionScore
          memeScore
          typingScore
          lifeScore
          completedQuests
          rankSnapshot
        }
      }
    `) as { data?: { leaderboard?: PlayerSeasonStats[] } }
    
    return result?.data?.leaderboard || []
  } catch (error) {
    console.error('[ArcadeNexus] Failed to get leaderboard:', error)
    throw error
  }
}

/**
 * Get all quests for a season
 */
export async function getQuests(seasonId: number): Promise<Quest[]> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Querying quests:', { seasonId })
  
  try {
    const result = await queryApplication(appId, `
      query {
        quests(seasonId: ${seasonId}) {
          id
          seasonId
          title
          description
          category
          rewardXp
          requirementsText
          createdBy
          active
          aiSuggested
          createdAt
        }
      }
    `) as { data?: { quests?: Quest[] } }
    
    return result?.data?.quests || []
  } catch (error) {
    console.error('[ArcadeNexus] Failed to get quests:', error)
    throw error
  }
}

/**
 * Get player's quest progress for a season
 */
export async function getPlayerQuests(owner: string, seasonId: number): Promise<QuestProgress[]> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Querying player quests:', { owner, seasonId })
  
  try {
    const result = await queryApplication(appId, `
      query {
        playerQuests(owner: "${owner}", seasonId: ${seasonId}) {
          questId
          owner
          completed
          completedAt
        }
      }
    `) as { data?: { playerQuests?: QuestProgress[] } }
    
    return result?.data?.playerQuests || []
  } catch (error) {
    console.error('[ArcadeNexus] Failed to get player quests:', error)
    throw error
  }
}

/**
 * Get player's Arcade Skill Index for a season
 */
export async function getSkillIndex(owner: string, seasonId: number): Promise<ArcadeSkillIndex> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Querying skill index:', { owner, seasonId })
  
  try {
    const result = await queryApplication(appId, `
      query {
        skillIndex(owner: "${owner}", seasonId: ${seasonId}) {
          owner
          seasonId
          totalXp
          overallScore
          rankHint
        }
      }
    `) as { data?: { skillIndex?: ArcadeSkillIndex } }
    
    return result?.data?.skillIndex || {
      owner,
      seasonId,
      totalXp: 0,
      overallScore: 0,
      rankHint: 'Bronze',
    }
  } catch (error) {
    console.error('[ArcadeNexus] Failed to get skill index:', error)
    throw error
  }
}

// ==================== Mutations ====================

/**
 * Create a new season (admin only)
 */
export async function createSeason(
  title: string,
  startTime: number,
  endTime: number,
  description?: string,
  theme?: string
): Promise<void> {
  const appId = getArcadeNexusAppId()
  const desc = description || `Season starting ${new Date(startTime * 1000).toLocaleDateString()}`
  
  console.log('[ArcadeNexus] Creating season:', { title, description: desc, startTime, endTime, theme })
  
  try {
    const themeArg = theme ? `, theme: "${theme}"` : ''
    const result = await mutateApplication(appId, `
      mutation {
        createSeason(title: "${title}", description: "${desc}", startTime: ${startTime}, endTime: ${endTime}${themeArg})
      }
    `) as { errors?: Array<{ message: string }> }
    
    handleGraphQLErrors(result)
    console.log('[ArcadeNexus] Season created')
  } catch (error) {
    console.error('[ArcadeNexus] Failed to create season:', error)
    throw error
  }
}

/**
 * Close a season (admin only)
 */
export async function closeSeason(seasonId: number): Promise<void> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Closing season:', { seasonId })
  
  try {
    const result = await mutateApplication(appId, `
      mutation {
        closeSeason(seasonId: ${seasonId})
      }
    `) as { errors?: Array<{ message: string }> }
    
    handleGraphQLErrors(result)
    console.log('[ArcadeNexus] Season closed')
  } catch (error) {
    console.error('[ArcadeNexus] Failed to close season:', error)
    throw error
  }
}

/**
 * Record a game action to earn XP
 * This should be called after completing game actions
 */
export async function recordGameAction(
  seasonId: number,
  category: GameCategory,
  points: number
): Promise<void> {
  const appId = getArcadeNexusAppId()
  const graphqlCategory = categoryToGraphQL(category)
  
  console.log('[ArcadeNexus] Recording game action:', { seasonId, category: graphqlCategory, points })
  
  try {
    const result = await mutateApplication(appId, `
      mutation {
        recordGameAction(seasonId: ${seasonId}, category: ${graphqlCategory}, points: ${points})
      }
    `) as { errors?: Array<{ message: string }> }
    
    handleGraphQLErrors(result)
    console.log('[ArcadeNexus] Game action recorded, XP earned:', points)
  } catch (error) {
    console.error('[ArcadeNexus] Failed to record game action:', error)
    throw error
  }
}

/**
 * Create a quest (admin only)
 */
export async function createQuest(
  seasonId: number,
  title: string,
  description: string,
  category: QuestCategory,
  rewardXp: number,
  requirementsText: string,
  aiSuggested: boolean = false
): Promise<void> {
  const appId = getArcadeNexusAppId()
  const graphqlCategory = categoryToGraphQL(category)
  
  console.log('[ArcadeNexus] Creating quest:', { seasonId, title, category: graphqlCategory, rewardXp, requirementsText })
  
  try {
    const result = await mutateApplication(appId, `
      mutation {
        createQuest(
          seasonId: ${seasonId},
          title: "${title}",
          description: "${description}",
          category: ${graphqlCategory},
          rewardXp: ${rewardXp},
          requirementsText: "${requirementsText}",
          aiSuggested: ${aiSuggested}
        )
      }
    `) as { errors?: Array<{ message: string }> }
    
    handleGraphQLErrors(result)
    console.log('[ArcadeNexus] Quest created')
  } catch (error) {
    console.error('[ArcadeNexus] Failed to create quest:', error)
    throw error
  }
}

/**
 * Complete a quest
 */
export async function completeQuest(questId: number): Promise<void> {
  const appId = getArcadeNexusAppId()
  
  console.log('[ArcadeNexus] Completing quest:', { questId })
  
  try {
    const result = await mutateApplication(appId, `
      mutation {
        completeQuest(questId: ${questId})
      }
    `) as { errors?: Array<{ message: string }> }
    
    handleGraphQLErrors(result)
    console.log('[ArcadeNexus] Quest completed')
  } catch (error) {
    console.error('[ArcadeNexus] Failed to complete quest:', error)
    throw error
  }
}

// ==================== Utilities ====================

/**
 * Format timestamp as human-readable date
 */
export function formatSeasonDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Check if a season is currently running
 */
export function isSeasonActive(season: Season): boolean {
  const now = Math.floor(Date.now() / 1000)
  return season.active && now >= season.startTime && now <= season.endTime
}

/**
 * Get time remaining in a season
 */
export function getSeasonTimeRemaining(season: Season): string {
  const now = Math.floor(Date.now() / 1000)
  const remaining = season.endTime - now
  
  if (remaining <= 0) return 'Ended'
  
  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  
  if (days > 0) {
    return `${days}d ${hours}h left`
  }
  return `${hours}h left`
}

/**
 * Check if Arcade Nexus is configured
 */
export function isArcadeNexusConfigured(): boolean {
  try {
    getArcadeNexusAppId()
    return true
  } catch {
    return false
  }
}
