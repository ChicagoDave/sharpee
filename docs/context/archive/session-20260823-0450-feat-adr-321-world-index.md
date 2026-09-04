# Session Summary: 2026-08-23 - feat/adr-321-world-index (04:50 CDT)

## Status: COMPLETE

## Goals
- ADR-325 GH #308 (D3h–D3i), #309 (D5 region landing), #310 (D4 `set` on tallies) — the last three issues in landing order.

## Completed
- **Player's own going (D3h)** — parser accepts a bare `on going`/`after going` head (end / `while` / `, once` after the verb; only `going` has the bare form) as binding `self`. Analyzer `checkGoingBinding`: bare form on a non-player owner or in a trait → `analysis.going-self-owner`; `on going it` in the player's block → `analysis.going-player-it`. Runtime: a self arm answers any room target on the going action's source-room slot with `it` = the player; the `going` dispatching interceptor is additionally registered under `TraitType.ROOM` so unmarked rooms reach it. `buildInterceptor` keys on an `isMine(target)` predicate instead of owner-id equality. No stdlib change.
- **`when <entity> moves[, while …]` (D3h)** — `MoveClause`/`IRMoveClause` (`mover`, `condition`, `body`) on entity blocks; analyzer rejects a non-entity mover (`analysis.move-clause-mover`); runtime chains `if.event.actor_moved` per clause and fires when `movedActorId(event)` (envelope `entities.actor`, fallback payload `actor.id`) is the mover's world id. `fireMoveClauses` test entry mirrors `fireEventClauses`. Refusals inside any `when` block (`moves` and `expires`) are now `parse.react-refusal` — `isReactionBlock`.
- **`kill the player` inline body (D3i)** — parser reads an indented prose block like `phrase` does (`parse.kill-body` for key + body); analyzer registers it under `death-at-<line>-<col>` and lowers the statement to that key, so the runtime kill path is untouched.
- **Gap closed from #307**: `collectInlineTexts` never walked `when … expires` bodies (entity or header), so an inline `phrase x` body there would have failed at emit time; now walks timer and move clause bodies, owner-scoped.
- Tests: `chord/tests/movement-clauses.test.ts` (16), `story-loader/tests/movement-clauses-runtime.test.ts` (11); 6 AST golden snapshots updated (`moveClauses: []` wrapper only).
- Real-engine check via `dist/cli/sharpee.js --exec` on a scratch story: `when the player moves` fired on the completed move only; `on going while …` refused every later go with no `when … moves` firing; `after going → restart waiting` spoke its turn line the turn after; inline kill text spoke and the engine stopped.
- **#309 region landing (D5)** — `landing <room>` / `landing, randomly|cycling|stopping: <rooms>` on a region block (`LandingDecl` → `IRLanding`). Gates: `parse.landing-strategy` (list without a strategy word, single room with one, unknown word), `parse.landing-duplicate`, `analysis.landing-host` (non-region), `analysis.landing-kind` / `analysis.landing-not-contained` (rooms must be rooms the region contains, through nesting too), `analysis.region-not-a-place` (a region without a landing used as a `move` destination or as the owner of `'s location`), `analysis.landing-set-target`. Runtime: `evaluator.drawLanding` keeps `chord.landing.<region>` (`{rooms, cursor, seed}`, world ids, seeded lazily from the IR; the `randomly` stream is per-region — story seed folded with the region id — persisted so save/restore resumes it); `resolvePlace` and the `location` field read both land there; `set <region>'s landing to <room>` replaces the list with one room and rewinds. Tests: `chord/tests/landing.test.ts` (10), `story-loader/tests/landing-runtime.test.ts` (6); 6 snapshots updated (`landing: null`).
- **#310 `set <tally> to <n>` (D4)** — analyzer's `set` case probes `counterTargetOf` (same bare/possessive forms as raise/lower) and lowers to a new `set-counter` IR statement (number literal only — `analysis.set-counter-value`); runtime clamps to the declared bounds and writes the counter key. ADR-264 D2 stamped with the amendment. Tests: 5 in `chord/tests/counter.test.ts`, 3 in `story-loader/tests/counter-loader.test.ts`.
- **Pre-existing hole closed**: the `set` parser never checked end-of-line, so `set x to 0 when <cond>` silently dropped the condition. `set` now takes the statement `when` suffix like every other mutator (`stmtWhen` on the AST/IR, runtime gated on `holds`) and rejects trailing words (`parse.set-trailing`).
- Real-engine checks via `dist/cli/sharpee.js --exec`: cycling landing moved the monkey to the East Gate then the Hat Stall on successive entries (witnessed `exited`); `set madness to 0 when madness is at least 8` fired the threshold phrase on turns 2/4/6 only (the clamp alone would have fired it every turn from 2).
- Suites: chord 985 passing, story-loader 603 passing; Secret Letter 91/103, fernhill 36/40, ides-of-march 39/48 — 0 failures.

