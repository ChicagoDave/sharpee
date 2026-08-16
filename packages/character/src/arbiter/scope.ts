/**
 * Scope-string interpretation (ADR-318 D4/D7 — Phase 6)
 *
 * The runtime half of the canonical trait-side scope idiom
 * (`anyone` / `a <kind>` / world-entity-id) that apply-compiled writes:
 * matching an act's object or audience against a declared scope, and
 * deciding whether a principle's `except` lifts it. Kind membership is
 * story knowledge, so it arrives as a callback (the story oracle's
 * `isKindMember` slot).
 *
 * Public interface: scopeMatches, exceptLifts, KindMembership.
 * Owner context: @sharpee/character / arbiter
 */

/** Kind membership for classifier scopes — the story oracle's reserved slot. */
export type KindMembership = (entityId: string, kind: string) => boolean;

/**
 * Whether an entity falls within a canonical scope string.
 *
 * @param scope - `anyone` | `a <kind>` | a world entity id
 * @param entityId - The entity being matched (act object, audience member)
 * @param isKindMember - Kind membership oracle; without one, classifier
 *   scopes match nothing (conservative: the principle stays in force)
 * @returns Whether the entity is in scope
 */
export function scopeMatches(
  scope: string,
  entityId: string,
  isKindMember?: KindMembership,
): boolean {
  if (scope === 'anyone') return true;
  if (scope.startsWith('a ') || scope.startsWith('an ')) {
    const kind = scope.slice(scope.indexOf(' ') + 1);
    return isKindMember?.(entityId, kind) ?? false;
  }
  return scope === entityId;
}

/**
 * Whether a principle's `except` lifts it for this act.
 *
 * The object carve-out (a bare scope) lifts when the act's object is in
 * scope (exp-02: `never steals, except the Duke` — stealing from the
 * Duke is allowed). The collision carve-out (`to protect <scope>`)
 * yields to the obligation protecting that scope — arbiter-internal
 * semantics deferred with the goal-site arbitration (Phase 6 follow-up);
 * until then it conservatively does NOT lift, so the principle stays in
 * force (thealderman declares none).
 *
 * @param except - The canonical except string from the trait
 * @param objectId - The act's object (the asker at the dialogue site);
 *   absent means the object is unknown — nothing lifts
 * @param isKindMember - Kind membership oracle
 * @returns Whether the principle is lifted for this act
 */
export function exceptLifts(
  except: string,
  objectId: string | undefined,
  isKindMember?: KindMembership,
): boolean {
  if (except.startsWith('to protect ')) return false;
  if (objectId === undefined) return false;
  return scopeMatches(except, objectId, isKindMember);
}
