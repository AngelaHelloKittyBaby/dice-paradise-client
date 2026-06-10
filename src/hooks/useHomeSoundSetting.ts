import { useCallback, useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores';

interface UseHomeSoundSettingResult {
  soundEnabled: boolean;
  setSoundEnabled: (nextEnabled: boolean) => void;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export function useHomeSoundSetting(
  _clientId: string | null | undefined,
  fallbackEnabled: boolean
): UseHomeSoundSettingResult {
  const updateSettings = usePlayerStore(state => state.updateSettings);
  const [soundEnabled, setSoundEnabledState] = useState(fallbackEnabled);

  useEffect(() => {
    setSoundEnabledState(fallbackEnabled);
  }, [fallbackEnabled]);

  const setSoundEnabled = useCallback(
    (nextEnabled: boolean) => {
      setSoundEnabledState(nextEnabled);
      updateSettings({
        soundEnabled: nextEnabled,
        musicEnabled: nextEnabled,
      });
    },
    [updateSettings]
  );

  return {
    soundEnabled,
    setSoundEnabled,
    isLoading: false,
    isSaving: false,
    error: null,
  };
}
