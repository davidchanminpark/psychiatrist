import { describe, it, expect } from 'vitest';
import { Phase } from '../phases.js';
import { Events } from '../events.js';

describe('Phase constants', () => {
  it('has all required phases', () => {
    const required = [
      'LOBBY',
      'ROLE_ASSIGNMENT',
      'SHOWING_ROLES',
      'QUESTIONING',
      'REVEAL_GUESS',
      'CRAZY_PATIENT_GUESS',
      'RESULTS',
      'END_GAME',
    ];
    for (const phase of required) {
      expect(Phase[phase]).toBe(phase);
    }
  });

  it('phase values are strings equal to their keys', () => {
    for (const [key, value] of Object.entries(Phase)) {
      expect(value).toBe(key);
    }
  });
});

describe('Events constants', () => {
  it('has room management events', () => {
    expect(Events.ROOM_CREATE).toBeDefined();
    expect(Events.ROOM_CREATED).toBeDefined();
    expect(Events.ROOM_JOIN).toBeDefined();
    expect(Events.ROOM_JOINED).toBeDefined();
    expect(Events.ROOM_REJOIN).toBeDefined();
    expect(Events.ROOM_PLAYER_JOINED).toBeDefined();
    expect(Events.ROOM_PLAYER_LEFT).toBeDefined();
    expect(Events.ROOM_ERROR).toBeDefined();
  });

  it('has lobby events', () => {
    expect(Events.LOBBY_UPDATE_SETTINGS).toBeDefined();
    expect(Events.LOBBY_SETTINGS_UPDATED).toBeDefined();
    expect(Events.LOBBY_SUBMIT_SYMPTOM).toBeDefined();
    expect(Events.LOBBY_SYMPTOM_ADDED).toBeDefined();
    expect(Events.LOBBY_REMOVE_SYMPTOM).toBeDefined();
    expect(Events.LOBBY_SYMPTOM_REMOVED).toBeDefined();
  });

  it('has game flow events', () => {
    expect(Events.GAME_START).toBeDefined();
    expect(Events.GAME_STATE_UPDATE).toBeDefined();
    expect(Events.GAME_READY).toBeDefined();
    expect(Events.HOST_NEXT_QUESTION_ROUND).toBeDefined();
    expect(Events.HOST_MARK_GUESS).toBeDefined();
    expect(Events.HOST_MARK_CRAZY_PATIENT).toBeDefined();
    expect(Events.HOST_END_ROUND).toBeDefined();
    expect(Events.HOST_END_GAME).toBeDefined();
  });

  it('all event values are namespaced strings', () => {
    for (const value of Object.values(Events)) {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^[a-z_]+:[a-z_]+$/);
    }
  });

  it('has no duplicate event values', () => {
    const values = Object.values(Events);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
