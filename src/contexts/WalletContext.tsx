import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
    connectWallet,
    formatAddress,
    formatChainId,
    getCurrentChainId,
    getCurrentOwner,
    getWalletMode,
    disconnect as lineraDisconnect,
    queryApplication,
    type LineraClient,
    type LineraSigner,
    type LineraWallet,
    type WalletMode
} from '../lib/lineraClient'

// Types
export type WalletState = 'disconnected' | 'connecting' | 'connected' | 'no-profile' | 'ready' | 'error'

export interface PlayerProfile {
  name: string
  createdAt: number
  xp: number
  wins: number
  gamesPlayed: number
}

export interface WalletContextType {
  state: WalletState
  owner: string | null
  chainId: string | null
  profile: PlayerProfile | null
  error: string | null
  client: LineraClient | null
  wallet: LineraWallet | null
  signer: LineraSigner | null
  mode: WalletMode | null
  connect: (mode: WalletMode) => Promise<void>
  disconnect: () => void
  registerProfile: (name: string) => Promise<void>
  refreshProfile: () => Promise<void>
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
  formatAddress: typeof formatAddress
  formatChainId: typeof formatChainId
}

const WalletContext = createContext<WalletContextType | null>(null)

// LocalStorage keys
const PROFILE_STORAGE_KEY = 'linera_arcade_profile'

// Helper to save profile to localStorage
function saveProfileToStorage(profile: PlayerProfile | null, owner: string | null) {
  if (profile && owner) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ profile, owner }))
  } else {
    localStorage.removeItem(PROFILE_STORAGE_KEY)
  }
}

// Helper to load profile from localStorage
// Profile is keyed by chainId since that's how the contract stores profiles
function loadProfileFromStorage(chainId: string): PlayerProfile | null {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      // Only return profile if it matches the current chainId
      if (data.owner === chainId && data.profile) {
        return data.profile
      }
    }
  } catch {
    console.warn('[Wallet] Failed to load profile from storage')
  }
  return null
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: ReactNode
}

