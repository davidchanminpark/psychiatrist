import { describe, it, expect, beforeEach } from 'vitest';
import { Phase } from 'shared/phases.js';
import { transition, getPlayerView } from '../gameEngine.js';
import { createRoom, deleteRoom } from '../roomManager.js';

// Helper: build a minimal room with N connected players
function makeRoom(playerCount = 3, variant = 'classic') {
  const { room, playerId: hostId } = createRoom('Host', 'socket_host');
  room.settings.variant = variant;
  for (let i = 1; i < playerCount; i++) {
    const pid = `player_${i}`;
    room.players.push({ id: pid, name: `Player${i}`, socketId: `socket_${i}`, connected: true, avatarIndex: i });
  }
  return { room, hostId };
}

function cleanup(room) {
  deleteRoom(room.roomCode);
}

describe('transition: START_GAME', () => {
  it('moves from LOBBY to SHOWING_ROLES', () => {
    const { room } = makeRoom(3);
    transition(room, { type: 'START_GAME' });
    expect(room.phase).toBe(Phase.SHOWING_ROLES);
    cleanup(room);
  });

  it('assigns a psychiatrist', () => {
    const { room } = makeRoom(3);
    transition(room, { type: 'START_GAME' });
    expect(room.psychiatristId).toBeTruthy();
    expect(room.players.find(p => p.id === room.psychiatristId)).toBeTruthy();
    cleanup(room);
  });

  it('assigns a shared symptom', () => {
    const { room } = makeRoom(3);
    transition(room, { type: 'START_GAME' });
    expect(room.sharedSymptom).toBeTruthy();
    expect(room.sharedSymptom.text).toBeTruthy();
    cleanup(room);
  });

  it('throws if not in LOBBY phase', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.QUESTIONING;
    expect(() => transition(room, { type: 'START_GAME' })).toThrow('Can only start from lobby');
    cleanup(room);
  });

  it('throws if fewer than 3 players', () => {
    const { room } = makeRoom(2);
    expect(() => transition(room, { type: 'START_GAME' })).toThrow('Need at least 3 connected players');
    cleanup(room);
  });

  it('assigns crazy_patient when variant is crazy_patient', () => {
    const { room } = makeRoom(3, 'crazy_patient');
    transition(room, { type: 'START_GAME' });
    expect(room.crazyPatientId).toBeTruthy();
    expect(room.crazyPatientId).not.toBe(room.psychiatristId);
    expect(room.crazySymptom).toBeTruthy();
    cleanup(room);
  });

  it('does NOT assign crazy_patient in classic variant', () => {
    const { room } = makeRoom(3, 'classic');
    transition(room, { type: 'START_GAME' });
    expect(room.crazyPatientId).toBeNull();
    expect(room.crazySymptom).toBeNull();
    cleanup(room);
  });
});

describe('transition: PLAYER_READY', () => {
  function startedRoom(playerCount = 3) {
    const { room } = makeRoom(playerCount);
    transition(room, { type: 'START_GAME' });
    return room;
  }

  it('advances to QUESTIONING when all players are ready', () => {
    const room = startedRoom(3);
    const playerIds = room.players.map(p => p.id);
    for (let i = 0; i < playerIds.length - 1; i++) {
      transition(room, { type: 'PLAYER_READY', playerId: playerIds[i] });
      expect(room.phase).toBe(Phase.SHOWING_ROLES); // still waiting
    }
    transition(room, { type: 'PLAYER_READY', playerId: playerIds[playerIds.length - 1] });
    expect(room.phase).toBe(Phase.QUESTIONING);
    expect(room.questionRound).toBe(1);
    expect(room.questioningStartTime).toBeTruthy();
    cleanup(room);
  });

  it('throws if not in SHOWING_ROLES phase', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.QUESTIONING;
    expect(() => transition(room, { type: 'PLAYER_READY', playerId: 'x' })).toThrow();
    cleanup(room);
  });
});

describe('transition: NEXT_QUESTION_ROUND', () => {
  it('increments questionRound', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.QUESTIONING;
    room.questionRound = 1;
    transition(room, { type: 'NEXT_QUESTION_ROUND' });
    expect(room.questionRound).toBe(2);
    cleanup(room);
  });

  it('throws if not in QUESTIONING phase', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.LOBBY;
    expect(() => transition(room, { type: 'NEXT_QUESTION_ROUND' })).toThrow('Not in questioning phase');
    cleanup(room);
  });
});

