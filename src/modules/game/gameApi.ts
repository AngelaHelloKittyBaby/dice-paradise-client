import { createApiClient } from '@/modules/api/createApiClient';
import type { DiceValue, ScoreCategory } from '@/types/game';
import type {
  ApiAiDifficulty,
  ApiCreateGameData,
  ApiGameStatusData,
  ApiScoreCategory,
  CreateGameData,
  CreateGameRequest,
  GameStatusSnapshot,
  QuitGameRequest,
  ResetDiceRequest,
  RollDiceData,
  RollDiceRequest,
  RollDiceSnapshot,
  ToggleDiceLockData,
  ToggleDiceLockRequest,
  ToggleDiceLockSnapshot,
} from '@/types/gameApi';

interface GameApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

export class GameApiError extends Error {
  code?: number;
  status?: number;

  constructor(message: string, options: { code?: number; status?: number } = {}) {
    super(message);
    this.name = 'GameApiError';
    this.code = options.code;
    this.status = options.status;
  }
}

const apiClient = createApiClient();

const scoreKeyMap: Record<ApiScoreCategory, ScoreCategory> = {
  ones: 'ones',
  twos: 'twos',
  threes: 'threes',
  fours: 'fours',
  fives: 'fives',
  sixes: 'sixes',
  threeOfAKind: 'threeOfAKind',
  fourOfAKind: 'fourOfAKind',
  fullHouse: 'fullHouse',
  smallStraight: 'smallStraight',
  largeStraight: 'largeStraight',
  yahtzee: 'yacht',
  chance: 'chance',
};

function normalizeOptionalText(value: string | null | undefined) {
  return value?.trim() || undefined;
}

function normalizeAiDifficulty(value: string | null | undefined): ApiAiDifficulty | undefined {
  if (value === 'normal' || value === 'medium') return 'medium';
  if (value === 'easy' || value === 'hard') return value;

  return undefined;
}

function normalizeCreateGameRequest(request: CreateGameRequest): CreateGameRequest {
  const playerName = normalizeOptionalText(request.player_name);
  const roomCode = normalizeOptionalText(request.room_code);
  const clientId = normalizeOptionalText(request.client_id);
  const aiDifficulty = normalizeAiDifficulty(request.ai_difficulty);

  return {
    game_mode: request.game_mode,
    ...(playerName ? { player_name: playerName } : {}),
    ...(roomCode ? { room_code: roomCode } : {}),
    ...(request.game_mode === 'ai' && aiDifficulty ? { ai_difficulty: aiDifficulty } : {}),
    ...(request.game_mode === 'ai' && clientId ? { client_id: clientId } : {}),
  };
}

function unwrapGameApiResponse<T>(response: GameApiEnvelope<T>, fallbackMessage: string): T {
  if (response.code !== 200) {
    throw new Error(response.msg || fallbackMessage);
  }

  if (!response.data) {
    throw new Error(fallbackMessage);
  }

  return response.data;
}

function ensureGameApiSuccess(response: GameApiEnvelope<unknown>, fallbackMessage: string) {
  if (response.code !== 200) {
    throw new Error(response.msg || fallbackMessage);
  }
}

function normalizePlayerId(playerId: string | number | null | undefined) {
  return playerId === null || playerId === undefined ? null : String(playerId);
}

function toBackendPlayerId(playerId: string | number) {
  return String(playerId);
}

function normalizeRollsLeft(rollsLeft: number | undefined) {
  if (!Number.isInteger(rollsLeft)) return 3;

  return Math.max(0, Math.min(3, rollsLeft as number));
}

function normalizeDiceValue(value: number): DiceValue {
  return value >= 1 && value <= 6 ? (value as DiceValue) : 1;
}

function normalizeDiceValues(dice: number[] | undefined): DiceValue[] {
  const normalizedDice = dice?.slice(0, 5).map(normalizeDiceValue) ?? [];

  return normalizedDice.length === 5 ? normalizedDice : [1, 1, 1, 1, 1];
}

function normalizeScores(scores: ApiGameStatusData['players'][number]['scores']) {
  return Object.entries(scores ?? {}).reduce<Partial<Record<ScoreCategory, number>>>((result, [key, value]) => {
    if (value === null || value === undefined) return result;

    const category = scoreKeyMap[key as ApiScoreCategory];
    if (!category) return result;

    return {
      ...result,
      [category]: value,
    };
  }, {});
}

function normalizeDiceLocked(diceLocked: boolean[] | undefined, fallbackLocked?: boolean[]) {
  const hasValidFallback = fallbackLocked?.length === 5;
  const hasValidServerLocks = diceLocked?.length === 5;

  if (!hasValidServerLocks) {
    return hasValidFallback ? fallbackLocked : [false, false, false, false, false];
  }

  if (diceLocked.some(Boolean) || !hasValidFallback || !fallbackLocked.some(Boolean)) {
    return diceLocked;
  }

  return fallbackLocked;
}

