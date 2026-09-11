'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ThemePreference } from '../types';

interface ThemeContextValue { preference: ThemePreference; setPreference: (preference: ThemePreference) => void; }
const ThemeContext = createContext<ThemeContextValue>({ preference: 'system', setPreference: () => {} });

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    const saved = localStorage.getItem('jetpesa-theme');
    const isThemePreference = (value: string | null): value is ThemePreference =>
      value === 'system' || value === 'light' || value === 'dark';
    setPreferenceState(isThemePreference(saved) ? saved : 'system');
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const nextTheme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
    };
    apply();
    if (preference === 'system') media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  const setPreference = (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    localStorage.setItem('jetpesa-theme', nextPreference);
    const nextTheme = resolveTheme(nextPreference);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
  };

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useContext(ThemeContext);
  return (
    <div className={`theme-selector${compact ? ' theme-selector--compact' : ''}`} aria-label="Color theme">
      {(['system', 'light', 'dark'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={preference === option}
          onClick={() => setPreference(option)}
        >
          {option === 'system' ? 'Auto' : option[0].toUpperCase() + option.slice(1)}
        </button>
      ))}
    </div>
  );
}

export const useTheme = () => useContext(ThemeContext);