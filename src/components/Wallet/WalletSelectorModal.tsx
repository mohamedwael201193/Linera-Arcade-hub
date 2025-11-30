import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useWallet } from '../../contexts/WalletContext'
import { isMetaMaskAvailable } from '../../lib/metamaskSigner'

interface WalletSelectorModalProps {
  onClose: () => void
}

export function WalletSelectorModal({ onClose }: WalletSelectorModalProps) {
  const { connect, error, state } = useWallet()
  const [connectingMode, setConnectingMode] = useState<'faucet' | 'metamask' | null>(null)
  
  const isConnecting = state === 'connecting'
  const hasMetaMask = isMetaMaskAvailable()

  const handleFaucetConnect = async () => {
    setConnectingMode('faucet')
    try {
      await connect('faucet')
    } finally {
      setConnectingMode(null)
    }
  }

  const handleMetaMaskConnect = async () => {
    if (!hasMetaMask) {
      window.open('https://metamask.io/download/', '_blank')
      return
    }
    setConnectingMode('metamask')
    try {
      await connect('metamask')
    } finally {
      setConnectingMode(null)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-text-primary">Connect Wallet</h3>
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-card-hover rounded-lg transition-colors"
                disabled={isConnecting}
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Connect to Linera Conway Testnet to start playing
            </p>
          </div>

          {/* Wallet options */}
          <div className="p-6 space-y-3">
            {/* Conway Dev Wallet (Faucet) */}
            <motion.button
              whileHover={{ scale: isConnecting ? 1 : 1.01 }}
              whileTap={{ scale: isConnecting ? 1 : 0.99 }}
              onClick={handleFaucetConnect}
              disabled={isConnecting}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary-500/50 hover:bg-primary-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/30 to-primary-600/30 flex items-center justify-center border border-primary-500/30">
                {connectingMode === 'faucet' ? (
                  <LoadingSpinner />
                ) : (
                  <span className="text-2xl">🔗</span>
                )}
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-text-primary">Conway Dev Wallet</h4>
                <p className="text-sm text-text-secondary">Get a new wallet from Conway faucet</p>
              </div>
              <ArrowIcon className="w-5 h-5 text-text-muted" />
            </motion.button>

            {/* MetaMask option */}
            <motion.button
              whileHover={{ scale: isConnecting ? 1 : 1.01 }}
              whileTap={{ scale: isConnecting ? 1 : 0.99 }}
              onClick={handleMetaMaskConnect}
              disabled={isConnecting}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-warning/50 hover:bg-warning/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center border border-warning/30">
                {connectingMode === 'metamask' ? (
                  <LoadingSpinner />
                ) : (
                  <span className="text-2xl">🦊</span>
                )}
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-text-primary">MetaMask</h4>
                <p className="text-sm text-text-secondary">
                  {hasMetaMask ? 'Sign with your MetaMask wallet' : 'Click to install MetaMask'}
                </p>
              </div>
              {!hasMetaMask && (
                <span className="badge badge-warning text-xs">Install</span>
              )}
              <ArrowIcon className="w-5 h-5 text-text-muted" />
            </motion.button>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-error/10 border border-error/30 rounded-xl"
              >
                <p className="text-sm text-error">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-background-dark border-t border-border">
            <p className="text-xs text-text-muted text-center">
              By connecting, you agree to use this app for testing purposes only.
              <br />
              Built on <span className="text-primary-400">Linera Conway Testnet</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="w-6 h-6 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
