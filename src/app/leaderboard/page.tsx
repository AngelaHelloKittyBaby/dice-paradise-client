'use client';

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Gem, Target, Trophy } from 'lucide-react';
import board1Background from '@/assets/images/ui/panels/leaderboard-card-1.png';
import board2Background from '@/assets/images/ui/panels/leaderboard-card-2.png';
import board3Background from '@/assets/images/ui/panels/leaderboard-card-3.png';
import board4Background from '@/assets/images/ui/panels/leaderboard-card-4.png';
import diceIconImage from '@/assets/images/ui/icons/骰子.png';
import leaderboardBackground from '@/assets/images/backgrounds/leaderboard/leaderboard-bg.png';
import { IslandTopNav, ResponsiveStage } from '@/components/layout';
import { StarIcon } from '@/components/ui';
import {
  useLeaderboardExperienceRanking,
  useLeaderboardHighestScoreRanking,
  useLeaderboardWinRateRanking,
  useLeaderboardWinStreakRanking,
} from '@/hooks';
import { usePlayerStore } from '@/stores';
import type { LeaderboardItemBaseData } from '@/types/leaderboardApi';

type LeaderboardType = 'highestScore' | 'experience' | 'winStreak' | 'winRate';

interface LeaderboardMenuItem {
  type: LeaderboardType;
  label: string;
  icon?: LucideIcon;
  imageIcon?: StaticImageData;
  imageIconClassName?: string;
  activeIconColor: string;
  iconColor: string;
}

interface StatCard {
  type: LeaderboardType;
  title: string;
  value: string;
  backgroundImage: string;
}

interface LeaderboardRow {
  rank: number | string;
  userId?: number;
  avatar: string;
  avatarImage?: string | null;
  avatarTone: string;
  name: string;
  vip?: string;
  metricValue: string;
  time: string;
  exp: string;
}

interface LeaderboardBoard {
  type: LeaderboardType;
  title: string;
  metricLabel: string;
  statValue: string;
  rows: LeaderboardRow[];
  myRanking: LeaderboardRow;
}

const leaderboardMenus: LeaderboardMenuItem[] = [
  {
    type: 'highestScore',
    label: '历史最高得分排行榜',
    icon: Trophy,
    activeIconColor: 'text-[#f49a00]',
    iconColor: 'text-[#ffcf58]',
  },
  {
    type: 'experience',
    label: '投骰经验值排行榜',
    imageIcon: diceIconImage,
    imageIconClassName: 'h-[50px] w-[50px] -ml-2 -mr-1 scale-125 object-contain',
    activeIconColor: 'text-[#256bff]',
    iconColor: 'text-[#70c6ff]',
  },
  {
    type: 'winStreak',
    label: '最高连胜局数排行榜',
    icon: Trophy,
    activeIconColor: 'text-[#26b858]',
    iconColor: 'text-[#92f7a6]',
  },
  {
    type: 'winRate',
    label: '胜率排行榜',
    icon: Target,
    activeIconColor: 'text-[#a33bff]',
    iconColor: 'text-[#f1a3ff]',
  },
];

const statCards: Omit<StatCard, 'value'>[] = [
  {
    type: 'highestScore',
    title: '历史最高得分\n排行榜',
    backgroundImage: board1Background.src,
  },
  {
    type: 'experience',
    title: '投骰经验值\n排行榜',
    backgroundImage: board2Background.src,
  },
  {
    type: 'winStreak',
    title: '最高连胜局数\n排行榜',
    backgroundImage: board3Background.src,
  },
  {
    type: 'winRate',
    title: '胜率\n排行榜',
    backgroundImage: board4Background.src,
  },
];

