/**
 * MetaMask Signer for Linera
 * 
 * This module provides MetaMask integration for signing Linera transactions.
 * Implements the Signer interface from @linera/client using window.ethereum + personal_sign.
 * 
 * Based on the official example at:
 * https://github.com/linera-io/linera-protocol/tree/testnet_conway/examples/counter/metamask
 * https://github.com/linera-io/linera-protocol/blob/testnet_conway/web/@linera/metamask/src/signer.ts
 * 
 * Requirements:
 * - MetaMask browser extension must be installed
 * - User must approve connection and signing requests
 * 
 * References:
 * - https://linera.dev/developers/frontend/wallets.html
 * - https://www.dynamic.xyz/docs/guides/chains/linera (DynamicSigner example)
 */

import type { Signer } from '@linera/client';

// Internal ethereum provider type
interface EthereumProvider {
  isMetaMask?: boolean
  providers?: Array<{ isMetaMask?: boolean; request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> }>
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, callback: (...args: unknown[]) => void) => void
  removeAllListeners?: () => void
}

/**
 * Convert Uint8Array to 0x-prefixed hex string
 */
function bytesToHex(bytes: Uint8Array): `0x${string}` {
  let out = '0x'
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out as `0x${string}`
}

// Check if MetaMask is available
function getMetaMaskProvider(): EthereumProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ethereum = (window as any).ethereum as EthereumProvider | undefined
  
  if (typeof window === 'undefined' || !ethereum) {
    throw new MetaMaskNotInstalledError()
  }
  
  // Handle multiple wallet providers
  if (ethereum.providers?.length) {
    const metamask = ethereum.providers.find((p: { isMetaMask?: boolean }) => p.isMetaMask)
    if (metamask && 'request' in metamask) return metamask as unknown as EthereumProvider
  }
  
  if (!ethereum.isMetaMask) {
    throw new MetaMaskNotInstalledError()
  }
  
  return ethereum
}

/**
 * Error thrown when MetaMask is not installed
 */
export class MetaMaskNotInstalledError extends Error {
  constructor() {
    super('MetaMask is not installed. Please install MetaMask to use this feature.')
    this.name = 'MetaMaskNotInstalledError'
  }
  
  static downloadUrl = 'https://metamask.io/download/'
}

/**
 * Error thrown when user rejects MetaMask request
 */
export class MetaMaskUserRejectedError extends Error {
  code = 4001
  constructor() {
    super('User rejected the MetaMask request.')
    this.name = 'MetaMaskUserRejectedError'
  }
}

/**
 * MetaMask Signer implementation for Linera
 * 
 * This signer implements the Signer interface from @linera/client using 
 * MetaMask's personal_sign method to sign messages for Linera transactions.
 * 
 * Every time the Linera client needs to sign a block or operation, it will 
 * call sign(), which triggers a MetaMask popup for user approval.
 */
export class MetaMaskSigner implements Signer {
  private _address: string | null = null
  private _provider: EthereumProvider
  
  constructor() {
    this._provider = getMetaMaskProvider()
  }
  
  /**
   * Initialize the signer by requesting account access from MetaMask
   */
  async initialize(): Promise<void> {
    try {
      // Request account access
      const accounts = await this._provider.request({
        method: 'eth_requestAccounts',
      }) as string[]
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask')
      }
      
      this._address = accounts[0]
      console.log('[MetaMask] Connected:', this._address)
    } catch (error: unknown) {
      if ((error as { code?: number })?.code === 4001) {
        throw new MetaMaskUserRejectedError()
      }
      throw error
    }
  }
  
  /**
   * Get the connected wallet address
   * Required by Linera's Signer interface
   */
  async address(): Promise<string> {
    if (!this._address) {
      await this.initialize()
    }
    return this._address!
  }
  
  /**
   * Sign a message using MetaMask's personal_sign (EIP-191)
   * 
   * This is called by the Linera client whenever a block or operation 
   * needs to be signed. This triggers a MetaMask popup for user approval.
   * 
   * @param owner - The EVM address whose private key will be used to sign
   * @param value - The data to be signed, as a Uint8Array (pre-hashed by Linera)
   * @returns The EIP-191 signature in hexadecimal string format WITH 0x prefix
   */
  async sign(owner: string, value: Uint8Array): Promise<string> {
    if (!this._provider) {
      throw new Error('MetaMask is not available')
    }
    
    // Get connected accounts
    const accounts = await this._provider.request({
      method: 'eth_requestAccounts',
    }) as string[]
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No MetaMask accounts connected')
    }
    
    // Verify owner matches connected account
    const connected = accounts.find(
      (acc) => acc.toLowerCase() === owner.toLowerCase()
    )
    if (!connected) {
      throw new Error(
        `MetaMask is not connected with the requested owner: ${owner}. ` +
        `Connected accounts: ${accounts.join(', ')}`
      )
    }
    
    // Convert bytes to hex string for signing
    // IMPORTANT: Use personal_sign directly (not signMessage) to avoid double-hashing
    const msgHex = bytesToHex(value)
    
    console.log('[MetaMask] Requesting signature for owner:', owner)
    
    try {
      const signature = await this._provider.request({
        method: 'personal_sign',
        params: [msgHex, owner],
      }) as string
      
      if (!signature) {
        throw new Error('No signature returned from MetaMask')
      }
      
      console.log('[MetaMask] Signature obtained successfully')
      
      // Return signature WITH 0x prefix - this matches official @linera/metamask
      return signature
    } catch (error: unknown) {
      if ((error as { code?: number })?.code === 4001) {
        throw new MetaMaskUserRejectedError()
      }
      console.error('[MetaMask] Signing failed:', error)
      throw new Error(
        `MetaMask signature request failed: ${(error as Error)?.message || error}`
      )
    }
  }
  
  /**
   * Check if we have a key for the given owner
   * For MetaMask, we only have the connected account(s)
   */
  async containsKey(owner: string): Promise<boolean> {
    try {
      const accounts = await this._provider.request({
        method: 'eth_requestAccounts',
      }) as string[]
      
      return accounts.some(
        (acc: string) => acc.toLowerCase() === owner.toLowerCase()
      )
    } catch {
      return false
    }
  }
  
  /**
   * Listen for account changes
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    this._provider.on?.('accountsChanged', callback as (args: unknown) => void)
  }
  
  /**
   * Listen for chain changes
   */
  onChainChanged(callback: (chainId: string) => void): void {
    this._provider.on?.('chainChanged', callback as (args: unknown) => void)
  }
  
  /**
   * Remove event listeners
   */
  removeListeners(): void {
    this._provider.removeAllListeners?.()
  }
}

/**
 * Create and initialize a MetaMask signer
 * This is the main entry point for MetaMask integration
 */
export async function createMetaMaskSigner(): Promise<MetaMaskSigner> {
  const signer = new MetaMaskSigner()
  await signer.initialize()
  return signer
}

/**
 * Check if MetaMask is available without throwing
 */
export function isMetaMaskAvailable(): boolean {
  try {
    getMetaMaskProvider()
    return true
  } catch {
    return false
  }
}
