import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { WalletProvider } from './contexts/WalletContext'
import { GameGol } from './routes/GameGol'
import { GamePredictionPulse } from './routes/GamePredictionPulse'
import { Games } from './routes/Games'
import { Home } from './routes/Home'
import { Profile } from './routes/Profile'

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
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </WalletProvider>
  )
}

export default App
