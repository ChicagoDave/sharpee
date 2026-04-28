/**
 * Compile-time mutation rejection test for `ReadOnlyWorldModel` (ADR-162 AC-7).
 *
 * Public interface: none — this file exists purely so `tsc --noEmit`
 * verifies the type-level invariant that mirror references cannot mutate
 * the world. If a mutator surfaces in a future `Pick<...>` revision (or
 * the `ReadOnlyWorldModel` narrowing is widened by accident), the
 * `@ts-expect-error` directives below will become "unused" and the
 * directive itself will produce a compile error — failing CI's
 * `tsc --noEmit` step.
 *
 * Bounded context: shared wire-protocol types, server-side authoring
 * directory. Co-located with `world-mirror.ts` so a change to the
 * narrowing forces a same-commit revision of these assertions.
 *
 * Invariant (from ADR-162 Decision 4): a `ReadOnlyWorldModel` reference
 * exposes only query methods. Every method on the underlying
 * `IWorldModel` that performs a mutation — entity, spatial,
 * state, capability, player, scoring, persistence, event-history,
 * relationship, scene, and structural creators — must be type-erased.
 *
 * Filename convention: `.test-d.ts` (declaration-only test) — Vitest's
 * include pattern is `tests/**\/*.test.ts`, so this file is checked by
 * `tsc --noEmit` but never executed at runtime.
 */

import type { ReadOnlyWorldModel } from './world-mirror';

declare const mirror: ReadOnlyWorldModel;

// Each block exists only to host an `@ts-expect-error`. The `void` cast
// silences "unused expression" warnings on the rejected access. If any
// directive becomes unused (because a mutator reappeared on the type),
// tsc will flag the directive itself — and CI fails.

{
  // Entity-management mutators — all rejected.
  // @ts-expect-error createEntity is excluded from ReadOnlyWorldModel
  void mirror.createEntity('rock', 'object');
  // @ts-expect-error removeEntity is excluded from ReadOnlyWorldModel
  void mirror.removeEntity('e-1');
  // @ts-expect-error updateEntity is excluded from ReadOnlyWorldModel
  void mirror.updateEntity('e-1', () => undefined);
}

{
  // Spatial mutators — all rejected.
  // @ts-expect-error moveEntity is excluded from ReadOnlyWorldModel
  void mirror.moveEntity('e-1', 'r-1');
  // @ts-expect-error canMoveEntity is excluded from ReadOnlyWorldModel
  void mirror.canMoveEntity('e-1', 'r-1');
}

{
  // World-state mutators — all rejected. The corresponding readers
  // (`getState`, `getStateValue`) are in the Pick list and would compile.
  // @ts-expect-error setState is excluded from ReadOnlyWorldModel
  void mirror.setState({});
  // @ts-expect-error setStateValue is excluded from ReadOnlyWorldModel
  void mirror.setStateValue('flag', true);
}

{
  // Capability mutators — all rejected. `getCapability` and `hasCapability`
  // remain available for renderer reads (StatusLine consumes them).
  // @ts-expect-error registerCapability is excluded from ReadOnlyWorldModel
  void mirror.registerCapability('scoring', {});
  // @ts-expect-error updateCapability is excluded from ReadOnlyWorldModel
  void mirror.updateCapability('scoring', { scoreValue: 1 });
}

{
  // Player and prompt mutators — rejected.
  // @ts-expect-error setPlayer is excluded from ReadOnlyWorldModel
  void mirror.setPlayer('a-1');
  // @ts-expect-error setPrompt is excluded from ReadOnlyWorldModel
  void mirror.setPrompt({ text: '>' } as never);
}

{
  // Score-ledger mutators — rejected. The corresponding readers
  // (`getScore`, `getMaxScore`, `getScoreEntries`, `hasScore`) are in
  // the Pick list (renderers consume them; StatusLine reads `getScore`
  // and `getMaxScore`). The three writers are explicitly excluded.
  // @ts-expect-error awardScore is excluded from ReadOnlyWorldModel
  void mirror.awardScore('treasure-1', 10, 'found');
  // @ts-expect-error revokeScore is excluded from ReadOnlyWorldModel
  void mirror.revokeScore('treasure-1');
  // @ts-expect-error setMaxScore is excluded from ReadOnlyWorldModel
  void mirror.setMaxScore(616);
}

