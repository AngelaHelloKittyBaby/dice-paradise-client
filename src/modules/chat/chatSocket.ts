import { WS_URL } from '@/config/api';
import type { ChatSocketChatMessage, ChatSocketMessage, ChatSocketSystemMessage } from '@/types/chatSocket';

const API_VERSION_PATH = '/api/v1';
const CHAT_WS_PATH = `${API_VERSION_PATH}/chat/ws`;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function readOptionalString(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function normalizeWebSocketBaseUrl(baseUrl: string) {
  const trimmedUrl = baseUrl.trim().replace(/\/+$/, '');
  const socketUrl = trimmedUrl.startsWith('https://')
    ? `wss://${trimmedUrl.slice('https://'.length)}`
    : trimmedUrl.startsWith('http://')
      ? `ws://${trimmedUrl.slice('http://'.length)}`
      : trimmedUrl;
  const withoutLegacyWsPath = socketUrl.endsWith('/ws') ? socketUrl.slice(0, -3) : socketUrl;

  return withoutLegacyWsPath.endsWith(API_VERSION_PATH)
    ? withoutLegacyWsPath.slice(0, -API_VERSION_PATH.length)
    : withoutLegacyWsPath;
}

function getContentRecord(payload: JsonRecord) {
  return isRecord(payload.content) ? payload.content : payload;
}

function parseChatMessage(payload: JsonRecord): ChatSocketChatMessage | null {
  const content = getContentRecord(payload);
  const message = readString(content.message ?? content.text ?? payload.message ?? payload.text).trim();

  if (!message) return null;

  return {
    playerId: readString(
      payload.player_id ?? payload.playerId ?? payload.user_id ?? payload.userId ?? content.player_id ?? content.playerId
    ),
    playerName: readString(
      payload.player_name ??
        payload.playerName ??
        payload.nickname ??
        payload.username ??
        content.player_name ??
        content.playerName,
      '玩家'
    ),
    message,
    timestamp: readString(payload.timestamp ?? content.timestamp, new Date().toISOString()),
    avatar: readOptionalString(payload.avatar ?? content.avatar),
  };
}

function parseSystemMessage(payload: JsonRecord): ChatSocketSystemMessage | null {
  const content = getContentRecord(payload);
  const action = readOptionalString(content.action ?? payload.action);
  const message = readString(content.message ?? content.text ?? payload.message ?? payload.text ?? action).trim();

  if (!message) return null;

  return {
    action,
    message,
    playerId: readString(
      payload.player_id ?? payload.playerId ?? payload.user_id ?? payload.userId ?? content.player_id ?? content.playerId
    ),
    playerName: readString(
      payload.player_name ??
        payload.playerName ??
        payload.nickname ??
        payload.username ??
        content.player_name ??
        content.playerName,
      '玩家'
    ),
    timestamp: readString(payload.timestamp ?? content.timestamp, new Date().toISOString()),
  };
}

export function buildChatWebSocketUrl(channel: string, playerId: string) {
  const baseUrl = normalizeWebSocketBaseUrl(WS_URL);
  const encodedChannel = encodeURIComponent(channel);
  const encodedPlayerId = encodeURIComponent(playerId);

  return `${baseUrl}${CHAT_WS_PATH}/${encodedChannel}/${encodedPlayerId}`;
}

export function parseChatSocketMessage(message: string): ChatSocketMessage | null {
  try {
    const payload = JSON.parse(message) as unknown;
    if (!isRecord(payload)) return null;

    switch (payload.type) {
      case 'ping':
        return { type: 'ping' };
      case 'pong':
        return { type: 'pong' };
      case 'chat':
      case 'message': {
        const data = parseChatMessage(payload);
        return data ? { type: 'chat', data } : null;
      }
      case 'system': {
        const data = parseSystemMessage(payload);
        return data ? { type: 'system', data } : null;
      }
      case 'error':
        return { type: 'error', message: readString(payload.message, '聊天连接出现异常') };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
