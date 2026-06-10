import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, PlayerSettings, PlayerStats } from '@/types/player';

interface PlayerState {
  player: Player | null;
  stats: PlayerStats | null;
  settings: PlayerSettings;
  isLoggedIn: boolean;
  authToken: string | null;
  tokenType: string | null;
}

interface PlayerActions {
  login: (player: Player, session?: { authToken?: string; tokenType?: string; stats?: PlayerStats }) => void;
  logout: () => void;
  updatePlayer: (data: Partial<Player>) => void;
  updateSettings: (settings: Partial<PlayerSettings>) => void;
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  addExp: (amount: number) => void;
}

type PlayerStore = PlayerState & PlayerActions;

const defaultSettings: PlayerSettings = {
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 80,
  musicVolume: 50,
  language: 'zh',
  theme: 'light',
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // State
      player: null,
      stats: null,
      settings: defaultSettings,
      isLoggedIn: false,
      authToken: null,
      tokenType: null,

      // Actions
      login: (player, session) => set((state) => ({
        player,
        stats: session?.stats ?? state.stats,
        isLoggedIn: true,
        authToken: session?.authToken ?? state.authToken,
        tokenType: session?.tokenType ?? state.tokenType,
      })),

      logout: () => set({ player: null, stats: null, isLoggedIn: false, authToken: null, tokenType: null }),

      updatePlayer: (data) => set((state) => ({
        player: state.player ? { ...state.player, ...data } : null,
      })),

      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings },
      })),

      addCoins: (amount) => set((state) => ({
        player: state.player
          ? { ...state.player, coins: state.player.coins + amount }
          : null,
      })),

      addGems: (amount) => set((state) => ({
        player: state.player
          ? { ...state.player, gems: state.player.gems + amount }
          : null,
      })),

      addExp: (amount) => {
        const state = get();
        if (!state.player) return;

        const newExp = state.player.exp + amount;
        const expPerLevel = 200;
        let newLevel = state.player.level;
        let remainingExp = newExp;

        while (remainingExp >= (newLevel + 1) * expPerLevel) {
          newLevel++;
        }

        set({
          player: {
            ...state.player,
            exp: remainingExp,
            level: newLevel,
          },
        });
      },
    }),
    {
      name: 'dice-paradise-player',
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<PlayerStore>;

        return {
          ...currentState,
          ...state,
          settings: {
            ...currentState.settings,
            ...state.settings,
          },
        };
      },
      partialize: (state) => ({
        player: state.player,
        isLoggedIn: state.isLoggedIn,
        settings: state.settings,
        authToken: state.authToken,
        tokenType: state.tokenType,
      }),
    }
  )
);
