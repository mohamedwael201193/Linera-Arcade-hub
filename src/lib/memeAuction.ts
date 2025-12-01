/**
 * Meme Auction Application Helper
 * 
 * This module provides TypeScript helpers for interacting with the 
 * on-chain MemeAuction Linera application on Conway testnet.
 * 
 * IMPORTANT: This module requires a deployed MemeAuction contract.
 * Set VITE_MEME_AUCTION_APP_ID in your .env file after deployment.
 * 
 * NOTE: async_graphql automatically converts Rust snake_case to camelCase in GraphQL.
 * - Enum values use SCREAMING_CASE (e.g., OPEN, ENDED, CANCELLED, CLAIMED)
 * 
 * NO DEMO/MOCK CODE - All operations hit the real Conway network.
 */

import {
    getCurrentChainId,
    mutateApplication,
    queryApplication,
} from './lineraClient'

// Types matching the GraphQL schema (camelCase, auto-converted from Rust)
// NOTE: async_graphql::Enum uses SCREAMING_CASE by default
export type AuctionStatus = 'OPEN' | 'ENDED' | 'CANCELLED' | 'CLAIMED'
export type MemeRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export interface Auction {
  id: number
  memeId: number
  title: string
  imageUrl: string
  description: string
  creator: string
  rarity: MemeRarity
  startingPrice: string  // Amount as string
  currentBid: string     // Amount as string
  highestBidder: string | null
  bidCount: number
  status: AuctionStatus
  endTime: number
  createdAt: number
}

export interface Bid {
  auctionId: number
  bidder: string
  amount: string   // Amount as string
  placedAt: number
}

export interface AuctioneerStats {
  auctionsCreated: number
  auctionsWon: number
  totalBids: number
  totalSpent: string  // Amount as string
  memesCollected: number
}

/**
 * Require an environment variable, throwing a clear error if missing.
 */
function requireEnv(name: string): string {
  const value = import.meta.env[name]
  if (!value || value === 'REPLACE_WITH_DEPLOYED_ID') {
    const error = `Missing ${name}. Did you deploy the MemeAuction contract and set it in .env?`
    console.error(`[MemeAuction] ${error}`)
    throw new Error(error)
  }
  return value
}

/**
 * Get the MemeAuction application ID from environment
 */
function getMemeAuctionAppId(): string {
  return requireEnv('VITE_MEME_AUCTION_APP_ID')
}

/**
 * Get all auctions (newest first)
 */
export async function getAuctions(): Promise<Auction[]> {
  const appId = getMemeAuctionAppId()
  
  try {
    console.log('[MemeAuction] Querying auctions from app:', appId)
    const result = await queryApplication(appId, `
      query {
        auctions {
          id
          memeId
          title
          imageUrl
          description
          creator
          rarity
          startingPrice
          currentBid
          highestBidder
          bidCount
          status
          endTime
          createdAt
        }
      }
    `)
    console.log('[MemeAuction] Raw query result:', JSON.stringify(result))
    
    const typedResult = result as { data?: { auctions?: Auction[] }, errors?: unknown[] }
    if (typedResult.errors) {
      console.error('[MemeAuction] GraphQL errors:', typedResult.errors)
    }
    
    return typedResult?.data?.auctions || []
  } catch (error) {
    console.error('[MemeAuction] Failed to get auctions:', error)
    throw error
  }
}

/**
 * Get open auctions only
 */
export async function getOpenAuctions(): Promise<Auction[]> {
  const appId = getMemeAuctionAppId()
  
  try {
    const result = await queryApplication(appId, `
      query {
        openAuctions {
          id
          memeId
          title
          imageUrl
          description
          creator
          rarity
          startingPrice
          currentBid
          highestBidder
          bidCount
          status
          endTime
          createdAt
        }
      }
    `) as { data?: { openAuctions?: Auction[] }, errors?: unknown[] }
    
    if (result.errors) {
      console.error('[MemeAuction] GraphQL errors:', result.errors)
    }
    
    return result?.data?.openAuctions || []
  } catch (error) {
    console.error('[MemeAuction] Failed to get open auctions:', error)
    throw error
  }
}

