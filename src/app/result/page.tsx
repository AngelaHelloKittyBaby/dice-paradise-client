'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GameResultModal } from '@/components/game';
import { PageContainer } from '@/components/layout';
import { Loading } from '@/components/ui';
import { useAuth } from '@/hooks';
import {
  backToLobbySettlementGame,
  getSettlementResultData,
  rematchSettlementGame,
} from '@/modules/result/settlementApi';
import type { GameResultData } from '@/types/gameResult';

function toBackendPlayerId(playerId: string | null) {
  if (!playerId) return null;

  const numericPlayerId = Number(playerId);

  return Number.isInteger(numericPlayerId) ? String(numericPlayerId) : null;
}

export default function ResultPage() {
  const router = useRouter();
  const { player } = useAuth();
  const [queryState, setQueryState] = useState<{ gameId: string | null; playerId: string | null }>({
    gameId: null,
    playerId: null,
  });
  const [resultData, setResultData] = useState<GameResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReturningLobby, setIsReturningLobby] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const gameId = queryState.gameId;
  const playerId = toBackendPlayerId(queryState.playerId ?? player?.id ?? null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setQueryState({
      gameId: params.get('gameId'),
      playerId: params.get('playerId'),
    });
  }, []);

  useEffect(() => {
    if (!gameId || !playerId) return;

    let isCancelled = false;

    setIsLoading(true);
    setActionError(null);

    getSettlementResultData(gameId, playerId)
      .then(data => {
        if (!isCancelled) setResultData(data);
      })
      .catch(error => {
        if (!isCancelled) {
          setActionError(error instanceof Error ? error.message : '获取结算数据失败，请稍后再试');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [gameId, playerId]);

  const handleBackLobby = async () => {
    if (isReturningLobby) return;

    if (!gameId || !playerId) {
      router.push('/');
      return;
    }

    setIsReturningLobby(true);
    setActionError(null);

    try {
      await backToLobbySettlementGame(gameId, {
        player_id: playerId,
      });
      router.push('/');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '返回首页失败，请稍后再试');
    } finally {
      setIsReturningLobby(false);
    }
  };

  const handleReplay = async () => {
    if (isRematching) return;

    if (!gameId || !playerId) {
      router.push('/game');
      return;
    }

    setIsRematching(true);
    setActionError(null);

    try {
      const rematch = await rematchSettlementGame(gameId, {
        player_id: playerId,
      });
      const params = new URLSearchParams({
        mode: rematch.gameState.gameMode,
        gameId: rematch.newGameId,
        playerId,
      });

      router.push(`/game?${params.toString()}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '再来一局失败，请稍后再试');
    } finally {
      setIsRematching(false);
    }
  };

  if (!gameId || !playerId) {
    return (
      <PageContainer title="游戏结束" showBack player={player}>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">暂无可用结算数据</p>
            <Link href="/" className="mt-4 inline-block text-primary-600 hover:underline">
              返回首页
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!resultData) {
    return (
      <PageContainer title="游戏结束" showBack player={player}>
        <div className="flex min-h-[60vh] flex-1 items-center justify-center">
          {isLoading ? (
            <Loading size="lg" text="结算数据加载中..." />
          ) : (
            <div className="text-center">
              <p className="text-gray-500">{actionError ?? '暂无可用结算数据'}</p>
              <Link href="/" className="mt-4 inline-block text-primary-600 hover:underline">
                返回首页
              </Link>
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <GameResultModal
      open
      result={resultData}
      initialSelectedPlayerId={Number(playerId)}
      loading={isLoading}
      onBackLobby={handleBackLobby}
      onReplay={handleReplay}
      backLoading={isReturningLobby}
      replayLoading={isRematching}
      actionError={actionError}
    />
  );
}
