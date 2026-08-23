# Session Summary: 2026-08-23 - feat/adr-321-world-index (2026-08-23 00:20 CDT)

## Goals
- Resume the Secret Letter port at Phase 4/6 and author the `hunted`-state mercenary pressure model.

## Phase Context
- **Plan**: `docs/work/secret-letter-port/plan.md`, Phase 4 (change document) and Phase 6 (Chapter 1 vertical slice), both CURRENT.

## Completed
- **Change document**: "The sweep's postures — DECIDED (David, 2026-08-23)": `oblivious → approaching → aggressive` (David: "Maybe 'aggressive' instead of grabbing"); arrival clock as a per-turn `one chance in 2` roll and the captain's arrival kept as a death (David: "Confirmed").
- **`branch-stories/secret-letter/mercenaries.chord`** (new): the wandering mercenaries (plural person, three reversible postures, `patience`/`countdown` counters, the sword), the `swept` trait composed on the fourteen market rooms (the waiting count, the arrival, the held refusal, the escape reset), every line Gentry's from `story.ni:2037-2182`. Imported at the end of `grubbers-market.chord`.
- **Tree document**: a fork on the Alley bite with three branches — capture to death (8 cards), escape by moving while approaching (7), held → going refused → `attack mercenaries` breaks free → away (9). `./sharpee test branch-stories/secret-letter`: **91 cards passing, 103 assertions passing** (00:15 CDT), up from 67/74.
- **GH #304** filed: a refusal keyed to a `randomly` phrase renders the literal word "variants"; `merc-held` carries one arm until fixed.

## Key Decisions
- Posture name `aggressive`; roll-based arrival; death kept (all David, 2026-08-23).
- David: the first cut reads as bookkeeping, not story ("'aggressive' was a signal"). Explicit syntax choices worked through and recorded as **[ADR-325](../architecture/adrs/adr-325-chord-presence-and-duration.md)** — **ACCEPTED** (David, 2026-08-23: "accept the ADR and file the issues"). `mercenaries.chord` stays as a scaffold until the ADR is implemented; no `packages/` change made this session — Claude is the implementer, working issue-by-issue next session.
- **ADR-325 went through three revisions** across a ~20-round syntax conversation with David and two `adr-review` passes (first 12/19 NEEDS WORK; final 19/19 READY). Final decisions:
  - **D1**: a possessive `location` on any entity (not just the player) names a place — its containing room; `here` is sugar for the player's own.
  - **D2**: `move <entity> offstage` — the off-stage sink `remove` couldn't express (seam #4 below), riding the ADR-213 `disappeared` channel.
  - **D3**: timers as named turns, not numbers — built-in `expired` state; verbs `start`/`stop`/`restart`/`reset`/`interrupt`; conditions `is <state>` / `has started` / `has expired`; a `when <timer> expires` clause; `meanwhile` for the mid-timer branch; `interrupted one chance in n` for probabilistic breaks.
  - **D3h**: bare `on going` / `after going` scoped to the player specifically, plus a `when <entity> moves` clause for reacting to others' movement.
  - **D3i**: `kill the player` takes an inline body (the death text lives with the kill, not a separate handler).
  - **D4**: `set <tally> to <n>` legalized on tallies — amends [ADR-264 D2](../architecture/adrs/adr-264-chord-numeric-counters.md), which had only `raise`/`lower`.
  - **D5**: region `landing` — the arrival point when a region is entered without a specific room named.
  - **Withdrawn drafts**: `has been here for N turns` with built-in duration counting (replaced by explicit D3 timers), and random-length timers (replaced by the fixed-timer-plus-interrupt model).
- **Six GitHub issues filed in landing order**: #305 (plural possessive — prerequisite; verified today that `the innkeeper's suspicion` compiles and `the guards' suspicion` fails with `analysis.unknown-counter` against `packages/chord/dist-esm`), #306 (D1–D2), #307 (D3a–g), #308 (D3h–i), #309 (D5), #310 (D4).
- Lessons recorded at `docs/architecture/chord-lessons-learned-timers.md` at David's request ("Chord has to remain simple" — long `while`-chains are symptoms; find the event instead), plus a memory note saved. David's rulings quoted there and in the ADR: *"'aggressive' was a signal"*; *"Everything is a turn"*; *"They are not clocks. They are timers."*; *"I think we have a fixed timer and an interrupt"*; *"Chord has to remain simple."*

