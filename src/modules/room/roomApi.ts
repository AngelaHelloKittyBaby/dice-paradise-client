import defaultAvatar from '@/assets/images/avatars/default-player.png';
import axios from 'axios';
import { createApiClient, isApiAuthenticationRequiredError } from '@/modules/api/createApiClient';
import type {
  ApiRoomData,
  ApiRoomListItem,
  CreateOnlineRoomRequest,
  JoinOnlineRoomData,
  JoinOnlineRoomRequest,
  KickOnlineRoomRequest,
  LeaveOnlineRoomRequest,
  RoomListResponseData,
  SetOnlineRoomReadyRequest,
  StartOnlineRoomData,
} from '@/types/roomApi';
import type { Room, RoomListItem, RoomMember } from '@/types/room';

interface RoomApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

interface RoomApiErrorEnvelope {
  detail?: unknown;
  msg?: string;
  message?: string;
  data?: unknown;
}

interface AxiosLikeRoomError {
  response?: {
    data?: RoomApiErrorEnvelope;
  };
}

interface RecoveredRoomSession {
  room: Room;
  playerId: string;
}

const apiClient = createApiClient();

function unwrapRoomApiResponse<T>(response: RoomApiEnvelope<T>, fallbackMessage: string): T {
  if (response.code !== 200) {
    throw new Error(response.msg || fallbackMessage);
  }

  if (!response.data) {
    throw new Error(fallbackMessage);
  }

  return response.data;
}

function getRoomMemberAvatar(playerId: string) {
  return playerId ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(playerId)}` : defaultAvatar.src;
}

function normalizeRoomPlayerId(playerId: string | number | null | undefined) {
  return playerId === null || playerId === undefined ? '' : String(playerId);
}

function normalizeOptionalText(value: string | null | undefined, fallback = '') {
  return value?.trim() || fallback;
}

type ApiRoomPlayerData = NonNullable<ApiRoomData['players']>[number];

function getApiRoomPlayerId(player: ApiRoomPlayerData) {
  return normalizeRoomPlayerId(player.playerId ?? player.player_id);
}

function getApiRoomPlayerName(player: ApiRoomPlayerData) {
  return normalizeOptionalText(player.name ?? player.username, '乐乐玩家');
}

function isApiRoomHostPlayer(player: ApiRoomPlayerData) {
  return Boolean(player.isHost ?? player.is_host);
}

function toBackendRoomPlayerId(playerId: string | number) {
  const numericPlayerId = typeof playerId === 'number' ? playerId : Number(playerId);

  return Number.isInteger(numericPlayerId) ? numericPlayerId : playerId;
}

export function normalizeRoomData(data: ApiRoomData): Room {
  const joinedAt = new Date().toISOString();
  const players = data.players ?? data.members ?? [];
  const explicitHost = players.find(isApiRoomHostPlayer);
  const explicitHostId = normalizeRoomPlayerId(explicitHost?.playerId ?? explicitHost?.player_id);
  const backendHostId = normalizeRoomPlayerId(
    data.hostId ?? data.host_id ?? data.ownerId ?? data.owner_id ?? data.creatorId ?? data.creator_id
  );
  const normalizedHostId =
    explicitHostId ||
    normalizeRoomPlayerId(players.find(player => getApiRoomPlayerId(player) === backendHostId)?.playerId) ||
    normalizeRoomPlayerId(players.find(player => getApiRoomPlayerId(player) === backendHostId)?.player_id) ||
    backendHostId;
  const members: RoomMember[] = players.map(player => {
    const playerId = getApiRoomPlayerId(player);
    const isHost = Boolean(normalizedHostId && playerId === normalizedHostId);

    return {
      playerId,
      name: getApiRoomPlayerName(player),
      avatar: getRoomMemberAvatar(playerId),
      isHost,
      isReady: isHost || Boolean(player.isReady ?? player.is_ready),
      joinedAt,
      points: player.points ?? 0,
    };
  });

  return {
    id: normalizeOptionalText(data.roomCode ?? data.room_code ?? data.id),
    name: normalizeOptionalText(data.roomName ?? data.room_name, '联机房间'),
    hostId: normalizedHostId,
    members,
    settings: {
      maxPlayers: data.maxPlayers ?? data.max_players ?? 4,
      isPrivate: false,
      roundTime: 30,
      autoStart: false,
    },
    status: data.status ?? 'waiting',
    createdAt: joinedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRoomApiErrorEnvelope(error: unknown): RoomApiErrorEnvelope | null {
  if (!isRecord(error)) return null;

  const response = (error as AxiosLikeRoomError).response;
  return response?.data ?? null;
}

export function getRoomApiErrorMessage(error: unknown, fallbackMessage: string) {
  const envelope = getRoomApiErrorEnvelope(error);

  if (typeof envelope?.detail === 'string' && envelope.detail.trim()) return envelope.detail;
  if (typeof envelope?.msg === 'string' && envelope.msg.trim()) return envelope.msg;
  if (typeof envelope?.message === 'string' && envelope.message.trim()) return envelope.message;
  if (axios.isAxiosError(error) && !error.response) return '无法连接后端服务，请稍后再试';
  if (error instanceof Error && error.message.trim()) return error.message;

  return fallbackMessage;
}

function logRoomApiError(operation: string, error: unknown) {
  if (isApiAuthenticationRequiredError(error)) return;

  if (axios.isAxiosError<RoomApiErrorEnvelope>(error)) {
    console.error(`❌ [${operation}] 错误详情:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
    return;
  }

  console.error(`❌ [${operation}] 错误详情:`, {
    message: error instanceof Error ? error.message : '未知错误',
  });
}

