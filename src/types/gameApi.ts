import type { DiceValue, ScoreCategory } from './game';

export type ApiGameMode = 'local' | 'ai' | 'online';
export type ApiAiDifficulty = 'easy' | 'medium' | 'hard';

export interface CreateGameRequest {
  game_mode: ApiGameMode;
  player_name?: string | null;
  room_code?: string | null;
  ai_difficulty?: ApiAiDifficulty | 'normal' | string | null;
  client_id?: string | null;
}

export interface ApiCreateGameData {
  gameId?: string | number;
  game_id?: string | number;
  playerId?: string | number;
  player_id?: string | number;
  userType?: string;
  user_type?: string;
  hasPoints?: boolean;
  has_points?: boolean;
  currentPoints?: number | null;
  current_points?: number | null;
}

export interface CreateGameData {
  gameId: string;
  playerId: string;
  userType: string;
  hasPoints: boolean;
  currentPoints: number;
}

export interface RollDiceRequest {
  player_id: string | number;
  locked_dice?: boolean[];
}

export interface RollDiceData {
  dice?: number[];
  diceLocked?: boolean[];
  dice_locked?: boolean[];
  rollsLeft?: number;
  rolls_left?: number;
}

export interface RollDiceSnapshot {
  dice: DiceValue[];
  diceLocked: boolean[];
  rollsLeft: number;
}

export interface ResetDiceRequest {
  player_id: string | number;
}

export interface ToggleDiceLockRequest {
  player_id: string | number;
  dice_index: number;
}

export interface ToggleDiceLockData {
  diceLocked?: boolean[];
  dice_locked?: boolean[];
}

export interface ToggleDiceLockSnapshot {
  diceLocked: boolean[];
}

export type ApiScoreCategory = Exclude<ScoreCategory, 'yacht'> | 'yahtzee';
export type ApiGameStatus = 'waiting' | 'playing' | 'finished' | string;

export interface SubmitScoreRequest {
  player_id: string | number;
  category: ScoreCategory;
}

export type ApiScoreMap = Record<ApiScoreCategory, number | null>;

export interface ApiGamePlayer {
  playerId?: string | number;
  player_id?: string | number;
  name: string;
  isAi?: boolean;
  is_ai?: boolean;
  scores?: Partial<ApiScoreMap>;
  totalScore?: number;
  total_score?: number;
}

export interface ApiGameStatusData {
  gameId?: string;
  game_id?: string;
  gameMode?: ApiGameMode;
  game_mode?: ApiGameMode;
  currentPlayer?: string | number | null;
  current_player?: string | number | null;
  players: ApiGamePlayer[];
  dice?: number[];
  diceLocked?: boolean[];
  dice_locked?: boolean[];
  rollsLeft?: number;
  rolls_left?: number;
  status: ApiGameStatus;
  createdAt?: string | null;
  created_at?: string | null;
  finishedAt?: string | null;
  finished_at?: string | null;
}

export interface ApiScoreSubmitData {
  submit_success: boolean;
  player_id: number;
  score_item_id: number;
  score_value: number;
  total_score: number;
  upper_score: number;
  lower_score: number;
  bonus_score: number;
  game_status: number;
  next_player_id: number | null;
}

export interface ScoreSubmitSnapshot {
  submitSuccess: boolean;
  playerId: string;
  scoreItemId: number;
  category: ScoreCategory;
  scoreValue: number;
  upperScore: number;
  lowerScore: number;
  bonusScore: number;
  totalScore: number;
  gameStatus: number | string;
  nextPlayerId: string | null;
  isGameFinished: boolean;
}

export interface QuitGameRequest {
  player_id: string | number;
}

export interface GamePlayerSnapshot {
  playerId: string;
  name: string;
  isAi: boolean;
  scores: Partial<Record<ScoreCategory, number>>;
  totalScore: number;
}

export interface GameStatusSnapshot {
  gameId: string;
  gameMode: ApiGameMode;
  currentPlayer: string | null;
  players: GamePlayerSnapshot[];
  dice: DiceValue[];
  diceLocked: boolean[];
  rollsLeft: number;
  status: ApiGameStatus;
  createdAt: string | null;
  finishedAt: string | null;
}
