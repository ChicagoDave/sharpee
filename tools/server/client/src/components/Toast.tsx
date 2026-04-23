/**
 * Toast — transient notice stack, top-right.
 *
 * Public interface: {@link Toast} default export, {@link ToastProps},
 * {@link ToastEntry}.
 *
 * Bounded context: client UI primitive (Plan 02 Phase 6 succession UX,
 * with other call sites expected in later plans). Callers manage the
 * entry list themselves and pass it in; each entry auto-dismisses after
 * its `ttlMs` (default 5 s). Entries also have a close button.
 *
 * Design choice — toasts are a presentational component, not a global
 * store. The Room view owns the list since the only Phase 6 trigger
 * (PH-identity change) lives there. If more call sites appear, a small
 * ToastContext can be added.
 */

import { useEffect, useRef } from 'react';

export interface ToastEntry {
  id: string;
  text: string;
  /** Time-to-live in ms. Defaults to 5000. */
  ttlMs?: number;
}

export interface ToastProps {
  entries: ToastEntry[];
  onDismiss: (id: string) => void;
}

export default function Toast({ entries, onDismiss }: ToastProps): JSX.Element {
  // One timer per entry, keyed by id. When an entry is removed from the
  // input list, its timer is cancelled so we don't fire a stale dismiss.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    // Start any missing timers.
    for (const entry of entries) {
      if (timers.current.has(entry.id)) continue;
      const ttl = entry.ttlMs ?? 5000;
      const handle = setTimeout(() => {
        timers.current.delete(entry.id);
        onDismiss(entry.id);
      }, ttl);
      timers.current.set(entry.id, handle);
    }
    // Cancel timers for entries no longer in the list.
    const liveIds = new Set(entries.map((e) => e.id));
    for (const [id, handle] of timers.current.entries()) {
      if (!liveIds.has(id)) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
    }
  }, [entries, onDismiss]);

  useEffect(() => {
    return () => {
      for (const handle of timers.current.values()) clearTimeout(handle);
      timers.current.clear();
    };
  }, []);

  return (
    <ol
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: 'var(--sharpee-spacing-md)',
        right: 'var(--sharpee-spacing-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        listStyle: 'none',
        margin: 0,
        padding: 0,
        zIndex: 3000,
        maxWidth: 360,
      }}
    >
      {entries.map((entry) => (
        <li
          key={entry.id}
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 'var(--sharpee-spacing-sm) var(--sharpee-spacing-md)',
            background: 'var(--sharpee-bg-secondary)',
            color: 'var(--sharpee-text)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ flex: 1 }}>{entry.text}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(entry.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--sharpee-text-muted)',
              cursor: 'pointer',
              font: 'inherit',
              padding: 0,
            }}
          >
            ✕
          </button>
        </li>
      ))}
    </ol>
  );
}
