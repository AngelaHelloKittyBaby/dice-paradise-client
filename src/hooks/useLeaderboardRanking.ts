import { useEffect, useState } from 'react';
import { getLeaderboardRanking } from '@/modules/leaderboard/leaderboardApi';
import type { LeaderboardRankingData } from '@/types/leaderboardApi';

interface UseLeaderboardRankingResult {
  ranking: LeaderboardRankingData | null;
  isLoading: boolean;
  error: string | null;
}

export function useLeaderboardRanking(limit = 10, enabled = true): UseLeaderboardRankingResult {
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

    getLeaderboardRanking(limit)
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
  }, [enabled, limit]);

  return {
    ranking,
    isLoading,
    error,
  };
}
