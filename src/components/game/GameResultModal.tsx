'use client';

import clsx from 'clsx';
import Image, { type StaticImageData } from 'next/image';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Crown,
  Download,
  Home,
  RotateCcw,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import gameoverArt from '@/assets/images/ui/icons/gameover.png';
import yachtArt from '@/assets/images/ui/icons/游艇.png';
import targetArt from '@/assets/images/ui/icons/靶子.png';
import diceArt from '@/assets/images/ui/icons/骰子.png';
import { LoadingImage } from '@/components/ui';
import { mockGameResult, mockPlayerDetail } from '@/mocks/gameResult';
import type {
  GameResultData,
  GameResultPlayer,
  PlayerScoreDetail,
  ResultHighlight,
} from '@/types/gameResult';
import styles from './GameResultModal.module.css';

export interface ScoreDetailProps {
  player: PlayerScoreDetail;
  loading?: boolean;
}

export interface GameResultModalProps {
  open: boolean;
  result?: GameResultData;
  initialSelectedPlayerId?: number;
  loading?: boolean;
  onClose?: () => void;
  onBackLobby?: () => void;
  onReplay?: () => void | Promise<void>;
  onShare?: () => void | Promise<void>;
  onSave?: (autoSave: boolean) => void | Promise<void>;
  backLoading?: boolean;
  replayLoading?: boolean;
  actionError?: string | null;
  allowOverlayDismiss?: boolean;
  showActions?: boolean;
  showAutoSave?: boolean;
  showCloseButton?: boolean;
}

const celebrationColors = ['#7b5cff', '#ffd447', '#49c6ff', '#ff754b', '#7ce66c', '#ff5ea8', '#ffb13b'];

const celebrationPieces = Array.from({ length: 72 }, (_, index) => {
  const isLongStreamer = index % 3 === 0 || index % 7 === 0;
  const swayDirection = index % 2 === 0 ? 1 : -1;
  const left = 2 + ((index * 17) % 96);
  const delay = (index % 18) * 0.055;
  const duration = isLongStreamer ? 4.95 + (index % 5) * 0.08 : 4.35 + (index % 6) * 0.09;

  return {
    left: `${left}%`,
    delay: `${delay.toFixed(2)}s`,
    duration: `${duration.toFixed(2)}s`,
    color: celebrationColors[index % celebrationColors.length],
    width: isLongStreamer ? `${7 + (index % 3)}px` : `${10 + (index % 7)}px`,
    height: isLongStreamer ? `${34 + (index % 6) * 6}px` : `${6 + (index % 4) * 2}px`,
    sway: `${swayDirection * (42 + ((index * 13) % 112))}px`,
    rotate: `${(index * 31) % 130 - 65}deg`,
  };
});

const scoreRows = [
  {
    label: '上层数字区',
    hint: '共6格',
    getScore: (player: PlayerScoreDetail) => `${player.upperScore}分`,
    getBonus: (player: PlayerScoreDetail) => `+${player.bonusScore}分`,
    getTotal: (player: PlayerScoreDetail) => `${player.upperTotal}分`,
  },
  {
    label: '下层组合区',
    hint: '共7格',
    getScore: (player: PlayerScoreDetail) => `${player.lowerScore}分`,
    getBonus: () => '-',
    getTotal: (player: PlayerScoreDetail) => `${player.lowerScore}分`,
  },
  {
    label: '额外奖励',
    hint: '重复快艇奖励',
    getScore: (player: PlayerScoreDetail) => `${player.extraReward}分`,
    getBonus: () => '-',
    getTotal: (player: PlayerScoreDetail) => `${player.extraReward}分`,
  },
  {
    label: '上层达标奖励',
    hint: '上层63分奖励',
    getScore: (player: PlayerScoreDetail) => `${player.extraBonus}分`,
    getBonus: () => '-',
    getTotal: (player: PlayerScoreDetail) => `${player.extraBonus}分`,
  },
];

function getAvatarFallback(player: GameResultPlayer): string {
  if (player.nickname.toLowerCase().includes('ai')) {
    return 'AI';
  }

  return player.nickname.slice(0, 1);
}

function getRankTitle(rank: number): string {
  if (rank === 1) return '冠军';
  if (rank === 2) return '亚军';
  if (rank === 3) return '季军';
  return `第${rank}名`;
}

