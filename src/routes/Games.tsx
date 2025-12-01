import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRightIcon, ChartIcon, DnaIcon, ImageIcon, KeyboardIcon, RocketIcon } from '../components/Icons'

interface Game {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  iconColor: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  path: string
  available: boolean
  category: string
}

const games: Game[] = [
  {
    id: 'gol',
    title: 'Game of Life',
    description: 'Classic cellular automaton simulation running on your microchain. Watch patterns evolve!',
    icon: DnaIcon,
    iconColor: 'text-green-400',
    difficulty: 'Easy',
    path: '/games/gol',
    available: true,
    category: 'Simulation',
  },
  {
    id: 'prediction-pulse',
    title: 'Prediction Pulse',
    description: 'Make predictions on simple yes/no outcomes. Test your intuition and earn wins!',
    icon: ChartIcon,
    iconColor: 'text-blue-400',
    difficulty: 'Easy',
    path: '/games/prediction-pulse',
    available: true,
    category: 'Strategy',
  },
  {
    id: 'typing-arena',
    title: 'Typing Arena',
    description: 'Race against time and other players in fast-paced typing challenges.',
    icon: KeyboardIcon,
    iconColor: 'text-purple-400',
    difficulty: 'Medium',
    path: '/games/typing-arena',
    available: true,
    category: 'Skill',
  },
  {
    id: 'meme-auction',
    title: 'Meme Auction',
    description: 'Bid on and collect rare memes in this on-chain auction house.',
    icon: ImageIcon,
    iconColor: 'text-pink-400',
    difficulty: 'Medium',
    path: '/games/meme-auction',
    available: true,
    category: 'Trading',
  },
]

const difficultyColors = {
  Easy: 'bg-success/20 text-success border border-success/30',
  Medium: 'bg-warning/20 text-warning border border-warning/30',
  Hard: 'bg-error/20 text-error border border-error/30',
}

export function Games() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-text-primary mb-2">Games Hub</h1>
        <p className="text-text-secondary">
          Choose a game to play. All games run on-chain on your Linera microchain.
        </p>
      </motion.div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GameCard game={game} />
          </motion.div>
        ))}
      </div>

      {/* Coming Soon Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20"
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <RocketIcon className="text-primary-400" size={48} />
          </motion.div>
          <div>
            <h3 className="font-bold text-text-primary">More Games Coming Soon!</h3>
            <p className="text-text-secondary text-sm">
              We're building more exciting on-chain games. Stay tuned for updates!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  const IconComponent = game.icon
  
  const CardContent = (
    <motion.div
      whileHover={game.available ? { scale: 1.02, y: -4 } : {}}
      className={`card h-full flex flex-col ${
        game.available
          ? 'card-hover cursor-pointer'
          : 'opacity-50 cursor-not-allowed'
      }`}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <IconComponent className={game.iconColor} size={40} />
          </motion.div>
          <div className="flex items-center gap-2">
            {!game.available && (
              <span className="badge badge-warning">Coming Soon</span>
            )}
            <span className={`badge ${difficultyColors[game.difficulty]}`}>
              {game.difficulty}
            </span>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-text-primary mb-2">{game.title}</h3>
        <p className="text-text-secondary text-sm">{game.description}</p>
      </div>

      {/* Footer */}
      <div className="mt-auto p-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted uppercase tracking-wider">
            {game.category}
          </span>
          {game.available ? (
            <span className="text-primary-400 font-medium text-sm flex items-center gap-1">
              Play Now
              <ArrowRightIcon size={16} />
            </span>
          ) : (
            <span className="text-text-muted text-sm">Not Available</span>
          )}
        </div>
      </div>
    </motion.div>
  )

  if (game.available) {
    return <Link to={game.path} className="block h-full">{CardContent}</Link>
  }

  return CardContent
}
