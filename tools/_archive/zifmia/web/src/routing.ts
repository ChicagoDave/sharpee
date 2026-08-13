/**
 * Hash routing for the zifmia web client. Two routes:
 *   - `#/`            — lobby (or identity claim if no stored identity)
 *   - `#/room/:id`    — room view
 *
 * Hash-based routing avoids server-side rewriting; the SPA is served
 * as a single index.html.
 */

export type Route =
  | { kind: 'lobby' }
  | { kind: 'room'; roomId: string };

export function parseRoute(hash: string): Route {
  const m = /^#\/room\/([^/?#]+)/.exec(hash);
  if (m) return { kind: 'room', roomId: decodeURIComponent(m[1]) };
  return { kind: 'lobby' };
}

export function navigateLobby(): void {
  window.location.hash = '#/';
}

export function navigateRoom(roomId: string): void {
  window.location.hash = `#/room/${encodeURIComponent(roomId)}`;
}

export function onRouteChange(listener: (route: Route) => void): () => void {
  const handler = () => listener(parseRoute(window.location.hash));
  window.addEventListener('hashchange', handler);
  // Fire once on subscription so the caller picks up the current route.
  handler();
  return () => window.removeEventListener('hashchange', handler);
}
