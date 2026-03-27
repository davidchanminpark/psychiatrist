import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlayerProvider } from './context/PlayerContext';
import { GameProvider } from './context/GameContext';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <PlayerProvider>
        <GameProvider>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/lobby/:roomCode" element={<LobbyScreen />} />
            <Route path="/game/:roomCode" element={<GameScreen />} />
            <Route path="/leaderboard/:roomCode" element={<LeaderboardScreen />} />
          </Routes>
        </GameProvider>
      </PlayerProvider>
    </BrowserRouter>
  );
}
