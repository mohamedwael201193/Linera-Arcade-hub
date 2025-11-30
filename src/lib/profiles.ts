/**
 * Player Profile Application Helper
 * 
 * This module provides TypeScript helpers for interacting with the 
 * on-chain PlayerProfile Linera application on Conway testnet.
 * 
 * IMPORTANT: This module requires a deployed PlayerProfile contract.
 * Set VITE_PLAYER_PROFILE_APP_ID in your .env file after deployment.
 * 
 * NO DEMO/MOCK CODE - All operations hit the real Conway network.
 */

import {
    getCurrentChainId,
    mutateApplication,
    queryApplication,
} from './lineraClient'

// Types matching the Rust contract
export interface PlayerProfile {
  name: string
  createdAt: number  // Unix timestamp in ms
  xp: number
  gamesPlayed: number
  wins: number
}

export interface ProfileWithOwner {
  owner: string
  profile: PlayerProfile
}

/**
 * Require an environment variable, throwing a clear error if missing.
 * This ensures we never silently fall back to demo data.
 */
function requireEnv(name: string): string {
  const value = import.meta.env[name]
  if (!value || value === 'REPLACE_WITH_DEPLOYED_ID') {
    const error = `Missing ${name}. Did you deploy the PlayerProfile contract and set it in .env?`
    console.error(`[Profiles] ${error}`)
    throw new Error(error)
  }
  return value
}

/**
 * Get the PlayerProfile application ID from environment
 * Throws if not configured
 */
function getProfileAppId(): string {
  return requireEnv('VITE_PLAYER_PROFILE_APP_ID')
}

/**
 * Get the current player's profile from the chain
 */
export async function fetchCurrentProfile(): Promise<PlayerProfile | null> {
  const appId = getProfileAppId()
  const chainId = getCurrentChainId()
  
  if (!chainId) {
    console.warn('[Profiles] No chain ID available - connect wallet first')
    return null
  }
  
  try {
    const result = await queryApplication(appId, `
      query GetProfile($owner: String!) {
        profile(owner: $owner) {
          name
          createdAt
          xp
          gamesPlayed
          wins
        }
      }
    `, { owner: chainId }) as { data?: { profile?: PlayerProfile } }
    
    return result?.data?.profile || null
  } catch (error) {
    console.error('[Profiles] Failed to fetch profile:', error)
    throw error
  }
}

/**
 * Check if the current user has a profile
 */
export async function hasProfile(): Promise<boolean> {
  const appId = getProfileAppId()
  const chainId = getCurrentChainId()
  
  if (!chainId) return false
  
  try {
    const result = await queryApplication(appId, `
      query HasProfile($owner: String!) {
        hasProfile(owner: $owner)
      }
    `, { owner: chainId }) as { data?: { hasProfile?: boolean } }
    
    return result?.data?.hasProfile || false
  } catch (error) {
    console.error('[Profiles] Failed to check profile:', error)
    throw error
  }
}

/**
 * Register a new profile on-chain
 */
export async function registerProfile(name: string): Promise<boolean> {
  const appId = getProfileAppId()
  
  // Validate name locally first
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 20) {
    throw new Error('Name must be between 3 and 20 characters')
  }
  
  try {
    const result = await mutateApplication(appId, `
      mutation Register($name: String!) {
        register(name: $name)
      }
    `, { name: trimmed }) as { data?: { register?: string }, errors?: Array<{ message: string }> }
    
    if (result?.errors?.length) {
      throw new Error(result.errors[0].message)
    }
    
    return true
  } catch (error) {
    console.error('[Profiles] Failed to register profile:', error)
    throw error
  }
}

/**
 * Update profile stats (XP, games played, wins)
 */
export async function updateStats(
  xpDelta: number = 0,
  gamesDelta: number = 0,
  winsDelta: number = 0
): Promise<PlayerProfile | null> {
  const appId = getProfileAppId()
  
  try {
    const result = await mutateApplication(appId, `
      mutation UpdateStats($xpDelta: Int!, $gamesDelta: Int!, $winsDelta: Int!) {
        updateStats(xpDelta: $xpDelta, gamesDelta: $gamesDelta, winsDelta: $winsDelta)
      }
    `, { xpDelta, gamesDelta, winsDelta }) as { data?: unknown, errors?: Array<{ message: string }> }
    
    if (result?.errors?.length) {
      throw new Error(result.errors[0].message)
    }
    
    // Refresh and return updated profile
    return await fetchCurrentProfile()
  } catch (error) {
    console.error('[Profiles] Failed to update stats:', error)
    throw error
  }
}

/**
 * Update the player's name
 */
export async function updateName(name: string): Promise<boolean> {
  const appId = getProfileAppId()
  
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 20) {
    throw new Error('Name must be between 3 and 20 characters')
  }
  
  try {
    const result = await mutateApplication(appId, `
      mutation UpdateName($name: String!) {
        updateName(name: $name)
      }
    `, { name: trimmed }) as { data?: unknown, errors?: Array<{ message: string }> }
    
    if (result?.errors?.length) {
      throw new Error(result.errors[0].message)
    }
    
    return true
  } catch (error) {
    console.error('[Profiles] Failed to update name:', error)
    throw error
  }
}

/**
 * Get the leaderboard (top profiles by XP)
 */
export async function getLeaderboard(limit: number = 10): Promise<ProfileWithOwner[]> {
  const appId = getProfileAppId()
  
  try {
    const result = await queryApplication(appId, `
      query Leaderboard($limit: Int!) {
        leaderboard(limit: $limit) {
          owner
          profile {
            name
            createdAt
            xp
            gamesPlayed
            wins
          }
        }
      }
    `, { limit }) as { data?: { leaderboard?: ProfileWithOwner[] } }
    
    return result?.data?.leaderboard || []
  } catch (error) {
    console.error('[Profiles] Failed to fetch leaderboard:', error)
    throw error
  }
}

/**
 * Get total number of registered profiles
 */
export async function getTotalProfiles(): Promise<number> {
  const appId = getProfileAppId()
  
  try {
    const result = await queryApplication(appId, `
      query { totalProfiles }
    `) as { data?: { totalProfiles?: number } }
    
    return result?.data?.totalProfiles || 0
  } catch (error) {
    console.error('[Profiles] Failed to get total profiles:', error)
    throw error
  }
}
