/**
 * RestoreConfirmDialog — inline "Really restore?" confirmation for the
 * Save list's per-row Restore button.
 *
 * Public interface: {@link RestoreConfirmDialog} default export,
 * {@link RestoreConfirmDialogProps}.
 *
 * Bounded context: client save/restore (Plan 03 Phase 2). Uses the shared
 * Modal primitive. A restore rolls back the entire room's story state
 * (ADR-153 Decision 2); the second prompt is the UX guardrail against
 * accidental clicks.
 */

import Button from './Button';
import Modal from './Modal';

export interface RestoreConfirmDialogProps {
  saveName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RestoreConfirmDialog({
  saveName,
  onConfirm,
  onCancel,
}: RestoreConfirmDialogProps): JSX.Element {
  return (
    <Modal
      title="Restore save"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} aria-label="Confirm restore">
            Restore
          </Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        Really restore <strong>{saveName || '(unnamed)'}</strong>? Any
        unsaved progress will be discarded.
      </p>
    </Modal>
  );
}