/**
 * Get ended auctions (waiting to be claimed)
 */
export async function getEndedAuctions(): Promise<Auction[]> {
  const appId = getMemeAuctionAppId()
  
  try {
    const result = await queryApplication(appId, `
      query {
        endedAuctions {
          id
          memeId
          title
          imageUrl
          description
          creator
          rarity
          startingPrice
          currentBid
          highestBidder
          bidCount
          status
          endTime
          createdAt
        }
      }
    `) as { data?: { endedAuctions?: Auction[] }, errors?: unknown[] }
    
    return result?.data?.endedAuctions || []
  } catch (error) {
    console.error('[MemeAuction] Failed to get ended auctions:', error)
    throw error
  }
}

/**
 * Get a specific auction by ID
 */
export async function getAuction(id: number): Promise<Auction | null> {
  const appId = getMemeAuctionAppId()
  
  try {
    const result = await queryApplication(appId, `
      query GetAuction($id: Int!) {
        auction(id: $id) {
          id
          memeId
          title
          imageUrl
          description
          creator
          rarity
          startingPrice
          currentBid
          highestBidder
          bidCount
          status
          endTime
          createdAt
        }
      }
    `, { id }) as { data?: { auction?: Auction }, errors?: unknown[] }
    
    return result?.data?.auction || null
  } catch (error) {
    console.error('[MemeAuction] Failed to get auction:', error)
    throw error
  }
}

/**
 * Get auctions created by the current user
 */
export async function getMyAuctions(): Promise<Auction[]> {
  const appId = getMemeAuctionAppId()
  const chainId = getCurrentChainId()
  
  if (!chainId) {
    throw new Error('Wallet not connected')
  }
  
  try {
    const result = await queryApplication(appId, `
      query MyAuctions($owner: String!) {
        myAuctions(owner: $owner) {
          id
          memeId
          title
          imageUrl
          description
          creator
          rarity
          startingPrice
          currentBid
          highestBidder
          bidCount
          status
          endTime
          createdAt
        }
      }
    `, { owner: chainId }) as { data?: { myAuctions?: Auction[] }, errors?: unknown[] }
    
    return result?.data?.myAuctions || []
  } catch (error) {
    console.error('[MemeAuction] Failed to get my auctions:', error)
    throw error
  }
}

/**
 * Get auctions won by the current user
 */
export async function getWonAuctions(): Promise<Auction[]> {
  const appId = getMemeAuctionAppId()
  const chainId = getCurrentChainId()
  
  if (!chainId) {
    throw new Error('Wallet not connected')
  }
  
  try {
    const result = await queryApplication(appId, `
      query WonAuctions($owner: String!) {
        wonAuctions(owner: $owner) {
          id
          memeId
          title
          imageUrl
          description
          creator
          rarity
          startingPrice
          currentBid
          highestBidder
          bidCount
          status
          endTime
          createdAt
        }
      }
    `, { owner: chainId }) as { data?: { wonAuctions?: Auction[] }, errors?: unknown[] }
    
    return result?.data?.wonAuctions || []
  } catch (error) {
    console.error('[MemeAuction] Failed to get won auctions:', error)
    throw error
  }
}

/**
 * Get bids for an auction
 */
export async function getAuctionBids(auctionId: number): Promise<Bid[]> {
  const appId = getMemeAuctionAppId()
  
  try {
    const result = await queryApplication(appId, `
      query AuctionBids($auctionId: Int!) {
        auctionBids(auctionId: $auctionId) {
          auctionId
          bidder
          amount
          placedAt
        }
      }
    `, { auctionId }) as { data?: { auctionBids?: Bid[] }, errors?: unknown[] }
    
    return result?.data?.auctionBids || []
  } catch (error) {
    console.error('[MemeAuction] Failed to get auction bids:', error)
    throw error
  }
}

