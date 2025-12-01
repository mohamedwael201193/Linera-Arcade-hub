import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ChartIcon,
    CheckIcon,
    ClockIcon,
    CloseIcon,
    CoinsIcon,
    FoxIcon,
    GavelIcon,
    LightbulbIcon,
    LinkIcon,
    LiveIcon,
    PaletteIcon,
    PlusIcon,
    RarityCommonIcon,
    RarityEpicIcon,
    RarityLegendaryIcon,
    RarityRareIcon,
    RarityUncommonIcon,
    RefreshIcon,
    RocketIcon,
    SparklesIcon,
    StarIcon,
    TrophyIcon,
    UploadIcon,
    UserIcon
} from '../components/Icons'
import { useWallet } from '../contexts/WalletContext'
import { generateAIImage } from '../lib/aiImageGenerator'
import type { Auction, AuctioneerStats, MemeRarity } from '../lib/memeAuction'
import * as ma from '../lib/memeAuction'

// Meme placeholder SVG as data URL
const MEME_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.3"/>
    </linearGradient>
  </defs>
  <rect width="300" height="200" fill="url(#grad)"/>
  <text x="150" y="85" font-size="48" text-anchor="middle" fill="#6366f1">🖼️</text>
  <text x="150" y="130" font-size="14" text-anchor="middle" fill="#94a3b8">Meme Image</text>
</svg>
`)}`

