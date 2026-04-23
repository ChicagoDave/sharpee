/**
 * SaveList — render the room's saves, newest first. Each row shows the
 * save name and timestamp; the Restore button per row is wired in
 * Plan 03 Phase 2 (for now, an injected `onRestore` callback is optional).
 *
 * Public interface: {@link SaveList} default export, {@link SaveListProps}.
 *
 * Bounded context: client save/restore (Plan 03 Phase 1).
 *
 * Creator display names are deliberately not shown — the wire's
 * `RoomSnapshot.saves[]` doesn't carry the actor id, and we'd prefer one
 * consistent row shape over "some rows have a creator, others don't."
 */

import Button from './Button';

export interface SaveListEntry {
  save_id: string;
  name: string;
  created_at: string;
}

export interface SaveListProps {
  saves: SaveListEntry[];
  /** Called when the user clicks Restore on a row. Phase 2 wires this up. */
  onRestore?: (save_id: string) => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function SaveList({ saves, onRestore }: SaveListProps): JSX.Element {
  if (saves.length === 0) {
    return (
      <p
        role="status"
        style={{
          color: 'var(--sharpee-text-muted)',
          fontStyle: 'italic',
          padding: 'var(--sharpee-spacing-sm)',
        }}
      >
        No saves yet.
      </p>
    );
  }

  // Newest first. Sort a shallow copy so we don't mutate the reducer's array.
  const sorted = [...saves].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  return (
    <ul
      aria-label="Saves"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sharpee-spacing-xs)',
      }}
    >
      {sorted.map((s) => (
        <li
          key={s.save_id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sharpee-spacing-sm)',
            padding: 'var(--sharpee-spacing-sm)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            background: 'var(--sharpee-panel-bg, var(--sharpee-bg-secondary))',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.name || '(unnamed)'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--sharpee-text-muted)' }}>
              {formatTimestamp(s.created_at)}
            </div>
          </div>
          {onRestore && (
            <Button
              variant="secondary"
              onClick={() => onRestore(s.save_id)}
              aria-label={`Restore save ${s.name || '(unnamed)'}`}
            >
              Restore
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
