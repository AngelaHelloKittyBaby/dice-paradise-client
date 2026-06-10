import axios from 'axios';
import { createApiClient } from '@/modules/api/createApiClient';
import type { ScoreCategory } from '@/types/game';
import type {
  LockedScoreItemData,
  LockedScoreItemSnapshot,
  PossibleScoreSnapshot,
  PossibleScoresData,
  ScoreLockStatusData,
  ScoreLockStatusSnapshot,
  ScorePanelData,
  ScorePanelPlayerSnapshot,
  SubmitScoreItemData,
  SubmitScoreItemRequest,
  SubmitScoreItemSnapshot,
} from '@/types/scoreApi';
import { GameApiError } from './gameApi';

interface ScoreApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

type ScoreItemIdScheme = 'compact13' | 'withBonusSlot';

const apiClient = createApiClient();

const scoreItemIdsWithBonusSlot: Record<ScoreCategory, number> = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
  threeOfAKind: 8,
  fourOfAKind: 9,
  fullHouse: 10,
  smallStraight: 11,
  largeStraight: 12,
  yacht: 13,
  chance: 14,
};

const compactScoreItemIds: Record<ScoreCategory, number> = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
  threeOfAKind: 7,
  fourOfAKind: 8,
  fullHouse: 9,
  smallStraight: 10,
  largeStraight: 11,
  yacht: 12,
  chance: 13,
};

const categoryAliases: Record<string, ScoreCategory> = {
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
  yacht: 'yacht',
  yahtzee: 'yacht',
  chance: 'chance',
  three_of_a_kind: 'threeOfAKind',
  four_of_a_kind: 'fourOfAKind',
  full_house: 'fullHouse',
  small_straight: 'smallStraight',
  large_straight: 'largeStraight',
};

function invertScoreItemIds(source: Record<ScoreCategory, number>) {
  return Object.fromEntries(
    Object.entries(source).map(([category, itemId]) => [itemId, category as ScoreCategory])
  ) as Record<number, ScoreCategory>;
}

const categoriesByBonusSlotId = invertScoreItemIds(scoreItemIdsWithBonusSlot);
const categoriesByCompactId = invertScoreItemIds(compactScoreItemIds);

function isScoreApiEnvelope(value: unknown): value is ScoreApiEnvelope<unknown> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'code' in value &&
      'msg' in value &&
      typeof (value as { code: unknown }).code === 'number' &&
      typeof (value as { msg: unknown }).msg === 'string'
  );
}

function toScoreApiError(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (isScoreApiEnvelope(data)) {
      return new GameApiError(data.msg || fallbackMessage, {
        code: data.code,
        status: error.response?.status,
      });
    }

    return new GameApiError(error.message || fallbackMessage, {
      status: error.response?.status,
    });
  }

  return error instanceof Error ? error : new GameApiError(fallbackMessage);
}

function unwrapScoreApiResponse<T>(response: ScoreApiEnvelope<T>, fallbackMessage: string): T {
  if (response.code !== 200) {
    throw new GameApiError(response.msg || fallbackMessage, { code: response.code });
  }

  if (!response.data) {
    throw new GameApiError(fallbackMessage);
  }

  return response.data;
}

function toBackendPlayerId(playerId: string | number) {
  return String(playerId);
}

function detectScoreItemIdScheme(itemIds: number[]): ScoreItemIdScheme {
  return itemIds.includes(14) || (!itemIds.includes(7) && itemIds.some(itemId => itemId > 6))
    ? 'withBonusSlot'
    : 'compact13';
}

export function categoryToScoreItemId(category: ScoreCategory): number {
  return scoreItemIdsWithBonusSlot[category];
}

export function scoreItemIdToCategory(itemId: number, scheme: ScoreItemIdScheme = 'withBonusSlot') {
  return scheme === 'compact13' ? categoriesByCompactId[itemId] : categoriesByBonusSlotId[itemId];
}

function normalizeScoreCategoryKey(key: string, scheme?: ScoreItemIdScheme): ScoreCategory | undefined {
  if (categoryAliases[key]) return categoryAliases[key];

  const scoreItemId = Number(key);
  if (!Number.isInteger(scoreItemId)) return undefined;

  if (scheme) return scoreItemIdToCategory(scoreItemId, scheme);

  return scoreItemIdToCategory(scoreItemId, 'withBonusSlot') ?? scoreItemIdToCategory(scoreItemId, 'compact13');
}

function normalizeScorePanel(data: ScorePanelData): ScorePanelPlayerSnapshot[] {
  return [...data.players]
    .sort((first, second) => first.playerOrder - second.playerOrder)
    .map(player => ({
      playerId: String(player.playerId),
      username: player.username,
      avatar: player.avatar,
      playerOrder: player.playerOrder,
    }));
}

function normalizeLockedItem(item: LockedScoreItemData, scheme: ScoreItemIdScheme): LockedScoreItemSnapshot | null {
  const category = scoreItemIdToCategory(item.itemId, scheme);

  if (!category) return null;

  return {
    itemId: item.itemId,
    category,
    scoreValue: item.scoreValue,
  };
}

