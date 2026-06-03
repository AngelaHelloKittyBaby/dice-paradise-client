import { useEffect, useState } from 'react';
import { getLeaderboardGamesRanking, getLeaderboardRanking } from '@/modules/leaderboard/leaderboardApi';
import type { LeaderboardGamesRankingData, LeaderboardRankingData } from '@/types/leaderboardApi';

interface UseLeaderboardRankingResult {
  ranking: LeaderboardRankingData | null;
  isLoading: boolean;
  error: string | null;
}

export function useLeaderboardRanking(
  limit = 10,
  enabled = true,
  userId?: string | null
): UseLeaderboardRankingResult {
  const [ranking, setRanking] = useState<LeaderboardRankingData | null>(null);
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

    getLeaderboardRanking(limit, userId)
      .then(nextRanking => {
        if (!isActive) return;
        setRanking(nextRanking);
      })
      .catch(requestError => {
        if (!isActive) return;
        setError(requestError instanceof Error ? requestError.message : '获取排行榜失败');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [enabled, limit, userId]);

  return {
    ranking,
    isLoading,
    error,
  };
}

interface UseLeaderboardGamesRankingResult {
  ranking: LeaderboardGamesRankingData | null;
  isLoading: boolean;
  error: string | null;
}

export function useLeaderboardGamesRanking(limit = 10, enabled = true): UseLeaderboardGamesRankingResult {
  const [ranking, setRanking] = useState<LeaderboardGamesRankingData | null>(null);
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

    getLeaderboardGamesRanking(limit)
      .then(nextRanking => {
        if (!isActive) return;
        setRanking(nextRanking);
      })
      .catch(requestError => {
        if (!isActive) return;
        setError(requestError instanceof Error ? requestError.message : '获取总对局排行榜失败');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [enabled, limit]);

  return {
    ranking,
    isLoading,
    error,
  };
}
