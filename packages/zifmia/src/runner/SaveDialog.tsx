/**
 * SaveDialog — modal for saving a game to a named slot
 */

import React, { useState, useEffect, useRef } from 'react';
import type { StorageProvider, SaveSlotInfo } from '../storage/index.js';

export interface SaveDialogProps {
  storageProvider: StorageProvider;
  storyId: string;
  suggestedName: string;
  onSave: (slotName: string) => void;
  onCancel: () => void;
}

export function SaveDialog({ storageProvider, storyId, suggestedName, onSave, onCancel }: SaveDialogProps) {
  const [name, setName] = useState(suggestedName);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [overwriting, setOverwriting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageProvider.listSlots(storyId).then(setSlots);
  }, [storageProvider, storyId]);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const existingSlot = slots.find((s) => s.name === name && s.name !== 'autosave');

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (existingSlot && !overwriting) {
      setOverwriting(true);
      return;
    }

    onSave(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div className="zifmia-dialog-overlay" onClick={onCancel}>
      <div className="zifmia-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Save Game">
        <h2>Save Game</h2>

        <label>
          Save name:
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setOverwriting(false); }}
            onKeyDown={handleKeyDown}
            maxLength={30}
            autoFocus
          />
        </label>

        {overwriting && existingSlot && (
          <p className="zifmia-dialog-warning">
            A save named "{existingSlot.name}" already exists (turn {existingSlot.turnCount}).
            Press Save again to overwrite.
          </p>
        )}

        {slots.filter((s) => s.name !== 'autosave').length > 0 && (
          <div className="zifmia-dialog-slots">
            <h3>Existing saves:</h3>
            <ul>
              {slots.filter((s) => s.name !== 'autosave').map((slot) => (
                <li
                  key={slot.name}
                  className={slot.name === name ? 'selected' : ''}
                  onClick={() => { setName(slot.name); setOverwriting(false); }}
                >
                  <strong>{slot.name}</strong>
                  <span> — Turn {slot.turnCount}, {slot.location}</span>
                  <span className="zifmia-dialog-date">
                    {new Date(slot.timestamp).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="zifmia-dialog-buttons">
          <button onClick={handleSave} disabled={!name.trim()}>
            {overwriting ? 'Overwrite' : 'Save'}
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
