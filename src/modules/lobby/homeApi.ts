import { createApiClient } from '@/modules/api/createApiClient';
import type { HomePointsData, HomeSoundSettingsData, SaveHomeSoundSettingsRequest, SoundEnabledFlag } from '@/types/homeApi';

interface HomeApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

const apiClient = createApiClient();

function unwrapHomeApiResponse<T>(response: HomeApiEnvelope<T>, fallbackMessage: string): T {
  if (response.code !== 200 && (response.data === null || response.data === undefined)) {
    throw new Error(response.msg || fallbackMessage);
  }

  if (response.data === null || response.data === undefined) {
    throw new Error(fallbackMessage);
  }

  return response.data;
}

export async function getHomePoints(clientId: string): Promise<number> {
  if (!clientId.trim()) {
    throw new Error('缺少用户ID');
  }

  const response = await apiClient.get<HomeApiEnvelope<HomePointsData>>('/home/points', {
    params: {
      client_id: clientId,
    },
  });
  const data = unwrapHomeApiResponse(response.data, '获取星星积分失败');

  if (!Number.isFinite(data.points)) {
    throw new Error('获取星星积分失败');
  }

  return data.points;
}

function ensureClientId(clientId: string) {
  if (!clientId.trim()) {
    throw new Error('缺少用户ID');
  }
}

function toSoundEnabledFlag(soundEnabled: boolean): SoundEnabledFlag {
  return soundEnabled ? 1 : 0;
}

function normalizeSoundEnabled(data: HomeSoundSettingsData): boolean {
  const soundEnabled = data.soundEnabled ?? data.sound_enabled;

  if (soundEnabled !== 0 && soundEnabled !== 1) {
    throw new Error('获取音效设置失败');
  }

  return soundEnabled === 1;
}

export async function getHomeSoundSetting(clientId: string): Promise<boolean> {
  ensureClientId(clientId);

  const response = await apiClient.get<HomeApiEnvelope<HomeSoundSettingsData>>('/home/settings/sound', {
    params: {
      client_id: clientId,
    },
  });
  const data = unwrapHomeApiResponse(response.data, '获取音效设置失败');

  return normalizeSoundEnabled(data);
}

export async function saveHomeSoundSetting(clientId: string, soundEnabled: boolean): Promise<boolean> {
  ensureClientId(clientId);

  const request: SaveHomeSoundSettingsRequest = {
    client_id: clientId,
    sound_enabled: toSoundEnabledFlag(soundEnabled),
  };
  const response = await apiClient.post<HomeApiEnvelope<HomeSoundSettingsData>>('/home/settings/sound', request);
  const data = unwrapHomeApiResponse(response.data, '保存音效设置失败');

  try {
    return normalizeSoundEnabled(data);
  } catch {
    return soundEnabled;
  }
}
