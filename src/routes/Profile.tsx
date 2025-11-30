import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'

const badges = [
  { id: 'first-game', name: 'First Game', icon: '🎮', unlocked: true },
  { id: 'life-master', name: 'Life Master', icon: '🧬', unlocked: false },
  { id: 'predictor', name: 'Predictor', icon: '🔮', unlocked: false },
  { id: 'streak-5', name: '5 Win Streak', icon: '🔥', unlocked: false },
  { id: 'early-adopter', name: 'Early Adopter', icon: '⭐', unlocked: true },
  { id: 'chain-master', name: 'Chain Master', icon: '⛓️', unlocked: false },
]

export function Profile() {
  const { state, profile, owner, chainId, openModal } = useWallet()

  if (state !== 'ready') {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-12 text-center"
        >
          <span className="text-6xl mb-6 block">🎮</span>
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            Connect to View Your Profile
          </h2>
          <p className="text-text-secondary mb-6">
            Connect your wallet to see your player profile, stats, and achievements.
          </p>
          <button onClick={openModal} className="btn-primary">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8"
      >
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500/30 to-primary-600/30 flex items-center justify-center border border-primary-500/30">
            <span className="text-5xl font-bold text-gradient">
              {profile?.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {profile?.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Connected to Conway
              </span>
              <span>Joined {new Date(profile?.createdAt || Date.now()).toLocaleDateString()}</span>
            </div>

            {/* Wallet & Chain */}
            <div className="mt-4 p-4 bg-background-dark rounded-xl space-y-2 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Owner Address</span>
                <code className="text-xs bg-background px-2 py-1 rounded font-mono text-primary-400 border border-border">
                  {owner?.slice(0, 10)}...{owner?.slice(-8)}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Chain ID</span>
                <code className="text-xs bg-background px-2 py-1 rounded font-mono text-primary-400 border border-border">
                  {chainId?.slice(0, 10)}...{chainId?.slice(-8)}
                </code>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total XP', value: profile?.xp || 0, icon: '⭐' },
          { label: 'Games Played', value: profile?.gamesPlayed || 0, icon: '🎮' },
          { label: 'Total Wins', value: profile?.wins || 0, icon: '🏆' },
          { label: 'Win Rate', value: profile?.gamesPlayed ? Math.round((profile.wins / profile.gamesPlayed) * 100) : 0, suffix: '%', icon: '📊' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card card-hover p-6 text-center"
          >
            <span className="text-3xl mb-2 block">{stat.icon}</span>
            <span className="text-3xl font-bold text-gradient">
              {stat.value}{stat.suffix || ''}
            </span>
            <span className="text-sm text-text-muted block mt-1">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <h2 className="text-xl font-bold text-text-primary mb-6">Badges & Achievements</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`text-center p-4 rounded-xl border transition-all ${
                badge.unlocked
                  ? 'bg-primary-500/10 border-primary-500/30'
                  : 'bg-background-dark border-border opacity-50'
              }`}
            >
              <span className="text-3xl block mb-2">{badge.icon}</span>
              <span className="text-xs font-medium text-text-primary">{badge.name}</span>
              {!badge.unlocked && (
                <span className="text-xs text-text-muted block mt-1">Locked</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h2 className="text-xl font-bold text-text-primary mb-6">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-background-dark rounded-xl border border-border">
            <span className="text-2xl">🎮</span>
            <div className="flex-1">
              <p className="font-medium text-text-primary">Joined Linera Arcade Hub</p>
              <p className="text-sm text-text-muted">Created player profile</p>
            </div>
            <span className="text-xs text-text-muted">Just now</span>
          </div>
          <div className="text-center py-4 text-text-muted">
            <p>Play more games to see your activity!</p>
            <Link to="/games" className="text-primary-400 font-medium hover:underline">
              Browse Games →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
