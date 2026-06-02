'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Plus, Settings, UserPlus, X } from 'lucide-react';
import { ResponsiveStage } from '@/components/layout';
import { GameChat, SoundToggle, StarIcon, type GameChatMessage } from '@/components/ui';
import roomBackground from '@/assets/images/backgrounds/room/room-bg.png';
import defaultAvatar from '@/assets/images/avatars/default-player.png';
import { useHomeSoundSetting, useRoomSocket } from '@/hooks';
import { getOnlineRoom, startOnlineRoom } from '@/modules/room/roomApi';
import { usePlayerStore, useRoomStore } from '@/stores';
import type { Room, RoomMember } from '@/types/room';
import type {
  RoomSocketChatMessage,
  RoomSocketGameStartedMessage,
  RoomSocketPlayerKickedMessage,
  RoomSocketSystemMessage,
} from '@/types/roomSocket';
import styles from './room.module.css';

const ROOM_SLOT_COUNT = 4;
const ROOM_FALLBACK_SYNC_INTERVAL_MS = 20_000;
const ROOM_CHAT_MESSAGE_LIMIT = 80;

const avatarTones = [
  styles.avatarBlue,
  styles.avatarGreen,
  styles.avatarOrange,
  styles.avatarPurple,
  styles.avatarPink,
  styles.avatarCyan,
];

const getMemberAvatar = (avatar?: string) => avatar || defaultAvatar.src;

