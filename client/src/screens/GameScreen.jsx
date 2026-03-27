import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../socket';
import { usePlayer } from '../context/PlayerContext';
import { useGame } from '../context/GameContext';
import { Events } from 'shared/events.js';
import { Phase } from 'shared/phases.js';
import { formatTime } from '../hooks/useCountdown';

function RoleReveal({ gameState, onReady }) {
  const { myRole, sharedSymptom, crazySymptom, psychiatristName } = gameState;

  const roleLabels = {
    psychiatrist: 'The Psychiatrist',
    patient: 'Patient',
    crazy_patient: 'The Crazy Patient',
  };

  const roleColors = {
    psychiatrist: 'var(--accent-blue)',
    patient: 'var(--accent-green)',
    crazy_patient: 'var(--accent-primary)',
  };

  return (
    <div className="flex-col gap-lg items-center text-center animate-bounce-in">
      <h2 style={{ color: roleColors[myRole], fontSize: '2rem' }}>
        {roleLabels[myRole]}
      </h2>

      {myRole === 'psychiatrist' && (
        <div className="card">
          <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
            You must figure out what condition all the patients share.
            Ask them questions and observe their behavior!
          </p>
        </div>
      )}

      {myRole === 'patient' && sharedSymptom && (
        <div className="symptom-card">
          <p className="text-muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>Your condition:</p>
          <p>{sharedSymptom}</p>
        </div>
      )}

      {myRole === 'crazy_patient' && (
        <>
          <div className="symptom-card">
            <p className="text-muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>Shared condition:</p>
            <p>{sharedSymptom}</p>
          </div>
          <div className="symptom-card" style={{ borderColor: 'var(--accent-yellow)' }}>
            <p className="text-muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>Your EXTRA crazy condition:</p>
            <p style={{ color: 'var(--accent-yellow)' }}>{crazySymptom}</p>
          </div>
        </>
      )}

      <p className="text-muted">
        {gameState.readyCount} / {gameState.totalPlayers} ready
      </p>
      <button className="btn btn-primary btn-lg" onClick={onReady}>
        I&apos;m Ready!
      </button>
    </div>
  );
}

function QuestioningView({ gameState }) {
  return (
    <div className="flex-col gap-lg items-center text-center">
      <p className="text-muted">Question Round {gameState.questionRound}</p>

      {gameState.myRole === 'psychiatrist' && (
        <div className="card">
          <h3 style={{ color: 'var(--accent-blue)' }}>You are the Psychiatrist</h3>
          <p className="text-muted mt-sm">
            Ask each patient a question. Watch how they behave!
          </p>
        </div>
      )}

      {gameState.myRole === 'patient' && gameState.sharedSymptom && (
        <div className="symptom-card">
          <p className="text-muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>Act out:</p>
          <p>{gameState.sharedSymptom}</p>
        </div>
      )}

      {gameState.myRole === 'crazy_patient' && (
        <>
          <div className="symptom-card">
            <p className="text-muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>Act out:</p>
            <p>{gameState.sharedSymptom}</p>
          </div>
          <div className="symptom-card" style={{ borderColor: 'var(--accent-yellow)' }}>
            <p className="text-muted" style={{ marginBottom: 8, fontSize: '0.85rem' }}>Plus your extra:</p>
            <p style={{ color: 'var(--accent-yellow)' }}>{gameState.crazySymptom}</p>
          </div>
        </>
      )}
    </div>
  );
}

function RevealGuessView({ gameState }) {
  return (
    <div className="flex-col gap-lg items-center text-center animate-bounce-in">
      <h2 style={{ color: 'var(--accent-yellow)' }}>The Psychiatrist is Guessing!</h2>
      <p className="text-muted">
        {gameState.psychiatristName} thinks they know the condition...
      </p>
      {gameState.isHost && (
        <p className="text-muted">Use the controls below to mark correct or incorrect.</p>
      )}
    </div>
  );
}

function CrazyPatientGuessView({ gameState }) {
  return (
    <div className="flex-col gap-lg items-center text-center animate-bounce-in">
      <h2 style={{ color: 'var(--accent-primary)' }}>Who&apos;s the Crazy Patient?</h2>
      <p className="text-muted">
        Discuss as a group — who had the extra condition?
      </p>
      {gameState.isHost && (
        <p className="text-muted">Mark if the group caught the crazy patient below.</p>
      )}
    </div>
  );
}

