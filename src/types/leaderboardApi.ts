import type { ApiGameMode } from './gameApi';

export interface UpdateLeaderboardWinsRequest {
  winner_id: number;
  game_mode: ApiGameMode;
}

export interface UpdateLeaderboardGamesRequest {
  winner_id: number;
  game_mode: ApiGameMode;
  last_play_time?: string | null;
}

export interface UpdateLeaderboardWinsData {
  user_id: number;
  total_wins: number;
  message: string;
}

export type UpdateLeaderboardGamesData = null;

export interface LeaderboardRankingItemData {
  rank: number;
  user_id: number;
  nickname: string;
  total_wins: number;
}

export interface LeaderboardGamesRankingItemData {
  rank: number;
  user_id: number;
  nickname: string;
  total_games: number;
}

export interface LeaderboardRankingData {
  leaderboard: LeaderboardRankingItemData[];
  total_count: number;
  my_ranking?: LeaderboardRankingItemData | null;
}

export interface LeaderboardGamesRankingData {
  leaderboard: LeaderboardGamesRankingItemData[];
  total_count: number;
  my_ranking?: LeaderboardGamesRankingItemData | null;
}
