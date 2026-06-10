'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loading } from '@/components/ui';
import { isInvalidAuthTokenError, verifyAuthToken } from '@/modules/auth/authApi';
import { usePlayerStore } from '@/stores';

const protectedRoutes = ['/', '/game', '/room', '/profile', '/result', '/activity', '/leaderboard'];
const authRoutes = ['/login'];

function isRouteMatch(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (isRouteMatch(value, '/login')) return '/';

  return value;
}

function getCurrentPathWithSearch(pathname: string) {
  if (typeof window === 'undefined') return pathname;

  return `${pathname}${window.location.search}`;
}

function getLoginRedirectUrl(pathname: string) {
  const loginUrl = new URLSearchParams({
    mode: 'login',
    reason: 'auth-required',
    redirect: getCurrentPathWithSearch(pathname),
  });

  return `/login?${loginUrl.toString()}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1];
  if (!payload || typeof window === 'undefined') return null;

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');

    return JSON.parse(window.atob(paddedPayload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isExpiredJwt(token: string | null) {
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  const expiresAt = payload?.exp;

  return typeof expiresAt === 'number' && expiresAt * 1000 <= Date.now();
}

function isInvalidGameEntry(pathname: string) {
  if (!isRouteMatch(pathname, '/game') || typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);

  return !params.get('gameId') && params.get('pendingCreate') !== '1';
}

function isInvalidResultEntry(pathname: string) {
  if (!isRouteMatch(pathname, '/result') || typeof window === 'undefined') return false;

  return !new URLSearchParams(window.location.search).get('gameId');
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const player = usePlayerStore(state => state.player);
  const isLoggedIn = usePlayerStore(state => state.isLoggedIn);
  const authToken = usePlayerStore(state => state.authToken);
  const tokenType = usePlayerStore(state => state.tokenType);
  const logout = usePlayerStore(state => state.logout);
  const [isHydrated, setIsHydrated] = useState(false);
  const [verifiedAuthKey, setVerifiedAuthKey] = useState<string | null>(null);
  const normalizedAuthToken = authToken?.trim() ?? '';
  const normalizedTokenType = tokenType?.trim() || 'Bearer';
  const authVerificationKey = normalizedAuthToken ? `${normalizedTokenType}:${normalizedAuthToken}` : null;
  const hasExpiredAuthToken = isExpiredJwt(authToken);
  const hasLocallyValidSession = Boolean(isLoggedIn && player && normalizedAuthToken && !hasExpiredAuthToken);
  const isAuthVerificationPending = Boolean(
    isHydrated && hasLocallyValidSession && authVerificationKey !== verifiedAuthKey
  );
  const hasSession = hasLocallyValidSession && !isAuthVerificationPending;

  const routeState = useMemo(() => ({
    isAuthRoute: authRoutes.some(route => isRouteMatch(pathname, route)),
    isProtectedRoute: protectedRoutes.some(route => isRouteMatch(pathname, route)),
  }), [pathname]);

  useEffect(() => {
    if (usePlayerStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return usePlayerStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (hasExpiredAuthToken) {
      logout();
      setVerifiedAuthKey(null);
      return;
    }

    if (!hasLocallyValidSession || !authVerificationKey) {
      setVerifiedAuthKey(null);
      return;
    }

    let isCancelled = false;

    verifyAuthToken({
      token: normalizedAuthToken,
      tokenType,
    })
      .then(() => {
        if (!isCancelled) setVerifiedAuthKey(authVerificationKey);
      })
      .catch(error => {
        if (isCancelled) return;

        if (isInvalidAuthTokenError(error)) {
          setVerifiedAuthKey(null);
          logout();
          return;
        }

        console.warn('[AuthGuard] Token validation is unavailable, keeping local session.', error);
        setVerifiedAuthKey(authVerificationKey);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    authVerificationKey,
    hasExpiredAuthToken,
    hasLocallyValidSession,
    isHydrated,
    logout,
    normalizedAuthToken,
    tokenType,
  ]);

  useEffect(() => {
    if (!isHydrated || isAuthVerificationPending) return;

    if (hasExpiredAuthToken) {
      logout();
      return;
    }

    if (routeState.isAuthRoute && hasSession) {
      const redirectPath = getSafeRedirectPath(new URLSearchParams(window.location.search).get('redirect'));
      router.replace(redirectPath);
      return;
    }

    if (routeState.isProtectedRoute && !hasSession) {
      router.replace(getLoginRedirectUrl(pathname));
      return;
    }

    if (hasSession && (isInvalidGameEntry(pathname) || isInvalidResultEntry(pathname))) {
      router.replace('/');
    }
  }, [
    hasExpiredAuthToken,
    hasSession,
    isAuthVerificationPending,
    isHydrated,
    logout,
    pathname,
    routeState.isAuthRoute,
    routeState.isProtectedRoute,
    router,
  ]);

  if (routeState.isProtectedRoute && (!isHydrated || isAuthVerificationPending || !hasSession)) {
    return <Loading fullScreen size="lg" text="骰子就位，快艇启航，加载中..." />;
  }

  if (routeState.isAuthRoute && isHydrated && (isAuthVerificationPending || hasSession)) {
    return <Loading fullScreen size="lg" text="正在确认航线..." />;
  }

  if (hasSession && isHydrated && (isInvalidGameEntry(pathname) || isInvalidResultEntry(pathname))) {
    return <Loading fullScreen size="lg" text="正在返回大厅..." />;
  }

  return <>{children}</>;
}
