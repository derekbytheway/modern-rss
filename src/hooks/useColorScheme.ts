import { useState, useEffect, useCallback } from 'react';

type ColorScheme = 'light' | 'dark';
type StoredScheme = ColorScheme | null;

const STORAGE_KEY = 'color-scheme';

function getSystemScheme(): ColorScheme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredScheme(): StoredScheme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function syncMetaTag(stored: StoredScheme) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = stored ?? 'light dark';
  }
}

/**
 * Manages the site's light/dark color-scheme override via `<meta name="color-scheme">`
 * and `localStorage`, defaulting to the OS preference when no override is stored.
 */
export function useColorScheme() {
  const [storedScheme, setStoredScheme] = useState<StoredScheme>(() => readStoredScheme());
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(() => getSystemScheme());

  useEffect(() => {
    syncMetaTag(storedScheme);
  }, [storedScheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setSystemScheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : null;
        setStoredScheme(next);
        syncMetaTag(next);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const resolvedTheme: ColorScheme = storedScheme ?? systemScheme;

  const toggleTheme = useCallback(() => {
    const currentRendered: ColorScheme = storedScheme ?? systemScheme;
    const target: ColorScheme = currentRendered === 'dark' ? 'light' : 'dark';
    const nextStored: StoredScheme = target === systemScheme ? null : target;

    try {
      if (nextStored === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, nextStored);
      }
    } catch {
      // Continue updating DOM even if storage is blocked
    }

    setStoredScheme(nextStored);
    syncMetaTag(nextStored);
  }, [storedScheme, systemScheme]);

  return { resolvedTheme, toggleTheme };
}
