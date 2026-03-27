import { useState, useEffect, useRef } from 'react';

export function useTimer(startTime) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    function tick() {
      setElapsed(Date.now() - startTime);
    }
    tick();
    intervalRef.current = setInterval(tick, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime]);

  return elapsed;
}

export function formatTime(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
