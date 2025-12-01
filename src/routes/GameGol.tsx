import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import * as nexus from '../lib/arcadeNexus'
import type { CellPosition, GridInfo, Pattern } from '../lib/gol'
import * as gol from '../lib/gol'
import { XP_VALUES } from '../lib/xpConfig'

// Helper to record XP (silent failure)  
async function recordLifeXP(xp: number) {
  if (!nexus.isArcadeNexusConfigured()) return
  try {
    const seasons = await nexus.getActiveSeasons()
    if (seasons.length > 0) {
      await nexus.recordGameAction(seasons[0].id, 'LIFE', xp)
      console.log('[GoL] Recorded', xp, 'XP')
    }
  } catch (err) {
    console.log('[GoL] XP recording skipped:', err)
  }
}

// Grid configuration - match contract dimensions
const GRID_SIZE = gol.GRID_WIDTH
const CELL_SIZE = 14

type Grid = boolean[][]

// Create empty grid
const createEmptyGrid = (): Grid => {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false))
}

// Convert cell positions array to 2D grid
const cellsToGrid = (cells: CellPosition[]): Grid => {
  const grid: Grid = createEmptyGrid()
  cells.forEach(({ x, y }) => {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      grid[y][x] = true
    }
  })
  return grid
}

export function GameGol() {
  const { state, openModal, profile } = useWallet()
  const [grid, setGrid] = useState<Grid>(createEmptyGrid)
  const [_gridInfo, setGridInfo] = useState<GridInfo | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(100)
  const [loading, setLoading] = useState(false)
  const [signingAction, setSigningAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<Pattern>('Glider')
  const [generation, setGeneration] = useState(0)

  // Load grid from chain on mount
  useEffect(() => {
    if (state !== 'ready') return
    
    const loadGrid = async () => {
      try {
        setLoading(true)
        setError(null)
        const [info, cells] = await Promise.all([
          gol.getGridInfo(),
          gol.getLiveCells()
        ])
        setGridInfo(info)
        setGrid(cellsToGrid(cells))
        setIsRunning(info.running)
        setGeneration(Number(info.generation))
      } catch (err) {
        console.error('Failed to load grid:', err)
        setError(`Failed to load grid from chain: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }
    
    loadGrid()
  }, [state])

  // Run simulation - when running, step the simulation on-chain
  // NOTE: Each step requires a MetaMask signature since it's an on-chain transaction
  useEffect(() => {
    if (!isRunning || state !== 'ready') return

    let isCancelled = false
    
    const runStep = async () => {
      if (isCancelled) return
      
      try {
        console.log('[GoL] Auto-stepping simulation...')
        setSigningAction('Auto-step (sign to continue)')
        
        // Step the simulation on-chain
        await gol.step(1)
        
        if (isCancelled) return
        
        // Wait for chain to sync
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        if (isCancelled) return
        
        // Fetch updated state
        const [info, cells] = await Promise.all([
          gol.getGridInfo(),
          gol.getLiveCells()
        ])
        
        if (isCancelled) return
        
        setGridInfo(info)
        setGrid(cellsToGrid(cells))
        setGeneration(Number(info.generation))
        console.log('[GoL] Auto-step complete, generation:', info.generation, 'cells:', cells.length)
        
        setSigningAction(null)
        
        // Schedule next step after speed delay (if still running)
        if (!isCancelled && isRunning) {
          setTimeout(runStep, speed)
        }
      } catch (err) {
        console.error('[GoL] Auto-step failed:', err)
        setError(`Simulation error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setIsRunning(false)
        setSigningAction(null)
      }
    }
    
    // Start first step after a short delay
    const timeoutId = setTimeout(runStep, 500)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      setSigningAction(null)
    }
  }, [isRunning, speed, state])

  // Toggle cell - on-chain only (requires MetaMask signature)
  const toggleCell = useCallback(async (x: number, y: number) => {
    if (isRunning) return
    
    // Must be connected
    if (state !== 'ready') {
      setError('Please connect your wallet to toggle cells')
      return
    }
    
    // On-chain mode - requires MetaMask signature
    try {
      setSigningAction(`Toggle cell (${x}, ${y})`)
      setError(null)
      
      // Optimistic update
      setGrid((prev) => {
        const newGrid = prev.map((row) => [...row])
        newGrid[y][x] = !newGrid[y][x]
        return newGrid
      })
      
      await gol.toggleCell(x, y)
      
      // Wait for chain to sync
      console.log('[GoL] Cell toggled, waiting for chain sync...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Refresh from chain
      const [info, cells] = await Promise.all([
        gol.getGridInfo(),
        gol.getLiveCells()
      ])
      console.log('[GoL] After toggle - live cells:', cells.length)
      setGridInfo(info)
      setGrid(cellsToGrid(cells))
    } catch (err) {
      console.error('Failed to toggle cell:', err)
      setError(`Failed to toggle cell: ${err instanceof Error ? err.message : 'Unknown error'}`)
      // Revert optimistic update
      const cells = await gol.getLiveCells()
      setGrid(cellsToGrid(cells))
    } finally {
      setSigningAction(null)
    }
  }, [isRunning, state])

  // Step simulation
  const handleStep = async () => {
    if (state !== 'ready') {
      setError('Please connect your wallet to step the simulation')
      return
    }
    
    try {
      setSigningAction('Step simulation')
      setError(null)
      const info = await gol.step(1)
      setGridInfo(info)
      setGeneration(Number(info.generation))
      
      // Wait for chain to sync
      console.log('[GoL] Step executed, waiting for chain sync...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const cells = await gol.getLiveCells()
      console.log('[GoL] After step - live cells:', cells.length)
      setGrid(cellsToGrid(cells))
    } catch (err) {
      console.error('Failed to step:', err)
      setError(`Failed to step: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSigningAction(null)
    }
  }

  // Start/Stop simulation
  // NOTE: On-chain Game of Life requires a signature for each step
  // The "Play" mode will auto-step and prompt for signatures
  const handlePlay = async () => {
    if (state !== 'ready') {
      setError('Please connect your wallet to start the simulation')
      return
    }
    
    // Just set local running state - the useEffect will handle stepping
    setError(null)
    setIsRunning(true)
    console.log('[GoL] Starting auto-step mode (each step requires signature)')
  }

  const handlePause = async () => {
    console.log('[GoL] Pausing simulation')
    setIsRunning(false)
    setSigningAction(null)
  }

  // Clear grid
  const handleClear = async () => {
    setIsRunning(false)
    
    if (state !== 'ready') {
      setError('Please connect your wallet to clear the grid')
      return
    }
    
    try {
      setSigningAction('Clear grid')
      setError(null)
      await gol.clearGrid()
      
      // Wait for chain to sync
      console.log('[GoL] Grid cleared, waiting for chain sync...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const [info, cells] = await Promise.all([
        gol.getGridInfo(),
        gol.getLiveCells()
      ])
      console.log('[GoL] After clear - live cells:', cells.length)
      setGridInfo(info)
      setGrid(cellsToGrid(cells))
      setGeneration(Number(info.generation))
    } catch (err) {
      console.error('Failed to clear on chain:', err)
      setError(`Failed to clear: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSigningAction(null)
    }
  }

  // Randomize grid
  const handleRandom = async () => {
    setIsRunning(false)
    
    if (state !== 'ready') {
      setError('Please connect your wallet to randomize the grid')
      return
    }
    
    try {
      setSigningAction('Randomize grid')
      setError(null)
      await gol.randomizeGrid()
      
      // Wait for chain to sync
      console.log('[GoL] Grid randomized, waiting for chain sync...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const [info, cells] = await Promise.all([
        gol.getGridInfo(),
        gol.getLiveCells()
      ])
      console.log('[GoL] After randomize - live cells:', cells.length)
      setGridInfo(info)
      setGrid(cellsToGrid(cells))
      setGeneration(Number(info.generation))
    } catch (err) {
      console.error('Failed to randomize:', err)
      setError(`Failed to randomize: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSigningAction(null)
    }
  }

  // Load pattern
  const handleLoadPattern = async () => {
    setIsRunning(false)
    
    if (state !== 'ready') {
      setError('Please connect your wallet to load a pattern')
      return
    }
    
    try {
      setSigningAction(`Load ${selectedPattern} pattern`)
      setError(null)
      
      // First clear the grid locally and on chain
      console.log('[GoL] Clearing grid before loading pattern...')
      setGrid(createEmptyGrid()) // Clear UI immediately
      await gol.clearGrid()
      
      // Wait for clear to sync
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Now load the pattern
      console.log('[GoL] Loading pattern:', selectedPattern)
      await gol.loadPattern(selectedPattern, 5, 5)
      
      // Record XP for loading a pattern
      recordLifeXP(XP_VALUES.life.pattern)
      
      // Wait for chain to sync before fetching updated state
      console.log('[GoL] Pattern loaded, waiting for chain sync...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Fetch updated state
      console.log('[GoL] Fetching updated grid state...')
      const info = await gol.getGridInfo()
      const cells = await gol.getLiveCells()
      
      console.log('[GoL] Grid info:', JSON.stringify(info))
      console.log('[GoL] Live cells count:', cells.length)
      console.log('[GoL] Live cells positions:', JSON.stringify(cells.slice(0, 20))) // First 20 cells
      
      const newGrid = cellsToGrid(cells)
      const gridCellCount = newGrid.flat().filter(Boolean).length
      console.log('[GoL] Grid cell count after conversion:', gridCellCount)
      
      setGridInfo(info)
      setGrid(newGrid)
      setGeneration(Number(info.generation))
      
      // Show success
      console.log('[GoL] Pattern loaded successfully!')
    } catch (err) {
      console.error('Failed to load pattern:', err)
      setError(`Failed to load pattern: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSigningAction(null)
    }
  }

  // Count live cells
  const liveCells = grid.flat().filter(Boolean).length

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
        <span className="text-text-primary">Game of Life</span>
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
          <p className="text-text-secondary mb-2">Connect your wallet to play on-chain</p>
          <button onClick={openModal} className="btn-primary">Connect Wallet</button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2"
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary">Game of Life</h2>
              <span className="badge badge-primary">
                Stored On-Chain
              </span>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {!isRunning ? (
                <button 
                  onClick={handlePlay} 
                  disabled={!!signingAction}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <PlayIcon className="w-4 h-4" />
                  Play
                </button>
              ) : (
                <button 
                  onClick={handlePause}
                  disabled={!!signingAction}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <PauseIcon className="w-4 h-4" />
                  Pause
                </button>
              )}
              <button
                onClick={handleStep}
                disabled={isRunning || !!signingAction}
                className="btn-secondary disabled:opacity-50"
              >
                Step
              </button>
              <button 
                onClick={handleRandom}
                disabled={!!signingAction}
                className="btn-secondary disabled:opacity-50"
              >
                Random
              </button>
              <button 
                onClick={handleClear}
                disabled={!!signingAction}
                className="btn-ghost text-error disabled:opacity-50"
              >
                Clear
              </button>

              {/* Speed control */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-text-muted">Speed:</span>
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={500 - speed}
                  onChange={(e) => setSpeed(500 - parseInt(e.target.value))}
                  className="w-24"
                />
              </div>
            </div>

            {/* Pattern Loader */}
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-background-dark rounded-lg">
              <span className="text-sm text-text-muted">Pattern:</span>
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value as Pattern)}
                className="bg-background border border-border rounded px-3 py-1 text-sm"
              >
                <option value="Block">Block</option>
                <option value="Blinker">Blinker</option>
                <option value="Glider">Glider</option>
                <option value="Lwss">LWSS Spaceship</option>
                <option value="GliderGun">Glider Gun</option>
                <option value="Random">Random</option>
              </select>
              <button
                onClick={handleLoadPattern}
                disabled={!!signingAction}
                className="btn-primary text-sm disabled:opacity-50"
              >
                Load Pattern
              </button>
            </div>

            {/* Grid */}
            <div
              className="overflow-auto border border-border rounded-lg bg-background-dark p-2"
              style={{ maxHeight: '500px' }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div
                  className="grid gap-px bg-border"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                    width: 'fit-content',
                  }}
                >
                  {grid.map((row, y) =>
                    row.map((cell, x) => (
                      <motion.div
                        key={`${x}-${y}`}
                        onClick={() => toggleCell(x, y)}
                        initial={false}
                        animate={{
                          backgroundColor: cell ? '#f97316' : '#1f2937',
                          scale: cell ? 1 : 0.9,
                          boxShadow: cell ? '0 0 8px rgba(249, 115, 22, 0.5)' : 'none',
                        }}
                        transition={{ duration: 0.1 }}
                        className={`${state === 'ready' && !isRunning && !signingAction ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mt-4 text-sm text-text-muted">
              <span>Generation: {generation}</span>
              <span>Live cells: {liveCells}</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Stored on your Linera microchain
              </span>
            </div>
          </div>
        </motion.div>

        {/* Side Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Instructions */}
          <div className="card p-6">
            <h3 className="font-bold text-text-primary mb-4">How to Play</h3>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex gap-3">
                <span className="text-primary-400">1.</span>
                Click on cells to toggle them alive or dead
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">2.</span>
                Load a pattern or press "Random"
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">3.</span>
                Press "Step" to advance one generation
              </li>
              <li className="flex gap-3">
                <span className="text-primary-400">4.</span>
                Or "Play" for auto-step mode
              </li>
            </ul>
            <p className="text-xs text-text-muted mt-4 p-2 bg-background-dark rounded flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
              </svg>
              Each action is stored on-chain and requires a MetaMask signature
            </p>
          </div>

          {/* Rules */}
          <div className="card p-6">
            <h3 className="font-bold text-text-primary mb-4">Conway's Rules</h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>• Live cell with 2-3 neighbors survives</li>
              <li>• Dead cell with exactly 3 neighbors becomes alive</li>
              <li>• All other cells die or stay dead</li>
            </ul>
          </div>

          {/* Your Stats */}
          {state === 'ready' && profile && (
            <div className="card p-6">
              <h3 className="font-bold text-text-primary mb-4">Your Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-muted">Sessions</span>
                  <span className="font-medium">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Max Generation</span>
                  <span className="font-medium">{generation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">XP Earned</span>
                  <span className="font-medium text-primary-400">+{Math.floor(generation / 10)}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}
