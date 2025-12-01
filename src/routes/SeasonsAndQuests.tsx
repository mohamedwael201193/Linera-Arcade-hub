import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import {
    ChartIcon,
    CheckIcon,
    CrownIcon,
    DnaIcon,
    FireIcon,
    GavelIcon,
    KeyboardIcon,
    RefreshIcon,
    SparklesIcon,
    StarIcon,
    TargetIcon,
    TrophyIcon,
    ZapIcon,
} from '../components/Icons'
import { useWallet } from '../contexts/WalletContext'
import * as nexus from '../lib/arcadeNexus'
import {
    CATEGORY_COLORS,
    formatXp,
    formatXpCompact,
    getLevelForXp,
    getLevelProgress,
    getRankForXp,
    getRankProgress,
    getXpToNextRank,
    RANKS,
} from '../lib/xpConfig'

type TabType = 'overview' | 'leaderboard' | 'quests'

export function SeasonsAndQuests() {
  const { state, chainId } = useWallet()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState<nexus.Season[]>([])
  const [activeSeason, setActiveSeason] = useState<nexus.Season | null>(null)
  const [playerStats, setPlayerStats] = useState<nexus.PlayerSeasonStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<nexus.PlayerSeasonStats[]>([])
  const [quests, setQuests] = useState<nexus.Quest[]>([])
  const [questProgress, setQuestProgress] = useState<nexus.QuestProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [creatingFirstSeason, setCreatingFirstSeason] = useState(false)

  // Check if Arcade Nexus is configured
  useEffect(() => {
    setIsConfigured(nexus.isArcadeNexusConfigured())
  }, [])

  // Fetch seasons
  const fetchSeasons = useCallback(async () => {
    if (!isConfigured) return
    
    try {
      const allSeasons = await nexus.getSeasons()
      setSeasons(allSeasons)
      
      // Find active season
      const active = allSeasons.find(s => nexus.isSeasonActive(s))
      setActiveSeason(active || allSeasons[0] || null)
    } catch (err) {
      console.error('[SeasonsAndQuests] Failed to fetch seasons:', err)
      setError('Failed to load seasons')
    }
  }, [isConfigured])

  // Fetch player data for active season
  const fetchPlayerData = useCallback(async () => {
    if (!isConfigured || !chainId || !activeSeason) return
    
    try {
      const [stats, board, questList, progress] = await Promise.all([
        nexus.getPlayerSeasonStats(chainId, activeSeason.id),
        nexus.getLeaderboard(activeSeason.id, 50),
        nexus.getQuests(activeSeason.id),
        nexus.getPlayerQuests(chainId, activeSeason.id),
      ])
      
      setPlayerStats(stats)
      setLeaderboard(board)
      setQuests(questList)
      setQuestProgress(progress)
    } catch (err) {
      console.error('[SeasonsAndQuests] Failed to fetch player data:', err)
    }
  }, [isConfigured, chainId, activeSeason])

  // Create the first season
  const handleCreateFirstSeason = async () => {
    if (creatingFirstSeason) return
    setCreatingFirstSeason(true)
    setError(null)
    
    try {
      const now = Math.floor(Date.now() / 1000)
      const endTime = now + (30 * 24 * 60 * 60) // 30 days from now
      
      await nexus.createSeason(
        'Season 1 - Genesis',
        now,
        endTime,
        'The first competitive season of Linera Arcade Hub! Earn XP, complete quests, and climb the leaderboard.',
        'Launch Season'
      )
      
      // Refresh the seasons list
      await fetchSeasons()
    } catch (err) {
      console.error('[SeasonsAndQuests] Failed to create season:', err)
      setError('Failed to create season. Please try again.')
    } finally {
      setCreatingFirstSeason(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (state === 'ready' && isConfigured) {
      setLoading(true)
      fetchSeasons().finally(() => setLoading(false))
    }
  }, [state, isConfigured, fetchSeasons])

  // Load player data when active season changes
  useEffect(() => {
    if (activeSeason && chainId) {
      fetchPlayerData()
    }
  }, [activeSeason, chainId, fetchPlayerData])

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <SparklesIcon className="text-amber-400 mx-auto mb-4" size={64} />
          </motion.div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Arcade Nexus Coming Soon!</h2>
          <p className="text-text-secondary mb-6">
            The cross-game reputation system is being deployed. Check back soon!
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 flex flex-col items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshIcon className="text-primary-400" size={32} />
          </motion.div>
          <p className="text-text-secondary mt-4">Loading Arcade Nexus...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center border-error">
          <p className="text-error mb-4">{error}</p>
          <button onClick={() => { setError(null); fetchSeasons() }} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // No seasons exist yet - show create first season button
  if (seasons.length === 0 && !activeSeason) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <TrophyIcon size={16} />
              <span>Active Season</span>
            </div>
            <h1 className="text-2xl font-bold text-white">No Active Season</h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <SparklesIcon className="text-amber-400 mx-auto mb-4" size={64} />
          </motion.div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Welcome to Arcade Nexus!
          </h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Start the first competitive season to begin tracking XP, climbing the leaderboard, 
            and competing for glory across all games.
          </p>
          <button
            onClick={handleCreateFirstSeason}
            disabled={creatingFirstSeason}
            className="btn btn-primary text-lg px-8 py-3"
          >
            {creatingFirstSeason ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block mr-2"
                >
                  <RefreshIcon size={20} />
                </motion.span>
                Creating Season...
              </>
            ) : (
              <>
                <FireIcon size={20} className="mr-2" />
                Launch Season 1
              </>
            )}
          </button>
          <p className="text-text-muted text-sm mt-4">
            Season will run for 30 days with XP rewards for all games
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Season Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                <TrophyIcon size={16} />
                <span>Active Season</span>
              </div>
              <h1 className="text-2xl font-bold text-white">
                {activeSeason?.title || 'No Active Season'}
              </h1>
              {activeSeason && (
                <p className="text-white/70 text-sm mt-1">
                  {nexus.formatSeasonDate(activeSeason.startTime)} - {nexus.formatSeasonDate(activeSeason.endTime)}
                  <span className="ml-3 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {nexus.getSeasonTimeRemaining(activeSeason)}
                  </span>
                </p>
              )}
            </div>
            {activeSeason?.theme && (
              <div className="text-right">
                <span className="text-white/60 text-xs uppercase tracking-wider">Theme</span>
                <p className="text-white font-medium">{activeSeason.theme}</p>
              </div>
            )}
          </div>
        </div>

        {/* Player Stats Summary */}
        {playerStats && (
          <div className="p-6 bg-surface-secondary">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total XP"
                value={formatXp(playerStats.totalXp)}
                icon={<ZapIcon className="text-amber-400" />}
              />
              <StatCard
                label="Rank"
                value={getRankForXp(playerStats.totalXp).name}
                icon={<span>{getRankForXp(playerStats.totalXp).icon}</span>}
              />
              <StatCard
                label="Level"
                value={getLevelForXp(playerStats.totalXp).toString()}
                icon={<StarIcon className="text-purple-400" />}
              />
              <StatCard
                label="Quests Done"
                value={(playerStats.completedQuests || 0).toString()}
                icon={<TargetIcon className="text-green-400" />}
              />
            </div>

            {/* XP Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">
                  Progress to {getRankForXp(playerStats.totalXp + getXpToNextRank(playerStats.totalXp)).name}
                </span>
                <span className="text-text-muted">
                  {formatXpCompact(getXpToNextRank(playerStats.totalXp))} XP needed
                </span>
              </div>
              <div className="h-3 bg-surface rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getRankProgress(playerStats.totalXp)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(['overview', 'leaderboard', 'quests'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary-500/20 text-primary-400 border-b-2 border-primary-400'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'leaderboard' && 'Leaderboard'}
            {tab === 'quests' && 'Quests'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <OverviewTab
            stats={playerStats}
            season={activeSeason}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardTab
            leaderboard={leaderboard}
            currentPlayer={chainId || ''}
          />
        )}
        {activeTab === 'quests' && (
          <QuestsTab
            quests={quests}
            progress={questProgress}
            onCompleteQuest={async (questId) => {
              try {
                await nexus.completeQuest(questId)
                await fetchPlayerData()
              } catch (err) {
                console.error('Failed to complete quest:', err)
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Season Selector */}
      {seasons.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-4"
        >
          <h3 className="text-sm font-medium text-text-secondary mb-3">Past Seasons</h3>
          <div className="flex gap-2 flex-wrap">
            {seasons.map(season => (
              <button
                key={season.id}
                onClick={() => setActiveSeason(season)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activeSeason?.id === season.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-secondary text-text-secondary hover:bg-surface'
                }`}
              >
                {season.title}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ==================== Sub-components ====================

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-lg p-4 flex items-center gap-3">
      <div className="p-2 bg-surface-secondary rounded-lg">{icon}</div>
      <div>
        <p className="text-text-muted text-xs uppercase tracking-wider">{label}</p>
        <p className="text-text-primary font-bold text-lg">{value}</p>
      </div>
    </div>
  )
}

function OverviewTab({ stats, season }: { stats: nexus.PlayerSeasonStats | null; season: nexus.Season | null }) {
  if (!stats || !season) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="card p-8 text-center"
      >
        <p className="text-text-secondary">No stats available yet. Start playing to earn XP!</p>
      </motion.div>
    )
  }

  const categoryScores = [
    { name: 'Predictions', score: stats.predictionScore, colors: CATEGORY_COLORS.prediction, icon: <ChartIcon /> },
    { name: 'Meme Auctions', score: stats.memeScore, colors: CATEGORY_COLORS.meme, icon: <GavelIcon /> },
    { name: 'Typing Arena', score: stats.typingScore, colors: CATEGORY_COLORS.typing, icon: <KeyboardIcon /> },
    { name: 'Game of Life', score: stats.lifeScore, colors: CATEGORY_COLORS.life, icon: <DnaIcon /> },
  ]

  const maxScore = Math.max(...categoryScores.map(c => c.score), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid md:grid-cols-2 gap-6"
    >
      {/* Category Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <TargetIcon className="text-primary-400" size={20} />
          Category Breakdown
        </h3>
        <div className="space-y-4">
          {categoryScores.map((cat, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className={`flex items-center gap-2 ${cat.colors.text}`}>
                  {cat.icon}
                  {cat.name}
                </span>
                <span className="text-text-primary font-medium">{formatXp(cat.score)} XP</span>
              </div>
              <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(cat.score / maxScore) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className={`h-full bg-gradient-to-r ${cat.colors.primary} rounded-full`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rank Progress */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <CrownIcon className="text-amber-400" size={20} />
          Rank Progress
        </h3>
        <div className="space-y-3">
          {RANKS.map((rank) => {
            const isCurrentRank = getRankForXp(stats.totalXp).name === rank.name
            const isPastRank = stats.totalXp > rank.maxXp
            
            return (
              <div
                key={rank.name}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isCurrentRank ? 'bg-surface-secondary border border-primary-500/30' : ''
                }`}
              >
                <span className="text-xl">{rank.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={isCurrentRank ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                      {rank.name}
                    </span>
                    <span className="text-text-muted text-sm">
                      {formatXpCompact(rank.minXp)} XP
                    </span>
                  </div>
                </div>
                {isPastRank && <CheckIcon className="text-success" size={16} />}
                {isCurrentRank && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <FireIcon className="text-amber-400" size={16} />
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Level Info */}
      <div className="card p-6 md:col-span-2">
        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <StarIcon className="text-purple-400" size={20} />
          Level {getLevelForXp(stats.totalXp)}
        </h3>
        <div className="h-4 bg-surface-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${getLevelProgress(stats.totalXp)}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
          />
        </div>
        <p className="text-text-muted text-sm mt-2">
          {getLevelProgress(stats.totalXp)}% to Level {getLevelForXp(stats.totalXp) + 1}
        </p>
      </div>
    </motion.div>
  )
}

function LeaderboardTab({ leaderboard, currentPlayer }: { leaderboard: nexus.PlayerSeasonStats[]; currentPlayer: string }) {
  if (leaderboard.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="card p-8 text-center"
      >
        <TrophyIcon className="text-text-muted mx-auto mb-4" size={48} />
        <p className="text-text-secondary">No players on the leaderboard yet. Be the first!</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="card overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-secondary">
              <th className="text-left p-4 text-text-secondary font-medium text-sm">Rank</th>
              <th className="text-left p-4 text-text-secondary font-medium text-sm">Player</th>
              <th className="text-right p-4 text-text-secondary font-medium text-sm">Total XP</th>
              <th className="text-right p-4 text-text-secondary font-medium text-sm hidden md:table-cell">Quests</th>
              <th className="text-right p-4 text-text-secondary font-medium text-sm hidden lg:table-cell">Tier</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => {
              const isCurrentUser = player.owner === currentPlayer
              const rank = getRankForXp(player.totalXp)
              
              return (
                <motion.tr
                  key={player.owner}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-b border-border ${
                    isCurrentUser ? 'bg-primary-500/10' : 'hover:bg-surface-secondary'
                  }`}
                >
                  <td className="p-4">
                    {index < 3 ? (
                      <span className="text-2xl">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                      </span>
                    ) : (
                      <span className="text-text-muted font-mono">#{index + 1}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rank.icon}</span>
                      <span className={`font-mono text-sm ${isCurrentUser ? 'text-primary-400 font-medium' : 'text-text-primary'}`}>
                        {player.owner.slice(0, 8)}...{player.owner.slice(-4)}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-amber-400 font-bold">{formatXp(player.totalXp)}</span>
                  </td>
                  <td className="p-4 text-right hidden md:table-cell">
                    <span className="text-text-secondary">{player.completedQuests || 0}</span>
                  </td>
                  <td className="p-4 text-right hidden lg:table-cell">
                    <span className="text-text-secondary">{getRankForXp(player.totalXp).name}</span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

function QuestsTab({
  quests,
  progress,
  onCompleteQuest,
}: {
  quests: nexus.Quest[]
  progress: nexus.QuestProgress[]
  onCompleteQuest: (questId: number) => Promise<void>
}) {
  const [completing, setCompleting] = useState<number | null>(null)

  const getQuestProgress = (questId: number) => {
    return progress.find(p => p.questId === questId)
  }

  const getCategoryIcon = (category: nexus.QuestCategory) => {
    switch (category) {
      case 'PREDICTION': return <ChartIcon className="text-purple-400" />
      case 'MEME': return <GavelIcon className="text-pink-400" />
      case 'TYPING': return <KeyboardIcon className="text-green-400" />
      case 'LIFE': return <DnaIcon className="text-blue-400" />
      case 'MIXED': return <SparklesIcon className="text-amber-400" />
      case 'OTHER': return <StarIcon className="text-cyan-400" />
      default: return <TargetIcon className="text-text-secondary" />
    }
  }

  if (quests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="card p-8 text-center"
      >
        <TargetIcon className="text-text-muted mx-auto mb-4" size={48} />
        <p className="text-text-secondary">No quests available this season. Check back later!</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="grid md:grid-cols-2 gap-4"
    >
      {quests.map((quest, index) => {
        const questProg = getQuestProgress(quest.id)
        const isCompleted = questProg?.completed || false
        
        return (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`card p-4 ${isCompleted ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-surface-secondary rounded-lg">
                {getCategoryIcon(quest.category)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-text-primary">{quest.title}</h4>
                  {isCompleted && <CheckIcon className="text-success" size={16} />}
                </div>
                <p className="text-text-secondary text-sm mt-1">{quest.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                    <ZapIcon size={14} />
                    +{quest.rewardXp} XP
                  </span>
                  {!isCompleted && quest.active && (
                    <button
                      onClick={async () => {
                        setCompleting(quest.id)
                        await onCompleteQuest(quest.id)
                        setCompleting(null)
                      }}
                      disabled={completing === quest.id}
                      className="btn btn-sm btn-primary"
                    >
                      {completing === quest.id ? (
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                          <RefreshIcon size={14} />
                        </motion.span>
                      ) : (
                        'Complete'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
