'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Anchor,
  Bot,
  CalendarCheck,
  ChevronRight,
  Crown,
  Dice5,
  Gift,
  Home,
  LogIn,
  LogOut,
  Palette,
  PlusCircle,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import lobbyBackground from '@/assets/images/backgrounds/lobby/lobby-bg.png';
import activeBackground from '@/assets/images/ui/buttons/active.png';
import beganGameBackground from '@/assets/images/ui/buttons/begangame.png';
import beganRebotBackground from '@/assets/images/ui/buttons/beganrebot.png';
import beganRoomBackground from '@/assets/images/ui/buttons/beganroom.png';
import defaultAvatar from '@/assets/images/avatars/default-player.png';
import aiBattlePanelImage from '@/assets/images/ui/panels/Player vs AI.png';
import deepseekImage from '@/assets/images/ui/panels/deepseek.png';
import doubaoImage from '@/assets/images/ui/panels/doubao.png';
import kimiImage from '@/assets/images/ui/panels/kimi.png';
import { ResponsiveStage } from '@/components/layout';
import { GameChat, LoadingImage, SoundToggle, StarIcon, type GameChatMessage } from '@/components/ui';
import { useChatSocket, useHomePoints, useHomeSoundSetting } from '@/hooks';
import { getRoomApiErrorMessage } from '@/modules/room/roomApi';
import { usePlayerStore, useRoomStore } from '@/stores';
import type { ChatSocketChatMessage, ChatSocketSystemMessage } from '@/types/chatSocket';
import type { ApiGameMode } from '@/types/gameApi';
import { getOrCreateClientId } from '@/utils/clientId';
import styles from './home-lobby.module.css';

const LobbyAmbientEffects = dynamic(
  () => import('@/components/layout/LobbyAmbientEffects').then(module => module.LobbyAmbientEffects),
  { ssr: false, loading: () => null }
);

const RoomHallModal = dynamic(
  () => import('@/components/game/RoomHallModal').then(module => module.RoomHallModal),
  { ssr: false, loading: () => null }
);

const JoinRoomModal = dynamic(
  () => import('@/components/game/JoinRoomModal').then(module => module.JoinRoomModal),
  { ssr: false, loading: () => null }
);

interface ActionCard {
  title: string;
  subtitle: string;
  href: string;
  modifier: string;
  icon: LucideIcon;
  backgroundImage: string;
  createMode?: ApiGameMode;
  opensAiMode?: boolean;
  createsRoom?: boolean;
}

type AiDifficulty = 'easy' | 'medium' | 'hard';
type RoomDialogMode = 'choose' | 'join';

const roomNumberLabel = 'Room ID'.split('');

interface AiDifficultyOption {
  value: AiDifficulty;
  title: string;
  badge: string;
  description: string;
  icon: LucideIcon;
  modifier: string;
  image: StaticImageData;
  stars: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  icon: LucideIcon;
}

interface DailyTask {
  title: string;
  progress: string;
  reward: string;
  action: string;
  icon: LucideIcon;
  iconTone: string;
}

const actionCards: ActionCard[] = [
  {
    title: '开始游戏',
    subtitle: '单人模式',
    href: '/game?mode=single',
    modifier: styles.startGame,
    icon: Anchor,
    backgroundImage: beganGameBackground.src,
    createMode: 'local',
  },
  {
    title: '开房间',
    subtitle: '邀请好友一起玩',
    href: '/room',
    modifier: styles.createRoom,
    icon: Home,
    backgroundImage: beganRoomBackground.src,
    createsRoom: true,
  },
  {
    title: '人机对战',
    subtitle: '挑战AI，提升技巧',
    href: '/game?mode=ai',
    modifier: styles.botBattle,
    icon: Bot,
    backgroundImage: beganRebotBackground.src,
    opensAiMode: true,
  },
  {
    title: '活动',
    subtitle: '精彩活动进行中',
    href: '/activity',
    modifier: styles.events,
    icon: Gift,
    backgroundImage: activeBackground.src,
  },
];

