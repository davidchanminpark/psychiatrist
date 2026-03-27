import { Phase } from 'shared/phases.js';
import { getSharedSymptoms, getCrazySymptoms } from './symptoms.js';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function selectSymptom(room, pool) {
  const available = pool.filter(s => !room.usedSymptoms.has(s.id));
  if (available.length === 0) {
    // Reset if all used
    room.usedSymptoms.clear();
    return pickRandom(pool);
  }
  return pickRandom(available);
}

function assignRoles(room) {
  // Set up psychiatrist rotation on first round
  if (room.psychiatristOrder.length === 0) {
    room.psychiatristOrder = shuffleArray(room.players.map(p => p.id));
    room.psychiatristIndex = 0;
  }

  // Advance psychiatrist
  const connectedIds = new Set(room.players.filter(p => p.connected).map(p => p.id));
  let attempts = 0;
  while (attempts < room.players.length) {
    const candidateId = room.psychiatristOrder[room.psychiatristIndex % room.psychiatristOrder.length];
    room.psychiatristIndex++;
    if (connectedIds.has(candidateId)) {
      room.psychiatristId = candidateId;
      break;
    }
    attempts++;
  }

  // Select shared symptom
  const sharedPool = room.settings.symptomSource === 'custom'
    ? room.customSymptoms
    : room.settings.symptomSource === 'mixed'
      ? [...getSharedSymptoms(), ...room.customSymptoms]
      : getSharedSymptoms();

  const symptom = selectSymptom(room, sharedPool);
  room.sharedSymptom = symptom;
  room.usedSymptoms.add(symptom.id);

  // Crazy patient
  if (room.settings.variant === 'crazy_patient') {
    const eligiblePatients = room.players.filter(
      p => p.id !== room.psychiatristId && p.connected
    );
    const crazyPatient = pickRandom(eligiblePatients);
    room.crazyPatientId = crazyPatient.id;

    const crazyPool = getCrazySymptoms();
    room.crazySymptom = pickRandom(crazyPool);
  } else {
    room.crazyPatientId = null;
    room.crazySymptom = null;
  }

  room.questionRound = 0;
  room.readyPlayers = new Set();
  room.questioningStartTime = null;
  room.guessTime = null;

  return room;
}

export function transition(room, action) {
  room.lastActivity = Date.now();

  switch (action.type) {
    case 'START_GAME': {
      if (room.phase !== Phase.LOBBY) throw new Error('Can only start from lobby');
      if (room.players.filter(p => p.connected).length < 3) {
        throw new Error('Need at least 3 connected players');
      }
      assignRoles(room);
      room.phase = Phase.SHOWING_ROLES;
      return room;
    }

    case 'PLAYER_READY': {
      if (room.phase !== Phase.SHOWING_ROLES) throw new Error('Not in showing roles phase');
      room.readyPlayers.add(action.playerId);
      const connectedCount = room.players.filter(p => p.connected).length;
      if (room.readyPlayers.size >= connectedCount) {
        room.phase = Phase.QUESTIONING;
        room.questionRound = 1;
        room.questioningStartTime = Date.now();
      }
      return room;
    }

    case 'NEXT_QUESTION_ROUND': {
      if (room.phase !== Phase.QUESTIONING) throw new Error('Not in questioning phase');
      room.questionRound++;
      return room;
    }

    case 'PSYCHIATRIST_GUESSES': {
      if (room.phase !== Phase.QUESTIONING) throw new Error('Not in questioning phase');
      room.phase = Phase.REVEAL_GUESS;
      return room;
    }

    case 'MARK_GUESS': {
      if (room.phase !== Phase.REVEAL_GUESS) throw new Error('Not in reveal guess phase');
      if (action.correct) {
        room.guessTime = Date.now() - room.questioningStartTime;
        // Add to best psychiatrist leaderboard
        const psychiatrist = room.players.find(p => p.id === room.psychiatristId);
        room.leaderboard.bestPsychiatrist.push({
          playerId: room.psychiatristId,
          playerName: psychiatrist.name,
          time: room.guessTime,
        });
        room.leaderboard.bestPsychiatrist.sort((a, b) => a.time - b.time);

        if (room.settings.variant === 'crazy_patient') {
          room.phase = Phase.CRAZY_PATIENT_GUESS;
        } else {
          room.phase = Phase.RESULTS;
        }
      } else {
        // Wrong guess — back to questioning
        room.phase = Phase.QUESTIONING;
        room.questionRound++;
        if (room.questionRound > room.settings.maxQuestionRounds) {
          // Ran out of rounds, psychiatrist failed
          room.guessTime = null;
          room.phase = Phase.RESULTS;
        }
      }
      return room;
    }

    case 'MARK_CRAZY_PATIENT': {
      if (room.phase !== Phase.CRAZY_PATIENT_GUESS) throw new Error('Not in crazy patient guess phase');
      if (!action.caught) {
        // Crazy patient wasn't caught — add to crazies leaderboard
        const crazyPlayer = room.players.find(p => p.id === room.crazyPatientId);
        room.leaderboard.crazies.push({
          playerId: room.crazyPatientId,
          playerName: crazyPlayer.name,
          crazySymptom: room.crazySymptom.text,
        });
      }
      room.phase = Phase.RESULTS;
      return room;
    }

    case 'END_ROUND': {
      if (room.phase !== Phase.RESULTS) throw new Error('Not in results phase');
      assignRoles(room);
      room.phase = Phase.SHOWING_ROLES;
      return room;
    }

    case 'END_GAME': {
      room.phase = Phase.END_GAME;
      return room;
    }

    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

// Produce a filtered view of the room state for a specific player
export function getPlayerView(room, playerId) {
  const isHost = room.hostId === playerId;
  const isPsychiatrist = room.psychiatristId === playerId;
  const isCrazyPatient = room.crazyPatientId === playerId;

  let myRole = 'patient';
  if (isPsychiatrist) myRole = 'psychiatrist';
  else if (isCrazyPatient) myRole = 'crazy_patient';

  const base = {
    roomCode: room.roomCode,
    phase: room.phase,
    questionRound: room.questionRound,
    isHost,
    myRole,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      avatarIndex: p.avatarIndex,
    })),
    psychiatristId: room.psychiatristId,
    psychiatristName: room.players.find(p => p.id === room.psychiatristId)?.name || null,
    settings: room.settings,
    readyCount: room.readyPlayers.size,
    totalPlayers: room.players.filter(p => p.connected).length,
    leaderboard: room.leaderboard,
    customSymptoms: room.customSymptoms,
  };

  // Symptom visibility
  if (room.phase === Phase.RESULTS || room.phase === Phase.END_GAME) {
    // Everyone sees everything in results
    base.sharedSymptom = room.sharedSymptom?.text || null;
    base.crazySymptom = room.crazySymptom?.text || null;
    base.crazyPatientId = room.crazyPatientId;
    base.crazyPatientName = room.crazyPatientId
      ? room.players.find(p => p.id === room.crazyPatientId)?.name
      : null;
    base.guessTime = room.guessTime;
    base.guessedCorrectly = room.guessTime !== null;
  } else if (room.phase !== Phase.LOBBY) {
    // During gameplay — filter based on role
    if (!isPsychiatrist) {
      base.sharedSymptom = room.sharedSymptom?.text || null;
    }
    if (isCrazyPatient) {
      base.crazySymptom = room.crazySymptom?.text || null;
    }
    // Timer sync
    if (room.questioningStartTime) {
      base.questioningStartTime = room.questioningStartTime;
    }
  }

  return base;
}