const basePlayers = [
  { avatar: '乐', avatarTone: 'from-[#e8f7ff] to-[#56a7ff]', name: '乐乐玩家', vip: 'VIP4' },
  { avatar: '骰', avatarTone: 'from-[#fff4d8] to-[#f19b33]', name: '骰子小达人', vip: 'VIP3' },
  { avatar: 'AI', avatarTone: 'from-[#dff8ff] to-[#2a8dff]', name: 'AI 机器人', vip: 'VIP3' },
  { avatar: '海', avatarTone: 'from-[#ffffff] to-[#6f8fb5]', name: '海洋之心', vip: 'VIP2' },
  { avatar: '风', avatarTone: 'from-[#ffd9a5] to-[#8b4c20]', name: '自由的风', vip: 'VIP2' },
  { avatar: '星', avatarTone: 'from-[#ffd7eb] to-[#ff6f91]', name: '幸运星', vip: 'VIP1' },
  { avatar: '阳', avatarTone: 'from-[#fff28a] to-[#ffb72e]', name: '阳光男孩', vip: 'VIP1' },
  { avatar: '游', avatarTone: 'from-[#bfe9ff] to-[#3197ff]', name: '漫游者' },
];

const LEADERBOARD_VISIBLE_ROW_COUNT = 8;
const LEADERBOARD_LOOKUP_LIMIT = 100;

function formatNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '-';
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';

  return `${Number.isInteger(value) ? value.toString() : value.toFixed(1)}%`;
}

function formatAchieveTime(value: string | null | undefined) {
  if (!value) return '-';

  return value.replace('T', ' ').slice(0, 16);
}

function getPlayerName(item: LeaderboardItemBaseData) {
  return item.nickname?.trim() || `玩家${item.user_id}`;
}

function getAvatarText(name: string) {
  return name.trim().slice(0, 2) || 'P';
}

function getCurrentUserId(playerId?: string | null) {
  if (!playerId) return null;

  const numericId = Number(playerId);
  return Number.isInteger(numericId) ? numericId : null;
}

function createApiRow<TItem extends LeaderboardItemBaseData>(
  item: TItem,
  index: number,
  getMetricText: (item: TItem) => string,
  getExperienceValue?: (item: TItem) => number | null | undefined,
  getTimeValue?: (item: TItem) => string | null | undefined
): LeaderboardRow {
  const name = getPlayerName(item);

  return {
    rank: item.rank,
    userId: item.user_id,
    avatar: getAvatarText(name),
    avatarImage: item.avatar,
    avatarTone: basePlayers[index % basePlayers.length].avatarTone,
    name,
    metricValue: getMetricText(item),
    time: formatAchieveTime(getTimeValue?.(item) ?? item.achieve_time),
    exp: formatNumber(getExperienceValue?.(item)),
  };
}

function createEmptyBoard(
  type: LeaderboardType,
  title: string,
  metricLabel: string,
  currentPlayer?: { id: string; name: string } | null
): LeaderboardBoard {
  const currentUserId = getCurrentUserId(currentPlayer?.id);

  return {
    type,
    title,
    metricLabel,
    statValue: '0',
    rows: [],
    myRanking: {
      rank: '--',
      userId: currentUserId ?? undefined,
      avatar: getAvatarText(currentPlayer?.name ?? '玩家'),
      avatarTone: basePlayers[0].avatarTone,
      name: currentPlayer?.name ?? '未登录玩家',
      metricValue: '-',
      time: '-',
      exp: '-',
    },
  };
}

function createApiBoard<TItem extends LeaderboardItemBaseData>(
  type: LeaderboardType,
  title: string,
  metricLabel: string,
  ranking: { leaderboard: TItem[] },
  currentPlayer: { id: string; name: string } | null | undefined,
  getMetricText: (item: TItem) => string,
  getExperienceValue?: (item: TItem) => number | null | undefined,
  getTimeValue?: (item: TItem) => string | null | undefined
): LeaderboardBoard {
  const seenUserIds = new Set<number>();
  const allRows = ranking.leaderboard
    .filter(item => {
      if (seenUserIds.has(item.user_id)) return false;
      seenUserIds.add(item.user_id);
      return true;
    })
    .map((item, index) =>
      createApiRow({ ...item, rank: index + 1 }, index, getMetricText, getExperienceValue, getTimeValue)
    );
  const rows = allRows.slice(0, LEADERBOARD_VISIBLE_ROW_COUNT);
  const currentUserId = getCurrentUserId(currentPlayer?.id);
  const myRanking = allRows.find(row => currentUserId !== null && row.userId === currentUserId) ??
    createEmptyBoard(type, title, metricLabel, currentPlayer).myRanking;

  return {
    type,
    title,
    metricLabel,
    statValue: rows[0]?.metricValue ?? '0',
    rows,
    myRanking,
  };
}

