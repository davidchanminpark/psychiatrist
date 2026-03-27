import { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../socket';
import { Events } from 'shared/events.js';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    function handleStateUpdate(state) {
      setGameState(state);
    }
    socket.on(Events.GAME_STATE_UPDATE, handleStateUpdate);
    return () => socket.off(Events.GAME_STATE_UPDATE, handleStateUpdate);
  }, []);

  const resetGame = () => setGameState(null);

  return (
    <GameContext.Provider value={{ gameState, setGameState, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
