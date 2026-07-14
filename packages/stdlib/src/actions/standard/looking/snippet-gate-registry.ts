/**
 * Registered snippet-gate seam (ADR-211 Decision 3 / Q4) — non-presence
 * `while` conditions on description fragments.
 *
 * Purpose: presence gates compile to serializable `mentions` data; every OTHER
 * fragment condition is a predicate only its owning runtime (the Chord loader,
 * package 2) can evaluate. This registry is the seam between the two: the
 * runtime registers a thunk per `(roomId, marker)` at story load, and the
 * snippet resolver consults it alongside — never replacing — the `mentions`
 * data gate.
 *
 * Public interface: `registerSnippetGate`, `clearSnippetGates` (loader/test
 * lifecycle), `lookupSnippetGate` (the resolver's read side).
 *
 * Owner context: `@sharpee/stdlib` — stdlib owns the scan and the gate
 * (ADR-209 boundary resolution); this file sits beside `snippet-resolver.ts`,
 * its one consumer. Modeled on the world-model state-clauses registry SHAPE
 * (Map-based, idempotent-last-wins) with its own keying and lifecycle.
 *
 * LIFECYCLE CONTRACT (Q4): nothing here is serialized — a gate is a live
 * closure and never touches a save file. Callers re-register every story load;
 * that is what makes save/restore a non-event for gated fragments (the loader
 * re-registers on the fresh process's load, and an in-game RESTORE reuses the
 * registrations already in place). A story switch in one process clears first.
 */

/**
 * A registered fragment gate: returns true while the fragment may render.
 * A thunk, not a world-taking function — the registering runtime closes over
 * its own world access and condition evaluator.
 */
export type SnippetGate = () => boolean;

/** `(roomId, marker)` → gate. The `\0` join cannot collide with entity ids. */
const gates = new Map<string, SnippetGate>();

const keyOf = (roomId: string, marker: string): string => `${roomId}\0${marker}`;

/**
 * Register (or replace) the gate for one `(roomId, marker)` site. Idempotent —
 * the latest registration wins, so a loader re-registering on a fresh load is
 * a no-op rather than a stack of stale closures.
 *
 * @param roomId the room whose description carries the marker
 * @param marker the marker name inside that room's description
 * @param gate returns true while the fragment may render
 */
export function registerSnippetGate(roomId: string, marker: string, gate: SnippetGate): void {
  gates.set(keyOf(roomId, marker), gate);
}

/**
 * The resolver's read side: the registered gate for a site, if any.
 *
 * @param roomId the room being resolved
 * @param marker the marker being resolved
 * @returns the gate, or undefined when the site is ungated (the common case)
 */
export function lookupSnippetGate(roomId: string, marker: string): SnippetGate | undefined {
  return gates.get(keyOf(roomId, marker));
}

/**
 * Drop every registration — for tests and for a same-process story switch
 * (a new story's load must not inherit another story's gates).
 */
export function clearSnippetGates(): void {
  gates.clear();
}
