/**
 * CommandInput - Text input for player commands with history support
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useCommandHistory } from '../../hooks/useCommandHistory';

interface CommandInputProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommandInput({
  className = '',
  placeholder = '',
  autoFocus = true,
}: CommandInputProps) {
  const { executeCommand, state } = useGameContext();
  const { value, setValue, addToHistory, handleKeyDown } = useCommandHistory();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount and after each command
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, state.turns]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const command = value.trim();
      if (!command) return;

      addToHistory(command);
      await executeCommand(command);
    },
    [value, addToHistory, executeCommand]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    [setValue]
  );

  return (
    <form className={`command-input-form ${className}`} onSubmit={handleSubmit}>
      <span className="command-prompt">&gt;</span>
      <input
        ref={inputRef}
        type="text"
        className="command-input"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={!state.isPlaying}
      />
    </form>
  );
}
