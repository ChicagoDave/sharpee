/**
 * useTheme - Hook for managing runtime theme switching
 *
 * Themes are applied by setting a data-theme attribute on the document root.
 * The theme preference is persisted in localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sharpee-theme';
const DEFAULT_THEME = 'classic-light';

export const AVAILABLE_THEMES = [
  { id: 'classic-light', label: 'Classic Light' },
  { id: 'modern-dark', label: 'Modern Dark' },
  { id: 'retro-terminal', label: 'Retro Terminal' },
  { id: 'paper', label: 'Paper' },
] as const;

export type ThemeId = typeof AVAILABLE_THEMES[number]['id'];

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && AVAILABLE_THEMES.some(t => t.id === stored)) {
      return stored as ThemeId;
    }
    // Check if theme is set via data attribute (from build)
    const dataTheme = document.documentElement.getAttribute('data-theme');
    if (dataTheme && AVAILABLE_THEMES.some(t => t.id === dataTheme)) {
      return dataTheme as ThemeId;
    }
    return DEFAULT_THEME;
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    if (AVAILABLE_THEMES.some(t => t.id === newTheme)) {
      setThemeState(newTheme);
    }
  }, []);

  return { theme, setTheme, availableThemes: AVAILABLE_THEMES };
}
