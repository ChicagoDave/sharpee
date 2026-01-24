/**
 * useCommandHistory - Manages command history with arrow key navigation
 */

import { useState, useCallback, useRef } from 'react';

interface UseCommandHistoryResult {
  /** Current input value */
  value: string;
  /** Set the current input value */
  setValue: (value: string) => void;
  /** Add a command to history and clear input */
  addToHistory: (command: string) => void;
  /** Handle keyboard navigation (up/down arrows) */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** History array (for debugging) */
  history: string[];
}

/**
 * Hook for managing command input with history navigation
 */
export function useCommandHistory(maxHistory = 100): UseCommandHistoryResult {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const historyIndex = useRef(-1);
  const savedInput = useRef('');

  const addToHistory = useCallback((command: string) => {
    if (!command.trim()) return;

    setHistory((prev) => {
      // Don't add duplicates of the last command
      if (prev.length > 0 && prev[prev.length - 1] === command) {
        return prev;
      }
      // Limit history size
      const newHistory = [...prev, command];
      if (newHistory.length > maxHistory) {
        return newHistory.slice(-maxHistory);
      }
      return newHistory;
    });

    // Reset navigation state
    historyIndex.current = -1;
    savedInput.current = '';
    setValue('');
  }, [maxHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();

        if (history.length === 0) return;

        // Save current input if starting navigation
        if (historyIndex.current === -1) {
          savedInput.current = value;
        }

        // Move back in history
        const newIndex =
          historyIndex.current === -1
            ? history.length - 1
            : Math.max(0, historyIndex.current - 1);

        historyIndex.current = newIndex;
        setValue(history[newIndex]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();

        if (historyIndex.current === -1) return;

        // Move forward in history
        const newIndex = historyIndex.current + 1;

        if (newIndex >= history.length) {
          // Back to current input
          historyIndex.current = -1;
          setValue(savedInput.current);
        } else {
          historyIndex.current = newIndex;
          setValue(history[newIndex]);
        }
      } else {
        // Any other key resets history navigation
        if (historyIndex.current !== -1) {
          historyIndex.current = -1;
          savedInput.current = '';
        }
      }
    },
    [history, value]
  );

  return {
    value,
    setValue,
    addToHistory,
    handleKeyDown,
    history,
  };
}
