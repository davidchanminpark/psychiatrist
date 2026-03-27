import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { usePlayer } from '../context/PlayerContext';
import { Events } from 'shared/events.js';

export default function HomeScreen() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const { savePlayer } = usePlayer();
  const navigate = useNavigate();

  function handleCreate() {
    if (!name.trim()) { setError('Enter your name'); return; }
    setError('');

    if (!socket.connected) socket.connect();

    socket.emit(Events.ROOM_CREATE, { playerName: name.trim() });

    socket.once(Events.ROOM_CREATED, ({ roomCode, playerId, players }) => {
      savePlayer({ playerId, playerName: name.trim(), roomCode, isHost: true });
      navigate(`/lobby/${roomCode}`);
    });

    socket.once(Events.ROOM_ERROR, ({ message }) => {
      setError(message);
    });
  }

  function handleJoin() {
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!roomCode.trim()) { setError('Enter room code'); return; }
    setError('');

    if (!socket.connected) socket.connect();

    socket.emit(Events.ROOM_JOIN, { roomCode: roomCode.trim().toUpperCase(), playerName: name.trim() });

    socket.once(Events.ROOM_JOINED, ({ roomCode: code, playerId, players }) => {
      savePlayer({ playerId, playerName: name.trim(), roomCode: code, isHost: false });
      navigate(`/lobby/${code}`);
    });

    socket.once(Events.ROOM_ERROR, ({ message }) => {
      setError(message);
    });
  }

  return (
    <div className="screen screen-centered">
      <div className="flex-col gap-lg items-center w-full">
        <h1 className="title-main">Psychiatrist</h1>
        <p className="text-muted text-center">The party game where everyone&apos;s a little crazy</p>

        {!mode && (
          <div className="flex-col gap-md w-full animate-fade-in">
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
            <button className="btn btn-primary btn-lg btn-full" onClick={() => setMode('create')}>
              Create Room
            </button>
            <button className="btn btn-secondary btn-lg btn-full" onClick={() => setMode('join')}>
              Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="flex-col gap-md w-full animate-fade-in">
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button className="btn btn-primary btn-lg btn-full" onClick={handleCreate}>
              Let&apos;s Go!
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setMode(null); setError(''); }}>
              Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="flex-col gap-md w-full animate-fade-in">
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
            <input
              className="input"
              placeholder="Room code"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.5rem' }}
              autoFocus
            />
            <button className="btn btn-primary btn-lg btn-full" onClick={handleJoin}>
              Join
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setMode(null); setError(''); }}>
              Back
            </button>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}
