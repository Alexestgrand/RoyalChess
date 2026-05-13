/**
 * Noms d'événements WebSocket (contrat unique front / back).
 * Valeurs en chaîne stable pour le fil Socket.io.
 */
export enum SocketEvent {
  /** @deprecated Utiliser MOVE */
  MOVE_PIECE = "MOVE_PIECE",
  MOVE = "move",
  GAME_STATE = "game_state",
  /** Les deux joueurs sont connectés à la room — la partie peut démarrer côté UI. */
  GAME_READY = "game_ready",
  /** @deprecated Utiliser GAME_STATE */
  GAME_STATE_UPDATE = "GAME_STATE_UPDATE",
  MOVE_ERROR = "move_error",
  /** Coup refusé (illégal / règles), distinct de `move_error` (burst, format…). */
  MOVE_REJECTED = "move_rejected",
  PLAYER_JOINED = "PLAYER_JOINED",
  GAME_OVER = "game_over",
  OPPONENT_DISCONNECTED = "opponent_disconnected",
  OPPONENT_RECONNECTED = "opponent_reconnected",
  CHAT_MESSAGE = "chat_message",
  RESIGN = "resign",
  OFFER_DRAW = "offer_draw",
  ACCEPT_DRAW = "accept_draw",
  DECLINE_DRAW = "decline_draw",
  SET_PREMOVE = "set_premove",
  CANCEL_PREMOVE = "cancel_premove",
  JOIN_QUEUE = "join_queue",
  CANCEL_QUEUE = "cancel_queue",
  QUEUE_STATUS = "queue_status",
  MATCHMAKING_JOIN = "MATCHMAKING_JOIN",
  MATCHMAKING_CANCEL = "MATCHMAKING_CANCEL",
  MATCHMAKING_FOUND = "matchmaking_found",
  /** File : aucun adversaire dans le délai imparti. */
  QUEUE_TIMEOUT = "queue_timeout",
  CONNECTION_ERROR = "connection_error",
  PREMOVE_SET = "PREMOVE_SET",
  PREMOVE_CANCEL = "PREMOVE_CANCEL",
}

/** Room Socket.io pour une partie (préfixe serveur). */
export function gameSocketRoom(gameId: string): string {
  return `game:${gameId}`;
}
