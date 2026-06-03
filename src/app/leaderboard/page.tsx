'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
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
import { useHomePoints, useLeaderboardGamesRanking, useLeaderboardRanking } from '@/hooks';
import { usePlayerStore } from '@/stores';
import type { LeaderboardGamesRankingData, LeaderboardRankingData } from '@/types/leaderboardApi';

type LeaderboardType = 'highestScore' | 'totalGames' | 'totalWins' | 'winRate';

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

interface LeaderboardApiResponse {
  boards: Record<LeaderboardType, LeaderboardBoard>;
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
    type: 'totalGames',
    label: '总对局数排行榜',
    imageIcon: diceIconImage,
    imageIconClassName: 'h-[50px] w-[50px] -ml-2 -mr-1 scale-125 object-contain',
    activeIconColor: 'text-[#256bff]',
    iconColor: 'text-[#70c6ff]',
  },
  {
    type: 'totalWins',
    label: '总胜利局数排行榜',
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

const statCards: StatCard[] = [
  {
    type: 'highestScore',
    title: '历史最高得分\n排行榜',
    value: '128,650',
    backgroundImage: board1Background.src,
  },
  {
    type: 'totalGames',
    title: '总对局数\n排行榜',
    value: '5,860',
    backgroundImage: board2Background.src,
  },
  {
    type: 'totalWins',
    title: '总胜利局数\n排行榜',
    value: '2,450',
    backgroundImage: board3Background.src,
  },
  {
    type: 'winRate',
    title: '胜率\n排行榜',
    value: '78%',
    backgroundImage: board4Background.src,
  },
];

const basePlayers = [
  { avatar: '🎲', avatarTone: 'from-[#e8f7ff] to-[#56a7ff]', name: '乐乐玩家', vip: 'VIP4' },
  { avatar: '🐕', avatarTone: 'from-[#fff4d8] to-[#f19b33]', name: '殿子小达人', vip: 'VIP3' },
  { avatar: '🤖', avatarTone: 'from-[#dff8ff] to-[#2a8dff]', name: 'AI机器人', vip: 'VIP3' },
  { avatar: '🐧', avatarTone: 'from-[#ffffff] to-[#6f8fb5]', name: '海洋之心', vip: 'VIP2' },
  { avatar: '🧸', avatarTone: 'from-[#ffd9a5] to-[#8b4c20]', name: '自由的风', vip: 'VIP2' },
  { avatar: '👩‍🦰', avatarTone: 'from-[#ffd7eb] to-[#ff6f91]', name: '幸运女神', vip: 'VIP1' },
  { avatar: '🐥', avatarTone: 'from-[#fff28a] to-[#ffb72e]', name: '阳光男孩', vip: 'VIP1' },
  { avatar: '👦', avatarTone: 'from-[#bfe9ff] to-[#3197ff]', name: '漫游者' },
];

function createRows(values: string[], times: string[]): LeaderboardRow[] {
  return basePlayers.map((player, index) => ({
    rank: index + 1,
    ...player,
    metricValue: values[index],
    time: times[index],
    exp: ['256,780', '198,450', '176,240', '152,130', '134,780', '115,230', '106,570', '92,380'][
      index
    ],
  }));
}

const defaultTimes = [
  '2024-05-25 21:36',
  '2024-05-24 18:20',
  '2024-05-23 20:15',
  '2024-05-20 16:08',
  '2024-05-19 14:37',
  '2024-05-18 22:11',
  '2024-05-18 09:52',
  '2024-05-17 13:30',
];

const mockLeaderboardApiResponse: LeaderboardApiResponse = {
  boards: {
    highestScore: {
      type: 'highestScore',
      title: '历史最高得分排行榜',
      metricLabel: '历史最高得分',
      statValue: '128,650',
      rows: createRows(
        ['128,650', '112,780', '98,320', '86,430', '75,680', '64,210', '58,960', '48,750'],
        defaultTimes
      ),
      myRanking: {
        rank: 23,
        avatar: '🎲',
        avatarTone: 'from-[#e8f7ff] to-[#56a7ff]',
        name: '乐乐玩家',
        vip: 'VIP4',
        metricValue: '35,680',
        time: '2024-05-16 20:45',
        exp: '68,450',
      },
    },
    totalGames: {
      type: 'totalGames',
      title: '总对局数排行榜',
      metricLabel: '总对局数',
      statValue: '5,860',
      rows: createRows(['5,860', '5,120', '4,780', '4,230', '3,980', '3,420', '3,090', '2,750'], defaultTimes),
      myRanking: {
        rank: 31,
        avatar: '🎲',
        avatarTone: 'from-[#e8f7ff] to-[#56a7ff]',
        name: '乐乐玩家',
        vip: 'VIP4',
        metricValue: '1,260',
        time: '2024-05-16 20:45',
        exp: '68,450',
      },
    },
    totalWins: {
      type: 'totalWins',
      title: '总胜利局数排行榜',
      metricLabel: '总胜利局数',
      statValue: '2,450',
      rows: createRows(['2,450', '2,120', '1,986', '1,730', '1,560', '1,280', '1,060', '920'], defaultTimes),
      myRanking: {
        rank: 27,
        avatar: '🎲',
        avatarTone: 'from-[#e8f7ff] to-[#56a7ff]',
        name: '乐乐玩家',
        vip: 'VIP4',
        metricValue: '680',
        time: '2024-05-16 20:45',
        exp: '68,450',
      },
    },
    winRate: {
      type: 'winRate',
      title: '胜率排行榜',
      metricLabel: '胜率',
      statValue: '78%',
      rows: createRows(['78%', '75%', '72%', '69%', '65%', '63%', '59%', '55%'], defaultTimes),
      myRanking: {
        rank: 18,
        avatar: '🎲',
        avatarTone: 'from-[#e8f7ff] to-[#56a7ff]',
        name: '乐乐玩家',
        vip: 'VIP4',
        metricValue: '61%',
        time: '2024-05-16 20:45',
        exp: '68,450',
      },
    },
  },
};

const LEADERBOARD_VISIBLE_ROW_COUNT = 8;
const LEADERBOARD_LOOKUP_LIMIT = 100;

function createTotalWinsRow(item: LeaderboardRankingData['leaderboard'][number], index: number): LeaderboardRow {
  return {
    rank: item.rank,
    userId: item.user_id,
    avatar: item.nickname.trim().slice(0, 1) || 'P',
    avatarTone: basePlayers[index % basePlayers.length].avatarTone,
    name: item.nickname,
    metricValue: item.total_wins.toLocaleString(),
    time: '-',
    exp: '-',
  };
}

function createTotalGamesRow(item: LeaderboardGamesRankingData['leaderboard'][number], index: number): LeaderboardRow {
  return {
    rank: item.rank,
    userId: item.user_id,
    avatar: item.nickname.trim().slice(0, 1) || 'P',
    avatarTone: basePlayers[index % basePlayers.length].avatarTone,
    name: item.nickname,
    metricValue: item.total_games.toLocaleString(),
    time: '-',
    exp: '-',
  };
}

function getRankingIdentityKey(item: { user_id: number }) {
  return `user:${item.user_id}`;
}

function dedupeRankingItems<T extends { user_id: number }>(items: T[]) {
  const seenKeys = new Set<string>();

  return items.filter(item => {
    const key = getRankingIdentityKey(item);
    if (seenKeys.has(key)) return false;

    seenKeys.add(key);
    return true;
  });
}

function createTotalWinsBoard(
  ranking: LeaderboardRankingData,
  currentPlayer?: { id: string; name: string; wins: number } | null
): LeaderboardBoard {
  const dedupedLeaderboard = dedupeRankingItems(ranking.leaderboard);
  const allRows = dedupedLeaderboard.map((item, index) => createTotalWinsRow({ ...item, rank: index + 1 }, index));
  const rows = allRows.slice(0, LEADERBOARD_VISIBLE_ROW_COUNT);
  const numericCurrentUserId = currentPlayer ? Number(currentPlayer.id) : null;
  const currentUserId = Number.isInteger(numericCurrentUserId) ? numericCurrentUserId : null;
  const myRankingFromRows = allRows.find(row => currentUserId !== null && row.userId === currentUserId);
  const myRankingItem =
    currentUserId !== null && ranking.my_ranking?.user_id === currentUserId ? ranking.my_ranking : undefined;
  const myRanking = myRankingFromRows ??
    (myRankingItem
    ? createTotalWinsRow(myRankingItem, Math.max(myRankingItem.rank - 1, 0))
    : {
        rank: '--',
        userId: currentUserId ?? undefined,
        avatar: currentPlayer?.name.trim().slice(0, 1) || 'P',
        avatarTone: basePlayers[0].avatarTone,
        name: currentPlayer?.name ?? '未登录玩家',
        metricValue: currentPlayer ? currentPlayer.wins.toLocaleString() : '-',
        time: '-',
        exp: '-',
      });

  return {
    type: 'totalWins',
    title: '总胜利局数排行榜',
    metricLabel: '总胜利局数',
    statValue: rows[0]?.metricValue ?? '0',
    rows,
    myRanking,
  };
}

function createTotalGamesBoard(
  ranking: LeaderboardGamesRankingData,
  currentPlayer?: { id: string; name: string; totalGames: number } | null
): LeaderboardBoard {
  const dedupedLeaderboard = dedupeRankingItems(ranking.leaderboard);
  const allRows = dedupedLeaderboard.map((item, index) => createTotalGamesRow({ ...item, rank: index + 1 }, index));
  const rows = allRows.slice(0, LEADERBOARD_VISIBLE_ROW_COUNT);
  const numericCurrentUserId = currentPlayer ? Number(currentPlayer.id) : null;
  const currentUserId = Number.isInteger(numericCurrentUserId) ? numericCurrentUserId : null;
  const myRankingFromRows = allRows.find(row => currentUserId !== null && row.userId === currentUserId);
  const myRankingItem =
    currentUserId !== null && ranking.my_ranking?.user_id === currentUserId ? ranking.my_ranking : undefined;
  const myRanking = myRankingFromRows ??
    (myRankingItem
    ? createTotalGamesRow(myRankingItem, Math.max(myRankingItem.rank - 1, 0))
    : {
        rank: '--',
        userId: currentUserId ?? undefined,
        avatar: currentPlayer?.name.trim().slice(0, 1) || 'P',
        avatarTone: basePlayers[0].avatarTone,
        name: currentPlayer?.name ?? '未登录玩家',
        metricValue: currentPlayer ? currentPlayer.totalGames.toLocaleString() : '-',
        time: '-',
        exp: '-',
      });

  return {
    type: 'totalGames',
    title: '总对局数排行榜',
    metricLabel: '总对局数',
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

function AvatarBubble({ avatar, tone, size = 'large' }: { avatar: string; tone: string; size?: 'large' | 'small' }) {
  const sizeClass = size === 'large' ? 'h-[58px] w-[58px] text-[31px]' : 'h-[46px] w-[46px] text-[25px]';

  return (
    <span
      className={`grid ${sizeClass} place-items-center rounded-full border-[3px] border-white bg-gradient-to-br ${tone} shadow-[0_8px_16px_rgba(0,48,140,0.24),inset_0_2px_8px_rgba(255,255,255,0.54)]`}
      aria-hidden="true"
    >
      {avatar}
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

function HomePointsValue({ userId }: { userId: number }) {
  const { points } = useHomePoints(String(userId), 0);

  return <StarValue value={points.toLocaleString()} className="text-[25px] font-black" />;
}

function LeaderboardPointsValue({ row }: { row: LeaderboardRow }) {
  return row.userId === undefined ? (
    <StarValue value={row.exp} className="text-[25px] font-black" />
  ) : (
    <HomePointsValue userId={row.userId} />
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
      <AvatarBubble avatar={row.avatar} tone={row.avatarTone} />
      <div className="flex min-w-0 items-center gap-5">
        <strong className="truncate text-[24px] font-black text-[#001ec7]">{row.name}</strong>
        <VipBadge vip={row.vip} />
      </div>
    </div>
  );
}

function LeaderboardRowView({ row }: { row: LeaderboardRow }) {
  return (
    <li
      className={`${tableGridClass} h-[63px] border-b border-[#cfe2ff] bg-[#f7fbff] px-9 text-[#001ec7]`}
    >
      <div className="flex justify-center">
        <RankBadge rank={row.rank} />
      </div>
      <PlayerIdentity row={row} />
      <GemValue value={row.metricValue} className="justify-start text-[25px] font-black" />
      <span className="text-[18px] font-extrabold">{row.time}</span>
      <LeaderboardPointsValue row={row} />
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
      <LeaderboardPointsValue row={row} />
    </section>
  );
}

export default function LeaderboardPage() {
  const router = useRouter();
  const player = usePlayerStore(state => state.player);
  const stats = usePlayerStore(state => state.stats);
  const isLoggedIn = usePlayerStore(state => state.isLoggedIn);
  const [activeBoard, setActiveBoard] = useState<LeaderboardType>('highestScore');
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const { ranking: winsRanking } = useLeaderboardRanking(LEADERBOARD_LOOKUP_LIMIT, true, player?.id);
  const { ranking: gamesRanking } = useLeaderboardGamesRanking(LEADERBOARD_LOOKUP_LIMIT);

  const totalWinsBoard = useMemo(
    () => (winsRanking ? createTotalWinsBoard(winsRanking, player) : null),
    [player, winsRanking]
  );
  const totalGamesPlayer = useMemo(
    () =>
      player
        ? {
            id: player.id,
            name: player.name,
            totalGames: stats?.totalGames ?? player.wins + player.losses,
          }
        : null,
    [player, stats?.totalGames]
  );
  const totalGamesBoard = useMemo(
    () => (gamesRanking ? createTotalGamesBoard(gamesRanking, totalGamesPlayer) : null),
    [gamesRanking, totalGamesPlayer]
  );
  const displayedBoards = useMemo(
    () => ({
      ...mockLeaderboardApiResponse.boards,
      ...(totalGamesBoard ? { totalGames: totalGamesBoard } : {}),
      ...(totalWinsBoard ? { totalWins: totalWinsBoard } : {}),
    }),
    [totalGamesBoard, totalWinsBoard]
  );
  const activeBoardData = displayedBoards[activeBoard];
  const displayedStatCards = useMemo(
    () =>
      statCards.map(card => ({
        ...card,
        value: displayedBoards[card.type].rows[0]?.metricValue ?? '0',
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
              <AvatarBubble avatar="🎲" tone="from-[#e8f7ff] to-[#56a7ff]" size="small" />
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
              {activeBoardData.rows.map(row => (
                <LeaderboardRowView key={`${activeBoard}-${row.rank}`} row={row} />
              ))}
            </ol>

            <MyRankingBar row={activeBoardData.myRanking} />
          </section>
        </section>

    </ResponsiveStage>
  );
}