// Helper to check profile on chain with timeout
// IMPORTANT: Profile contract stores profiles keyed by chainId, NOT by wallet owner address
async function fetchProfileFromChain(chainId: string, appId: string, timeoutMs = 15000): Promise<PlayerProfile | null> {
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs)
    })
    
    // Use the exact GraphQL format for Linera queries
    // The profile contract uses chainId as the owner key
    const escapedChainId = chainId.replace(/"/g, '\\"')
    const fetchPromise = queryApplication(appId, `
      query {
        profile(owner: "${escapedChainId}") {
          name
          createdAt
          xp
          wins
          gamesPlayed
        }
      }
    `) as Promise<{ data?: { profile?: PlayerProfile } }>
    
    // Race between fetch and timeout
    const result = await Promise.race([fetchPromise, timeoutPromise])
    
    return result?.data?.profile || null
  } catch (error) {
    console.warn('[Wallet] Failed to fetch profile from chain:', error)
    return null
  }
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>('disconnected')
  const [owner, setOwner] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [client, setClient] = useState<LineraClient | null>(null)
  const [wallet, setWallet] = useState<LineraWallet | null>(null)
  const [signer, setSigner] = useState<LineraSigner | null>(null)
  const [mode, setMode] = useState<WalletMode | null>(null)

  // Check for saved session on mount and try to restore
  useEffect(() => {
    const savedMode = getWalletMode()
    const savedChainId = getCurrentChainId()
    const savedOwner = getCurrentOwner()

    if (savedMode && savedOwner && savedChainId) {
      // We have saved credentials, try to restore session
      console.log('[Wallet] Restoring saved session:', { mode: savedMode, chainId: savedChainId })
      setOwner(savedOwner)
      setChainId(savedChainId)
      setMode(savedMode)
      
      // Try to load profile from localStorage first (keyed by chainId)
      const savedProfile = loadProfileFromStorage(savedChainId)
      if (savedProfile) {
        console.log('[Wallet] Restored profile from storage:', savedProfile.name)
        setProfile(savedProfile)
        setState('ready')
      } else {
        setState('connected')
      }
      
      // Auto-reconnect in background
      connectWallet(savedMode).then(provider => {
        setClient(provider.client)
        setWallet(provider.wallet)
        setSigner(provider.signer as LineraSigner)
        setChainId(provider.chainId)
        setOwner(provider.owner)
        setMode(provider.mode)
        
        // If we already have a profile from storage, stay ready
        // Otherwise try to fetch from chain using chainId (not owner address)
        if (!savedProfile) {
          const profileAppId = import.meta.env.VITE_PLAYER_PROFILE_APP_ID
          if (profileAppId && profileAppId !== 'REPLACE_WITH_DEPLOYED_ID') {
            fetchProfileFromChain(provider.chainId, profileAppId, 8000).then(chainProfile => {
              if (chainProfile) {
                setProfile(chainProfile)
                saveProfileToStorage(chainProfile, provider.chainId)
                setState('ready')
              } else {
                setState('no-profile')
              }
            }).catch(() => {
              setState('no-profile')
            })
          } else {
            setState('ready')
          }
        } else {
          setState('ready')
        }
      }).catch(err => {
        console.warn('[Wallet] Failed to restore session:', err)
        // Keep profile if we have it
        if (savedProfile) {
          setState('ready')
        } else {
          setState('disconnected')
        }
      })
    }
  }, [])

  const connect = useCallback(async (walletMode: WalletMode) => {
    setState('connecting')
    setError(null)

    try {
      console.log('[Wallet] Connecting with mode:', walletMode)
      const provider = await connectWallet(walletMode)
      
      setOwner(provider.owner)
      setChainId(provider.chainId)
      setClient(provider.client)
      setWallet(provider.wallet)
      setSigner(provider.signer as LineraSigner)
      setMode(provider.mode)
      
      console.log('[Wallet] Connected:', provider.chainId, 'Owner:', provider.owner)
      console.log('[Wallet] Mode:', provider.mode, '- Signer:', provider.signer ? 'Available' : 'None')
      
      // Check if profile exists (only if PlayerProfile app is configured)
      // Use chainId for profile lookup (contract stores profiles by chainId, not wallet address)
      const profileAppId = import.meta.env.VITE_PLAYER_PROFILE_APP_ID
      if (profileAppId && profileAppId !== 'REPLACE_WITH_DEPLOYED_ID') {
        try {
          const existingProfile = await fetchProfileFromChain(provider.chainId, profileAppId, 8000)
          if (existingProfile) {
            setProfile(existingProfile)
            setState('ready')
          } else {
            setState('no-profile')
          }
        } catch {
          // If profile fetch times out, just show no-profile state
          console.warn('[Wallet] Profile fetch timed out, showing registration')
          setState('no-profile')
        }
      } else {
        // No profile app configured, just mark as ready
        setState('ready')
      }
      
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to connect wallet:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(errorMessage)
      setState('error')
    }
  }, [])

  const disconnect = useCallback(() => {
    // Clear Linera session
    lineraDisconnect()
    
    // Clear profile from storage
    saveProfileToStorage(null, null)
    
    // Clear local state
    setOwner(null)
    setChainId(null)
    setProfile(null)
    setClient(null)
    setWallet(null)
    setSigner(null)
    setMode(null)
    setError(null)
    setState('disconnected')
  }, [])

  const registerProfile = useCallback(async (name: string) => {
    if (!owner || !chainId) {
      throw new Error('Wallet not connected')
    }

    // Check if PlayerProfile app is configured
    const profileAppId = import.meta.env.VITE_PLAYER_PROFILE_APP_ID
    if (!profileAppId || profileAppId === 'REPLACE_WITH_DEPLOYED_ID') {
      throw new Error('PlayerProfile contract not deployed. See README → Contracts & App IDs.')
    }

    try {
      const { mutateApplication } = await import('../lib/lineraClient')
      
      // Use the exact GraphQL format for Linera: mutation { operation(args) }
      // The Operation enum has: Register { name: String }
      const escapedName = name.replace(/"/g, '\\"')
      await mutateApplication(profileAppId, `mutation { register(name: "${escapedName}") }`)
      
      console.log('[Wallet] Profile registered on-chain')
      
      // Create a local profile immediately after successful registration
      // This prevents UI from hanging while waiting for slow validators
      const localProfile: PlayerProfile = {
        name: name.trim(),
        createdAt: Date.now(),
        xp: 0,
        wins: 0,
        gamesPlayed: 0,
      }
      setProfile(localProfile)
      saveProfileToStorage(localProfile, chainId)
      setState('ready')
      
      // Try to fetch the real profile in background (non-blocking)
      // Use chainId for lookup since contract stores profiles by chainId
      const fetchWithTimeout = async () => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
          
          const newProfile = await fetchProfileFromChain(chainId, profileAppId)
          clearTimeout(timeoutId)
          
          if (newProfile) {
            console.log('[Wallet] Profile fetched from chain:', newProfile)
            setProfile(newProfile)
            saveProfileToStorage(newProfile, chainId)
          }
        } catch (fetchError) {
          // Ignore fetch errors - we already have a local profile
          console.warn('[Wallet] Could not fetch profile from chain (using local):', fetchError)
        }
      }
      
      // Run fetch in background, don't await
      fetchWithTimeout()
      
    } catch (error) {
      console.error('[Wallet] Failed to register profile on-chain:', error)
      throw error
    }
  }, [owner, chainId])

  const refreshProfile = useCallback(async () => {
    if (!chainId) return
    
    const profileAppId = import.meta.env.VITE_PLAYER_PROFILE_APP_ID
    if (!profileAppId || profileAppId === 'REPLACE_WITH_DEPLOYED_ID') {
      return
    }
    
    // Use chainId for lookup since contract stores profiles by chainId
    const currentProfile = await fetchProfileFromChain(chainId, profileAppId)
    if (currentProfile) {
      setProfile(currentProfile)
    }
  }, [chainId])

  const openModal = useCallback(() => setIsModalOpen(true), [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  const value: WalletContextType = {
    state,
    owner,
    chainId,
    profile,
    error,
    client,
    wallet,
    signer,
    mode,
    connect,
    disconnect,
    registerProfile,
    refreshProfile,
    isModalOpen,
    openModal,
    closeModal,
    formatAddress,
    formatChainId,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}
