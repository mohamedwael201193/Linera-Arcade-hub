import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ChartIcon,
    CheckIcon,
    CoinsIcon,
    CrownIcon,
    DnaIcon,
    GamepadIcon,
    GavelIcon,
    KeyboardIcon,
    PaletteIcon,
    RefreshIcon,
    RocketIcon,
    SparklesIcon,
    StarIcon,
    TargetIcon,
    TrophyIcon,
    WalletIcon,
    ZapIcon
} from '../components/Icons'
import { useWallet } from '../contexts/WalletContext'
import * as nexus from '../lib/arcadeNexus'
import * as ma from '../lib/memeAuction'
import * as pp from '../lib/predictionPulse'
import * as ta from '../lib/typingArena'
import { formatXp, getRankForXp, getRankProgress, getXpToNextRank } from '../lib/xpConfig'

// Local storage key for balance
const BALANCE_KEY = 'linera_arcade_balance'
const BONUS_CLAIMED_KEY = 'linera_arcade_bonus_claimed'

interface GameStats {
  meme: ma.AuctioneerStats | null
  typing: ta.TypistStats | null
  prediction: pp.PlayerStats | null
}

interface NexusStats {
  seasonStats: nexus.PlayerSeasonStats | null
  activeSeason: nexus.Season | null
}