const highlightIconAssets: Record<ResultHighlight['icon'], { src: StaticImageData; alt: string; className?: string }> = {
  yacht: { src: yachtArt, alt: '快艇', className: styles.yachtImage },
  upperBonus: { src: targetArt, alt: '上半区额外奖励', className: styles.targetImage },
  bestRound: { src: diceArt, alt: '最高单回合', className: styles.diceImage },
  straight: { src: targetArt, alt: '大顺子', className: styles.targetImage },
  fourKind: { src: diceArt, alt: '四条', className: styles.diceImage },
};

function getHighlightIcon(item: ResultHighlight) {
  const asset = highlightIconAssets[item.icon] ?? highlightIconAssets.bestRound;

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={112}
      height={112}
      className={clsx(styles.highlightImage, asset.className)}
      sizes="112px"
    />
  );
}

export function ScoreDetailPanel({ player, loading = false }: ScoreDetailProps) {
  return (
    <section className={styles.detailPanel} aria-label="分数明细">
      <h3>
        <span />
        分数明细
        <span />
      </h3>

      <div className={styles.scoreTable}>
        <div className={styles.tableHeader}>
          <span />
          <strong>上层得分</strong>
          <strong>达标奖励</strong>
          <strong>小计</strong>
        </div>

        {scoreRows.map(row => (
          <div className={styles.tableRow} key={row.label}>
            <div className={styles.tableLabel}>
              <strong>{row.label}</strong>
              <small>({row.hint})</small>
            </div>
            <span>{row.getScore(player)}</span>
            <span>{row.getBonus(player)}</span>
            <strong>{row.getTotal(player)}</strong>
          </div>
        ))}

        <div className={styles.totalRow}>
          <strong>总分</strong>
          <em>{player.totalScore}</em>
          <span>分</span>
        </div>
      </div>

      {loading && (
        <div className={styles.detailLoading} aria-live="polite">
          <LoadingImage size="sm" />
          <span>分数刷新中...</span>
        </div>
      )}
    </section>
  );
}

