# Findings — @sharpee/plugin-npc

## Author-relevance
Extension-facing / wiring. A one-symbol package: `NpcPlugin` adapts stdlib's NPC service into a `TurnPlugin` at priority 100 (runs first, NPCs act immediately after the player). The book uses it to show how NPC processing is installed into the turn cycle, and `getNpcService()` is the hook authors use to register NPC behaviors.

## Naming
Clean. `NpcPlugin` is the only export. "Npc" cap-casing (vs `NPC`) is consistent with the rest of the codebase's `Npc*` identifiers (`NpcService`, `INpcService`, `NpcBehavior` in stdlib). Method names conventional (`onAfterAction`, `getState`/`setState`, `getNpcService`).

## Should-be-internal
None obvious — single class, and the one author-relevant method (`getNpcService`) is explicitly commented as the public access point.

## API shape
- Implements `TurnPlugin` cleanly. `getState(): unknown` returns nothing meaningful (NPC state lives in traits, per the comment) and `setState(_state: unknown)` is a no-op — the underscore param signals it's a required-by-contract stub. Fine, but a book note that NPC plugin state is intentionally empty avoids confusion.
- `getNpcService(): INpcService` — well-typed, returns the stdlib service interface.
- No `any`; the only `unknown` is the inherited `TurnPlugin` state contract. No missing returns.

## Documentation (TSDoc)
Partial — the file/class has a header (priority rationale, ADR references) and `getState`/`getNpcService` have one-line comments. Individual interface-method overrides (`onAfterAction`, `setState`) are undocumented but inherit meaning from `TurnPlugin`. Call it ~50% by member, but the load-bearing parts are documented.

## Book highlights
- `NpcPlugin` — construct and register with the engine's plugin registry to enable NPC turns.
- `NpcPlugin.getNpcService(): INpcService` — the entry point for registering NPC behaviors/combat resolvers (cross-reference stdlib's `INpcService`, `createNpcService`, `NpcBehavior`, `createFollowerBehavior`/`createPatrolBehavior`/`createWandererBehavior`).
- Priority 100 detail: explains turn ordering relative to state-machine (75) and scheduler (50).
- Note: this package re-exports nothing; `INpcService` and behavior factories live in `@sharpee/stdlib`, so the book should pair the two.