/**
 * Get player statistics
 */
export async function getPlayerStats(owner?: string): Promise<AuctioneerStats> {
  const appId = getMemeAuctionAppId()
  const playerOwner = owner || getCurrentChainId()
  
  if (!playerOwner) {
    return {
      auctionsCreated: 0,
      auctionsWon: 0,
      totalBids: 0,
      totalSpent: '0.',
      memesCollected: 0,
    }
  }
  
  try {
    const result = await queryApplication(appId, `
      query PlayerStats($owner: String!) {
        playerStats(owner: $owner) {
          auctionsCreated
          auctionsWon
          totalBids
          totalSpent
          memesCollected
        }
      }
    `, { owner: playerOwner }) as { data?: { playerStats?: AuctioneerStats }, errors?: unknown[] }
    
    return result?.data?.playerStats || {
      auctionsCreated: 0,
      auctionsWon: 0,
      totalBids: 0,
      totalSpent: '0.',
      memesCollected: 0,
    }
  } catch (error) {
    console.error('[MemeAuction] Failed to get player stats:', error)
    throw error
  }
}

/**
 * Get memes owned by the current user
 */
export async function getMyMemes(): Promise<number[]> {
  const appId = getMemeAuctionAppId()
  const chainId = getCurrentChainId()
  
  if (!chainId) {
    return []
  }
  
  try {
    const result = await queryApplication(appId, `
      query PlayerMemes($owner: String!) {
        playerMemes(owner: $owner)
      }
    `, { owner: chainId }) as { data?: { playerMemes?: number[] }, errors?: unknown[] }
    
    return result?.data?.playerMemes || []
  } catch (error) {
    console.error('[MemeAuction] Failed to get my memes:', error)
    throw error
  }
}

/**
 * Create a new auction
 */
export async function createAuction(
  title: string,
  imageUrl: string,
  description: string,
  rarity: MemeRarity,
  startingPrice: string,
  endTime: number
): Promise<void> {
  const appId = getMemeAuctionAppId()
  
  // Format amount with decimal point for Linera Amount type
  const formattedPrice = startingPrice.includes('.') ? startingPrice : `${startingPrice}.`
  
  // async_graphql::Enum uses SCREAMING_CASE by default
  // So RARE, EPIC, LEGENDARY etc. - NOT PascalCase
  // The rarity parameter is already in SCREAMING_CASE from the type definition
  
  console.log('[MemeAuction] Creating auction:', { title, imageUrl, description, rarity, startingPrice: formattedPrice, endTime })
  
  try {
    const result = await mutateApplication(appId, `
      mutation CreateAuction($title: String!, $imageUrl: String!, $description: String!, $rarity: MemeRarity!, $startingPrice: Amount!, $endTime: Int!) {
        createAuction(title: $title, imageUrl: $imageUrl, description: $description, rarity: $rarity, startingPrice: $startingPrice, endTime: $endTime)
      }
    `, { title, imageUrl, description, rarity, startingPrice: formattedPrice, endTime })
    
    console.log('[MemeAuction] Create auction result:', result)
    
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      console.error('[MemeAuction] GraphQL errors:', typedResult.errors)
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[MemeAuction] Failed to create auction:', error)
    throw error
  }
}

/**
 * Place a bid on an auction
 */
export async function placeBid(auctionId: number, amount: string): Promise<void> {
  const appId = getMemeAuctionAppId()
  
  // Format amount with decimal point for Linera Amount type
  const formattedAmount = amount.includes('.') ? amount : `${amount}.`
  
  console.log('[MemeAuction] Placing bid:', { auctionId, amount: formattedAmount })
  
  try {
    const result = await mutateApplication(appId, `
      mutation PlaceBid($auctionId: Int!, $amount: Amount!) {
        placeBid(auctionId: $auctionId, amount: $amount)
      }
    `, { auctionId, amount: formattedAmount })
    
    console.log('[MemeAuction] Place bid result:', result)
    
    const typedResult = result as { data?: unknown, errors?: Array<{ message: string }> }
    if (typedResult.errors && typedResult.errors.length > 0) {
      const errorMessages = typedResult.errors.map(e => e.message).join('; ')
      throw new Error(`GraphQL error: ${errorMessages}`)
    }
  } catch (error) {
    console.error('[MemeAuction] Failed to place bid:', error)
    throw error
  }
}

