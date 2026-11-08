# Session Plan: Burn down stdlib test-file type errors (GH #401) and promote stdlib to the typecheck gate

**Created**: 2026-11-07
**Plan Status**: ACTIVE
**Overall scope**: Bring `packages/stdlib/tests` from 866 errors in 102 files (measured 2026-11-07 with `tsc -p tsconfig.test.json`) to zero, then append the test leg to stdlib's `typecheck` script. Test files and test utilities only; no `src/` file in any package changes.
**Bounded contexts touched**: N/A (test maintenance, no domain change)
**Key domain language**: N/A

## References consulted
- `docs/context/project-profile.md` — stack and conventions; tests run under vitest, gate is `pnpm typecheck`.
- `docs/work/typecheck-gate-audit/audit-20260910-gate-coverage.md` — the audit that produced the ratchet; stdlib was the largest remaining package.
- GH #401 (body and comment) — mechanism (`tsconfig.test.json`, `typecheck:tests`), the ratchet (a package at zero gets `&& tsc -p tsconfig.test.json` on its `typecheck`), and the ruling that `ITrait`/`add()` are not widened.
- `docs/core-concepts/README.md` — intended form is `entity.add(new ContainerTrait({ ... }))`.
- Standing rules (CLAUDE.md, memory) — no regex edits (exact-string Edit only), no deletion of files, platform changes need discussion (so no `src/` edits), never auto-retry failed builds/tests, a test pinning an abandoned shape is a test defect.
- `docs/architecture/adrs/adr-346-traits-do-not-police-completeness.md` (ACCEPTED) — names GH #401 as how it surfaced; D1 (every trait accepts a Partial, no constructor throws) makes a fixture that sets fewer fields legitimate, and D6's `new DoorTrait({ room1: room.id })` is the rewrite form Phases 1 and 2 apply. Added by plan-review 2026-11-07; no other ADR bears on this scope.

## Open question for David (not assumed)
Cluster 1 is 454 multi-line `entity.add({ type: TraitType.X, ... })` rewrites. Under the no-regex rule every one is an exact-string Edit, which is why phases are split by trait type and file. If David rules a scripted codemod acceptable, Phases 1-3 collapse to one phase; this plan assumes he has not.

