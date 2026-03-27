import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../socket';
import { usePlayer } from '../context/PlayerContext';
import { useGame } from '../context/GameContext';
import { Events } from 'shared/events.js';
import { Phase } from 'shared/phases.js';
import { formatTime } from '../hooks/useCountdown';

const DEFAULT_SYMPTOM_PLACEHOLDERS = [
  'You can only whisper',
  'You are a car salesman',
  'You are sad',
];

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
            className="btn btn-warning btn-sm"
            onClick={() => socket.emit(Events.HOST_PSYCHIATRIST_GUESSES)}
          >
            Psychiatrist Guesses
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => socket.emit(Events.HOST_GIVE_UP)}
          >
            Give Up
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
  const { leaderboard } = gameState;
  const isCrazy = gameState.settings?.variant === 'crazy_patient';
  const showSubmit = gameState.settings?.symptomSource === 'custom' || gameState.settings?.symptomSource === 'mixed';
  const [symptomInput, setSymptomInput] = useState('');
  const [submitted, setSubmitted] = useState([]);
  const symptomPlaceholder = useMemo(() => {
    return DEFAULT_SYMPTOM_PLACEHOLDERS[
      Math.floor(Math.random() * DEFAULT_SYMPTOM_PLACEHOLDERS.length)
    ];
  }, []);

  // Build steps: psychiatrist → symptom → crazy (if variant) → leaderboard
  const steps = ['psychiatrist', 'symptom'];
  if (isCrazy) steps.push('crazy');
  steps.push('leaderboard');

  const step = gameState.resultsStep ?? 0;
  const currentStep = steps[Math.min(step, steps.length - 1)];

  function advance() {
    socket.emit(Events.HOST_ADVANCE_RESULTS);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const text = symptomInput.trim();
    if (!text) return;
    socket.emit(Events.LOBBY_SUBMIT_SYMPTOM, { text });
    setSubmitted(prev => [...prev, text]);
    setSymptomInput('');
  }

  return (
    <div className="flex-col gap-lg items-center text-center animate-fade-in">

      {currentStep === 'psychiatrist' && (
        <div className="flex-col gap-lg items-center w-full animate-bounce-in">
          <h2>Results</h2>
          <div className="card">
            <p className="text-muted" style={{ marginBottom: 4 }}>Psychiatrist: {gameState.psychiatristName}</p>
            {gameState.guessedCorrectly ? (
              <p style={{ color: 'var(--accent-green)', fontWeight: 800, fontSize: '1.2rem' }}>Guessed right!</p>
            ) : (
              <p style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '1.2rem' }}>We give up...</p>
            )}
          </div>
          {gameState.isHost && (
            <button className="btn btn-primary btn-lg btn-full" onClick={advance}>
              Reveal Condition
            </button>
          )}
        </div>
      )}

      {currentStep === 'symptom' && (
        <div className="flex-col gap-lg items-center w-full animate-bounce-in">
          <h2>The Condition</h2>
          <div className="card">
            <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>{gameState.sharedSymptom}</p>
            {gameState.guessedCorrectly && (
              <p className="text-muted mt-sm" style={{ fontSize: '0.9rem' }}>
                {gameState.psychiatristName} took {formatTime(gameState.guessTime)} to figure it out
              </p>
            )}
          </div>
          {gameState.isHost && (
            <button className="btn btn-primary btn-lg btn-full" onClick={advance}>
              {isCrazy ? 'Guess the Crazy Patient' : 'See Leaderboard'}
            </button>
          )}
        </div>
      )}

      {currentStep === 'crazy' && (
        <div className="flex-col gap-lg items-center w-full animate-bounce-in">
          {gameState.crazyPatientId ? (
            <>
              <h2>The Crazy Patient</h2>
              <div className="card">
                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {gameState.crazyPatientName}
                </p>
                <p className="text-muted mt-sm">Extra condition: {gameState.crazySymptom}</p>
              </div>
            </>
          ) : (
            <>
              <h2>No Crazy Patient!</h2>
              <div className="card">
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                  There was no Crazy Patient this round!
                </p>
                <p className="text-muted mt-sm">You were all normal patients.</p>
              </div>
            </>
          )}
          {gameState.isHost && (
            <button className="btn btn-primary btn-lg btn-full" onClick={advance}>
              See Leaderboard
            </button>
          )}
        </div>
      )}

      {currentStep === 'leaderboard' && (
        <div className="flex-col gap-lg items-center w-full animate-fade-in">
          <h2>Leaderboard</h2>

          {leaderboard?.bestPsychiatrist?.length > 0 && (
            <div className="card" style={{ width: '100%' }}>
              <h3 className="mb-md" style={{ color: 'var(--accent-blue)' }}>Psychiatrists Leaderboard</h3>
              <div className="flex-col gap-sm">
                {leaderboard.bestPsychiatrist.map((entry, i) => (
                  <div key={entry.time} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{i + 1}. {entry.playerName}</span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>{formatTime(entry.time)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {leaderboard?.crazies?.length > 0 && (
            <div className="card" style={{ width: '100%' }}>
              <h3 className="mb-md" style={{ color: 'var(--accent-primary)' }}>Craziest Patients</h3>
              <div className="flex-col gap-sm">
                {leaderboard.crazies.map((entry) => (
                  <div key={entry.crazySymptom} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{entry.playerName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSubmit && (
            <div className="card" style={{ width: '100%' }}>
              <h3 className="mb-md">Add a symptom for future rounds</h3>
              <form onSubmit={handleSubmit} className="flex-row gap-sm mb-sm">
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder={symptomPlaceholder}
                  value={symptomInput}
                  onChange={e => setSymptomInput(e.target.value)}
                  maxLength={80}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!symptomInput.trim()}>
                  Add
                </button>
              </form>
              {submitted.length > 0 && (
                <div className="flex-col gap-sm mt-sm">
                  {submitted.map((text, i) => (
                    <p key={i} className="text-muted" style={{ fontSize: '0.85rem' }}>✓ {text}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {gameState.isHost ? (
            <div className="flex-col gap-sm w-full">
              <button className="btn btn-primary btn-lg btn-full" onClick={() => socket.emit(Events.HOST_END_ROUND)}>
                Next Round
              </button>
              <button className="btn btn-danger btn-sm btn-full" onClick={() => socket.emit(Events.HOST_END_GAME)}>
                End Game
              </button>
            </div>
          ) : (
            <p className="text-muted">Waiting for host to continue...</p>
          )}
        </div>
      )}

    </div>
  );
}
