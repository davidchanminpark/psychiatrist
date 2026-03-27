import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../socket';
import { usePlayer } from '../context/PlayerContext';
import { useGame } from '../context/GameContext';
import { Events } from 'shared/events.js';
import { Phase } from 'shared/phases.js';

export default function LobbyScreen() {
  const { roomCode } = useParams();
  const { player } = usePlayer();
  const { gameState } = useGame();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({
    variant: 'classic',
    symptomSource: 'builtin',
  });
  const [customSymptoms, setCustomSymptoms] = useState([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [error, setError] = useState('');

  const isHost = player?.isHost;

  // Listen for player join/leave
  useEffect(() => {
    function onPlayerJoined(p) {
      setPlayers(prev => {
        if (prev.find(x => x.id === p.id)) return prev;
        return [...prev, p];
      });
    }
    function onPlayerLeft({ playerId }) {
      setPlayers(prev => prev.map(p =>
        p.id === playerId ? { ...p, connected: false } : p
      ));
    }
    function onSettingsUpdated(s) {
      setSettings(s);
    }
    function onError({ message }) {
      setError(message);
    }
    function onSymptomAdded(symptom) {
      setCustomSymptoms(prev => [...prev, symptom]);
    }
    function onSymptomRemoved({ id }) {
      setCustomSymptoms(prev => prev.filter(s => s.id !== id));
    }

    socket.on(Events.ROOM_PLAYER_JOINED, onPlayerJoined);
    socket.on(Events.ROOM_PLAYER_LEFT, onPlayerLeft);
    socket.on(Events.LOBBY_SETTINGS_UPDATED, onSettingsUpdated);
    socket.on(Events.ROOM_ERROR, onError);
    socket.on(Events.LOBBY_SYMPTOM_ADDED, onSymptomAdded);
    socket.on(Events.LOBBY_SYMPTOM_REMOVED, onSymptomRemoved);

    return () => {
      socket.off(Events.ROOM_PLAYER_JOINED, onPlayerJoined);
      socket.off(Events.ROOM_PLAYER_LEFT, onPlayerLeft);
      socket.off(Events.LOBBY_SETTINGS_UPDATED, onSettingsUpdated);
      socket.off(Events.ROOM_ERROR, onError);
      socket.off(Events.LOBBY_SYMPTOM_ADDED, onSymptomAdded);
      socket.off(Events.LOBBY_SYMPTOM_REMOVED, onSymptomRemoved);
    };
  }, []);

  // Try to rejoin if we have session data but socket isn't set up
  useEffect(() => {
    if (player && !socket.connected) {
      socket.connect();
    }
    if (player && socket.connected) {
      // If we have a room state already, we may have reconnected
      socket.emit(Events.ROOM_REJOIN, {
        roomCode: player.roomCode,
        playerId: player.playerId,
      });
    }
  }, [player]);

  // Navigate to game when phase changes from LOBBY
  useEffect(() => {
    if (gameState && gameState.phase !== Phase.LOBBY) {
      navigate(`/game/${roomCode}`);
    }
    if (gameState && gameState.players) {
      setPlayers(gameState.players);
    }
    if (gameState && gameState.customSymptoms) {
      setCustomSymptoms(gameState.customSymptoms);
    }
  }, [gameState, roomCode, navigate]);

  // Initial player list from join/create
  useEffect(() => {
    if (players.length === 0 && player) {
      // We need at least ourselves
      setPlayers([{ id: player.playerId, name: player.playerName, connected: true }]);
    }
  }, [player, players.length]);

  function handleStartGame() {
    socket.emit(Events.GAME_START);
  }

  function handleSettingChange(key, value) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    socket.emit(Events.LOBBY_UPDATE_SETTINGS, { [key]: value });
  }

  function handleAddSymptom(e) {
    e.preventDefault();
    const text = symptomInput.trim();
    if (!text) return;
    socket.emit(Events.LOBBY_SUBMIT_SYMPTOM, { text });
    setSymptomInput('');
  }

  function handleRemoveSymptom(id) {
    socket.emit(Events.LOBBY_REMOVE_SYMPTOM, { id });
  }

  const connectedCount = players.filter(p => p.connected).length;
  const showCustomSymptoms = settings.symptomSource === 'custom' || settings.symptomSource === 'mixed';

  return (
    <div className="screen">
      <div className="flex-col gap-lg items-center w-full">
        <h2>Room</h2>
        <div className="room-code">{roomCode}</div>
        <p className="text-muted">Share this code with your friends!</p>

        {/* Players */}
        <div className="card">
          <h3 className="mb-md">Players ({connectedCount})</h3>
          <div className="flex-col gap-sm">
            {players.map(p => (
              <div
                key={p.id}
                className={`player-chip ${p.id === player?.playerId && isHost ? 'host' : ''} ${!p.connected ? 'disconnected' : ''}`}
              >
                <span>{p.name}</span>
                {p.id === player?.playerId && isHost && (
                  <span className="badge badge-yellow">Host</span>
                )}
                {!p.connected && <span className="badge badge-accent">Away</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Settings (host only) */}
        {isHost && (
          <div className="card animate-fade-in">
            <h3 className="mb-md">Game Settings</h3>
            <div className="flex-col gap-md">
              <div>
                <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>
                  Game Mode
                </label>
                <div className="flex-row gap-sm">
                  <button
                    className={`btn btn-sm ${settings.variant === 'classic' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSettingChange('variant', 'classic')}
                  >
                    Classic
                  </button>
                  <button
                    className={`btn btn-sm ${settings.variant === 'crazy_patient' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSettingChange('variant', 'crazy_patient')}
                  >
                    Crazy Patient
                  </button>
                </div>
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>
                  Symptoms
                </label>
                <div className="flex-row gap-sm flex-wrap">
                  {['builtin', 'custom', 'mixed'].map(src => (
                    <button
                      key={src}
                      className={`btn btn-sm ${settings.symptomSource === src ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleSettingChange('symptomSource', src)}
                    >
                      {src === 'builtin' ? 'Bank' : src === 'custom' ? 'Custom' : 'Mixed'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Non-host sees settings */}
        {!isHost && (
          <div className="card">
            <h3 className="mb-md">Game Settings</h3>
            <p className="text-muted">
              Mode: <strong>{settings.variant === 'classic' ? 'Classic' : 'Crazy Patient'}</strong>
            </p>
            <p className="text-muted mt-sm">Waiting for host to start...</p>
          </div>
        )}

        {/* Custom symptoms */}
        {showCustomSymptoms && (
          <div className="card animate-fade-in">
            <h3 className="mb-md">Custom Symptoms ({customSymptoms.length})</h3>
            <form onSubmit={handleAddSymptom} className="flex-row gap-sm mb-md">
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Add a symptom..."
                value={symptomInput}
                onChange={e => setSymptomInput(e.target.value)}
                maxLength={80}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={!symptomInput.trim()}>
                Add
              </button>
            </form>
            {customSymptoms.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>No custom symptoms yet.</p>
            ) : (
              <div className="flex-col gap-sm">
                {customSymptoms.map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--border-radius-sm)',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: '0.9rem' }}>{s.text}</span>
                    {isHost && (
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        onClick={() => handleRemoveSymptom(s.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        {/* Start button (host only) */}
        {isHost && (
          <button
            className="btn btn-success btn-lg btn-full"
            onClick={handleStartGame}
            disabled={connectedCount < 3}
          >
            {connectedCount < 3 ? `Need ${3 - connectedCount} more players` : 'Start Game'}
          </button>
        )}
      </div>
    </div>
  );
}
