import { motion } from 'framer-motion'
import { useWallet } from '../../contexts/WalletContext'

export function WalletStatus() {
  const { state, owner, profile, mode, openModal, disconnect, error } = useWallet()

  if (state === 'disconnected' || state === 'error') {
    return (
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-error hidden sm:block">Connection failed</span>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openModal}
          className="btn-primary flex items-center gap-2"
        >
          <WalletIcon className="w-4 h-4" />
          Connect Wallet
        </motion.button>
      </div>
    )
  }

  if (state === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"
        />
        <span className="text-primary-400 font-medium">Connecting...</span>
      </div>
    )
  }

  // Connected states
  const modeLabel = mode === 'metamask' ? 'MetaMask' : 'Conway Dev'
  const modeIcon = mode === 'metamask' ? '🦊' : '🔗'

  return (
    <div className="flex items-center gap-3">
      {/* Profile info */}
      <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-lg border border-border">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/30 to-primary-600/30 flex items-center justify-center border border-primary-500/30">
          <span className="text-primary-400 font-bold text-sm">
            {profile?.name?.[0]?.toUpperCase() || modeIcon}
          </span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {profile?.name || 'Set up profile'}
            </span>
            {/* Wallet mode badge */}
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              mode === 'metamask' 
                ? 'bg-warning/20 text-warning' 
                : 'bg-primary-500/20 text-primary-400'
            }`}>
              {modeLabel}
            </span>
          </div>
          <span className="text-xs text-text-muted font-mono">
            {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : ''}
          </span>
        </div>
      </div>

      {/* Disconnect button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={disconnect}
        className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
        title="Disconnect"
      >
        <LogoutIcon className="w-5 h-5" />
      </motion.button>
    </div>
  )
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
}
