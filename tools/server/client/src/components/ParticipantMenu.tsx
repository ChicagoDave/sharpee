/**
 * ParticipantMenu — per-roster-row action menu. Rendered only when the
 * local viewer has authority over the target participant.
 *
 * Public interface: {@link ParticipantMenu} default export,
 * {@link ParticipantMenuProps}.
 *
 * Bounded context: client room view (ADR-153 Decision 4 authority matrix,
 * Decision 9 mute). The menu is deliberately flat — each authority-checked
 * action is its own item ("Promote to Co-Host", etc.) — so there are no
 * submenu-positioning concerns and each item has a crisp visibility test.
 * The viewer is passed in so per-action authority helpers can be consulted
 * once per render.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  sendDemote,
  sendMute,
  sendPromote,
  sendUnmute,
  type Sender,
} from '../api/ws';
import {
  canDemoteTo,
  canPromoteTo,
  type DemoteToTier,
  type PromoteToTier,
} from '../state/authority';
import type { ParticipantSummary, Tier } from '../types/wire';

export interface ParticipantMenuProps {
  viewer: { participant_id: string; tier: Tier };
  target: ParticipantSummary;
  send: Sender;
  /**
   * When set AND the viewer is PH AND the target is a Co-Host, a "DM
   * {name}" item appears. Selecting it invokes this callback with the
   * target's participant id; the callback is expected to open the DM
   * tab for that peer. ADR-153 Decision 8 restricts DMs to the
   * PH↔Co-Host axis, so no other viewer/target combinations render
   * the item.
   */
  onOpenDm?: (peer_participant_id: string) => void;
}

export default function ParticipantMenu({
  viewer,
  target,
  send,
  onOpenDm,
}: ParticipantMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  // Close on outside-click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Close on Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleMute = useCallback(() => {
    sendMute(send, target.participant_id);
    setOpen(false);
  }, [send, target.participant_id]);

  const handleUnmute = useCallback(() => {
    sendUnmute(send, target.participant_id);
    setOpen(false);
  }, [send, target.participant_id]);

  const handlePromote = useCallback(
    (to_tier: PromoteToTier) => {
      sendPromote(send, target.participant_id, to_tier);
      setOpen(false);
    },
    [send, target.participant_id],
  );

  const handleDemote = useCallback(
    (to_tier: DemoteToTier) => {
      sendDemote(send, target.participant_id, to_tier);
      setOpen(false);
    },
    [send, target.participant_id],
  );

  const label = `Actions for ${target.display_name}`;

  // Demote-to-Co-Host is a wire-level possibility but has no realistic UI
  // trigger (PH can't be demoted from a menu). We list the tiers the menu
  // ever offers and filter by authority.
  const PROMOTE_TIERS: PromoteToTier[] = ['command_entrant', 'co_host'];
  const DEMOTE_TIERS: DemoteToTier[] = ['command_entrant', 'participant'];

  const promoteItems = PROMOTE_TIERS.filter((t) => canPromoteTo(viewer, target, t));
  const demoteItems = DEMOTE_TIERS.filter((t) => canDemoteTo(viewer, target, t));

  const canDm =
    onOpenDm !== undefined &&
    viewer.tier === 'primary_host' &&
    target.tier === 'co_host' &&
    viewer.participant_id !== target.participant_id;

  return (
    <span
      ref={rootRef}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--sharpee-text-muted)',
          cursor: 'pointer',
          padding: '0 4px',
          font: 'inherit',
          fontSize: '1rem',
          lineHeight: 1,
        }}
      >
        {'⋮'}
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={label}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 10,
            listStyle: 'none',
            margin: 0,
            padding: 4,
            minWidth: 140,
            background: 'var(--sharpee-bg)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          {target.muted ? (
            <MenuItem label="Unmute" onSelect={handleUnmute} />
          ) : (
            <MenuItem label="Mute" onSelect={handleMute} />
          )}
          {promoteItems.map((t) => (
            <MenuItem
              key={`promote-${t}`}
              label={`Promote to ${TIER_LABEL[t]}`}
              onSelect={() => handlePromote(t)}
            />
          ))}
          {demoteItems.map((t) => (
            <MenuItem
              key={`demote-${t}`}
              label={`Demote to ${TIER_LABEL[t]}`}
              onSelect={() => handleDemote(t)}
            />
          ))}
          {canDm && (
            <MenuItem
              label={`DM ${target.display_name}`}
              onSelect={() => {
                onOpenDm?.(target.participant_id);
                setOpen(false);
              }}
            />
          )}
        </ul>
      )}
    </span>
  );
}

const TIER_LABEL: Record<Tier, string> = {
  primary_host: 'Primary Host',
  co_host: 'Co-Host',
  command_entrant: 'Command Entrant',
  participant: 'Participant',
};

interface MenuItemProps {
  label: string;
  onSelect: () => void;
}

function MenuItem({ label, onSelect }: MenuItemProps): JSX.Element {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        onClick={onSelect}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          color: 'var(--sharpee-text)',
          cursor: 'pointer',
          padding: '4px 8px',
          font: 'inherit',
          borderRadius: 'var(--sharpee-border-radius)',
        }}
      >
        {label}
      </button>
    </li>
  );
}
