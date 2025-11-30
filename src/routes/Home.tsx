import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'

const features = [
  {
    icon: '🎮',
    title: 'On-chain Games',
    description: 'Play games where every move is stored on your personal microchain',
  },
  {
    icon: '👤',
    title: 'Player Profiles',
    description: 'Your identity, XP, and achievements live on your own microchain',
  },
  {
    icon: '⚡',
    title: 'Fast as Web2',
    description: 'Near-instant transactions with Linera\'s parallel microchain architecture',
  },
  {
    icon: '🔒',
    title: 'Trustless as Web3',
    description: 'Full security and ownership of your data on Conway Testnet',
  },
]

const steps = [
  {
    number: '01',
    title: 'Connect Wallet',
    description: 'Get a wallet from Conway faucet and choose your player name',
  },
  {
    number: '02',
    title: 'Claim Your Microchain',
    description: 'Your very own chain on Linera to store your game data',
  },
  {
    number: '03',
    title: 'Play & Earn XP',
    description: 'Jump into games, compete, and level up your profile',
  },
]

// Chain link SVG component
function ChainLinks() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated chain links floating */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 20}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" className="text-primary-500/30">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      ))}
      
      {/* Glowing orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-primary-500/5 blur-3xl"
        style={{ top: '10%', left: '20%' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-secondary-500/5 blur-3xl"
        style={{ bottom: '20%', right: '10%' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </div>
  )
}

export function Home() {
  const { state, openModal } = useWallet()

  return (
    <div className="max-w-6xl mx-auto space-y-16 relative">
      <ChainLinks />
      
      {/* Hero Section */}
      <section className="text-center py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-6 border border-primary-500/20">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            Live on Conway Testnet
          </span>
          
          <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6">
            Play with{' '}
            <span className="text-gradient">
              Microchains
            </span>
          </h1>
          
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8">
            A multi-game arcade built on Linera. Connect your wallet, claim your microchain, 
            and start playing on-chain in seconds.
          </p>

          <div className="flex items-center justify-center gap-4">
            {state === 'disconnected' ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openModal}
                className="btn-primary text-lg px-8 py-3"
              >
                Connect Wallet & Start
              </motion.button>
            ) : (
              <Link to="/games">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary text-lg px-8 py-3"
                >
                  Start Playing
                </motion.button>
              </Link>
            )}
            <Link to="/games">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-secondary text-lg px-8 py-3"
              >
                Explore Games
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="card card-hover p-6 group"
            >
              <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">
                {feature.icon}
              </span>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-text-secondary text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it Works */}
      <section className="py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
            How it Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index + 0.3 }}
                className="relative"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary-500/50 to-transparent" />
                )}
                
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 text-primary-400 font-bold text-xl flex items-center justify-center mx-auto mb-4 border border-primary-500/30">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Powered by Linera */}
      <section className="text-center py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border"
        >
          <span className="text-text-muted text-sm">Powered by</span>
          <span className="font-bold text-gradient">Linera</span>
          <span className="badge badge-primary">Conway Testnet</span>
        </motion.div>
      </section>
    </div>
  )
}
