import { WS_URL } from '@/config/api';
import { normalizeRoomData } from './roomApi';
import type { ApiRoomData } from '@/types/roomApi';
import type {
  RoomSocketChatMessage,
  RoomSocketGameStartedMessage,
  RoomSocketMessage,
  RoomSocketPlayerKickedMessage,
  RoomSocketSystemMessage,
} from '@/types/roomSocket';

const API_VERSION_PATH = '/api/v1';
const ROOM_WS_PATH = `${API_VERSION_PATH}/room/ws`;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function normalizeRoomWsBaseUrl(baseUrl: string) {
  const trimmedUrl = baseUrl.trim().replace(/\/+$/, '');
  const withoutLegacyWsPath = trimmedUrl.endsWith('/ws') ? trimmedUrl.slice(0, -3) : trimmedUrl;

  return withoutLegacyWsPath.endsWith(API_VERSION_PATH)
    ? withoutLegacyWsPath.slice(0, -API_VERSION_PATH.length)
    : withoutLegacyWsPath;
}

function parseChatMessage(payload: JsonRecord): RoomSocketChatMessage | null {
  const content = payload.content;
  if (!isRecord(content)) return null;

  const message = readString(content.message).trim();
  if (!message) return null;

  return {
    playerId: readString(payload.player_id ?? payload.playerId),
    playerName: readString(payload.player_name ?? payload.playerName, '玩家'),
    message,
    timestamp: readString(payload.timestamp, new Date().toISOString()),
  };
}

function parseSystemMessage(payload: JsonRecord): RoomSocketSystemMessage | null {
  const content = payload.content;
  if (!isRecord(content)) return null;

  const action = readString(content.action);
  if (!action) return null;

  return {
    action,
    playerId: readString(content.player_id ?? content.playerId),
    playerName: readString(content.player_name ?? content.playerName, '玩家'),
    timestamp: readString(payload.timestamp, new Date().toISOString()),
  };
}

function parsePlayerKickedMessage(payload: JsonRecord): RoomSocketPlayerKickedMessage | null {
  const data = payload.data;
  if (!isRecord(data)) return null;

  return {
    roomCode: readString(data.room_code ?? data.roomCode),
    playerId: readString(data.player_id ?? data.playerId),
    message: readString(data.message, '你已被房主移出房间'),
  };
}

function parseGameStartedMessage(payload: JsonRecord): RoomSocketGameStartedMessage | null {
  const data = isRecord(payload.data) ? payload.data : payload;
  const gameId = readString(data.game_id ?? data.gameId);
  if (!gameId) return null;

  return {
    roomCode: readString(data.room_code ?? data.roomCode),
    gameId,
  };
}

export function buildRoomWebSocketUrl(roomCode: string, playerId: string) {
  const baseUrl = normalizeRoomWsBaseUrl(WS_URL);
  const encodedRoomCode = encodeURIComponent(roomCode);
  const encodedPlayerId = encodeURIComponent(playerId);

  return `${baseUrl}${ROOM_WS_PATH}/${encodedRoomCode}/${encodedPlayerId}`;
}

export function parseRoomSocketMessage(message: string): RoomSocketMessage | null {
  try {
    const payload = JSON.parse(message) as unknown;
    if (!isRecord(payload)) return null;

    switch (payload.type) {
      case 'ping':
        return { type: 'ping' };
      case 'pong':
        return { type: 'pong' };
      case 'room_updated':
        return isRecord(payload.data)
          ? {
              type: 'room_updated',
              room: normalizeRoomData(payload.data as ApiRoomData),
              gameId: readString(payload.data.game_id ?? payload.data.gameId) || undefined,
            }
          : null;
      case 'game_started': {
        const data = parseGameStartedMessage(payload);
        return data ? { type: 'game_started', data } : null;
      }
      case 'player_kicked': {
        const data = parsePlayerKickedMessage(payload);
        return data ? { type: 'player_kicked', data } : null;
      }
      case 'chat': {
        const data = parseChatMessage(payload);
        return data ? { type: 'chat', data } : null;
      }
      case 'system': {
        const data = parseSystemMessage(payload);
        return data ? { type: 'system', data } : null;
      }
      case 'error':
        return { type: 'error', message: readString(payload.message, '房间连接出现异常') };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