export function Profile() {
  const { state, profile, owner, chainId, openModal } = useWallet()
  const [stats, setStats] = useState<GameStats>({ meme: null, typing: null, prediction: null })
  const [nexusStats, setNexusStats] = useState<NexusStats>({ seasonStats: null, activeSeason: null })
  const [balance, setBalance] = useState<number>(0)
  const [bonusClaimed, setBonusClaimed] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [claimingBonus, setClaimingBonus] = useState(false)

  // Load balance from localStorage
  useEffect(() => {
    if (chainId) {
      const savedBalance = localStorage.getItem(`${BALANCE_KEY}_${chainId}`)
      const claimed = localStorage.getItem(`${BONUS_CLAIMED_KEY}_${chainId}`)
      if (savedBalance) {
        setBalance(parseFloat(savedBalance))
      }
      if (claimed === 'true') {
        setBonusClaimed(true)
      }
    }
  }, [chainId])

  // Fetch all game stats
  const fetchStats = useCallback(async () => {
    if (!chainId) return
    
    setLoading(true)
    try {
      const [memeStats, typingStats, predictionStats] = await Promise.allSettled([
        ma.getPlayerStats(chainId),
        ta.getPlayerStats(chainId),
        pp.getPlayerStats(chainId),
      ])

      setStats({
        meme: memeStats.status === 'fulfilled' ? memeStats.value : null,
        typing: typingStats.status === 'fulfilled' ? typingStats.value : null,
        prediction: predictionStats.status === 'fulfilled' ? predictionStats.value : null,
      })
      
      // Fetch Arcade Nexus stats if configured
      if (nexus.isArcadeNexusConfigured()) {
        try {
          const activeSeasons = await nexus.getActiveSeasons()
          if (activeSeasons.length > 0) {
            const activeSeason = activeSeasons[0]
            const seasonStats = await nexus.getPlayerSeasonStats(chainId, activeSeason.id)
            setNexusStats({ seasonStats, activeSeason })
          }
        } catch (err) {
          console.log('[Profile] Arcade Nexus not available:', err)
        }
      }
    } catch (error) {
      console.error('[Profile] Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }, [chainId])

  useEffect(() => {
    if (state === 'ready' && chainId) {
      fetchStats()
    }
  }, [state, chainId, fetchStats])

  // Claim welcome bonus
  const claimBonus = () => {
    if (bonusClaimed || !chainId) return
    
    setClaimingBonus(true)
    // Simulate claiming (in reality this would be a blockchain transaction)
    setTimeout(() => {
      const newBalance = balance + 100
      setBalance(newBalance)
      setBonusClaimed(true)
      localStorage.setItem(`${BALANCE_KEY}_${chainId}`, newBalance.toString())
      localStorage.setItem(`${BONUS_CLAIMED_KEY}_${chainId}`, 'true')
      setClaimingBonus(false)
    }, 1500)
  }

  // Calculate aggregated stats
  const totalGamesPlayed = (stats.meme?.totalBids || 0) + 
    (stats.typing?.challengesCompleted || 0) + 
    (stats.prediction?.roundsPlayed || 0)
  
  const totalWins = (stats.meme?.auctionsWon || 0) + 
    (stats.typing?.challengesWon || 0) + 
    (stats.prediction?.roundsWon || 0)
  
  const winRate = totalGamesPlayed > 0 ? Math.round((totalWins / totalGamesPlayed) * 100) : 0

  // Calculate total XP (rough estimate based on activity)
  const totalXP = (profile?.xp || 0) + 
    ((stats.meme?.auctionsCreated || 0) * 50) +
    ((stats.meme?.auctionsWon || 0) * 100) +
    ((stats.meme?.totalBids || 0) * 10) +
    ((stats.typing?.challengesCompleted || 0) * 25) +
    ((stats.typing?.challengesWon || 0) * 100) +
    ((stats.typing?.totalWordsTyped || 0)) +
    ((stats.prediction?.roundsPlayed || 0) * 20) +
    ((stats.prediction?.roundsWon || 0) * 75)

  // Dynamic badges based on real stats
  const badges = [
    { 
      id: 'early-adopter', 
      name: 'Early Adopter', 
      icon: <StarIcon size={28} filled className="text-yellow-400" />,
      unlocked: true,
      description: 'Joined during launch'
    },
    { 
      id: 'first-bid', 
      name: 'First Bid', 
      icon: <GavelIcon size={28} className="text-orange-400" />,
      unlocked: (stats.meme?.totalBids || 0) > 0,
      description: 'Place your first bid'
    },
    { 
      id: 'meme-collector', 
      name: 'Meme Collector', 
      icon: <PaletteIcon size={28} className="text-purple-400" />,
      unlocked: (stats.meme?.memesCollected || 0) >= 1,
      description: 'Win an auction'
    },
    { 
      id: 'speed-demon', 
      name: 'Speed Demon', 
      icon: <ZapIcon size={28} className="text-yellow-400" />,
      unlocked: (stats.typing?.bestWpm || 0) >= 50,
      description: 'Type 50+ WPM'
    },
    { 
      id: 'typing-master', 
      name: 'Typing Master', 
      icon: <KeyboardIcon size={28} className="text-blue-400" />,
      unlocked: (stats.typing?.challengesWon || 0) >= 1,
      description: 'Win a typing challenge'
    },
    { 
      id: 'predictor', 
      name: 'Predictor', 
      icon: <TargetIcon size={28} className="text-green-400" />,
      unlocked: (stats.prediction?.roundsPlayed || 0) >= 1,
      description: 'Make a prediction'
    },
    { 
      id: 'oracle', 
      name: 'Oracle', 
      icon: <SparklesIcon size={28} className="text-purple-400" />,
      unlocked: (stats.prediction?.roundsWon || 0) >= 3,
      description: 'Win 3 predictions'
    },
    { 
      id: 'chain-master', 
      name: 'Chain Master', 
      icon: <DnaIcon size={28} className="text-cyan-400" />,
      unlocked: totalGamesPlayed >= 10,
      description: 'Play 10 games'
    },
  ]

  const unlockedBadges = badges.filter(b => b.unlocked).length

  if (state !== 'ready') {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-12 text-center"
        >
          <div className="flex justify-center mb-6">
            <GamepadIcon size={64} className="text-primary-400" />
          </div>
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
      {/* Welcome Bonus Banner */}
      {!bonusClaimed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 bg-gradient-to-r from-primary-500/20 to-purple-500/20 border-primary-500/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary-500/30">
                <CoinsIcon size={32} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Welcome Bonus!</h3>
                <p className="text-text-secondary">Claim 100 LINERA tokens to start bidding & predicting</p>
              </div>
            </div>
            <button
              onClick={claimBonus}
              disabled={claimingBonus}
              className="btn-primary flex items-center gap-2"
            >
              {claimingBonus ? (
                <>
                  <RefreshIcon size={18} animate className="text-white" />
                  Claiming...
                </>
              ) : (
                <>
                  <SparklesIcon size={18} className="text-white" />
                  Claim 100 LINERA
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Arcade Nexus Season XP Card */}
      {nexusStats.seasonStats && nexusStats.activeSeason && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CrownIcon size={24} className="text-white" />
                <div>
                  <span className="text-white/80 text-sm">Current Season</span>
                  <h3 className="text-white font-bold">{nexusStats.activeSeason.title}</h3>
                </div>
              </div>
              <Link 
                to="/seasons" 
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
              >
                View Details
              </Link>
            </div>
          </div>
          <div className="p-4 bg-surface-secondary">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getRankForXp(nexusStats.seasonStats.totalXp).icon}</span>
                <div>
                  <span className="font-bold text-text-primary">{getRankForXp(nexusStats.seasonStats.totalXp).name}</span>
                  <p className="text-text-muted text-xs">{formatXp(nexusStats.seasonStats.totalXp)} XP</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-text-muted text-xs">Next Rank</span>
                <p className="text-amber-400 text-sm font-medium">{formatXp(getXpToNextRank(nexusStats.seasonStats.totalXp))} XP to go</p>
              </div>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${getRankProgress(nexusStats.seasonStats.totalXp)}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              />
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4 text-center">
              <div>
                <span className="text-lg font-bold text-purple-400">{nexusStats.seasonStats.predictionScore}</span>
                <p className="text-xs text-text-muted">Prediction</p>
              </div>
              <div>
                <span className="text-lg font-bold text-pink-400">{nexusStats.seasonStats.memeScore}</span>
                <p className="text-xs text-text-muted">Meme</p>
              </div>
              <div>
                <span className="text-lg font-bold text-green-400">{nexusStats.seasonStats.typingScore}</span>
                <p className="text-xs text-text-muted">Typing</p>
              </div>
              <div>
                <span className="text-lg font-bold text-blue-400">{nexusStats.seasonStats.lifeScore}</span>
                <p className="text-xs text-text-muted">Life</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-text-primary">
                {profile?.name}
              </h1>
              <div className="px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30">
                <span className="text-xs font-medium text-primary-400">Level {Math.floor(totalXP / 500) + 1}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Connected to Conway
              </span>
              <span>Joined {new Date(profile?.createdAt || Date.now()).toLocaleDateString()}</span>
            </div>

            {/* Balance Display */}
            <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WalletIcon size={24} className="text-yellow-400" />
                  <div>
                    <span className="text-sm text-text-muted">Available Balance</span>
                    <div className="text-2xl font-bold text-gradient">{balance.toFixed(2)} LINERA</div>
                  </div>
                </div>
                {bonusClaimed && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckIcon size={16} />
                    <span>Bonus Claimed</span>
                  </div>
                )}
              </div>
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

      {/* Overall Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total XP', value: totalXP, icon: <StarIcon size={28} className="text-yellow-400" filled /> },
          { label: 'Games Played', value: totalGamesPlayed, icon: <GamepadIcon size={28} className="text-blue-400" /> },
          { label: 'Total Wins', value: totalWins, icon: <TrophyIcon size={28} className="text-orange-400" /> },
          { label: 'Win Rate', value: winRate, suffix: '%', icon: <ChartIcon size={28} className="text-green-400" /> },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card card-hover p-6 text-center"
          >
            <div className="flex justify-center mb-2">{stat.icon}</div>
            <span className="text-3xl font-bold text-gradient">
              {loading ? '...' : stat.value}{!loading && stat.suffix}
            </span>
            <span className="text-sm text-text-muted block mt-1">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Game-Specific Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meme Auction Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <GavelIcon size={24} className="text-orange-400" />
            </div>
            <h3 className="font-bold text-text-primary">Meme Auction</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Auctions Created</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.meme?.auctionsCreated || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Auctions Won</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.meme?.auctionsWon || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total Bids</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.meme?.totalBids || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Memes Collected</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.meme?.memesCollected || 0}</span>
            </div>
          </div>
          <Link to="/games/meme-auction" className="mt-4 block text-center text-primary-400 text-sm hover:underline">
            Play Meme Auction →
          </Link>
        </motion.div>

        {/* Typing Arena Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <KeyboardIcon size={24} className="text-blue-400" />
            </div>
            <h3 className="font-bold text-text-primary">Typing Arena</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Challenges Done</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.typing?.challengesCompleted || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Challenges Won</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.typing?.challengesWon || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Best WPM</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.typing?.bestWpm || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Avg Accuracy</span>
              <span className="text-text-primary font-medium">{loading ? '...' : (stats.typing?.averageAccuracy || 0)}%</span>
            </div>
          </div>
          <Link to="/games/typing-arena" className="mt-4 block text-center text-primary-400 text-sm hover:underline">
            Play Typing Arena →
          </Link>
        </motion.div>

        {/* Prediction Pulse Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TargetIcon size={24} className="text-green-400" />
            </div>
            <h3 className="font-bold text-text-primary">Prediction Pulse</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Rounds Played</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.prediction?.roundsPlayed || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Rounds Won</span>
              <span className="text-text-primary font-medium">{loading ? '...' : stats.prediction?.roundsWon || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total Wagered</span>
              <span className="text-text-primary font-medium">{loading ? '...' : pp.formatAmount(stats.prediction?.totalWagered || '0')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total Won</span>
              <span className="text-text-primary font-medium">{loading ? '...' : pp.formatAmount(stats.prediction?.totalWon || '0')}</span>
            </div>
          </div>
          <Link to="/games/prediction-pulse" className="mt-4 block text-center text-primary-400 text-sm hover:underline">
            Play Prediction Pulse →
          </Link>
        </motion.div>
      </div>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary">Badges & Achievements</h2>
          <span className="text-sm text-text-muted">{unlockedBadges}/{badges.length} Unlocked</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <motion.div
              key={badge.id}
              whileHover={{ scale: badge.unlocked ? 1.05 : 1 }}
              className={`text-center p-4 rounded-xl border transition-all ${
                badge.unlocked
                  ? 'bg-primary-500/10 border-primary-500/30'
                  : 'bg-background-dark border-border opacity-50 grayscale'
              }`}
            >
              <div className="flex justify-center mb-2">{badge.icon}</div>
              <span className="text-sm font-medium text-text-primary block">{badge.name}</span>
              <span className="text-xs text-text-muted block mt-1">
                {badge.unlocked ? 'Unlocked!' : badge.description}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card p-6"
      >
        <h2 className="text-xl font-bold text-text-primary mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/games/meme-auction"
            className="flex items-center gap-4 p-4 bg-background-dark rounded-xl border border-border hover:border-primary-500/50 transition-all group"
          >
            <div className="p-3 rounded-lg bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
              <GavelIcon size={24} className="text-orange-400" />
            </div>
            <div>
              <p className="font-medium text-text-primary">Bid on Memes</p>
              <p className="text-sm text-text-muted">Join live auctions</p>
            </div>
          </Link>
          <Link
            to="/games/typing-arena"
            className="flex items-center gap-4 p-4 bg-background-dark rounded-xl border border-border hover:border-primary-500/50 transition-all group"
          >
            <div className="p-3 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
              <KeyboardIcon size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-text-primary">Type & Compete</p>
              <p className="text-sm text-text-muted">Test your speed</p>
            </div>
          </Link>
          <Link
            to="/games/prediction-pulse"
            className="flex items-center gap-4 p-4 bg-background-dark rounded-xl border border-border hover:border-primary-500/50 transition-all group"
          >
            <div className="p-3 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
              <RocketIcon size={24} className="text-green-400" />
            </div>
            <div>
              <p className="font-medium text-text-primary">Make Predictions</p>
              <p className="text-sm text-text-muted">Predict & win</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshIcon size={18} animate={loading} />
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>
    </div>
  )
}
