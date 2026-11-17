# Findings — @sharpee/plugins

## Author-relevance
Extension-facing (lightly platform-internal). Defines the `TurnPlugin` contract that NPC/scheduler/state-machine plugins implement, plus the `PluginRegistry` the engine uses to run them after each action. The book references this only to explain how the turn-cycle extension points work and how custom turn plugins are written; authors rarely implement `TurnPlugin` directly.

## Naming
Clean. `TurnPlugin`, `TurnPluginContext`, `TurnPluginActionResult`, `PluginRegistry` — consistent `TurnPlugin*` prefix, no abbreviations, no `I`-prefix (consistent with the project's selective convention for behavioral contracts). Method names (`onAfterAction`, `getState`/`setState`, `register`/`unregister`/`getAll`/`getById`) are conventional.

## Should-be-internal
- `PluginRegistry.getStates()` / `setStates()` (bulk `Record<string, unknown>`) are save/restore plumbing for the engine, not extension authors — borderline internal, but harmless.
Otherwise none obvious; this is a tiny, focused surface.

## API shape
- `unknown` is used deliberately for opaque plugin state: `getState?(): unknown`, `setState?(state: unknown)`, `PluginRegistry.getStates(): Record<string, unknown>`. This is the intended type erasure (each plugin owns its own state shape) but means the contract is untyped at the boundary — worth a one-line note that state is plugin-private.
- `TurnPluginContext` is well-typed (`WorldModel`, `EntityId`, `SeededRandom`, `ISemanticEvent[]`); `actionResult?.sharedData?: Record<string, unknown>` is the only loose field.
- `onAfterAction` returns `ISemanticEvent[]` — consistent with the events-as-return-value pattern across all plugins.
- Param ordering consistent; no missing return types.

## Documentation (TSDoc)
Sparse — roughly 0%. No module header, no doc comments on `TurnPlugin`, `TurnPluginContext`, `TurnPluginActionResult`, or `PluginRegistry`/its methods. The types are self-explanatory from names, but for a book reference the `onAfterAction` contract (when it fires, ordering by `priority`, that returned events are merged into the turn) is undocumented and worth adding.

## Book highlights
- `TurnPlugin` — the extension contract: `id`, `priority` (higher runs first), `onAfterAction(context): ISemanticEvent[]`, optional `getState`/`setState`. This is the seam the book should use to explain how NPCs/scheduler/state-machines hook the turn cycle.
- `TurnPluginContext` — what a plugin receives each turn: `world`, `turn`, `playerId`, `playerLocation`, `random` (`SeededRandom`), and the just-completed `actionResult`/`actionEvents`.
- `PluginRegistry` — how the engine collects and orders plugins; relevant when explaining the documented priorities (NPC 100 → state-machine 75 → scheduler 50).