## Common procedure (every phase)
- Before rewriting a trait type, read its class in `packages/world-model/src/traits/<name>/<name>Trait.ts` and list which literal fields the constructor accepts. A field the constructor ignores or does not have is not silently dropped: record the test, the field, and whether any assertion depended on it.
- Exit check: `pnpm --filter '@sharpee/stdlib' exec vitest run` green (150 test files) and `/Users/david/repos/sharpee/node_modules/.bin/tsc -p packages/stdlib/tsconfig.test.json` error count reported (not `npx tsc`, GH #630).
- Any test whose assertion changes meaning when its fixture is corrected goes in that phase's Demonstrated line.
- No edits under any `src/`. A failure is reported and waited on, not retried.

## Phases

### Phase 1: Trait literals, constructor-compatible traits (Partial<Trait> constructors) — CONTAINER, IDENTITY, ACTOR, SUPPORTER, SCENERY
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Test fixtures, `ITrait` excess-property cluster (about 264 of 511 errors: CONTAINER 107, IDENTITY 61, ACTOR 45, SUPPORTER 33, SCENERY 18)
- **Entry state**: Baseline recorded: 866 errors in 102 files; vitest green at 150 files.
- **Deliverable**: Every `entity.add({ type: TraitType.<X>, ... })` for the five trait types in `packages/stdlib/tests` rewritten to `new <X>Trait({...})` with imports added. Starts with `packages/stdlib/tests/unit/scope/scope-resolver.test.ts` (67 calls). Field mismatches (e.g. `isPlayer` on ACTOR, `capacity: { maxItems }` on CONTAINER) tabulated and resolved per field against the class.
- **Files**: `packages/stdlib/tests/`
- **Exit state**: No ITrait excess-property error remains for these five types; vitest green; error count reported (expected near 600).
- **Demonstration**: Run vitest for stdlib and the test tsc; both counts printed, and grep for "type: TraitType.CONTAINER" in `packages/stdlib/tests` returns no add-call literal.
- **Demonstrated**: 2026-11-07 22:05. Two-line reading (an `add({` line whose block carries `type: TraitType.<CONTAINER|IDENTITY|ACTOR|SUPPORTER|SCENERY>`) over every `.ts` under packages/stdlib/tests: zero. `tsc -p packages/stdlib/tsconfig.test.json`: 665 errors (from 866); every ITrait property still rejected is a Phase 2 type (isOpen 76, isOn 56, worn 52, exits 24, isLocked 19, …), none of the five. `pnpm --filter '@sharpee/stdlib' exec vitest run`: 150 files, 1915 tests passing, 0 failures. 63 files rewritten (the two `.removed` files untouched). Fixtures whose meaning changed, each checked against the reader: (1) numeric `capacity: N` dropped in searching-golden ×9, listening-golden ×5, smelling-golden ×2, touching-golden, switching_on-golden ×2, switching_off-golden ×3, entering-golden, searching-interceptor: never matched the `{ maxItems, maxWeight, maxVolume }` shape and no action reads it. (2) command-validator-golden "resolves entity by synonym": `synonyms` → `aliases`; nothing read synonyms, the test passed through the entity type. (3) giving-golden: `inventoryLimit` → `capacity`, bare `preferences` → `customProperties.preferences`, the shapes giving.ts reads first; its fallback to the old shapes (giving.ts:194, 228, 277) is now dead. (4) talking-golden ×10 and dialogue-attribution-realpath: `conversation` → `customProperties.conversation`; talking.ts:177/223 fallback now dead. (5) scope-integration "smell cheese" ×2: `customProperties: { smelly }` on IdentityTrait, which declares no such field, replaced by `EdibleTrait` (scope-resolver hasScent's "food has scent" path); hasScent's `identity.customProperties` read (scope-resolver.ts:385-391) is a src read of a field the trait does not declare, noted for a later ruling. (6) `as any` / `as unknown as ITrait` / `as never` casts removed in 11 files. [reported by session, unverified]
- **Status**: DONE

### Phase 2: Trait literals, data-interface traits and the long list of small trait types
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Test fixtures, remaining ~247 ITrait errors: ROOM 88, OPENABLE 42, ENTERABLE 8, SWITCHABLE 7, VEHICLE 6, PUSHABLE 6, READABLE 5, WEARABLE 4, LIGHT_SOURCE 4, EDIBLE 4, PULLABLE 3, DOOR 3, LOCKABLE 2, COMBATANT 2, and one each WEAPON, REQUIRED_TRAIT, OPEN_INVENTORY, CUTTABLE, BUTTON, BREAKABLE
- **Entry state**: Phase 1 exit holds and is committed.
- **Deliverable**: All remaining `entity.add({ type: TraitType.X, ... })` literals rewritten to constructors (ROOM, OPENABLE, SWITCHABLE, WEARABLE take `I<X>Data`). Includes `packages/stdlib/tests/unit/scope/sensory-extensions.test.ts` (39) and the `*-golden.test.ts` action tests. If this exceeds budget, the session stops at a file boundary and the phase stays CURRENT.
- **Files**: `packages/stdlib/tests/`
- **Exit state**: Cluster 1 is zero; vitest green; error count reported (expected near 355).
- **Demonstration**: vitest and test tsc counts printed; the two-line reading (lines matching `add({` whose next line carries `type: TraitType`) counts zero under `packages/stdlib/tests`, and the single-line form `add({ type:` also returns nothing. The single-line grep alone cannot fail, since 440 of the 454 literals are multi-line.
- **Demonstrated**: 2026-11-08 00:20. Two-line reading over every `.ts` under packages/stdlib/tests: 14 literals left, none of them fixable test-side, each commented in place and awaiting a platform ruling because the action reads a field the trait does not declare (through an `as unknown as Record` cast) or a path no constructor can reach: LIGHT_SOURCE radius/intensity ×5 (switching_on 206, 239, 544; switching_off 216, 530; read at switching-shared.ts:38-39), OPENABLE autoCloseOnOff ×3 (switching_off 322, 352, 380; switching_off.ts:201) and autoOpenOnUnlock ×1 (unlocking-golden 387; unlocking.ts:232), WEARABLE cursed ×1 (taking_off-golden 138; wearable-shared.ts:201), EDIBLE isDrink ×1 (touching-golden 266; touching.ts:181 casts to `{ isDrink?: boolean }` while EdibleTrait's field is `liquid`), and three WEARABLE fixtures (wearing-golden 147, 155; wearing-interceptor 132) whose body-part conflict path at wearable-shared.ts:54 requires `layer === undefined`, which WearableTrait's constructor never produces (defaults 1): in real play two hats on the head never conflict. The single-line form `add({ type:` returns only `TEST_MARKER_TRAIT` markers, which satisfy ITrait exactly. `tsc -p packages/stdlib/tsconfig.test.json`: 369 errors (from 665; 14 TS2353 ITrait, all the above). `pnpm --filter '@sharpee/stdlib' exec vitest run`: 150 files, 1915 tests passing, 0 failures. 65 files changed since a350b21c2. Fixtures whose meaning changed, each checked against the reader: room `isDark` → `requiresLight` (snapshot-utils.ts:199 derives isDark from it; nothing read isDark); door `connectsTo` dropped (DoorTrait is room1/room2; no reader); edible `consumed` dropped (servings is the field); wearable `worn` → `isWorn` (IWearableData's name), `bodyParts` → `bodyPart`; combatant `health`/`maxHealth` dropped (HealthTrait owns them; no attacking read off COMBATANT); enterable `canEnter` dropped; pullable `state: 'ready'` → `'default'` (the declared vocabulary; pulling.ts tests only `=== 'pulled'`); going-golden's `inside`/`outside` exit keys → `Direction.IN` (extras path) and `passageKey(['outside'])` (direct-object path, since going.ts resolveWay takes the object's name verbatim per ADR-378); taking_off "should remove item without body part" renamed and asserts the constructor default `torso`; cutting, digging and opening-tool spread fixtures → constructor with a conditional options object; `as any` casts removed in 9 more files. The src reads above are filed as one issue (see the session summary for its number). [reported by session, unverified]
- **Status**: DONE

### Phase 3: Parsed-object literals (`text` field) and renamed exports
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Test fixtures, cluster 2 (43 errors: `text` in `directObject`/`indirectObject` literals) plus the few renamed-export errors
- **Entry state**: Phase 2 exit holds and is committed.
- **Deliverable**: `text` removed or replaced with the field the parsed-object type has (`nounPhrase`/`rawInput`/`entity`) per call; tests that read the `text` back are listed. Renamed exports updated to current names.
- **Files**: `packages/stdlib/tests/`
- **Exit state**: Clusters 1 and 2 are zero; vitest green; error count reported (expected about 300, the cluster 3 tail).
- **Demonstration**: vitest and test tsc counts printed; tsc output contains no error mentioning "text" on a parsed object.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 4: Long tail, part one — TS2339, TS7006, TS2554 and TS2769
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Test fixtures and helpers, cluster 3 (property does not exist 85, implicit any 34, wrong arg count 15, overload mismatch 8). The "Expected 5-7 arguments, but got 4" calls are read against the current signature and the call updated, not the helper widened.
- **Entry state**: Phase 3 exit holds and is committed.
- **Deliverable**: Those error codes at zero. Where a test pins a shape the platform abandoned, the test is corrected to the current shape.
- **Files**: `packages/stdlib/tests/`
- **Exit state**: Only the possibly-undefined/unknown family remains; vitest green; error count reported.
- **Demonstration**: vitest and test tsc counts printed; tsc output lists no TS2339, TS7006, TS2554 or TS2769.
- **Demonstrated**: 
- **Status**: PENDING

### Phase 5: Long tail, part two — possibly-undefined/unknown (TS18046/18048/2571/2532, TS2722) and gate promotion
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Domain focus**: Test fixtures, cluster 3 remainder (89 + 27 errors), then the gate
- **Entry state**: Phase 4 exit holds and is committed.
- **Deliverable**: Remaining errors fixed with guards or narrowing that fail the test loudly if the value is absent (no `as any`, no `!` that hides a real absence, no `unknown`). `packages/stdlib/package.json` `typecheck` becomes `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`. A comment on GH #401 carries the new state table (stdlib removed from the 14-package list, total reduced by 866).
- **Files**: `packages/stdlib/tests/`, `packages/stdlib/package.json`
- **Exit state**: stdlib test tsc is 0; vitest green (150 files); every `pnpm typecheck` task successful (76 tasks at 2026-11-07; record the count the run prints); #401 comment posted.
- **Demonstration**: Run `pnpm typecheck` and observe "N successful, N total" with N equal (76 at 2026-11-07); run `pnpm typecheck:tests` and confirm stdlib is no longer among the failing packages; show the #401 comment URL.
- **Demonstrated**: 
- **Status**: PENDING
