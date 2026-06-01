'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildRoomWebSocketUrl, parseRoomSocketMessage } from '@/modules/room/roomSocket';
import type { Room } from '@/types/room';
import type {
  RoomSocketChatMessage,
  RoomSocketGameStartedMessage,
  RoomSocketPlayerKickedMessage,
  RoomSocketSystemMessage,
} from '@/types/roomSocket';

interface UseRoomSocketOptions {
  roomCode: string | null;
  playerId: string | null;
  enabled?: boolean;
  onRoomUpdated: (room: Room) => void;
  onGameStarted?: (message: RoomSocketGameStartedMessage) => void;
  onPlayerKicked: (message: RoomSocketPlayerKickedMessage) => void;
  onChatMessage?: (message: RoomSocketChatMessage) => void;
  onSystemMessage?: (message: RoomSocketSystemMessage) => void;
  onSocketError?: (message: string) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY_MS = 15_000;

export function useRoomSocket({
  roomCode,
  playerId,
  enabled = true,
  onRoomUpdated,
  onGameStarted,
  onPlayerKicked,
  onChatMessage,
  onSystemMessage,
  onSocketError,
}: UseRoomSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const handlersRef = useRef({
    onRoomUpdated,
    onGameStarted,
    onPlayerKicked,
    onChatMessage,
    onSystemMessage,
    onSocketError,
  });

  useEffect(() => {
    handlersRef.current = {
      onRoomUpdated,
      onGameStarted,
      onPlayerKicked,
      onChatMessage,
      onSystemMessage,
      onSocketError,
    };
  }, [onChatMessage, onGameStarted, onPlayerKicked, onRoomUpdated, onSocketError, onSystemMessage]);

  useEffect(() => {
    if (!enabled || !roomCode || !playerId) return undefined;

    shouldReconnectRef.current = true;

    const connect = () => {
      const socketUrl = buildRoomWebSocketUrl(roomCode, playerId);
      console.info('[Room WebSocket] 正在连接:', socketUrl);
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        console.info('[Room WebSocket] 已连接:', socketUrl);
      };

      socket.onmessage = event => {
        if (typeof event.data !== 'string') return;

        const message = parseRoomSocketMessage(event.data);
        if (!message) return;

        switch (message.type) {
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;
          case 'room_updated':
            handlersRef.current.onRoomUpdated(message.room);
            if (message.gameId) {
              handlersRef.current.onGameStarted?.({
                roomCode: message.room.id,
                gameId: message.gameId,
              });
            }
            break;
          case 'game_started':
            handlersRef.current.onGameStarted?.(message.data);
            break;
          case 'player_kicked':
            shouldReconnectRef.current = false;
            handlersRef.current.onPlayerKicked(message.data);
            socket.close();
            break;
          case 'chat':
            handlersRef.current.onChatMessage?.(message.data);
            break;
          case 'system':
            handlersRef.current.onSystemMessage?.(message.data);
            break;
          case 'error':
            handlersRef.current.onSocketError?.(message.message);
            break;
          case 'pong':
            break;
        }
      };

      socket.onerror = error => {
        console.error('Room WebSocket error', error);
      };

      socket.onclose = event => {
        if (socketRef.current === socket) socketRef.current = null;
        setIsConnected(false);
        console.info('[Room WebSocket] 已关闭:', socketUrl, event.code, event.reason);

        if (event.code === 1008) {
          shouldReconnectRef.current = false;
          handlersRef.current.onSocketError?.(event.reason || '房间连接被拒绝，请返回大厅后重试');
          return;
        }

        if (!shouldReconnectRef.current || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;

        const reconnectAttempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = reconnectAttempt;
        const reconnectDelay = Math.min(1000 * 2 ** (reconnectAttempt - 1), MAX_RECONNECT_DELAY_MS);

        reconnectTimerRef.current = window.setTimeout(connect, reconnectDelay);
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      setIsConnected(false);

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, playerId, roomCode]);

  const sendChat = useCallback((message: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    socket.send(JSON.stringify({ type: 'chat', content: { message } }));
    return true;
  }, []);

  return { isConnected, sendChat };
}
