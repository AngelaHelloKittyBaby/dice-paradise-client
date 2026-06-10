import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/config/api';
import { usePlayerStore } from '@/stores/playerStore';

interface ApiErrorPayload {
  detail?: unknown;
  message?: unknown;
  msg?: unknown;
}

let isRedirectingToLogin = false;

export class ApiAuthenticationRequiredError extends Error {
  constructor(message = '请先登录后再继续') {
    super(message);
    this.name = 'ApiAuthenticationRequiredError';
  }
}

function getApiPayloadText(payload?: ApiErrorPayload) {
  if (!payload) return '';

  const { detail, message, msg } = payload;

  return [detail, message, msg]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

function getApiErrorText(error: AxiosError<ApiErrorPayload>) {
  return `${getApiPayloadText(error.response?.data)} ${error.message.toLowerCase()}`;
}

function isAuthEndpoint(url?: string) {
  return Boolean(url?.includes('/auth/login') || url?.includes('/auth/register'));
}

function readRequestBody(data: unknown): Record<string, unknown> | null {
  if (typeof data === 'string') {
    try {
      const parsedData = JSON.parse(data) as unknown;
      return readRequestBody(parsedData);
    } catch {
      return null;
    }
  }

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  return null;
}

function getRequestGameMode(data: unknown) {
  const requestBody = readRequestBody(data);
  const gameMode = requestBody?.game_mode;

  return typeof gameMode === 'string' ? gameMode : null;
}

function requiresAuthToken(url?: string, data?: unknown) {
  if (url?.includes('/room/create') || url?.includes('/room/join')) return true;

  if (url?.includes('/game/create')) {
    return getRequestGameMode(data) !== 'ai';
  }

  return false;
}

function getAuthenticationRequiredMessage(url?: string) {
  if (url?.includes('/room/join')) return '请先登录后再加入房间';
  if (url?.includes('/room/create')) return '请先登录后再创建房间';
  if (url?.includes('/game/')) return '请先登录后再继续对局';

  return '请先登录后再继续';
}

function isUnauthenticatedMessage(message: string) {
  return message.includes('未登录')
    || message.includes('请先登录')
    || message.includes('unauthenticated')
    || message.includes('not authenticated')
    || message.includes('unauthorized');
}

function shouldRedirectToLogin(error: AxiosError<ApiErrorPayload>) {
  if (isAuthEndpoint(error.config?.url)) return false;

  return error.response?.status === 401 || isUnauthenticatedMessage(getApiErrorText(error));
}

export function isApiAuthenticationRequiredError(error: unknown) {
  return error instanceof ApiAuthenticationRequiredError
    || (axios.isAxiosError<ApiErrorPayload>(error) && shouldRedirectToLogin(error));
}

function shouldRedirectResponseToLogin(response: AxiosResponse<ApiErrorPayload>) {
  return !isAuthEndpoint(response.config.url) && isUnauthenticatedMessage(getApiPayloadText(response.data));
}

function redirectToLogin() {
  if (typeof window === 'undefined' || isRedirectingToLogin) return;

  isRedirectingToLogin = true;
  usePlayerStore.getState().logout();
  window.location.replace('/login?mode=login&reason=auth-required');
}

export function createApiClient() {
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 12_000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  apiClient.interceptors.request.use(config => {
    const { authToken, tokenType } = usePlayerStore.getState();
    const normalizedAuthToken = authToken?.trim();

    if (requiresAuthToken(config.url, config.data) && !normalizedAuthToken) {
      redirectToLogin();
      return Promise.reject(new ApiAuthenticationRequiredError(getAuthenticationRequiredMessage(config.url)));
    }

    if (normalizedAuthToken) {
      const authorizationType = tokenType
        ? `${tokenType.charAt(0).toUpperCase()}${tokenType.slice(1)}`
        : 'Bearer';

      config.headers.Authorization = `${authorizationType} ${normalizedAuthToken}`;
    }

    return config;
  });

  apiClient.interceptors.response.use(
    response => {
      if (shouldRedirectResponseToLogin(response)) {
        redirectToLogin();
      }

      return response;
    },
    (error: unknown) => {
      if (axios.isAxiosError<ApiErrorPayload>(error) && shouldRedirectToLogin(error)) {
        redirectToLogin();
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
}