describe('transition: PSYCHIATRIST_GUESSES', () => {
  it('moves from QUESTIONING to REVEAL_GUESS', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.QUESTIONING;
    transition(room, { type: 'PSYCHIATRIST_GUESSES' });
    expect(room.phase).toBe(Phase.REVEAL_GUESS);
    cleanup(room);
  });

  it('throws if not in QUESTIONING phase', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.LOBBY;
    expect(() => transition(room, { type: 'PSYCHIATRIST_GUESSES' })).toThrow();
    cleanup(room);
  });
});

describe('transition: MARK_GUESS', () => {
  function setupRevealGuess(variant = 'classic') {
    const { room } = makeRoom(3, variant);
    transition(room, { type: 'START_GAME' });
    room.players.forEach(p => {
      room.readyPlayers.add(p.id);
    });
    room.phase = Phase.QUESTIONING;
    room.questionRound = 1;
    room.questioningStartTime = Date.now() - 5000;
    room.phase = Phase.REVEAL_GUESS;
    return room;
  }

  it('correct guess in classic → RESULTS', () => {
    const room = setupRevealGuess('classic');
    transition(room, { type: 'MARK_GUESS', correct: true });
    expect(room.phase).toBe(Phase.RESULTS);
    expect(room.guessTime).toBeGreaterThan(0);
    cleanup(room);
  });

  it('correct guess adds to bestPsychiatrist leaderboard', () => {
    const room = setupRevealGuess('classic');
    transition(room, { type: 'MARK_GUESS', correct: true });
    expect(room.leaderboard.bestPsychiatrist).toHaveLength(1);
    expect(room.leaderboard.bestPsychiatrist[0].playerId).toBe(room.psychiatristId);
    cleanup(room);
  });

  it('correct guess in crazy_patient → CRAZY_PATIENT_GUESS', () => {
    const room = setupRevealGuess('crazy_patient');
    transition(room, { type: 'MARK_GUESS', correct: true });
    expect(room.phase).toBe(Phase.CRAZY_PATIENT_GUESS);
    cleanup(room);
  });

  it('incorrect guess increments questionRound and returns to QUESTIONING', () => {
    const room = setupRevealGuess('classic');
    transition(room, { type: 'MARK_GUESS', correct: false });
    expect(room.phase).toBe(Phase.QUESTIONING);
    cleanup(room);
  });

  it('incorrect guess past maxQuestionRounds → RESULTS with no guessTime', () => {
    const room = setupRevealGuess('classic');
    room.questionRound = room.settings.maxQuestionRounds; // at the limit
    transition(room, { type: 'MARK_GUESS', correct: false });
    expect(room.phase).toBe(Phase.RESULTS);
    expect(room.guessTime).toBeNull();
    cleanup(room);
  });

  it('throws if not in REVEAL_GUESS phase', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.QUESTIONING;
    expect(() => transition(room, { type: 'MARK_GUESS', correct: true })).toThrow('Not in reveal guess phase');
    cleanup(room);
  });
});

describe('transition: MARK_CRAZY_PATIENT', () => {
  function setupCrazyPatientGuess() {
    const { room } = makeRoom(3, 'crazy_patient');
    transition(room, { type: 'START_GAME' });
    room.phase = Phase.CRAZY_PATIENT_GUESS;
    room.questioningStartTime = Date.now() - 3000;
    room.guessTime = 3000;
    return room;
  }

  it('moves to RESULTS', () => {
    const room = setupCrazyPatientGuess();
    transition(room, { type: 'MARK_CRAZY_PATIENT', caught: true });
    expect(room.phase).toBe(Phase.RESULTS);
    cleanup(room);
  });

  it('adds uncaught crazy patient to crazies leaderboard', () => {
    const room = setupCrazyPatientGuess();
    transition(room, { type: 'MARK_CRAZY_PATIENT', caught: false });
    expect(room.leaderboard.crazies).toHaveLength(1);
    expect(room.leaderboard.crazies[0].playerId).toBe(room.crazyPatientId);
    cleanup(room);
  });

  it('does NOT add to crazies leaderboard when caught', () => {
    const room = setupCrazyPatientGuess();
    transition(room, { type: 'MARK_CRAZY_PATIENT', caught: true });
    expect(room.leaderboard.crazies).toHaveLength(0);
    cleanup(room);
  });

  it('throws if not in CRAZY_PATIENT_GUESS phase', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.RESULTS;
    expect(() => transition(room, { type: 'MARK_CRAZY_PATIENT', caught: true })).toThrow('Not in crazy patient guess phase');
    cleanup(room);
  });
});