export default function RoomPage() {
  const router = useRouter();
  const player = usePlayerStore(state => state.player);
  const soundSettingFallback = usePlayerStore(state => state.settings.soundEnabled);
  const currentRoom = useRoomStore(state => state.currentRoom);
  const isHost = useRoomStore(state => state.isHost);
  const currentPlayerId = useRoomStore(state => state.currentPlayerId);
  const startGame = useRoomStore(state => state.startGame);
  const leaveRoom = useRoomStore(state => state.leaveRoom);
  const restoreCurrentRoom = useRoomStore(state => state.restoreCurrentRoom);
  const setCurrentRoom = useRoomStore(state => state.setCurrentRoom);
  const toggleReady = useRoomStore(state => state.toggleReady);
  const kickPlayer = useRoomStore(state => state.kickPlayer);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [isUpdatingReady, setIsUpdatingReady] = useState(false);
  const [kickingPlayerId, setKickingPlayerId] = useState<string | null>(null);
  const [gameCreateError, setGameCreateError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<GameChatMessage[]>([]);

  const roomId = currentRoom?.id ?? '等待接口返回';
  const { soundEnabled: isSoundEnabled, setSoundEnabled: setIsSoundEnabled } = useHomeSoundSetting(
    player?.id,
    soundSettingFallback
  );
  const members = useMemo(() => currentRoom?.members ?? [], [currentRoom?.members]);
  const orderedMembers = useMemo(() => {
    const hostMember = members.find(member => member.isHost) ?? members[0];
    const otherMembers = members.filter(member => member.playerId !== hostMember?.playerId);

    return [hostMember, ...otherMembers].filter(Boolean).slice(0, ROOM_SLOT_COUNT) as RoomMember[];
  }, [members]);
  const roomSlots = useMemo(
    () => Array.from({ length: ROOM_SLOT_COUNT }, (_, index) => orderedMembers[index] ?? null),
    [orderedMembers]
  );
  const currentPlayerMember = members.find(member => member.playerId === currentPlayerId);
  const isCurrentPlayerReady = Boolean(currentPlayerMember?.isReady);

  const appendChatMessage = useCallback((message: GameChatMessage) => {
    setChatMessages(currentMessages => [...currentMessages, message].slice(-ROOM_CHAT_MESSAGE_LIMIT));
  }, []);

  const handleSocketRoomUpdated = useCallback(
    (room: Room) => {
      if (room.id !== currentRoom?.id) return;

      setCurrentRoom(room, currentPlayerId);
    },
    [currentPlayerId, currentRoom?.id, setCurrentRoom]
  );

  const handleSocketPlayerKicked = useCallback(
    (message: RoomSocketPlayerKickedMessage) => {
      if (message.playerId && message.playerId !== currentPlayerId) return;

      setCurrentRoom(null);
      router.replace('/');
    },
    [currentPlayerId, router, setCurrentRoom]
  );

  const handleSocketGameStarted = useCallback(
    (message: RoomSocketGameStartedMessage) => {
      if (!currentPlayerId || (message.roomCode && message.roomCode !== currentRoom?.id)) return;

      const params = new URLSearchParams({
        mode: 'online',
        roomId: currentRoom?.id ?? message.roomCode,
        gameId: message.gameId,
        playerId: currentPlayerId,
      });

      router.replace(`/game?${params.toString()}`);
    },
    [currentPlayerId, currentRoom?.id, router]
  );

  const handleSocketChatMessage = useCallback(
    (message: RoomSocketChatMessage) => {
      appendChatMessage({
        id: `room-chat-${message.timestamp}-${message.playerId}`,
        type: 'player',
        author: message.playerName,
        avatar: members.find(member => member.playerId === message.playerId)?.avatar,
        text: message.message,
      });
    },
    [appendChatMessage, members]
  );

  const handleSocketSystemMessage = useCallback(
    (message: RoomSocketSystemMessage) => {
      const text =
        message.action === 'player_joined'
          ? `${message.playerName} 加入了房间`
          : message.action === 'player_left'
            ? `${message.playerName} 离开了房间`
            : null;

      if (!text) return;

      appendChatMessage({
        id: `room-system-${message.timestamp}-${message.action}-${message.playerId}`,
        type: 'system',
        text,
      });
    },
    [appendChatMessage]
  );

  const handleSocketError = useCallback((message: string) => {
    setGameCreateError(message);
  }, []);

  const { isConnected: isRoomSocketConnected, sendChat } = useRoomSocket({
    roomCode: currentRoom?.id ?? null,
    playerId: currentPlayerId || null,
    enabled: Boolean(currentRoom?.id && currentPlayerId),
    onRoomUpdated: handleSocketRoomUpdated,
    onGameStarted: handleSocketGameStarted,
    onPlayerKicked: handleSocketPlayerKicked,
    onChatMessage: handleSocketChatMessage,
    onSystemMessage: handleSocketSystemMessage,
    onSocketError: handleSocketError,
  });

  const handleSendChatMessage = useCallback(
    (message: string) => {
      const isSent = sendChat(message);

      if (!isSent) {
        setGameCreateError('房间实时连接恢复中，请稍后再试');
      }

      return isSent;
    },
    [sendChat]
  );

  useEffect(() => {
    if (currentRoom?.id && currentPlayerId) return;

    if (!player) {
      router.replace('/login?mode=login&reason=auth-required');
      return;
    }

    let isCancelled = false;

    const restoreRoom = async () => {
      try {
        const room = await restoreCurrentRoom();
        if (!isCancelled && !room) router.replace('/');
      } catch (error) {
        if (!isCancelled) {
          setGameCreateError(error instanceof Error ? error.message : '恢复房间状态失败，请稍后再试');
        }
      }
    };

    void restoreRoom();

    return () => {
      isCancelled = true;
    };
  }, [currentPlayerId, currentRoom?.id, player, restoreCurrentRoom, router]);

  useEffect(() => {
    if (!currentRoom?.id || !currentPlayerId) return;

    let isCancelled = false;
    let syncTimer: number | null = null;
    let isSyncing = false;

    const syncRoom = async () => {
      if (document.visibilityState === 'hidden' || isSyncing) return;

      isSyncing = true;

      try {
        const room = await getOnlineRoom(currentRoom.id);
        if (!isCancelled) setCurrentRoom(room, currentPlayerId);
      } catch (error) {
        if (isCancelled) return;

        console.error(error);
      } finally {
        isSyncing = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncRoom();
    };

    void syncRoom();
    syncTimer = window.setInterval(() => {
      void syncRoom();
    }, ROOM_FALLBACK_SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (syncTimer) window.clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPlayerId, currentRoom?.id, isRoomSocketConnected, setCurrentRoom]);

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard?.writeText(roomId);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1400);
    } catch {
      setIsCopied(false);
    }
  };

  const handleStartGame = async () => {
    if (!isHost || !currentRoom || isCreatingGame) return;

    const canStartRoomGame =
      currentRoom.members.length >= 2 && currentRoom.members.every(member => member.isHost || member.isReady);
    if (!canStartRoomGame) return;

    setIsCreatingGame(true);
    setGameCreateError(null);

    try {
      const game = await startOnlineRoom(roomId);
      const canStart = startGame();
      if (!canStart) return;

      const params = new URLSearchParams({
        mode: 'online',
        roomId,
        gameId: game.gameId,
        playerId: currentPlayerId,
      });

      router.push(`/game?${params.toString()}`);
    } catch (error) {
      setGameCreateError(error instanceof Error ? error.message : '游戏创建失败，请稍后再试');
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (isLeavingRoom) return;

    setIsLeavingRoom(true);
    setGameCreateError(null);
    try {
      await leaveRoom();
      router.push('/');
    } catch (error) {
      setGameCreateError(error instanceof Error ? error.message : '房间操作失败，请稍后再试');
      setIsLeavingRoom(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!isHost || !currentRoom || kickingPlayerId) return;

    setKickingPlayerId(playerId);
    setGameCreateError(null);

    try {
      await kickPlayer(playerId);
    } catch (error) {
      setGameCreateError(error instanceof Error ? error.message : '移除玩家失败，请稍后再试');
    } finally {
      setKickingPlayerId(null);
    }
  };

  const handleReadyToggle = async () => {
    if (isHost || isUpdatingReady) return;

    setIsUpdatingReady(true);
    setGameCreateError(null);

    try {
      await toggleReady();
    } catch (error) {
      setGameCreateError(error instanceof Error ? error.message : '更新准备状态失败，请稍后再试');
    } finally {
      setIsUpdatingReady(false);
    }
  };

  return (
    <ResponsiveStage
      className={styles.roomPage}
      viewportClassName={styles.roomViewport}
      stageClassName={styles.roomStage}
      backgroundImage={roomBackground.src}
    >
      <header className={styles.roomHeader}>
        <section className={styles.headerLeft} aria-label="房间导航">
          <Link href="/" className={styles.logoArea}>
            <span className={styles.logoIconSlot}>🎲</span>
            <span className={styles.logoText}>
              投骰乐园
              <small>DICE PARADISE</small>
            </span>
          </Link>
        </section>

        <section className={styles.headerRight} aria-label="房间工具栏">
          <SoundToggle
            checked={isSoundEnabled}
            onChange={setIsSoundEnabled}
            ariaLabel={isSoundEnabled ? '关闭音效' : '开启音效'}
          />
          <button className={`${styles.toolButton} ${styles.settingsButton}`} type="button" aria-label="设置">
            <Settings size={24} />
          </button>
          <button className={styles.dismissButton} type="button" onClick={() => void handleLeaveRoom()} disabled={isLeavingRoom}>
            {isLeavingRoom ? '退出中' : isHost ? '解散房间' : '退出房间'}
          </button>
        </section>
      </header>

      <section className={styles.roomNumberBadge} aria-label="房间号">
        <span>房间号：{roomId}</span>
        <button className={styles.copyButton} type="button" onClick={handleCopyRoomId} aria-label="复制房间号">
          <Copy size={20} strokeWidth={2.8} />
        </button>
        {isCopied && <em>已复制</em>}
      </section>

      <section className={styles.roomTableArea} aria-label="房间桌面区域">
        <div className={styles.tableDiceSlot} aria-label="桌面骰子预留位置" />
        <div className={styles.tableHelmSlot} aria-label="桌面舵轮预留位置" />
      </section>

      <section className={styles.playerCards} aria-label="玩家卡片">
        {roomSlots.map((member, index) => {
          const isEmptySlot = !member;
          const statusLabel = member?.isHost ? '房主' : member?.isReady ? '已准备' : '未准备';
          const points = member?.points ?? (12600 - index * 1360);

          return (
            <article
              key={member?.playerId ?? `empty-room-slot-${index}`}
              className={`${styles.playerCard} ${isEmptySlot ? styles.emptyPlayerCard : styles.occupiedPlayerCard}`}
            >
              {member && isHost && !member.isHost && (
                <button
                  className={styles.removePlayerButton}
                  type="button"
                  onClick={() => void handleRemovePlayer(member.playerId)}
                  disabled={Boolean(kickingPlayerId)}
                  aria-label={`移除 ${member.name}`}
                >
                  <X size={18} strokeWidth={3} />
                  移除玩家
                </button>
              )}

              {isEmptySlot ? (
                <>
                  <span className={styles.slotIcon} aria-hidden="true">
                    <UserPlus size={28} strokeWidth={2.6} />
                  </span>
                  <div className={styles.emptySlotContent}>
                    <Plus size={86} strokeWidth={4.2} />
                  </div>
                </>
              ) : (
                <>
                  <div className={`${styles.avatarFrame} ${avatarTones[index % avatarTones.length]}`}>
                    <span
                      className={styles.avatarSlot}
                      aria-label={`${member.name} 头像`}
                      style={{ backgroundImage: `url(${getMemberAvatar(member.avatar)})` }}
                    />
                  </div>
                  <div className={styles.playerContent}>
                    <div className={styles.playerNameRow}>
                      <h2>{member.name}</h2>
                      <span
                        className={`${styles.statusBadge} ${
                          member.isHost ? styles.hostBadge : member.isReady ? styles.readyBadge : styles.waitingBadge
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className={styles.starRow}>
                      <StarIcon size={28} />
                      <strong>{points.toLocaleString()}</strong>
                    </div>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </section>

      <section className={styles.hostPrompt} aria-label="房主开始游戏提示">
        <div className={styles.promptText}>
          <strong>{isHost ? '房主可以开始游戏' : isCurrentPlayerReady ? '你已准备，等待房主开始' : '点击准备加入对局'}</strong>
          <p>
            当前 <span>{members.length}</span> 人在房间中
          </p>
        </div>
        {isHost ? (
          <button className={styles.startGameButton} type="button" disabled={isCreatingGame} onClick={handleStartGame}>
            {isCreatingGame ? '创建中' : '开始游戏'}
          </button>
        ) : (
          <button
            className={`${styles.startGameButton} ${styles.readyActionButton} ${
              isCurrentPlayerReady ? styles.readyActionButtonActive : ''
            }`}
            type="button"
            disabled={isUpdatingReady}
            onClick={() => void handleReadyToggle()}
          >
            {isUpdatingReady ? '更新中' : isCurrentPlayerReady ? '已准备' : '准备'}
          </button>
        )}
        {gameCreateError && <p className={styles.roomGameError}>{gameCreateError}</p>}
      </section>

      <GameChat
        key={roomId}
        className={styles.chatPanel}
        ariaLabel="房间聊天框"
        messages={chatMessages}
        currentUserName={currentPlayerMember?.name ?? members[0]?.name ?? '乐乐玩家'}
        currentUserAvatar={getMemberAvatar(currentPlayerMember?.avatar ?? members[0]?.avatar)}
        onSendMessage={handleSendChatMessage}
        defaultHeight={306}
        minHeight={220}
        maxHeight={430}
      />
    </ResponsiveStage>
  );
}
