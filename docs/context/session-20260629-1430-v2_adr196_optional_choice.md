# Session Summary: 2026-06-29 (1430) — v2_adr196_optional_choice

## Goals

- Draft, review, and begin implementing **ADR-196 — Optional / Choice Atoms & the Text-State Store** (the next phrase-algebra atom after ADR-195 Slot).
- Land Phases 1–3 (if-domain contract → persistent store → Assembler realization) with green builds/tests at each step.

## Status: IN PROGRESS — Phases 1–3 COMPLETE & committed; Phase 4 designed, not yet coded

## What happened

### ADR + plan (accepted)

- Discovered **ADR-196 did not exist** — it was only forward-referenced by ADR-192/195. Drafted it from the contracts those ADRs pin on it (the `Optional`/`Choice` modifier kinds + the `textState` seam).
- `/adr-review` → **15/15 READY**; `/devarch:plan-review` → **TENSIONS ONLY** (one advisory: the realize-time counter write, pre-authorized by ADR-192 §7).
- ADR accepted (`docs/architecture/adrs/adr-196-phrase-algebra-optional-choice-text-state.md`, Status: ACCEPTED).
- Plan written: `docs/work/dynamic-text/adr-196-optional-choice-plan.md` (5 phases).

### Branch setup

- Merged `v2_adr195_slot` → `main` (fast-forward; **local only, NOT pushed**), then cut `v2_adr196_optional_choice` from the updated `main`.

### Phase 1 — if-domain contract (commit `39a09c59`)

- `packages/if-domain/src/phrase.ts`: filled the field-less `Optional` (`child`, `present`) and `Choice` (`alternatives`, `selector`, `entityId`, `messageKey`) stubs.
- Tests + contract block; if-domain **79/79**; typecheck clean.

### Phase 2 — persistent text-state store (commit `6b930500`)

- `world-model/capabilities.ts`: `StandardCapabilities.TEXT_STATE = 'textState'`.
- `engine/game-engine.ts`: registers `TEXT_STATE` at setup (mirrors `COMMAND_HISTORY`).
- `engine/render-context.ts`: `WorldTextStateStore` replaces the no-op `EmptyTextStateStore`; reads/writes the capability, self-registers defensively, degrades to empty-store on a capability-less world. `WorldModelLike` gained **optional** capability accessors. Factory gained optional 4th `textState` param; `pipeline.ts` wires it.
- REAL-PATH test against a real `WorldModel` (set/get, isolation, **toJSON→loadJSON round-trip** AC-8, absent-capability default AC-9). Engine **457 pass / 7 skip**; typecheck clean.

### Phase 3 — Assembler Optional/Choice realization (commit `9c5838d2`)

- `lang-en-us/english-assembler.ts`: `Optional` case (`present ? child : Empty`); `Choice` case via `selectChoice` (5 selectors, stored-number encoding, advances `ctx.textState`). Determinism via seeded `mulberry32` (FNV-1a seed) — no `Math.random`/`Date.now`.
- **`renderList`**: extended Empty-absorption to drop items realizing to `""` (Optional-absent / Choice→Empty) — fixes a latent dangling-comma gap in shared ADR-190 list code.
- `errors.ts`: stub map emptied; `PhraseNotImplementedError` is now a defensive guard (throw casts past the proven-exhaustive `never`).
- No parser route (ADR §5): asserted `{?…}`/`{#…}` and `{optional:…}`/`{choice:…}` reject at parse time; code-built phrases pass through.
- lang-en-us **337/337**; typecheck clean.

## Key build note (cross-package .d.ts)

Workspace packages resolve each other from compiled `.d.ts`, not source. After editing if-domain / world-model **source**, you must `pnpm --filter <pkg> build` so dependents typecheck against the new declarations. This bit twice this session (world-model in Phase 2, if-domain in Phase 3). `dist`/`dist-esm` are gitignored — they don't pollute commits.

## Next: Phase 4 — room first-visit bugfix (S14), DESIGNED, ready to code

**Root cause:** `looking-data.ts:103` and `:301` hardcode `const firstVisit = true`. And `looking.ts` execute sets `roomTrait.visited = true` **before** `report` builds data, so reading `visited` in report always sees `true`.

**Fix (mirror `going`, which already does this correctly — `going.ts:350–353`, `going-data.ts:84`):**

1. `looking.ts` execute: `const isFirstVisit = !RoomBehavior.hasBeenVisited(room)`; `context.sharedData.isFirstVisit = isFirstVisit`; then mark visited only if first. Import `RoomBehavior` from `@sharpee/world-model`.
2. `looking-data.ts`: replace both `const firstVisit = true` (lines 103, 301) with `const firstVisit = context.sharedData?.isFirstVisit === true`.
3. **initialDescription rendering:** in `buildRoomDescriptionData` (return object at lines 109–129), on first visit prefer `roomTrait.initialDescriptionId` / `roomTrait.initialDescription` over `identity?.descriptionId` / `location.description` for the `roomDescriptionId` / `roomDescription` fields. The engine room handler (`engine/prose-pipeline/handlers/room.ts:96–105`) reads `data.roomDescriptionId ?? data.room?.descriptionId`, then `data.room?.description ?? data.roomDescription`. RoomTrait fields live at `roomTrait.ts:53,57`.
   - Also check `determineLookingMessage` line 267 (`params.description = location.description`) — decide if it needs the same initial-vs-standard swap.
4. **Test (AC-12):** stdlib looking transcript/unit test — enter a room with `initialDescription` → see it; re-enter → standard description.

**Watch:** stdlib + world-model are platform — gated, user-authorized for ADR-196. `visited` is already set (`looking.ts:57`, `going.ts:367` via `RoomBehavior.markVisited`); no roomTrait schema change needed.

## Then: Phase 5 — Friendly Zoo consumers (C1 Optional + C2 Choice) + transcripts (AC-8 e2e / AC-13)

Story-level (autonomous). C2 must include a save→restore→re-trigger transcript proving the counter resumes. Rebuild lang-en-us + bundle before transcript tests.

## Git state at pause

- On `v2_adr196_optional_choice`, working tree **clean**. Phases 1–3 committed.
- `main` is ahead of `origin/main` (the slot fast-forward) — **unpushed**. Nothing on this branch is pushed.

## Session Metadata

- **Status**: IN PROGRESS
- **Blocker**: none
- **Estimated Remaining**: Phase 4 (small) + Phase 5 (medium) + merge to main
- **Rollback Safety**: safe — all changes additive; no schema migration (absent `textState` capability ⇒ counter 0)
