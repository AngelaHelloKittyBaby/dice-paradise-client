import { createApiClient } from '@/modules/api/createApiClient';
import type {
  GameSettleData,
  GameSettleRequest,
  LeaderboardExperienceData,
  LeaderboardHighestScoreData,
  LeaderboardWinRateData,
  LeaderboardWinStreakData,
  LeaderboardUpdateGamesMode,
  UpdateLeaderboardGamesData,
  UpdateLeaderboardGamesRequest,
} from '@/types/leaderboardApi';

interface LeaderboardApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

const apiClient = createApiClient();

function formatLocalIsoDateTime(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 19);
}

function unwrapLeaderboardApiResponse<T>(response: LeaderboardApiEnvelope<T>, fallbackMessage: string): T {
  if (response.code !== 200 || response.data === null || response.data === undefined) {
    throw new Error(response.msg || fallbackMessage);
  }

  return response.data;
}

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) return 10;

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

export async function getLeaderboardHighestScore(limit = 10): Promise<LeaderboardHighestScoreData> {
  const response = await apiClient.get<LeaderboardApiEnvelope<LeaderboardHighestScoreData>>(
    '/leaderboard/highest-score',
    {
      params: {
        limit: normalizeLimit(limit),
      },
    }
  );

  return unwrapLeaderboardApiResponse(response.data, '获取历史最高分排行榜失败');
}

export async function getLeaderboardExperience(limit = 10): Promise<LeaderboardExperienceData> {
  const response = await apiClient.get<LeaderboardApiEnvelope<LeaderboardExperienceData>>(
    '/leaderboard/experience',
    {
      params: {
        limit: normalizeLimit(limit),
      },
    }
  );

  return unwrapLeaderboardApiResponse(response.data, '获取投骰经验值排行榜失败');
}

export async function getLeaderboardWinStreak(limit = 10): Promise<LeaderboardWinStreakData> {
  const response = await apiClient.get<LeaderboardApiEnvelope<LeaderboardWinStreakData>>(
    '/leaderboard/win-streak',
    {
      params: {
        limit: normalizeLimit(limit),
      },
    }
  );

  return unwrapLeaderboardApiResponse(response.data, '获取最高连胜局数排行榜失败');
}

export async function getLeaderboardWinRate(limit = 10): Promise<LeaderboardWinRateData> {
  const response = await apiClient.get<LeaderboardApiEnvelope<LeaderboardWinRateData>>(
    '/leaderboard/win-rate',
    {
      params: {
        limit: normalizeLimit(limit),
      },
    }
  );

  return unwrapLeaderboardApiResponse(response.data, '获取胜率排行榜失败');
}

export async function settleLeaderboardGame(request: GameSettleRequest): Promise<GameSettleData> {
  const response = await apiClient.post<LeaderboardApiEnvelope<GameSettleData>>(
    '/leaderboard/game-settle',
    request
  );

  return unwrapLeaderboardApiResponse(response.data, '游戏结算失败');
}

export async function updateLeaderboardGames(
  winnerId: number,
  gameMode: LeaderboardUpdateGamesMode,
  lastPlayTime = formatLocalIsoDateTime(new Date())
): Promise<UpdateLeaderboardGamesData> {
  const request: UpdateLeaderboardGamesRequest = {
    winner_id: winnerId,
    game_mode: gameMode,
    last_play_time: lastPlayTime,
  };
  const response = await apiClient.post<LeaderboardApiEnvelope<UpdateLeaderboardGamesData>>(
    '/leaderboard/update-games',
    request
  );

  return unwrapLeaderboardApiResponse(response.data, '更新总对局次数失败');
}