const tableGridClass = 'grid grid-cols-[140px_390px_290px_290px_210px] items-center';
const hoverLift =
  'transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_24px_48px_rgba(34,122,255,0.36),0_0_28px_rgba(89,185,255,0.35)]';
const leaderboardBackdropClass =
  'bg-[radial-gradient(circle_at_78%_26%,rgba(77,174,255,0.18),transparent_32%),linear-gradient(180deg,rgba(12,92,255,0.18)_0%,rgba(2,14,88,0.28)_100%)]';
const leaderboardTableSurfaceClass =
  'bg-[linear-gradient(180deg,#f7fbff_0%,#edf6ff_48%,#e9f3ff_100%)]';

function AvatarBubble({
  avatar,
  tone,
  imageUrl,
  size = 'large',
}: {
  avatar: string;
  tone: string;
  imageUrl?: string | null;
  size?: 'large' | 'small';
}) {
  const sizeClass = size === 'large' ? 'h-[58px] w-[58px] text-[24px]' : 'h-[46px] w-[46px] text-[18px]';
  const imageStyle = imageUrl ? ({ backgroundImage: `url(${imageUrl})` } as CSSProperties) : undefined;

  return (
    <span
      className={`grid ${sizeClass} place-items-center overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br ${tone} bg-cover bg-center font-black shadow-[0_8px_16px_rgba(0,48,140,0.24),inset_0_2px_8px_rgba(255,255,255,0.54)]`}
      style={imageStyle}
      aria-hidden="true"
    >
      {!imageUrl && avatar}
    </span>
  );
}

function VipBadge({ vip }: { vip?: string }) {
  if (!vip) return null;

  const vipClass =
    vip === 'VIP4'
      ? 'from-[#ff9c2d] to-[#ff5b1c]'
      : vip === 'VIP3'
        ? 'from-[#9f68ff] to-[#6d3eea]'
        : vip === 'VIP2'
          ? 'from-[#a56cff] to-[#7f3eea]'
          : 'from-[#5cd95c] to-[#20a835]';

  return (
    <span
      className={`rounded-full bg-gradient-to-r ${vipClass} px-3 py-1 text-[15px] font-black leading-none text-white shadow-[0_5px_10px_rgba(32,66,160,0.22)]`}
    >
      {vip}
    </span>
  );
}

function GemValue({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="grid h-[27px] w-[27px] place-items-center rounded-[9px] bg-gradient-to-br from-[#89dcff] via-[#266bff] to-[#1239d6] text-white shadow-[0_5px_10px_rgba(23,91,218,0.35),inset_0_2px_5px_rgba(255,255,255,0.42)]">
        <Gem size={16} strokeWidth={3} />
      </span>
      <span>{value}</span>
    </span>
  );
}

function StarValue({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <StarIcon size={34} />
      <span>{value}</span>
    </span>
  );
}

