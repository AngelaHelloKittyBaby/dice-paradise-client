const API_VERSION_PATH = '/api/v1';
const DEFAULT_API_ORIGIN = 'http://192.168.21.14:8000';
const DEFAULT_WS_URL = 'ws://192.168.21.14:8000';

export function normalizeApiBaseUrl(baseUrl?: string) {
  const normalizedUrl = (baseUrl?.trim() || `${DEFAULT_API_ORIGIN}${API_VERSION_PATH}`).replace(/\/+$/, '');

  return normalizedUrl.endsWith(API_VERSION_PATH) ? normalizedUrl : `${normalizedUrl}${API_VERSION_PATH}`;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL?.trim() || DEFAULT_WS_URL;
