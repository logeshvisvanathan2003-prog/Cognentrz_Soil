'use client';
import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';
const STORAGE_KEY = 'cognentrz-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
    }
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    if (typeof document !== 'undefined') {
      if (mode === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}