function isAlreadyInRoomMessage(message: string) {
  return message.includes('已在房间') || message.toLowerCase().includes('already in');
}

export function isAlreadyInRoomError(error: unknown) {
  return isAlreadyInRoomMessage(getRoomApiErrorMessage(error, ''));
}

function findApiRoomData(value: unknown): ApiRoomData | null {
  if (!isRecord(value)) return null;

  const directPlayers = value.players ?? value.members;
  const directRoomCode = value.roomCode ?? value.room_code ?? value.id;
  if (Array.isArray(directPlayers) && (typeof directRoomCode === 'string' || typeof directRoomCode === 'number')) {
    return value as unknown as ApiRoomData;
  }

  const roomKeys = ['room', 'currentRoom', 'current_room', 'roomInfo', 'room_info'];
  for (const key of roomKeys) {
    const nestedRoom = findApiRoomData(value[key]);
    if (nestedRoom) return nestedRoom;
  }

  return null;
}

function findRoomCode(value: unknown): string | null {
  if (!isRecord(value)) return null;

  const roomCode = value.roomCode ?? value.room_code ?? value.roomId ?? value.room_id;
  if (typeof roomCode === 'string' || typeof roomCode === 'number') return String(roomCode);

  const roomKeys = ['data', 'room', 'currentRoom', 'current_room', 'roomInfo', 'room_info'];
  for (const key of roomKeys) {
    const nestedRoomCode = findRoomCode(value[key]);
    if (nestedRoomCode) return nestedRoomCode;
  }

  return null;
}

function findPlayerId(value: unknown): string | null {
  if (!isRecord(value)) return null;

  const playerId = value.playerId ?? value.player_id;
  if (typeof playerId === 'string' || typeof playerId === 'number') return String(playerId);

  const nestedKeys = ['data', 'room', 'currentRoom', 'current_room', 'roomInfo', 'room_info'];
  for (const key of nestedKeys) {
    const nestedPlayerId = findPlayerId(value[key]);
    if (nestedPlayerId) return nestedPlayerId;
  }

  return null;
}

function findPlayerIdByName(room: Room, playerName?: string) {
  if (!playerName) return '';

  return room.members.find(member => member.name === playerName)?.playerId ?? '';
}

export async function recoverJoinedRoomSession(
  error: unknown,
  fallbackPlayerName?: string
): Promise<RecoveredRoomSession | null> {
  if (!isAlreadyInRoomError(error)) return null;

  const envelope = getRoomApiErrorEnvelope(error);
  const payload = envelope?.data ?? envelope;
  const payloadRoom = findApiRoomData(payload);
  const room = payloadRoom ? normalizeRoomData(payloadRoom) : null;
  const roomCode = room?.id || findRoomCode(payload);
  const recoveredRoom = room ?? (roomCode ? await getOnlineRoom(roomCode) : null);

  if (recoveredRoom) {
    const playerId = findPlayerId(payload) || findPlayerIdByName(recoveredRoom, fallbackPlayerName);

    if (playerId) {
      return {
        room: recoveredRoom,
        playerId,
      };
    }
  }

  return getCurrentOnlineRoom(undefined, fallbackPlayerName).catch(() => null);
}

function normalizeRoomListItem(data: ApiRoomListItem): RoomListItem {
  return {
    id: data.roomCode,
    name: data.roomName,
    hostName: '房主',
    playerCount: data.playerCount,
    maxPlayers: data.maxPlayers,
    isPrivate: false,
    status: data.status,
  };
}

function normalizeJoinOnlineRoomData(data: JoinOnlineRoomData) {
  const playerId = normalizeRoomPlayerId(data.playerId ?? data.player_id);

  if (!playerId) {
    throw new Error('Join room failed: response is missing playerId');
  }

  return {
    room: normalizeRoomData(data.room),
    playerId,
  };
}

export async function createOnlineRoom(request: CreateOnlineRoomRequest): Promise<Room> {
  console.log('🏠 [createOnlineRoom] 发送请求:', JSON.stringify(request));
  try {
    const response = await apiClient.post<RoomApiEnvelope<ApiRoomData>>('/room/create', request);
    console.log('✅ [createOnlineRoom] 成功响应:', JSON.stringify(response.data));
    return normalizeRoomData(unwrapRoomApiResponse(response.data, '房间创建失败'));
  } catch (error) {
    logRoomApiError('createOnlineRoom', error);
    throw error;
  }
}

