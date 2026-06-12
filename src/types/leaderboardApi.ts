export interface LeaderboardItemBaseData {
  rank: number;
  user_id: number;
  nickname: string | null;
  avatar: string | null;
  achieve_time?: string | null;
}

export interface LeaderboardHighestScoreItemData extends LeaderboardItemBaseData {
  score: number;
}

export interface LeaderboardExperienceItemData extends LeaderboardItemBaseData {
  experience: number;
}

export interface LeaderboardWinStreakItemData extends LeaderboardItemBaseData {
  streak: number;
}

export interface LeaderboardWinRateItemData extends LeaderboardItemBaseData {
  total_games: number;
  total_wins: number;
  win_rate: number;
  last_play_time: string | null;
}

export interface LeaderboardListData<TItem extends LeaderboardItemBaseData> {
  leaderboard: TItem[];
  total_count: number;
}

export type LeaderboardHighestScoreData = LeaderboardListData<LeaderboardHighestScoreItemData>;
export type LeaderboardExperienceData = LeaderboardListData<LeaderboardExperienceItemData>;
export type LeaderboardWinStreakData = LeaderboardListData<LeaderboardWinStreakItemData>;
export type LeaderboardWinRateData = LeaderboardListData<LeaderboardWinRateItemData>;

export type LeaderboardUpdateGamesMode = 'local' | 'ai' | 'online';

export interface UpdateLeaderboardGamesRequest {
  winner_id: number;
  game_mode: LeaderboardUpdateGamesMode;
  last_play_time?: string | null;
}

export interface UpdateLeaderboardGamesData {
  user_id: number;
  total_games: number;
  last_play_time: string | null;
  message: string;
}

export interface GameSettlePlayerRequest {
  user_id: number;
  rank: number;
  total_score: number;
}

export interface GameSettleRequest {
  game_id: number;
  game_mode: number;
  players: GameSettlePlayerRequest[];
}

export interface GameSettlePlayerResultData {
  user_id: number;
  rank: number;
  base_experience: number;
  rank_reward: number;
  score_bonus: number;
  streak_bonus: number;
  mode_multiplier: number;
  total_experience: number;
  old_experience: number;
  new_experience: number;
  win_streak_updated: boolean;
  old_streak: number;
  new_streak: number;
}

export interface GameSettleData {
  game_id: number;
  results: GameSettlePlayerResultData[];
}
