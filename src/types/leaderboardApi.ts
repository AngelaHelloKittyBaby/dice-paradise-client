export interface UpdateLeaderboardWinsRequest {
  winner_id: number;
}

export interface UpdateLeaderboardWinsData {
  user_id: number;
  total_wins: number;
  message: string;
}

export interface LeaderboardRankingItemData {
  rank: number;
  user_id: number;
  nickname: string;
  total_wins: number;
}

export interface LeaderboardRankingData {
  leaderboard: LeaderboardRankingItemData[];
  total_count: number;
  my_ranking?: LeaderboardRankingItemData | null;
}
