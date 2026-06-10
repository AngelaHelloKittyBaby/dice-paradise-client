'use client';

import { useEffect, useRef } from 'react';
import backgroundMusicSrc from '@/assets/audio/bgm/backgroundMusic.mp3';
import diceRollingSrc from '@/assets/audio/dice/DiceRolling.mp3';
import buttonSoundSrc from '@/assets/audio/reward/button.mp3';
import { usePlayerStore } from '@/stores/playerStore';
import { DICE_ROLL_AUDIO_EVENT } from './audioEvents';

const BUTTON_AUDIO_SELECTOR = 'button, [role="button"]';

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
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function GlobalAudioController() {
  const soundEnabled = usePlayerStore(state => state.settings.soundEnabled);
  const musicEnabled = usePlayerStore(state => state.settings.musicEnabled);
  const soundVolume = usePlayerStore(state => state.settings.soundVolume);
  const musicVolume = usePlayerStore(state => state.settings.musicVolume);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const diceRollingRef = useRef<HTMLAudioElement | null>(null);
  const buttonSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    backgroundMusicRef.current = prepareAudio(backgroundMusicSrc, { loop: true });
    diceRollingRef.current = prepareAudio(diceRollingSrc);
    buttonSoundRef.current = prepareAudio(buttonSoundSrc);

    return () => {
      backgroundMusicRef.current?.pause();
      diceRollingRef.current?.pause();
      buttonSoundRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = clampVolume(musicVolume);
    }

    if (diceRollingRef.current) {
      diceRollingRef.current.volume = clampVolume(soundVolume);
    }

    if (buttonSoundRef.current) {
      buttonSoundRef.current.volume = clampVolume(soundVolume);
    }
  }, [musicVolume, soundVolume]);

  useEffect(() => {
    const backgroundMusic = backgroundMusicRef.current;
    const canPlayMusic = soundEnabled && musicEnabled !== false;

    if (!backgroundMusic) return;

    if (!canPlayMusic) {
      backgroundMusic.pause();
      return;
    }

    void backgroundMusic.play().catch(() => undefined);

    const unlockBackgroundMusic = () => {
      void backgroundMusic.play().catch(() => undefined);
    };

    window.addEventListener('pointerdown', unlockBackgroundMusic, { once: true });
    window.addEventListener('keydown', unlockBackgroundMusic, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockBackgroundMusic);
      window.removeEventListener('keydown', unlockBackgroundMusic);
    };
  }, [musicEnabled, soundEnabled]);

  useEffect(() => {
    const handleButtonClick = (event: MouseEvent) => {
      if (!soundEnabled) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(BUTTON_AUDIO_SELECTOR)) return;

      const buttonSound = buttonSoundRef.current;
      if (buttonSound) restartAudio(buttonSound);
    };

    document.addEventListener('click', handleButtonClick, true);

    return () => {
      document.removeEventListener('click', handleButtonClick, true);
    };
  }, [soundEnabled]);

  useEffect(() => {
    const handleDiceRollAudio = () => {
      if (!soundEnabled) return;

      const diceRolling = diceRollingRef.current;
      if (diceRolling) restartAudio(diceRolling);
    };

    window.addEventListener(DICE_ROLL_AUDIO_EVENT, handleDiceRollAudio);

    return () => {
      window.removeEventListener(DICE_ROLL_AUDIO_EVENT, handleDiceRollAudio);
    };
  }, [soundEnabled]);

  return null;
}
