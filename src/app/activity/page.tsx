'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  CalendarCheck,
  Castle,
  ClipboardList,
  Crown,
  Gem,
  Gift,
  Lock,
  Medal,
  Rocket,
  ScrollText,
  Share2,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { IslandTopNav } from '@/components/layout';
import { StarIcon } from '@/components/ui';
import activePageBackground from '@/assets/images/backgrounds/activity/activity-bg.png';

type TaskType = 'daily' | 'weekly';
type TaskStatus = 'claim' | 'go';
type TitleStatus = 'unlocked' | 'claimable' | 'locked';

interface Task {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  action: string;
  status: TaskStatus;
  icon: LucideIcon;
  iconClassName: string;
  iconBackground: string;
}

interface TaskApiResponse {
  taskGroups: Record<TaskType, Task[]>;
}

interface SideTab {
  type: TaskType;
  label: string;
  subtitle: string;
  icon: LucideIcon;
}

interface TitleStage {
  name: string;
  requiredScore: number;
  status: TitleStatus;
  icon: LucideIcon;
}

interface TitleReward {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const sideTabs: SideTab[] = [
  { type: 'daily', label: '每日任务', subtitle: '完成任务领奖励', icon: CalendarCheck },
  { type: 'weekly', label: '本周任务', subtitle: '冲刺周榜积分', icon: ClipboardList },
];

const dailyTasks: Task[] = [
  {
    id: 'daily-login',
    name: '每日登录游戏',
    description: '登录游戏即可领取探索积分',
    progress: 1,
    target: 1,
    reward: 10,
    action: '领取',
    status: 'claim',
    icon: CalendarCheck,
    iconClassName: 'text-[#ff9f1c]',
    iconBackground: 'from-[#fff6b9] to-[#ffb83e]',
  },
  {
    id: 'daily-battle',
    name: '参与对战训练',
    description: '参与 5 场任意模式对局',
    progress: 2,
    target: 5,
    reward: 20,
    action: '去完成',
    status: 'go',
    icon: Swords,
    iconClassName: 'text-[#1f7dff]',
    iconBackground: 'from-[#d7f1ff] to-[#63a7ff]',
  },
  {
    id: 'daily-upgrade',
    name: '升级城堡探索队',
    description: '提升任意探索队等级 1 次',
    progress: 0,
    target: 1,
    reward: 30,
    action: '去完成',
    status: 'go',
    icon: Rocket,
    iconClassName: 'text-[#ff8b21]',
    iconBackground: 'from-[#ffe7be] to-[#ff9b50]',
  },
  {
    id: 'daily-ai',
    name: '参与人机对战',
    description: '挑战 AI 并完成 2 局对战',
    progress: 1,
    target: 2,
    reward: 15,
    action: '去完成',
    status: 'go',
    icon: Bot,
    iconClassName: 'text-[#0bbbd3]',
    iconBackground: 'from-[#ccfbff] to-[#42d2ea]',
  },
  {
    id: 'daily-share',
    name: '分享本周分享',
    description: '分享活动页面给一位好友',
    progress: 0,
    target: 1,
    reward: 15,
    action: '去完成',
    status: 'go',
    icon: Share2,
    iconClassName: 'text-[#a53cff]',
    iconBackground: 'from-[#edd8ff] to-[#b363ff]',
  },
];

const weeklyTasks: Task[] = [
  {
    id: 'weekly-checkin',
    name: '完成本周签到',
    description: '本周累计签到 5 天',
    progress: 3,
    target: 5,
    reward: 80,
    action: '去完成',
    status: 'go',
    icon: BadgeCheck,
    iconClassName: 'text-[#12a865]',
    iconBackground: 'from-[#d9ffe9] to-[#6ef0a5]',
  },
  {
    id: 'weekly-win',
    name: '累计获得胜利',
    description: '本周获得 8 次胜利',
    progress: 4,
    target: 8,
    reward: 120,
    action: '去完成',
    status: 'go',
    icon: Trophy,
    iconClassName: 'text-[#e88c00]',
    iconBackground: 'from-[#fff1b2] to-[#ffc04d]',
  },
  {
    id: 'weekly-expedition',
    name: '完成城堡远征',
    description: '完成 3 次城堡探索远征',
    progress: 1,
    target: 3,
    reward: 100,
    action: '去完成',
    status: 'go',
    icon: Castle,
    iconClassName: 'text-[#1b75ff]',
    iconBackground: 'from-[#d7edff] to-[#61a8ff]',
  },
  {
    id: 'weekly-score',
    name: '收集冒险积分',
    description: '本周累计获得 500 探索积分',
    progress: 420,
    target: 500,
    reward: 150,
    action: '领取',
    status: 'claim',
    icon: Gem,
    iconClassName: 'text-[#534dff]',
    iconBackground: 'from-[#dddfff] to-[#7e86ff]',
  },
  {
    id: 'weekly-friend',
    name: '邀请好友助力',
    description: '邀请 2 位好友参与活动',
    progress: 0,
    target: 2,
    reward: 160,
    action: '去完成',
    status: 'go',
    icon: Users,
    iconClassName: 'text-[#ff5f8a]',
    iconBackground: 'from-[#ffd8e6] to-[#ff7da3]',
  },
];

const mockTaskApiResponse: TaskApiResponse = {
  taskGroups: {
    daily: dailyTasks,
    weekly: weeklyTasks,
  },
};

const titleStages: TitleStage[] = [
  { name: '新手探险家', requiredScore: 100, status: 'unlocked', icon: Castle },
  { name: '城堡勇士', requiredScore: 300, status: 'claimable', icon: ShieldCheck },
  { name: '皇家骑士', requiredScore: 600, status: 'locked', icon: Medal },
  { name: '冒险大师', requiredScore: 1000, status: 'locked', icon: Crown },
  { name: '城堡传说', requiredScore: 1500, status: 'locked', icon: Trophy },
];

const castleRewardCards: TitleReward[] = [
  {
    label: '金币奖励',
    value: 'x200',
    icon: Gem,
    tone: 'from-[#ffef91] to-[#ffae25]',
  },
  {
    label: '骰子盲盒',
    value: 'x1',
    icon: Gift,
    tone: 'from-[#b7f5ff] to-[#3aa8ff]',
  },
  {
    label: '魔法宝箱',
    value: 'x1',
    icon: Trophy,
    tone: 'from-[#d5c1ff] to-[#8f5cff]',
  },
];

const taskMap = mockTaskApiResponse.taskGroups;

const hoverLift =
  'transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_22px_44px_rgba(30,118,255,0.34),0_0_26px_rgba(93,192,255,0.34)]';

function useStageScale() {
  const [viewportSize, setViewportSize] = useState({ width: DESIGN_WIDTH, height: DESIGN_HEIGHT });

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);

    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  return useMemo(
    () => Math.min(viewportSize.width / DESIGN_WIDTH, viewportSize.height / DESIGN_HEIGHT),
    [viewportSize.height, viewportSize.width]
  );
}

