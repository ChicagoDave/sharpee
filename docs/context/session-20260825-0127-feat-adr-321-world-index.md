# Session Summary: 2026-08-25 - feat/adr-321-world-index

## Goals
- Resolve the ADR-328 → ADR-327 → ADR-326 chain that gates Phase 3 (#311) of `docs/work/backlog-tier1-2-platform/plan.md`

## Phase Context
- **Plan**: `docs/work/backlog-tier1-2-platform/plan.md` — "Eight platform issues filed by the Secret Letter port's Phase 6 rounds, worked in two tiers"
- **Phase executed**: Phase 3 — "Design and land random-adjacent-room movement as a Chord place expression (#311)" (Large) — this session worked the phase's gating ADR chain, not its Deliverable
- **Tool calls used**: 86 / 400
- **Phase outcome**: Partially completed — the three gating ADRs (328, 327, 326) are ACCEPTED and the plan's status note is refreshed with their rulings; the phase's own Deliverable (platform resolver, Chord grammar surface, tests, real-path fixture) has not started

## Completed

### Recap + pre-session audit
- Clean `npx tsc --noEmit`; 7 stranded devarch event logs (David treats these as ignorable noise); `docs/work/adr-294-rebuild/plan.md` and `docs/work/zoo-chain/plan.md` lack a `**Plan Status**` field. Gate cleared after Session Start.

### ADR-328 — Actors are a platform concept
- Flipped ACCEPTED by David ("flip ADR-328 to ACCEPTED"). Later hand-edited per ADR-327's Supersedes section: D7's last sentence, acceptance item 3, and the Related entry no longer describe an incremental analyzer restriction.

### ADR-327 — Explicit references
- Interviewed to completion via `/devarch:adr-interview` and flipped ACCEPTED by David. Rulings: Q-1 "full implementation" → D7 (named actors fire on ADR-328 D1/D2's `(action, actorId)` path; no player-only v1, no analyzer restriction); Q-2 → D8 (`it`/`its` survive ONLY inside `define trait`, meaning the carrier); Q-3 → D1 own-block exception (bare `on going` stays in the actor's own block).
- During review David raised two questions that became decisions: `the player` in a head is the ROLE (resolves via `world.getPlayer()` at fire time, `runtime.ts:755-756` precedent), folded into D1; and the PC-switch statement, ruled `change the player to <entity>` → D9 (`playable` create-block line gates it at compile time; loader emits `if.event.player.switch_requested {entityId}`; engine consumes at turn end and calls `engine.switchPlayer` (`game-engine.ts:1681`), its first caller anywhere; double switch in one turn = diagnostic).
- D5 generalized to any actor with cap 8 and `runtime.move-arrival-reentry`. Corpus count corrected to 159 heads (73 `… it` + 86 bare, grep dated 2026-08-25). Supersedes section names flip owners: ADR-328 this session; ADR-325 D3h examples and ADR-264 D2 `its` clause amend at the D6 cutover.
- `adr-review` run twice: first 15/19 with six SMALL findings folded, second 19/19 READY.

### ADR-326 — Adjacent-room place expression
- Interviewed to completion and flipped ACCEPTED by David. Rulings: spelling option (b) `move … to a random adjacent room` — no strategy word (D1 inverted: with one possible strategy the slot would have one value; `an adjacent room` alone or a trailing `, randomly` is a compile error); computed-exit directions → D6: adjacency = "where would going take the mover right now" (David: "a computed direction could be legit at a given moment so we can't explicitly rule it out… compute all directions and exclude ones that are not currently available and include those that are").
- Consulted through `RoomBehavior.resolveExit` (`roomBehavior.ts:271`, `ExitResolverContext {world, actorId, random}` at `exit-resolver-binding.ts:29-36`); `undefined` → static destination, `kind:'exit'` → destination with narration events discarded, `kind:'blocked'` → nothing.
- Extends ADR-295 D6's scope (flip owner: the #311 implementation change); the loader holds no `RandomService` today (`runtime.ts:4079` uses persisted chance streams) so the engine's service is threaded to the runtime at bootstrap.
- D5 amended: a `move` arrival fires the room's `after <actor> entering` per ADR-327 D5 — a dependency ADR-327 had recorded one-sidedly. `adr-review` 19/19 after one fold.

### Plan status note refresh
- `docs/work/backlog-tier1-2-platform/plan.md` Phase 3's status note refreshed: ADR-326 ACCEPTED, rulings summarized, the ADR-327 D5 dependency (Phase 3 carries that slice or sequences behind it), noting ADR-327's full reform and ADR-328's program are their own plans, and the Deliverable's old "resolver registration" line is superseded (ADR-326 rules a loader-evaluated place — no resolver registration, no world-index change).

### Memory saved (outside repo)
- `feedback_language_design_needs_full_code_example.md` — David twice asked for full code examples during Chord syntax questions.

## Key Decisions

### 1. ADR-328 ACCEPTED — actors are a platform concept
Named actors fire on the `(action, actorId)` dispatch path already used by the player; no incremental/player-only restriction survives into ADR-327's fuller scope (D7 amended this session per ADR-327's Supersedes section).

### 2. ADR-327 ACCEPTED — explicit references, `it`/`its` scoped to `define trait`, PC-switch gets a real statement
D8 confines `it`/`its` to the trait carrier inside `define trait` blocks (removed everywhere else); D1 keeps bare `on going` valid only in an actor's own block and treats `the player` as a role re-resolved at fire time; D9 adds `change the player to <entity>`, gated by a `playable` create-block line, routed through a new engine entry point (`engine.switchPlayer`, `game-engine.ts:1681`) via `if.event.player.switch_requested`.

