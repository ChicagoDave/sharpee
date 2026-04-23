/**
 * ParticipantRoster — renders the side roster of room participants with
 * their tier, connection dot, lock-holder marker, and mute indicator.
 * Rows that fall under the viewer's moderation authority also show a
 * per-row action menu (mute/unmute in Plan 02 Phase 2; promote/demote in
 * Phase 3).
 *
 * Public interface: {@link ParticipantRoster} default export,
 * {@link ParticipantRosterProps}.
 *
 * Bounded context: client room view (ADR-153 Decision 4).
 */

import ParticipantMenu from './ParticipantMenu';
import type { Sender } from '../api/ws';
import { canModerate } from '../state/authority';
import type { ParticipantSummary, Tier } from '../types/wire';

export interface ParticipantRosterProps {
  participants: ParticipantSummary[];
  /** Participant that currently holds the command-entry lock, if any. */
  lockHolderId: string | null;
  /** The viewing participant — rendered with a "(you)" marker. */
  selfId: string | null;
  /**
   * Viewer's tier, used to decide whether each row gets an action menu.
   * `null` means the viewer is not yet placed in the roster (pre-hydration)
   * — no menus are shown in that case.
   */
  selfTier?: Tier | null;
  /**
   * Sender for action-menu dispatches. Required when a menu can appear.
   * When `selfTier` gives the viewer no moderation authority, menus never
   * render and `send` is unused.
   */
  send?: Sender;
  /**
   * Optional callback threaded into ParticipantMenu's "DM {name}" item.
   * Only the PH→Co-Host cell renders it; every other viewer/target pair
   * ignores the prop. Expected to open the DM tab for the peer.
   */
  onOpenDm?: (peer_participant_id: string) => void;
}

const TIER_LABEL: Record<Tier, string> = {
  primary_host: 'Host',
  co_host: 'Co-host',
  command_entrant: 'Typist',
  participant: 'Observer',
};

export default function ParticipantRoster({
  participants,
  lockHolderId,
  selfId,
  selfTier = null,
  send,
  onOpenDm,
}: ParticipantRosterProps): JSX.Element {
  const viewer =
    selfId !== null && selfTier !== null
      ? { participant_id: selfId, tier: selfTier }
      : null;
  if (participants.length === 0) {
    return (
      <p
        role="status"
        style={{
          color: 'var(--sharpee-text-muted)',
          fontStyle: 'italic',
          padding: 'var(--sharpee-spacing-md)',
        }}
      >
        No participants.
      </p>
    );
  }

  return (
    <ul
      aria-label="Participants"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 'var(--sharpee-spacing-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {participants.map((p) => {
        const isLockHolder = lockHolderId === p.participant_id;
        const isSelf = selfId === p.participant_id;
        return (
          <li
            key={p.participant_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sharpee-spacing-xs)',
              padding: '4px 8px',
              borderRadius: 'var(--sharpee-border-radius)',
              background: isLockHolder
                ? 'color-mix(in srgb, var(--sharpee-accent) 15%, transparent)'
                : 'transparent',
            }}
          >
            <span
              aria-label={p.connected ? 'Connected' : 'Disconnected'}
              title={p.connected ? 'Connected' : 'Disconnected'}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: p.connected
                  ? 'var(--sharpee-success, #2a9d5f)'
                  : 'var(--sharpee-text-muted)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
              {p.display_name}
              {isSelf && (
                <span style={{ color: 'var(--sharpee-text-muted)', fontWeight: 400 }}>
                  {' (you)'}
                </span>
              )}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--sharpee-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {TIER_LABEL[p.tier]}
            </span>
            {isLockHolder && (
              <span
                aria-label="Holds command lock"
                title="Holds command lock"
                style={{ fontSize: '0.75rem', color: 'var(--sharpee-accent)' }}
              >
                ⌨
              </span>
            )}
            {p.muted && (
              <span
                aria-label="Muted"
                title="Muted"
                style={{ fontSize: '0.75rem', color: 'var(--sharpee-text-muted)' }}
              >
                🔇
              </span>
            )}
            {send && viewer && canModerate(viewer, p) && (
              <ParticipantMenu
                viewer={viewer}
                target={p}
                send={send}
                onOpenDm={onOpenDm}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
