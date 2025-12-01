import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { WalletProvider } from './contexts/WalletContext'
import { GameGol } from './routes/GameGol'
import { GameMemeAuction } from './routes/GameMemeAuction'
import { GamePredictionPulse } from './routes/GamePredictionPulse'
import { GameTypingArena } from './routes/GameTypingArena'
import { Games } from './routes/Games'
import { Home } from './routes/Home'
import { Profile } from './routes/Profile'
import { SeasonsAndQuests } from './routes/SeasonsAndQuests'

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/gol" element={<GameGol />} />
            <Route path="/games/prediction-pulse" element={<GamePredictionPulse />} />
            <Route path="/games/meme-auction" element={<GameMemeAuction />} />
            <Route path="/games/typing-arena" element={<GameTypingArena />} />
            <Route path="/seasons" element={<SeasonsAndQuests />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </WalletProvider>
  )
}

export default App
