/**
 * SavePanel — modal dialog that hosts the Save button (CE+) and Save list.
 *
 * Public interface: {@link SavePanel} default export, {@link SavePanelProps}.
 *
 * Bounded context: client save/restore (Plan 03 Phase 1). Uses the shared
 * Modal primitive for focus trap + Esc close. The header surface opens
 * this from a disk-icon button visible to every tier; the Save button
 * inside respects the CE+ authority rule (ADR-153 D10).
 */

import Modal from './Modal';
import SaveButton from './SaveButton';
import SaveList, { type SaveListEntry } from './SaveList';
import type { Sender } from '../api/ws';
import type { Tier } from '../types/wire';

export interface SavePanelProps {
  open: boolean;
  onClose: () => void;
  saves: SaveListEntry[];
  selfTier: Tier | null;
  send: Sender;
  onRestore?: (save_id: string) => void;
}

const CAN_SAVE: readonly Tier[] = ['primary_host', 'co_host', 'command_entrant'];

export default function SavePanel({
  open,
  onClose,
  saves,
  selfTier,
  send,
  onRestore,
}: SavePanelProps): JSX.Element | null {
  if (!open) return null;
  const canSave = selfTier !== null && CAN_SAVE.includes(selfTier);
  return (
    <Modal title="Saves" onClose={onClose}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sharpee-spacing-md)',
          minWidth: 320,
        }}
      >
        {canSave && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <SaveButton send={send} />
          </div>
        )}
        <SaveList saves={saves} onRestore={onRestore} />
      </div>
    </Modal>
  );
}
