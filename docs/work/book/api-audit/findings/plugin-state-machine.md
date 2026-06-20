# Findings — @sharpee/plugin-state-machine

## Author-relevance
Author-facing. A declarative state-machine system (ADR-119) for puzzle/narrative orchestration: authors write `StateMachineDefinition` objects (states, transitions, triggers, guards, effects) and register them via `StateMachinePlugin.getRegistry()`. The book's programmer layer should teach the declarative definition format. 32 symbols, almost all of which are the definition vocabulary.

## Naming
Clean and consistent. Discriminated-union members use `type: '...'` literals with matching interface names: triggers (`ActionTrigger`/`EventTrigger`/`ConditionTrigger`), guards (`EntityGuard`/`StateGuard`/`LocationGuard`/`InventoryGuard`/`CompositeGuard`/`CustomGuard`), effects (`MoveEntityEffect`/`RemoveEntityEffect`/`SetTraitEffect`/`SetStateEffect`/`MessageEffect`/`EmitEventEffect`/`CustomEffect`). Suffix discipline (`*Trigger`/`*Guard`/`*Effect`/`*Definition`) is excellent. No `I`-prefix (these are data shapes — correct). No abbreviations. `entityRef`/`roomRef`/`actorRef`/`destinationRef` naming for binding references is consistent.

## Should-be-internal
- `StateMachineInstanceState` / `StateMachineRegistryState` are save/restore serialization types — public for persistence but not authored.
- `EvaluationContext` is what the runtime passes into `evaluate()`; authors building definitions don't construct it. Borderline internal.
- `EffectResult` is the return shape only relevant to authors writing a `CustomEffect.execute` — narrow audience but legitimately public.
Otherwise none obvious — this is a tight surface.

## API shape
- Mostly well-typed discriminated unions (great for authoring and for the book to present). `TransitionTrigger`, `GuardCondition`, `Effect` are all clean unions.
- `unknown` appears in the data-carrying positions: `EntityGuard.value: unknown`, `StateGuard.value: unknown`, `SetTraitEffect.value: unknown`, `SetStateEffect.value: unknown`, `EmitEventEffect.data?: unknown`, `EventTrigger.filter?: Record<string, unknown>`, `CustomEffect`/`EffectResult` payloads. These are inherently dynamic (arbitrary trait/state values), so `unknown` is defensible — but it means guards/effects are unchecked at the value boundary. Worth flagging in the book.
- `CustomGuard.evaluate` and `CustomEffect.execute` take `(world, bindings, playerId)` — consistent param ordering, matching the standalone `evaluateGuard(guard, world, bindings, playerId)` and `executeEffects(effects, world, bindings, playerId, machineId)` helpers.
- `EntityBindings = Record<string, EntityId>` — clean alias.
- Return types present throughout; no missing returns.
- Minor inconsistency: `EffectResult.events[].entities?: Record<string, string>` (free-form) vs `EmitEventEffect.entities?: { actor?; target?; instrument?; location? }` (named slots) — two shapes for "entities on an event."

## Documentation (TSDoc)
Thin — roughly 10-20%. `types.d.ts` has a module header but the interfaces and their fields are almost entirely undocumented (no comments on `StateDefinition`, `TransitionDefinition`, the guard/effect/trigger members, or `EvaluationContext`). `state-machine-plugin.d.ts` has a good header (priority 75 rationale). `state-machine-runtime.d.ts`, `guard-evaluator.d.ts`, `effect-executor.d.ts` have one-line file headers but no per-symbol docs. For a book reference this is the weakest-documented of the five packages relative to its author-facing importance — the definition vocabulary deserves doc comments.

## Book highlights
- `StateMachineDefinition` — top-level author object: `id`, `initialState`, `states: Record<string, StateDefinition>`.
- `StateDefinition` — `transitions`, `onEnter`/`onExit` effects, `terminal`.
- `TransitionDefinition` — `target`, `trigger`, optional `guard`, `effects`, `priority`.
- Trigger union (`TransitionTrigger`): `ActionTrigger` (by `actionId`/`targetEntity`), `EventTrigger` (by `eventId`/`filter`), `ConditionTrigger`.
- Guard union (`GuardCondition`): `EntityGuard`, `StateGuard`, `LocationGuard`, `InventoryGuard`, `CompositeGuard` (and/or/not), `CustomGuard`.
- Effect union (`Effect`): `MoveEntityEffect`, `RemoveEntityEffect`, `SetTraitEffect`, `SetStateEffect`, `MessageEffect`, `EmitEventEffect`, `CustomEffect`.
- `StateMachinePlugin` + `getRegistry()` → `StateMachineRegistry` (`register(definition, bindings)`, `getMachineState`, `getMachineHistory`) — how authors install and inspect machines (priority 75 in the turn cycle).
- `EntityBindings` — the ref-to-EntityId map that connects `entityRef`/`roomRef`/`actorRef` strings to real entities.
- For advanced examples: `CustomGuard.evaluate`/`CustomEffect.execute` and the standalone `evaluateGuard`/`executeEffects`/`resolveRef` helpers.
