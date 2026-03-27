// Socket.io event name constants — shared between client and server
export const Events = {
  // Room management
  ROOM_CREATE: 'room:create',
  ROOM_CREATED: 'room:created',
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_REJOIN: 'room:rejoin',
  ROOM_PLAYER_JOINED: 'room:player_joined',
  ROOM_PLAYER_LEFT: 'room:player_left',
  ROOM_ERROR: 'room:error',

  // Lobby
  LOBBY_UPDATE_SETTINGS: 'lobby:update_settings',
  LOBBY_SETTINGS_UPDATED: 'lobby:settings_updated',
  LOBBY_SUBMIT_SYMPTOM: 'lobby:submit_symptom',
  LOBBY_SYMPTOM_ADDED: 'lobby:symptom_added',
  LOBBY_REMOVE_SYMPTOM: 'lobby:remove_symptom',
  LOBBY_SYMPTOM_REMOVED: 'lobby:symptom_removed',

  // Game flow (host-only emits)
  GAME_START: 'game:start',
  GAME_STATE_UPDATE: 'game:state_update',
  GAME_READY: 'game:ready',
  GAME_ALL_READY: 'game:all_ready',
  HOST_NEXT_QUESTION_ROUND: 'host:next_question_round',
  HOST_PSYCHIATRIST_GUESSES: 'host:psychiatrist_guesses',
  HOST_MARK_GUESS: 'host:mark_guess',
  HOST_MARK_CRAZY_PATIENT: 'host:mark_crazy_patient',
  HOST_END_ROUND: 'host:end_round',
  HOST_END_GAME: 'host:end_game',
};