function HostControls({ gameState }) {
  if (!gameState.isHost) return null;

  const { phase } = gameState;

  return (
    <div className="host-controls">
      {phase === Phase.QUESTIONING && (
        <>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => socket.emit(Events.HOST_NEXT_QUESTION_ROUND)}
          >
            Next Question
          </button>
          <button
            className="btn btn-warning btn-sm"
            onClick={() => socket.emit(Events.HOST_PSYCHIATRIST_GUESSES)}
          >
            Psychiatrist Guesses
          </button>
        </>
      )}

      {phase === Phase.REVEAL_GUESS && (
        <>
          <button
            className="btn btn-success btn-sm"
            onClick={() => socket.emit(Events.HOST_MARK_GUESS, { correct: true })}
          >
            Correct!
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => socket.emit(Events.HOST_MARK_GUESS, { correct: false })}
          >
            Wrong
          </button>
        </>
      )}

      {phase === Phase.CRAZY_PATIENT_GUESS && (
        <>
          <button
            className="btn btn-success btn-sm"
            onClick={() => socket.emit(Events.HOST_MARK_CRAZY_PATIENT, { caught: true })}
          >
            Caught!
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => socket.emit(Events.HOST_MARK_CRAZY_PATIENT, { caught: false })}
          >
            Not Caught
          </button>
        </>
      )}

      {phase === Phase.RESULTS && (
        <>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => socket.emit(Events.HOST_END_ROUND)}
          >
            Next Round
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => socket.emit(Events.HOST_END_GAME)}
          >
            End Game
          </button>
        </>
      )}
    </div>
  );
}

export default function GameScreen() {
  const { roomCode } = useParams();
  const { player } = usePlayer();
  const { gameState } = useGame();
  const navigate = useNavigate();

  // Reconnect logic
  useEffect(() => {
    if (player && !socket.connected) {
      socket.connect();
      socket.emit(Events.ROOM_REJOIN, {
        roomCode: player.roomCode,
        playerId: player.playerId,
      });
    }
  }, [player]);

  // Navigate on phase changes
  useEffect(() => {
    if (gameState?.phase === Phase.END_GAME) {
      navigate(`/leaderboard/${roomCode}`);
    }
  }, [gameState?.phase, roomCode, navigate]);

  if (!gameState) {
    return (
      <div className="screen screen-centered">
        <p className="text-muted">Connecting...</p>
      </div>
    );
  }

  function handleReady() {
    socket.emit(Events.GAME_READY);
  }

  return (
    <div className="screen" style={{ paddingBottom: gameState.isHost ? 80 : 20 }}>
      {gameState.phase === Phase.SHOWING_ROLES && (
        <RoleReveal gameState={gameState} onReady={handleReady} />
      )}
      {gameState.phase === Phase.QUESTIONING && (
        <QuestioningView gameState={gameState} />
      )}
      {gameState.phase === Phase.REVEAL_GUESS && (
        <RevealGuessView gameState={gameState} />
      )}
      {gameState.phase === Phase.CRAZY_PATIENT_GUESS && (
        <CrazyPatientGuessView gameState={gameState} />
      )}
      {gameState.phase === Phase.RESULTS && (
        <ResultsView gameState={gameState} />
      )}
      <HostControls gameState={gameState} />
    </div>
  );
}

function ResultsView({ gameState }) {
  return (
    <div className="flex-col gap-lg items-center text-center animate-fade-in">
      <h2>Round {gameState.currentRound} Results</h2>

      <div className="card">
        <p className="text-muted" style={{ marginBottom: 4 }}>The condition was:</p>
        <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{gameState.sharedSymptom}</p>
      </div>

      <div className="card">
        <p className="text-muted" style={{ marginBottom: 4 }}>Psychiatrist: {gameState.psychiatristName}</p>
        {gameState.guessedCorrectly ? (
          <p style={{ color: 'var(--accent-green)', fontWeight: 800 }}>
            Guessed correctly in {formatTime(gameState.guessTime)}!
          </p>
        ) : (
          <p style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>
            Couldn&apos;t figure it out!
          </p>
        )}
      </div>

      {gameState.crazyPatientId && (
        <div className="card">
          <p className="text-muted" style={{ marginBottom: 4 }}>The Crazy Patient was:</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {gameState.crazyPatientName}
          </p>
          <p className="text-muted mt-sm">Extra condition: {gameState.crazySymptom}</p>
        </div>
      )}

      {!gameState.isHost && (
        <p className="text-muted">Waiting for host to continue...</p>
      )}
    </div>
  );
}
