import type { Room } from './room';

export interface RoomSocketChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
}

export interface RoomSocketSystemMessage {
  action: string;
  playerId: string;
  playerName: string;
  timestamp: string;
}

export interface RoomSocketPlayerKickedMessage {
  roomCode: string;
  playerId: string;
  message: string;
}

export interface RoomSocketGameStartedMessage {
  roomCode: string;
  gameId: string;
}

export type RoomSocketMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'room_updated'; room: Room; gameId?: string }
  | { type: 'game_started'; data: RoomSocketGameStartedMessage }
  | { type: 'player_kicked'; data: RoomSocketPlayerKickedMessage }
  | { type: 'chat'; data: RoomSocketChatMessage }
  | { type: 'system'; data: RoomSocketSystemMessage }
  | { type: 'error'; message: string };
