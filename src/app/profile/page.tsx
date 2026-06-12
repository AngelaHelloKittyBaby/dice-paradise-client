'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Mail } from 'lucide-react';
import profileBackground from '@/assets/images/backgrounds/profile/profile-bg.png';
import { GameResultModal } from '@/components/game';
import { IslandTopNav, ResponsiveStage } from '@/components/layout';
import { AchievementPanel } from '@/components/profile/AchievementPanel';
import { HistoryPanel } from '@/components/profile/HistoryPanel';
import { OverviewPanel } from '@/components/profile/OverviewPanel';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { Sidebar } from '@/components/profile/Sidebar';
import { StarIcon } from '@/components/ui';
import {
  getProfileUser,
  getUserAchievements,
  getUserHistory,
  getUserOverview,
  mockAchievements,
  mockMatchHistory,
  mockProfileUser,
  mockUserOverview,
} from '@/mocks/profile';
import { mockGameResult } from '@/mocks/gameResult';
import type { GameResultData } from '@/types/gameResult';
import type { AchievementItem, MatchHistoryRecord, ProfilePanelType, ProfileUser, UserOverview } from '@/types/profile';

function createResultForRecord(record: MatchHistoryRecord): GameResultData {
  return {
    ...mockGameResult,
    players: mockGameResult.players.map(player =>
      player.id === 1
        ? {
            ...player,
            score: record.score,
            rank: record.result === '胜利' ? 1 : 3,
          }
        : player
    ),
    playerDetails: {
      ...mockGameResult.playerDetails,
      1: {
        ...mockGameResult.playerDetails[1],
        totalScore: record.score,
      },
    },
  };
}

export default function ProfilePage() {
  const [activePanel, setActivePanel] = useState<ProfilePanelType>('overview');
  const [user, setUser] = useState<ProfileUser>(mockProfileUser);
  const [overview, setOverview] = useState<UserOverview>(mockUserOverview);
  const [achievements, setAchievements] = useState<AchievementItem[]>(mockAchievements);
  const [history, setHistory] = useState<MatchHistoryRecord[]>(mockMatchHistory);
  const [selectedRecord, setSelectedRecord] = useState<MatchHistoryRecord | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([getProfileUser(), getUserOverview(), getUserAchievements(), getUserHistory()]).then(
      ([nextUser, nextOverview, nextAchievements, nextHistory]) => {
        if (!mounted) return;

        setUser(nextUser);
        setOverview(nextOverview);
        setAchievements(nextAchievements);
        setHistory(nextHistory);
      }
    );

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRecord) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedRecord(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRecord]);

  const resultData = useMemo(
    () => (selectedRecord ? createResultForRecord(selectedRecord) : mockGameResult),
    [selectedRecord]
  );

  return (
    <ResponsiveStage
      className="flex h-screen min-h-screen items-center justify-center overflow-hidden bg-transparent text-white"
      viewportClassName="relative overflow-hidden shadow-[0_0_90px_rgba(14,88,213,0.24)]"
      stageClassName="relative origin-top-left overflow-hidden bg-cover bg-center bg-no-repeat font-sans text-white"
      designWidth={1920}
      designHeight={1080}
      backgroundImage={profileBackground.src}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,238,150,0.10),transparent_28%),linear-gradient(90deg,rgba(4,16,58,0.48),transparent_24%,transparent_76%,rgba(4,16,58,0.42)),linear-gradient(180deg,rgba(2,15,58,0.14),transparent_48%,rgba(2,9,34,0.38))]" />

      <IslandTopNav
        activeItem="profile"
        rightSlot={
          <div className="flex items-center gap-5">
          <div className="flex h-[50px] items-center gap-3 rounded-full border border-white/25 bg-[#07156a]/48 pl-2 pr-5 shadow-[inset_0_2px_8px_rgba(255,255,255,0.18)] backdrop-blur">
            <span className="grid h-[44px] w-[44px] place-items-center rounded-full bg-gradient-to-b from-[#fff28b] to-[#ff9b1f] shadow-[0_6px_12px_rgba(128,70,0,0.28)]">
              <StarIcon size={36} />
            </span>
            <strong className="text-[22px] font-black">{user.stars.toLocaleString()}</strong>
          </div>
          <button className="grid h-[54px] w-[54px] place-items-center rounded-full border border-white/25 bg-[#0a3f9f]/64 text-white shadow-[0_10px_22px_rgba(0,33,94,0.24),inset_0_2px_8px_rgba(255,255,255,0.18)] backdrop-blur transition-all duration-300 hover:-translate-y-[3px]" type="button" aria-label="邮件">
            <Mail size={28} strokeWidth={2.8} fill="rgba(255,255,255,0.15)" />
          </button>
          </div>
        }
      />

      <Sidebar activePanel={activePanel} onChange={setActivePanel} />

      <main className="absolute left-[384px] right-[54px] top-[118px] z-10">
        <ProfileHeader user={user} />

        <div className="mt-7">
          <AnimatePresence mode="wait">
            {activePanel === 'overview' && (
              <OverviewPanel
                key="overview"
                overview={overview}
                achievements={achievements}
                onShowAchievements={() => setActivePanel('achievement')}
              />
            )}
            {activePanel === 'achievement' && <AchievementPanel key="achievement" achievements={achievements} />}
            {activePanel === 'history' && (
              <HistoryPanel key="history" records={history} onSelectRecord={setSelectedRecord} />
            )}
          </AnimatePresence>
        </div>
      </main>

      <motion.div
        className="absolute bottom-[86px] left-[54px] z-10 flex h-[250px] w-[250px] items-end justify-center rounded-full bg-[radial-gradient(circle,rgba(49,155,255,0.22),transparent_62%)] text-[108px] drop-shadow-[0_18px_24px_rgba(0,25,90,0.32)]"
        animate={{ y: [0, -8, 0], rotate: [0, 1.5, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        🎲
      </motion.div>

      <GameResultModal
        open={Boolean(selectedRecord)}
        result={resultData}
        initialSelectedPlayerId={1}
        onClose={() => setSelectedRecord(null)}
        allowOverlayDismiss
        showActions={false}
      />
    </ResponsiveStage>
  );
}
