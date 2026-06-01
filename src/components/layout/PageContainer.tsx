'use client';

import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import type { Player } from '@/types';

export interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showFooter?: boolean;
  headerRight?: React.ReactNode;
  player?: Player | null;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  showBack = false,
  showFooter = true,
  headerRight,
  player,
  className,
}) => {
  return (
    <div className="min-h-screen bg-transparent">
      <Header
        player={player}
        showBack={showBack}
        title={title}
        rightAction={headerRight}
      />
      <main className={className}>{children}</main>
      {showFooter && <Footer />}
    </div>
  );
};
