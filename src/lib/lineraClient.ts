/**
 * Linera Client Library
 * 
 * This module provides a typed wrapper around @linera/client for the Linera Arcade Hub.
 * It handles wallet initialization, chain claiming, and application communication.
 * 
 * IMPORTANT: This library ONLY supports real Conway testnet connections.
 * All demo/mock code has been removed - contracts must be deployed and .env configured.
 * 
 * Wallet Modes:
 * - 'faucet': Use Conway testnet faucet to create a dev wallet (uses PrivateKey signer)
 * - 'metamask': Use MetaMask browser extension for signing (triggers MetaMask popups!)
 * 
 * KEY CHANGE: In MetaMask mode, the MetaMaskSigner is passed directly to the Client
 * constructor. This means ALL mutations will trigger MetaMask popups for signing,
 * just like on https://apps.linera.net/gol/index.html
 * 
 * References:
 * - https://linera.dev/developers/frontend/setup.html
 * - https://linera.dev/developers/frontend/interactivity.html
 * - https://linera.dev/developers/frontend/wallets.html
 */

// Import PrivateKey from @linera/signer for faucet mode only
import { PrivateKey } from '@linera/signer';
// Import MetaMaskSigner type for proper typing
import type { MetaMaskSigner } from './metamaskSigner';

// Type definitions for @linera/client
export interface LineraWallet {
  free(): void
}

export interface LineraFaucet {
  free(): void
  createWallet(): Promise<LineraWallet>
}

export interface LineraApplication {
  free(): void
  query(query: string, blockHash?: string | null): Promise<string>
}

export interface LineraFrontend {
  free(): void
  application(id: string): Promise<LineraApplication>
  validatorVersionInfo(): Promise<unknown>
}

export interface LineraClient {
  free(): void
  transfer(options: unknown): Promise<void>
  balance(): Promise<string>
  identity(): Promise<unknown>
  frontend(): LineraFrontend
  onNotification(handler: (notification: unknown) => void): void
}

export interface LineraSigner {
  sign(owner: string, value: Uint8Array): Promise<string>
  containsKey(owner: string): Promise<boolean>
  address(): Promise<string>
}

// Wallet connection mode
export type WalletMode = 'faucet' | 'metamask'

// Provider returned after successful connection
export interface LineraProvider {
  client: LineraClient
  wallet: LineraWallet
  chainId: string
  owner: string
  mode: WalletMode
  signer: LineraSigner | PrivateKey | MetaMaskSigner
}

// Environment configuration
const FAUCET_URL = 'https://faucet.testnet-conway.linera.net'

export const config = {
  network: import.meta.env.VITE_LINERA_NETWORK || 'conway',
  faucetUrl: import.meta.env.VITE_LINERA_FAUCET_URL || FAUCET_URL,
  validatorUrl: import.meta.env.VITE_LINERA_VALIDATOR_URL || 'https://validator-1.testnet-conway.linera.net',
}

// Storage keys
const STORAGE_KEYS = {
  CHAIN_ID: 'linera_arcade_chain_id',
  OWNER: 'linera_arcade_owner',
  WALLET_MODE: 'linera_arcade_wallet_mode',
}

// Cached instances
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lineraModule: any = null
let clientInstance: LineraClient | null = null
let _walletInstance: LineraWallet | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _signerInstance: any = null
let chainId: string | null = null
let currentMode: WalletMode | null = null

/**
 * Initialize the Linera WASM module
 * Must be called before any other operations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function initializeLinera(): Promise<any> {
  if (lineraModule) return lineraModule
  
  try {
    // Dynamic import to avoid bundling issues
    const linera = await import('@linera/client')
    
    // Initialize WASM (default export is the init function)
    await linera.default()
    
    lineraModule = linera
    console.log('[Linera] WASM module initialized')
    return linera
  } catch (error) {
    console.error('[Linera] Failed to initialize WASM:', error)
    throw new Error('Failed to initialize Linera client. Please refresh the page.')
  }
}

/**
 * Connect to Linera using the Conway faucet wallet
 * Creates a new wallet if none exists, or restores existing session
 * 
 * For faucet mode, we create a PrivateKey signer and pass it to the Client.
 */
