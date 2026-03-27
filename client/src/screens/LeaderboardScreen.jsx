import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../socket';
import { usePlayer } from '../context/PlayerContext';
import { useGame } from '../context/GameContext';
import { Events } from 'shared/events.js';
import { Phase } from 'shared/phases.js';
import { formatTime } from '../hooks/useCountdown';

const RANK_CLASSES = ['gold', 'silver', 'bronze'];
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { roomCode } = useParams();
  const { player, clearPlayer } = usePlayer();
  const { gameState, resetGame } = useGame();
  const navigate = useNavigate();

  // Reconnect if needed
  useEffect(() => {
    if (player && !socket.connected) {
      socket.connect();
      socket.emit(Events.ROOM_REJOIN, {
        roomCode: player.roomCode,
        playerId: player.playerId,
      });
    }
  }, [player]);

  // Navigate all clients back to lobby when host resets
  useEffect(() => {
    if (gameState?.phase === Phase.LOBBY) {
      navigate(`/lobby/${roomCode}`);
    }
  }, [gameState?.phase, roomCode, navigate]);

  function handlePlayAgain() {
    socket.emit(Events.HOST_RESET_LOBBY);
  }

  function handleHome() {
    resetGame();
    clearPlayer();
    socket.disconnect();
    navigate('/');
  }

  if (!gameState) {
    return (
      <div className="screen screen-centered">
        <p className="text-muted">Loading results...</p>
      </div>
    );
  }

  const { leaderboard, settings } = gameState;
  const isCrazyVariant = settings?.variant === 'crazy_patient';

  return (
    <div className="screen">
      <div className="flex-col gap-lg items-center w-full animate-fade-in">
        <h1 className="title-main" style={{ textAlign: 'center' }}>Game Over!</h1>

        {/* Best Psychiatrist Leaderboard */}
        <div className="card">
          <h3 className="mb-md" style={{ color: 'var(--accent-blue)' }}>
            Psychiatrists Leaderboard
          </h3>
          {leaderboard.bestPsychiatrist.length === 0 ? (
            <p className="text-muted">No correct guesses this game!</p>
          ) : (
            leaderboard.bestPsychiatrist.map((entry, i) => (
              <div key={`${entry.playerId}-${entry.time}`} className="leaderboard-entry">
                <span className={`leaderboard-rank ${RANK_CLASSES[i] || ''}`}>
                  {RANK_MEDALS[i] || `#${i + 1}`}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700 }}>{entry.playerName}</p>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                    guessed in {formatTime(entry.time)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Crazy Patient Leaderboard */}
        {isCrazyVariant && (
          <div className="card">
            <h3 className="mb-md" style={{ color: 'var(--accent-primary)' }}>
              Craziest Patients
            </h3>
            {leaderboard.crazies.length === 0 ? (
              <p className="text-muted">Every crazy patient was caught!</p>
            ) : (
              leaderboard.crazies.map((entry, i) => (
                <div key={`${entry.playerId}-${i}`} className="leaderboard-entry">
                  <span className={`leaderboard-rank ${RANK_CLASSES[i] || ''}`}>
                    {RANK_MEDALS[i] || `#${i + 1}`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700 }}>{entry.playerName}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex-col gap-md w-full">
          {gameState.isHost ? (
            <button className="btn btn-primary btn-full" onClick={handlePlayAgain}>
              Play Again
            </button>
          ) : (
            <p className="text-muted" style={{ textAlign: 'center' }}>Waiting for host to start a new game...</p>
          )}
          <button className="btn btn-secondary btn-full" onClick={handleHome}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
