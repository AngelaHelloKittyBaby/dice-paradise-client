import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthGuard } from '@/components/auth';
import { LazyGlobalSideEffects } from '@/components/common/GlobalSideEffects/LazyGlobalSideEffects';
import { PreventBrowserZoom } from '@/components/layout';
import { GlobalAudioController } from '@/modules/audio/GlobalAudioController';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '投骰乐园 - 快艇骰子游戏',
  description: '经典快艇骰子游戏网页版，支持单人练习、本地多人、在线联机等多种模式',
};

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="dice-paradise-app-shell">{children}</div>
    </AuthGuard>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <PreventBrowserZoom />
        <GlobalAudioController />
        <LazyGlobalSideEffects />
        <AppContent>{children}</AppContent>
      </body>
    </html>
  );
}
