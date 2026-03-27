import { Events } from 'shared/events.js';
import { Phase } from 'shared/phases.js';
import * as roomManager from './roomManager.js';
import { transition, getPlayerView } from './gameEngine.js';

function emitStateToRoom(io, room) {
  for (const player of room.players) {
    const view = getPlayerView(room, player.id);
    io.to(player.socketId).emit(Events.GAME_STATE_UPDATE, view);
  }
}

export function registerHandlers(io, socket) {
  // Create room
  socket.on(Events.ROOM_CREATE, ({ playerName }) => {
    const { room, playerId } = roomManager.createRoom(playerName, socket.id);
    socket.join(room.roomCode);
    socket.data = { playerId, roomCode: room.roomCode };
    socket.emit(Events.ROOM_CREATED, {
      roomCode: room.roomCode,
      playerId,
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected, avatarIndex: p.avatarIndex })),
    });
  });

  // Join room
  socket.on(Events.ROOM_JOIN, ({ roomCode, playerName }) => {
    const result = roomManager.joinRoom(roomCode.toUpperCase(), playerName, socket.id);
    if (result.error) {
      socket.emit(Events.ROOM_ERROR, { message: result.error });
      return;
    }
    const { room, playerId, player } = result;
    socket.join(room.roomCode);
    socket.data = { playerId, roomCode: room.roomCode };
    socket.emit(Events.ROOM_JOINED, {
      roomCode: room.roomCode,
      playerId,
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected, avatarIndex: p.avatarIndex })),
      settings: room.settings,
      customSymptoms: room.customSymptoms,
    });
    socket.to(room.roomCode).emit(Events.ROOM_PLAYER_JOINED, {
      id: player.id,
      name: player.name,
      connected: player.connected,
      avatarIndex: player.avatarIndex,
    });
  });

  // Rejoin room
  socket.on(Events.ROOM_REJOIN, ({ roomCode, playerId }) => {
    const result = roomManager.rejoinRoom(roomCode, playerId, socket.id);
    if (result.error) {
      socket.emit(Events.ROOM_ERROR, { message: result.error });
      return;
    }
    const { room, player } = result;
    socket.join(room.roomCode);
    socket.data = { playerId, roomCode: room.roomCode };
    // Send current game state
    const view = getPlayerView(room, playerId);
    socket.emit(Events.GAME_STATE_UPDATE, view);
    socket.to(room.roomCode).emit(Events.ROOM_PLAYER_JOINED, {
      id: player.id,
      name: player.name,
      connected: true,
      avatarIndex: player.avatarIndex,
    });
  });

  // Lobby: update settings (host only)
  socket.on(Events.LOBBY_UPDATE_SETTINGS, (settings) => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    Object.assign(room.settings, settings);
    io.to(room.roomCode).emit(Events.LOBBY_SETTINGS_UPDATED, room.settings);
  });

  // Lobby: submit custom symptom (also allowed during RESULTS so players can add for next round)
  socket.on(Events.LOBBY_SUBMIT_SYMPTOM, ({ text }) => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || (room.phase !== Phase.LOBBY && room.phase !== Phase.RESULTS)) return;
    if (room.customSymptoms.length >= 50) return; // cap
    const symptom = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      text: text.trim(),
      category: 'custom',
      submittedBy: socket.data.playerId,
    };
    room.customSymptoms.push(symptom);
    io.to(room.roomCode).emit(Events.LOBBY_SYMPTOM_ADDED, symptom);
  });

  // Lobby: remove custom symptom (host only)
  socket.on(Events.LOBBY_REMOVE_SYMPTOM, ({ id }) => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    room.customSymptoms = room.customSymptoms.filter(s => s.id !== id);
    io.to(room.roomCode).emit(Events.LOBBY_SYMPTOM_REMOVED, { id });
  });

  // Game: start
  socket.on(Events.GAME_START, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'START_GAME' });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Game: player ready
  socket.on(Events.GAME_READY, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room) return;
    try {
      transition(room, { type: 'PLAYER_READY', playerId: socket.data.playerId });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: next question round
  socket.on(Events.HOST_NEXT_QUESTION_ROUND, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'NEXT_QUESTION_ROUND' });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: psychiatrist wants to guess
  socket.on(Events.HOST_PSYCHIATRIST_GUESSES, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'PSYCHIATRIST_GUESSES' });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: mark guess correct/incorrect
  socket.on(Events.HOST_MARK_GUESS, ({ correct }) => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'MARK_GUESS', correct });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: mark crazy patient caught/not caught
  socket.on(Events.HOST_MARK_CRAZY_PATIENT, ({ caught }) => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'MARK_CRAZY_PATIENT', caught });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: end round
  socket.on(Events.HOST_END_ROUND, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'END_ROUND' });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: end game early
  socket.on(Events.HOST_END_GAME, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'END_GAME' });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: advance results step
  socket.on(Events.HOST_ADVANCE_RESULTS, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'ADVANCE_RESULTS' });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: psychiatrist gives up — end round without a correct guess
  socket.on(Events.HOST_GIVE_UP, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    try {
      transition(room, { type: 'GIVE_UP' });
      emitStateToRoom(io, room);
    } catch (e) {
      socket.emit(Events.ROOM_ERROR, { message: e.message });
    }
  });

  // Host: reset room back to lobby for a new game
  socket.on(Events.HOST_RESET_LOBBY, () => {
    const room = roomManager.getRoom(socket.data?.roomCode);
    if (!room || room.hostId !== socket.data?.playerId) return;
    transition(room, { type: 'RESET_LOBBY' });
    emitStateToRoom(io, room);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const result = roomManager.disconnectPlayer(socket.id);
    if (result) {
      const { room, player } = result;
      io.to(room.roomCode).emit(Events.ROOM_PLAYER_LEFT, { playerId: player.id });
    }
  });
}
