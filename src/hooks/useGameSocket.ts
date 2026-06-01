'use client';

import { useEffect, useRef, useState } from 'react';
import { buildGameWebSocketUrl, parseGameSocketStatusMessage } from '@/modules/game/gameSocket';
import type { GameStatusSnapshot } from '@/types/gameApi';

const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY_MS = 15_000;

interface UseGameSocketOptions {
  gameId: string | null;
  playerId: string | null;
  enabled?: boolean;
  onGameStatus: (status: GameStatusSnapshot) => void;
}

export function useGameSocket({ gameId, playerId, enabled = true, onGameStatus }: UseGameSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const statusHandlerRef = useRef(onGameStatus);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    statusHandlerRef.current = onGameStatus;
  }, [onGameStatus]);

  useEffect(() => {
    if (!enabled || !gameId || !playerId) return undefined;

    shouldReconnectRef.current = true;

    const connect = () => {
      const socketUrl = buildGameWebSocketUrl(gameId, playerId);
      console.info('[Game WebSocket] 正在连接:', socketUrl);
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        console.info('[Game WebSocket] 已连接:', socketUrl);
      };

      socket.onmessage = event => {
        if (typeof event.data !== 'string') return;

        try {
          const message = JSON.parse(event.data) as { type?: unknown };
          if (message.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
            return;
          }
        } catch {
          return;
        }

        const status = parseGameSocketStatusMessage(event.data);
        if (status) statusHandlerRef.current(status);
      };

      socket.onerror = error => {
        console.error('Game WebSocket error', socketUrl, error);
      };

      socket.onclose = event => {
        if (socketRef.current === socket) socketRef.current = null;
        setIsConnected(false);
        console.info('[Game WebSocket] 已关闭:', socketUrl, event.code, event.reason);

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
  }, [enabled, gameId, playerId]);

  return { isConnected };
}
