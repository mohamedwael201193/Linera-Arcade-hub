import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useWallet } from '../../contexts/WalletContext'

export function ProfileSetupModal() {
  const { registerProfile, owner } = useWallet()
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (name.length < 3 || name.length > 20) {
      setError('Name must be between 3 and 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setError('Name can only contain letters, numbers, and underscores')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await registerProfile(name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register profile')
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500/30 to-primary-600/30 flex items-center justify-center mx-auto mb-4 border border-primary-500/30">
              <span className="text-3xl">👋</span>
            </div>
            <h3 className="text-2xl font-bold text-text-primary">Welcome to Linera Arcade!</h3>
            <p className="mt-2 text-text-secondary">
              Choose your player name to get started
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Player Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="input"
                maxLength={20}
                autoFocus
              />
              <p className="mt-1 text-xs text-text-muted">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            {/* Wallet info */}
            <div className="p-4 bg-background-dark rounded-xl border border-border">
              <p className="text-xs text-text-muted mb-1">Connected Wallet</p>
              <p className="font-mono text-sm text-text-secondary break-all">
                {owner}
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-error/10 border border-error/30 rounded-lg"
              >
                <p className="text-sm text-error">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading || name.length < 3}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Creating Profile...
                </span>
              ) : (
                'Create Profile & Start Playing'
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="p-4 bg-background-dark border-t border-border">
            <p className="text-xs text-text-muted text-center">
              Your profile will be stored on your Linera microchain
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
