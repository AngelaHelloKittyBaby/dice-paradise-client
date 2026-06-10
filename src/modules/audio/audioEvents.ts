export const DICE_ROLL_AUDIO_EVENT = 'dice-paradise:dice-roll-audio';

export function playDiceRollSound() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(DICE_ROLL_AUDIO_EVENT));
}