function normalizeCreateGameData(data: ApiCreateGameData): CreateGameData {
  const gameId = data.gameId ?? data.game_id;
  const playerId = data.playerId ?? data.player_id;

  if (gameId === null || gameId === undefined || playerId === null || playerId === undefined) {
    throw new Error('Game create response is missing gameId or playerId');
  }

  return {
    gameId: String(gameId),
    playerId: String(playerId),
    userType: data.userType ?? data.user_type ?? '',
    hasPoints: Boolean(data.hasPoints ?? data.has_points),
    currentPoints: data.currentPoints ?? data.current_points ?? 0,
  };
}

export function normalizeGameStatus(data: ApiGameStatusData): GameStatusSnapshot {
  return {
    gameId: data.gameId ?? data.game_id ?? '',
    gameMode: data.gameMode ?? data.game_mode ?? 'local',
    currentPlayer: normalizePlayerId(data.currentPlayer ?? data.current_player),
    players: data.players.map(player => ({
      playerId: String(player.playerId ?? player.player_id ?? ''),
      name: player.name,
      isAi: Boolean(player.isAi ?? player.is_ai),
      scores: normalizeScores(player.scores),
      totalScore: player.totalScore ?? player.total_score ?? 0,
    })),
    dice: normalizeDiceValues(data.dice),
    diceLocked: normalizeDiceLocked(data.diceLocked ?? data.dice_locked),
    rollsLeft: normalizeRollsLeft(data.rollsLeft ?? data.rolls_left),
    status: data.status,
    createdAt: data.createdAt ?? data.created_at ?? null,
    finishedAt: data.finishedAt ?? data.finished_at ?? null,
  };
}

export function normalizeRollDiceData(data: RollDiceData, fallbackLocked?: boolean[]): RollDiceSnapshot {
  return {
    dice: normalizeDiceValues(data.dice),
    diceLocked: normalizeDiceLocked(data.diceLocked ?? data.dice_locked, fallbackLocked),
    rollsLeft: normalizeRollsLeft(data.rollsLeft ?? data.rolls_left),
  };
}

export function normalizeToggleDiceLockData(data: ToggleDiceLockData, fallbackLocked?: boolean[]): ToggleDiceLockSnapshot {
  return {
    diceLocked: normalizeDiceLocked(data.diceLocked ?? data.dice_locked, fallbackLocked),
  };
}

export async function createGame(request: CreateGameRequest): Promise<CreateGameData> {
  const normalizedRequest = normalizeCreateGameRequest(request);

  try {
    const response = await apiClient.post<GameApiEnvelope<ApiCreateGameData>>('/game/create', normalizedRequest);
    return normalizeCreateGameData(unwrapGameApiResponse(response.data, '游戏创建失败'));
  } catch (error) {
    throw error;
  }
}
export async function getGameStatus(gameId: string): Promise<GameStatusSnapshot> {
  const response = await apiClient.get<GameApiEnvelope<ApiGameStatusData>>(`/game/${gameId}`);
  return normalizeGameStatus(unwrapGameApiResponse(response.data, '获取游戏状态失败'));
}

export async function rollGameDice(gameId: string, request: RollDiceRequest): Promise<RollDiceSnapshot> {
  const response = await apiClient.post<GameApiEnvelope<RollDiceData>>(`/game/${gameId}/roll`, {
    ...request,
    player_id: toBackendPlayerId(request.player_id),
  });
  return normalizeRollDiceData(unwrapGameApiResponse(response.data, '掷骰子失败'), request.locked_dice);
}

export async function resetGameDice(gameId: string, request: ResetDiceRequest): Promise<RollDiceSnapshot> {
  const response = await apiClient.post<GameApiEnvelope<RollDiceData>>(`/game/${gameId}/dice/reset`, {
    ...request,
    player_id: toBackendPlayerId(request.player_id),
  });
  return normalizeRollDiceData(unwrapGameApiResponse(response.data, '重置骰子失败'));
}

export async function toggleGameDiceLock(
  gameId: string,
  request: ToggleDiceLockRequest
): Promise<ToggleDiceLockSnapshot> {
  const response = await apiClient.post<GameApiEnvelope<ToggleDiceLockData>>(
    `/game/${gameId}/dice/toggle`,
    {
      ...request,
      player_id: toBackendPlayerId(request.player_id),
    }
  );
  return normalizeToggleDiceLockData(unwrapGameApiResponse(response.data, '切换骰子锁定失败'));
}

export async function quitGame(gameId: string, request: QuitGameRequest): Promise<void> {
  const response = await apiClient.post<GameApiEnvelope<null>>(`/game/${gameId}/quit`, {
    ...request,
    player_id: toBackendPlayerId(request.player_id),
  });
  ensureGameApiSuccess(response.data, '退出游戏失败');
}
