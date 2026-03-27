import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import express from 'express';
import { registerHandlers } from '../socketHandlers.js';
import { Events } from 'shared/events.js';
import { Phase } from 'shared/phases.js';

let httpServer;
let ioServer;
let serverPort;

beforeAll(() => new Promise((resolve) => {
  const app = express();
  httpServer = createServer(app);
  ioServer = new Server(httpServer, { cors: { origin: '*' } });
  ioServer.on('connection', (socket) => registerHandlers(ioServer, socket));
  httpServer.listen(0, () => {
    serverPort = httpServer.address().port;
    resolve();
  });
}));

afterAll(() => new Promise((resolve) => {
  ioServer.close(() => httpServer.close(resolve));
}));

// Helper: connect a socket client
function connect() {
  return ioClient(`http://localhost:${serverPort}`, { autoConnect: true });
}

// Helper: wait for an event on a socket
function waitFor(socket, event, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

// Helper: wait for next GAME_STATE_UPDATE (optionally matching a specific phase)
function waitForState(socket, expectedPhase = null, timeout = 3000) {
  if (!expectedPhase) return waitFor(socket, Events.GAME_STATE_UPDATE, timeout);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for phase ${expectedPhase}`)), timeout);
    function handler(data) {
      if (data.phase === expectedPhase) {
        clearTimeout(timer);
        socket.off(Events.GAME_STATE_UPDATE, handler);
        resolve(data);
      }
      // keep listening if phase doesn't match yet
    }
    socket.on(Events.GAME_STATE_UPDATE, handler);
  });
}

describe('Room: create', () => {
  let client;
  afterEach(() => { if (client?.connected) client.disconnect(); });

  it('creates a room and returns roomCode + playerId', async () => {
    client = connect();
    client.emit(Events.ROOM_CREATE, { playerName: 'Alice' });
    const data = await waitFor(client, Events.ROOM_CREATED);
    expect(data.roomCode).toMatch(/^[A-Z]{4}$/);
    expect(data.playerId).toBeTruthy();
    expect(data.players).toHaveLength(1);
    expect(data.players[0].name).toBe('Alice');
  });
});

describe('Room: join', () => {
  let host, guest;
  afterEach(() => {
    if (host?.connected) host.disconnect();
    if (guest?.connected) guest.disconnect();
  });

  it('second player joins and both receive updates', async () => {
    host = connect();
    host.emit(Events.ROOM_CREATE, { playerName: 'Host' });
    const created = await waitFor(host, Events.ROOM_CREATED);

    // Host receives player_joined when guest joins
    const hostGuestPromise = waitFor(host, Events.ROOM_PLAYER_JOINED);

    guest = connect();
    guest.emit(Events.ROOM_JOIN, { roomCode: created.roomCode, playerName: 'Guest' });
    const joined = await waitFor(guest, Events.ROOM_JOINED);

    expect(joined.roomCode).toBe(created.roomCode);
    expect(joined.playerId).toBeTruthy();
    expect(joined.players).toHaveLength(2);

    const hostNotified = await hostGuestPromise;
    expect(hostNotified.name).toBe('Guest');
  });

  it('returns error for invalid room code', async () => {
    guest = connect();
    guest.emit(Events.ROOM_JOIN, { roomCode: 'ZZZZ', playerName: 'Ghost' });
    const err = await waitFor(guest, Events.ROOM_ERROR);
    expect(err.message).toBe('Room not found');
  });
});

describe('Room: rejoin', () => {
  let host, guest;
  afterEach(() => {
    if (host?.connected) host.disconnect();
    if (guest?.connected) guest.disconnect();
  });

  it('rejoins and receives current game state', async () => {
    host = connect();
    host.emit(Events.ROOM_CREATE, { playerName: 'Host' });
    const created = await waitFor(host, Events.ROOM_CREATED);

    // Disconnect and reconnect with same playerId
    const newSocket = connect();
    newSocket.emit(Events.ROOM_REJOIN, {
      roomCode: created.roomCode,
      playerId: created.playerId,
    });
    const state = await waitForState(newSocket);
    expect(state.roomCode).toBe(created.roomCode);
    expect(state.phase).toBe(Phase.LOBBY);
    newSocket.disconnect();
  });

  it('rejoin with unknown playerId returns error', async () => {
    host = connect();
    host.emit(Events.ROOM_CREATE, { playerName: 'Host' });
    const created = await waitFor(host, Events.ROOM_CREATED);

    const stranger = connect();
    stranger.emit(Events.ROOM_REJOIN, {
      roomCode: created.roomCode,
      playerId: 'fake_player_id',
    });
    const err = await waitFor(stranger, Events.ROOM_ERROR);
    expect(err.message).toBe('Player not found in room');
    stranger.disconnect();
  });
});

describe('Lobby: settings update', () => {
  let host, guest;
  afterEach(() => {
    if (host?.connected) host.disconnect();
    if (guest?.connected) guest.disconnect();
  });

  it('host can update settings and all players receive update', async () => {
    host = connect();
    host.emit(Events.ROOM_CREATE, { playerName: 'Host' });
    await waitFor(host, Events.ROOM_CREATED);

    guest = connect();
    // Need to get room code first
    host.emit(Events.ROOM_CREATE, { playerName: 'Host2' }); // new room
    const created = await waitFor(host, Events.ROOM_CREATED);

    guest.emit(Events.ROOM_JOIN, { roomCode: created.roomCode, playerName: 'Guest' });
    await waitFor(guest, Events.ROOM_JOINED);

    const guestSettingsPromise = waitFor(guest, Events.LOBBY_SETTINGS_UPDATED);
    host.emit(Events.LOBBY_UPDATE_SETTINGS, { variant: 'crazy_patient' });
    const updated = await guestSettingsPromise;
    expect(updated.variant).toBe('crazy_patient');
  });
});

describe('Lobby: custom symptoms', () => {
  let host;
  afterEach(() => { if (host?.connected) host.disconnect(); });

  it('player can submit a custom symptom', async () => {
    host = connect();
    host.emit(Events.ROOM_CREATE, { playerName: 'Host' });
    await waitFor(host, Events.ROOM_CREATED);

    const added = waitFor(host, Events.LOBBY_SYMPTOM_ADDED);
    host.emit(Events.LOBBY_SUBMIT_SYMPTOM, { text: 'You think you are a pirate' });
    const symptom = await added;
    expect(symptom.text).toBe('You think you are a pirate');
    expect(symptom.id).toBeTruthy();
  });
});

describe('Game: start with 3 players', () => {
  let sockets;
  let roomCode;
  let hostPlayerId;

  beforeEach(async () => {
    sockets = [connect(), connect(), connect()];
    sockets[0].emit(Events.ROOM_CREATE, { playerName: 'Host' });
    const created = await waitFor(sockets[0], Events.ROOM_CREATED);
    roomCode = created.roomCode;
    hostPlayerId = created.playerId;

    for (let i = 1; i < 3; i++) {
      sockets[i].emit(Events.ROOM_JOIN, { roomCode, playerName: `Player${i}` });
      await waitFor(sockets[i], Events.ROOM_JOINED);
    }
  });

  afterEach(() => sockets.forEach(s => { if (s.connected) s.disconnect(); }));

  it('game starts and all players receive SHOWING_ROLES state', async () => {
    const statePromises = sockets.map(s => waitForState(s));
    sockets[0].emit(Events.GAME_START);
    const states = await Promise.all(statePromises);

    for (const state of states) {
      expect(state.phase).toBe(Phase.SHOWING_ROLES);
      expect(state.currentRound).toBe(1);
    }
  });

  it('psychiatrist does not see sharedSymptom in their state', async () => {
    const statePromises = sockets.map(s => waitForState(s));
    sockets[0].emit(Events.GAME_START);
    const states = await Promise.all(statePromises);

    const psychiatristState = states.find(s => s.myRole === 'psychiatrist');
    const patientState = states.find(s => s.myRole === 'patient');

    expect(psychiatristState.sharedSymptom).toBeUndefined();
    expect(patientState.sharedSymptom).toBeTruthy();
  });

  it('game advances to QUESTIONING when all players tap ready', async () => {
    const statePromises = sockets.map(s => waitForState(s));
    sockets[0].emit(Events.GAME_START);
    await Promise.all(statePromises);

    const questioningPromises = sockets.map(s => waitForState(s, Phase.QUESTIONING));
    sockets.forEach(s => s.emit(Events.GAME_READY));
    const states = await Promise.all(questioningPromises);

    for (const state of states) {
      expect(state.phase).toBe(Phase.QUESTIONING);
      expect(state.questionRound).toBe(1);
      expect(state.questioningStartTime).toBeTruthy();
    }
  });
});

describe('Game: cannot start with fewer than 3 players', () => {
  it('returns error when only 2 players try to start', async () => {
    const host = connect();
    const guest = connect();

    host.emit(Events.ROOM_CREATE, { playerName: 'Host' });
    const created = await waitFor(host, Events.ROOM_CREATED);

    guest.emit(Events.ROOM_JOIN, { roomCode: created.roomCode, playerName: 'Guest' });
    await waitFor(guest, Events.ROOM_JOINED);

    const errorPromise = waitFor(host, Events.ROOM_ERROR);
    host.emit(Events.GAME_START);
    const err = await errorPromise;
    expect(err.message).toBeTruthy();

    host.disconnect();
    guest.disconnect();
  });
});

describe('Game: full Classic round (SHOWING_ROLES → QUESTIONING → REVEAL_GUESS → RESULTS)', () => {
  let sockets;
  let roomCode;

  beforeEach(async () => {
    sockets = [connect(), connect(), connect()];
    sockets[0].emit(Events.ROOM_CREATE, { playerName: 'Host' });
    const created = await waitFor(sockets[0], Events.ROOM_CREATED);
    roomCode = created.roomCode;

    for (let i = 1; i < 3; i++) {
      sockets[i].emit(Events.ROOM_JOIN, { roomCode, playerName: `Player${i}` });
      await waitFor(sockets[i], Events.ROOM_JOINED);
    }
  });

  afterEach(() => sockets.forEach(s => { if (s.connected) s.disconnect(); }));

  it('correct guess advances to RESULTS with leaderboard entry', async () => {
    // Start game
    sockets.forEach(s => waitForState(s));
    sockets[0].emit(Events.GAME_START);
    const showingStates = await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));
    expect(showingStates.every(s => s.phase === Phase.SHOWING_ROLES)).toBe(true);

    // All ready → QUESTIONING
    sockets.forEach(s => s.emit(Events.GAME_READY));
    await Promise.all(sockets.map(s => waitForState(s, Phase.QUESTIONING)));

    // Psychiatrist guesses → REVEAL_GUESS
    sockets[0].emit(Events.HOST_PSYCHIATRIST_GUESSES);
    await Promise.all(sockets.map(s => waitForState(s, Phase.REVEAL_GUESS)));

    // Host marks correct → RESULTS
    sockets[0].emit(Events.HOST_MARK_GUESS, { correct: true });
    const resultsStates = await Promise.all(sockets.map(s => waitForState(s, Phase.RESULTS)));

    for (const state of resultsStates) {
      expect(state.phase).toBe(Phase.RESULTS);
      expect(state.sharedSymptom).toBeTruthy();
      expect(state.guessedCorrectly).toBe(true);
      expect(state.guessTime).toBeGreaterThan(0);
      expect(state.leaderboard.bestPsychiatrist).toHaveLength(1);
    }
  });

  it('incorrect guess returns to QUESTIONING', async () => {
    sockets.forEach(s => waitForState(s));
    sockets[0].emit(Events.GAME_START);
    await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    sockets.forEach(s => s.emit(Events.GAME_READY));
    await Promise.all(sockets.map(s => waitForState(s, Phase.QUESTIONING)));

    sockets[0].emit(Events.HOST_PSYCHIATRIST_GUESSES);
    await Promise.all(sockets.map(s => waitForState(s, Phase.REVEAL_GUESS)));

    sockets[0].emit(Events.HOST_MARK_GUESS, { correct: false });
    const backToQuestioning = await Promise.all(sockets.map(s => waitForState(s, Phase.QUESTIONING)));

    for (const state of backToQuestioning) {
      expect(state.phase).toBe(Phase.QUESTIONING);
      expect(state.questionRound).toBe(2);
    }
  });
});

describe('Game: Crazy Patient variant', () => {
  let sockets;
  let roomCode;

  beforeEach(async () => {
    sockets = [connect(), connect(), connect()];
    sockets[0].emit(Events.ROOM_CREATE, { playerName: 'Host' });
    const created = await waitFor(sockets[0], Events.ROOM_CREATED);
    roomCode = created.roomCode;

    for (let i = 1; i < 3; i++) {
      sockets[i].emit(Events.ROOM_JOIN, { roomCode, playerName: `Player${i}` });
      await waitFor(sockets[i], Events.ROOM_JOINED);
    }

    // Set crazy_patient variant
    sockets[0].emit(Events.LOBBY_UPDATE_SETTINGS, { variant: 'crazy_patient' });
    await waitFor(sockets[0], Events.LOBBY_SETTINGS_UPDATED);
  });

  afterEach(() => sockets.forEach(s => { if (s.connected) s.disconnect(); }));

  it('start assigns exactly one crazy patient and one psychiatrist', async () => {
    sockets[0].emit(Events.GAME_START);
    const states = await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    const roles = states.map(s => s.myRole);
    expect(roles).toContain('psychiatrist');
    expect(roles).toContain('crazy_patient');
    expect(roles.filter(r => r === 'crazy_patient')).toHaveLength(1);
    expect(roles.filter(r => r === 'psychiatrist')).toHaveLength(1);
  });

  it('crazy patient sees both sharedSymptom and crazySymptom', async () => {
    sockets[0].emit(Events.GAME_START);
    const states = await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    const crazyState = states.find(s => s.myRole === 'crazy_patient');
    expect(crazyState.sharedSymptom).toBeTruthy();
    expect(crazyState.crazySymptom).toBeTruthy();
  });

  it('regular patient sees only sharedSymptom, not crazySymptom', async () => {
    sockets[0].emit(Events.GAME_START);
    const states = await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    const patientState = states.find(s => s.myRole === 'patient');
    expect(patientState.sharedSymptom).toBeTruthy();
    expect(patientState.crazySymptom).toBeUndefined();
  });

  it('psychiatrist sees neither sharedSymptom nor crazySymptom', async () => {
    sockets[0].emit(Events.GAME_START);
    const states = await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    const pState = states.find(s => s.myRole === 'psychiatrist');
    expect(pState.sharedSymptom).toBeUndefined();
    expect(pState.crazySymptom).toBeUndefined();
  });

  it('correct guess → CRAZY_PATIENT_GUESS phase (not RESULTS)', async () => {
    sockets[0].emit(Events.GAME_START);
    await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    sockets.forEach(s => s.emit(Events.GAME_READY));
    await Promise.all(sockets.map(s => waitForState(s, Phase.QUESTIONING)));

    sockets[0].emit(Events.HOST_PSYCHIATRIST_GUESSES);
    await Promise.all(sockets.map(s => waitForState(s, Phase.REVEAL_GUESS)));

    sockets[0].emit(Events.HOST_MARK_GUESS, { correct: true });
    const cpStates = await Promise.all(sockets.map(s => waitForState(s, Phase.CRAZY_PATIENT_GUESS)));

    for (const state of cpStates) {
      expect(state.phase).toBe(Phase.CRAZY_PATIENT_GUESS);
    }
  });

  it('HOST_MARK_CRAZY_PATIENT caught=true → RESULTS, crazy patient NOT on crazies leaderboard', async () => {
    sockets[0].emit(Events.GAME_START);
    await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    sockets.forEach(s => s.emit(Events.GAME_READY));
    await Promise.all(sockets.map(s => waitForState(s, Phase.QUESTIONING)));

    sockets[0].emit(Events.HOST_PSYCHIATRIST_GUESSES);
    await Promise.all(sockets.map(s => waitForState(s, Phase.REVEAL_GUESS)));

    sockets[0].emit(Events.HOST_MARK_GUESS, { correct: true });
    await Promise.all(sockets.map(s => waitForState(s, Phase.CRAZY_PATIENT_GUESS)));

    sockets[0].emit(Events.HOST_MARK_CRAZY_PATIENT, { caught: true });
    const resultsStates = await Promise.all(sockets.map(s => waitForState(s, Phase.RESULTS)));

    for (const state of resultsStates) {
      expect(state.phase).toBe(Phase.RESULTS);
      expect(state.leaderboard.crazies).toHaveLength(0);
    }
  });

  it('HOST_MARK_CRAZY_PATIENT caught=false → RESULTS, crazy patient on crazies leaderboard', async () => {
    sockets[0].emit(Events.GAME_START);
    await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    sockets.forEach(s => s.emit(Events.GAME_READY));
    await Promise.all(sockets.map(s => waitForState(s, Phase.QUESTIONING)));

    sockets[0].emit(Events.HOST_PSYCHIATRIST_GUESSES);
    await Promise.all(sockets.map(s => waitForState(s, Phase.REVEAL_GUESS)));

    sockets[0].emit(Events.HOST_MARK_GUESS, { correct: true });
    await Promise.all(sockets.map(s => waitForState(s, Phase.CRAZY_PATIENT_GUESS)));

    sockets[0].emit(Events.HOST_MARK_CRAZY_PATIENT, { caught: false });
    const resultsStates = await Promise.all(sockets.map(s => waitForState(s, Phase.RESULTS)));

    for (const state of resultsStates) {
      expect(state.phase).toBe(Phase.RESULTS);
      expect(state.leaderboard.crazies).toHaveLength(1);
      expect(state.leaderboard.crazies[0].crazySymptom).toBeTruthy();
    }
  });

  it('RESULTS reveals crazy patient identity and crazySymptom to all players', async () => {
    sockets[0].emit(Events.GAME_START);
    await Promise.all(sockets.map(s => waitForState(s, Phase.SHOWING_ROLES)));

    sockets.forEach(s => s.emit(Events.GAME_READY));
    await Promise.all(sockets.map(s => waitForState(s, Phase.QUESTIONING)));

    sockets[0].emit(Events.HOST_PSYCHIATRIST_GUESSES);
    await Promise.all(sockets.map(s => waitForState(s, Phase.REVEAL_GUESS)));

    sockets[0].emit(Events.HOST_MARK_GUESS, { correct: true });
    await Promise.all(sockets.map(s => waitForState(s, Phase.CRAZY_PATIENT_GUESS)));

    sockets[0].emit(Events.HOST_MARK_CRAZY_PATIENT, { caught: false });
    const resultsStates = await Promise.all(sockets.map(s => waitForState(s, Phase.RESULTS)));

    // Everyone in RESULTS sees the full reveal
    for (const state of resultsStates) {
      expect(state.crazyPatientId).toBeTruthy();
      expect(state.crazyPatientName).toBeTruthy();
      expect(state.crazySymptom).toBeTruthy();
      expect(state.sharedSymptom).toBeTruthy();
    }
  });
});

describe('Disconnect: player disconnect notifies room', () => {
  it('other players notified when player leaves', async () => {
    const host = connect();
    const guest = connect();

    host.emit(Events.ROOM_CREATE, { playerName: 'Host' });
    const created = await waitFor(host, Events.ROOM_CREATED);

    guest.emit(Events.ROOM_JOIN, { roomCode: created.roomCode, playerName: 'Guest' });
    await waitFor(guest, Events.ROOM_JOINED);

    const leftPromise = waitFor(host, Events.ROOM_PLAYER_LEFT);
    guest.disconnect();
    const leftData = await leftPromise;
    expect(leftData.playerId).toBeTruthy();

    host.disconnect();
  });
});
