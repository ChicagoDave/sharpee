/**
 * CrashNoticeModal — surfaces a sandbox crash (ADR-153 AC7) as a full-width
 * modal with a clear restore affordance.
 *
 * Public interface: {@link CrashNoticeModal} default export,
 * {@link CrashNoticeModalProps}.
 *
 * Bounded context: client crash recovery (Plan 03 Phase 4). When a save
 * exists, the primary action routes through the Phase 2 confirm-restore
 * flow (via the injected `onRestoreLatest` callback). When no save exists
 * the modal explains that the room cannot recover without one; the only
 * remedy is the host closing the room via the settings panel's Delete flow.
 *
 * The copy is deliberately plain: ADR-153 asks us not to leak runtime
 * internals to end users.
 */

import Button from './Button';
import Modal from './Modal';
import type { SaveListEntry } from './SaveList';

export interface CrashNoticeModalProps {
  /** Most recent save, or null when the room has never been saved. */
  latestSave: SaveListEntry | null;
  /**
   * Invoked when the user clicks "Restore from last save". Implementation
   * is expected to open the Phase 2 RestoreConfirmDialog for the latest
   * save; confirm dispatches `sendRestore`.
   */
  onRestoreLatest: () => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function CrashNoticeModal({
  latestSave,
  onRestoreLatest,
}: CrashNoticeModalProps): JSX.Element {
  const canRestore = latestSave !== null;
  return (
    <Modal
      title="Story runtime stopped"
      onClose={() => {
        /* crash is global — close is intentionally a no-op */
      }}
      footer={
        canRestore ? (
          <Button
            variant="primary"
            onClick={onRestoreLatest}
            aria-label="Restore from last save"
          >
            Restore from last save
          </Button>
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sharpee-spacing-md)' }}>
        <p style={{ margin: 0 }}>
          The story process stopped unexpectedly. The room is still active —
          nobody has left — but new turns can&rsquo;t be played until a save
          is restored.
        </p>
        {canRestore ? (
          <p style={{ margin: 0, color: 'var(--sharpee-text-muted)', fontSize: '0.9rem' }}>
            Most recent save: <strong>{latestSave.name || '(unnamed)'}</strong>
            {' '}· {formatTimestamp(latestSave.created_at)}
          </p>
        ) : (
          <p
            role="status"
            style={{
              margin: 0,
              color: 'var(--sharpee-text-muted)',
              fontStyle: 'italic',
            }}
          >
            No saves are available. The host can close the room from the
            settings panel.
          </p>
        )}
      </div>
    </Modal>
  );
}