describe('transition: END_ROUND', () => {
  function setupResults(variant = 'classic') {
    const { room } = makeRoom(3, variant);
    transition(room, { type: 'START_GAME' });
    room.phase = Phase.RESULTS;
    room.guessTime = 5000;
    return room;
  }

  it('always moves to SHOWING_ROLES', () => {
    const room = setupResults();
    transition(room, { type: 'END_ROUND' });
    expect(room.phase).toBe(Phase.SHOWING_ROLES);
    cleanup(room);
  });

  it('throws if not in RESULTS phase', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.QUESTIONING;
    expect(() => transition(room, { type: 'END_ROUND' })).toThrow('Not in results phase');
    cleanup(room);
  });
});

describe('transition: END_GAME', () => {
  it('moves to END_GAME from any phase', () => {
    const { room } = makeRoom(3);
    room.phase = Phase.QUESTIONING;
    transition(room, { type: 'END_GAME' });
    expect(room.phase).toBe(Phase.END_GAME);
    cleanup(room);
  });
});

describe('transition: unknown action', () => {
  it('throws for unknown action type', () => {
    const { room } = makeRoom(3);
    expect(() => transition(room, { type: 'INVALID' })).toThrow('Unknown action');
    cleanup(room);
  });
});

describe('getPlayerView: information filtering', () => {
  function startedRoom() {
    const { room } = makeRoom(3);
    transition(room, { type: 'START_GAME' });
    return room;
  }

  it('psychiatrist does NOT see sharedSymptom during gameplay', () => {
    const room = startedRoom();
    const view = getPlayerView(room, room.psychiatristId);
    expect(view.sharedSymptom).toBeUndefined();
    cleanup(room);
  });

  it('patient DOES see sharedSymptom during gameplay', () => {
    const room = startedRoom();
    const patientId = room.players.find(p => p.id !== room.psychiatristId).id;
    const view = getPlayerView(room, patientId);
    expect(view.sharedSymptom).toBeTruthy();
    cleanup(room);
  });

  it('crazy patient sees both symptoms during gameplay', () => {
    const { room } = makeRoom(3, 'crazy_patient');
    transition(room, { type: 'START_GAME' });
    const view = getPlayerView(room, room.crazyPatientId);
    expect(view.sharedSymptom).toBeTruthy();
    expect(view.crazySymptom).toBeTruthy();
    cleanup(room);
  });

  it('regular patient does NOT see crazySymptom', () => {
    const { room } = makeRoom(3, 'crazy_patient');
    transition(room, { type: 'START_GAME' });
    const regularPatientId = room.players.find(
      p => p.id !== room.psychiatristId && p.id !== room.crazyPatientId
    ).id;
    const view = getPlayerView(room, regularPatientId);
    expect(view.crazySymptom).toBeUndefined();
    cleanup(room);
  });

  it('everyone sees full reveal in RESULTS phase', () => {
    const { room } = makeRoom(3, 'crazy_patient');
    transition(room, { type: 'START_GAME' });
    room.phase = Phase.RESULTS;
    room.guessTime = 4000;
    const psychiatristView = getPlayerView(room, room.psychiatristId);
    expect(psychiatristView.sharedSymptom).toBeTruthy();
    expect(psychiatristView.crazyPatientId).toBeTruthy();
    expect(psychiatristView.guessedCorrectly).toBe(true);
    cleanup(room);
  });

  it('host flag is only set for the host player', () => {
    const { room, hostId } = (() => {
      const { room } = makeRoom(3);
      return { room, hostId: room.hostId };
    })();
    transition(room, { type: 'START_GAME' });
    const hostView = getPlayerView(room, hostId);
    expect(hostView.isHost).toBe(true);
    const otherPlayer = room.players.find(p => p.id !== hostId);
    const otherView = getPlayerView(room, otherPlayer.id);
    expect(otherView.isHost).toBe(false);
    cleanup(room);
  });

  it('includes all connected players in the view', () => {
    const { room } = makeRoom(4);
    transition(room, { type: 'START_GAME' });
    const view = getPlayerView(room, room.players[0].id);
    expect(view.players).toHaveLength(4);
    cleanup(room);
  });

  it('questioningStartTime is included during QUESTIONING', () => {
    const { room } = makeRoom(3);
    transition(room, { type: 'START_GAME' });
    room.phase = Phase.QUESTIONING;
    room.questioningStartTime = Date.now();
    const view = getPlayerView(room, room.players[0].id);
    expect(view.questioningStartTime).toBeTruthy();
    cleanup(room);
  });
});

