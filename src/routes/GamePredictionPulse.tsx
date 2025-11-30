import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import type { Bet, PlayerStats, Round } from '../lib/predictionPulse'
import * as pp from '../lib/predictionPulse'

export function GamePredictionPulse() {
  const { state, openModal } = useWallet()
  const [rounds, setRounds] = useState<Round[]>([])
  const [openRounds, setOpenRounds] = useState<Round[]>([])
  const [playerBets, setPlayerBets] = useState<Bet[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [betAmount, setBetAmount] = useState<number>(10)
  const [loading, setLoading] = useState(false)
  const [signingAction, setSigningAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Create round form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRoundTitle, setNewRoundTitle] = useState('')
  const [newRoundOptionA, setNewRoundOptionA] = useState('')
  const [newRoundOptionB, setNewRoundOptionB] = useState('')
  const [newRoundDuration, setNewRoundDuration] = useState(60) // minutes

  // Load data from chain with retry
  const loadData = useCallback(async (retryCount = 0) => {
    if (state !== 'ready') return
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('[PredictionPulse] Loading data from chain...')
      
      const [allRounds, open, stats, bets] = await Promise.all([
        pp.getRounds().catch(err => {
          console.error('[PredictionPulse] getRounds failed:', err)
          return []
        }),
        pp.getOpenRounds().catch(err => {
          console.error('[PredictionPulse] getOpenRounds failed:', err)
          return []
        }),
        pp.getPlayerStats().catch(err => {
          console.error('[PredictionPulse] getPlayerStats failed:', err)
          return null
        }),
        pp.getPlayerBets().catch(err => {
          console.error('[PredictionPulse] getPlayerBets failed:', err)
          return []
        })
      ])
      
      console.log('[PredictionPulse] Loaded:', { allRounds, open, stats, bets })
      
      setRounds(allRounds)
      setOpenRounds(open)
      setPlayerStats(stats)
      setPlayerBets(bets)
      
      // If no rounds found and we haven't retried too many times, retry after delay
      if (allRounds.length === 0 && retryCount < 3) {
        console.log(`[PredictionPulse] No rounds found, retrying in 2s (attempt ${retryCount + 1}/3)`)
        setTimeout(() => loadData(retryCount + 1), 2000)
      }
    } catch (err) {
      console.error('Failed to load prediction data:', err)
      setError('Failed to load data from chain. Network may be slow.')
    } finally {
      setLoading(false)
    }
  }, [state])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Create a new round
  const handleCreateRound = async () => {
    if (state !== 'ready') {
      openModal()
      return
    }
    
    if (!newRoundTitle.trim() || !newRoundOptionA.trim() || !newRoundOptionB.trim()) {
      setError('Please fill in all fields')
      return
    }
    
    try {
      setSigningAction('Create prediction round')
      setError(null)
      setSuccess(null)
      
      const endTime = Math.floor(Date.now() / 1000) + (newRoundDuration * 60)
      await pp.createRound(newRoundTitle, newRoundOptionA, newRoundOptionB, endTime)
      
      setSuccess('Round created successfully! Waiting for chain to sync...')
      setShowCreateForm(false)
      setNewRoundTitle('')
      setNewRoundOptionA('')
      setNewRoundOptionB('')
      
      // Wait for chain to sync before reloading
      console.log('[PredictionPulse] Round created, waiting 3s for chain sync...')
      setTimeout(() => {
        setSuccess('Round created successfully!')
        loadData()
      }, 3000)
    } catch (err) {
      console.error('Failed to create round:', err)
      setError('Failed to create round - signature may have been rejected')
    } finally {
      setSigningAction(null)
    }
  }

  // Place a bet - requires MetaMask signature
  const handlePlaceBet = async (roundId: number, choice: boolean) => {
    if (state !== 'ready') {
      openModal()
      return
    }
    
    if (betAmount <= 0) {
      setError('Bet amount must be positive')
      return
    }
    
    const choiceName = choice ? 'Option A' : 'Option B'
    
    try {
      setSigningAction(`Place bet on ${choiceName} for ${betAmount} LINERA`)
      setError(null)
      setSuccess(null)
      
      await pp.placeBet(roundId, choice, betAmount.toString())
      
      setSuccess(`Successfully placed bet on ${choiceName}! Waiting for chain to confirm...`)
      
      // Wait for chain to sync before reloading (chain confirmation takes time)
      console.log('[PredictionPulse] Bet placed, waiting 5s for chain confirmation...')
      setTimeout(async () => {
        setSuccess(`Successfully placed bet on ${choiceName}!`)
        await loadData()
      }, 5000)
    } catch (err) {
      console.error('Failed to place bet:', err)
      setError('Failed to place bet - signature may have been rejected')
    } finally {
      setSigningAction(null)
    }
  }

  // Claim winnings - requires MetaMask signature
  const handleClaimWinnings = async (roundId: number) => {
    if (state !== 'ready') {
      openModal()
      return
    }
    
    try {
      setSigningAction(`Claim winnings for round ${roundId}`)
      setError(null)
      setSuccess(null)
      
      await pp.claimWinnings(roundId)
      
      setSuccess('Winnings claimed!')
      await loadData()
    } catch (err) {
      console.error('Failed to claim winnings:', err)
      setError('Failed to claim - signature may have been rejected')
    } finally {
      setSigningAction(null)
    }
  }

  // Check if user has bet on a round
  const getUserBetForRound = (roundId: number): Bet | undefined => {
    return playerBets.find(b => b.roundId === roundId)
  }

  // Calculate potential winnings display
  const getPotentialWinnings = (choice: boolean, round: Round): string => {
    const potential = pp.calculatePotentialWinnings(betAmount, choice, round)
    return potential.toFixed(2)
  }

  // Get the first open round for main display
  const currentRound = openRounds.length > 0 ? openRounds[0] : null

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-sm text-text-muted mb-6"
      >
        <Link to="/games" className="hover:text-primary-400 transition-colors">
          Games
        </Link>
        <span>/</span>
        <span className="text-text-primary">Prediction Pulse</span>
      </motion.div>

      {/* Signing Status Banner */}
      {signingAction && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-lg bg-primary-500/20 border border-primary-500/50 flex items-center gap-3"
        >
          <div className="animate-spin w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full" />
          <div>
            <p className="text-primary-400 font-medium">Waiting for MetaMask signature...</p>
            <p className="text-text-muted text-sm">{signingAction}</p>
          </div>
        </motion.div>
      )}

      {/* Success Banner */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-lg bg-success/20 border border-success/50"
        >
          <p className="text-success">{success}</p>
        </motion.div>
      )}

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-lg bg-error/20 border border-error/50"
        >
          <p className="text-error">{error}</p>
        </motion.div>
      )}

      {/* Connect Wallet Banner */}
      {state !== 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-lg bg-background-dark border border-border"
        >
          <p className="text-text-secondary mb-2">Connect your wallet to place bets</p>
          <button onClick={openModal} className="btn-primary">Connect Wallet</button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Round / Betting */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-2"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-text-primary">Current Round</h2>
              <button
                onClick={() => loadData()}
                disabled={loading}
                className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50"
                title="Refresh rounds"
              >
                🔄 Refresh
              </button>
            </div>
            <span className="badge badge-primary">On-chain Predictions</span>
          </motion.div>

          {/* Current Round Card */}
          {loading ? (
            <div className="card p-8 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full" />
            </div>
          ) : currentRound ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-text-primary text-lg">{currentRound.title}</h3>
                  <p className="text-sm text-text-secondary">
                    Round #{currentRound.id} • Status: <span className="text-primary-400">{pp.formatRoundStatus(currentRound.status)}</span>
                  </p>
                </div>
                <span className="badge badge-primary">{pp.formatRoundStatus(currentRound.status)}</span>
              </div>

              {/* Options/Pools display */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                  <p className="text-sm text-text-muted mb-1">🅰️ {currentRound.optionA}</p>
                  <p className="text-2xl font-bold text-success">{pp.formatAmount(currentRound.poolA)}</p>
                  <p className="text-xs text-text-muted">{currentRound.bettorsA} bettors</p>
                </div>
                <div className="p-4 rounded-lg bg-error/10 border border-error/30">
                  <p className="text-sm text-text-muted mb-1">🅱️ {currentRound.optionB}</p>
                  <p className="text-2xl font-bold text-error">{pp.formatAmount(currentRound.poolB)}</p>
                  <p className="text-xs text-text-muted">{currentRound.bettorsB} bettors</p>
                </div>
              </div>

              {/* Bet amount input */}
              {currentRound.status === 'OPEN' && (
                <div className="mb-4">
                  <label className="block text-sm text-text-muted mb-2">Bet Amount (LINERA)</label>
                  <input
                    type="number"
                    min="1"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2"
                    disabled={!!signingAction || state !== 'ready'}
                  />
                </div>
              )}

              {/* Betting buttons */}
              {currentRound.status === 'OPEN' && (
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePlaceBet(currentRound.id, true)}
                    disabled={!!signingAction || state !== 'ready'}
                    className="p-4 rounded-xl border-2 border-success hover:bg-success/20 transition-all text-center disabled:opacity-50"
                  >
                    <span className="text-2xl mb-2 block">🅰️</span>
                    <span className="text-lg font-bold text-success">{currentRound.optionA}</span>
                    <p className="text-xs text-text-muted mt-1">
                      Win: ~{getPotentialWinnings(true, currentRound)} LINERA
                    </p>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePlaceBet(currentRound.id, false)}
                    disabled={!!signingAction || state !== 'ready'}
                    className="p-4 rounded-xl border-2 border-error hover:bg-error/20 transition-all text-center disabled:opacity-50"
                  >
                    <span className="text-2xl mb-2 block">🅱️</span>
                    <span className="text-lg font-bold text-error">{currentRound.optionB}</span>
                    <p className="text-xs text-text-muted mt-1">
                      Win: ~{getPotentialWinnings(false, currentRound)} LINERA
                    </p>
                  </motion.button>
                </div>
              )}

              {/* Show user's bet if they have one */}
              {getUserBetForRound(currentRound.id) && (
                <div className="mt-4 p-3 rounded-lg bg-primary-500/10 border border-primary-500/30">
                  <p className="text-primary-400 font-medium">
                    Your bet: {pp.formatAmount(getUserBetForRound(currentRound.id)!.amount)} on {getUserBetForRound(currentRound.id)!.choice ? currentRound.optionA : currentRound.optionB}
                  </p>
                </div>
              )}

              {/* Resolved round - show result */}
              {currentRound.status === 'RESOLVED' && currentRound.winner !== null && (
                <div className="mt-4 p-4 rounded-lg bg-background-dark">
                  <p className="text-lg font-bold text-center">
                    Winner: {currentRound.winner ? `🅰️ ${currentRound.optionA}` : `🅱️ ${currentRound.optionB}`}
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-text-muted mb-4">No active rounds available.</p>
              {state === 'ready' && (
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  Create First Round
                </button>
              )}
            </div>
          )}

          {/* Create Round Form */}
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6"
            >
              <h3 className="font-bold text-text-primary mb-4">Create New Round</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Question/Title</label>
                  <input
                    type="text"
                    value={newRoundTitle}
                    onChange={(e) => setNewRoundTitle(e.target.value)}
                    placeholder="e.g., Will BTC reach $100k?"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2"
                    disabled={!!signingAction}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Option A</label>
                    <input
                      type="text"
                      value={newRoundOptionA}
                      onChange={(e) => setNewRoundOptionA(e.target.value)}
                      placeholder="e.g., Yes"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2"
                      disabled={!!signingAction}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Option B</label>
                    <input
                      type="text"
                      value={newRoundOptionB}
                      onChange={(e) => setNewRoundOptionB(e.target.value)}
                      placeholder="e.g., No"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2"
                      disabled={!!signingAction}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={newRoundDuration}
                    onChange={(e) => setNewRoundDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2"
                    disabled={!!signingAction}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateRound}
                    disabled={!!signingAction}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    Create Round
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    disabled={!!signingAction}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Create Round Button */}
          {state === 'ready' && !showCreateForm && currentRound && (
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn-secondary w-full"
            >
              + Create New Round
            </button>
          )}

          {/* Recent Rounds */}
          <h3 className="text-lg font-bold text-text-primary mt-8 mb-4">All Rounds</h3>
          <div className="space-y-4">
            {rounds.length === 0 ? (
              <div className="card p-4 text-center text-text-muted">
                No rounds yet. Create the first one!
              </div>
            ) : (
              rounds.slice(0, 10).map((round, index) => (
                <motion.div
                  key={round.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-text-primary">{round.title}</span>
                      <span className="ml-2 text-sm text-text-muted">
                        {pp.formatRoundStatus(round.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <span className="text-success">{round.optionA}: {pp.formatAmount(round.poolA)}</span>
                        {' / '}
                        <span className="text-error">{round.optionB}: {pp.formatAmount(round.poolB)}</span>
                      </span>
                      {round.status === 'RESOLVED' && round.winner !== null && (
                        <span className={`badge ${round.winner ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                          {round.winner ? round.optionA : round.optionB}
                        </span>
                      )}
                      {getUserBetForRound(round.id) && !getUserBetForRound(round.id)!.claimed && round.status === 'RESOLVED' && (
                        <button
                          onClick={() => handleClaimWinnings(round.id)}
                          disabled={!!signingAction}
                          className="btn-primary text-sm disabled:opacity-50"
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Side Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Your Stats */}
          <div className="card p-6">
            <h3 className="font-bold text-text-primary mb-4">Your Stats</h3>
            {state === 'ready' && playerStats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Rounds Played</span>
                  <span className="font-bold text-xl">{playerStats.roundsPlayed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Wins</span>
                  <span className="font-bold text-xl text-success">{playerStats.roundsWon}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Win Rate</span>
                  <span className="font-bold text-xl">
                    {playerStats.roundsPlayed > 0 
                      ? ((playerStats.roundsWon / playerStats.roundsPlayed) * 100).toFixed(1) 
                      : '0.0'}%
                  </span>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Total Wagered</span>
                    <span className="font-bold">{pp.formatAmount(playerStats.totalWagered)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-text-muted">Total Winnings</span>
                    <span className="font-bold text-success">{pp.formatAmount(playerStats.totalWon)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-text-muted mb-4">Connect wallet to track your stats</p>
                <button onClick={openModal} className="btn-primary">
                  Connect Wallet
                </button>
              </div>
            )}
          </div>

          {/* Your Active Bets */}
          {state === 'ready' && playerBets.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-text-primary mb-4">Your Active Bets</h3>
              <div className="space-y-3">
                {playerBets.filter(b => !b.claimed).slice(0, 5).map((bet) => (
                  <div key={`${bet.roundId}-${bet.placedAt}`} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Round #{bet.roundId}</span>
                    <span className={bet.choice ? 'text-success' : 'text-error'}>
                      {pp.formatAmount(bet.amount)} on {bet.choice ? 'A' : 'B'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to Play */}
          <div className="card p-6">
            <h3 className="font-bold text-text-primary mb-4">How to Play</h3>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex gap-3">
                <span className="text-primary-400">1.</span>
                Connect your MetaMask wallet
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">2.</span>
                Choose Option A 🅰️ or Option B 🅱️
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">3.</span>
                Enter bet amount & sign with MetaMask
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">4.</span>
                Wait for round to resolve
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">5.</span>
                Claim winnings if you won!
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
