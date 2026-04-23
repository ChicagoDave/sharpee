/**
 * SettingsPanel — Primary-Host-only settings surface. Hosts the pin/unpin
 * toggle, title-rename form, and successor nomination list (Plan 02 Phase 4).
 * Delete-room lands in Phase 5 and will slot in as a final "danger zone"
 * section.
 *
 * Public interface: {@link SettingsPanel} default export,
 * {@link SettingsPanelProps}.
 *
 * Bounded context: client room view (ADR-153 Decisions 3, 6, 12).
 * Implemented as a centered modal dialog via the shared Modal primitive —
 * focus trap, Esc-close, and backdrop-close come for free. The brainstorm's
 * drawer vs. modal open question stays open; polish can swap the shell
 * without touching the contained sections.
 */

import Modal from './Modal';
import SettingsDelete from './SettingsDelete';
import SettingsPin from './SettingsPin';
import SettingsSuccessor from './SettingsSuccessor';
import SettingsTitleEdit from './SettingsTitleEdit';
import type { Sender } from '../api/ws';
import type { ParticipantSummary } from '../types/wire';

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  title: string;
  pinned: boolean;
  participants: ParticipantSummary[];
  designatedSuccessorId: string | null;
  /** PH auth token; required for the HTTP rename call. */
  token: string;
  send: Sender;
}

export default function SettingsPanel({
  open,
  onClose,
  roomId,
  title,
  pinned,
  participants,
  designatedSuccessorId,
  token,
  send,
}: SettingsPanelProps): JSX.Element | null {
  if (!open) return null;
  return (
    <Modal title="Room settings" onClose={onClose}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sharpee-spacing-lg)',
        }}
      >
        <SettingsPin pinned={pinned} send={send} />
        <hr style={{ border: 0, borderTop: '1px solid var(--sharpee-border)' }} />
        <SettingsTitleEdit roomId={roomId} currentTitle={title} token={token} />
        <hr style={{ border: 0, borderTop: '1px solid var(--sharpee-border)' }} />
        <SettingsSuccessor
          participants={participants}
          designatedSuccessorId={designatedSuccessorId}
          send={send}
        />
        <hr style={{ border: 0, borderTop: '1px solid var(--sharpee-border)' }} />
        <SettingsDelete currentTitle={title} send={send} />
      </div>
    </Modal>
  );
}