### 3. ADR-326 ACCEPTED — adjacent-room place expression has no strategy word, adjacency is computed live
`move … to a random adjacent room` is the only spelling (D1); adjacency is "what going would currently do" rather than a static exit list (D6), computed through `RoomBehavior.resolveExit`, which requires threading the engine's `RandomService` into the story-loader runtime at bootstrap — a platform wiring change the #311 Deliverable must still make.

## Next Phase
- Phase 3 itself is not complete and was not advanced or marked DONE — the plan's phase Status field remains `PENDING` (its status note tracks the informal CURRENT-since-2026-08-24 progress; that inconsistency predates this session and was not corrected, per this agent's writer-separation — it flips phase status only when a phase actually completes).
- **Entry state for continuing Phase 3**: present the ADR-326 mechanism (loader-evaluated place, `RoomBehavior.resolveExit`, `RandomService` threading) and the ADR-327 D5 slice (move-arrival fires `after <actor> entering`) to David per the plan's platform-change discipline, then build (a) the resolver/wiring and (b) the Chord grammar surface, with `pnpm --filter '@sharpee/chord' test` and `pnpm --filter '@sharpee/story-loader' test` green plus a real-path fixture.
- ADR-327's full reform (actor-explicit heads, `it` removal repo-wide, D9 PC-switch statement) and ADR-328's actors program are their own future plans (session-planner), not part of Phase 3.

## Open Items

### Short Term
- Phase 3 (#311) implementation can start; it carries the ADR-327 D5 slice (move-arrival fires entering) as part of its own scope or a hard sequencing dependency.
- Stray `1` file at repo root (a `2>1` redirect artifact containing one Vite deprecation line) — David's call to delete, not touched this session.

### Long Term
- ADR-327's full reform and ADR-328's program need their own plans (session-planner) — explicitly out of scope for Phase 3.
- ADR-295 D6 amendment stamp lands with the #311 change; ADR-325 D3h examples and ADR-264 D2 `its` clause amend at ADR-327's D6 cutover.
- `docs/work/adr-294-rebuild/plan.md` and `docs/work/zoo-chain/plan.md` still lack a `**Plan Status**` field (surfaced by pre-session-audit, not fixed this session).

## Files Modified

**ADRs** (3 files):
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` - ACCEPTED; D7 tail, acceptance item 3, and Related entry amended
- `docs/architecture/adrs/adr-327-explicit-references.md` - ACCEPTED; D1 role rule, D5 cap, D7, D8, D9, Supersedes section
- `docs/architecture/adrs/adr-326-adjacent-room-place-expression.md` - ACCEPTED; D1/D5/D6 folded

**Plan** (1 file):
- `docs/work/backlog-tier1-2-platform/plan.md` - Phase 3 status note refreshed with rulings and the ADR-327 D5 dependency

**Session record** (1 file):
- `docs/context/session-20260825-0127-feat-adr-321-world-index.md` - this file, progressively updated

## Notes

**Session duration**: session started 2026-08-25 01:27 CDT (session 8ae644); duration not separately tracked.

**Approach**: Pure design/ADR work — three interlocking ADRs interviewed and accepted in dependency order (328 → 327 → 326), each via `/devarch:adr-interview` to resolve Open Questions one at a time, with `adr-review` run to 19/19 before acceptance. No source code touched; no builds or tests run.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A — session goal (close the gating ADR chain) fully met; Phase 3 implementation remains as forward work, not a blocker
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-328 needed resolution before ADR-327 (which cites ADR-328's `(action, actorId)` dispatch path), which needed resolution before ADR-326 (whose AC-3 depends on ADR-327 D5); all three resolved in that order this session.
- **Prerequisites discovered**: Phase 3's blocked-stall bounce (AC-3) needs ADR-327 D5 (move-arrival re-entering, cap 8) — surfaced during the ADR-326 interview, not anticipated when the plan was written; the loader's lack of a `RandomService` (persisted chance streams only, `runtime.ts:4079`) was also discovered as a bootstrap-wiring prerequisite for ADR-326's mechanism.

## Architectural Decisions

- ADR-328: Actors are a platform concept — ACCEPTED — named actors dispatch on the same `(action, actorId)` path as the player, eliminating a player-only v1 restriction.
- ADR-327: Explicit references — ACCEPTED — `it`/`its` scoped to trait carriers inside `define trait` only; `the player` is a role resolved at fire time; new `change the player to <entity>` statement (D9) with a compile-time `playable` gate.
- ADR-326: Adjacent-room place expression — ACCEPTED — one spelling (`a random adjacent room`, no strategy word), adjacency computed live via `RoomBehavior.resolveExit`, extending ADR-295 D6's scope.
- Pattern applied: ADR interview → `adr-review` to N/N → user ACCEPTED flip, run three times in dependency order within one session.
- Cross-ADR dependency discovered and recorded: ADR-326 D5 now explicitly depends on ADR-327 D5 (move-arrival entering trigger).

## Mutation Audit

- Files with state-changing logic modified: none — this session touched only ADR documents and a plan status note.
- Tests verify actual state mutations (not just events): N/A
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is forward ADR/design sequencing work, not a bug fix or blocker recurrence.

## Test Coverage Delta

- Tests added: 0
- Tests passing before: N/A → after: N/A — no test changes this session
- Known untested areas: Phase 3's own Deliverable (resolver, Chord grammar surface, real-path fixture) is entirely unimplemented and untested; that is next-phase work, not a gap in this session's scope.

---

**Progressive update**: Session completed 2026-08-25 (session 8ae644)
