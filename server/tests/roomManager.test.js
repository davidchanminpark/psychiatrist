import { describe, it, expect, beforeEach } from 'vitest';
import { Phase } from 'shared/phases.js';
import {
  createRoom,
  joinRoom,
  rejoinRoom,
  disconnectPlayer,
  getRoom,
  deleteRoom,
  cleanupStaleRooms,
} from '../roomManager.js';

// Reset in-memory state between tests by deleting all rooms
beforeEach(() => {
  // createRoom returns room codes; clean up any rooms we create in tests
  // We'll track and delete them ourselves — roomManager doesn't expose clear()
});

describe('createRoom', () => {
  it('creates a room and returns roomCode and playerId', () => {
    const { room, playerId } = createRoom('Alice', 'socket_1');
    expect(room.roomCode).toMatch(/^[A-Z]{4}$/);
    expect(playerId).toBeTruthy();
    expect(room.hostId).toBe(playerId);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].name).toBe('Alice');
    expect(room.players[0].connected).toBe(true);
    deleteRoom(room.roomCode);
  });

  it('room starts in LOBBY phase with default settings', () => {
    const { room } = createRoom('Bob', 'socket_2');
    expect(room.phase).toBe(Phase.LOBBY);
    expect(room.settings.variant).toBe('classic');
    expect(room.settings.totalRounds).toBe(5);
    expect(room.settings.maxQuestionRounds).toBe(10);
    deleteRoom(room.roomCode);
  });

  it('room code excludes confusable characters I, O, L', () => {
    // Create many rooms to test randomness
    const codes = [];
    for (let i = 0; i < 50; i++) {
      const { room } = createRoom('Player', `socket_${i}`);
      codes.push(room.roomCode);
    }
    const allChars = codes.join('');
    expect(allChars).not.toMatch(/[IOL]/);
    codes.forEach(code => deleteRoom(code));
  });

  it('room code is exactly 4 uppercase characters', () => {
    const { room } = createRoom('Test', 'socket_x');
    expect(room.roomCode).toHaveLength(4);
    expect(room.roomCode).toMatch(/^[A-Z]{4}$/);
    deleteRoom(room.roomCode);
  });

  it('initializes empty leaderboard and round history', () => {
    const { room } = createRoom('Host', 'socket_y');
    expect(room.leaderboard.bestPsychiatrist).toEqual([]);
    expect(room.leaderboard.crazies).toEqual([]);
    expect(room.roundHistory).toEqual([]);
    deleteRoom(room.roomCode);
  });
});

describe('joinRoom', () => {
  it('adds player to an existing lobby room', () => {
    const { room } = createRoom('Host', 'socket_h');
    const result = joinRoom(room.roomCode, 'Alice', 'socket_a');
    expect(result.error).toBeUndefined();
    expect(result.room.players).toHaveLength(2);
    expect(result.player.name).toBe('Alice');
    expect(result.playerId).toBeTruthy();
    deleteRoom(room.roomCode);
  });

  it('assigns incrementing avatarIndex', () => {
    const { room } = createRoom('Host', 'socket_h2');
    const r1 = joinRoom(room.roomCode, 'P1', 'socket_p1');
    const r2 = joinRoom(room.roomCode, 'P2', 'socket_p2');
    expect(r1.player.avatarIndex).toBe(1);
    expect(r2.player.avatarIndex).toBe(2);
    deleteRoom(room.roomCode);
  });

  it('returns error for non-existent room', () => {
    const result = joinRoom('ZZZZ', 'Alice', 'socket_a');
    expect(result.error).toBe('Room not found');
  });

  it('returns error when room is full (20 players)', () => {
    const { room } = createRoom('Host', 'socket_h3');
    for (let i = 0; i < 19; i++) {
      joinRoom(room.roomCode, `P${i}`, `socket_${i}`);
    }
    const result = joinRoom(room.roomCode, 'P20', 'socket_20');
    expect(result.error).toBe('Room is full');
    deleteRoom(room.roomCode);
  });

  it('returns error when game is already in progress', () => {
    const { room } = createRoom('Host', 'socket_h4');
    room.phase = Phase.QUESTIONING; // simulate game started
    const result = joinRoom(room.roomCode, 'Late', 'socket_late');
    expect(result.error).toBe('Game already in progress');
    deleteRoom(room.roomCode);
  });
});

describe('rejoinRoom', () => {
  it('re-associates socket and marks player connected', () => {
    const { room, playerId } = createRoom('Host', 'socket_old');
    const result = rejoinRoom(room.roomCode, playerId, 'socket_new');
    expect(result.error).toBeUndefined();
    expect(result.player.socketId).toBe('socket_new');
    expect(result.player.connected).toBe(true);
    deleteRoom(room.roomCode);
  });

  it('returns error for non-existent room', () => {
    const result = rejoinRoom('ZZZZ', 'some_id', 'socket_x');
    expect(result.error).toBe('Room not found');
  });

  it('returns error for unknown playerId', () => {
    const { room } = createRoom('Host', 'socket_h5');
    const result = rejoinRoom(room.roomCode, 'unknown_player', 'socket_x');
    expect(result.error).toBe('Player not found in room');
    deleteRoom(room.roomCode);
  });
});

describe('disconnectPlayer', () => {
  it('marks player as disconnected by socketId', () => {
    const { room } = createRoom('Host', 'socket_disc');
    expect(room.players[0].connected).toBe(true);
    const result = disconnectPlayer('socket_disc');
    expect(result).not.toBeNull();
    expect(result.player.connected).toBe(false);
    deleteRoom(room.roomCode);
  });

  it('returns null for unknown socketId', () => {
    const result = disconnectPlayer('not_a_real_socket');
    expect(result).toBeNull();
  });
});

describe('getRoom', () => {
  it('returns the room by code', () => {
    const { room } = createRoom('Host', 'socket_get');
    const found = getRoom(room.roomCode);
    expect(found).toBe(room);
    deleteRoom(room.roomCode);
  });

  it('returns null for unknown code', () => {
    expect(getRoom('ZZZZ')).toBeNull();
  });
});

describe('deleteRoom', () => {
  it('removes the room', () => {
    const { room } = createRoom('Host', 'socket_del');
    deleteRoom(room.roomCode);
    expect(getRoom(room.roomCode)).toBeNull();
  });
});

describe('cleanupStaleRooms', () => {
  it('removes rooms with lastActivity older than 30 minutes', () => {
    const { room } = createRoom('Host', 'socket_stale');
    room.lastActivity = Date.now() - 31 * 60 * 1000; // 31 minutes ago
    cleanupStaleRooms();
    expect(getRoom(room.roomCode)).toBeNull();
  });

  it('keeps recently active rooms', () => {
    const { room } = createRoom('Host', 'socket_fresh');
    room.lastActivity = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    cleanupStaleRooms();
    expect(getRoom(room.roomCode)).not.toBeNull();
    deleteRoom(room.roomCode);
  });
});
