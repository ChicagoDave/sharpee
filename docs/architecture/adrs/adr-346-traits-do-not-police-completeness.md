# ADR-346: Traits do not police completeness

**Status**: **ACCEPTED** (David, 2026-09-11, session 379680 — "yes, accept it". Written the same session on `main` at his "yes, write the ADR", after the door half was already **ruled and implemented** — David, 2026-09-10: *"the rule is wrong - a door can be one-sided until the story adds the destination"*. **Q-1 resolved by interview**: D1 applies to `ExitTrait` as well, so the Open Questions section is gone and D1-D7 are the whole decision. `adr-review` ran at 16/18 NEEDS WORK, two findings — **one of them wrong**: the mismatch rejection it reported as untested was already covered at `connect-rooms-door.test.ts:89`, and the retraction produced the narrower test that was actually missing (a partially-set door whose named side disagrees, the path D3 itself created). Both findings folded, ending at 18/18 READY FOR IMPLEMENTATION.

The code shipped with the ruling rather than after acceptance; this ADR records a decision already in the tree, and AC-1 is the standing check that keeps it true.)

**Scope**: `packages/world-model/src/traits/` — trait constructors. The behaviors and world-model methods that read those fields are consequences, not scope.

## Date: 2026-09-11

## Parent

ADR-220 (doors and portals) records the shape `DoorTrait` = `{ room1, room2, bidirectional }`. ADR-238 (two-sided door presence) derives a door's presence in a room from `room1`/`room2`. **Neither argues that both fields must be set**, and this ADR does not contradict either: a door that names two rooms still behaves exactly as they describe.

**Related**: GH #401 (test files are typechecked by nothing), which is how this surfaced — see below. ADR-090's capability behaviors and the "behaviors own mutations, actions coordinate" split in `docs/core-concepts/README.md` are the same separation this decision applies one level down.

## Context — verified, not assumed

Every line cited was read this session at `4f6d931f9` plus this session's uncommitted change.

### How it surfaced

GH #401's burn-down converts test fixtures that build traits as object literals into real trait constructors. One converted fixture was this, in `packages/stdlib/tests/unit/actions/locking-golden.test.ts`:

```ts
door.add({ type: TraitType.DOOR, connectsTo: 'outside' })
```

`DoorTrait` has no `connectsTo` field. The object-literal form accepted it silently, so **two stdlib tests had been asserting against a "door" that connected nothing** and passing. Converting them to `new DoorTrait({ connectsTo: 'outside' })` made the constructor run, and it threw:

```
Error: Door must connect two rooms
 ❯ new DoorTrait ../world-model/src/traits/door/doorTrait.ts:33:13
```

The first response was to satisfy the constraint — `room1: room.id, room2: 'outside'`, where `'outside'` is an entity id naming nothing. That passes the check and means less than leaving the field empty, which is what prompted the question that produced this ADR.

### The rule had no author

`packages/world-model/src/traits/door/doorTrait.ts`, before this change:

```ts
constructor(data?: Partial<DoorTrait>) {
  if (data) { Object.assign(this, data); }

  // Validate required fields
  if (!this.room1 || !this.room2) {
    throw new Error('Door must connect two rooms');
  }
}
```

Three facts about it:

1. **No ADR states it.** ADR-220 records the field shape; ADR-238 reads the fields. Neither requires both to be set. `grep -rn "connect two rooms" docs/architecture/adrs/` matched nothing before this file existed, and matches only this file now.
2. **It contradicts the file's own header**, five lines above it: *"This is a pure data structure - all validation and logic should be handled by DoorBehavior."*
3. **It dates to the 2025-06-23 wholesale refactoring** (`git log -- packages/world-model/src/traits/door/doorTrait.ts`), the commit whose own message is *"wholesale refactoring - not even going to list the changes."*

It was nonetheless load-bearing in two places. `packages/world-model/tests/unit/traits/door.test.ts:36-39` pinned all four ways of under-specifying a door as throwing. And `WorldModel.connectRooms` carried a comment that reasoned *from* the invariant:

```ts
// DoorTrait's constructor requires both rooms, so the pair is always
// pre-set: verify it names the rooms being wired (room1 = placement).
```

So the constraint had propagated into the API that would otherwise be the natural place to supply a destination later.

### It is a near-singleton

Of the **44 trait classes** under `packages/world-model/src/traits/`, exactly **two** validated in their constructor when this was written: `DoorTrait` (above) and `ExitTrait` (`exitTrait.ts:60`, *"ExitTrait requires from, to, and command"*). Every other trait took what it was given. `CharacterModelTrait` throws at `:958`, but from a predicate-lookup method, not from construction — after D2 and D7 it is the only `throw` left under `traits/`.

### Why one-sidedness is the ordinary case

A story declares a door where the door is. Where it *leads* may not exist yet — the room on the far side may be created later in the same file, or reached by a passage the author has not written. The Chord loader happens to know both by the time it composes the trait (`story-loader/src/loader.ts:577` passes `room1` and `room2` together), but that is a property of one authoring path, not of doors.

## Decision

**D1. A trait constructor does not police completeness.** Traits are data. A trait may define defaults and may accept a `Partial<>` of itself; it may not refuse to exist because a field it declares is unset. Whether a given world is *playable* is a question for behaviors, for the loader, and for the story's own tests — none of which is the constructor.