function TitleRewardCard({ reward }: { reward: TitleReward }) {
  const Icon = reward.icon;

  return (
    <div
      data-title-reward-card="true"
      className={`flex h-[72px] items-center gap-4 rounded-[18px] border border-white/30 bg-gradient-to-br ${reward.tone} px-5 text-white shadow-[0_12px_24px_rgba(0,39,130,0.18),inset_0_2px_8px_rgba(255,255,255,0.28)] ${hoverLift}`}
    >
      <span className="grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-white/24">
        <Icon size={26} strokeWidth={2.8} />
      </span>
      <span>
        <small className="block text-[13px] font-black text-white/85">{reward.label}</small>
        <strong className="block text-[24px] font-black leading-none">{reward.value}</strong>
      </span>
    </div>
  );
}

function SideTabs({
  activeType,
  onChange,
}: {
  activeType: TaskType;
  onChange: (taskType: TaskType) => void;
}) {
  return (
    <aside className="absolute left-[48px] top-[326px] z-20 grid w-[214px] gap-7">
      {sideTabs.map(tab => {
        const Icon = tab.icon;
        const isActive = tab.type === activeType;

        return (
          <button
            key={tab.type}
            type="button"
            data-task-type={tab.type}
            onClick={() => onChange(tab.type)}
            className={`flex h-[92px] items-center gap-4 rounded-r-[22px] rounded-l-[10px] border px-5 text-left shadow-[0_16px_28px_rgba(0,28,110,0.22)] transition-all duration-300 hover:-translate-y-[3px] ${
              isActive
                ? 'border-[#ffe7a1] bg-gradient-to-r from-[#fff3bb] to-[#ffd563] text-[#7b4a00] hover:shadow-[0_20px_36px_rgba(215,132,21,0.32),0_0_20px_rgba(255,221,103,0.4)]'
                : 'border-[#54b7ff] bg-gradient-to-r from-[#0a52d1] to-[#07339a] text-white hover:shadow-[0_20px_36px_rgba(33,119,255,0.3),0_0_20px_rgba(94,190,255,0.28)]'
            }`}
          >
            <span
              className={`grid h-[52px] w-[52px] place-items-center rounded-[14px] border-2 ${
                isActive
                  ? 'border-white bg-white text-[#f29a12]'
                  : 'border-[#8ee7ff] bg-[#0e73df] text-[#86e6ff]'
              }`}
            >
              <Icon size={31} strokeWidth={2.8} />
            </span>
            <span>
              <strong className="block text-[20px] font-black leading-tight">{tab.label}</strong>
              <small className="mt-1 block text-[11px] font-extrabold opacity-80">{tab.subtitle}</small>
            </span>
          </button>
        );
      })}
    </aside>
  );
}

