'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react';
import clsx from 'clsx';
import { Send, SmilePlus } from 'lucide-react';
import defaultAvatar from '@/assets/images/avatars/default-player.png';
import styles from './GameChat.module.css';

export interface GameChatMessage {
  id: string;
  text: string;
  author?: string;
  avatar?: string;
  type?: 'system' | 'player';
}

export interface GameChatProps {
  messages: GameChatMessage[];
  className?: string;
  ariaLabel?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  placeholder?: string;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  onSendMessage?: (message: string) => boolean | void;
}

const emojiOptions = [
  '😀',
  '😄',
  '😂',
  '😍',
  '🥳',
  '👍',
  '🙌',
  '🎲',
  '⭐',
  '🏆',
  '🔥',
  '💙',
  '🚀',
  '🎁',
  '🍀',
  '✨',
];

export function GameChat({
  messages,
  className,
  ariaLabel = '聊天框',
  currentUserName = '乐乐玩家',
  currentUserAvatar,
  placeholder = '点击输入内容...',
  defaultHeight = 196,
  minHeight = 170,
  maxHeight = 430,
  onSendMessage,
}: GameChatProps) {
  const [displayMessages, setDisplayMessages] = useState(messages);
  const [draft, setDraft] = useState('');
  const [chatHeight, setChatHeight] = useState(defaultHeight);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    setDisplayMessages(messages);
  }, [messages]);

  const handleEmojiSelect = (emoji: string) => {
    setDraft(value => `${value}${emoji}`);
    inputRef.current?.focus();
  };

  const handleResizePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: chatHeight,
    };

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      if (!resizeStateRef.current) return;

      const deltaY = resizeStateRef.current.startY - moveEvent.clientY;
      const nextHeight = resizeStateRef.current.startHeight + deltaY;
      setChatHeight(Math.min(maxHeight, Math.max(minHeight, nextHeight)));
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text) return;

    if (onSendMessage?.(text) === false) return;

    setDisplayMessages(value => [
      ...value,
      {
        id: `local-${Date.now()}`,
        type: 'player',
        author: currentUserName,
        avatar: currentUserAvatar || defaultAvatar.src,
        text,
      },
    ]);
    setDraft('');
    setIsEmojiPickerOpen(false);
  };

  return (
    <section
      className={clsx(styles.chatFrame, className)}
      style={{ height: chatHeight } as CSSProperties}
      aria-label={ariaLabel}
    >
      <div className={styles.chatShell}>
        <button
          className={styles.resizeHandle}
          type="button"
          aria-label="拖动调整聊天框高度"
          onPointerDown={handleResizePointerDown}
        >
          <span />
        </button>
        <div className={styles.messages}>
          {displayMessages.map(message => {
            if (message.type === 'system') {
              return (
                <p key={message.id} className={styles.systemMessage}>
                  <span className={styles.systemAuthor}>{message.author ?? '系统消息'}：</span>
                  <span>{message.text}</span>
                </p>
              );
            }

            const avatar = message.avatar || defaultAvatar.src;

            return (
              <div key={message.id} className={styles.playerMessage}>
                <span
                  className={styles.avatar}
                  style={{ backgroundImage: `url(${avatar})` }}
                  aria-label={`${message.author ?? '玩家'}头像`}
                />
                <p>
                  <span className={styles.author}>{message.author ?? '玩家'}：</span>
                  <span className={styles.messageText}>{message.text}</span>
                </p>
              </div>
            );
          })}
        </div>

        <form className={styles.inputRow} onSubmit={handleSendMessage}>
          <div className={styles.emojiWrap}>
            <button
              className={styles.emojiButton}
              type="button"
              aria-label="表情选择"
              aria-expanded={isEmojiPickerOpen}
              onClick={() => setIsEmojiPickerOpen(value => !value)}
            >
              <SmilePlus size={22} strokeWidth={2.6} />
            </button>

            {isEmojiPickerOpen && (
              <div className={styles.emojiPicker} role="listbox" aria-label="表情选择">
                {emojiOptions.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`选择表情 ${emoji}`}
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            value={draft}
            type="text"
            aria-label="聊天内容"
            placeholder={placeholder}
            onChange={event => setDraft(event.target.value)}
          />

          <button className={styles.sendButton} type="submit" aria-label="发送聊天消息">
            <Send size={18} strokeWidth={2.7} />
          </button>
        </form>
      </div>
    </section>
  );
}