async function connectFaucetWallet(): Promise<LineraProvider> {
  const linera = await initializeLinera()
  
  // Clear any stored session - faucet creates new wallet each time
  localStorage.removeItem(STORAGE_KEYS.CHAIN_ID)
  localStorage.removeItem(STORAGE_KEYS.OWNER)
  localStorage.removeItem(STORAGE_KEYS.WALLET_MODE)
  
  // Create new wallet from faucet
  console.log('[Linera] Creating new wallet from Conway faucet:', config.faucetUrl)
  const faucet = new linera.Faucet(config.faucetUrl)
  const wallet = await faucet.createWallet()
  
  // Create a PrivateKey signer for signing operations
  // Using a deterministic key for development (in production, use random or user-provided)
  const privateKeyHex = 'f77a21701522a03b01c111ad2d2cdaf2b8403b47507ee0aec3e2e52b765d7a66'
  const signer = new PrivateKey(privateKeyHex)
  const ownerAddress = await signer.address()
  
  // Claim a chain from faucet - pass WALLET and OWNER
  console.log('[Linera] Claiming chain for owner:', ownerAddress)
  const newChainId = await faucet.claimChain(wallet, ownerAddress)
  
  // Create client with wallet AND signer (both are required for signing operations)
  const client = await new linera.Client(wallet, signer) as LineraClient
  
  // Store session info
  localStorage.setItem(STORAGE_KEYS.CHAIN_ID, newChainId)
  localStorage.setItem(STORAGE_KEYS.OWNER, ownerAddress)
  localStorage.setItem(STORAGE_KEYS.WALLET_MODE, 'faucet')
  
  _walletInstance = wallet
  _signerInstance = signer
  clientInstance = client
  chainId = newChainId
  currentMode = 'faucet'
  
  console.log('[Linera] Faucet wallet ready. Chain:', newChainId, 'Owner:', ownerAddress)
  
  return {
    client,
    wallet,
    chainId: newChainId,
    owner: ownerAddress,
    mode: 'faucet',
    signer,
  }
}

/**
 * Connect to Linera using MetaMask for signing
 * Requires MetaMask browser extension to be installed
 * 
 * CRITICAL: The MetaMaskSigner is passed directly to new linera.Client(wallet, signer).
 * This means the Linera SDK will call metamaskSigner.sign() for EVERY mutation,
 * which triggers a MetaMask popup for user approval.
 * 
 * This matches the official counter/metamask example:
 * https://github.com/linera-io/linera-protocol/tree/testnet_conway/examples/counter/metamask
 */
async function connectMetaMaskWallet(): Promise<LineraProvider> {
  // Import MetaMask signer dynamically
  const { createMetaMaskSigner } = await import('./metamaskSigner')
  
  const linera = await initializeLinera()
  
  // Create MetaMask signer - this will prompt for account connection
  console.log('[Linera] Connecting to MetaMask...')
  const metamaskSigner = await createMetaMaskSigner()
  const ownerAddress = await metamaskSigner.address()
  
  // Create wallet from faucet (need wallet for chain operations)
  const faucet = new linera.Faucet(config.faucetUrl)
  const wallet = await faucet.createWallet()
  
  // Claim a chain from faucet using MetaMask address
  console.log('[Linera] Claiming chain for MetaMask address:', ownerAddress)
  const newChainId = await faucet.claimChain(wallet, ownerAddress)
  
  // CRITICAL FIX: Pass MetaMaskSigner directly to Client constructor!
  // This is the key change that enables MetaMask signing for mutations.
  // The Linera client will call metamaskSigner.sign() for every mutation,
  // which triggers a MetaMask popup.
  console.log('[Linera] Creating client with MetaMask signer...')
  const client = await new linera.Client(wallet, metamaskSigner) as LineraClient
  
  // Store session info
  localStorage.setItem(STORAGE_KEYS.CHAIN_ID, newChainId)
  localStorage.setItem(STORAGE_KEYS.OWNER, ownerAddress)
  localStorage.setItem(STORAGE_KEYS.WALLET_MODE, 'metamask')
  
  _walletInstance = wallet
  _signerInstance = metamaskSigner // Store MetaMask signer, not PrivateKey!
  clientInstance = client
  chainId = newChainId
  currentMode = 'metamask'
  
  console.log('[Linera] MetaMask wallet ready. Chain:', newChainId, 'Owner:', ownerAddress)
  console.log('[Linera] All mutations will now trigger MetaMask signature requests!')
  
  return {
    client,
    wallet,
    chainId: newChainId,
    owner: ownerAddress,
    mode: 'metamask',
    signer: metamaskSigner,
  }
}

/**
 * Connect wallet using specified mode
 * This is the main entry point for wallet connection
 * 
 * @param mode - 'faucet' for Conway dev wallet, 'metamask' for MetaMask signing
 */
export async function connectWallet(mode: WalletMode): Promise<LineraProvider> {
  if (mode === 'metamask') {
    return connectMetaMaskWallet()
  }
  return connectFaucetWallet()
}

/**
 * Get the Linera provider - connects if not already connected
 * Restores session from localStorage if available
 */