function TaskItem({ task }: { task: Task }) {
  const Icon = task.icon;
  const progressPercent = Math.min(100, Math.round((task.progress / task.target) * 100));
  const isClaim = task.status === 'claim';

  return (
    <li className="grid h-[82px] grid-cols-[58px_1fr_88px] items-center gap-4 rounded-[16px] border border-[#b8d8ff] bg-[#f4f9ff] px-4 text-[#06308f] shadow-[0_8px_18px_rgba(0,52,156,0.16),inset_0_1px_5px_rgba(255,255,255,0.86)] transition-all duration-300 hover:-translate-y-[3px] hover:bg-white hover:shadow-[0_14px_26px_rgba(0,55,153,0.2)]">
      <span
        className={`grid h-[52px] w-[52px] place-items-center rounded-[14px] bg-gradient-to-br ${task.iconBackground} shadow-[0_8px_14px_rgba(0,45,128,0.18),inset_0_2px_8px_rgba(255,255,255,0.35)]`}
      >
        <Icon className={task.iconClassName} size={30} strokeWidth={2.8} />
      </span>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-4">
          <strong className="truncate text-[18px] font-black">{task.name}</strong>
          <span className="shrink-0 text-[13px] font-black text-[#1a5ee8]">
            +{task.reward}积分
          </span>
        </div>
        <p className="mt-1 truncate text-[12px] font-bold text-[#4b6ca0]">{task.description}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-[#cdddf6] shadow-[inset_0_1px_4px_rgba(0,39,120,0.22)]">
            <span
              className="block h-full origin-left animate-[progressFill_900ms_ease-out_forwards] rounded-full bg-gradient-to-r from-[#42d7ff] via-[#2075ff] to-[#ffd34d]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="w-[38px] text-right text-[12px] font-black text-[#164ee0]">
            {task.progress}/{task.target}
          </span>
        </div>
      </div>

      <button
        type="button"
        className={`h-[38px] rounded-full text-[13px] font-black text-white shadow-[0_8px_16px_rgba(0,57,161,0.24)] transition-all duration-300 hover:scale-105 hover:-translate-y-[2px] ${
          isClaim
            ? 'bg-gradient-to-r from-[#ffd76b] to-[#ff9e27] hover:shadow-[0_12px_24px_rgba(255,159,35,0.45),0_0_18px_rgba(255,223,107,0.5)]'
            : 'bg-gradient-to-r from-[#4ed4ff] to-[#1268ff] hover:shadow-[0_12px_24px_rgba(38,126,255,0.42),0_0_18px_rgba(94,199,255,0.46)]'
        }`}
      >
        {task.action}
      </button>
    </li>
  );
}

function TaskPanel({ activeType }: { activeType: TaskType }) {
  const tasks = taskMap[activeType];
  const title = activeType === 'daily' ? '每日任务' : '本周任务';
  const subtitle = activeType === 'daily' ? '完成每日任务，获取积分兑换奖励' : '完成本周任务，冲刺城堡探索称号';

  return (
    <section
      key={activeType}
      data-task-panel={activeType}
      className={`h-[560px] rounded-[22px] border-[3px] border-[#5fd7ff] bg-gradient-to-br from-[#0b69ff] via-[#0758df] to-[#0437a4] p-5 text-white shadow-[0_24px_54px_rgba(0,39,135,0.48),0_0_24px_rgba(79,211,255,0.45),inset_0_2px_16px_rgba(255,255,255,0.22)] animate-[panelFadeUp_320ms_ease-out] ${hoverLift}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black leading-none drop-shadow-[0_3px_8px_rgba(0,23,95,0.42)]">
            {title}
          </h1>
          <p className="mt-2 text-[13px] font-bold text-[#c8ecff]">{subtitle}</p>
        </div>
        <span className="grid h-[58px] w-[58px] place-items-center rounded-[18px] border border-[#8fd4ff] bg-[#e7f4ff] text-[#ffbd2f] shadow-[0_8px_16px_rgba(0,52,156,0.16),inset_0_2px_8px_rgba(255,255,255,0.7)]">
          <ScrollText size={34} strokeWidth={2.8} />
        </span>
      </div>

      <ul className="grid gap-3">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
    </section>
  );
}

function CastleStageCard({ stage }: { stage: TitleStage }) {
  const Icon = stage.icon;
  const isLocked = stage.status === 'locked';
  const isClaimable = stage.status === 'claimable';
  const statusLabel =
    stage.status === 'unlocked' ? '已解锁' : stage.status === 'claimable' ? '可领取' : '未解锁';

  return (
    <article
      className={`relative flex h-[238px] flex-col items-center justify-between rounded-[18px] border p-4 text-center transition-all duration-300 hover:-translate-y-[3px] ${
        isLocked
          ? 'border-[#aebbd5] bg-[#d8e1ee] text-[#5d6b86] grayscale'
          : 'border-[#b7ddff] bg-gradient-to-b from-[#f9fcff] to-[#d9ecff] text-[#06308f] shadow-[0_16px_28px_rgba(0,55,148,0.22),inset_0_2px_10px_rgba(255,255,255,0.78)] hover:shadow-[0_20px_38px_rgba(50,136,255,0.32),0_0_22px_rgba(255,221,99,0.3)]'
      }`}
    >
      <span
        className={`grid h-[76px] w-[76px] place-items-center rounded-[22px] border ${
          isLocked
            ? 'border-[#bcc7d8] bg-[#edf2f8]'
            : 'border-white bg-gradient-to-br from-[#fff3a6] to-[#ffb537]'
        }`}
      >
        <Icon
          size={44}
          strokeWidth={2.7}
          className={isLocked ? 'text-[#7b879c]' : 'text-[#7b4a00] drop-shadow-[0_4px_6px_rgba(104,57,0,0.25)]'}
          fill={isLocked ? 'transparent' : 'rgba(255, 196, 50, 0.38)'}
        />
      </span>

      <div>
        <h3 className="text-[17px] font-black leading-tight">{stage.name}</h3>
        <p className="mt-2 text-[12px] font-bold opacity-85">{stage.requiredScore} 积分</p>
      </div>

      {isClaimable ? (
        <button
          type="button"
          className="h-[34px] w-[86px] rounded-full bg-gradient-to-r from-[#ffd96a] to-[#ff9b1e] text-[13px] font-black text-white shadow-[0_10px_20px_rgba(255,154,30,0.36)] transition-all duration-300 hover:scale-105 hover:-translate-y-[2px] hover:shadow-[0_14px_26px_rgba(255,154,30,0.48),0_0_18px_rgba(255,222,93,0.5)]"
        >
          领取
        </button>
      ) : (
        <span
          className={`rounded-full px-4 py-2 text-[12px] font-black ${
            isLocked ? 'bg-[#b8c3d5] text-[#4f5d76]' : 'bg-[#35dc95] text-white'
          }`}
        >
          {statusLabel}
        </span>
      )}

      {isLocked && <Lock className="absolute right-3 top-3 text-[#7b879c]" size={18} strokeWidth={2.8} />}
    </article>
  );
}

function CastleProgressPanel() {
  const progress = 80;

  return (
    <section
      data-castle-panel="true"
      className={`h-[560px] rounded-[22px] border-[3px] border-[#5fd7ff] bg-gradient-to-br from-[#0b69ff] via-[#0758df] to-[#0437a4] p-6 text-white shadow-[0_24px_54px_rgba(0,39,135,0.48),0_0_24px_rgba(79,211,255,0.45),inset_0_2px_16px_rgba(255,255,255,0.22)] ${hoverLift}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[28px] font-black leading-none drop-shadow-[0_3px_8px_rgba(0,23,95,0.42)]">
            城堡探索进度
          </h2>
          <p className="mt-2 text-[13px] font-bold text-[#c8ecff]">收集积分，逐步解锁专属进阶称号</p>
        </div>
        <span className="grid h-[58px] w-[58px] place-items-center rounded-[18px] border border-[#8fd4ff] bg-[#e7f4ff] text-[#ffbd2f] shadow-[0_8px_16px_rgba(0,52,156,0.16),inset_0_2px_8px_rgba(255,255,255,0.7)]">
          <Castle size={36} strokeWidth={2.8} />
        </span>
      </div>

      <div className="mt-5 rounded-[18px] border border-[#b8d8ff] bg-[#e7f4ff] p-4 text-[#06308f] shadow-[0_8px_18px_rgba(0,52,156,0.16),inset_0_2px_10px_rgba(255,255,255,0.78)]">
        <div className="mb-3 flex items-center justify-between text-[14px] font-black text-[#0a4ad4]">
          <span>当前积分：1200</span>
          <span>目标积分：1500</span>
        </div>
        <div className="h-[15px] overflow-hidden rounded-full bg-[#071c72]/70 shadow-[inset_0_2px_6px_rgba(0,0,0,0.24)]">
          <span
            className="block h-full origin-left animate-[progressFill_1100ms_ease-out_forwards] rounded-full bg-gradient-to-r from-[#fff06b] via-[#ffd13b] to-[#ff941f]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-4">
        {titleStages.map(stage => (
          <CastleStageCard key={stage.name} stage={stage} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {castleRewardCards.map(reward => (
          <TitleRewardCard key={reward.label} reward={reward} />
        ))}
      </div>
    </section>
  );
}

function ActivePage() {
  const [activeType, setActiveType] = useState<TaskType>('daily');
  const scale = useStageScale();

  return (
    <main
      data-events-page="true"
      className="grid h-screen min-h-screen place-items-center overflow-hidden bg-transparent text-white"
    >
      <style jsx global>{`
        @keyframes progressFill {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        @keyframes panelFadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        className="relative overflow-hidden"
        style={{
          width: DESIGN_WIDTH * scale,
          height: DESIGN_HEIGHT * scale,
        }}
      >
        <section
          data-events-stage="true"
          className="relative h-[1080px] w-[1920px] overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage: `url(${activePageBackground.src})`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a7cff]/8 via-[#0639bb]/12 to-[#021b7a]/30" />
          <div className="absolute inset-0 bg-[#055dff]/5 backdrop-saturate-150" />

          <IslandTopNav
            activeItem="activity"
            rightSlot={
              <div className="flex items-center gap-4">
                <div className="flex h-[50px] items-center gap-3 rounded-full border border-white/25 bg-[#07156a]/48 pl-2 pr-5 shadow-[inset_0_2px_8px_rgba(255,255,255,0.18)] backdrop-blur">
                  <span className="grid h-[44px] w-[44px] place-items-center rounded-full bg-gradient-to-b from-[#fff28b] to-[#ff9b1f] shadow-[0_6px_12px_rgba(128,70,0,0.28)]">
                    <StarIcon size={36} />
                  </span>
                  <strong className="text-[22px] font-black">120</strong>
                </div>
              </div>
            }
          />

          <Link
            href="/"
            className={`absolute left-[30px] top-[94px] z-20 flex h-[38px] items-center gap-2 rounded-full border border-white/22 bg-[#0c69df]/48 px-5 text-[14px] font-black shadow-[0_8px_18px_rgba(0,37,123,0.2)] backdrop-blur-[8px] ${hoverLift}`}
          >
            <ArrowLeft size={18} strokeWidth={3} />
            返回大厅
          </Link>

          <SideTabs activeType={activeType} onChange={setActiveType} />

          <section className="absolute left-[318px] top-[390px] z-10 grid w-[1204px] grid-cols-[492px_688px] gap-6">
            <TaskPanel activeType={activeType} />
            <CastleProgressPanel />
          </section>
        </section>
      </div>
    </main>
  );
}

export default ActivePage;
