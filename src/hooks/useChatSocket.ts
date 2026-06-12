'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildChatWebSocketUrl, parseChatSocketMessage } from '@/modules/chat/chatSocket';
import type { ChatSocketChatMessage, ChatSocketSystemMessage } from '@/types/chatSocket';

const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY_MS = 15_000;

interface UseChatSocketOptions {
  channel: string | null;
  playerId: string | null;
  enabled?: boolean;
  onChatMessage?: (message: ChatSocketChatMessage) => void;
  onSystemMessage?: (message: ChatSocketSystemMessage) => void;
  onSocketError?: (message: string) => void;
}

export function useChatSocket({
  channel,
  playerId,
  enabled = true,
  onChatMessage,
  onSystemMessage,
  onSocketError,
}: UseChatSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const handlersRef = useRef({
    onChatMessage,
    onSystemMessage,
    onSocketError,
  });

  useEffect(() => {
    handlersRef.current = {
      onChatMessage,
      onSystemMessage,
      onSocketError,
    };
  }, [onChatMessage, onSocketError, onSystemMessage]);

  useEffect(() => {
    if (!enabled || !channel || !playerId) return undefined;

    let isDisposed = false;
    shouldReconnectRef.current = true;

    const connect = () => {
      if (isDisposed || !shouldReconnectRef.current) return;

      const socketUrl = buildChatWebSocketUrl(channel, playerId);
      console.info('[Chat WebSocket] 正在连接:', socketUrl);
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        console.info('[Chat WebSocket] 已连接:', socketUrl);
      };

      socket.onmessage = event => {
        if (typeof event.data !== 'string') return;

        const message = parseChatSocketMessage(event.data);
        if (!message) return;

        switch (message.type) {
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
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
        console.error('Chat WebSocket error', socketUrl, error);
      };

      socket.onclose = event => {
        if (socketRef.current === socket) socketRef.current = null;
        setIsConnected(false);
        console.info('[Chat WebSocket] 已关闭:', socketUrl, event.code, event.reason);

        if (event.code === 1008) {
          shouldReconnectRef.current = false;
          handlersRef.current.onSocketError?.(event.reason || '聊天连接被拒绝，请稍后重试');
          return;
        }

        if (isDisposed || !shouldReconnectRef.current || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;

        const reconnectAttempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = reconnectAttempt;
        const reconnectDelay = Math.min(1000 * 2 ** (reconnectAttempt - 1), MAX_RECONNECT_DELAY_MS);

        scheduleConnect(reconnectDelay);
      };
    };

    const scheduleConnect = (delay: number) => {
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    scheduleConnect(0);

    return () => {
      isDisposed = true;
      shouldReconnectRef.current = false;
      setIsConnected(false);

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [channel, enabled, playerId]);

  const sendChat = useCallback((message: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    socket.send(JSON.stringify({ type: 'chat', content: { message } }));
    return true;
  }, []);

  return { isConnected, sendChat };
}