function StatCardView({
  card,
  active,
  onClick,
}: {
  card: StatCard;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-leaderboard-card={card.type}
      onClick={onClick}
      className={`relative h-[188px] overflow-hidden rounded-[18px] border bg-cover bg-center text-left text-white shadow-[0_18px_36px_rgba(0,49,160,0.34),inset_0_2px_8px_rgba(255,255,255,0.28)] ${hoverLift} ${
        active ? 'border-white/90 ring-4 ring-white/22' : 'border-white/45'
      }`}
      style={{ backgroundImage: `url(${card.backgroundImage})` }}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/0 to-black/16" />
      <span className="absolute left-[142px] top-[34px] whitespace-pre-line text-[27px] font-black leading-[1.28] text-[#161c35] drop-shadow-[0_2px_0_rgba(255,255,255,0.4)]">
        {card.title}
      </span>
      <GemValue
        value={card.value}
        className="absolute bottom-[30px] left-[148px] rounded-full bg-black/22 px-4 py-2 text-[21px] font-black text-white shadow-[inset_0_1px_5px_rgba(255,255,255,0.18)]"
      />
    </button>
  );
}

function MenuItemView({
  item,
  active,
  onClick,
}: {
  item: LeaderboardMenuItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      data-leaderboard-menu={item.type}
      onClick={onClick}
      className={`relative flex h-[88px] w-full items-center gap-6 px-7 text-left text-[22px] font-black transition-all duration-300 hover:-translate-y-[3px] ${
        active
          ? 'rounded-[14px] bg-gradient-to-r from-[#fff2a5] via-[#ffd45e] to-[#ffb432] text-[#744100] shadow-[0_12px_24px_rgba(173,96,7,0.28),inset_0_2px_8px_rgba(255,255,255,0.58)]'
          : 'rounded-[14px] text-white hover:bg-white/12 hover:shadow-[0_18px_36px_rgba(34,122,255,0.28),0_0_20px_rgba(89,185,255,0.24)]'
      }`}
    >
      {active && (
        <span className="absolute -right-5 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[18px] border-l-[20px] border-y-transparent border-l-[#ffcb45]" />
      )}
      {item.imageIcon ? (
        <Image
          src={item.imageIcon}
          alt=""
          width={64}
          height={64}
          className={`${item.imageIconClassName ?? 'h-[42px] w-[42px] object-contain'} drop-shadow-[0_8px_10px_rgba(0,36,120,0.34)] ${
            active ? 'brightness-110 saturate-110' : ''
          }`}
          sizes="64px"
        />
      ) : (
        Icon && (
          <Icon
            size={38}
            strokeWidth={2.8}
            className={active ? item.activeIconColor : `${item.iconColor} drop-shadow-[0_5px_8px_rgba(0,36,120,0.3)]`}
            fill={active ? 'rgba(255, 176, 33, 0.38)' : 'transparent'}
          />
        )
      )}
      <span>{item.label}</span>
    </button>
  );
}

function RankBadge({ rank }: { rank: number | string }) {
  if (typeof rank === 'number' && rank <= 3) {
    const medalClass =
      rank === 1
        ? 'from-[#fff4a6] via-[#ffbd26] to-[#f28118] text-[#9a4b00]'
        : rank === 2
          ? 'from-[#ffffff] via-[#d8e0ef] to-[#8c98ad] text-[#596071]'
          : 'from-[#ffe3b7] via-[#e9802e] to-[#b94a16] text-[#8f3505]';

    return (
      <span
        className={`relative grid h-[46px] w-[46px] place-items-center rounded-full border-2 border-white/75 bg-gradient-to-br ${medalClass} text-[24px] font-black shadow-[0_8px_14px_rgba(88,64,16,0.24),inset_0_2px_6px_rgba(255,255,255,0.62)]`}
      >
        <span className="absolute -left-2 top-2 h-5 w-4 rotate-[-24deg] rounded-full bg-inherit opacity-80" />
        <span className="absolute -right-2 top-2 h-5 w-4 rotate-[24deg] rounded-full bg-inherit opacity-80" />
        {rank}
      </span>
    );
  }

  return <span className="text-[25px] font-black text-[#001ec7]">{rank}</span>;
}

function PlayerIdentity({ row }: { row: LeaderboardRow }) {
  return (
    <div className="flex items-center gap-8">
      <AvatarBubble avatar={row.avatar} tone={row.avatarTone} imageUrl={row.avatarImage} />
      <div className="flex min-w-0 items-center gap-5">
        <strong className="truncate text-[24px] font-black text-[#001ec7]">{row.name}</strong>
        <VipBadge vip={row.vip} />
      </div>
    </div>
  );
}

