import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlayerProvider } from './context/PlayerContext';
import { GameProvider } from './context/GameContext';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <PlayerProvider>
        <GameProvider>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/lobby/:roomCode" element={<LobbyScreen />} />
          </Routes>
        </GameProvider>
      </PlayerProvider>
    </BrowserRouter>
  );
}