function normalizeLockStatus(data: ScoreLockStatusData): ScoreLockStatusSnapshot {
  const lockedItemsData = data.lockedItems ?? [];
  const unlockedItemIds = data.unlockedItems ?? [];
  const itemIds = [...lockedItemsData.map(item => item.itemId), ...unlockedItemIds];
  const scheme = detectScoreItemIdScheme(itemIds);
  const lockedItems = lockedItemsData
    .map(item => normalizeLockedItem(item, scheme))
    .filter((item): item is LockedScoreItemSnapshot => Boolean(item));
  const unlockedCategories = unlockedItemIds
    .map(itemId => scoreItemIdToCategory(itemId, scheme))
    .filter((category): category is ScoreCategory => Boolean(category));
  const scores = lockedItems.reduce<Partial<Record<ScoreCategory, number>>>(
    (result, item) => ({
      ...result,
      [item.category]: item.scoreValue,
    }),
    {}
  );

  return {
    playerId: String(data.playerId),
    lockedItems,
    unlockedItemIds,
    unlockedCategories,
    completedCategories: lockedItems.map(item => item.category),
    scores,
  };
}

function normalizePossibleScores(data: PossibleScoresData): PossibleScoreSnapshot {
  const entries = Object.entries(data.possibleScores);
  const numericItemIds = entries
    .map(([key]) => Number(key))
    .filter(itemId => Number.isInteger(itemId));
  const scheme = numericItemIds.length > 0 ? detectScoreItemIdScheme(numericItemIds) : undefined;

  return entries.reduce<PossibleScoreSnapshot>((result, [key, value]) => {
    const category = normalizeScoreCategoryKey(key, scheme);
    if (!category) return result;

    return {
      ...result,
      [category]: value,
    };
  }, {});
}

function normalizeSubmitScoreData(
  data: SubmitScoreItemData,
  submittedCategory: ScoreCategory,
  submittedPlayerId: string | number
): SubmitScoreItemSnapshot {
  const category = submittedCategory;
  const submitSuccess = data.submit_success ?? true;
  const gameStatus = data.game_status ?? data.gameState?.status ?? 'playing';
  const nextPlayerId = data.next_player_id ?? data.nextPlayer;

  if (!submitSuccess) {
    throw new GameApiError('提交计分失败');
  }

  return {
    submitSuccess,
    playerId: String(data.player_id ?? submittedPlayerId),
    scoreItemId: data.score_item_id ?? categoryToScoreItemId(category),
    category,
    scoreValue: data.score_value ?? data.score ?? 0,
    totalScore: data.total_score ?? data.totalScore ?? 0,
    upperScore: data.upper_score ?? data.upperScore ?? 0,
    lowerScore: data.lower_score ?? data.lowerScore ?? 0,
    bonusScore: data.bonus_score ?? data.bonusScore ?? 0,
    gameStatus,
    nextPlayerId: nextPlayerId === null || nextPlayerId === undefined ? null : String(nextPlayerId),
    isGameFinished: data.isGameFinished ?? (gameStatus === 3 || gameStatus === 'finished'),
  };
}

function toBackendScoreCategory(category: ScoreCategory) {
  return category === 'yacht' ? 'yahtzee' : category;
}

export async function getScorePanelPlayers(gameId: string): Promise<ScorePanelPlayerSnapshot[]> {
  try {
    const response = await apiClient.get<ScoreApiEnvelope<ScorePanelData>>(`/score/score-panel/init/${gameId}`);
    return normalizeScorePanel(unwrapScoreApiResponse(response.data, '鑾峰彇璁″垎闈㈡澘澶辫触'));
  } catch (error) {
    throw toScoreApiError(error, '鑾峰彇璁″垎闈㈡澘澶辫触');
  }
}

export async function getScoreLockStatus(
  gameId: string,
  playerId: string | number
): Promise<ScoreLockStatusSnapshot> {
  try {
    const response = await apiClient.get<ScoreApiEnvelope<ScoreLockStatusData>>(
      `/score/game/${gameId}/lock-status`,
      {
        params: {
          player_id: toBackendPlayerId(playerId),
        },
      }
    );
    return normalizeLockStatus(unwrapScoreApiResponse(response.data, '获取计分项锁定状态失败'));
  } catch (error) {
    throw toScoreApiError(error, '获取计分项锁定状态失败');
  }
}

export async function getPossibleScoreSnapshot(
  gameId: string,
  playerId: string | number
): Promise<PossibleScoreSnapshot> {
  try {
    const response = await apiClient.get<ScoreApiEnvelope<PossibleScoresData>>(
      `/score/possible/${gameId}`,
      {
        params: {
          player_id: toBackendPlayerId(playerId),
        },
      }
    );
    return normalizePossibleScores(unwrapScoreApiResponse(response.data, '鑾峰彇鍙兘寰楀垎澶辫触'));
  } catch (error) {
    throw toScoreApiError(error, '鑾峰彇鍙兘寰楀垎澶辫触');
  }
}

export async function submitScoreItem(
  gameId: string,
  request: SubmitScoreItemRequest
): Promise<SubmitScoreItemSnapshot> {
  try {
    const response = await apiClient.post<ScoreApiEnvelope<SubmitScoreItemData>>(
      `/game/${gameId}/score`,
      {
        ...request,
        player_id: toBackendPlayerId(request.player_id),
        category: toBackendScoreCategory(request.category),
      }
    );
    return normalizeSubmitScoreData(
      unwrapScoreApiResponse(response.data, '提交计分失败'),
      request.category,
      request.player_id
    );
  } catch (error) {
    throw toScoreApiError(error, '提交计分失败');
  }
}
