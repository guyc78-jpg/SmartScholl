import { useState, useEffect, useCallback } from 'react';

// Possible values: 'system' | 'light' | 'dark'
const STORAGE_KEY = 'themePreference';

const getSystemPrefersDark = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const readStoredPreference = () => {
  if (typeof window === 'undefined') return 'system';
  // Migration: legacy 'darkMode' boolean key -> map to explicit light/dark only if it exists
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  const legacy = localStorage.getItem('darkMode');
  if (legacy === 'true') return 'dark';
  if (legacy === 'false') return 'light';
  return 'system';
};

const resolveIsDark = (preference) => {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return getSystemPrefersDark();
};

const applyDarkClass = (isDark) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) root.classList.add('dark');
  else root.classList.remove('dark');
};

export default function useThemePreference() {
  const [preference, setPreferenceState] = useState(() => readStoredPreference());
  const [isDark, setIsDark] = useState(() => resolveIsDark(readStoredPreference()));

  // Apply class whenever isDark changes
  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  // Persist preference and recompute isDark
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, preference); } catch {}
    setIsDark(resolveIsDark(preference));
  }, [preference]);

  // Listen to OS-level changes — only act when in 'system' mode
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => {
      if (preference === 'system') setIsDark(event.matches);
    };
    // Safari < 14 uses addListener/removeListener; modern uses addEventListener
    if (media.addEventListener) media.addEventListener('change', handler);
    else if (media.addListener) media.addListener(handler);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', handler);
      else if (media.removeListener) media.removeListener(handler);
    };
  }, [preference]);

  const setPreference = useCallback((value) => {
    if (!['system', 'light', 'dark'].includes(value)) return;
    setPreferenceState(value);
  }, []);

  // Quick toggle (header/sidebar button): if currently dark -> light, otherwise -> dark
  const toggleDark = useCallback(() => {
    setPreferenceState(isDark ? 'light' : 'dark');
  }, [isDark]);

  return { preference, setPreference, isDark, toggleDark };
}