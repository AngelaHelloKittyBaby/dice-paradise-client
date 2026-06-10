/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** 房间成员 */
export interface RoomMember {
  playerId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: string;
  points: number;
}

/** 房间配置 */
export interface RoomSettings {
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  roundTime: number;
  autoStart: boolean;
}

/** 房间信息 */
export interface Room {
  id: string;
  name: string;
  hostId: string;
  gameId?: string | null;
  members: RoomMember[];
  settings: RoomSettings;
  status: RoomStatus;
  createdAt: string;
}

/** 房间列表项 */
export interface RoomListItem {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: RoomStatus;
}

/** 创建房间请求 */
export interface CreateRoomRequest {
  name: string;
  settings: RoomSettings;
}

/** 加入房间请求 */
export interface JoinRoomRequest {
  roomId: string;
  password?: string;
}