const aiDifficultyOptions: AiDifficultyOption[] = [
  {
    value: 'easy',
    title: '豆包',
    badge: '简单',
    description: '轻松对战，快乐相伴',
    icon: ShieldCheck,
    modifier: styles.aiBattleEasy,
    image: doubaoImage,
    stars: 1,
  },
  {
    value: 'medium',
    title: 'Kimi',
    badge: '普通',
    description: '实力均衡，策略为王',
    icon: Bot,
    modifier: styles.aiBattleNormal,
    image: kimiImage,
    stars: 2,
  },
  {
    value: 'hard',
    title: 'deepseek',
    badge: '困难',
    description: '强大对手，极限挑战',
    icon: Zap,
    modifier: styles.aiBattleHard,
    image: deepseekImage,
    stars: 3,
  },
];

const leaderboardEntries: LeaderboardEntry[] = [
  { rank: 1, name: '乐乐玩家', score: 12560, icon: Dice5 },
  { rank: 2, name: 'AI机器人', score: 9860, icon: Bot },
  { rank: 3, name: '小可爱', score: 8650, icon: User },
];

const dailyTasks: DailyTask[] = [
  {
    title: '登录游戏',
    progress: '1/1',
    reward: 'x200',
    action: '领取',
    icon: CalendarCheck,
    iconTone: styles.taskIconGold,
  },
  {
    title: '完成1局对战',
    progress: '0/1',
    reward: 'x300',
    action: '去完成',
    icon: Dice5,
    iconTone: styles.taskIconBlue,
  },
  {
    title: '累计投掷骰子20次',
    progress: '8/20',
    reward: 'x200',
    action: '去完成',
    icon: Rocket,
    iconTone: styles.taskIconPurple,
  },
  {
    title: '获得1次胜利',
    progress: '0/1',
    reward: 'x500',
    action: '去完成',
    icon: Trophy,
    iconTone: styles.taskIconGreen,
  },
];

const HOME_CHAT_MESSAGE_LIMIT = 80;

const initialChatMessages: GameChatMessage[] = [
  { id: 'home-system-1', type: 'system', author: '系统消息', text: '排行榜奖励将在今晚 22:00 结算。' },
  { id: 'home-system-2', type: 'system', author: '系统消息', text: '每日任务已刷新，记得领取奖励。' },
  { id: 'home-player-1', type: 'player', author: '骰子达人', text: '刚刚开了房间，等两位一起上船。' },
  { id: 'home-player-2', type: 'player', author: '海风轻语', text: '大家好呀~' },
  { id: 'home-player-3', type: 'player', author: '阳光骰童', text: '这局太刺激了！' },
  { id: 'home-player-4', type: 'player', author: '幸运星', text: '一起开黑吗？' },
  { id: 'home-player-5', type: 'player', author: '乐乐玩家', text: '谁来挑战人机模式？' },
  { id: 'home-player-6', type: 'player', author: '小蓝骰', text: '我差一个快艇就能翻盘。' },
];

function getProgressWidth(progress: string): string {
  if (progress === '1/1') return '100%';
  if (progress === '8/20') return '40%';
  return '8%';
}

function isRoomNotFoundErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  return message.includes('房间不存在') || normalizedMessage.includes('room not found');
}