/**
 * End an auction (can be called by anyone after end time)
 */
export async function endAuction(auctionId: number): Promise<void> {
  const appId = getMemeAuctionAppId()
  
  console.log('[MemeAuction] Ending auction:', { auctionId })
  
  try {
    const result = await mutateApplication(appId, `
      mutation EndAuction($auctionId: Int!) {
        endAuction(auctionId: $auctionId)
      }
    `, { auctionId })
    
    console.log('[MemeAuction] End auction result:', result)
  } catch (error) {
    console.error('[MemeAuction] Failed to end auction:', error)
    throw error
  }
}

/**
 * Cancel an auction (creator only, no bids)
 */
export async function cancelAuction(auctionId: number): Promise<void> {
  const appId = getMemeAuctionAppId()
  
  console.log('[MemeAuction] Cancelling auction:', { auctionId })
  
  try {
    const result = await mutateApplication(appId, `
      mutation CancelAuction($auctionId: Int!) {
        cancelAuction(auctionId: $auctionId)
      }
    `, { auctionId })
    
    console.log('[MemeAuction] Cancel auction result:', result)
  } catch (error) {
    console.error('[MemeAuction] Failed to cancel auction:', error)
    throw error
  }
}

/**
 * Claim a won meme (winner only)
 */
export async function claimMeme(auctionId: number): Promise<void> {
  const appId = getMemeAuctionAppId()
  
  console.log('[MemeAuction] Claiming meme:', { auctionId })
  
  try {
    const result = await mutateApplication(appId, `
      mutation ClaimMeme($auctionId: Int!) {
        claimMeme(auctionId: $auctionId)
      }
    `, { auctionId })
    
    console.log('[MemeAuction] Claim meme result:', result)
  } catch (error) {
    console.error('[MemeAuction] Failed to claim meme:', error)
    throw error
  }
}

/**
 * Format auction status for display
 */
export function formatAuctionStatus(status: AuctionStatus): string {
  switch (status) {
    case 'OPEN': return 'Live'
    case 'ENDED': return 'Ended'
    case 'CANCELLED': return 'Cancelled'
    case 'CLAIMED': return 'Claimed'
    default: return status
  }
}

/**
 * Format rarity for display with emoji
 */
export function formatRarity(rarity: MemeRarity): { label: string; color: string; emoji: string } {
  switch (rarity) {
    case 'COMMON': return { label: 'Common', color: 'text-gray-400', emoji: '⚪' }
    case 'UNCOMMON': return { label: 'Uncommon', color: 'text-green-400', emoji: '🟢' }
    case 'RARE': return { label: 'Rare', color: 'text-blue-400', emoji: '🔵' }
    case 'EPIC': return { label: 'Epic', color: 'text-purple-400', emoji: '🟣' }
    case 'LEGENDARY': return { label: 'Legendary', color: 'text-yellow-400', emoji: '🟡' }
    default: return { label: rarity, color: 'text-gray-400', emoji: '⚪' }
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
 * Calculate time remaining for an auction
 */
export function getTimeRemaining(endTime: number): { days: number; hours: number; minutes: number; seconds: number; isExpired: boolean } {
  const now = Math.floor(Date.now() / 1000)
  const diff = endTime - now
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }
  }
  
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60
  
  return { days, hours, minutes, seconds, isExpired: false }
}

/**
 * Format time remaining as string
 */
export function formatTimeRemaining(endTime: number): string {
  const { days, hours, minutes, seconds, isExpired } = getTimeRemaining(endTime)
  
  if (isExpired) return 'Ended'
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
