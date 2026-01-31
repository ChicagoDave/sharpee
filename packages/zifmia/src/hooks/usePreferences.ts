/**
 * usePreferences - Hook for managing player display preferences
 *
 * Preferences are persisted in localStorage. Provides a React context
 * so any component can read preferences without prop drilling.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'sharpee-preferences';

export type IllustrationSize = 'small' | 'medium' | 'large';

export interface PlayerPreferences {
  illustrationsEnabled: boolean;
  illustrationSize: IllustrationSize;
}

const DEFAULTS: PlayerPreferences = {
  illustrationsEnabled: true,
  illustrationSize: 'medium',
};

export const ILLUSTRATION_SIZES: { id: IllustrationSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

interface PreferencesContextValue {
  preferences: PlayerPreferences;
  setPreference: <K extends keyof PlayerPreferences>(key: K, value: PlayerPreferences[K]) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return ctx;
}

function loadPreferences(): PlayerPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULTS };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<PlayerPreferences>(loadPreferences);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const setPreference = useCallback(<K extends keyof PlayerPreferences>(key: K, value: PlayerPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  return React.createElement(
    PreferencesContext.Provider,
    { value: { preferences, setPreference } },
    children
  );
}
