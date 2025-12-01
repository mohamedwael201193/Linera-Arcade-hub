import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ChartIcon,
    CloseIcon,
    FlagIcon,
    HourglassIcon,
    KeyboardIcon,
    LightbulbIcon,
    LiveIcon,
    RefreshIcon,
    RocketIcon,
    SendIcon,
    SparklesIcon,
    TargetIcon,
    TrophyIcon,
    UsersIcon,
    ZapIcon
} from '../components/Icons'
import { useWallet } from '../contexts/WalletContext'
import type { Challenge, Difficulty, TypistStats } from '../lib/typingArena'
import * as ta from '../lib/typingArena'

export function GameTypingArena() {
  const { state, openModal } = useWallet()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [playerStats, setPlayerStats] = useState<TypistStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [signingAction, setSigningAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Default to 'upcoming' since new challenges start there before becoming active
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'finished'>('upcoming')
  
  // Typing game state
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [typedText, setTypedText] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Create challenge form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newText, setNewText] = useState('')
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('MEDIUM')
  const [newDuration, setNewDuration] = useState(5) // minutes
  const [newDelay, setNewDelay] = useState(1) // minutes until start

  // Time ticker
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load data from chain
  const loadData = useCallback(async () => {
    if (state !== 'ready') return
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('[TypingArena] Loading data from chain...')
      
      const [allChallenges, stats] = await Promise.all([
        ta.getChallenges().catch(err => {
          console.error('[TypingArena] getChallenges failed:', err)
          return []
        }),
        ta.getPlayerStats().catch(err => {
          console.error('[TypingArena] getPlayerStats failed:', err)
          return null
        })
      ])
      
      console.log('[TypingArena] Loaded:', { allChallenges, stats })
      
      setChallenges(allChallenges)
      setPlayerStats(stats)
    } catch (err) {
      console.error('Failed to load typing data:', err)
      setError('Failed to load data from chain. Network may be slow.')
    } finally {
      setLoading(false)
    }
  }, [state])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter challenges by tab
  const filteredChallenges = challenges.filter(c => {
    if (activeTab === 'active') return c.status === 'ACTIVE'
    if (activeTab === 'upcoming') return c.status === 'UPCOMING'
    if (activeTab === 'finished') return c.status === 'FINISHED'
    return true
  })

  // Create challenge
  const handleCreateChallenge = async () => {
    if (state !== 'ready') {
      openModal()
      return
    }
    
    if (!newTitle.trim() || !newText.trim()) {
      setError('Please fill in title and text')
      return
    }
    
    try {
      setSigningAction('Create typing challenge')
      setError(null)
      setSuccess(null)
      
      const now = Math.floor(Date.now() / 1000)
      const startTime = now + (newDelay * 60)
      const endTime = startTime + (newDuration * 60)
      
      await ta.createChallenge(newTitle, newText, newDifficulty, startTime, endTime)
      
      setSuccess('Challenge created successfully!')
      setShowCreateForm(false)
      setNewTitle('')
      setNewText('')
      setNewDifficulty('MEDIUM')
      
      setTimeout(() => loadData(), 3000)
    } catch (err) {
      console.error('Failed to create challenge:', err)
      setError('Failed to create challenge')
    } finally {
      setSigningAction(null)
    }
  }

  // Start typing game
  const handleStartTyping = (challenge: Challenge) => {
    setActiveChallenge(challenge)
    setTypedText('')
    setStartTime(null)
    setIsTyping(false)
    setGameFinished(false)
    setWpm(0)
    setAccuracy(100)
    
    // Focus input after modal opens
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Handle typing input
  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeChallenge || gameFinished) return
    
    const value = e.target.value
    setTypedText(value)
    
    // Start timer on first keystroke
    if (!startTime && value.length > 0) {
      setStartTime(Date.now())
      setIsTyping(true)
    }
    
    // Calculate accuracy
    const targetText = activeChallenge.text
    let correctChars = 0
    for (let i = 0; i < value.length; i++) {
      if (value[i] === targetText[i]) {
        correctChars++
      }
    }
    const acc = value.length > 0 ? Math.round((correctChars / value.length) * 100) : 100
    setAccuracy(acc)
    
    // Calculate WPM
    if (startTime) {
      const timeElapsed = (Date.now() - startTime) / 1000 / 60 // minutes
      const wordsTyped = value.length / 5 // standard: 5 chars = 1 word
      const currentWpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0
      setWpm(currentWpm)
    }
    
    // Check if completed
    if (value === targetText) {
      setGameFinished(true)
      setIsTyping(false)
    }
  }

  // Submit result
  const handleSubmitResult = async () => {
    if (!activeChallenge || !startTime) return
    
    const timeTaken = Date.now() - startTime
    const completed = typedText === activeChallenge.text
    
    try {
      setSigningAction('Submit typing result')
      
      await ta.submitResult(
        activeChallenge.id,
        wpm,
        accuracy,
        completed,
        timeTaken
      )
      
      setSuccess(`Result submitted! WPM: ${wpm}, Accuracy: ${accuracy}%`)
      setActiveChallenge(null)
      
      setTimeout(() => loadData(), 3000)
    } catch (err) {
      console.error('Failed to submit result:', err)
      setError('Failed to submit result')
    } finally {
      setSigningAction(null)
    }
  }

  // Get character status for display
  const getCharStatus = (index: number): 'correct' | 'incorrect' | 'pending' => {
    if (!activeChallenge) return 'pending'
    if (index >= typedText.length) return 'pending'
    return typedText[index] === activeChallenge.text[index] ? 'correct' : 'incorrect'
  }

  return (
    <div className="max-w-7xl mx-auto">
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
        <span className="text-text-primary">Typing Arena</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2 flex items-center gap-3">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <KeyboardIcon className="text-primary-400" size={32} />
            </motion.div>
            Typing Arena
          </h1>
          <p className="text-text-secondary">Race against time and other players in fast-paced typing challenges</p>
        </div>
        {state === 'ready' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateForm(true)}
            className="mt-4 md:mt-0 btn-primary flex items-center gap-2"
          >
            <FlagIcon size={18} />
            Create Challenge
          </motion.button>
        )}
      </motion.div>

      {/* Status Banners */}
      <AnimatePresence>
        {signingAction && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 rounded-lg bg-primary-500/20 border border-primary-500/50 flex items-center gap-3"
          >
            <div className="animate-spin w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full" />
            <div>
              <p className="text-primary-400 font-medium">Waiting for MetaMask signature...</p>
              <p className="text-text-muted text-sm">{signingAction}</p>
            </div>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 rounded-lg bg-success/20 border border-success/50"
          >
            <p className="text-success">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 rounded-lg bg-error/20 border border-error/50"
          >
            <p className="text-error">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connect Wallet Banner */}
      {state !== 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-6 rounded-xl bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <KeyboardIcon className="text-green-400" size={48} />
            </motion.div>
            <div>
              <p className="text-text-primary font-medium mb-1">Connect your wallet to compete</p>
              <p className="text-text-secondary text-sm">Create challenges, submit results, climb the leaderboard</p>
            </div>
            <button onClick={openModal} className="ml-auto btn-primary">Connect Wallet</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['active', 'upcoming', 'finished'] as const).map((tab) => (
              <motion.button
                key={tab}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab
                    ? 'bg-primary-500 text-white'
                    : 'bg-background-dark border border-border hover:border-primary-500/50'
                }`}
              >
                {tab === 'active' && <><LiveIcon size={16} className="text-green-400" /> Live Now</>}
                {tab === 'upcoming' && <><HourglassIcon size={16} className="text-blue-400" /> Upcoming</>}
                {tab === 'finished' && <><FlagIcon size={16} className="text-gray-400" /> Finished</>}
              </motion.button>
            ))}
            <motion.button
              whileHover={{ scale: 1.05, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => loadData()}
              disabled={loading}
              className="ml-auto px-3 py-2 text-primary-400 hover:text-primary-300 disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshIcon size={18} animate={loading} />
              Refresh
            </motion.button>
          </div>

          {/* Challenges List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-10 h-10 border-3 border-primary-400 border-t-transparent rounded-full" />
            </div>
          ) : filteredChallenges.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-12 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex justify-center mb-4"
              >
                <KeyboardIcon className="text-primary-400" size={64} />
              </motion.div>
              <p className="text-text-muted mb-4">
                {activeTab === 'active' && 'No active challenges right now.'}
                {activeTab === 'upcoming' && 'No upcoming challenges scheduled.'}
                {activeTab === 'finished' && 'No finished challenges yet.'}
              </p>
              {state === 'ready' && (
                <button onClick={() => setShowCreateForm(true)} className="btn-primary">
                  Create Challenge
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredChallenges.map((challenge, index) => {
                const statusInfo = ta.formatChallengeStatus(challenge.status)
                const difficultyInfo = ta.formatDifficulty(challenge.difficulty)
                const timeRemaining = ta.getTimeRemaining(challenge.endTime)
                const timeUntilStart = ta.getTimeUntilStart(challenge.startTime)
                
                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card p-6 hover:border-primary-500/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Challenge Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-text-primary text-lg">{challenge.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusInfo.color} bg-current/10`}>
                            {statusInfo.emoji} {statusInfo.label}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${difficultyInfo.color} bg-current/10`}>
                            {difficultyInfo.emoji} {difficultyInfo.label}
                          </span>
                        </div>
                        <p className="text-text-muted text-sm line-clamp-2 mb-2">
                          "{challenge.text.substring(0, 100)}..."
                        </p>
                        <div className="flex items-center gap-4 text-sm text-text-muted">
                          <span className="flex items-center gap-1"><UsersIcon size={14} /> {challenge.participantCount} participants</span>
                          {challenge.bestWpm > 0 && (
                            <span className="flex items-center gap-1"><TrophyIcon size={14} className="text-yellow-400" /> Best: {challenge.bestWpm} WPM</span>
                          )}
                        </div>
                      </div>

                      {/* Time & Action */}
                      <div className="flex flex-col items-end gap-2">
                        {challenge.status === 'UPCOMING' && !timeUntilStart.isStarted && (
                          <div className="text-right">
                            <p className="text-xs text-text-muted">Starts in</p>
                            <p className="font-bold text-blue-400">
                              {timeUntilStart.hours > 0 && `${timeUntilStart.hours}h `}
                              {timeUntilStart.minutes}m {timeUntilStart.seconds}s
                            </p>
                          </div>
                        )}
                        {challenge.status === 'ACTIVE' && !timeRemaining.isExpired && (
                          <div className="text-right">
                            <p className="text-xs text-text-muted">Time left</p>
                            <p className="font-bold text-green-400 animate-pulse">
                              {timeRemaining.minutes}:{timeRemaining.seconds.toString().padStart(2, '0')}
                            </p>
                          </div>
                        )}
                        
                        {challenge.status === 'ACTIVE' && state === 'ready' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStartTyping(challenge)}
                            className="btn-primary px-6 flex items-center gap-2"
                          >
                            <KeyboardIcon size={18} /> Start Typing!
                          </motion.button>
                        )}
                        
                        {challenge.status === 'FINISHED' && (
                          <span className="text-text-muted text-sm">
                            Winner: {challenge.bestPlayer?.slice(0, 8) || 'N/A'}...
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <ChartIcon className="text-primary-400" size={24} />
              Your Stats
            </h3>
            {state === 'ready' && playerStats ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-text-muted">Challenges Completed</span>
                  <span className="font-bold">{playerStats.challengesCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Challenges Won</span>
                  <span className="font-bold text-success">{playerStats.challengesWon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Best WPM</span>
                  <span className="font-bold text-primary-400">{playerStats.bestWpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Average WPM</span>
                  <span className="font-bold">{playerStats.averageWpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Average Accuracy</span>
                  <span className="font-bold">{playerStats.averageAccuracy}%</span>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Total Words Typed</span>
                    <span className="font-bold">{playerStats.totalWordsTyped}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-text-muted mb-4">Connect to see your stats</p>
                <button onClick={openModal} className="btn-primary">Connect</button>
              </div>
            )}
          </motion.div>

          {/* WPM Guide */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <ZapIcon className="text-yellow-400" size={24} />
              WPM Ratings
            </h3>
            <div className="space-y-2 text-sm">
              {[100, 80, 60, 40, 20].map((wpm) => {
                const rating = ta.getWpmRating(wpm)
                return (
                  <div key={wpm} className={`flex items-center justify-between ${rating.color}`}>
                    <span>{rating.emoji} {rating.label}</span>
                    <span>{wpm}+ WPM</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-6"
          >
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <LightbulbIcon className="text-yellow-400" size={24} />
              Tips
            </h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2"><TargetIcon size={14} className="mt-1 text-primary-400" /> Focus on accuracy first, speed follows</li>
              <li className="flex items-start gap-2"><TargetIcon size={14} className="mt-1 text-primary-400" /> Keep your eyes on the text, not keyboard</li>
              <li className="flex items-start gap-2"><TargetIcon size={14} className="mt-1 text-primary-400" /> Practice regularly to improve</li>
              <li className="flex items-start gap-2"><TargetIcon size={14} className="mt-1 text-primary-400" /> Results are stored on-chain forever!</li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Create Challenge Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gradient mb-6 flex items-center gap-2">
                <FlagIcon className="text-primary-400" size={28} />
                Create Typing Challenge
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Challenge Title *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Speed Typing Challenge #1"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-text-muted mb-1">Text to Type *</label>
                  <textarea
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="The quick brown fox jumps over the lazy dog..."
                    rows={4}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors resize-none"
                  />
                  <div className="flex justify-between mt-1">
                    <button
                      type="button"
                      onClick={() => setNewText(ta.getRandomText(newDifficulty))}
                      className="text-xs text-primary-400 hover:underline flex items-center gap-1"
                    >
                      <SparklesIcon size={12} /> Generate random text
                    </button>
                    <span className="text-xs text-text-muted">{newText.length} chars</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Difficulty</label>
                    <select
                      value={newDifficulty}
                      onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors"
                    >
                      <option value="EASY">○ Easy</option>
                      <option value="MEDIUM">◈ Medium</option>
                      <option value="HARD">★ Hard</option>
                      <option value="EXPERT">◆ Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Starts in (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      value={newDelay}
                      onChange={(e) => setNewDelay(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateChallenge}
                    disabled={!!signingAction}
                    className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {signingAction ? 'Signing...' : <><RocketIcon size={18} /> Create Challenge</>}
                  </motion.button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing Game Modal */}
      <AnimatePresence>
        {activeChallenge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-8 w-full max-w-3xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gradient">{activeChallenge.title}</h2>
                  <p className="text-text-muted text-sm">
                    {ta.formatDifficulty(activeChallenge.difficulty).emoji} {ta.formatDifficulty(activeChallenge.difficulty).label}
                  </p>
                </div>
                <button
                  onClick={() => setActiveChallenge(null)}
                  className="text-text-muted hover:text-text-primary text-2xl"
                >
                  <CloseIcon size={24} />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-background-dark rounded-lg p-4 text-center">
                  <p className="text-text-muted text-sm">WPM</p>
                  <p className={`text-3xl font-bold ${ta.getWpmRating(wpm).color}`}>{wpm}</p>
                </div>
                <div className="bg-background-dark rounded-lg p-4 text-center">
                  <p className="text-text-muted text-sm">Accuracy</p>
                  <p className={`text-3xl font-bold ${accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {accuracy}%
                  </p>
                </div>
                <div className="bg-background-dark rounded-lg p-4 text-center">
                  <p className="text-text-muted text-sm">Progress</p>
                  <p className="text-3xl font-bold text-primary-400">
                    {Math.round((typedText.length / activeChallenge.text.length) * 100)}%
                  </p>
                </div>
              </div>

              {/* Text Display */}
              <div className="bg-background-dark rounded-lg p-6 mb-6 font-mono text-lg leading-relaxed">
                {activeChallenge.text.split('').map((char, index) => {
                  const status = getCharStatus(index)
                  return (
                    <span
                      key={index}
                      className={`${
                        status === 'correct' ? 'text-green-400' :
                        status === 'incorrect' ? 'text-red-400 bg-red-400/20' :
                        index === typedText.length ? 'bg-primary-400/30 animate-pulse' :
                        'text-text-muted'
                      }`}
                    >
                      {char}
                    </span>
                  )
                })}
              </div>

              {/* Input */}
              {!gameFinished ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={typedText}
                  onChange={handleTypingInput}
                  placeholder="Start typing..."
                  className="w-full bg-background border-2 border-primary-500/50 rounded-lg px-6 py-4 text-lg font-mono focus:border-primary-500 focus:outline-none transition-colors"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: 2 }}
                    className="flex justify-center mb-4"
                  >
                    <SparklesIcon className="text-yellow-400" size={64} />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gradient mb-2">Challenge Complete!</h3>
                  <p className="text-text-muted mb-6">
                    {wpm} WPM with {accuracy}% accuracy
                  </p>
                  <div className="flex gap-3 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSubmitResult}
                      disabled={!!signingAction}
                      className="btn-primary px-8 disabled:opacity-50 flex items-center gap-2"
                    >
                      {signingAction ? 'Signing...' : <><SendIcon size={18} /> Submit Result</>}
                    </motion.button>
                    <button
                      onClick={() => setActiveChallenge(null)}
                      className="btn-ghost"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Tip */}
              {!gameFinished && !isTyping && (
                <p className="text-center text-text-muted text-sm mt-4 flex items-center justify-center gap-2">
                  <LightbulbIcon size={14} className="text-yellow-400" />
                  Start typing to begin the challenge. Focus on accuracy!
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
