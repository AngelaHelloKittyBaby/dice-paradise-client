import { createApiClient } from '@/modules/api/createApiClient';
import type {
  LeaderboardRankingData,
  UpdateLeaderboardWinsData,
  UpdateLeaderboardWinsRequest,
} from '@/types/leaderboardApi';

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

export async function updateLeaderboardWins(winnerId: number): Promise<UpdateLeaderboardWinsData> {
  const request: UpdateLeaderboardWinsRequest = {
    winner_id: winnerId,
  };
  const response = await apiClient.post<LeaderboardApiEnvelope<UpdateLeaderboardWinsData>>(
    '/leaderboard/update-wins',
    request
  );

  return unwrapLeaderboardApiResponse(response.data, '更新胜利次数失败');
}

export async function getLeaderboardRanking(limit = 10): Promise<LeaderboardRankingData> {
  const response = await apiClient.get<LeaderboardApiEnvelope<LeaderboardRankingData>>('/leaderboard/ranking', {
    params: {
      limit,
    },
  });

  return unwrapLeaderboardApiResponse(response.data, '获取排行榜失败');
}
