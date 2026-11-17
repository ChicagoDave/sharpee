Looked. Two things change, one of them is the actual answer.

**My caveat is retired: moves are free at the package boundary.** `package.json` exports only `"."` — no subpath wildcards — so nothing outside can deep-import `@sharpee/engine/src/...`. Any file can move anywhere inside `src/` and no consumer notices, provided `index.ts` re-exports the same names.

**But the thing stopping the package from having shape isn't the directory layout — it's `index.ts`.** It's `export *` on nearly everything: `snippet-validation`, `combatant-health-validation`, `capability-dispatch-helper`, `vocabulary-manager`, `save-restore-service`, `turn-event-processor`, `platform-operations`. The package has no distinction between its contract and its internals. Every extraction out of the facade became public API the moment it got a file. That's the mechanism behind the loop I described: there's no *inside* for a concern to move into, so it either stays in the facade or gets published to the world. Six beautiful directories won't change that on their own.

The listing confirms the diagnosis with numbers:

- **Nine root modules whose only internal consumer is `game-engine.ts`** — `snippet-validation`, `combatant-health-validation`, `save-restore-service`, `vocabulary-manager`, `scene-evaluation-plugin`, `language-provider-interface`, and near-misses `story`, `actor-turn-plugin`, `engine-random-service`. Not modules. The facade's private parts, in files, published.
- **`types.ts`: 376 lines, imported by 27 files, holding four unrelated concerns** — turn results, engine state, input modes, and the five introspection summary types. That's where concepts go when no module owns them.
- **`turn/` is already 28 files** named for domain steps — `parse`, `validate-input`, `execute-command`, `player-switch`, `detect-death`, `ending`, `render-prose`. The precedent is yours, not Evans's. And `turn/command-history.ts` exists *right now* while the 106-line `updateCommandHistory` body sits in the facade — the destination is already built and waiting. That's Phase 1 in one line.

**Two clusters I couldn't see before.** `action-context-factory` (367) and `capability-dispatch-helper` (425) are both imported by `command-executor` (726), together with `shared-data-keys`. That's ~1,550 lines of command execution as four unnamed root files — the second-largest concentration in the package after `turn/`, and the one my earlier grouping missed entirely.

Revised, against the real listing:

- `turn/` — exists; + Phase 1's bodies, `turn-event-processor`
- `command/` — `command-executor`, `action-context-factory`, `capability-dispatch-helper`, `shared-data-keys`
- `install/` — `story`, both validators, `narrative/`, + Phase 2's projection and Phase 4's steps
- `session/` — `save-restore-service`, `engine-random-service`, `platform-operations`
- `ports/` — `parser-interface`, `language-provider-interface`, + Phase 6's adapter
- `introspection/` — the function *and* the five summary types
- `plugins/` — the two plugin files
- `prose-pipeline/`, `sound/` — exist

`types.ts` then holds what's actually shared: `TurnResult`/`CommandResult`, `GameContext`, `EngineConfig`, `InputModeHandler`.

**Three deltas to the plan.** Phase 3 should move `ActionSummary`/`TraitSummary`/`BehaviorBindingSummary`/`MessageSummary`/`EngineIntrospection` out of `types.ts` alongside the function — it currently mentions only the function and `PLATFORM_PREFIXES`, and leaving the types behind reproduces the problem at the type layer. Phase 4's validators should move as files under `install/`, not only be named as steps. And the `index.ts` narrowing is worth its own line item, separate from the moves, because it's the only part that's a real API change — the moves aren't.

**Cost, and it's not zero.** 50 of the 75 test files import root-level `src/` modules directly (`story` 18, `engine-random-service` 11, `types` 10). Mechanical — extensionless relative paths, a sed pass — but that's the whole cost of the reorg, and it's worth knowing it's fifty files rather than five before scheduling it.

Sequencing: I'd still fix the shape on paper now and move files after Phase 4. The moves are byte-identical by construction and invisible outside the package, so they gate cheaply whenever they land. The `index.ts` narrowing needs a consumer grep across the other packages first — which is the one thing I can't check from here.