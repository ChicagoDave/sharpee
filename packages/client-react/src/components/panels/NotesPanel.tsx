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

