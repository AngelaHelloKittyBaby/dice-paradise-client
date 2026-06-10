import type { ApiGameMode } from './gameApi';
import type { Room } from './room';

export type ApiRoomPlayerId = string | number;

export interface CreateOnlineRoomRequest {
  room_name?: string | null;
  max_players?: number;
  game_mode?: ApiGameMode;
}

export interface ApiRoomPlayer {
  playerId?: ApiRoomPlayerId;
  player_id?: ApiRoomPlayerId;
  name: string;
  username?: string;
  isHost?: boolean;
  is_host?: boolean;
  isReady?: boolean;
  is_ready?: boolean;
  points?: number;
}

export interface ApiRoomData {
  roomCode?: string;
  room_code?: string;
  id?: string;
  roomName?: string;
  room_name?: string;
  name?: string;
  maxPlayers?: number;
  max_players?: number;
  players?: ApiRoomPlayer[];
  members?: ApiRoomPlayer[];
  status?: Room['status'];
  hostId?: ApiRoomPlayerId | null;
  host_id?: ApiRoomPlayerId | null;
  ownerId?: ApiRoomPlayerId | null;
  owner_id?: ApiRoomPlayerId | null;
  creatorId?: ApiRoomPlayerId | null;
  creator_id?: ApiRoomPlayerId | null;
  gameId?: string | number | null;
  game_id?: string | number | null;
}

export interface ApiRoomListItem {
  roomCode: string;
  roomName: string;
  playerCount: number;
  maxPlayers: number;
  status: Extract<Room['status'], 'waiting'>;
}

export interface RoomListResponseData {
  rooms: ApiRoomListItem[];
}

export interface JoinOnlineRoomRequest {
  room_code: string;
}

export interface JoinOnlineRoomData {
  room: ApiRoomData;
  playerId?: ApiRoomPlayerId;
  player_id?: ApiRoomPlayerId;
}

export interface LeaveOnlineRoomRequest {
  room_code: string;
  player_id: ApiRoomPlayerId;
}

export interface KickOnlineRoomRequest {
  target_player_id: ApiRoomPlayerId;
}

export interface SetOnlineRoomReadyRequest {
  is_ready: boolean;
}

export interface StartOnlineRoomData {
  gameId: string;
  roomCode: string;
}