// Helper: add custom symptoms to a room
function addCustomSymptoms(room, count) {
  for (let i = 0; i < count; i++) {
    room.customSymptoms.push({ id: `c${i}`, text: `Custom symptom ${i}`, category: 'custom' });
  }
}

describe('selectSharedSymptom: custom mode', () => {
  it('uses a custom symptom when custom pool has items', () => {
    const { room } = makeRoom(3);
    room.settings.symptomSource = 'custom';
    addCustomSymptoms(room, 3);
    transition(room, { type: 'START_GAME' });
    expect(room.sharedSymptom.category).toBe('custom');
    cleanup(room);
  });

  it('falls back to built-in bank when custom pool is exhausted', () => {
    const { room } = makeRoom(3);
    room.settings.symptomSource = 'custom';
    addCustomSymptoms(room, 1);
    // Exhaust the one custom symptom
    room.usedSymptoms.add('c0');
    transition(room, { type: 'START_GAME' });
    // Should have used a built-in symptom (not category 'custom')
    expect(room.sharedSymptom.category).not.toBe('custom');
    cleanup(room);
  });

  it('falls back to built-in when no custom symptoms submitted', () => {
    const { room } = makeRoom(3);
    room.settings.symptomSource = 'custom';
    // No custom symptoms added
    transition(room, { type: 'START_GAME' });
    expect(room.sharedSymptom.category).not.toBe('custom');
    cleanup(room);
  });
});

describe('selectSharedSymptom: mixed mode', () => {
  it('round 1 (odd) picks from custom pool', () => {
    const { room } = makeRoom(3);
    room.settings.symptomSource = 'mixed';
    addCustomSymptoms(room, 5);
    // currentRound is 0, upcomingRound = 1 (odd) → prefers custom
    transition(room, { type: 'START_GAME' });
    expect(room.sharedSymptom.category).toBe('custom');
    cleanup(room);
  });

  it('round 2 (even) picks from built-in bank', () => {
    const { room } = makeRoom(3);
    room.settings.symptomSource = 'mixed';
    addCustomSymptoms(room, 5);
    // Simulate being at round 1 already (currentRound = 1), so upcomingRound = 2 (even)
    room.currentRound = 1;
    room.psychiatristOrder = room.players.map(p => p.id);
    room.psychiatristIndex = 1;
    room.phase = Phase.RESULTS;
    room.sharedSymptom = room.customSymptoms[0];
    room.usedSymptoms.add('c0');
    room.roundHistory = [{}]; // dummy
    room.settings.totalRounds = 5;
    room.guessTime = 1000;
    transition(room, { type: 'END_ROUND' });
    // After END_ROUND → assignRoles for round 2
    expect(room.sharedSymptom.category).not.toBe('custom');
    cleanup(room);
  });

  it('falls back to built-in on odd round when custom is exhausted', () => {
    const { room } = makeRoom(3);
    room.settings.symptomSource = 'mixed';
    addCustomSymptoms(room, 1);
    room.usedSymptoms.add('c0'); // exhaust custom
    // upcomingRound = 1 (odd) → prefers custom, but exhausted → bank
    transition(room, { type: 'START_GAME' });
    expect(room.sharedSymptom.category).not.toBe('custom');
    cleanup(room);
  });

  it('falls back to built-in when no custom symptoms submitted', () => {
    const { room } = makeRoom(3);
    room.settings.symptomSource = 'mixed';
    // No custom symptoms added
    transition(room, { type: 'START_GAME' });
    expect(room.sharedSymptom.category).not.toBe('custom');
    cleanup(room);
  });
});