export async function joinOnlineRoom(request: JoinOnlineRoomRequest): Promise<{ room: Room; playerId: string }> {
  console.log('🔗 [joinOnlineRoom] 发送请求:', JSON.stringify(request));
  try {
    const response = await apiClient.post<RoomApiEnvelope<JoinOnlineRoomData>>('/room/join', request);
    console.log('✅ [joinOnlineRoom] 收到响应:', JSON.stringify(response.data));

    if (response.data.code !== 200 && !isAlreadyInRoomMessage(response.data.msg)) {
      throw new Error(response.data.msg || '加入房间失败');
    }

    if (!response.data.data) {
      throw new Error(response.data.msg || '加入房间失败');
    }

    return normalizeJoinOnlineRoomData(response.data.data);
  } catch (error) {
    logRoomApiError('joinOnlineRoom', error);
    throw error;
  }
}

export async function getOnlineRoom(roomCode: string): Promise<Room> {
  try {
    const response = await apiClient.get<RoomApiEnvelope<ApiRoomData>>(`/room/${roomCode}`);
    return normalizeRoomData(unwrapRoomApiResponse(response.data, '获取房间信息失败'));
  } catch (error) {
    logRoomApiError('getOnlineRoom', error);
    throw error;
  }
}

export async function getCurrentOnlineRoom(
  fallbackPlayerId?: string,
  fallbackPlayerName?: string
): Promise<RecoveredRoomSession | null> {
  const response = await apiClient.get<RoomApiEnvelope<unknown | null>>('/room/current');

  if (response.data.code !== 200) {
    throw new Error(response.data.msg || 'Get current room failed');
  }

  if (!response.data.data) return null;

  const payload = response.data.data;
  const roomData = findApiRoomData(payload);

  if (!roomData) {
    throw new Error('Get current room failed: response is missing room');
  }

  const room = normalizeRoomData(roomData);
  const playerId =
    findPlayerId(payload) ||
    room.members.find(member => member.playerId === fallbackPlayerId)?.playerId ||
    findPlayerIdByName(room, fallbackPlayerName);

  if (!playerId) {
    throw new Error('Get current room failed: response is missing playerId');
  }

  return { room, playerId };
}

export async function getWaitingRoomList(): Promise<RoomListItem[]> {
  console.log('📋 [getWaitingRoomList] 获取等待中的房间列表');
  try {
    const response = await apiClient.get<RoomApiEnvelope<RoomListResponseData | null>>('/room/list');
    console.log('✅ [getWaitingRoomList] 成功响应:', JSON.stringify(response.data));

    if (response.data.code !== 200) {
      throw new Error(response.data.msg || '获取房间列表失败');
    }

    return (response.data.data?.rooms ?? []).map(normalizeRoomListItem);
  } catch (error) {
    logRoomApiError('getWaitingRoomList', error);
    throw error;
  }
}

export async function leaveOnlineRoom(request: LeaveOnlineRoomRequest): Promise<void> {
  const response = await apiClient.post<RoomApiEnvelope<null>>('/room/leave', request);

  if (response.data.code !== 200) {
    throw new Error(response.data.msg || '退出房间失败');
  }
}

export async function dismissOnlineRoom(roomCode: string): Promise<void> {
  const response = await apiClient.delete<RoomApiEnvelope<null>>(`/room/${roomCode}`);

  if (response.data.code !== 200) {
    throw new Error(response.data.msg || '解散房间失败');
  }
}

export async function kickOnlineRoom(roomCode: string, request: KickOnlineRoomRequest): Promise<Room> {
  const response = await apiClient.post<RoomApiEnvelope<ApiRoomData>>(`/room/${roomCode}/kick`, {
    target_player_id: toBackendRoomPlayerId(request.target_player_id),
  });

  return normalizeRoomData(unwrapRoomApiResponse(response.data, 'Kick player failed'));
}

export async function setOnlineRoomReady(roomCode: string, request: SetOnlineRoomReadyRequest): Promise<Room> {
  const response = await apiClient.post<RoomApiEnvelope<ApiRoomData>>(`/room/${roomCode}/ready`, request);

  return normalizeRoomData(unwrapRoomApiResponse(response.data, 'Set ready status failed'));
}

export async function startOnlineRoom(roomCode: string): Promise<StartOnlineRoomData> {
  const response = await apiClient.post<RoomApiEnvelope<StartOnlineRoomData>>(`/room/${roomCode}/start`);

  const data = unwrapRoomApiResponse(response.data, '开始游戏失败');

  if (!data.gameId || !data.roomCode) {
    throw new Error('Start game failed: response is missing gameId or roomCode');
  }

  return data;
}
