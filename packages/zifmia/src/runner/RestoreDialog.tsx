/**
 * RestoreDialog — modal for loading a saved game
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StorageProvider, SaveSlotInfo } from '../storage/index.js';

export interface RestoreDialogProps {
  storageProvider: StorageProvider;
  storyId: string;
  onRestore: (slotName: string) => void;
  onCancel: () => void;
}

export function RestoreDialog({ storageProvider, storyId, onRestore, onCancel }: RestoreDialogProps) {
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    storageProvider.listSlots(storyId).then((all) => {
      // Filter out autosave (handled automatically) and sort newest first
      const sorted = all
        .filter((s) => s.name !== 'autosave')
        .sort((a, b) => b.timestamp - a.timestamp);
      setSlots(sorted);
      // Auto-focus the Restore button after loading
      setTimeout(() => restoreButtonRef.current?.focus(), 50);
    });
  }, [storageProvider, storyId]);

  const selected = slots[selectedIndex]?.name ?? null;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onCancel(); return; }
    if (e.key === 'Enter' && selected) { onRestore(selected); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(0, i - 1));
      setConfirmDelete(null);
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(slots.length - 1, i + 1));
      setConfirmDelete(null);
    }
  }, [selected, slots.length, onRestore, onCancel]);

  async function handleDelete(slotName: string) {
    if (confirmDelete !== slotName) {
      setConfirmDelete(slotName);
      return;
    }
    await storageProvider.deleteSlot(storyId, slotName);
    const updated = slots.filter((s) => s.name !== slotName);
    setSlots(updated);
    if (selectedIndex >= updated.length) {
      setSelectedIndex(Math.max(0, updated.length - 1));
    }
    setConfirmDelete(null);
  }

  return (
    <div className="zifmia-dialog-overlay" onClick={onCancel}>
      <div
        className="zifmia-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-label="Restore Game"
      >
        <h2>Restore Game</h2>

        {slots.length === 0 ? (
          <p>No saved games found.</p>
        ) : (
          <div className="zifmia-dialog-slots">
            <ul>
              {slots.map((slot, index) => (
                <li
                  key={slot.name}
                  className={index === selectedIndex ? 'selected' : ''}
                  onClick={() => { setSelectedIndex(index); setConfirmDelete(null); }}
                  onDoubleClick={() => onRestore(slot.name)}
                >
                  <strong>{slot.name}</strong>
                  <span> — Turn {slot.turnCount}, {slot.location}</span>
                  <span className="zifmia-dialog-date">
                    {new Date(slot.timestamp).toLocaleString()}
                  </span>
                  <button
                    className="zifmia-dialog-delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(slot.name); }}
                    tabIndex={0}
                  >
                    {confirmDelete === slot.name ? 'Confirm?' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="zifmia-dialog-buttons">
          <button
            ref={restoreButtonRef}
            onClick={() => selected && onRestore(selected)}
            disabled={!selected}
          >
            Restore
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
