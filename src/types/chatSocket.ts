export interface ChatSocketChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
  avatar?: string;
}

export interface ChatSocketSystemMessage {
  action?: string;
  message: string;
  playerId: string;
  playerName: string;
  timestamp: string;
}

export type ChatSocketMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'chat'; data: ChatSocketChatMessage }
  | { type: 'system'; data: ChatSocketSystemMessage }
  | { type: 'error'; message: string };
