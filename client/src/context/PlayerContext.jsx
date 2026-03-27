import { createContext, useContext, useState, useCallback } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [player, setPlayer] = useState(() => {
    const stored = sessionStorage.getItem('psychiatrist_player');
    return stored ? JSON.parse(stored) : null;
  });

  const savePlayer = useCallback((data) => {
    setPlayer(data);
    sessionStorage.setItem('psychiatrist_player', JSON.stringify(data));
  }, []);

  const clearPlayer = useCallback(() => {
    setPlayer(null);
    sessionStorage.removeItem('psychiatrist_player');
  }, []);

  return (
    <PlayerContext.Provider value={{ player, savePlayer, clearPlayer }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
}
