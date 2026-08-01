import { useCallback, useEffect, useState } from 'react';
import { checkApiHealth } from '../services/chatApiService';

/**
 * Polls BFF /health so the UI can show an offline banner when the API is down.
 */
export function useApiHealth(pollMs = 15_000) {
  const [online, setOnline] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const ok = await checkApiHealth();
    setOnline(ok);
    return ok;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const ok = await checkApiHealth();
      if (!cancelled) setOnline(ok);
    };
    void tick();
    const id = window.setInterval(tick, pollMs);
    const onFocus = () => void tick();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [pollMs]);

  return { online, refresh };
}
