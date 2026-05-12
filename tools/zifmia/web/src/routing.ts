/**
 * @module zifmia/web/routing
 * @purpose Pure parsing of `location.hash` into a discriminated
 *   `ParsedHash` route. Kept separate from `main.ts` so tests can
 *   import the parser without triggering the bootstrap side-effect
 *   that mounts the IdentityManager/LobbyManager into the page.
 * @owner Zifmia web client.
 */

export type ParsedHash =
  | { kind: 'lobby' }
  | { kind: 'room'; roomId: string }
  | { kind: 'admin' };

/**
 * Parse `location.hash` into a route. Recognized:
 *   ''          → lobby
 *   '#'         → lobby
 *   '#lobby'    → lobby
 *   '#room/:id' → room (id non-empty)
 *   '#admin'    → admin dashboard (gated server-side + via getMe)
 * Anything else falls back to the lobby.
 */
export function parseHash(hash: string): ParsedHash {
  if (!hash || hash === '#' || hash === '#lobby') return { kind: 'lobby' };
  if (hash === '#admin') return { kind: 'admin' };
  const match = /^#room\/(.+)$/.exec(hash);
  if (match && match[1].length > 0) {
    return { kind: 'room', roomId: match[1] };
  }
  return { kind: 'lobby' };
}