**D2. A door may be one-sided.** `DoorTrait.room1` and `DoorTrait.room2` are optional (`room1?: string`, `room2?: string`) and the constructor throws nothing. `room1` unset means a door not yet placed; `room2` unset means a door whose destination the story has not supplied.

**D3. `WorldModel.connectRooms` supplies the missing side.** When the trait's `room1` or `room2` is unset, `connectRooms` fills it with the room being wired. When a side is already set and names a *different* room, it still throws — silently re-pointing a wired door would hide an authoring mistake, which is a different failure from an incomplete one.

**D4. An unset side never matches.** `DoorBehavior.getOtherRoom` compares only sides that are set, so `undefined === undefined` can never make a door appear to connect a room to itself. `getRooms`, `getEntryRoom` and `getExitRoom` return `string | undefined` accordingly. No caller outside `doorBehavior.ts` used them.

**D5. `WorldModel.createDoor` is unchanged.** It still requires both rooms to exist. It is the convenience path for the complete case, and a convenience API may demand more than the data model does — that is the difference between a constructor and a factory.

**D6. Tests assert the new shape, not the old.** `door.test.ts`'s four throw-assertions are replaced by one-sided construction and a `connectRooms` fill-in test. The two stdlib fixtures that provoked this are now `new DoorTrait({ room1: room.id })`, with no invented destination.

**D7. `ExitTrait` follows D1 too.** `from`, `to` and `command` are optional and the constructor throws nothing. The check is not lost: `ExitBehavior.createBidirectional` already performed the identical validation on its own data before constructing anything (`exitBehavior.ts:216-218`), which is the behavior layer doing what D1 says is its job. `ExitBehavior.matchesCommand` now compares `command` only when it is set, so an exit that has not been named matches nothing typed — unreachable, which is what an unnamed exit is.

## Consequences

**A door can now be wrong in a way the constructor used to catch.** A story that forgets to wire a door gets a door that leads nowhere rather than an exception at composition time. That is the intended trade: the exception was also thrown at authors who were deliberately deferring, and it could not tell the two apart. Detection moves to where the world is checked as a whole — the loader, `connectRooms`, and the story's own transcripts.

**`Partial<DoorTrait>` now means what it says.** Before, the constructor's parameter type promised every field was optional while the body rejected two of them. Any caller reading the type was misled.

**The `connectRooms` comment that reasoned from the invariant is gone**, replaced by one that states the new rule. Reasoning *from* a constraint is how a constraint spreads past its own file; that comment is why this ADR names it.

**This generalizes past doors, with no exceptions left.** D1 is a rule about traits and the next trait someone writes is covered by it. `DoorTrait` and `ExitTrait` were the only two that validated in their constructors; both now follow it, so there is no carve-out for a future reader to discover and imitate.

**Nothing else moved.** After both changes: `pnpm typecheck` 77/77 exit 0; `turbo run test:ci` 69/69 exit 0; world-model 1521 tests passed across 86 files; stdlib 127 files passed. Verified 2026-09-11.

## Acceptance Criteria

**AC-1. No trait constructor under `packages/world-model/src/traits/` throws.** Mechanically checkable, and the check is the rule: `grep -rn "throw new Error" packages/world-model/src/traits --include="*Trait.ts"` returns exactly one hit, `characterModelTrait.ts:958`, which is a predicate-lookup method rather than a constructor. Re-run it when adding a trait. *(SELF-VERIFYING — the grep is the claim.)*

**AC-2. A one-sided door survives wiring and gains its missing side — either side.** `connect-rooms-door.test.ts` — *"fills in the side a one-sided door left unset"* (a door carrying only `room1`, which afterwards names both rooms with `via` stamped and the door placed in `room1`) and *"fills in room1 when that is the side left unset"* (the mirror, for a door composed destination-first). Both branches of the fill-in are covered deliberately: `mutation-verification` caught that an earlier version of this AC claimed both while the suite exercised only one. *(SELF-VERIFYING.)*

**AC-3. An unset side never matches.** `exit.test.ts` — *"an exit with no command matches nothing by command"*: `ExitBehavior.matchesCommand` returns false for an exit with no `command`. The door half is D4's guard in `getOtherRoom`. *(SELF-VERIFYING.)*

**AC-4. A partially-set door whose named side disagrees still rejects.** `connect-rooms-door.test.ts` — *"still rejects when the ONE side a one-sided door does name disagrees"*: the fill-in runs before the comparison, so this is the path that could mask a mismatch. It throws, leaves both rooms unwired, and leaves the door unplaced. *(SELF-VERIFYING — this AC exists because D3 created the path it tests.)*

All four pass as of 2026-09-11: `connect-rooms-door.test.ts` 14 passed, world-model 1521 passed across 86 files, `pnpm typecheck` 77/77, `turbo run test:ci` 69/69.

## Session

Session 379680, `main`, 2026-09-10 to 2026-09-11. The door change was made and verified on 2026-09-10 under David's ruling; the ADR was written on 2026-09-11 at his request. Discovered inside GH #401's trait-literal sweep (commit `f9cd89eb9` built the gate that makes such sweeps possible; `02b78774b` and `a1e4419ba` are its predecessors for #400 and #404).