export function GameMemeAuction() {
  const { state, chainId, openModal } = useWallet()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [playerStats, setPlayerStats] = useState<AuctioneerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [signingAction, setSigningAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [bidAmount, setBidAmount] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'live' | 'ended' | 'mine'>('live')
  
  // Create auction form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)
  const [newDescription, setNewDescription] = useState('')
  const [newRarity, setNewRarity] = useState<MemeRarity>('COMMON')
  const [newStartingPrice, setNewStartingPrice] = useState('1')
  const [newDuration, setNewDuration] = useState(60) // minutes
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // AI Image Generation
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiStyle, setAiStyle] = useState<'meme' | 'art' | 'cartoon' | 'photo'>('meme')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [imageSourceTab, setImageSourceTab] = useState<'upload' | 'url' | 'ai'>('upload')
  const [imageLoading, setImageLoading] = useState(false)

  // User balance from localStorage (same as Profile page)
  const [userBalance, setUserBalance] = useState<number>(0)
  
  // Load balance from localStorage
  useEffect(() => {
    if (chainId) {
      const savedBalance = localStorage.getItem(`linera_arcade_balance_${chainId}`)
      if (savedBalance) {
        setUserBalance(parseFloat(savedBalance))
      }
    }
  }, [chainId])

  // Time remaining ticker
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
      
      console.log('[MemeAuction] Loading data from chain...')
      
      const [allAuctions, stats] = await Promise.all([
        ma.getAuctions().catch(err => {
          console.error('[MemeAuction] getAuctions failed:', err)
          return []
        }),
        ma.getPlayerStats().catch(err => {
          console.error('[MemeAuction] getPlayerStats failed:', err)
          return null
        })
      ])
      
      console.log('[MemeAuction] Loaded:', { allAuctions, stats })
      
      setAuctions(allAuctions)
      setPlayerStats(stats)
    } catch (err) {
      console.error('Failed to load auction data:', err)
      setError('Failed to load data from chain. Network may be slow.')
    } finally {
      setLoading(false)
    }
  }, [state])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter auctions by tab
  const filteredAuctions = auctions.filter(a => {
    if (activeTab === 'live') return a.status === 'OPEN'
    if (activeTab === 'ended') return a.status === 'ENDED' || a.status === 'CLAIMED'
    if (activeTab === 'mine') return a.creator === chainId
    return true
  })

  // Handle image file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 500KB for data URL)
    if (file.size > 500 * 1024) {
      setError('Image too large. Please use an image under 500KB or provide a URL.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      setNewImageUrl(dataUrl)
      setNewImagePreview(dataUrl)
      setError(null)
    }
    reader.onerror = () => {
      setError('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  // Generate AI image
  const handleGenerateAIImage = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a description for the AI to generate')
      return
    }

    try {
      setGeneratingImage(true)
      setImageLoading(true)
      setError(null)

      const result = await generateAIImage({
        prompt: aiPrompt,
        style: aiStyle,
        width: 512,
        height: 512
      })

      console.log('[AI] Generation result:', result)

      if (result.success && result.imageUrl) {
        setNewImageUrl(result.imageUrl)
        setNewImagePreview(result.imageUrl)
        setSuccess('AI image generated! Loading preview...')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error || 'Failed to generate image')
        setImageLoading(false)
      }
    } catch (err) {
      console.error('AI generation failed:', err)
      setError('Failed to generate image. Please try again.')
      setImageLoading(false)
    } finally {
      setGeneratingImage(false)
    }
  }

  // Create auction
  const handleCreateAuction = async () => {
    if (state !== 'ready') {
      openModal()
      return
    }
    
    if (!newTitle.trim()) {
      setError('Please fill in the meme title')
      return
    }

    if (!newImageUrl.trim()) {
      setError('Please provide an image URL or upload an image')
      return
    }
    
    try {
      setSigningAction('Create meme auction')
      setError(null)
      setSuccess(null)
      
      const endTime = Math.floor(Date.now() / 1000) + (newDuration * 60)
      await ma.createAuction(
        newTitle,
        newImageUrl,
        newDescription,
        newRarity,
        newStartingPrice,
        endTime
      )
      
      setSuccess('Auction created successfully! Waiting for chain to sync...')
      setShowCreateForm(false)
      setNewTitle('')
      setNewImageUrl('')
      setNewImagePreview(null)
      setNewDescription('')
      setNewRarity('COMMON')
      setNewStartingPrice('1')
      
      setTimeout(() => {
        setSuccess('Auction created successfully!')
        loadData()
      }, 3000)
    } catch (err) {
      console.error('Failed to create auction:', err)
      setError('Failed to create auction - signature may have been rejected')
    } finally {
      setSigningAction(null)
    }
  }

  // Place bid
  const handlePlaceBid = async () => {
    if (!selectedAuction || state !== 'ready') return
    
    const minBid = parseFloat(selectedAuction.currentBid) > 0 
      ? parseFloat(selectedAuction.currentBid) 
      : parseFloat(selectedAuction.startingPrice)
    
    if (!bidAmount || parseFloat(bidAmount) <= minBid) {
      setError(`Bid must be higher than ${minBid}`)
      return
    }
    
    try {
      setSigningAction(`Place bid of ${bidAmount} LINERA`)
      setError(null)
      setSuccess(null)
      
      await ma.placeBid(selectedAuction.id, bidAmount)
      
      setSuccess('Bid placed successfully!')
      setSelectedAuction(null)
      setBidAmount('')
      
      setTimeout(() => loadData(), 3000)
    } catch (err) {
      console.error('Failed to place bid:', err)
      setError('Failed to place bid - signature may have been rejected')
    } finally {
      setSigningAction(null)
    }
  }

  // End auction
  const handleEndAuction = async (auctionId: number) => {
    try {
      setSigningAction('End auction')
      await ma.endAuction(auctionId)
      setSuccess('Auction ended!')
      setTimeout(() => loadData(), 3000)
    } catch (err) {
      setError('Failed to end auction')
    } finally {
      setSigningAction(null)
    }
  }

  // Claim meme
  const handleClaimMeme = async (auctionId: number) => {
    try {
      setSigningAction('Claim meme')
      await ma.claimMeme(auctionId)
      setSuccess('Meme claimed! Check your collection.')
      setTimeout(() => loadData(), 3000)
    } catch (err) {
      setError('Failed to claim meme')
    } finally {
      setSigningAction(null)
    }
  }

  // Rarity badge colors
  const rarityColors: Record<MemeRarity, string> = {
    'COMMON': 'from-gray-500 to-gray-600',
    'UNCOMMON': 'from-green-500 to-green-600',
    'RARE': 'from-blue-500 to-blue-600',
    'EPIC': 'from-purple-500 to-purple-600',
    'LEGENDARY': 'from-yellow-500 to-orange-500',
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
        <span className="text-text-primary">Meme Auction</span>
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
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <PaletteIcon className="text-primary-400" size={32} />
            </motion.div>
            Meme Auction House
          </h1>
          <p className="text-text-secondary">Bid on and collect rare memes on-chain</p>
        </div>
        {state === 'ready' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateForm(true)}
            className="mt-4 md:mt-0 btn-primary flex items-center gap-2"
          >
            <PlusIcon size={18} />
            Create Auction
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
          className="mb-6 p-6 rounded-xl bg-gradient-to-r from-primary-500/20 to-purple-500/20 border border-primary-500/30"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <FoxIcon size={48} />
            </motion.div>
            <div>
              <p className="text-text-primary font-medium mb-1">Connect your wallet to participate</p>
              <p className="text-text-secondary text-sm">Create auctions, place bids, and collect memes</p>
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
            {(['live', 'ended', 'mine'] as const).map((tab) => (
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
                {tab === 'live' && <><LiveIcon size={16} className="text-red-400" /> Live</>}
                {tab === 'ended' && <><CheckIcon size={16} className="text-green-400" /> Ended</>}
                {tab === 'mine' && <><UserIcon size={16} /> My Auctions</>}
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

          {/* Auctions Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-10 h-10 border-3 border-primary-400 border-t-transparent rounded-full" />
            </div>
          ) : filteredAuctions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-12 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="flex justify-center mb-4"
              >
                <PaletteIcon className="text-primary-400" size={64} />
              </motion.div>
              <p className="text-text-muted mb-4">
                {activeTab === 'live' && 'No live auctions right now.'}
                {activeTab === 'ended' && 'No ended auctions yet.'}
                {activeTab === 'mine' && 'You haven\'t created any auctions yet.'}
              </p>
              {state === 'ready' && activeTab === 'live' && (
                <button onClick={() => setShowCreateForm(true)} className="btn-primary">
                  Create First Auction
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAuctions.map((auction, index) => {
                const timeInfo = ma.getTimeRemaining(auction.endTime)
                const rarity = ma.formatRarity(auction.rarity)
                const isWinner = auction.highestBidder === chainId
                const canClaim = auction.status === 'ENDED' && isWinner
                const canEnd = auction.status === 'OPEN' && timeInfo.isExpired
                
                return (
                  <motion.div
                    key={`auction-${auction.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="card overflow-hidden group"
                  >
                    {/* Meme Image */}
                    <div className="relative h-48 bg-background-dark overflow-hidden">
                      <img
                        src={auction.imageUrl || MEME_PLACEHOLDER}
                        alt={auction.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          // Use our inline SVG placeholder
                          (e.target as HTMLImageElement).src = MEME_PLACEHOLDER
                        }}
                      />
                      {/* Rarity Badge */}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${rarityColors[auction.rarity]}`}>
                        {rarity.emoji} {rarity.label}
                      </div>
                      {/* Status Badge */}
                      <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold ${
                        auction.status === 'OPEN' 
                          ? 'bg-green-500/90 text-white animate-pulse' 
                          : 'bg-gray-500/90 text-white'
                      }`}>
                        {ma.formatAuctionStatus(auction.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-text-primary truncate mb-2">{auction.title}</h3>
                      
                      {/* Current Bid */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-text-muted">
                            {auction.bidCount > 0 ? 'Current Bid' : 'Starting Price'}
                          </p>
                          <p className="text-lg font-bold text-primary-400">
                            {ma.formatAmount(auction.bidCount > 0 ? auction.currentBid : auction.startingPrice)} LINERA
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-text-muted">
                            {auction.status === 'OPEN' ? 'Time Left' : 'Final'}
                          </p>
                          <p className={`font-bold ${timeInfo.isExpired ? 'text-error' : 'text-success'}`}>
                            {auction.status === 'OPEN' ? ma.formatTimeRemaining(auction.endTime) : `${auction.bidCount} bids`}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {auction.status === 'OPEN' && !timeInfo.isExpired && state === 'ready' && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedAuction(auction)
                              setBidAmount('')
                            }}
                            className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-1"
                          >
                            <GavelIcon size={16} /> Place Bid
                          </motion.button>
                        )}
                        {canEnd && state === 'ready' && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleEndAuction(auction.id)}
                            className="flex-1 btn-secondary py-2 text-sm flex items-center justify-center gap-1"
                          >
                            <ClockIcon size={16} /> End Auction
                          </motion.button>
                        )}
                        {canClaim && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleClaimMeme(auction.id)}
                            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                          >
                            <TrophyIcon size={16} animate /> Claim Meme!
                          </motion.button>
                        )}
                        {!canEnd && !canClaim && auction.status !== 'OPEN' && (
                          <div className="flex-1 text-center py-2 text-text-muted text-sm flex items-center justify-center gap-1">
                            {isWinner ? <><TrophyIcon size={14} className="text-yellow-500" /> You won!</> : auction.highestBidder ? `Winner: ${auction.highestBidder.slice(0,8)}...` : 'No bids'}
                          </div>
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
                  <span className="text-text-muted">Auctions Created</span>
                  <span className="font-bold">{playerStats.auctionsCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Auctions Won</span>
                  <span className="font-bold text-success">{playerStats.auctionsWon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Bids</span>
                  <span className="font-bold">{playerStats.totalBids}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Memes Collected</span>
                  <span className="font-bold text-primary-400">{playerStats.memesCollected}</span>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Total Spent</span>
                    <span className="font-bold">{ma.formatAmount(playerStats.totalSpent)}</span>
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

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <LightbulbIcon className="text-yellow-400" size={24} />
              How It Works
            </h3>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex gap-3">
                <span className="text-primary-400">1.</span>
                Create an auction with a meme image
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">2.</span>
                Others bid - highest bid wins
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">3.</span>
                After time expires, end the auction
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">4.</span>
                Winner claims the meme NFT on-chain!
              </li>
            </ul>
          </motion.div>

          {/* Rarity Guide */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-6"
          >
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <StarIcon className="text-yellow-400" size={24} filled />
              Rarity Tiers
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-400">
                <RarityCommonIcon size={20} /> Common
              </div>
              <div className="flex items-center gap-3 text-green-400">
                <RarityUncommonIcon size={20} /> Uncommon
              </div>
              <div className="flex items-center gap-3 text-blue-400">
                <RarityRareIcon size={20} /> Rare
              </div>
              <div className="flex items-center gap-3 text-purple-400">
                <RarityEpicIcon size={20} /> Epic
              </div>
              <div className="flex items-center gap-3 text-yellow-400">
                <RarityLegendaryIcon size={20} /> Legendary
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Create Auction Modal */}
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
              className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gradient mb-6 flex items-center gap-2">
                <PaletteIcon className="text-primary-400" size={28} />
                Create Meme Auction
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Meme Title *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Rare Pepe #420"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors"
                  />
                </div>
                
                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm text-text-muted mb-2">Meme Image *</label>
                  
                  {/* Image Preview */}
                  {(newImagePreview || newImageUrl || imageLoading) && (
                    <div className="mb-3 relative">
                      <div className="w-full h-40 rounded-lg border border-border overflow-hidden bg-surface-dark flex items-center justify-center">
                        {imageLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-surface-dark z-10">
                            <div className="flex flex-col items-center gap-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              >
                                <SparklesIcon size={32} className="text-purple-400" />
                              </motion.div>
                              <span className="text-sm text-text-muted">Loading image...</span>
                            </div>
                          </div>
                        )}
                        {(newImagePreview || newImageUrl) && (
                          <img
                            src={newImagePreview || newImageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onLoad={() => {
                              setImageLoading(false)
                            }}
                            onError={(e) => {
                              console.error('Image load error:', newImagePreview || newImageUrl)
                              setImageLoading(false)
                              ;(e.target as HTMLImageElement).src = MEME_PLACEHOLDER
                            }}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewImageUrl('')
                          setNewImagePreview(null)
                          setAiPrompt('')
                          setImageLoading(false)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="absolute top-2 right-2 w-8 h-8 bg-error rounded-full flex items-center justify-center text-white hover:bg-error/80 transition-colors"
                      >
                        <CloseIcon size={16} />
                      </button>
                    </div>
                  )}

                  {/* Tab Selector */}
                  <div className="flex gap-1 mb-3 p-1 bg-background rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setImageSourceTab('upload')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        imageSourceTab === 'upload'
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'text-text-muted hover:bg-surface-dark'
                      }`}
                    >
                      <UploadIcon size={16} />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab('url')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        imageSourceTab === 'url'
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'text-text-muted hover:bg-surface-dark'
                      }`}
                    >
                      <LinkIcon size={16} />
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageSourceTab('ai')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        imageSourceTab === 'ai'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                          : 'text-text-muted hover:bg-surface-dark'
                      }`}
                    >
                      <SparklesIcon size={16} />
                      AI Generate
                    </button>
                  </div>

                  {/* Upload Tab */}
                  {imageSourceTab === 'upload' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 px-4 rounded-lg border-2 border-dashed border-primary-500/50 hover:border-primary-500 bg-primary-500/10 transition-colors flex items-center justify-center gap-2"
                      >
                        <UploadIcon size={20} className="text-primary-400" />
                        <span className="text-sm font-medium">Choose Image File</span>
                      </motion.button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                        <LightbulbIcon size={12} className="text-yellow-400" />
                        Upload images under 500KB (PNG, JPG, GIF)
                      </p>
                    </motion.div>
                  )}

                  {/* URL Tab */}
                  {imageSourceTab === 'url' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <input
                        type="text"
                        value={newImageUrl.startsWith('data:') ? '' : newImageUrl}
                        onChange={(e) => {
                          setNewImageUrl(e.target.value)
                          setNewImagePreview(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        placeholder="https://example.com/meme.png"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors"
                        disabled={!!newImagePreview}
                      />
                      <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                        <LightbulbIcon size={12} className="text-yellow-400" />
                        Use a direct image URL (must end in .png, .jpg, etc)
                      </p>
                    </motion.div>
                  )}

                  {/* AI Generate Tab */}
                  {imageSourceTab === 'ai' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <SparklesIcon size={16} className="text-purple-400" />
                          <span className="text-sm font-medium text-purple-300">AI Meme Generator</span>
                        </div>
                        <p className="text-xs text-text-muted">
                          Describe your meme and let AI create it! Free & unlimited.
                        </p>
                      </div>

                      <div>
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Describe your meme... e.g., 'A shocked cat looking at a computer screen showing crypto prices crashing'"
                          rows={3}
                          className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-purple-500 transition-colors resize-none"
                          disabled={generatingImage}
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-text-muted mb-1">Style</label>
                        <select
                          value={aiStyle}
                          onChange={(e) => setAiStyle(e.target.value as typeof aiStyle)}
                          className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-purple-500 transition-colors"
                          disabled={generatingImage}
                        >
                          <option value="meme">🎭 Meme Style</option>
                          <option value="cartoon">🎨 Cartoon</option>
                          <option value="art">🖼️ Digital Art</option>
                          <option value="photo">📷 Photorealistic</option>
                        </select>
                      </div>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerateAIImage}
                        disabled={generatingImage || !aiPrompt.trim()}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {generatingImage ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <SparklesIcon size={20} />
                            </motion.div>
                            <span>Creating your meme (10-30s)...</span>
                          </>
                        ) : (
                          <>
                            <SparklesIcon size={20} />
                            <span>Generate with AI</span>
                          </>
                        )}
                      </motion.button>

                      <p className="text-xs text-text-muted text-center">
                        Powered by Pollinations AI • May take up to 30 seconds
                      </p>
                    </motion.div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm text-text-muted mb-1">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Tell us about this legendary meme..."
                    rows={2}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Rarity</label>
                    <select
                      value={newRarity}
                      onChange={(e) => setNewRarity(e.target.value as MemeRarity)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:border-primary-500 transition-colors"
                    >
                      <option value="COMMON">● Common</option>
                      <option value="UNCOMMON">● Uncommon</option>
                      <option value="RARE">● Rare</option>
                      <option value="EPIC">● Epic</option>
                      <option value="LEGENDARY">★ Legendary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Starting Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newStartingPrice}
                      onChange={(e) => setNewStartingPrice(e.target.value)}
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
                    onClick={handleCreateAuction}
                    disabled={!!signingAction}
                    className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {signingAction ? 'Signing...' : <><RocketIcon size={18} /> Create Auction</>}
                  </motion.button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewImagePreview(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
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

      {/* Bid Modal */}
      <AnimatePresence>
        {selectedAuction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAuction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gradient mb-4 flex items-center gap-2">
                <GavelIcon className="text-primary-400" size={24} />
                Place Bid
              </h2>
              
              <div className="mb-4">
                <img
                  src={selectedAuction.imageUrl || MEME_PLACEHOLDER}
                  alt={selectedAuction.title}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                  onError={(e) => {
                    // Use placeholder on error
                    (e.target as HTMLImageElement).src = MEME_PLACEHOLDER
                  }}
                />
                <h3 className="font-bold text-text-primary">{selectedAuction.title}</h3>
                <p className="text-sm text-text-muted">
                  Current Bid: {ma.formatAmount(selectedAuction.currentBid || selectedAuction.startingPrice)} LINERA
                </p>
                <p className="text-sm text-primary-400 mt-1">
                  Your Balance: {userBalance.toFixed(2)} LINERA
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-text-muted mb-1">Your Bid (LINERA)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Min: ${(parseFloat(selectedAuction.currentBid || selectedAuction.startingPrice) + 0.1).toFixed(1)}`}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-lg font-bold focus:border-primary-500 transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlaceBid}
                  disabled={!!signingAction}
                  className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {signingAction ? 'Signing...' : <><CoinsIcon size={18} /> Confirm Bid</>}
                </motion.button>
                <button
                  onClick={() => setSelectedAuction(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
