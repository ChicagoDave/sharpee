/**
 * RestoreDialog — modal for loading a saved game
 */

import React, { useState, useEffect } from 'react';
import type { StorageProvider, SaveSlotInfo } from '../storage/index.js';

export interface RestoreDialogProps {
  storageProvider: StorageProvider;
  storyId: string;
  onRestore: (slotName: string) => void;
  onCancel: () => void;
}

export function RestoreDialog({ storageProvider, storyId, onRestore, onCancel }: RestoreDialogProps) {
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    storageProvider.listSlots(storyId).then((all) => {
      // Sort newest first, autosave at top
      const sorted = all.slice().sort((a, b) => {
        if (a.name === 'autosave') return -1;
        if (b.name === 'autosave') return 1;
        return b.timestamp - a.timestamp;
      });
      setSlots(sorted);
      if (sorted.length > 0) setSelected(sorted[0].name);
    });
  }, [storageProvider, storyId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && selected) onRestore(selected);
  }

  async function handleDelete(slotName: string) {
    if (confirmDelete !== slotName) {
      setConfirmDelete(slotName);
      return;
    }
    await storageProvider.deleteSlot(storyId, slotName);
    const updated = slots.filter((s) => s.name !== slotName);
    setSlots(updated);
    if (selected === slotName) {
      setSelected(updated.length > 0 ? updated[0].name : null);
    }
    setConfirmDelete(null);
  }

  return (
    <div className="zifmia-dialog-overlay" onClick={onCancel}>
      <div className="zifmia-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown} role="dialog" aria-label="Restore Game">
        <h2>Restore Game</h2>

        {slots.length === 0 ? (
          <p>No saved games found.</p>
        ) : (
          <div className="zifmia-dialog-slots">
            <ul>
              {slots.map((slot) => (
                <li
                  key={slot.name}
                  className={selected === slot.name ? 'selected' : ''}
                  onClick={() => { setSelected(slot.name); setConfirmDelete(null); }}
                  onDoubleClick={() => onRestore(slot.name)}
                >
                  <strong>{slot.name === 'autosave' ? 'Auto-save' : slot.name}</strong>
                  <span> — Turn {slot.turnCount}, {slot.location}</span>
                  <span className="zifmia-dialog-date">
                    {new Date(slot.timestamp).toLocaleString()}
                  </span>
                  {slot.name !== 'autosave' && (
                    <button
                      className="zifmia-dialog-delete"
                      onClick={(e) => { e.stopPropagation(); handleDelete(slot.name); }}
                    >
                      {confirmDelete === slot.name ? 'Confirm?' : 'Delete'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="zifmia-dialog-buttons">
          <button onClick={() => selected && onRestore(selected)} disabled={!selected}>
            Restore
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
