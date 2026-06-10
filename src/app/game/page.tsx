'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Crown,
  Dice5,
  Dices,
  DoorOpen,
  Gem,
  House,
  Info,
  LockKeyhole,
  Route,
  Sailboat,
  Sparkles,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { ResponsiveStage } from '@/components/layout';
import { GameChat, LoadingImage, SoundToggle, StarIcon, type GameChatMessage } from '@/components/ui';
import { CATEGORY_NAMES, LOWER_CATEGORIES, MAX_ROLLS_PER_TURN, SCORE_CATEGORIES } from '@/constants/gameRules';
import gameBackground from '@/assets/images/backgrounds/game/game-bg.png';
import { useGameSocket, useHomePoints, useHomeSoundSetting } from '@/hooks';
import { playDiceRollSound } from '@/modules/audio/audioEvents';
import {
  createGame,
  getGameStatus,
  quitGame,
  rollGameDice,
} from '@/modules/game/gameApi';
import { getPossibleScoreSnapshot, getScoreLockStatus, getScorePanelPlayers, submitScoreItem } from '@/modules/game/scoreApi';
import {
  backToLobbySettlementGame,
  getSettlementResultData,
  rematchSettlementGame,
} from '@/modules/result/settlementApi';
import { updateLeaderboardGames, updateLeaderboardWins } from '@/modules/leaderboard/leaderboardApi';
import { usePlayerStore, useRoomStore } from '@/stores';
import type { DiceValue, ScoreCategory } from '@/types/game';
import type { ApiGameMode, GameStatusSnapshot } from '@/types/gameApi';
import type { GameResultData } from '@/types/gameResult';
import type { PossibleScoreSnapshot, ScoreLockStatusSnapshot, ScorePanelPlayerSnapshot } from '@/types/scoreApi';
import {
  calculateGrandTotal,
  calculateLowerTotal,
  calculateUpperBonus,
  calculateUpperSubtotal,
} from '@/utils/scoreCalculator';
import { getOrCreateClientId } from '@/utils/clientId';
import styles from './game.module.css';

const GameResultModal = dynamic(
  () => import('@/components/game/GameResultModal').then(module => module.GameResultModal),
  { ssr: false }
);

const GameRulesModal = dynamic(
  () => import('@/components/game/GameRulesModal').then(module => module.GameRulesModal),
  { ssr: false }
);

const YachtScoreEffect = dynamic(
  () => import('@/components/game/YachtScoreEffect').then(module => module.YachtScoreEffect),
  { ssr: false }
);

interface GamePlayer {
  id: string;
  name: string;
  pointsClientId: string | null;
  points: number;
  score: number;
  isHost?: boolean;
  avatarClass: string;
  avatarLabel: string;
}

interface GameEventItem {
  id: string;
  text: string;
  score?: string;
}

interface GameQueryState {
  mode: string;
  roomId: string | null;
  gameId: string | null;
  playerId: string | null;
  difficulty: string | null;
  pendingCreate: boolean;
}

const initialDice: DiceValue[] = [1, 1, 1, 1, 1];
const initialLocked = [false, false, false, false, false];
const DICE_THROW_ANIMATION_MS = 1120;
const GAME_FALLBACK_SYNC_INTERVAL_MS = 5_000;
const RESULT_OPEN_DELAY_MS = 420;

const avatarClasses = [
  styles.avatarCaptain,
  styles.avatarBot,
  styles.avatarCute,
  styles.avatarLucky,
  styles.avatarGreen,
  styles.avatarPurple,
];

const defaultGameEvents: GameEventItem[] = [];
const emptyChatMessages: GameChatMessage[] = [];

function delay(ms: number) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeLockedDiceState(nextLocked: boolean[] | undefined, fallback: boolean[] = initialLocked) {
  return nextLocked?.length === initialLocked.length ? nextLocked : fallback;
}

function resolveSyncedLockedDiceState(
  syncedLocked: boolean[],
  localLocked: boolean[],
  syncedRollsLeft: number,
  syncedCurrentPlayer: string | null,
  previousCurrentPlayer: string | null | undefined
) {
  if (syncedLocked.length !== initialLocked.length) return initialLocked;
  if (syncedLocked.some(Boolean)) return syncedLocked;
  if (!localLocked.some(Boolean)) return syncedLocked;
  if (syncedRollsLeft >= MAX_ROLLS_PER_TURN) return syncedLocked;
  if (previousCurrentPlayer && syncedCurrentPlayer !== previousCurrentPlayer) return syncedLocked;

  return localLocked;
}

function hasCompletedAllScoreCategories(scores: Partial<Record<ScoreCategory, number>>) {
  return SCORE_CATEGORIES.every(item => scores[item.category] !== undefined);
}

function getCommittedScores(
  scores: Partial<Record<ScoreCategory, number>>,
  totalScore: number,
  status: GameStatusSnapshot['status']
): Partial<Record<ScoreCategory, number>> {
  const filledCategoryCount = SCORE_CATEGORIES.filter(item => scores[item.category] !== undefined).length;

  if (status !== 'finished' && totalScore === 0 && filledCategoryCount >= SCORE_CATEGORIES.length) {
    return {};
  }

  return scores;
}

function hasRolledDiceThisTurn(rollsLeft: number) {
  return rollsLeft < MAX_ROLLS_PER_TURN;
}

function hasFinishedGame(status: GameStatusSnapshot | null) {
  if (!status) return false;

  return status.status === 'finished' || (
    status.players.length > 0 &&
    status.players.every(item =>
      hasCompletedAllScoreCategories(getCommittedScores(item.scores, item.totalScore, status.status))
    )
  );
}

function toOptionalBackendPlayerId(playerId: string) {
  const backendPlayerId = Number(playerId);

  return Number.isInteger(backendPlayerId) ? backendPlayerId : null;
}

function isApiGameMode(mode: string): mode is ApiGameMode {
  return mode === 'local' || mode === 'ai' || mode === 'online';
}

function getDiceDots(value: DiceValue) {
  const dotMap: Record<DiceValue, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  return Array.from({ length: 9 }, (_, index) => dotMap[value].includes(index));
}

function getCategoryHint(category: ScoreCategory) {
  const hints: Record<ScoreCategory, string> = {
    ones: '所有 1 点相加',
    twos: '所有 2 点相加',
    threes: '所有 3 点相加',
    fours: '所有 4 点相加',
    fives: '所有 5 点相加',
    sixes: '所有 6 点相加',
    threeOfAKind: '至少三颗相同，计总点数',
    fourOfAKind: '至少四颗相同，计总点数',
    fullHouse: '三颗相同 + 两颗相同，25 分',
    smallStraight: '连续四个点数，30 分',
    largeStraight: '连续五个点数，40 分',
    yacht: '五颗全部相同，50 分',
    chance: '任意组合，计总点数',
  };

  return hints[category];
}

