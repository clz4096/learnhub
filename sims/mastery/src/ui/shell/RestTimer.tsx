/**
 * The gym's rest timer: 1:30 between sets. Press to start, press again to stop. At zero it
 * buzzes (where the device can) and says go; the countdown is not announced each second.
 */
import { useEffect, useState } from 'preact/hooks';
import { buzz } from '@/ui/shell/state';

export const REST_SECONDS = 90;

const mmss = (n: number): string => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

export function RestTimer() {
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      setLeft(null);
      setDone(true);
      buzz([200, 100, 200]);
      return;
    }
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const running = left !== null;
  return (
    <>
      <button
        type="button" class="ds-rest" aria-pressed={running}
        aria-label={running ? `Rest timer, ${mmss(left)} left. Press to stop.` : done ? 'Rest is over. Press to rest again for 1:30.' : 'Rest for 1:30'}
        onClick={() => { setDone(false); setLeft(running ? null : REST_SECONDS); }}
      >
        {running ? `rest ${mmss(left)}` : done ? 'go' : `rest ${mmss(REST_SECONDS)}`}
      </button>
      <span class="visually-hidden" role="status">{done ? 'Rest is over. Next set.' : ''}</span>
    </>
  );
}
