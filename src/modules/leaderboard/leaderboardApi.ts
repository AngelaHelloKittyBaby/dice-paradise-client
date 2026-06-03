import { createApiClient } from '@/modules/api/createApiClient';
import type {
  LeaderboardGamesRankingData,
  LeaderboardRankingData,
  UpdateLeaderboardGamesData,
  UpdateLeaderboardGamesRequest,
  UpdateLeaderboardWinsData,
  UpdateLeaderboardWinsRequest,
} from '@/types/leaderboardApi';
import type { ApiGameMode } from '@/types/gameApi';

interface LeaderboardApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

const apiClient = createApiClient();

function unwrapLeaderboardApiResponse<T>(response: LeaderboardApiEnvelope<T>, fallbackMessage: string): T {
  if (response.code !== 200 || response.data === null || response.data === undefined) {
    throw new Error(response.msg || fallbackMessage);
  }

  return response.data;
}

function unwrapLeaderboardNullableApiResponse<T>(response: LeaderboardApiEnvelope<T> | T, fallbackMessage: string): T {
  if (response && typeof response === 'object' && 'code' in response) {
    const envelope = response as LeaderboardApiEnvelope<T>;
    if (envelope.code !== 200) {
      throw new Error(envelope.msg || fallbackMessage);
    }

    return envelope.data;
  }

  return response as T;
}

export async function updateLeaderboardWins(
  winnerId: number,
  gameMode: ApiGameMode
): Promise<UpdateLeaderboardWinsData> {
  const request: UpdateLeaderboardWinsRequest = {
    winner_id: winnerId,
    game_mode: gameMode,
  };
  const response = await apiClient.post<LeaderboardApiEnvelope<UpdateLeaderboardWinsData>>(
    '/leaderboard/update-wins',
    request
  );

  return unwrapLeaderboardApiResponse(response.data, '更新胜利次数失败');
}

export async function updateLeaderboardGames(
  winnerId: number,
  gameMode: ApiGameMode
): Promise<UpdateLeaderboardGamesData> {
  const request: UpdateLeaderboardGamesRequest = {
    winner_id: winnerId,
    game_mode: gameMode,
  };
  const response = await apiClient.post<LeaderboardApiEnvelope<UpdateLeaderboardGamesData> | UpdateLeaderboardGamesData>(
    '/leaderboard/update-games',
    request
  );

  return unwrapLeaderboardNullableApiResponse(response.data, '更新总对局次数失败');
}

export async function getLeaderboardRanking(limit = 10, userId?: string | null): Promise<LeaderboardRankingData> {
  const response = await apiClient.get<LeaderboardApiEnvelope<LeaderboardRankingData>>('/leaderboard/ranking', {
    params: {
      limit,
      ...(userId ? { user_id: userId } : {}),
    },
  });

  return unwrapLeaderboardApiResponse(response.data, '获取排行榜失败');
}

export async function getLeaderboardGamesRanking(limit = 10): Promise<LeaderboardGamesRankingData> {
  const response = await apiClient.get<LeaderboardApiEnvelope<LeaderboardGamesRankingData>>(
    '/leaderboard/ranking-games',
    {
      params: {
        limit,
      },
    }
  );

  return unwrapLeaderboardApiResponse(response.data, '获取总对局排行榜失败');
}
