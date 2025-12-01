// Beautiful SVG Icons for Linera Arcade Hub
// Replaces emojis with clean, animated icons

import { motion } from 'framer-motion'

interface IconProps {
  className?: string
  size?: number
  animate?: boolean
}

// Gavel/Hammer Icon for Auctions
export function GavelIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.25 9.75L16.5 12l1.875-1.875a1.875 1.875 0 00-2.652-2.652L13.848 9.35" />
      <path d="M9.75 14.25L7.5 12l-1.875 1.875a1.875 1.875 0 002.652 2.652l1.875-1.875" />
      <path d="M14.25 9.75l-4.5 4.5" />
      <path d="M3.75 20.25h4.5" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ rotate: [0, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>
      {icon}
    </motion.div>
  ) : icon
}

// Trophy Icon
export function TrophyIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.25 2.25 0 01-2.25-2.25v-.75A2.25 2.25 0 014.5 3.75h1.5M18 9h1.5a2.25 2.25 0 002.25-2.25v-.75A2.25 2.25 0 0019.5 3.75H18" />
      <path d="M6 3.75h12v5.625c0 3.728-2.686 6.75-6 6.75s-6-3.022-6-6.75V3.75z" />
      <path d="M9 20.25h6M12 16.125v4.125" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ scale: [1, 1.1, 1], y: [0, -2, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}>
      {icon}
    </motion.div>
  ) : icon
}

// Clock/Timer Icon
export function ClockIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}>
      {icon}
    </motion.div>
  ) : icon
}

// Image/Picture Icon
export function ImageIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

// Upload Icon
export function UploadIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

// Plus Icon
export function PlusIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// Refresh Icon
export function RefreshIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-2.636-6.364" />
      <path d="M21 3v6h-6" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
      {icon}
    </motion.div>
  ) : icon
}

// Live/Radio Icon
export function LiveIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4">
        <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
        <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// Checkmark Icon
export function CheckIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )
}

// User/Person Icon
export function UserIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// Chart/Stats Icon
export function ChartIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  )
}

// Lightbulb/Idea Icon
export function LightbulbIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
    </svg>
  )
}

// Star Icon
export function StarIcon({ className = '', size = 24, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )
}

// Keyboard Icon
export function KeyboardIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h12" />
    </svg>
  )
}

// Flag/Finish Icon
export function FlagIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

// Hourglass/Timer Icon
export function HourglassIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22" />
      <path d="M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ rotate: [0, 180] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
      {icon}
    </motion.div>
  ) : icon
}

// Lightning/Zap Icon
export function ZapIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
      {icon}
    </motion.div>
  ) : icon
}

// Target/Accuracy Icon
export function TargetIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

// Users/People Icon
export function UsersIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

// Play Icon
export function PlayIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

// Pause Icon
export function PauseIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}

// Wallet Icon
export function WalletIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2v-2" />
      <path d="M19 7h2a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
      <circle cx="16" cy="12" r="1" />
    </svg>
  )
}

// Money/Coins Icon
export function CoinsIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1110.34 18" />
      <path d="M7 6h2v4" />
      <path d="M16 14h2v4" />
    </svg>
  )
}

// Send/Submit Icon
export function SendIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22,2 15,22 11,13 2,9" />
    </svg>
  )
}

// Close/X Icon
export function CloseIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Arrow Right Icon
export function ArrowRightIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </svg>
  )
}

// Rocket Icon
export function RocketIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ y: [0, -3, 0], rotate: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
      {icon}
    </motion.div>
  ) : icon
}

// Palette Icon for Art/Memes
export function PaletteIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

// DNA/Cells Icon for Game of Life
export function DnaIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 15c6.667-6 13.333 0 20-6" />
      <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
      <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
      <path d="M17 6l-2.5-2.5" />
      <path d="M14 8l-1-1" />
      <path d="M7 18l2.5 2.5" />
      <path d="M3.5 14.5l.5.5" />
      <path d="M20.5 9.5l-.5-.5" />
      <path d="M10 16l1 1" />
      <path d="M2 9c6.667 6 13.333 0 20 6" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
      {icon}
    </motion.div>
  ) : icon
}

// Sparkles Icon
export function SparklesIcon({ className = '', size = 24, animate = false }: IconProps) {
  const icon = (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  )
  return animate ? (
    <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }} transition={{ duration: 2, repeat: Infinity }}>
      {icon}
    </motion.div>
  ) : icon
}

// Grid Icon
export function GridIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

// Circle Rarity Icons
export function RarityCommonIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#6b7280" />
      <circle cx="12" cy="12" r="6" fill="#9ca3af" />
    </svg>
  )
}

export function RarityUncommonIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#22c55e" />
      <circle cx="12" cy="12" r="6" fill="#4ade80" />
    </svg>
  )
}

export function RarityRareIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" />
      <circle cx="12" cy="12" r="6" fill="#60a5fa" />
    </svg>
  )
}

export function RarityEpicIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#a855f7" />
      <circle cx="12" cy="12" r="6" fill="#c084fc" />
    </svg>
  )
}

export function RarityLegendaryIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="legendary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#legendary-grad)" />
      <polygon points="12,4 14.5,9 20,9.5 16,13.5 17,19 12,16 7,19 8,13.5 4,9.5 9.5,9" fill="#fbbf24" />
    </svg>
  )
}

