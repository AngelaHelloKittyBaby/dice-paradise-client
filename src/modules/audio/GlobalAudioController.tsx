'use client';

import { useEffect, useRef, useState } from 'react';
import backgroundMusicSrc from '@/assets/audio/bgm/backgroundMusic.mp3';
import diceRollingSrc from '@/assets/audio/dice/DiceRolling.mp3';
import buttonSoundSrc from '@/assets/audio/reward/button.mp3';
import { usePlayerStore } from '@/stores/playerStore';
import { DICE_ROLL_AUDIO_EVENT } from './audioEvents';

const BUTTON_AUDIO_SELECTOR = 'button, [role="button"]';
const BUTTON_AUDIO_KEYS = new Set(['Enter', ' ']);

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 1;

  return Math.max(0, Math.min(1, value / 100));
}

function prepareAudio(src: string, options: { loop?: boolean } = {}) {
  const audio = new Audio(src);

  audio.preload = 'auto';
  audio.loop = Boolean(options.loop);

  return audio;
}

function restartAudio(audio: HTMLAudioElement) {
  audio.pause();

  try {
    audio.currentTime = 0;
  } catch {
    audio.load();
  }

  void audio.play().catch(() => undefined);
}

export function GlobalAudioController() {
  const [isInitialized, setIsInitialized] = useState(false);
  const soundEnabled = usePlayerStore(state => state.settings.soundEnabled);
  const musicEnabled = usePlayerStore(state => state.settings.musicEnabled);
  const soundVolume = usePlayerStore(state => state.settings.soundVolume);
  const musicVolume = usePlayerStore(state => state.settings.musicVolume);
  const isLoggedIn = usePlayerStore(state => state.isLoggedIn);
  const player = usePlayerStore(state => state.player);
  const authToken = usePlayerStore(state => state.authToken);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const diceRollingRef = useRef<HTMLAudioElement | null>(null);
  const buttonSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const checkHydration = () => {
      if (usePlayerStore.persist.hasHydrated()) {
        initializeAudio();
      } else {
        const unsubscribe = usePlayerStore.persist.onFinishHydration(() => {
          initializeAudio();
          unsubscribe();
        });
        return unsubscribe;
      }
    };

    const initializeAudio = () => {
      backgroundMusicRef.current = prepareAudio(backgroundMusicSrc, { loop: true });
      diceRollingRef.current = prepareAudio(diceRollingSrc);
      buttonSoundRef.current = prepareAudio(buttonSoundSrc);
      setIsInitialized(true);
    };

    const cleanup = checkHydration();

    return () => {
      cleanup?.();
      backgroundMusicRef.current?.pause();
      diceRollingRef.current?.pause();
      buttonSoundRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = clampVolume(musicVolume);
    }

    if (diceRollingRef.current) {
      diceRollingRef.current.volume = clampVolume(soundVolume);
    }

    if (buttonSoundRef.current) {
      buttonSoundRef.current.volume = clampVolume(soundVolume);
    }
  }, [isInitialized, musicVolume, soundVolume]);

  useEffect(() => {
    if (!isInitialized) return;

    const backgroundMusic = backgroundMusicRef.current;
    const hasLoggedInSession = Boolean(isLoggedIn && player && authToken?.trim());
    const canPlayMusic = hasLoggedInSession && soundEnabled && musicEnabled !== false;

    if (!backgroundMusic) return;

    if (!canPlayMusic) {
      backgroundMusic.pause();
      return;
    }

    const playBackgroundMusic = () => {
      void backgroundMusic.play().catch(() => undefined);
    };

    playBackgroundMusic();

    window.addEventListener('pointerdown', playBackgroundMusic, true);
    window.addEventListener('keydown', playBackgroundMusic, true);

    return () => {
      window.removeEventListener('pointerdown', playBackgroundMusic, true);
      window.removeEventListener('keydown', playBackgroundMusic, true);
    };
  }, [authToken, isInitialized, isLoggedIn, musicEnabled, player, soundEnabled]);

  useEffect(() => {
    if (!isInitialized) return;

    const playButtonSound = (target: EventTarget | null) => {
      if (!soundEnabled) return;

      if (!(target instanceof Element)) return;
      if (!target.closest(BUTTON_AUDIO_SELECTOR)) return;

      const buttonSound = buttonSoundRef.current;
      if (buttonSound) restartAudio(buttonSound);
    };

    const handleButtonPointerDown = (event: PointerEvent) => {
      playButtonSound(event.target);
    };

    const handleButtonKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (!BUTTON_AUDIO_KEYS.has(event.key)) return;

      playButtonSound(event.target);
    };

    document.addEventListener('pointerdown', handleButtonPointerDown, true);
    document.addEventListener('keydown', handleButtonKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handleButtonPointerDown, true);
      document.removeEventListener('keydown', handleButtonKeyDown, true);
    };
  }, [isInitialized, soundEnabled]);

  useEffect(() => {
    if (!isInitialized) return;

    const handleDiceRollAudio = () => {
      if (!soundEnabled) return;

      const diceRolling = diceRollingRef.current;
      if (diceRolling) restartAudio(diceRolling);
    };

    window.addEventListener(DICE_ROLL_AUDIO_EVENT, handleDiceRollAudio);

    return () => {
      window.removeEventListener(DICE_ROLL_AUDIO_EVENT, handleDiceRollAudio);
    };
  }, [isInitialized, soundEnabled]);

  return null;
}