function LeaderboardRowView({ row }: { row: LeaderboardRow }) {
  return (
    <li className={`${tableGridClass} h-[63px] border-b border-[#cfe2ff] bg-[#f7fbff] px-9 text-[#001ec7]`}>
      <div className="flex justify-center">
        <RankBadge rank={row.rank} />
      </div>
      <PlayerIdentity row={row} />
      <GemValue value={row.metricValue} className="justify-start text-[25px] font-black" />
      <span className="text-[18px] font-extrabold">{row.time}</span>
      <StarValue value={row.exp} className="text-[25px] font-black" />
    </li>
  );
}

function EmptyRows() {
  return (
    <li className="grid h-[504px] place-items-center bg-[#f7fbff] text-[26px] font-black text-[#2456b9]">
      暂无排行榜数据
    </li>
  );
}

function MyRankingBar({ row }: { row: LeaderboardRow }) {
  return (
    <section
      className={`${tableGridClass} h-[86px] rounded-b-[18px] border-t border-[#ffd56b] bg-gradient-to-r from-[#fff5bf] via-[#ffe09a] to-[#ffc24e] px-9 text-[#001ec7] shadow-[inset_0_2px_12px_rgba(255,255,255,0.5)]`}
    >
      <div className="flex items-center justify-center gap-4">
        <span className="text-center text-[15px] font-black leading-tight">
          我的排名
          <strong className="block text-[38px] leading-[0.95]">{row.rank}</strong>
        </span>
      </div>
      <PlayerIdentity row={row} />
      <GemValue value={row.metricValue} className="text-[25px] font-black" />
      <span className="text-[18px] font-extrabold">{row.time}</span>
      <StarValue value={row.exp} className="text-[25px] font-black" />
    </section>
  );
}

