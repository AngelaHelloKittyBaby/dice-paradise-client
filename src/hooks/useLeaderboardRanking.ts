import { useEffect, useState } from 'react';
import {
  getLeaderboardExperience,
  getLeaderboardHighestScore,
  getLeaderboardWinRate,
  getLeaderboardWinStreak,
} from '@/modules/leaderboard/leaderboardApi';
import type {
  LeaderboardExperienceData,
  LeaderboardHighestScoreData,
  LeaderboardItemBaseData,
  LeaderboardListData,
  LeaderboardWinRateData,
  LeaderboardWinStreakData,
} from '@/types/leaderboardApi';

interface UseLeaderboardRankingResult<TItem extends LeaderboardItemBaseData> {
  ranking: LeaderboardListData<TItem> | null;
  isLoading: boolean;
  error: string | null;
}

function useLeaderboardData<TItem extends LeaderboardItemBaseData>(
  request: (limit: number) => Promise<LeaderboardListData<TItem>>,
  limit: number,
  enabled: boolean,
  errorMessage: string
): UseLeaderboardRankingResult<TItem> {
  const [ranking, setRanking] = useState<LeaderboardListData<TItem> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    if (!enabled) {
      setIsLoading(false);
      setError(null);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    setError(null);

    request(limit)
      .then(nextRanking => {
        if (!isActive) return;
        setRanking(nextRanking);
      })
      .catch(requestError => {
        if (!isActive) return;
        setError(requestError instanceof Error ? requestError.message : errorMessage);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [enabled, errorMessage, limit, request]);

  return {
    ranking,
    isLoading,
    error,
  };
}

export function useLeaderboardHighestScoreRanking(
  limit = 10,
  enabled = true
): UseLeaderboardRankingResult<LeaderboardHighestScoreData['leaderboard'][number]> {
  return useLeaderboardData(getLeaderboardHighestScore, limit, enabled, '获取历史最高分排行榜失败');
}

export function useLeaderboardExperienceRanking(
  limit = 10,
  enabled = true
): UseLeaderboardRankingResult<LeaderboardExperienceData['leaderboard'][number]> {
  return useLeaderboardData(getLeaderboardExperience, limit, enabled, '获取投骰经验值排行榜失败');
}

export function useLeaderboardWinStreakRanking(
  limit = 10,
  enabled = true
): UseLeaderboardRankingResult<LeaderboardWinStreakData['leaderboard'][number]> {
  return useLeaderboardData(getLeaderboardWinStreak, limit, enabled, '获取最高连胜局数排行榜失败');
}

export function useLeaderboardWinRateRanking(
  limit = 10,
  enabled = true
): UseLeaderboardRankingResult<LeaderboardWinRateData['leaderboard'][number]> {
  return useLeaderboardData(getLeaderboardWinRate, limit, enabled, '获取胜率排行榜失败');
}
