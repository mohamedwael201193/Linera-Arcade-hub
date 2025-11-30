import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { WalletStatus } from '../Wallet/WalletStatus'

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/games': 'Games Hub',
  '/games/gol': 'Game of Life',
  '/games/prediction-pulse': 'Prediction Pulse',
  '/profile': 'Profile',
}

export function TopBar() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Linera Arcade Hub'

  return (
    <header className="sticky top-0 z-40 h-16 bg-background-dark/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
      {/* Page title */}
      <motion.h2
        key={location.pathname}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-semibold text-text-primary"
      >
        {title}
      </motion.h2>

      {/* Right side - Wallet */}
      <WalletStatus />
    </header>
  )
}