{
  // Persistence mutators — rejected. The mirror is hydrated via a fresh
  // `WorldModel` instance, not via mutating an existing mirror.
  // @ts-expect-error loadJSON is excluded from ReadOnlyWorldModel
  void mirror.loadJSON('{}');
  // @ts-expect-error clear is excluded from ReadOnlyWorldModel
  void mirror.clear();
  // @ts-expect-error toJSON is excluded from ReadOnlyWorldModel
  void mirror.toJSON();
}

{
  // Relationship and structural creators — rejected.
  // @ts-expect-error addRelationship is excluded from ReadOnlyWorldModel
  void mirror.addRelationship('a', 'b', 'next-to');
  // @ts-expect-error removeRelationship is excluded from ReadOnlyWorldModel
  void mirror.removeRelationship('a', 'b', 'next-to');
  // @ts-expect-error connectRooms is excluded from ReadOnlyWorldModel
  void mirror.connectRooms('r-1', 'r-2', 'north' as never);
  // @ts-expect-error createDoor is excluded from ReadOnlyWorldModel
  void mirror.createDoor('door', { room1Id: 'r-1', room2Id: 'r-2', direction: 'north' as never });
  // @ts-expect-error createRegion is excluded from ReadOnlyWorldModel
  void mirror.createRegion('reg', {} as never);
  // @ts-expect-error assignRoom is excluded from ReadOnlyWorldModel
  void mirror.assignRoom('r-1', 'reg');
  // @ts-expect-error createScene is excluded from ReadOnlyWorldModel
  void mirror.createScene('s', {} as never);
}

{
  // Event-system mutators — rejected. Mirrors don't drive event flow.
  // @ts-expect-error registerEventHandler is excluded from ReadOnlyWorldModel
  void mirror.registerEventHandler('x', () => undefined);
  // @ts-expect-error applyEvent is excluded from ReadOnlyWorldModel
  void mirror.applyEvent({} as never);
  // @ts-expect-error chainEvent is excluded from ReadOnlyWorldModel
  void mirror.chainEvent('x', () => [], {} as never);
  // @ts-expect-error clearEventHistory is excluded from ReadOnlyWorldModel
  void mirror.clearEventHistory();
}

{
  // Scope mutators — rejected. The mirror does not own scope state.
  // @ts-expect-error addScopeRule is excluded from ReadOnlyWorldModel
  void mirror.addScopeRule({} as never);
  // @ts-expect-error removeScopeRule is excluded from ReadOnlyWorldModel
  void mirror.removeScopeRule('rule-1');
  // @ts-expect-error evaluateScope is excluded from ReadOnlyWorldModel
  void mirror.evaluateScope('a-1');
}

// Sanity-check the positive direction: a representative query method
// is callable. If this line stops compiling, the Pick list lost a
// required reader and AC-5 (renderer access) regresses.
void mirror.getEntity('a-1');
void mirror.getPlayer();
void mirror.getCapability('scoring');
void mirror.getContainingRoom('a-1');
void mirror.getScore();
void mirror.getMaxScore();
void mirror.getScoreEntries();
void mirror.hasScore('treasure-1');

// SELF-CHECK PROBE — uncomment to verify these `@ts-expect-error`
// directives are actually catching errors. Removing the directive on a
// rejected mutator should cause tsc to fail with "Property 'X' does
// not exist on type 'ReadOnlyWorldModel'." Removing the directive on
// an allowed reader should cause tsc to fail with "Unused
// '@ts-expect-error' directive." Both prove the test is live.
//
// // @ts-expect-error
// void mirror.getEntity('a-1'); // <- WOULD FAIL: directive unused
// void mirror.removeEntity('a-1'); // <- WOULD FAIL: removeEntity does not exist on ReadOnlyWorldModel