export async function getLineraProvider(): Promise<LineraProvider> {
  // Return cached provider if available
  if (clientInstance && _walletInstance && chainId && currentMode) {
    const owner = localStorage.getItem(STORAGE_KEYS.OWNER) || ''
    return {
      client: clientInstance,
      wallet: _walletInstance,
      chainId,
      owner,
      mode: currentMode,
      signer: _signerInstance,
    }
  }
  
  // Check for saved mode and try to restore
  const savedMode = localStorage.getItem(STORAGE_KEYS.WALLET_MODE) as WalletMode | null
  if (savedMode) {
    return connectWallet(savedMode)
  }
  
  // Default to faucet mode
  return connectWallet('faucet')
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use connectWallet() or getLineraProvider() instead
 */
export async function initLineraClient(): Promise<{
  client: LineraClient
  wallet: LineraWallet
  chainId: string
  owner: string
}> {
  const provider = await getLineraProvider()
  return {
    client: provider.client,
    wallet: provider.wallet,
    chainId: provider.chainId,
    owner: provider.owner,
  }
}

/**
 * Get application client for a specific app ID
 */
export async function getApplicationClient(appId: string) {
  if (!clientInstance) {
    throw new Error('Linera client not initialized. Call connectWallet() or getLineraProvider() first.')
  }
  
  const frontend = clientInstance.frontend()
  return await frontend.application(appId)
}

/**
 * Create a GraphQL query string in Apollo Server POST format
 */
export function gql(query: string, variables: Record<string, unknown> = {}) {
  return JSON.stringify({ query, variables })
}

/**
 * Execute a GraphQL query on an application
 * 
 * The query should be a complete GraphQL query string like:
 * `query { profile(owner: "abc") { name } }`
 * 
 * Or just the inner part (will be wrapped automatically):
 * `profile(owner: "abc") { name }`
 */
export async function queryApplication(
  appId: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<unknown> {
  const app = await getApplicationClient(appId)
  
  // Check if query already has query/mutation keyword
  const trimmedQuery = query.trim()
  const hasKeyword = trimmedQuery.startsWith('query') || trimmedQuery.startsWith('mutation')
  
  // Build the request - Linera uses Apollo Server POST format
  const fullQuery = hasKeyword ? trimmedQuery : `query { ${trimmedQuery} }`
  const request = variables
    ? JSON.stringify({ query: fullQuery, variables })
    : JSON.stringify({ query: fullQuery })
  
  const response = await app.query(request)
  return JSON.parse(response)
}

/**
 * Execute a GraphQL mutation on an application
 * 
 * The mutation should be a complete GraphQL mutation string like:
 * `mutation { register(name: "player") }`
 * 
 * Or just the inner part (will be wrapped automatically):
 * `register(name: "player")`
 */
export async function mutateApplication(
  appId: string,
  mutation: string,
  variables?: Record<string, unknown>
): Promise<unknown> {
  const app = await getApplicationClient(appId)
  
  // Check if mutation already has query/mutation keyword
  const trimmedMutation = mutation.trim()
  const hasKeyword = trimmedMutation.startsWith('query') || trimmedMutation.startsWith('mutation')
  
  // Build the request - Linera uses Apollo Server POST format
  const fullMutation = hasKeyword ? trimmedMutation : `mutation { ${trimmedMutation} }`
  const request = variables
    ? JSON.stringify({ query: fullMutation, variables })
    : JSON.stringify({ query: fullMutation })
  
  const response = await app.query(request)
  return JSON.parse(response)
}

/**
 * Set up notification handler for real-time updates
 */
export function onNotification(
  callback: (notification: unknown) => void
): void {
  if (!clientInstance) {
    console.warn('[Linera] Client not initialized, cannot set up notifications')
    return
  }
  
  clientInstance.onNotification(callback)
}

/**
 * Disconnect and clear stored wallet
 */
export function disconnect(): void {
  localStorage.removeItem(STORAGE_KEYS.CHAIN_ID)
  localStorage.removeItem(STORAGE_KEYS.OWNER)
  localStorage.removeItem(STORAGE_KEYS.WALLET_MODE)
  
  // Clear IndexedDB wallet storage
  indexedDB.deleteDatabase('linera_wallet')
  
  clientInstance = null
  _walletInstance = null
  _signerInstance = null
  chainId = null
  currentMode = null
  
  console.log('[Linera] Disconnected')
}

/**
 * Get current wallet mode
 */
export function getWalletMode(): WalletMode | null {
  return currentMode || (localStorage.getItem(STORAGE_KEYS.WALLET_MODE) as WalletMode | null)
}

/**
 * Get current chain ID
 */
export function getCurrentChainId(): string | null {
  return chainId || localStorage.getItem(STORAGE_KEYS.CHAIN_ID)
}

/**
 * Get current owner
 */
export function getCurrentOwner(): string | null {
  return localStorage.getItem(STORAGE_KEYS.OWNER)
}

/**
 * Get current wallet instance (may be null if not initialized)
 */
export function getCurrentWallet(): LineraWallet | null {
  return _walletInstance
}

/**
 * Get current client instance (may be null if not initialized)
 */
export function getCurrentClient(): LineraClient | null {
  return clientInstance
}

// Type definitions for Linera responses
export interface ChainNotification {
  reason: {
    NewBlock?: { hash: string; height: number }
    BlockExecuted?: { hash: string }
  }
}

/**
 * Format a Linera address for display
 */
export function formatAddress(address: string, start = 6, end = 4): string {
  if (!address) return ''
  if (address.length <= start + end) return address
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

/**
 * Format a chain ID for display
 */
export function formatChainId(chainId: string, start = 8, end = 6): string {
  return formatAddress(chainId, start, end)
}
