import { Phase } from 'shared/phases.js';

const rooms = new Map();

const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // exclude I, O, L

function generateCode() {
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not generate unique room code');
}

export function createRoom(playerName, socketId) {
  const roomCode = generateCode();
  const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const player = {
    id: playerId,
    name: playerName,
    socketId,
    connected: true,
    avatarIndex: 0,
  };

  const room = {
    roomCode,
    hostId: playerId,
    players: [player],
    settings: {
      variant: 'classic',
      symptomSource: 'builtin',
      maxQuestionRounds: 10,
      bluffChance: 0.3,
    },
    customSymptoms: [],
    phase: Phase.LOBBY,
    questionRound: 0,
    psychiatristId: null,
    crazyPatientId: null,
    sharedSymptom: null,
    crazySymptom: null,
    readyPlayers: new Set(),
    questioningStartTime: null,
    guessTime: null,
    resultsStep: 0,
    psychiatristOrder: [],
    psychiatristIndex: 0,
    usedSymptoms: new Set(),
    leaderboard: {
      bestPsychiatrist: [], // { playerId, playerName, time }
      crazies: [],          // { playerId, playerName, crazySymptom }
    },
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  rooms.set(roomCode, room);
  return { room, playerId };
}

export function joinRoom(roomCode, playerName, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== Phase.LOBBY) return { error: 'Game already in progress' };
  if (room.players.length >= 20) return { error: 'Room is full' };

  const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const player = {
    id: playerId,
    name: playerName,
    socketId,
    connected: true,
    avatarIndex: room.players.length,
  };

  room.players.push(player);
  room.lastActivity = Date.now();
  return { room, playerId, player };
}

export function rejoinRoom(roomCode, playerId, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found in room' };

  player.socketId = socketId;
  player.connected = true;
  room.lastActivity = Date.now();
  return { room, player };
}

export function disconnectPlayer(socketId) {
  for (const [, room] of rooms) {
    const player = room.players.find(p => p.socketId === socketId);
    if (player) {
      player.connected = false;
      room.lastActivity = Date.now();
      return { room, player };
    }
  }
  return null;
}

export function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

export function deleteRoom(roomCode) {
  rooms.delete(roomCode);
}

// Clean up rooms older than 30 minutes with no activity
export function cleanupStaleRooms() {
  const now = Date.now();
  const STALE_THRESHOLD = 30 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > STALE_THRESHOLD) {
      rooms.delete(code);
    }
  }
}