// Difficulty Icons
export function DifficultyEasyIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="4" fill="#22c55e" />
    </svg>
  )
}

export function DifficultyMediumIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="#f59e0b" />
    </svg>
  )
}

export function DifficultyHardIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#ef4444" />
    </svg>
  )
}

export function DifficultyExpertIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth={2} />
      <path d="M12 6v6l4 2" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="#7c3aed" />
    </svg>
  )
}

// Fox/MetaMask Icon
export function FoxIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21.3 2L13.2 8.1L14.7 4.5L21.3 2Z" fill="#E17726" />
      <path d="M2.7 2L10.7 8.2L9.3 4.5L2.7 2Z" fill="#E27625" />
      <path d="M18.4 16.8L16.2 20.3L20.8 21.6L22.2 16.9L18.4 16.8Z" fill="#E27625" />
      <path d="M1.8 16.9L3.2 21.6L7.8 20.3L5.6 16.8L1.8 16.9Z" fill="#E27625" />
      <path d="M7.5 10.6L6.2 12.6L10.7 12.8L10.5 7.9L7.5 10.6Z" fill="#E27625" />
      <path d="M16.5 10.6L13.4 7.8L13.2 12.8L17.8 12.6L16.5 10.6Z" fill="#E27625" />
      <path d="M7.8 20.3L10.4 19L8.2 17L7.8 20.3Z" fill="#E27625" />
      <path d="M13.6 19L16.2 20.3L15.8 17L13.6 19Z" fill="#E27625" />
      <path d="M16.2 20.3L13.6 19L13.8 21L13.8 21.5L16.2 20.3Z" fill="#D5BFB2" />
      <path d="M7.8 20.3L10.2 21.5L10.2 21L10.4 19L7.8 20.3Z" fill="#D5BFB2" />
      <path d="M10.3 15.3L8.1 14.7L9.7 14L10.3 15.3Z" fill="#233447" />
      <path d="M13.7 15.3L14.3 14L15.9 14.7L13.7 15.3Z" fill="#233447" />
      <path d="M7.8 20.3L8.2 16.8L5.6 16.9L7.8 20.3Z" fill="#CC6228" />
      <path d="M15.8 16.8L16.2 20.3L18.4 16.9L15.8 16.8Z" fill="#CC6228" />
      <path d="M17.8 12.6L13.2 12.8L13.7 15.3L14.3 14L15.9 14.7L17.8 12.6Z" fill="#CC6228" />
      <path d="M8.1 14.7L9.7 14L10.3 15.3L10.8 12.8L6.2 12.6L8.1 14.7Z" fill="#CC6228" />
      <path d="M6.2 12.6L8.2 17L8.1 14.7L6.2 12.6Z" fill="#E27525" />
      <path d="M15.9 14.7L15.8 17L17.8 12.6L15.9 14.7Z" fill="#E27525" />
      <path d="M10.8 12.8L10.3 15.3L10.9 18.2L11 14.4L10.8 12.8Z" fill="#E27525" />
      <path d="M13.2 12.8L13 14.4L13.1 18.2L13.7 15.3L13.2 12.8Z" fill="#E27525" />
      <path d="M13.7 15.3L13.1 18.2L13.6 19L15.8 17L15.9 14.7L13.7 15.3Z" fill="#F5841F" />
      <path d="M8.1 14.7L8.2 17L10.4 19L10.9 18.2L10.3 15.3L8.1 14.7Z" fill="#F5841F" />
      <path d="M13.8 21.5L13.8 21L13.6 20.8H10.4L10.2 21L10.2 21.5L7.8 20.3L8.7 21.1L10.4 22.2H13.7L15.4 21.1L16.2 20.3L13.8 21.5Z" fill="#C0AC9D" />
      <path d="M13.6 19L13.1 18.2H10.9L10.4 19L10.2 21L10.4 20.8H13.6L13.8 21L13.6 19Z" fill="#161616" />
      <path d="M21.8 8.5L22.5 5.2L21.3 2L13.6 7.8L16.5 10.6L20.6 11.8L21.8 10.4L21.3 10L22.1 9.3L21.5 8.8L22.3 8.2L21.8 8.5Z" fill="#763E1A" />
      <path d="M1.5 5.2L2.2 8.5L1.7 8.2L2.5 8.8L1.9 9.3L2.7 10L2.2 10.4L3.4 11.8L7.5 10.6L10.4 7.8L2.7 2L1.5 5.2Z" fill="#763E1A" />
      <path d="M20.6 11.8L16.5 10.6L17.8 12.6L15.8 17L18.4 16.9H22.2L20.6 11.8Z" fill="#F5841F" />
      <path d="M7.5 10.6L3.4 11.8L1.8 16.9H5.6L8.2 17L6.2 12.6L7.5 10.6Z" fill="#F5841F" />
      <path d="M13.2 12.8L13.6 7.8L14.7 4.5H9.3L10.4 7.8L10.8 12.8L10.9 14.4L10.9 18.2H13.1L13.1 14.4L13.2 12.8Z" fill="#F5841F" />
    </svg>
  )
}

// Game Controller Icon (alternative for Games)
export function GamepadIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="13" r="1" />
      <circle cx="18" cy="10" r="1" />
      <path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z" />
    </svg>
  )
}

// Home Icon with improved design
export function HomeIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

// Profile Icon
export function ProfileIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// Link/URL Icon
export function LinkIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}
