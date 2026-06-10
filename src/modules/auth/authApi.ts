import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { createApiClient } from '@/modules/api/createApiClient';
import type { Player, PlayerStats } from '@/types/player';
import type {
  AuthLoginRequest,
  AuthRegisterRequest,
  AuthSession,
  AuthSuccessResponse,
  AuthUserResponse,
} from '@/types/authApi';

interface ValidationErrorItem {
  msg?: string;
}

interface AuthErrorResponse {
  detail?: string | ValidationErrorItem[];
  message?: string;
  msg?: string;
}

export class AuthApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

const apiClient = createApiClient();
const AUTH_TOKEN_VERIFY_PATH = '/auth/me';
const AUTH_TOKEN_VERIFY_TIMEOUT_MS = 8_000;

function getAuthorizationHeader(token: string, tokenType?: string | null) {
  const normalizedTokenType = tokenType?.trim();
  const authorizationType = normalizedTokenType
    ? `${normalizedTokenType.charAt(0).toUpperCase()}${normalizedTokenType.slice(1)}`
    : 'Bearer';

  return `${authorizationType} ${token}`;
}

export function isInvalidAuthTokenError(error: unknown) {
  return error instanceof AuthApiError && (error.status === 401 || error.status === 403);
}

function normalizeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function normalizeAuthPlayer(user: AuthUserResponse): Player {
  const points = normalizeNumber(user.points);
  const totalGames = normalizeNumber(user.total_games);
  const totalWins = normalizeNumber(user.total_wins);
  const losses = Math.max(totalGames - totalWins, 0);

  return {
    id: String(user.id),
    name: user.nickname?.trim() || `玩家${user.id}`,
    avatar: '',
    level: 1,
    exp: 0,
    coins: points,
    gems: points,
    wins: totalWins,
    losses,
    createdAt: new Date().toISOString(),
  };
}

function normalizeAuthStats(user: AuthUserResponse): PlayerStats {
  const totalGames = normalizeNumber(user.total_games);
  const wins = normalizeNumber(user.total_wins);
  const losses = Math.max(totalGames - wins, 0);

  return {
    totalGames,
    wins,
    losses,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    highestScore: normalizeNumber(user.highest_score),
    averageScore: 0,
    yachtCount: 0,
  };
}

function normalizeAuthSession(response: AuthSuccessResponse): AuthSession {
  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    player: normalizeAuthPlayer(response.user),
    stats: normalizeAuthStats(response.user),
  };
}

function getValidationMessage(detail: ValidationErrorItem[]) {
  const messages = detail
    .map(item => item.msg?.trim())
    .filter((message): message is string => Boolean(message));

  return messages[0] ?? '请求参数不完整或格式不正确';
}

function toAuthApiError(error: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError<AuthErrorResponse>(error)) {
    return error instanceof Error ? error : new AuthApiError(fallbackMessage);
  }

  const data = error.response?.data;
  const detail = data?.detail;
  const message = Array.isArray(detail)
    ? getValidationMessage(detail)
    : detail || data?.message || data?.msg || fallbackMessage;

  return new AuthApiError(message, error.response?.status);
}

export async function loginWithNickname(request: { nickname: string; password: string }): Promise<AuthSession> {
  try {
    const response = await apiClient.post<AuthSuccessResponse>('/auth/login', {
      account: request.nickname,
      password: request.password,
    } satisfies AuthLoginRequest);

    return normalizeAuthSession(response.data);
  } catch (error) {
    throw toAuthApiError(error, '登录失败，请稍后重试');
  }
}

export async function verifyAuthToken(request: { token: string; tokenType?: string | null }): Promise<void> {
  const normalizedToken = request.token.trim();

  if (!normalizedToken) {
    throw new AuthApiError('Missing auth token', 401);
  }

  try {
    await axios.get(`${API_BASE_URL}${AUTH_TOKEN_VERIFY_PATH}`, {
      headers: {
        Authorization: getAuthorizationHeader(normalizedToken, request.tokenType),
      },
      timeout: AUTH_TOKEN_VERIFY_TIMEOUT_MS,
    });
  } catch (error) {
    throw toAuthApiError(error, 'Token validation failed');
  }
}

export async function registerWithNickname(request: { nickname: string; password: string; phone?: string }): Promise<AuthSession> {
  try {
    const response = await apiClient.post<AuthSuccessResponse>('/auth/register', {
      nickname: request.nickname,
      phone: request.phone ?? request.nickname,
      password: request.password,
    } satisfies AuthRegisterRequest);

    return normalizeAuthSession(response.data);
  } catch (error) {
    throw toAuthApiError(error, '注册失败，请稍后重试');
  }
}