## Language/platform seams found (reported, not changed — platform changes need discussion)
1. `move X to <place>` has no "the player's location" destination; the arrival is authored as a trait on the rooms with `it` instead.
2. A trait's `after entering it` binds to the stdlib container-entering interceptor, not room arrival — only a room's own block gets the arrival event. The waiting count is therefore owned by the swept trait's every-turn clause.
3. Counters have `raise`/`lower` only, no `set`; resets are `lower by <ceiling>` relying on clamping.
4. `remove` deletes the entity (terminal) — no off-stage; escaped mercenaries stay where they lost her.
5. GH #304 (above).

## Next Phase
- **Implement the six ADR-325 issues one at a time, in landing order** (#305, #306, #307, #308, #309, #310), showing each diff before starting the next.
- Then rewrite `mercenaries.chord` to the ADR's block (AC-4 in the Acceptance section) — replaces the counter/trait scaffolding with possessive `location`, `offstage`, named timers, `set`, and the movement/expiry clauses.
- Open story decision, not yet made: whether `staggered` becomes a fourth posture (it already appears as a draft state list entry in the ADR's D3 example at line 400 but is not confirmed).
- After that, Phase 6 continues as before: the `npc-teisha.chord` TE20 rewrite around the dress/hat/satchel chain, the woolen cap as a wearable (unlocks the held-back "don't recognize you" arrival branch), the landing grace window and boots beat, the six David placeholder lines, the fourteen-phrase route-clause ruling.

## Open Items
### Short Term
- Implement #305 first (prerequisite for the rest — plural possessive parsing).
- Conspicuous shopper, stallkeeper talk-refusals in the mercenaries' presence, noisy theft rule — each its own increment against `mercenaries.chord` once the ADR-325 rewrite lands.
- A `kick` verb (the source's kick-specific break-free line is held with it).
### Long Term
- Seams 1–4 (recorded below) are now resolved by ADR-325's acceptance rather than open platform questions; seam 5 (GH #304) remains open and unrelated to ADR-325.

## Files Modified
- `branch-stories/secret-letter/mercenaries.chord` (new; scaffold only — stays as-is until ADR-325 is implemented)
- `branch-stories/secret-letter/grubbers-market.chord` — `swept` on 14 rooms; `import "mercenaries"`
- `branch-stories/secret-letter/secret-letter.tests.json` — three branches on the bite card
- `docs/work/secret-letter-port/change-document.md`, `plan.md`
- `docs/architecture/adrs/adr-325-chord-presence-and-duration.md` (new, ACCEPTED)
- `docs/architecture/chord-lessons-learned-timers.md` (new)

---

## Session Metadata
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Rollback Safety**: safe to revert — uncommitted, nothing pushed; ADR and lessons-learned docs are new files with no downstream dependents yet

## Mutation Audit
- Files with state-changing logic modified: `mercenaries.chord` (state changes, counters, `kill`), `grubbers-market.chord` (trait composition). No `packages/` mutation this session — ADR-325 is accepted but unimplemented.
- Tests verify actual state mutations: YES — the three branches assert on the printed consequence of each posture change in sequence (arrival → warning → spotted → grab → captain; dash-away; refused going → break-free), run deterministically at seed 1209.
- Prerequisite verified today (not a test, a manual probe): `the innkeeper's suspicion` compiles and `the guards' suspicion` fails with `analysis.unknown-counter` against `packages/chord/dist-esm`, confirming #305 is a real gap ahead of implementation.

## Test Coverage Delta
- Tree document: 67 → 91 cards, 74 → 103 assertions (unchanged this update — no further story tests run). No package tests touched.
- No new package-level tests this session; ADR-325 implementation (next session) will need real-path tests per rule 13a for each of the six issues since they touch `packages/chord` and `packages/story-loader`.
