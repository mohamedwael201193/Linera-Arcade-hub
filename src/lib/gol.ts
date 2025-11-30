/**
 * Game of Life Application Helper
 * 
 * This module provides TypeScript helpers for interacting with the 
 * on-chain Game of Life Linera application on Conway testnet.
 * 
 * IMPORTANT: This module requires a deployed Game of Life contract.
 * Set VITE_GOL_APP_ID in your .env file after deployment.
 * 
 * NOTE: async_graphql automatically converts Rust snake_case to camelCase in GraphQL.
 * - Query method names: snake_case in Rust -> camelCase in GraphQL
 * - Field names in SimpleObject: snake_case in Rust -> camelCase in GraphQL
 * - Mutation names from GraphQLMutationRoot: PascalCase variant -> camelCase mutation
 * - Enum values: async_graphql::Enum uses SCREAMING_CASE by default
 * 
 * NO DEMO/MOCK CODE - All operations hit the real Conway network.
 */

import {
    mutateApplication,
    queryApplication,
} from './lineraClient'

// Grid dimensions (must match Rust contract)
export const GRID_WIDTH = 32
export const GRID_HEIGHT = 32

// Types matching the Rust contract
export interface GridInfo {
  generation: number
  running: boolean
  liveCount: number
  width: number
  height: number
}

export interface CellPosition {
  x: number
  y: number
}

export interface GridStats {
  generation: number
  liveCells: number
  deadCells: number
  density: number
}

// Pattern type - uses PascalCase for TypeScript but will be converted to SCREAMING_CASE for GraphQL
export type Pattern = 'Block' | 'Blinker' | 'Glider' | 'Lwss' | 'GliderGun' | 'Random'

// Convert Pattern to GraphQL enum format (SCREAMING_CASE)
function patternToGraphQL(pattern: Pattern): string {
  const mapping: Record<Pattern, string> = {
    'Block': 'BLOCK',
    'Blinker': 'BLINKER',
    'Glider': 'GLIDER',
    'Lwss': 'LWSS',
    'GliderGun': 'GLIDER_GUN',
    'Random': 'RANDOM',
  }
  return mapping[pattern]
}

/**
 * Require an environment variable, throwing a clear error if missing.
 * This ensures we never silently fall back to demo data.
 */
function requireEnv(name: string): string {
  const value = import.meta.env[name]
  if (!value || value === 'REPLACE_WITH_DEPLOYED_ID') {
    const error = `Missing ${name}. Did you deploy the Game of Life contract and set it in .env?`
    console.error(`[GoL] ${error}`)
    throw new Error(error)
  }
  return value
}

/**
 * Get the Game of Life application ID from environment
 * Throws if not configured
 */
function getGolAppId(): string {
  return requireEnv('VITE_GOL_APP_ID')
}

/**
 * Get the current grid info
 */
export async function getGridInfo(): Promise<GridInfo> {
  const appId = getGolAppId()
  
  console.log('[GoL] Querying grid info from app:', appId)
  
  try {
    const result = await queryApplication(appId, `
      query {
        grid {
          generation
          running
          liveCount
          width
          height
        }
      }
    `)
    
    console.log('[GoL] Grid info raw result:', JSON.stringify(result))
    
    const typedResult = result as { data?: { grid?: GridInfo } }
    
    return typedResult?.data?.grid || {
      generation: 0,
      running: false,
      liveCount: 0,
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
    }
  } catch (error) {
    console.error('[GoL] Failed to get grid info:', error)
    throw error
  }
}

/**
 * Get all live cell positions
 */
export async function getLiveCells(): Promise<CellPosition[]> {
  const appId = getGolAppId()
  
  console.log('[GoL] Querying live cells from app:', appId)
  
  try {
    const result = await queryApplication(appId, `
      query {
        liveCells {
          x
          y
        }
      }
    `)
    
    console.log('[GoL] Live cells raw result:', JSON.stringify(result))
    
    const typedResult = result as { data?: { liveCells?: CellPosition[] } }
    
    return typedResult?.data?.liveCells || []
  } catch (error) {
    console.error('[GoL] Failed to get live cells:', error)
    throw error
  }
}

/**
 * Check if a specific cell is alive
 */
export async function getCell(x: number, y: number): Promise<boolean> {
  const appId = getGolAppId()
  
  try {
    const result = await queryApplication(appId, `
      query GetCell($x: Int!, $y: Int!) {
        cell(x: $x, y: $y)
      }
    `, { x, y }) as { data?: { cell?: boolean } }
    
    return result?.data?.cell || false
  } catch (error) {
    console.error('[GoL] Failed to get cell:', error)
    throw error
  }
}

/**
 * Toggle a cell
 * 
 * GraphQLMutationRoot converts Toggle to toggle
 */