export default function HomePage() {
  const router = useRouter();
  const player = usePlayerStore(state => state.player);
  const isLoggedIn = usePlayerStore(state => state.isLoggedIn);
  const authToken = usePlayerStore(state => state.authToken);
  const logout = usePlayerStore(state => state.logout);
  const soundSettingFallback = usePlayerStore(state => state.settings.soundEnabled);
  const createRoom = useRoomStore(state => state.createRoom);
  const currentRoom = useRoomStore(state => state.currentRoom);
  const fetchRoomList = useRoomStore(state => state.fetchRoomList);
  const joinRoom = useRoomStore(state => state.joinRoom);
  const restoreCurrentRoom = useRoomStore(state => state.restoreCurrentRoom);
  const roomList = useRoomStore(state => state.roomList);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isAiModeOpen, setIsAiModeOpen] = useState(false);
  const [isRoomHallOpen, setIsRoomHallOpen] = useState(false);
  const [isJoinRoomModalOpen, setIsJoinRoomModalOpen] = useState(false);
  const [isRoomModeOpen, setIsRoomModeOpen] = useState(false);
  const [roomDialogMode, setRoomDialogMode] = useState<RoomDialogMode>('choose');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [creatingGameMode, setCreatingGameMode] = useState<ApiGameMode | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isFetchingRoomList, setIsFetchingRoomList] = useState(false);
  const [gameCreateError, setGameCreateError] = useState<string | null>(null);
  const [homeChatMessages, setHomeChatMessages] = useState(initialChatMessages);
  const [homeGuestChatPlayerId] = useState(() => getOrCreateClientId());

  const playerName = player?.name ?? '涔愪箰鐜╁';
  const playerLevel = player?.level ?? 28;
  const fallbackHomePoints = player?.coins ?? player?.gems ?? 12560;
  const { points: homePoints } = useHomePoints(player?.id, fallbackHomePoints);
  const { soundEnabled: isSoundEnabled, setSoundEnabled: setIsSoundEnabled } = useHomeSoundSetting(
    player?.id,
    soundSettingFallback
  );
  const hasUserSession = Boolean(isLoggedIn && player && authToken?.trim());
  const playerAvatar = hasUserSession && player?.avatar ? player.avatar : defaultAvatar.src;
  const homeChatPlayerId = player?.id ?? homeGuestChatPlayerId;

  const appendHomeChatMessage = useCallback((message: GameChatMessage) => {
    setHomeChatMessages(currentMessages => [...currentMessages, message].slice(-HOME_CHAT_MESSAGE_LIMIT));
  }, []);

  const handleHomeChatSocketMessage = useCallback(
    (message: ChatSocketChatMessage) => {
      appendHomeChatMessage({
        id: `home-chat-${message.timestamp}-${message.playerId}-${message.message}`,
        type: 'player',
        author: message.playerName,
        avatar: message.avatar,
        text: message.message,
      });
    },
    [appendHomeChatMessage]
  );

  const handleHomeChatSystemMessage = useCallback(
    (message: ChatSocketSystemMessage) => {
      appendHomeChatMessage({
        id: `home-system-${message.timestamp}-${message.action ?? 'message'}-${message.playerId}`,
        type: 'system',
        author: '系统消息',
        text: message.message,
      });
    },
    [appendHomeChatMessage]
  );

  const { isConnected: isHomeChatConnected, sendChat: sendHomeChat } = useChatSocket({
    channel: 'lobby',
    playerId: homeChatPlayerId,
    enabled: Boolean(homeChatPlayerId),
    onChatMessage: handleHomeChatSocketMessage,
    onSystemMessage: handleHomeChatSystemMessage,
  });

  const handleSendHomeChatMessage = useCallback(
    (message: string) => {
      const isSent = sendHomeChat(message);

      if (!isSent) {
        appendHomeChatMessage({
          id: `home-chat-offline-${Date.now()}`,
          type: 'system',
          author: '系统消息',
          text: '聊天连接恢复中，请稍后再试',
        });
      }

      return isSent;
    },
    [appendHomeChatMessage, sendHomeChat]
  );

  useEffect(() => {
    const prefetchTimer = window.setTimeout(() => {
      router.prefetch('/game');
      router.prefetch('/room');
    }, 900);

    return () => window.clearTimeout(prefetchTimer);
  }, [router]);

  useEffect(() => {
    if (!hasUserSession || currentRoom) return;

    void restoreCurrentRoom().catch(error => {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (isRoomNotFoundErrorMessage(message)) return;

      console.warn(
        '[restoreCurrentRoom] 当前房间恢复暂时不可用，继续进入大厅:',
        message
      );
    });
  }, [currentRoom, hasUserSession, restoreCurrentRoom]);

  const handlePlayerProfileClick = () => {
    if (hasUserSession) {
      router.push('/profile');
      return;
    }

    setIsAuthPromptOpen(true);
  };

  const handleAuthPromptLogin = () => {
    router.push('/login?mode=login');
  };

  const handleAuthPromptRegister = () => {
    router.push('/login?mode=register');
  };

  const handleLogout = () => {
    logout();
    router.replace('/login?mode=login');
  };

  const enterPendingGame = (gameMode: ApiGameMode, extraParams: Record<string, string> = {}) => {
    if (creatingGameMode) return;

    setCreatingGameMode(gameMode);
    setGameCreateError(null);

    const params = new URLSearchParams({
      mode: gameMode,
      pendingCreate: '1',
      ...extraParams,
    });

    router.push(`/game?${params.toString()}`);
  };

  const prefetchActionRoute = (href: string) => {
    router.prefetch(href.split('?')[0]);
  };

  const handleLocalGameStart = () => {
    if (!hasUserSession) {
      setIsAuthPromptOpen(true);
      return;
    }

    enterPendingGame('local');
  };

  const handleAiDifficultySelect = (difficulty: AiDifficulty) => {
    enterPendingGame('ai', { difficulty });
  };

  const refreshWaitingRoomList = async () => {
    setIsFetchingRoomList(true);
    setGameCreateError(null);

    try {
      await fetchRoomList();
    } catch (error) {
      const errorMessage = getRoomApiErrorMessage(error, '房间列表获取失败，请稍后再试');

      if (!isRoomNotFoundErrorMessage(errorMessage)) {
        setGameCreateError(errorMessage);
      }
    } finally {
      setIsFetchingRoomList(false);
    }
  };

  const openRoomModeDialog = () => {
    if (creatingGameMode || isCreatingRoom || isJoiningRoom) return;

    if (currentRoom) {
      setIsRoomHallOpen(false);
      setIsJoinRoomModalOpen(false);
      setIsRoomModeOpen(false);
      router.push('/room');
      return;
    }

    if (!hasUserSession) {
      setIsAuthPromptOpen(true);
      return;
    }

    setGameCreateError(null);
    setRoomDialogMode('choose');
    setJoinRoomCode('');
    setIsJoinRoomModalOpen(false);
    setIsRoomHallOpen(true);
  };

  const closeRoomModeDialog = () => {
    if (isCreatingRoom || isJoiningRoom) return;

    setIsRoomHallOpen(false);
    setIsJoinRoomModalOpen(false);
    setIsRoomModeOpen(false);
    setRoomDialogMode('choose');
    setJoinRoomCode('');
    setGameCreateError(null);
  };

  const handleCreateRoom = async () => {
    if (isCreatingRoom || isJoiningRoom || creatingGameMode) return;

    if (!hasUserSession) {
      setIsAuthPromptOpen(true);
      return;
    }

    setIsCreatingRoom(true);
    setGameCreateError(null);

    try {
      await createRoom(`${playerName}的房间`, {
        maxPlayers: 4,
        isPrivate: false,
        roundTime: 30,
        autoStart: false,
      }, playerName);
      setIsRoomHallOpen(false);
      router.push('/room');
    } catch (error) {
      const errorMessage = getRoomApiErrorMessage(error, '房间创建失败，请稍后再试');

      setGameCreateError(isRoomNotFoundErrorMessage(errorMessage) ? null : errorMessage);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    const normalizedRoomCode = joinRoomCode.trim();
    if (!normalizedRoomCode || isJoiningRoom || isCreatingRoom || creatingGameMode) return;

    if (!hasUserSession) {
      setIsAuthPromptOpen(true);
      return;
    }

    setIsJoiningRoom(true);
    setGameCreateError(null);

    try {
      await joinRoom(normalizedRoomCode, playerName);
      setIsRoomHallOpen(false);
      setIsJoinRoomModalOpen(false);
      setIsRoomModeOpen(false);
      setJoinRoomCode('');
      router.replace('/room');
    } catch (error) {
      setGameCreateError(getRoomApiErrorMessage(error, '加入房间失败，请稍后再试'));
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleJoinWaitingRoom = async (roomCode: string) => {
    if (!roomCode || isJoiningRoom || isCreatingRoom || creatingGameMode) return;

    if (!hasUserSession) {
      setIsAuthPromptOpen(true);
      return;
    }

    setJoinRoomCode(roomCode);
    setIsJoiningRoom(true);
    setGameCreateError(null);

    try {
      await joinRoom(roomCode, playerName);
      setIsRoomHallOpen(false);
      setIsJoinRoomModalOpen(false);
      setIsRoomModeOpen(false);
      setJoinRoomCode('');
      router.replace('/room');
    } catch (error) {
      setGameCreateError(getRoomApiErrorMessage(error, '加入房间失败，请稍后再试'));
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleRoomHallJoin = () => {
    setIsRoomHallOpen(false);
    setIsRoomModeOpen(false);
    setRoomDialogMode('join');
    setGameCreateError(null);
    setIsJoinRoomModalOpen(true);
    void refreshWaitingRoomList();
  };

  const shouldShowGameCreateToast = gameCreateError
    ? !isRoomNotFoundErrorMessage(gameCreateError) && !isAiModeOpen && !isRoomHallOpen && !isJoinRoomModalOpen && !isRoomModeOpen
    : false;

  return (
    <ResponsiveStage
      className={styles.gameLobbyPage}
      viewportClassName={styles.lobbyViewport}
      stageClassName={styles.lobbyStage}
      backgroundImage={lobbyBackground.src}
    >
      <LobbyAmbientEffects />

      <header className={styles.lobbyHeader}>
        <section
          className={styles.playerProfile}
          aria-label="用户信息栏"
        >
          <button
            className={styles.playerProfileMain}
            type="button"
            aria-label="打开个人中心"
            onClick={handlePlayerProfileClick}
          >
            <span
              className={styles.avatarSlot}
              aria-label={`${playerName}澶村儚`}
              style={{ backgroundImage: `url(${playerAvatar})` }}
            />
            <div className={styles.playerInfo}>
              <div className={styles.playerNameRow}>
                <h1 className={styles.playerName}>{playerName}</h1>
                <div className={styles.vipBadgeSlot} aria-label="VIP 等级标识">
                  VIP4
                </div>
              </div>
              <div className={styles.playerMeta}>
                <span>Lv.{playerLevel}</span>
                <span className={styles.playerStars}>
                  <StarIcon size={15} />
                  {homePoints.toLocaleString()}
                </span>
              </div>
              <div className={styles.levelTrack} aria-hidden="true">
                <span style={{ width: '62%' }} />
              </div>
            </div>
          </button>
          <button
            className={styles.logoutButton}
            type="button"
            aria-label="退出登录"
            onClick={handleLogout}
          >
            <LogOut size={17} strokeWidth={3} />
            退出
          </button>
        </section>

        <div className={styles.headerNotice}>
          <Volume2 size={19} fill="currentColor" />
          <span className={styles.noticeViewport}>
            <span className={styles.noticeMarqueeText}>
              <span>欢迎来到投骰乐园！</span>
              <span aria-hidden="true">欢迎来到投骰乐园！</span>
            </span>
          </span>
        </div>

        <section className={styles.headerTools} aria-label="顶部工具栏">
          <SoundToggle
            checked={isSoundEnabled}
            onChange={setIsSoundEnabled}
            ariaLabel={isSoundEnabled ? '关闭音效' : '开启音效'}
          />
          <div className={styles.currencyPill}>
            <span className={styles.rewardIconSlot} aria-hidden="true">
              <StarIcon size={25} />
            </span>
            <strong>{homePoints.toLocaleString()}</strong>
          </div>
          <button className={styles.toolButton} type="button" aria-label="璁剧疆">
            <Settings size={30} />
          </button>
        </section>
      </header>

      {isAuthPromptOpen && (
        <div
          className={styles.authPromptOverlay}
          role="presentation"
          onClick={() => setIsAuthPromptOpen(false)}
        >
          <section
            className={styles.authPromptDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-prompt-title"
            onClick={event => event.stopPropagation()}
          >
            <h2 id="auth-prompt-title">请先登录</h2>
            <p>登录或注册后可以查看个人中心、保存战绩和同步奖励。</p>
            <div className={styles.authPromptActions}>
              <button type="button" onClick={handleAuthPromptLogin}>
                登录账号
              </button>
              <button type="button" onClick={handleAuthPromptRegister}>
                注册账号
              </button>
              <button type="button" onClick={() => setIsAuthPromptOpen(false)}>
                暂不登录
              </button>
            </div>
          </section>
        </div>
      )}
      {isAiModeOpen && (
        <div
          className={styles.aiModeOverlay}
          role="presentation"
        >
          <section
            className={styles.aiBattleDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-mode-title"
            onClick={event => event.stopPropagation()}
          >
            <Image src={aiBattlePanelImage} alt="" fill sizes="1260px" className={styles.aiBattlePanelImage} />
            <h2 id="ai-mode-title" className={styles.aiBattleTitle}>人机对战</h2>
            <p className={styles.aiBattleSubtitle}>选择你的AI对手，开始挑战吧！</p>

            <button
              className={styles.aiBattleCloseHotspot}
              type="button"
              aria-label="关闭人机对战"
              onClick={() => setIsAiModeOpen(false)}
            />

            <div className={styles.aiBattleGrid}>
              {aiDifficultyOptions.map(option => {
                const isCreatingAiGame = creatingGameMode === 'ai';

                return (
                  <button
                    key={option.value}
                    className={`${styles.aiBattleCard} ${option.modifier}`}
                    type="button"
                    disabled={Boolean(creatingGameMode || isCreatingRoom || isJoiningRoom)}
                    onClick={() => handleAiDifficultySelect(option.value)}
                  >
                    <span className={styles.aiBattleBadge}>{option.badge}</span>
                    <span className={styles.aiBattlePortrait}>
                      <Image src={option.image} alt="" fill sizes="330px" className={styles.aiBattlePortraitImage} />
                    </span>
                    <span className={styles.aiBattleInfo}>
                      <strong>{option.title}</strong>
                      <span>{option.description}</span>
                      <span className={styles.aiBattleStars} aria-label={`${option.stars}星难度`}>
                        {[0, 1, 2].map(starIndex => (
                          <span key={starIndex} className={starIndex < option.stars ? styles.aiBattleStarActive : styles.aiBattleStarEmpty}>
                            ★
                          </span>
                        ))}
                      </span>
                      {isCreatingAiGame && <small>创建中</small>}
                    </span>
                  </button>
                );
              })}
            </div>

            {gameCreateError && <p className={styles.aiModeError}>{gameCreateError}</p>}
          </section>
        </div>
      )}
      {isRoomHallOpen && (
        <RoomHallModal
          isOpen={isRoomHallOpen}
          onClose={closeRoomModeDialog}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleRoomHallJoin}
          isLoading={isCreatingRoom || isJoiningRoom}
          waitingRoomCount={roomList.length}
        />
      )}

      {isJoinRoomModalOpen && (
        <JoinRoomModal
          isOpen={isJoinRoomModalOpen}
          joinRoomCode={joinRoomCode}
          roomNumberLabel={roomNumberLabel}
          isLoading={isJoiningRoom}
          isRoomListLoading={isFetchingRoomList}
          error={gameCreateError}
          rooms={roomList}
          onRoomCodeChange={setJoinRoomCode}
          onClose={closeRoomModeDialog}
          onSubmit={handleJoinRoom}
          onJoinRoom={handleJoinWaitingRoom}
          onRefreshRooms={() => void refreshWaitingRoomList()}
        />
      )}

      {isRoomModeOpen && (
        <div className={styles.roomModeOverlay} role="presentation">
          <section
            className={styles.roomModeDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-mode-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              className={styles.aiModeClose}
              type="button"
              aria-label="关闭房间选择"
              onClick={closeRoomModeDialog}
            >
              <X size={22} strokeWidth={3} />
            </button>

            <div className={styles.aiModeHeader}>
              <span className={`${styles.aiModeMascot} ${styles.roomModeMascot}`} aria-hidden="true">
                <Home size={38} strokeWidth={2.8} />
                <Sparkles size={16} strokeWidth={3} />
              </span>
              <div>
                <span className={styles.aiModeEyebrow}>
                  <Crown size={17} fill="currentColor" strokeWidth={2.6} />
                  联机房间
                </span>
                <h2 id="room-mode-title">{roomDialogMode === 'choose' ? '选择房间方式' : '输入房间号'}</h2>
                <p>{roomDialogMode === 'choose' ? '创建新房间，或输入房间号加入已有房间。' : '输入好友分享的房间号，确认后进入等待房间。'}</p>
              </div>
            </div>

            {roomDialogMode === 'choose' ? (
              <div className={styles.roomModeGrid}>
                <button
                  className={`${styles.aiModeCard} ${styles.roomCreateCard}`}
                  type="button"
                  disabled={isCreatingRoom || isJoiningRoom}
                  onClick={handleCreateRoom}
                >
                  <span className={styles.aiModeBadge}>房主</span>
                  <span className={styles.aiModeIcon} aria-hidden="true">
                    <PlusCircle size={34} strokeWidth={2.8} />
                  </span>
                  <strong>创建房间</strong>
                  <span>自动生成联机房间号，进入房间后等待其他玩家加入。</span>
                  <small>
                    {isCreatingRoom ? '创建中' : '立即创建'}
                    <ChevronRight size={16} strokeWidth={3} />
                  </small>
                </button>

                <button
                  className={`${styles.aiModeCard} ${styles.roomJoinCard}`}
                  type="button"
                  disabled={isCreatingRoom || isJoiningRoom}
                  onClick={() => {
                    setGameCreateError(null);
                    setRoomDialogMode('join');
                  }}
                >
                  <span className={styles.aiModeBadge}>加入</span>
                  <span className={styles.aiModeIcon} aria-hidden="true">
                    <LogIn size={34} strokeWidth={2.8} />
                  </span>
                  <strong>加入房间</strong>
                  <span>输入房间号搜索并加入已经创建好的联机房间。</span>
                  <small>
                    输入房间号
                    <ChevronRight size={16} strokeWidth={3} />
                  </small>
                </button>
              </div>
            ) : (
              <form
                className={styles.roomJoinForm}
                onSubmit={event => {
                  event.preventDefault();
                  void handleJoinRoom();
                }}
              >
                <div className={styles.roomSearchBox}>
                  <input
                    id="room-code-input"
                    type="text"
                    required
                    value={joinRoomCode}
                    disabled={isJoiningRoom}
                    onChange={event => setJoinRoomCode(event.target.value)}
                  />
                  <label htmlFor="room-code-input" aria-label="Room ID">
                    {roomNumberLabel.map((character, index) => (
                      <span key={`${character}-${index}`} style={{ transitionDelay: `${index * 50}ms` }}>
                        {character === ' ' ? '\u00A0' : character}
                      </span>
                    ))}
                  </label>
                </div>
                <div className={styles.roomJoinActions}>
                  <button type="button" onClick={() => setRoomDialogMode('choose')} disabled={isJoiningRoom}>
                    返回
                  </button>
                  <button type="submit" disabled={!joinRoomCode.trim() || isJoiningRoom}>
                    {isJoiningRoom ? '加入中' : '确认加入'}
                  </button>
                </div>
              </form>
            )}

            {gameCreateError && <p className={styles.aiModeError}>{gameCreateError}</p>}
          </section>
        </div>
      )}

      {shouldShowGameCreateToast && (
        <div className={styles.gameCreateToast} role="alert">
          {gameCreateError}
        </div>
      )}

      <aside className={styles.leftSidebar} aria-label="排行榜">
        <section className={`${styles.sidePanel} ${styles.leaderboardPanel}`}>
          <div className={styles.panelHeader}>
            <h2>排行榜</h2>
            <Link href="/leaderboard">更多</Link>
          </div>
          <ol className={styles.leaderboardList}>
            {leaderboardEntries.map(entry => {
              const EntryIcon = entry.icon;

              return (
                <li key={entry.rank} className={styles.leaderboardItem}>
                  <span className={styles.rankBadge}>{entry.rank}</span>
                  <span className={styles.miniAvatarSlot} aria-hidden="true">
                    <EntryIcon size={25} strokeWidth={2.6} />
                  </span>
                  <span className={styles.entryName}>{entry.name}</span>
                  <span className={styles.entryScore}>
                    <StarIcon size={14} />
                    {entry.score}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </aside>

      <section className={styles.mainActions} aria-label="主要功能按钮区域">
        {actionCards.map(card => {
          const Icon = card.icon;
          const actionCardStyle = {
            '--action-bg': `url(${card.backgroundImage})`,
          } as CSSProperties;
          const cardContent = (
            <>
              <span className={styles.primaryTag}>主按钮</span>
              <div className={styles.actionCopy}>
                <h2>{card.title}</h2>
                <p>{card.subtitle}</p>
              </div>
              <span className={styles.actionIconSlot} aria-hidden="true">
                <Icon size={38} strokeWidth={2.7} />
              </span>
            </>
          );

          if (card.opensAiMode || card.createMode || card.createsRoom) {
            const isCreatingThisMode = card.createsRoom
              ? isCreatingRoom
              : card.createMode
                ? creatingGameMode === card.createMode
                : creatingGameMode === 'ai';

            return (
              <button
                key={card.title}
                type="button"
                className={`${styles.actionCard} ${card.modifier}`}
                style={actionCardStyle}
                aria-haspopup={card.opensAiMode ? 'dialog' : undefined}
                aria-expanded={card.opensAiMode ? isAiModeOpen : undefined}
                disabled={Boolean(creatingGameMode || isCreatingRoom || isJoiningRoom)}
                onMouseEnter={() => prefetchActionRoute(card.opensAiMode ? '/game' : card.href)}
                onFocus={() => prefetchActionRoute(card.opensAiMode ? '/game' : card.href)}
                onClick={card.opensAiMode ? () => setIsAiModeOpen(true) : card.createsRoom ? openRoomModeDialog : handleLocalGameStart}
              >
                {isCreatingThisMode ? (
                  <>
                    <span className={styles.primaryTag}>创建中</span>
                    <div className={styles.actionCopy}>
                      <LoadingImage size="sm" className={styles.actionLoadingImage} />
                      <h2>{card.title}</h2>
                      <p>{card.createsRoom ? '正在创建房间' : '正在创建对局'}</p>
                    </div>
                    <span className={styles.actionIconSlot} aria-hidden="true">
                      <Icon size={38} strokeWidth={2.7} />
                    </span>
                  </>
                ) : (
                  cardContent
                )}
              </button>
            );
          }

          return (
            <Link
              key={card.title}
              href={card.href}
              className={`${styles.actionCard} ${card.modifier}`}
              style={actionCardStyle}
            >
              {cardContent}
            </Link>
          );
        })}
      </section>

      <aside className={styles.dailyTasks} aria-label="每日任务列表">
        <div className={styles.panelHeader}>
          <h2>每日任务</h2>
          <Link href="/activity">更多</Link>
        </div>
        <ul className={styles.taskList}>
          {dailyTasks.map(task => {
            const TaskIcon = task.icon;

            return (
              <li key={task.title} className={styles.taskItem}>
                <span className={`${styles.taskIconSlot} ${task.iconTone}`} aria-hidden="true">
                  <TaskIcon size={24} strokeWidth={2.8} />
                </span>
                <div className={styles.taskContent}>
                  <div className={styles.taskTitleRow}>
                    <strong>{task.title}</strong>
                    <span>
                      <span className={styles.rewardIconSlot} aria-hidden="true">
                        <StarIcon size={14} />
                      </span>
                      {task.reward}
                    </span>
                  </div>
                  <div className={styles.taskProgress}>
                    <span style={{ width: getProgressWidth(task.progress) }} />
                  </div>
                  <small>{task.progress}</small>
                </div>
                <button className={styles.taskAction} type="button">
                  {task.action}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <GameChat
        className={styles.chatDock}
        ariaLabel="聊天窗口"
        messages={homeChatMessages}
        currentUserName={playerName}
        currentUserAvatar={playerAvatar}
        placeholder={isHomeChatConnected ? '说点什么...' : '聊天连接中...'}
        onSendMessage={handleSendHomeChatMessage}
        defaultHeight={196}
        minHeight={170}
        maxHeight={340}
      />

      <button className={styles.customizeButton} type="button">
        <span className={styles.actionIconSlot} aria-hidden="true">
          <Palette size={32} strokeWidth={2.5} />
          <Sparkles size={15} strokeWidth={3} />
        </span>
        个性化
      </button>
    </ResponsiveStage>
  );
}
