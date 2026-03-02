'use client';
import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('elk-theme') as Theme) ?? 'dark';
}

let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function emitChange() {
  for (const l of listeners) l();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme);

  const toggleTheme = useCallback(() => {
    const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('elk-theme', next);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(next);
    emitChange();
  }, []);

  return { theme, toggleTheme };
}