type CategoryIconStyle = CSSProperties & {
  '--category-icon-bg': string;
  '--category-icon-color': string;
  '--category-icon-glow': string;
  '--category-icon-accent': string;
};

const categoryDiceValueMap: Partial<Record<ScoreCategory, DiceValue>> = {
  ones: 1,
  twos: 2,
  threes: 3,
  fours: 4,
  fives: 5,
  sixes: 6,
};

const categoryIconMap: Partial<Record<ScoreCategory, LucideIcon>> = {
  threeOfAKind: Gem,
  fourOfAKind: Crown,
  fullHouse: House,
  smallStraight: Waves,
  largeStraight: Route,
  yacht: Sailboat,
  chance: Sparkles,
};

const categoryIconThemeMap: Record<ScoreCategory, CategoryIconStyle> = {
  ones: {
    '--category-icon-bg': 'linear-gradient(145deg, #fff8df, #6fd3ff 58%, #1672ee)',
    '--category-icon-color': '#0753ca',
    '--category-icon-glow': 'rgba(55, 167, 255, 0.36)',
    '--category-icon-accent': '#fff4b8',
  },
  twos: {
    '--category-icon-bg': 'linear-gradient(145deg, #e9fff7, #5ae3c2 56%, #0e92d9)',
    '--category-icon-color': '#0070b8',
    '--category-icon-glow': 'rgba(44, 210, 202, 0.36)',
    '--category-icon-accent': '#bfffea',
  },
  threes: {
    '--category-icon-bg': 'linear-gradient(145deg, #fff3fb, #ff9fd3 54%, #7b64ff)',
    '--category-icon-color': '#6733d8',
    '--category-icon-glow': 'rgba(255, 111, 197, 0.34)',
    '--category-icon-accent': '#ffe3f4',
  },
  fours: {
    '--category-icon-bg': 'linear-gradient(145deg, #fff7dd, #ffc34f 55%, #f07922)',
    '--category-icon-color': '#a84c00',
    '--category-icon-glow': 'rgba(255, 176, 42, 0.38)',
    '--category-icon-accent': '#fff0b8',
  },
  fives: {
    '--category-icon-bg': 'linear-gradient(145deg, #efffed, #77df73 54%, #10a95b)',
    '--category-icon-color': '#08793e',
    '--category-icon-glow': 'rgba(74, 214, 101, 0.36)',
    '--category-icon-accent': '#d8ffd4',
  },
  sixes: {
    '--category-icon-bg': 'linear-gradient(145deg, #eef6ff, #88bfff 54%, #3357e8)',
    '--category-icon-color': '#143fbb',
    '--category-icon-glow': 'rgba(66, 117, 255, 0.36)',
    '--category-icon-accent': '#dcecff',
  },
  threeOfAKind: {
    '--category-icon-bg': 'linear-gradient(145deg, #edfbff, #5bdcff 52%, #195de8)',
    '--category-icon-color': '#ffffff',
    '--category-icon-glow': 'rgba(63, 191, 255, 0.4)',
    '--category-icon-accent': '#c9f6ff',
  },
  fourOfAKind: {
    '--category-icon-bg': 'linear-gradient(145deg, #fff3bf, #ffb72d 52%, #ec6b18)',
    '--category-icon-color': '#ffffff',
    '--category-icon-glow': 'rgba(255, 171, 35, 0.46)',
    '--category-icon-accent': '#fff1a8',
  },
  fullHouse: {
    '--category-icon-bg': 'linear-gradient(145deg, #fff0f5, #ff88bd 52%, #d72f86)',
    '--category-icon-color': '#ffffff',
    '--category-icon-glow': 'rgba(255, 105, 174, 0.42)',
    '--category-icon-accent': '#ffd8ea',
  },
  smallStraight: {
    '--category-icon-bg': 'linear-gradient(145deg, #e7fff5, #4eddb9 52%, #008fd2)',
    '--category-icon-color': '#ffffff',
    '--category-icon-glow': 'rgba(55, 211, 185, 0.4)',
    '--category-icon-accent': '#c8fff0',
  },
  largeStraight: {
    '--category-icon-bg': 'linear-gradient(145deg, #eef4ff, #8aa9ff 52%, #4451d9)',
    '--category-icon-color': '#ffffff',
    '--category-icon-glow': 'rgba(104, 133, 255, 0.42)',
    '--category-icon-accent': '#d9e2ff',
  },
  yacht: {
    '--category-icon-bg': 'linear-gradient(145deg, #eaffff, #66ddff 48%, #1474dc 76%)',
    '--category-icon-color': '#ffffff',
    '--category-icon-glow': 'rgba(91, 218, 255, 0.5)',
    '--category-icon-accent': '#f2fdff',
  },
  chance: {
    '--category-icon-bg': 'linear-gradient(145deg, #fff7ce, #c58cff 48%, #5c4dea)',
    '--category-icon-color': '#ffffff',
    '--category-icon-glow': 'rgba(168, 103, 255, 0.42)',
    '--category-icon-accent': '#fff0a8',
  },
};

function CategoryIcon({ category }: { category: ScoreCategory }) {
  const diceValue = categoryDiceValueMap[category];
  const iconStyle = categoryIconThemeMap[category];

  if (diceValue) {
    return (
      <span className={`${styles.categoryIcon} ${styles.categoryIconDice}`} style={iconStyle} aria-hidden="true">
        <span className={styles.categoryDiceFace}>
          {getDiceDots(diceValue).map((isVisible, index) => (
            <span
              key={index}
              className={`${styles.categoryDicePip} ${isVisible ? styles.categoryDicePipVisible : ''}`}
            />
          ))}
        </span>
      </span>
    );
  }

  const Icon = categoryIconMap[category] ?? Dices;

  return (
    <span className={styles.categoryIcon} style={iconStyle} aria-hidden="true">
      <Icon className={styles.categorySvgIcon} size={18} strokeWidth={3} />
    </span>
  );
}

function PlayerCard({ player, isActive }: { player: GamePlayer; isActive?: boolean }) {
  const { points } = useHomePoints(player.pointsClientId, player.points);

  return (
    <article className={`${styles.playerCard} ${isActive ? styles.playerCardActive : ''}`}>
      <div className={styles.rankBadge}>{player.score > 0 ? '★' : player.avatarLabel}</div>
      <div className={`${styles.playerAvatar} ${player.avatarClass}`}>{player.avatarLabel}</div>
      <div className={styles.playerInfo}>
        <div className={styles.playerNameRow}>
          <strong>{player.name}</strong>
          {player.isHost && <span>房主</span>}
        </div>
        <div className={styles.playerScore}>
          <StarIcon size={21} />
          {points.toLocaleString()}
        </div>
      </div>
      {isActive && <div className={styles.activeIndicator} />}
    </article>
  );
}

