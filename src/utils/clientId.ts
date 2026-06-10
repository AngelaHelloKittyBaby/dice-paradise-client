const GUEST_CLIENT_ID_STORAGE_KEY = 'dice-paradise-guest-client-id';

function createGuestClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `guest-${crypto.randomUUID()}`;
  }

  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateClientId(preferredClientId?: string | null) {
  const normalizedClientId = preferredClientId?.trim();

  if (normalizedClientId) return normalizedClientId;
  if (typeof window === 'undefined') return createGuestClientId();

  try {
    const storedClientId = window.localStorage.getItem(GUEST_CLIENT_ID_STORAGE_KEY)?.trim();

    if (storedClientId) return storedClientId;

    const nextClientId = createGuestClientId();
    window.localStorage.setItem(GUEST_CLIENT_ID_STORAGE_KEY, nextClientId);

    return nextClientId;
  } catch {
    return createGuestClientId();
  }
}