export async function toggleCell(x: number, y: number): Promise<void> {
  const appId = getGolAppId()
  
  console.log('[GoL] Toggling cell:', { x, y })
  
  try {
    // Pass values directly in the query
    const result = await mutateApplication(appId, `
      mutation {
        toggle(x: ${x}, y: ${y})
      }
    `)
    
    console.log('[GoL] Toggle result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[GoL] Failed to toggle cell:', error)
    throw error
  }
}

/**
 * Step the simulation forward
 * 
 * GraphQLMutationRoot converts Step to step, StepMultiple to stepMultiple
 */
export async function step(count: number = 1): Promise<GridInfo> {
  const appId = getGolAppId()
  
  console.log('[GoL] Stepping simulation:', { count })
  
  try {
    let result
    if (count === 1) {
      result = await mutateApplication(appId, `mutation { step }`)
    } else {
      // Pass count directly in query
      result = await mutateApplication(appId, `
        mutation {
          stepMultiple(count: ${count})
        }
      `)
    }
    
    console.log('[GoL] Step result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
    
    return getGridInfo()
  } catch (error) {
    console.error('[GoL] Failed to step:', error)
    throw error
  }
}

/**
 * Start continuous simulation
 * 
 * GraphQLMutationRoot converts Start to start
 */
export async function startSimulation(): Promise<void> {
  const appId = getGolAppId()
  
  console.log('[GoL] Starting simulation')
  
  try {
    const result = await mutateApplication(appId, `mutation { start }`)
    console.log('[GoL] Start result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[GoL] Failed to start:', error)
    throw error
  }
}

/**
 * Stop continuous simulation
 * 
 * GraphQLMutationRoot converts Stop to stop
 */
export async function stopSimulation(): Promise<void> {
  const appId = getGolAppId()
  
  console.log('[GoL] Stopping simulation')
  
  try {
    const result = await mutateApplication(appId, `mutation { stop }`)
    console.log('[GoL] Stop result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[GoL] Failed to stop:', error)
    throw error
  }
}

/**
 * Clear the grid
 * 
 * GraphQLMutationRoot converts Clear to clear
 */
export async function clearGrid(): Promise<void> {
  const appId = getGolAppId()
  
  console.log('[GoL] Clearing grid')
  
  try {
    const result = await mutateApplication(appId, `mutation { clear }`)
    console.log('[GoL] Clear result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[GoL] Failed to clear:', error)
    throw error
  }
}

/**
 * Randomize the grid
 * 
 * GraphQLMutationRoot converts Randomize to randomize
 * Note: seed is u64 in Rust but GraphQL Int is 32-bit signed.
 * We pass a small value directly as an unquoted integer.
 */
export async function randomizeGrid(seed?: number): Promise<void> {
  const appId = getGolAppId()
  // Use a small seed value that fits in 32-bit signed range (max ~2.1 billion)
  const actualSeed = seed ?? Math.floor(Math.random() * 1000000)
  
  console.log('[GoL] Randomizing grid with seed:', actualSeed)
  
  try {
    // Pass seed as unquoted integer (GraphQL Int type)
    const result = await mutateApplication(appId, `
      mutation {
        randomize(seed: ${actualSeed})
      }
    `)
    
    console.log('[GoL] Randomize result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[GoL] Failed to randomize:', error)
    throw error
  }
}

/**
 * Load a predefined pattern
 * 
 * GraphQLMutationRoot converts LoadPattern to loadPattern
 * Pattern enum uses SCREAMING_CASE: BLOCK, BLINKER, GLIDER, LWSS, GLIDER_GUN, RANDOM
 */
export async function loadPattern(pattern: Pattern, x: number = 0, y: number = 0): Promise<void> {
  const appId = getGolAppId()
  const graphqlPattern = patternToGraphQL(pattern)
  
  console.log('[GoL] Loading pattern:', { pattern, graphqlPattern, x, y })
  
  try {
    // Pass enum value directly in the query string (not as a variable)
    // This avoids potential variable type issues
    const result = await mutateApplication(appId, `
      mutation {
        loadPattern(pattern: ${graphqlPattern}, x: ${x}, y: ${y})
      }
    `)
    
    console.log('[GoL] Load pattern result:', result)
    
    // Check for GraphQL errors
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      console.error('[GoL] GraphQL errors:', typedResult.errors)
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[GoL] Failed to load pattern:', error)
    throw error
  }
}

/**
 * Get grid statistics
 */
export async function getStats(): Promise<GridStats> {
  const appId = getGolAppId()
  
  try {
    const result = await queryApplication(appId, `
      query {
        stats {
          generation
          liveCells
          deadCells
          density
        }
      }
    `) as { data?: { stats?: GridStats } }
    
    return result?.data?.stats || {
      generation: 0,
      liveCells: 0,
      deadCells: GRID_WIDTH * GRID_HEIGHT,
      density: 0,
    }
  } catch (error) {
    console.error('[GoL] Failed to get stats:', error)
    throw error
  }
}
