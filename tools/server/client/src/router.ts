/**
 * Hand-rolled client-side router for the multi-user client.
 *
 * Public interface: {@link useRoute}, {@link navigate}, {@link matchRoomPath},
 * {@link matchCodePath}.
 *
 * Bounded context: client navigation (ADR-153 frontend). Three routes total:
 *   - `/`               Landing page
 *   - `/room/:room_id`  Room view
 *   - `/r/:code`        Deep-link join (Landing with passcode modal pre-fill)
 *
 * Why hand-rolled: for three static routes with one path parameter each, a
 * full router library is more machinery than we need. If a fourth route ever
 * appears, migrate to `react-router-dom` in one go (the plan's deferral).
 */

import { useEffect, useState } from 'react';

/**
 * Subscribe a React component to pathname changes. The initial value is
 * captured synchronously from `window.location`; subsequent changes come
 * from browser back/forward buttons (`popstate`) and from our own
 * {@link navigate} calls, which dispatch a synthetic popstate.
 */
export function useRoute(): string {
  const [path, setPath] = useState<string>(() => window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return path;
}

/**
 * Programmatically navigate to a new path. No-ops if already on the target
 * path. Updates History and dispatches popstate so every `useRoute` subscriber
 * re-renders.
 */
export function navigate(to: string): void {
  if (window.location.pathname === to) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Return the `room_id` for a `/room/:id` path, or null otherwise. */
export function matchRoomPath(path: string): string | null {
  const m = /^\/room\/([^/]+)$/.exec(path);
  return m ? decodeURIComponent(m[1]!) : null;
}

/** Return the `code` for a `/r/:code` path, or null otherwise. */
export function matchCodePath(path: string): string | null {
  const m = /^\/r\/([^/]+)$/.exec(path);
  return m ? decodeURIComponent(m[1]!) : null;
}