function DiceFace({
  value,
  locked,
  rolling,
  disabled,
  index,
  onToggle,
}: {
  value: DiceValue;
  locked: boolean;
  rolling: boolean;
  disabled?: boolean;
  index: number;
  onToggle: () => void;
}) {
  const dots = getDiceDots(value);

  return (
    <div className={styles.diceSlot}>
      <button
        type="button"
        className={`${styles.diceFace} ${rolling && !locked ? styles.diceFaceRolling : ''} ${
          locked ? styles.diceFaceLocked : ''
        }`}
        style={{ '--dice-index': index } as CSSProperties}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={locked}
        aria-label={`骰子 ${index + 1}，当前 ${value} 点，${locked ? '已锁定' : '未锁定'}`}
      >
        {dots.map((active, dotIndex) => (
          <span key={dotIndex} className={active ? styles.dotActive : undefined} />
        ))}
      </button>
      <button type="button" onClick={onToggle} disabled={disabled} className={locked ? styles.keepButtonActive : undefined}>
        <LockKeyhole size={17} />
        {locked ? '已保留' : '保留'}
      </button>
    </div>
  );
}

export default function GamePage() {
  const router = useRouter();
  const player = usePlayerStore(state => state.player);
  const authToken = usePlayerStore(state => state.authToken);
  const soundSettingFallback = usePlayerStore(state => state.settings.soundEnabled);
  const currentRoom = useRoomStore(state => state.currentRoom);
  const setCurrentRoom = useRoomStore(state => state.setCurrentRoom);
  const [queryState, setQueryState] = useState<GameQueryState>({
    mode: 'room',
    roomId: null,
    gameId: null,
    playerId: null,
    difficulty: null,
    pendingCreate: false,
  });
  const [isQueryReady, setIsQueryReady] = useState(false);
  const [entryGameCreateError, setEntryGameCreateError] = useState<string | null>(null);
  const [serverGameStatus, setServerGameStatus] = useState<GameStatusSnapshot | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [dice, setDice] = useState<DiceValue[]>(initialDice);
  const [locked, setLocked] = useState<boolean[]>(initialLocked);
  const [rollsLeft, setRollsLeft] = useState(MAX_ROLLS_PER_TURN);
  const [isRolling, setIsRolling] = useState(false);
  const [possibleScores, setPossibleScores] = useState<PossibleScoreSnapshot>({});
  const [completedCategories, setCompletedCategories] = useState<ScoreCategory[]>([]);
  const [unlockedScoreCategories, setUnlockedScoreCategories] = useState<ScoreCategory[]>(
    SCORE_CATEGORIES.map(item => item.category)
  );
  const [playerScores, setPlayerScores] = useState<Partial<Record<ScoreCategory, number>>>({});
  const [scorePanelPlayers, setScorePanelPlayers] = useState<ScorePanelPlayerSnapshot[]>([]);
  const [gameEvents, setGameEvents] = useState<GameEventItem[]>(defaultGameEvents);
  const [yachtEffectKey, setYachtEffectKey] = useState(0);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [isReturningLobby, setIsReturningLobby] = useState(false);
  const [isSettlementLoading, setIsSettlementLoading] = useState(false);
  const [settlementResultData, setSettlementResultData] = useState<GameResultData | null>(null);
  const [resultActionError, setResultActionError] = useState<string | null>(null);
  const serverGameStatusRef = useRef<GameStatusSnapshot | null>(null);
  const rollingGuardRef = useRef(false);
  const scoreSubmittingGuardRef = useRef(false);
  const entryCreateGuardRef = useRef(false);
  const reportedWinnerGameIdRef = useRef<string | null>(null);
  const { soundEnabled: isSoundEnabled, setSoundEnabled: setIsSoundEnabled } = useHomeSoundSetting(
    player?.id,
    soundSettingFallback
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQueryState({
      mode: params.get('mode') ?? 'room',
      roomId: params.get('roomId'),
      gameId: params.get('gameId'),
      playerId: params.get('playerId'),
      difficulty: params.get('difficulty'),
      pendingCreate: params.get('pendingCreate') === '1',
    });
    setIsQueryReady(true);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return undefined;

    const triggerYachtEffect = () => {
      setYachtEffectKey(Date.now());
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('debugYachtEffect') === '1') {
      window.setTimeout(triggerYachtEffect, 600);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === 'y') {
        triggerYachtEffect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const applyScoreLockStatus = useCallback((lockStatus: ScoreLockStatusSnapshot) => {
    if (lockStatus.unlockedCategories.length > 0) {
      setUnlockedScoreCategories(lockStatus.unlockedCategories);
    }
  }, []);

  const refreshScoreBoard = useCallback(
    async (gameId: string, playerId: string, shouldFetchPossibleScores = false) => {
      const [lockStatus, nextPossibleScores] = await Promise.all([
        getScoreLockStatus(gameId, playerId),
        shouldFetchPossibleScores ? getPossibleScoreSnapshot(gameId, playerId) : Promise.resolve<PossibleScoreSnapshot>({}),
      ]);

      applyScoreLockStatus(lockStatus);
      setPossibleScores(nextPossibleScores);

      return lockStatus;
    },
    [applyScoreLockStatus]
  );

  const mode = queryState.mode;
  const isLocalMode = mode === 'single' || mode === 'local';
  const roomId = queryState.roomId ?? currentRoom?.id ?? (isLocalMode ? '本地对局' : '876643');
  const selfPlayerId = queryState.playerId ?? player?.id ?? 'player-001';
  const activePlayerId = serverGameStatus?.currentPlayer ?? selfPlayerId;
  const scorePanelPlayerById = useMemo(
    () => Object.fromEntries(scorePanelPlayers.map(item => [item.playerId, item])),
    [scorePanelPlayers]
  );
  const syncedSelfPlayer = serverGameStatus?.players.find(item => item.playerId === selfPlayerId);
  const syncedActivePlayer = serverGameStatus?.players.find(item => item.playerId === activePlayerId);
  const isServerGame = Boolean(queryState.gameId);
  const isAiTurn = Boolean(syncedActivePlayer?.isAi);
  const canOperateCurrentTurn =
    isServerGame && Boolean(serverGameStatus && activePlayerId === selfPlayerId && !isAiTurn);
  const waitingTurnLabel = isAiTurn ? '机器人思考中' : '等待其他玩家';
  const panelSelfPlayer = scorePanelPlayerById[selfPlayerId];
  const panelActivePlayer = scorePanelPlayerById[activePlayerId];
  const selfPlayerName = (panelSelfPlayer?.username || syncedSelfPlayer?.name || player?.name || '乐乐玩家').trim() || '乐乐玩家';
  const activePlayerName = panelActivePlayer?.username ?? syncedActivePlayer?.name ?? selfPlayerName;
  const isCreatingEntryGame = isQueryReady && queryState.pendingCreate && !queryState.gameId && !entryGameCreateError;
  const hasAuthToken = Boolean(authToken?.trim());
  const isSingleMode = isLocalMode && !queryState.roomId;
  const isRoomGame = Boolean(queryState.roomId && currentRoom);
  const showChat = isRoomGame || mode === 'online';
  const hasRolledCurrentTurn = hasRolledDiceThisTurn(rollsLeft);
  const displayedPossibleScores = useMemo<PossibleScoreSnapshot>(
    () =>
      hasRolledCurrentTurn && !isRolling && canOperateCurrentTurn
        ? possibleScores
        : {},
    [canOperateCurrentTurn, hasRolledCurrentTurn, isRolling, possibleScores]
  );
  const players = useMemo<GamePlayer[]>(() => {
    if (serverGameStatus) {
      const orderedPlayers = [...serverGameStatus.players].sort((first, second) => {
        if (first.playerId === selfPlayerId) return -1;
        if (second.playerId === selfPlayerId) return 1;
        return 0;
      });

      return orderedPlayers.map((item, index) => ({
        id: item.playerId,
        name: scorePanelPlayerById[item.playerId]?.username ?? item.name,
        pointsClientId: item.isAi ? null : item.playerId,
        points:
          item.playerId === selfPlayerId
            ? player?.coins ?? player?.gems ?? 0
            : currentRoom?.members.find(member => member.playerId === item.playerId)?.points ?? item.totalScore,
        score: item.totalScore,
        isHost: item.playerId === currentRoom?.hostId,
        avatarClass: item.isAi ? styles.avatarBot : avatarClasses[index % avatarClasses.length],
        avatarLabel: item.isAi ? 'AI' : item.playerId === selfPlayerId ? 'P' : `${index + 1}`,
      }));
    }

    if (scorePanelPlayers.length > 0) {
      return scorePanelPlayers.map((item, index) => ({
        id: item.playerId,
        name: item.username,
        pointsClientId: mode === 'ai' && item.playerId !== selfPlayerId ? null : item.playerId,
        points:
          item.playerId === selfPlayerId
            ? player?.coins ?? player?.gems ?? 0
            : currentRoom?.members.find(member => member.playerId === item.playerId)?.points ?? 0,
        score: item.playerId === selfPlayerId ? calculateGrandTotal(playerScores) : 0,
        isHost: item.playerId === currentRoom?.hostId,
        avatarClass: avatarClasses[index % avatarClasses.length],
        avatarLabel: item.playerId === selfPlayerId ? 'P' : `${index + 1}`,
      }));
    }

    if (isRoomGame && currentRoom) {
      return currentRoom.members.map((member, index) => ({
        id: member.playerId,
        name: member.name,
        pointsClientId: member.playerId,
        points: member.playerId === selfPlayerId ? player?.coins ?? player?.gems ?? 0 : member.points,
        score: 0,
        isHost: member.isHost,
        avatarClass: avatarClasses[index % avatarClasses.length],
        avatarLabel: member.isHost ? 'P' : `${index + 1}`,
      }));
    }

    if (mode === 'ai') {
      return [
        {
          id: selfPlayerId,
          name: selfPlayerName,
          pointsClientId: selfPlayerId,
          points: player?.coins ?? player?.gems ?? 0,
          score: 0,
          isHost: true,
          avatarClass: styles.avatarCaptain,
          avatarLabel: 'P',
        },
        {
          id: 'ai-001',
          name: 'AI机器人',
          pointsClientId: null,
          points: 0,
          score: 0,
          avatarClass: styles.avatarBot,
          avatarLabel: 'AI',
        },
      ];
    }

    return [
      {
        id: selfPlayerId,
        name: selfPlayerName,
        pointsClientId: selfPlayerId,
        points: player?.coins ?? player?.gems ?? 0,
        score: calculateGrandTotal(playerScores),
        isHost: true,
        avatarClass: styles.avatarCaptain,
        avatarLabel: 'P',
      },
    ];
  }, [
    currentRoom,
    isRoomGame,
    mode,
    player?.coins,
    player?.gems,
    playerScores,
    scorePanelPlayerById,
    scorePanelPlayers,
    selfPlayerId,
    selfPlayerName,
    serverGameStatus,
  ]);

  const syncedScoresByPlayerId = useMemo<Record<string, Partial<Record<ScoreCategory, number>>>>(() => {
    if (!serverGameStatus) return {};

    return Object.fromEntries(
      serverGameStatus.players.map(item => [
        item.playerId,
        getCommittedScores(item.scores, item.totalScore, serverGameStatus.status),
      ])
    );
  }, [serverGameStatus]);

  const selfScores = useMemo<Partial<Record<ScoreCategory, number>>>(() => {
    if (!queryState.gameId) return playerScores;
    if (selfPlayerId === activePlayerId) return playerScores;
    return syncedSelfPlayer && serverGameStatus
      ? getCommittedScores(syncedSelfPlayer.scores, syncedSelfPlayer.totalScore, serverGameStatus.status)
      : {};
  }, [activePlayerId, playerScores, queryState.gameId, selfPlayerId, serverGameStatus, syncedSelfPlayer]);
  const currentUpperScore = calculateUpperSubtotal(selfScores);
  const currentUpperBonus = calculateUpperBonus(currentUpperScore);
  const currentLowerScore = calculateLowerTotal(selfScores);
  const currentTotalScore = syncedSelfPlayer?.totalScore ?? calculateGrandTotal(selfScores);
  const currentResultPlayerId = useMemo(() => {
    const currentIndex = players.findIndex(item => item.id === selfPlayerId);
    return currentIndex >= 0 ? currentIndex + 1 : 1;
  }, [players, selfPlayerId]);
  const applyGameStatusSnapshot = useCallback((status: GameStatusSnapshot) => {
    const currentSnapshot = status.players.find(item => item.playerId === status.currentPlayer) ?? status.players[0];
    const currentCommittedScores = currentSnapshot
      ? getCommittedScores(currentSnapshot.scores, currentSnapshot.totalScore, status.status)
      : {};
    const nextCompletedCategories = Object.keys(currentCommittedScores) as ScoreCategory[];
    const shouldHoldRollingDisplay = rollingGuardRef.current && status.currentPlayer === selfPlayerId;
    const shouldKeepLocalRolledDisplay =
      !shouldHoldRollingDisplay &&
      status.currentPlayer === selfPlayerId &&
      hasRolledDiceThisTurn(rollsLeft) &&
      !hasRolledDiceThisTurn(status.rollsLeft) &&
      !scoreSubmittingGuardRef.current &&
      status.status !== 'finished';

    const previousCurrentPlayer = serverGameStatusRef.current?.currentPlayer;
    serverGameStatusRef.current = status;

    setServerGameStatus(status);
    if (!shouldHoldRollingDisplay && !shouldKeepLocalRolledDisplay) {
      setDice(status.dice);
      setLocked(currentLocked =>
        resolveSyncedLockedDiceState(
          status.diceLocked,
          currentLocked,
          status.rollsLeft,
          status.currentPlayer,
          previousCurrentPlayer
        )
      );
      setRollsLeft(status.rollsLeft);
    }
    setPlayerScores(currentCommittedScores);
    setCompletedCategories(nextCompletedCategories);
    setUnlockedScoreCategories(
      SCORE_CATEGORIES.map(item => item.category).filter(category => !nextCompletedCategories.includes(category))
    );
    setPossibleScores(currentPossibleScores =>
      (status.currentPlayer === selfPlayerId &&
        hasRolledDiceThisTurn(status.rollsLeft) &&
        status.status !== 'finished') ||
      shouldKeepLocalRolledDisplay
        ? currentPossibleScores
        : {}
    );
    return {
      currentSnapshot,
      nextCompletedCategories,
    };
  }, [rollsLeft, selfPlayerId]);

  const gameResultData = useMemo<GameResultData>(() => {
    const resultPlayers = players.map((item, index) => ({
      id: index + 1,
      nickname: item.name,
      avatar: '',
      score: item.id === selfPlayerId ? currentTotalScore : item.score,
      isOwner: item.id === selfPlayerId,
      rank: 0,
    }));

    const rankedPlayers = [...resultPlayers]
      .sort((first, second) => second.score - first.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const currentDetail = {
      upperScore: currentUpperScore,
      bonusScore: currentUpperBonus,
      upperTotal: currentUpperScore + currentUpperBonus,
      lowerScore: currentLowerScore,
      extraReward: 0,
      extraBonus: currentUpperBonus,
      totalScore: currentTotalScore,
    };

    const playerDetails = Object.fromEntries(
      rankedPlayers.map(item => [
        item.id,
        item.isOwner
          ? currentDetail
          : {
              upperScore: 0,
              bonusScore: 0,
              upperTotal: 0,
              lowerScore: item.score,
              extraReward: 0,
              extraBonus: 0,
              totalScore: item.score,
            },
      ])
    );

    const bestRoundScore = Math.max(0, ...Object.values(selfScores).filter((value): value is number => typeof value === 'number'));

    return {
      players: rankedPlayers,
      playerDetails,
      highlights: [
        { id: 'yacht', icon: 'yacht', name: '快艇', value: selfScores.yacht === 50 ? 1 : 0, unit: '次' },
        {
          id: 'upper-bonus',
          icon: 'upperBonus',
          name: '上半区额外奖励',
          value: currentUpperBonus > 0 ? 35 : 0,
          unit: '分',
          status: currentUpperBonus > 0 ? '已获得' : '未获得',
        },
        { id: 'best-round', icon: 'bestRound', name: '最高单回合', value: bestRoundScore, unit: '分' },
      ],
    };
  }, [
    currentLowerScore,
    currentTotalScore,
    currentUpperBonus,
    currentUpperScore,
    players,
    selfPlayerId,
    selfScores,
  ]);
  const displayedResultData = settlementResultData ?? gameResultData;
  const resultSelectedPlayerId = settlementResultData
    ? toOptionalBackendPlayerId(selfPlayerId) ?? settlementResultData.players[0]?.id ?? currentResultPlayerId
    : currentResultPlayerId;
  const isServerGameFinished = hasFinishedGame(serverGameStatus);

  const resetLocalMatch = () => {
    rollingGuardRef.current = false;
    scoreSubmittingGuardRef.current = false;
    setIsResultOpen(false);
    setResultActionError(null);
    setSettlementResultData(null);
    setDice(initialDice);
    setLocked(initialLocked);
    setRollsLeft(MAX_ROLLS_PER_TURN);
    setIsRolling(false);
    setIsSubmittingScore(false);
    setPossibleScores({});
    setCompletedCategories([]);
    setUnlockedScoreCategories(SCORE_CATEGORIES.map(item => item.category));
    setPlayerScores({});
    setScorePanelPlayers([]);
    setGameEvents(defaultGameEvents);
  };

  const handleReplay = async () => {
    if (isRematching) return;

    if (!queryState.gameId) {
      resetLocalMatch();
      return;
    }

    setIsRematching(true);
    setResultActionError(null);

    try {
      const rematch = await rematchSettlementGame(queryState.gameId, {
        player_id: selfPlayerId,
      });
      const params = new URLSearchParams({
        mode: rematch.gameState.gameMode,
        gameId: rematch.newGameId,
        playerId: selfPlayerId,
      });

      if (queryState.roomId) params.set('roomId', queryState.roomId);
      if (queryState.difficulty) params.set('difficulty', queryState.difficulty);

      setIsResultOpen(false);
      setSettlementResultData(null);
      setServerGameStatus(rematch.gameState);
      setDice(rematch.gameState.dice);
      setLocked(normalizeLockedDiceState(rematch.gameState.diceLocked));
      setRollsLeft(rematch.gameState.rollsLeft);
      setPossibleScores({});
      setCompletedCategories([]);
      setUnlockedScoreCategories(SCORE_CATEGORIES.map(item => item.category));
      setPlayerScores({});

      if (isRoomGame && currentRoom) {
        setCurrentRoom({
          ...currentRoom,
          status: 'playing',
        });
      }

      router.push(`/game?${params.toString()}`);
    } catch (error) {
      setResultActionError(error instanceof Error ? error.message : '再来一局失败，请稍后再试');
    } finally {
      setIsRematching(false);
    }
  };

  const handleBackLobbyFromResult = async () => {
    if (isReturningLobby) return;

    if (!queryState.gameId) {
      router.push('/');
      return;
    }

    setIsReturningLobby(true);
    setResultActionError(null);

    try {
      await backToLobbySettlementGame(queryState.gameId, {
        player_id: selfPlayerId,
      });
      router.push('/');
    } catch (error) {
      setResultActionError(error instanceof Error ? error.message : '返回首页失败，请稍后再试');
    } finally {
      setIsReturningLobby(false);
    }
  };

  const scoreColumns = players.length.toString();
  const scoreTableStyle = { '--score-columns': scoreColumns } as CSSProperties;

  useEffect(() => {
    if (!isQueryReady || !queryState.pendingCreate || queryState.gameId || entryCreateGuardRef.current) return;

    const gameMode = isApiGameMode(queryState.mode) ? queryState.mode : 'local';
    entryCreateGuardRef.current = true;
    setEntryGameCreateError(null);

    createGame({
      game_mode: gameMode,
      player_name: selfPlayerName,
      room_code: gameMode === 'online' ? queryState.roomId : undefined,
      ai_difficulty: gameMode === 'ai' ? queryState.difficulty : undefined,
      client_id: gameMode === 'ai' && !hasAuthToken ? getOrCreateClientId() : undefined,
    })
      .then(game => {
        const params = new URLSearchParams({
          mode: gameMode,
          gameId: game.gameId,
          playerId: game.playerId,
        });

        if (queryState.difficulty) params.set('difficulty', queryState.difficulty);
        if (queryState.roomId) params.set('roomId', queryState.roomId);

        setQueryState({
          mode: gameMode,
          roomId: queryState.roomId,
          gameId: game.gameId,
          playerId: game.playerId,
          difficulty: queryState.difficulty,
          pendingCreate: false,
        });
        router.replace(`/game?${params.toString()}`);
      })
      .catch(error => {
        entryCreateGuardRef.current = false;
        setEntryGameCreateError(error instanceof Error ? error.message : '游戏创建失败，请稍后再试');
      });
  }, [
    isQueryReady,
    queryState.difficulty,
    queryState.gameId,
    queryState.mode,
    queryState.pendingCreate,
    queryState.roomId,
    router,
    hasAuthToken,
    selfPlayerName,
  ]);

  useEffect(() => {
    if (isSingleMode) setGameEvents(defaultGameEvents);
  }, [isSingleMode]);

  useEffect(() => {
    const gameId = queryState.gameId;
    if (!gameId) return;

    let isCancelled = false;

    Promise.all([getGameStatus(gameId), getScorePanelPlayers(gameId)])
      .then(async ([status, panelPlayers]) => {
        if (isCancelled) return;

        applyGameStatusSnapshot(status);
        setScorePanelPlayers(panelPlayers);
        await refreshScoreBoard(
          gameId,
          status.currentPlayer ?? selfPlayerId,
          status.currentPlayer === selfPlayerId && hasRolledDiceThisTurn(status.rollsLeft)
        );
      })
      .catch(error => {
        if (isCancelled) return;

        console.error(error);
      });

    return () => {
      isCancelled = true;
    };
  }, [applyGameStatusSnapshot, refreshScoreBoard, queryState.gameId, selfPlayerId]);

  const handleSocketGameStatus = useCallback(
    (status: GameStatusSnapshot) => {
      const gameId = queryState.gameId;
      if (!gameId || status.gameId !== gameId) return;

      applyGameStatusSnapshot(status);
      void refreshScoreBoard(
        gameId,
        status.currentPlayer ?? selfPlayerId,
        status.currentPlayer === selfPlayerId && hasRolledDiceThisTurn(status.rollsLeft)
      ).catch(error => {
        console.error(error);
      });
    },
    [applyGameStatusSnapshot, queryState.gameId, refreshScoreBoard, selfPlayerId]
  );

  const { isConnected: isGameSocketConnected } = useGameSocket({
    gameId: queryState.gameId,
    playerId: selfPlayerId,
    enabled: Boolean(queryState.gameId && selfPlayerId),
    onGameStatus: handleSocketGameStatus,
  });

  useEffect(() => {
    const gameId = queryState.gameId;
    if (!gameId || !isGameSocketConnected) return;

    let isCancelled = false;

    getGameStatus(gameId)
      .then(status => {
        if (isCancelled) return;

        applyGameStatusSnapshot(status);
        void refreshScoreBoard(
          gameId,
          status.currentPlayer ?? selfPlayerId,
          status.currentPlayer === selfPlayerId && hasRolledDiceThisTurn(status.rollsLeft)
        ).catch(error => {
          console.error(error);
        });
      })
      .catch(error => {
        if (!isCancelled) console.error(error);
      });

    return () => {
      isCancelled = true;
    };
  }, [applyGameStatusSnapshot, isGameSocketConnected, queryState.gameId, refreshScoreBoard, selfPlayerId]);

  useEffect(() => {
    const gameId = queryState.gameId;
    if (!gameId || isResultOpen) return;

    let isCancelled = false;
    let syncTimer: number | null = null;
    let isSyncing = false;

    const syncGameStatus = async () => {
      if (document.visibilityState === 'hidden' || isSyncing) return;

      isSyncing = true;

      try {
        const status = await getGameStatus(gameId);
        if (!isCancelled) {
          applyGameStatusSnapshot(status);
          await refreshScoreBoard(
            gameId,
            status.currentPlayer ?? selfPlayerId,
            status.currentPlayer === selfPlayerId && hasRolledDiceThisTurn(status.rollsLeft)
          );
        }
      } catch (error) {
        if (!isCancelled) console.error(error);
      } finally {
        isSyncing = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncGameStatus();
    };

    syncTimer = window.setInterval(() => {
      void syncGameStatus();
    }, GAME_FALLBACK_SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (syncTimer) window.clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applyGameStatusSnapshot, isResultOpen, queryState.gameId, refreshScoreBoard, selfPlayerId]);

  useEffect(() => {
    if (!isServerGameFinished || isResultOpen) return;

    const resultTimer = window.setTimeout(() => {
      setIsResultOpen(true);
    }, RESULT_OPEN_DELAY_MS);

    return () => window.clearTimeout(resultTimer);
  }, [isResultOpen, isServerGameFinished]);

  useEffect(() => {
    const gameId = queryState.gameId;
    if (!isResultOpen || !gameId) return;

    let isCancelled = false;

    setIsSettlementLoading(true);
    setResultActionError(null);

    getSettlementResultData(gameId, selfPlayerId)
      .then(resultData => {
        if (isCancelled) return;

        setSettlementResultData(resultData);
      })
      .catch(error => {
        if (isCancelled) return;

        setResultActionError(error instanceof Error ? error.message : '获取结算数据失败，请稍后再试');
      })
      .finally(() => {
        if (!isCancelled) setIsSettlementLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isResultOpen, queryState.gameId, selfPlayerId]);

  useEffect(() => {
    const gameId = queryState.gameId;
    const currentGamePlayerId = toOptionalBackendPlayerId(selfPlayerId);
    const currentUserId = player?.id ? toOptionalBackendPlayerId(player.id) : null;
    const gameMode = isApiGameMode(queryState.mode) ? queryState.mode : 'local';
    const winner = settlementResultData?.players.find(item => item.rank === 1);

    if (
      !isResultOpen ||
      !gameId ||
      !winner ||
      currentGamePlayerId === null ||
      currentUserId === null ||
      winner.id !== currentGamePlayerId ||
      reportedWinnerGameIdRef.current === gameId
    ) {
      return;
    }

    reportedWinnerGameIdRef.current = gameId;

    void Promise.all([
      updateLeaderboardWins(currentUserId, gameMode),
      updateLeaderboardGames(currentUserId, gameMode),
    ]).catch(error => {
      console.error('[updateLeaderboard] 更新排行榜数据失败:', error);
    });
  }, [isResultOpen, player?.id, queryState.gameId, queryState.mode, selfPlayerId, settlementResultData]);

  const toggleDieLock = (index: number) => {
    if (!canOperateCurrentTurn || rollsLeft >= MAX_ROLLS_PER_TURN || isRolling) return;

    const nextLocked = locked.map((value, valueIndex) => (valueIndex === index ? !value : value));
    setLocked(nextLocked);

    setServerGameStatus(current => (current ? { ...current, diceLocked: nextLocked } : current));
  };

  const handleResetDiceLocks = async () => {
    if (!canOperateCurrentTurn || isRolling || rollsLeft >= MAX_ROLLS_PER_TURN || !locked.some(Boolean)) return;

    setLocked(initialLocked);
    setServerGameStatus(current => (current ? { ...current, diceLocked: initialLocked } : current));
  };

  const handleRollDice = async () => {
    if (!canOperateCurrentTurn || !queryState.gameId || rollingGuardRef.current || isRolling || rollsLeft <= 0) return;

    playDiceRollSound();
    rollingGuardRef.current = true;
    setIsRolling(true);

    try {
      const rollPromise = rollGameDice(queryState.gameId, {
        player_id: selfPlayerId,
        locked_dice: locked,
      });
      const [rollResult] = await Promise.all([rollPromise, delay(DICE_THROW_ANIMATION_MS)]);
      const nextDice = rollResult.dice;
      const nextLocked =
        rollResult.diceLocked && rollResult.diceLocked.length === initialLocked.length ? rollResult.diceLocked : locked;
      const nextRollsLeft = rollResult.rollsLeft;
      const nextPossibleScores = hasRolledDiceThisTurn(nextRollsLeft)
        ? await getPossibleScoreSnapshot(queryState.gameId, selfPlayerId).catch(error => {
            console.error(error);
            return {};
          })
        : {};

      setDice(nextDice);
      setLocked(nextLocked);
      setRollsLeft(nextRollsLeft);
      setPossibleScores(nextPossibleScores);
      setServerGameStatus(current =>
        current
          ? {
              ...current,
              dice: nextDice,
              diceLocked: nextLocked,
              rollsLeft: nextRollsLeft,
            }
          : current
      );
    } catch (error) {
      console.error(error);
    } finally {
      rollingGuardRef.current = false;
      setIsRolling(false);
    }
  };

  const handleQuitGame = async () => {
    if (!queryState.gameId) {
      router.push('/');
      return;
    }

    try {
      await quitGame(queryState.gameId, {
        player_id: selfPlayerId,
      });
      router.push('/');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectScore = async (category: ScoreCategory) => {
    if (
      scoreSubmittingGuardRef.current ||
      !canOperateCurrentTurn ||
      !queryState.gameId ||
      completedCategories.includes(category) ||
      !unlockedScoreCategories.includes(category) ||
      playerScores[category] !== undefined ||
      rollsLeft === MAX_ROLLS_PER_TURN ||
      isRolling ||
      isSubmittingScore
    ) {
      return;
    }

    let submittedCategory = category;
    let submittedScore = 0;
    let nextCompletedCategories: ScoreCategory[] = [];
    let isGameComplete = false;

    scoreSubmittingGuardRef.current = true;
    setIsSubmittingScore(true);

    try {
      const submitResult = await submitScoreItem(queryState.gameId, {
        player_id: selfPlayerId,
        category,
      });
      const nextTurnPlayerId = submitResult.nextPlayerId ?? activePlayerId;
      const submittedPlayerScores = { ...playerScores, [submitResult.category]: submitResult.scoreValue };

      submittedCategory = submitResult.category;
      submittedScore = submitResult.scoreValue;
      isGameComplete =
        submitResult.isGameFinished ||
        submitResult.gameStatus === 3 ||
        submitResult.gameStatus === 'finished' ||
        (players.length <= 1 && Object.keys(submittedPlayerScores).length >= SCORE_CATEGORIES.length);

      setServerGameStatus(current =>
        current
          ? {
              ...current,
              status: isGameComplete ? 'finished' : current.status,
              currentPlayer: nextTurnPlayerId,
              dice: initialDice,
              diceLocked: initialLocked,
              rollsLeft: MAX_ROLLS_PER_TURN,
              players: current.players.map(item =>
                item.playerId === submitResult.playerId
                  ? {
                      ...item,
                      scores: submittedPlayerScores,
                      totalScore: submitResult.totalScore,
                    }
                  : item
              ),
            }
          : current
      );
      setDice(initialDice);
      setLocked(normalizeLockedDiceState(initialLocked));
      setRollsLeft(MAX_ROLLS_PER_TURN);
      setPossibleScores({});
      nextCompletedCategories = Array.from(new Set([...completedCategories, submittedCategory]));
      setCompletedCategories(nextCompletedCategories);
      setPlayerScores(submittedPlayerScores);
      setUnlockedScoreCategories(current => current.filter(item => item !== submittedCategory));

      try {
        const nextLockStatus = await getScoreLockStatus(queryState.gameId, nextTurnPlayerId);
        applyScoreLockStatus(nextLockStatus);
      } catch (syncError) {
        console.error(syncError);
      }
    } catch (error) {
      console.error(error);
      return;
    } finally {
      scoreSubmittingGuardRef.current = false;
      setIsSubmittingScore(false);
    }

    if (LOWER_CATEGORIES.includes(submittedCategory)) {
      setGameEvents(prev => [
        {
          id: `${submittedCategory}-${Date.now()}`,
          text: `${activePlayerName} 记录下区“${CATEGORY_NAMES[submittedCategory]}”`,
          score: `+${submittedScore}`,
        },
        ...prev,
      ]);
    }

    if (submittedCategory === 'yacht' && submittedScore > 0) {
      setYachtEffectKey(Date.now());
    }

    if (isGameComplete) {
      window.setTimeout(() => {
        setIsResultOpen(true);
      }, RESULT_OPEN_DELAY_MS);
    }
  };

  const entryLoadingOverlay = (isCreatingEntryGame || entryGameCreateError) ? (
    <section className={styles.entryLoadingOverlay} aria-live="polite" aria-busy={isCreatingEntryGame}>
      <LoadingImage size="stage" priority className={styles.entryLoadingImage} />
      <span className={styles.entryLoadingStatus}>{entryGameCreateError ? '创建对局失败' : '正在创建对局'}</span>
      {entryGameCreateError && (
        <div className={styles.entryLoadingPanel}>
          <h1>创建对局失败</h1>
          <p>{entryGameCreateError}</p>
          <button type="button" onClick={() => router.push('/')}>
            返回大厅
          </button>
        </div>
      )}
    </section>
  ) : null;

  if (entryLoadingOverlay) {
    return (
      <ResponsiveStage
        className={styles.gamePage}
        viewportClassName={styles.gameViewport}
        stageClassName={styles.gameStage}
        backgroundImage={gameBackground.src}
      >
        {entryLoadingOverlay}
      </ResponsiveStage>
    );
  }

  return (
    <>
      <ResponsiveStage
        className={styles.gamePage}
        viewportClassName={styles.gameViewport}
        stageClassName={styles.gameStage}
        backgroundImage={gameBackground.src}
      >
        {yachtEffectKey > 0 && <YachtScoreEffect triggerKey={yachtEffectKey} />}
        <header className={styles.topLayer}>
          <Link className={styles.logoArea} href="/" aria-label="返回投骰乐园首页">
            <span className={styles.logoDice}>D6</span>
            <span>
              投骰乐园
              <small>DICE PARADISE</small>
            </span>
          </Link>

          <div className={styles.statusPill}>
            <strong>对局中</strong>
            <span>{queryState.gameId ? `对局号：${queryState.gameId}` : `房间号：${roomId}`}</span>
          </div>

          <nav className={styles.topActions} aria-label="对局工具">
            <button type="button" onClick={() => setIsRulesOpen(true)}>
              <Info size={22} />
              规则说明
            </button>
            <SoundToggle
              className={styles.soundToggleButton}
              checked={isSoundEnabled}
              onChange={setIsSoundEnabled}
              ariaLabel={isSoundEnabled ? '关闭音效' : '开启音效'}
            />
            <button className={styles.exitButton} type="button" onClick={handleQuitGame}>
              <DoorOpen size={22} />
              退出本局
            </button>
          </nav>

        </header>

        <aside className={styles.playerPanel} aria-label="玩家列表">
          {players.map(item => (
            <PlayerCard key={item.id} player={item} isActive={item.id === activePlayerId} />
          ))}
        </aside>

        <section className={styles.diceDock} aria-label="骰子操作区">
          <div className={styles.diceToolbar}>
            <div className={styles.rollCounter}>
              <Dice5 size={23} />
              剩余投掷次数：<strong>{rollsLeft}</strong>
            </div>
            <button
              className={styles.unlockAllButton}
              type="button"
              disabled={!canOperateCurrentTurn || isRolling || rollsLeft >= MAX_ROLLS_PER_TURN || !locked.some(Boolean)}
              onClick={handleResetDiceLocks}
            >
              <LockKeyhole size={18} />
              全部解锁
            </button>
          </div>
          <div className={styles.diceRow}>
            {dice.map((value, index) => (
              <DiceFace
                key={index}
                value={value}
                locked={locked[index]}
                rolling={isRolling}
                disabled={!canOperateCurrentTurn}
                index={index}
                onToggle={() => toggleDieLock(index)}
              />
            ))}
          </div>
          <button
            className={styles.rollButton}
            type="button"
            disabled={!canOperateCurrentTurn || isRolling || rollsLeft <= 0}
            onClick={handleRollDice}
          >
            <Dice5 size={36} />
            {!canOperateCurrentTurn ? waitingTurnLabel : isRolling ? '投掷中' : rollsLeft === MAX_ROLLS_PER_TURN ? '投骰子' : '重掷骰子'}
          </button>
        </section>

        {showChat && (
          <GameChat
            key={queryState.gameId ?? roomId}
            className={styles.chatPanel}
            ariaLabel="聊天消息"
            messages={emptyChatMessages}
            currentUserName={selfPlayerName}
            currentUserAvatar={player?.avatar}
            placeholder="说点什么..."
            defaultHeight={300}
            minHeight={220}
            maxHeight={430}
          />
        )}

        <aside className={styles.scorePanel} aria-label="计分表" style={scoreTableStyle}>
          <h2>
            快艇骰子计分表<span>（每回合选择一个空格计分）</span>
          </h2>
          <div className={styles.scoreHeader}>
            <span />
            {players.map(item => (
              <div key={item.id} className={styles.scorePlayer}>
                <div className={`${styles.scoreAvatar} ${item.avatarClass}`}>{item.avatarLabel}</div>
                <small>{item.name}</small>
              </div>
            ))}
          </div>
          <div className={styles.scoreBody}>
            {SCORE_CATEGORIES.map((row, index) => {
              const category = row.category;
              const score = playerScores[category];
              const possibleScore = displayedPossibleScores[category];
              const isCompleted = completedCategories.includes(category);
              const hasPossibleScore = possibleScore !== undefined;
              const completedScore = isCompleted ? score : undefined;
              const isUnlocked = unlockedScoreCategories.includes(category);
              const disabled =
                !canOperateCurrentTurn ||
                isCompleted ||
                !isUnlocked ||
                !hasRolledCurrentTurn ||
                isRolling ||
                isSubmittingScore;

              return (
                <button
                  key={category}
                  type="button"
                  className={`${styles.scoreRow} ${!disabled ? styles.scoreRowSelectable : ''}`}
                  onClick={() => handleSelectScore(category)}
                  disabled={disabled}
                >
                  <div className={styles.ruleCell}>
                    {(index === 0 || SCORE_CATEGORIES[index - 1].category === 'sixes') && (
                      <span className={styles.sectionBadge}>{index <= 5 ? '上层' : '下层'}</span>
                    )}
                    <strong>
                      <CategoryIcon category={category} />
                      {row.nameZh}
                    </strong>
                    <small>（{getCategoryHint(category)}）</small>
                  </div>
                  {players.map(item => {
                    const isCurrentPlayerColumn = item.id === activePlayerId;
                    const itemScores = isCurrentPlayerColumn ? playerScores : syncedScoresByPlayerId[item.id] ?? {};
                    const itemScore = itemScores[category];

                    return (
                      <span
                        key={item.id}
                        className={`${styles.scoreValue} ${
                          isCurrentPlayerColumn && isCompleted ? styles.scoreValueFilled : ''
                        } ${
                          isCurrentPlayerColumn && !isCompleted && hasPossibleScore ? styles.scoreValuePossible : ''
                        }`}
                      >
                        {isCurrentPlayerColumn
                          ? completedScore ?? (hasPossibleScore ? possibleScore ?? 0 : '-')
                          : itemScore ?? '-'}
                      </span>
                    );
                  })}
                </button>
              );
            })}
            <div className={styles.scoreRow}>
              <div className={styles.ruleCell}>
                <span className={styles.sectionBadge}>总分</span>
                <strong>★ 当前总分</strong>
              </div>
              {players.map(item => (
                <span key={item.id} className={styles.scoreValue}>
                  {item.id === selfPlayerId ? currentTotalScore : item.score}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <aside className={styles.eventPanel} aria-label="本局事件">
          <h2>本局事件</h2>
          <ul>
            {gameEvents.map(item => (
              <li key={item.id}>
                <span>{item.text}</span>
                {item.score && <em>{item.score}</em>}
              </li>
            ))}
          </ul>
        </aside>

        {isRulesOpen && <GameRulesModal open={isRulesOpen} onClose={() => setIsRulesOpen(false)} />}
      </ResponsiveStage>

      {isResultOpen && (
        <GameResultModal
          open={isResultOpen}
          result={displayedResultData}
          initialSelectedPlayerId={resultSelectedPlayerId}
          loading={isSettlementLoading}
          onBackLobby={handleBackLobbyFromResult}
          onReplay={handleReplay}
          backLoading={isReturningLobby}
          replayLoading={isRematching}
          actionError={resultActionError}
          onShare={() => undefined}
          onSave={() => undefined}
        />
      )}
    </>
  );
}
