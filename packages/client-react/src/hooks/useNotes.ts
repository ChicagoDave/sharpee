/**
 * useNotes - Hook for managing player notes with localStorage persistence
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'sharpee-notes-';

interface UseNotesResult {
  /** Current notes content */
  notes: string;
  /** Update notes content */
  setNotes: (notes: string) => void;
  /** Clear all notes */
  clearNotes: () => void;
  /** Whether notes have been modified since last save */
  isDirty: boolean;
  /** Manually save notes (auto-saves on change) */
  saveNotes: () => void;
}

/**
 * Hook for managing player notes with localStorage persistence
 *
 * @param storyId - Unique identifier for the story (used for storage key)
 */
export function useNotes(storyId: string = 'default'): UseNotesResult {
  const storageKey = `${STORAGE_KEY_PREFIX}${storyId}`;

  // Load initial notes from localStorage
  const [notes, setNotesState] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) || '';
    } catch {
      return '';
    }
  });

  const [isDirty, setIsDirty] = useState(false);

  // Save notes to localStorage
  const saveNotes = useCallback(() => {
    try {
      localStorage.setItem(storageKey, notes);
      setIsDirty(false);
    } catch (e) {
      console.warn('Failed to save notes to localStorage:', e);
    }
  }, [storageKey, notes]);

  // Update notes and mark as dirty
  const setNotes = useCallback((newNotes: string) => {
    setNotesState(newNotes);
    setIsDirty(true);
  }, []);

  // Clear notes
  const clearNotes = useCallback(() => {
    setNotesState('');
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
    setIsDirty(false);
  }, [storageKey]);

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      saveNotes();
    }, 500);

    return () => clearTimeout(timer);
  }, [notes, isDirty, saveNotes]);

  return {
    notes,
    setNotes,
    clearNotes,
    isDirty,
    saveNotes,
  };
}