export default function LeaderboardPage() {
  const router = useRouter();
  const player = usePlayerStore(state => state.player);
  const isLoggedIn = usePlayerStore(state => state.isLoggedIn);
  const [activeBoard, setActiveBoard] = useState<LeaderboardType>('highestScore');
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const { ranking: highestScoreRanking } = useLeaderboardHighestScoreRanking(LEADERBOARD_LOOKUP_LIMIT);
  const { ranking: experienceRanking } = useLeaderboardExperienceRanking(LEADERBOARD_LOOKUP_LIMIT);
  const { ranking: winStreakRanking } = useLeaderboardWinStreakRanking(LEADERBOARD_LOOKUP_LIMIT);
  const { ranking: winRateRanking } = useLeaderboardWinRateRanking(LEADERBOARD_LOOKUP_LIMIT);
  const playerId = player?.id;
  const playerNameFromStore = player?.name;

  const currentPlayer = useMemo(
    () => (playerId && playerNameFromStore ? { id: playerId, name: playerNameFromStore } : null),
    [playerId, playerNameFromStore]
  );
  const displayedBoards = useMemo<Record<LeaderboardType, LeaderboardBoard>>(
    () => ({
      highestScore: highestScoreRanking
        ? createApiBoard(
            'highestScore',
            '历史最高得分排行榜',
            '历史最高得分',
            highestScoreRanking,
            currentPlayer,
            item => formatNumber(item.score)
          )
        : createEmptyBoard('highestScore', '历史最高得分排行榜', '历史最高得分', currentPlayer),
      experience: experienceRanking
        ? createApiBoard(
            'experience',
            '投骰经验值排行榜',
            '投骰经验值',
            experienceRanking,
            currentPlayer,
            item => formatNumber(item.experience),
            item => item.experience
          )
        : createEmptyBoard('experience', '投骰经验值排行榜', '投骰经验值', currentPlayer),
      winStreak: winStreakRanking
        ? createApiBoard(
            'winStreak',
            '最高连胜局数排行榜',
            '最高连胜局数',
            winStreakRanking,
            currentPlayer,
            item => formatNumber(item.streak)
          )
        : createEmptyBoard('winStreak', '最高连胜局数排行榜', '最高连胜局数', currentPlayer),
      winRate: winRateRanking
        ? createApiBoard(
            'winRate',
            '胜率排行榜',
            '胜率',
            winRateRanking,
            currentPlayer,
            item => formatPercent(item.win_rate),
            undefined,
            item => item.last_play_time
          )
        : createEmptyBoard('winRate', '胜率排行榜', '胜率', currentPlayer),
    }),
    [currentPlayer, experienceRanking, highestScoreRanking, winRateRanking, winStreakRanking]
  );
  const activeBoardData = displayedBoards[activeBoard];
  const displayedStatCards = useMemo<StatCard[]>(
    () =>
      statCards.map(card => ({
        ...card,
        value: displayedBoards[card.type].statValue,
      })),
    [displayedBoards]
  );
  const hasUserSession = Boolean(isLoggedIn && player);
  const topStars = player?.coins ?? 120;
  const playerName = player?.name ?? '乐乐玩家';

  const handlePlayerProfileClick = () => {
    if (hasUserSession) {
      router.push('/profile');
      return;
    }

    setIsAuthPromptOpen(true);
  };

  const handlePlayerProfileKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    handlePlayerProfileClick();
  };

  return (
    <ResponsiveStage
      className="flex h-screen min-h-screen items-center justify-center overflow-hidden bg-transparent text-white"
      viewportClassName="relative overflow-hidden shadow-[0_0_80px_rgba(14,88,213,0.2)]"
      stageClassName="relative origin-top-left overflow-hidden bg-cover bg-center font-sans text-white"
      designWidth={1920}
      designHeight={1080}
      backgroundImage={leaderboardBackground.src}
    >
      <div className={`absolute inset-0 ${leaderboardBackdropClass}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_30%,rgba(87,184,255,0.16),transparent_34%),linear-gradient(180deg,rgba(18,112,255,0.10)_0%,rgba(3,21,126,0.24)_100%)]" />

      <IslandTopNav
        activeItem="leaderboard"
        rightSlot={
          <div className="flex items-center gap-8">
            <div className="flex h-[50px] items-center gap-3 rounded-full border border-white/25 bg-[#07156a]/48 pl-2 pr-5 shadow-[inset_0_2px_8px_rgba(255,255,255,0.18)] backdrop-blur">
              <span className="grid h-[44px] w-[44px] place-items-center rounded-full bg-gradient-to-b from-[#fff28b] to-[#ff9b1f] shadow-[0_6px_12px_rgba(128,70,0,0.28)]">
                <StarIcon size={36} />
              </span>
              <strong className="text-[22px] font-black">{topStars.toLocaleString()}</strong>
            </div>

            <button
              type="button"
              data-player-entry="true"
              className="flex items-center gap-4 rounded-full px-2 py-1 transition-all duration-300 hover:-translate-y-[3px] hover:bg-white/10 hover:shadow-[0_12px_24px_rgba(42,128,255,0.28)]"
              onClick={handlePlayerProfileClick}
              onKeyDown={handlePlayerProfileKeyDown}
            >
              <AvatarBubble avatar={getAvatarText(playerName)} tone="from-[#e8f7ff] to-[#56a7ff]" imageUrl={player?.avatar} size="small" />
              <strong className="text-[22px] font-black">{playerName}</strong>
            </button>
          </div>
        }
      />

      {isAuthPromptOpen && (
        <div
          className="absolute inset-0 z-50 grid place-items-center bg-[#020d2a]/45 backdrop-blur-[6px]"
          role="presentation"
          onClick={() => setIsAuthPromptOpen(false)}
        >
          <section
            className="w-[380px] rounded-[20px] border border-[#ffeb94]/70 bg-gradient-to-br from-white to-[#d7ebff] p-6 text-center text-[#15366f] shadow-[0_24px_48px_rgba(0,20,72,0.35),inset_0_2px_0_rgba(255,255,255,0.8)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-auth-prompt-title"
            onClick={event => event.stopPropagation()}
          >
            <h2 id="leaderboard-auth-prompt-title" className="text-[23px] font-black text-[#0d4aa5]">
              请先登录
            </h2>
            <p className="mt-3 text-[14px] font-bold leading-6 text-[#416494]">
              登录或注册后可以查看个人中心、同步排行榜数据和领取奖励。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="h-[44px] rounded-[13px] bg-gradient-to-b from-[#51b8ff] to-[#2368dc] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(22,88,180,0.22)] transition-all duration-300 hover:-translate-y-[2px]"
                onClick={() => router.push('/login?mode=login')}
              >
                登录账号
              </button>
              <button
                type="button"
                className="h-[44px] rounded-[13px] bg-gradient-to-b from-[#ffcb61] to-[#f3931f] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(180,110,22,0.22)] transition-all duration-300 hover:-translate-y-[2px]"
                onClick={() => router.push('/login?mode=register')}
              >
                注册账号
              </button>
              <button
                type="button"
                className="col-span-2 h-[42px] rounded-[13px] bg-[#2a4c7e]/75 text-[14px] font-black text-white transition-all duration-300 hover:-translate-y-[2px]"
                onClick={() => setIsAuthPromptOpen(false)}
              >
                暂不登录
              </button>
            </div>
          </section>
        </div>
      )}

      <aside
        data-leaderboard-sidebar="true"
        className={`absolute left-[52px] top-[202px] z-10 h-[480px] w-[315px] rounded-t-[18px] border-x border-t border-[#56b8ff]/70 bg-[linear-gradient(180deg,rgba(18,109,255,0.96)_0%,rgba(11,76,219,0.72)_44%,rgba(7,33,141,0.28)_74%,rgba(7,33,141,0)_100%)] p-3 shadow-[0_18px_38px_rgba(0,30,112,0.28),inset_0_2px_12px_rgba(255,255,255,0.18)] ${hoverLift}`}
      >
        <div className="grid gap-3">
          {leaderboardMenus.map(item => (
            <MenuItemView
              key={item.type}
              item={item}
              active={item.type === activeBoard}
              onClick={() => setActiveBoard(item.type)}
            />
          ))}
        </div>
      </aside>

      <section className="absolute left-[410px] top-[126px] z-10 w-[1320px]">
        <div className="grid grid-cols-4 gap-6">
          {displayedStatCards.map(card => (
            <StatCardView
              key={card.type}
              card={card}
              active={card.type === activeBoard}
              onClick={() => setActiveBoard(card.type)}
            />
          ))}
        </div>

        <section
          data-leaderboard-table={activeBoard}
          className={`mt-6 h-[660px] overflow-hidden rounded-[18px] border border-white ${leaderboardTableSurfaceClass} shadow-[0_26px_58px_rgba(0,30,118,0.36),inset_0_2px_8px_rgba(255,255,255,0.72)] ${hoverLift}`}
        >
          <div
            className={`${tableGridClass} h-[70px] bg-gradient-to-r from-[#e4f2ff] via-[#dcebff] to-[#d6e9ff] px-9 text-[20px] font-black text-[#0024bf] shadow-[inset_0_-1px_0_rgba(92,143,216,0.18)]`}
          >
            <span className="text-center">排名</span>
            <span>玩家昵称</span>
            <span>{activeBoardData.metricLabel}</span>
            <span>达成时间</span>
            <span>投骰经验值</span>
          </div>

          <ol>
            {activeBoardData.rows.length > 0 ? (
              activeBoardData.rows.map(row => (
                <LeaderboardRowView key={`${activeBoard}-${row.rank}-${row.userId ?? row.name}`} row={row} />
              ))
            ) : (
              <EmptyRows />
            )}
          </ol>

          <MyRankingBar row={activeBoardData.myRanking} />
        </section>
      </section>
    </ResponsiveStage>
  );
}
