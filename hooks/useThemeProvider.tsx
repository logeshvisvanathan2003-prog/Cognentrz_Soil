'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = (typeof window !== 'undefined'
      ? (localStorage.getItem('cognentrz-theme') as Theme | null)
      : null);
    const preferred =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    const initialTheme = saved || preferred;
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    setTheme((t) => {
      const newTheme = t === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('cognentrz-theme', newTheme);
      }
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