## Key Decisions
- The player's going rides the source-room interceptor slot (registered under the room trait) rather than a new actor slot in `goingLifecycle` — keeps the ADR's "no engine or stdlib surface" non-goal and needs no platform discussion.
- Two `when … moves` clauses on one owner run in declaration order with live `while` evaluation, so the second sees the first's mutation (same as on-clause arms). Observed in the scratch run; left as-is — it matches every other clause list.
- `when … moves` is entity-owned only (no story-header form) — the ADR's examples are all entity-owned.
- A one-room landing never advances its cursor (`set` leaves cursor 0); the `randomly` stream is per-region rather than the shared `chord.rng` stream, per the ADR's "per-region seeded stream".
- Statement order matters for `set` + gated phrase in one clause: a `phrase … when` placed after `set … to 0 when` sees the reset value (the mutations pass decides every `when` first, in source order). Not a bug; noted for the mercenaries rewrite.

## Open Items
- The `mercenaries.chord` rewrite (AC-4) and the `staggered` posture decision — all six ADR-325 issues now landed.
- story-loader still has no real-`GameEngine` turn harness (needs `parser-en-us` devDependency — a package change to raise with David); engine-turn checks go through the CLI bundle.

## Files Modified
- `packages/chord/src/{ast,ir,parser,analyzer}.ts`, `packages/chord/tests/{movement-clauses,landing}.test.ts` (new), `counter.test.ts`, 3 snapshot files
- `packages/story-loader/src/{runtime,evaluator,event-contract,state-keys}.ts`, `packages/story-loader/tests/{movement-clauses-runtime,landing-runtime}.test.ts` (new), `counter-loader.test.ts`
- `docs/architecture/adrs/adr-264-chord-numeric-counters.md` (D2 amendment)
- `docs/context/project-profile.md` (refreshed by dev-context-detector)

## Next Phase
- The `mercenaries.chord` rewrite to the ADR's block (AC-4) with the four tree-document lines re-pinned, and the `staggered` posture decision with David.

## Notes
- Session started: 2026-08-23 04:50 CDT

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Rollback Safety**: safe to revert — additive AST/IR fields, a new interceptor registration under the room trait, a new event chain; the only behavior change to existing programs is that `refuse`/`must` inside `when … expires` is now a parse error (it was a silently-dead refusal before).

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/runtime.ts` — `bind`, `fireMoveClause`, `buildInterceptor`, `resolvePlace`, `set`/`set-counter` cases; `packages/story-loader/src/evaluator.ts` — `drawLanding`, `setLanding`.
- Tests verify actual state mutations: YES — timer/state/location records after the interceptor phases and chained events; the player's `HealthTrait` after the inline kill; `chord.landing.<region>` cursor/rooms and the entity's location after each draw; the counter key after `set`. mutation-verification ran on #308 (one gap, fixed: HealthTrait assertion) and #309 (clean).

## Test Coverage Delta

- Tests added: chord 955 → 985 (+30); story-loader 584 → 603 (+19).
- Tree documents unchanged: Secret Letter 91/103, fernhill 36/40, ides-of-march 39/48.