export function GameResultModal({
  open,
  result,
  initialSelectedPlayerId,
  loading = false,
  onClose,
  onBackLobby,
  onReplay,
  onShare,
  onSave,
  backLoading = false,
  replayLoading = false,
  actionError,
  allowOverlayDismiss = false,
  showActions = true,
  showAutoSave = true,
  showCloseButton = false,
}: GameResultModalProps) {
  const data = result ?? mockGameResult;
  const sortedPlayers = useMemo(
    () =>
      [...data.players]
        .sort((first, second) => second.score - first.score || first.rank - second.rank)
        .map((player, index) => ({ ...player, rank: index + 1 })),
    [data.players]
  );
  const winner = sortedPlayers[0];
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    initialSelectedPlayerId ?? winner?.id ?? 0
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!open || sortedPlayers.length === 0) return;

    const preferredPlayerId = initialSelectedPlayerId ?? sortedPlayers[0].id;
    setSelectedPlayerId(preferredPlayerId);
  }, [initialSelectedPlayerId, open, sortedPlayers]);

  useEffect(() => {
    if (!open) return;

    setDetailLoading(true);
    const timer = window.setTimeout(() => {
      setDetailLoading(false);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [open, selectedPlayerId]);

  useEffect(() => {
    if (!open) {
      setShowCelebration(false);
      return;
    }

    setShowCelebration(true);
    const timer = window.setTimeout(() => {
      setShowCelebration(false);
    }, 5200);

    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open || !winner) {
    return null;
  }

  const selectedPlayer =
    sortedPlayers.find(player => player.id === selectedPlayerId) ?? sortedPlayers[0];
  const selectedDetail = data.playerDetails[selectedPlayer.id] ?? mockPlayerDetail;
  const selectedHighlights = data.playerHighlights?.[selectedPlayer.id] ?? data.highlights;
  const canDismiss = Boolean((showCloseButton || allowOverlayDismiss) && onClose);
  const showFooter = showActions || showAutoSave;

  async function handleSave() {
    setSaving(true);

    try {
      await onSave?.(autoSave);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={canDismiss ? onClose : undefined}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-result-title"
        onClick={event => event.stopPropagation()}
      >
        {showCloseButton && onClose && (
          <button className={styles.closeButton} type="button" aria-label="关闭结算弹窗" onClick={onClose}>
            <X size={34} strokeWidth={3.2} />
          </button>
        )}

        <header className={styles.header}>
          <Image
            src={gameoverArt}
            alt=""
            priority
            width={790}
            height={527}
            className={styles.gameoverArt}
            sizes="790px"
          />
          <h2 id="game-result-title" className={styles.srOnly}>
            游戏结束
          </h2>
          <p className={styles.srOnly}>本局游戏已结束，以下是最终结算结果</p>
        </header>

        <div className={styles.championBanner}>
          <span>
            <Crown size={26} fill="currentColor" />
          </span>
          <small>本局冠军</small>
          <strong>{winner.nickname}</strong>
          <em>{winner.score}分</em>
        </div>

        <div className={styles.content}>
          <section className={styles.rankPanel} aria-label="最终排名">
            <h3>
              <span />
              最终排名
              <span />
            </h3>

            <div className={styles.playerList}>
              {sortedPlayers.map(player => {
                const selected = player.id === selectedPlayer.id;
                const avatarStyle = player.avatar
                  ? ({ backgroundImage: `url(${player.avatar})` } as CSSProperties)
                  : undefined;

                return (
                  <button
                    className={clsx(
                      styles.playerItem,
                      styles[`rank${player.rank}`],
                      selected && styles.selectedPlayer
                    )}
                    type="button"
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    aria-pressed={selected}
                  >
                    <span className={styles.rankMedal}>
                      {player.rank === 1 && <Crown size={28} fill="currentColor" />}
                      <b>{player.rank}</b>
                    </span>
                    <span
                      className={clsx(styles.resultAvatar, player.avatar && styles.avatarImage)}
                      style={avatarStyle}
                    >
                      {!player.avatar && getAvatarFallback(player)}
                    </span>
                    <span className={styles.playerMeta}>
                      <strong>{player.nickname}</strong>
                      <small>{getRankTitle(player.rank)}</small>
                    </span>
                    {player.isOwner && <em>房主</em>}
                    <span className={styles.playerScoreValue}>{player.score}分</span>
                  </button>
                );
              })}
            </div>
          </section>

          <ScoreDetailPanel key={selectedPlayer.id} player={selectedDetail} loading={loading || detailLoading} />
        </div>

        <section className={styles.highlightPanel} aria-label="本局精彩回顾">
          <h3>
            <span />
            本局精彩回顾
            <span />
          </h3>
          <div className={styles.highlightList}>
            {selectedHighlights.map(item => (
              <article className={styles.highlightItem} key={item.id}>
                <span className={styles.highlightIcon}>{getHighlightIcon(item)}</span>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    <em>{item.icon === 'upperBonus' && item.value > 0 ? `+${item.value}` : item.value}</em>
                    {item.unit}
                  </p>
                  {item.status && <small className={styles.highlightStatus}>{item.status}</small>}
                </div>
              </article>
            ))}
          </div>
        </section>

        {showFooter && (
          <footer className={styles.footer}>
            {showActions && (
              <div className={styles.actionRow}>
                <button
                  className={clsx(styles.actionButton, styles.blueButton)}
                  type="button"
                  onClick={onBackLobby}
                  disabled={backLoading}
                >
                  <Home size={34} fill="currentColor" />
                  {backLoading ? '返回中' : '返回大厅'}
                </button>
                <button
                  className={clsx(styles.actionButton, styles.blueButton)}
                  type="button"
                  onClick={onReplay}
                  disabled={replayLoading}
                >
                  <RotateCcw size={34} />
                  {replayLoading ? '创建中' : '再来一局'}
                </button>
                <button className={clsx(styles.actionButton, styles.goldButton)} type="button" onClick={onShare}>
                  <Share2 size={34} />
                  分享战绩
                </button>
                <button
                  className={clsx(styles.actionButton, styles.greenButton)}
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Download size={34} />
                  {saving ? '保存中' : '保存战绩'}
                </button>
              </div>
            )}

            {actionError && <p className={styles.actionError}>{actionError}</p>}

            {showAutoSave && (
              <label className={styles.autoSave}>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={event => setAutoSave(event.target.checked)}
                />
                <span>
                  <Check size={22} strokeWidth={3.2} />
                </span>
                自动保存本局战绩（可在历史记录中查看）
              </label>
            )}
          </footer>
        )}

        <Sparkles className={styles.sparkleTop} size={28} fill="currentColor" />
        <Sparkles className={styles.sparkleBottom} size={22} fill="currentColor" />
        {showCelebration && (
          <div className={styles.celebrationLayer} aria-hidden="true">
            {celebrationPieces.map((piece, index) => (
              <span
                className={styles.celebrationPiece}
                key={`${piece.left}-${index}`}
                style={
                  {
                    '--confetti-left': piece.left,
                    '--confetti-delay': piece.delay,
                    '--confetti-duration': piece.duration,
                    '--confetti-color': piece.color,
                    '--confetti-width': piece.width,
                    '--confetti-height': piece.height,
                    '--confetti-sway': piece.sway,
                    '--confetti-rotate': piece.rotate,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
