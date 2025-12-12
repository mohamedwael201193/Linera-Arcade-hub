import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  CheckIcon,
  ClockIcon,
  CrownIcon,
  FireIcon,
  RefreshIcon,
  SparklesIcon,
  TrophyIcon
} from '../components/Icons';
import { useWallet } from '../contexts/WalletContext';
import * as nexus from '../lib/arcadeNexus';
import type { Match, Tournament } from '../lib/memeBattle';
import * as mb from '../lib/memeBattle';
import { XP_VALUES } from '../lib/xpConfig';

// Simple vote icon inline
function VoteIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

// Live indicator icon
function LiveIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="5" className="animate-pulse"/>
    </svg>
  )
}

// Helper to record XP (silent failure)
async function recordBattleXP(xp: number) {
  if (!nexus.isArcadeNexusConfigured()) return
  try {
    const seasons = await nexus.getActiveSeasons()
    if (seasons.length > 0) {
      await nexus.recordGameAction(seasons[0].id, 'MEME', xp)
      console.log('[MemeBattle] Recorded', xp, 'XP')
    }
  } catch (err) {
    console.log('[MemeBattle] XP recording skipped:', err)
  }
}

export default function GameMemeBattle() {
  const { owner, state } = useWallet()
  const isConnected = state === 'connected' || state === 'ready'
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [voting, setVoting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [votedMatches, setVotedMatches] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isConnected) {
      loadTournaments()
    }
  }, [isConnected])

  async function loadTournaments() {
    setLoading(true)
    setError('')
    
    try {
      const data = await mb.getActiveTournaments()
      setTournaments(data)
      
      if (data.length > 0) {
        setSelectedTournament(data[0])
        // Check which matches the user has voted on
        if (owner) {
          const voted = new Set<number>()
          for (const round of data[0].rounds) {
            for (const match of round.matches) {
              const hasVoted = await mb.hasUserVoted(match.matchId, owner)
              if (hasVoted) {
                voted.add(match.matchId)
              }
            }
          }
          setVotedMatches(voted)
        }
      }
    } catch (error) {
      console.error('[MemeBattle] Error loading tournaments:', error)
      setError('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  async function createTournamentWithRealMemes() {
    if (!owner) return
    
    setLoading(true)
    setError('')
    
    try {
      // Import meme auction helper
      const { getAuctions } = await import('../lib/memeAuction')
      
      // Fetch real auctions from Meme Auction contract
      console.log('[MemeBattle] Fetching real memes from auction...')
      const auctions = await getAuctions()
      
      console.log('[MemeBattle] Found auctions:', auctions.length, auctions)
      
      if (auctions.length < 4) {
        setError(`Need at least 4 memes in the auction. You have ${auctions.length}. Please create more memes first!`)
        setLoading(false)
        return
      }
      
      // Take the first 4 or 8 memes (must be power of 2)
      let count = auctions.length >= 8 ? 8 : 4
      const selectedAuctions = auctions.slice(0, count)
      
      // Convert to tournament meme format
      const tournamentMemes = selectedAuctions.map(auction => ({
        auctionAppId: import.meta.env.VITE_MEME_AUCTION_APP_ID || '',
        memeId: auction.memeId,
        imageUrl: auction.imageUrl,
        title: auction.title,
        creator: auction.creator
      }))
      
      console.log('[MemeBattle] Creating tournament with these memes:', tournamentMemes)
      
      // Create tournament with real meme data
      await mb.createTournament(
        `Meme Battle Royale ${new Date().toLocaleDateString()}`,
        `Epic tournament with ${tournamentMemes.length} real memes: ${tournamentMemes.map(m => m.title).join(', ')}`,
        1, // season_id
        tournamentMemes,
        3600 // 1 hour per match
      )
      
      console.log('[MemeBattle] Tournament created successfully!')
      
      // Reload tournaments
      await loadTournaments()
    } catch (error) {
      console.error('[MemeBattle] Error creating tournament:', error)
      setError('Failed to create tournament: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVote(matchId: number, memeId: number) {
    if (!selectedTournament || voting || !owner) {
      console.log('[MemeBattle] Vote blocked:', { selectedTournament: !!selectedTournament, voting, owner })
      return
    }
    
    // Check if already voted
    if (votedMatches.has(matchId)) {
      setError('You have already voted on this match')
      return
    }
    
    console.log('[MemeBattle] Starting vote:', { tournamentId: selectedTournament.tournamentId, matchId, memeId })
    
    setVoting(true)
    setError('')
    
    try {
      console.log('[MemeBattle] Calling voteMeme...')
      await mb.voteMeme(selectedTournament.tournamentId, matchId, memeId)
      
      console.log('[MemeBattle] Vote successful! Recording XP...')
      
      // Record XP
      await recordBattleXP(XP_VALUES.meme.bid) // +10 XP for voting
      
      // Mark as voted
      setVotedMatches(prev => new Set(prev).add(matchId))
      
      console.log('[MemeBattle] Refreshing tournament data...')
      
      // Refresh tournament data
      await loadTournaments()
      
      console.log('[MemeBattle] Vote complete! ✅')
    } catch (error) {
      console.error('[MemeBattle] Error voting:', error)
      setError('Failed to submit vote. Please try again.')
    } finally {
      setVoting(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadTournaments()
    setRefreshing(false)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <TrophyIcon className="mx-auto mb-4 text-yellow-400" size={64} />
          <h2 className="text-2xl font-bold mb-2">Meme Battle Royale</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to participate in epic meme tournaments!
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading tournaments...</p>
        </div>
      </div>
    )
  }

  if (error && tournaments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadTournaments}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (tournaments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <TrophyIcon className="mx-auto mb-4 text-gray-600" size={64} />
          <h2 className="text-2xl font-bold mb-2">No Active Tournaments</h2>
          <p className="text-gray-400 mb-6">
            Create your first meme battle tournament with real NFTs from the auction!
          </p>
          <div className="flex flex-col gap-3 justify-center">
            <button
              onClick={createTournamentWithRealMemes}
              disabled={loading || !owner}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2 justify-center font-semibold"
            >
              <SparklesIcon size={20} />
              {loading ? 'Creating...' : 'Create Tournament with Real Memes'}
            </button>
            <p className="text-xs text-gray-500">
              Uses actual NFTs from Meme Auction contract
            </p>
          </div>
          {!owner && (
            <p className="text-yellow-500 text-sm mt-4">
              ⚠️ Connect wallet to create tournaments
            </p>
          )}
        </div>
      </div>
    )
  }

  const currentRound = selectedTournament?.rounds[selectedTournament.currentRound]
  const roundName = currentRound ? mb.getRoundName(currentRound.roundIndex, selectedTournament.rounds.length + 1) : ''

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-xl p-6 mb-8 border border-orange-500/30"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <TrophyIcon size={32} className="text-yellow-400" />
              <h1 className="text-3xl font-bold">{selectedTournament?.title}</h1>
              {selectedTournament?.status === 'ACTIVE' && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold flex items-center gap-1">
                  <LiveIcon size={16} />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-gray-300 mb-4">{selectedTournament?.description}</p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FireIcon size={20} className="text-orange-400" />
                <span className="text-gray-400">
                  <span className="text-orange-400 font-bold">{roundName}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <VoteIcon size={20} className="text-blue-400" />
                <span className="text-gray-400">
                  {currentRound?.matches.length || 0} active {currentRound?.matches.length === 1 ? 'match' : 'matches'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SparklesIcon size={20} className="text-purple-400" />
                <span className="text-gray-400">
                  +{XP_VALUES.meme.bid} XP per vote
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={createTournamentWithRealMemes}
              disabled={loading || !owner}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 rounded-lg transition text-sm font-semibold"
              title="Create new tournament with real memes"
            >
              <SparklesIcon size={16} className="inline mr-1" />
              New Tournament
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshIcon size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"
        >
          <p className="text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Matches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="wait">
          {currentRound?.matches.map((match, index) => (
            <MatchCard
              key={match.matchId}
              match={match}
              index={index}
              onVote={handleVote}
              voting={voting}
              hasVoted={votedMatches.has(match.matchId)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Tournament Info */}
      {selectedTournament && selectedTournament.status === 'COMPLETED' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30 text-center"
        >
          <CrownIcon className="mx-auto mb-4 text-yellow-400" size={64} />
          <h3 className="text-2xl font-bold mb-2">Tournament Complete!</h3>
          <p className="text-gray-300">
            The champion has been crowned. Stay tuned for the next battle!
          </p>
        </motion.div>
      )}
    </div>
  )
}

interface MatchCardProps {
  match: Match
  index: number
  onVote: (matchId: number, memeId: number) => void
  voting: boolean
  hasVoted: boolean
}

function MatchCard({ match, index, onVote, voting, hasVoted }: MatchCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('')
  const [hoveredSide, setHoveredSide] = useState<'A' | 'B' | null>(null)

  useEffect(() => {
    const updateTime = () => {
      setTimeRemaining(mb.getTimeRemaining(match.endTime))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    
    return () => clearInterval(interval)
  }, [match.endTime])

  const isVotingOpen = match.status === 'VOTING' && timeRemaining !== 'Ended'
  const totalVotes = match.votesA + match.votesB
  const votePercentageA = totalVotes > 0 ? (match.votesA / totalVotes) * 100 : 50
  const votePercentageB = totalVotes > 0 ? (match.votesB / totalVotes) * 100 : 50

  console.log('[MatchCard]', { matchId: match.matchId, status: match.status, timeRemaining, isVotingOpen, hasVoted })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden border-2 border-gray-700 hover:border-orange-500/50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-orange-500/20"
    >
      {/* Match Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm border-b-2 border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center font-bold text-sm">
              #{match.matchId}
            </div>
            {match.status === 'RESOLVED' && match.winner && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-full text-xs font-bold flex items-center gap-1 border border-green-500/30"
              >
                <CheckIcon size={14} />
                RESOLVED
              </motion.span>
            )}
            {hasVoted && match.status === 'VOTING' && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 rounded-full text-xs font-bold flex items-center gap-1 border border-blue-500/30"
              >
                <CheckIcon size={14} />
                YOU VOTED
              </motion.span>
            )}
          </div>
          
          {isVotingOpen ? (
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-2 text-sm bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30"
            >
              <ClockIcon size={16} className="text-orange-400 animate-pulse" />
              <span className="font-mono text-orange-400 font-bold">{timeRemaining}</span>
            </motion.div>
          ) : (
            <span className="text-xs text-gray-500 font-semibold">VOTING CLOSED</span>
          )}
        </div>
      </div>

      {/* Memes */}
      <div className="grid grid-cols-2 divide-x-2 divide-gray-700">
        {/* Meme A */}
        <motion.div 
          className="relative group"
          whileHover={{ scale: hoveredSide === 'A' ? 1.02 : 1 }}
          onHoverStart={() => setHoveredSide('A')}
          onHoverEnd={() => setHoveredSide(null)}
        >
          <div className="aspect-square overflow-hidden bg-gradient-to-br from-blue-900/20 to-gray-900 relative">
            <img
              src={match.memeA.imageUrl}
              alt={match.memeA.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            {hoveredSide === 'A' && !hasVoted && isVotingOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-t from-blue-500/40 via-blue-500/20 to-transparent"
              />
            )}
          </div>
          
          <div className="p-5 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm">
            <h4 className="font-bold text-lg mb-1 truncate text-white">{match.memeA.title}</h4>
            <p className="text-xs text-gray-400 mb-4 truncate">by {match.memeA.creator}</p>
            
            {/* Vote Bar with Glow */}
            <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden mb-3 shadow-inner">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 shadow-lg shadow-blue-500/50"
                initial={{ width: 0 }}
                animate={{ width: `${votePercentageA}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <motion.span 
                className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600"
                animate={{ scale: match.votesA > 0 ? [1, 1.2, 1] : 1 }}
              >
                {match.votesA}
              </motion.span>
              <span className="text-sm text-gray-400 font-bold">{votePercentageA.toFixed(1)}%</span>
            </div>

            {/* ALWAYS SHOW Vote Button */}
            {!hasVoted ? (
              <motion.button
                onClick={() => onVote(match.matchId, match.memeA.memeId)}
                disabled={voting || !isVotingOpen}
                whileHover={{ scale: isVotingOpen ? 1.05 : 1 }}
                whileTap={{ scale: isVotingOpen ? 0.95 : 1 }}
                className={`w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
                  isVotingOpen 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/50 cursor-pointer' 
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                {voting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Voting...
                  </>
                ) : isVotingOpen ? (
                  <>
                    <VoteIcon size={20} />
                    VOTE FOR {match.memeA.title.toUpperCase()}
                  </>
                ) : (
                  <>
                    <ClockIcon size={20} />
                    VOTING CLOSED
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-full py-3 bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-blue-500/30"
              >
                <CheckIcon size={20} />
                YOU VOTED
              </motion.div>
            )}
          </div>

          {match.winner === match.memeA.memeId && (
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="absolute top-4 right-4 bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-full shadow-2xl shadow-yellow-500/50"
            >
              <CrownIcon className="text-gray-900" size={24} />
            </motion.div>
          )}
        </motion.div>

        {/* Meme B */}
        <motion.div 
          className="relative group"
          whileHover={{ scale: hoveredSide === 'B' ? 1.02 : 1 }}
          onHoverStart={() => setHoveredSide('B')}
          onHoverEnd={() => setHoveredSide(null)}
        >
          <div className="aspect-square overflow-hidden bg-gradient-to-br from-orange-900/20 to-gray-900 relative">
            <img
              src={match.memeB.imageUrl}
              alt={match.memeB.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            {hoveredSide === 'B' && !hasVoted && isVotingOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-t from-orange-500/40 via-orange-500/20 to-transparent"
              />
            )}
          </div>
          
          <div className="p-5 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm">
            <h4 className="font-bold text-lg mb-1 truncate text-white">{match.memeB.title}</h4>
            <p className="text-xs text-gray-400 mb-4 truncate">by {match.memeB.creator}</p>
            
            {/* Vote Bar with Glow */}
            <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden mb-3 shadow-inner">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 shadow-lg shadow-orange-500/50"
                initial={{ width: 0 }}
                animate={{ width: `${votePercentageB}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <motion.span 
                className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600"
                animate={{ scale: match.votesB > 0 ? [1, 1.2, 1] : 1 }}
              >
                {match.votesB}
              </motion.span>
              <span className="text-sm text-gray-400 font-bold">{votePercentageB.toFixed(1)}%</span>
            </div>

            {/* ALWAYS SHOW Vote Button */}
            {!hasVoted ? (
              <motion.button
                onClick={() => onVote(match.matchId, match.memeB.memeId)}
                disabled={voting || !isVotingOpen}
                whileHover={{ scale: isVotingOpen ? 1.05 : 1 }}
                whileTap={{ scale: isVotingOpen ? 0.95 : 1 }}
                className={`w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg ${
                  isVotingOpen 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/50 cursor-pointer' 
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                {voting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Voting...
                  </>
                ) : isVotingOpen ? (
                  <>
                    <VoteIcon size={20} />
                    VOTE FOR {match.memeB.title.toUpperCase()}
                  </>
                ) : (
                  <>
                    <ClockIcon size={20} />
                    VOTING CLOSED
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-full py-3 bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-orange-500/30"
              >
                <CheckIcon size={20} />
                YOU VOTED
              </motion.div>
            )}
          </div>

          {match.winner === match.memeB.memeId && (
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="absolute top-4 right-4 bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-full shadow-2xl shadow-yellow-500/50"
            >
              <CrownIcon className="text-gray-900" size={24} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
