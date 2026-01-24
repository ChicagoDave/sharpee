/**
 * NotesPanel - Player notepad with auto-save
 */

import React, { useCallback } from 'react';
import { useNotes } from '../../hooks/useNotes';

interface NotesPanelProps {
  storyId?: string;
  className?: string;
  placeholder?: string;
}

export function NotesPanel({
  storyId = 'default',
  className = '',
  placeholder = 'Type your notes here...\n\nHints, puzzle solutions, map sketches...',
}: NotesPanelProps) {
  const { notes, setNotes, clearNotes, isDirty } = useNotes(storyId);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
    },
    [setNotes]
  );

  const handleClear = useCallback(() => {
    if (window.confirm('Clear all notes? This cannot be undone.')) {
      clearNotes();
    }
  }, [clearNotes]);

  return (
    <div className={`notes-panel ${className}`}>
      <div className="notes-panel__header">
        <span className="notes-panel__title">Notes</span>
        <span className="notes-panel__status">
          {isDirty ? 'Saving...' : 'Saved'}
        </span>
      </div>
      <textarea
        className="notes-panel__textarea"
        value={notes}
        onChange={handleChange}
        placeholder={placeholder}
        spellCheck={false}
      />
      <div className="notes-panel__footer">
        <button
          type="button"
          className="notes-panel__clear"
          onClick={handleClear}
          disabled={!notes}
        >
          Clear Notes
        </button>
      </div>
    </div>
  );
}

/**
 * CSS styles for NotesPanel
 */
export const notesPanelStyles = `
.notes-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.notes-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.notes-panel__title {
  font-weight: bold;
}

.notes-panel__status {
  opacity: 0.6;
  font-size: 0.75rem;
}

.notes-panel__textarea {
  flex: 1;
  width: 100%;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
  font: inherit;
  font-size: 0.875rem;
  resize: none;
  outline: none;
}

.notes-panel__textarea:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.notes-panel__textarea::placeholder {
  opacity: 0.5;
}

.notes-panel__footer {
  margin-top: 0.5rem;
  text-align: right;
}

.notes-panel__clear {
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

.notes-panel__clear:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.notes-panel__clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;
