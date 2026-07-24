# Session Summary: 2026-07-24 - hatch-scoring (CST)

## Goals
- Check out the container's `hatch-scoring` branch (it ran the scoring + hatch tracks autonomously).
- Explain two implementation "misses" the container recorded.
- Decide whether the plugin/state-machine/extension architecture is sound, and if not, rework it.
- Design whatever that produced, ADR-first.

## Phase Context
- **Plan**: `docs/work/adr-260-261-scoring-ranks/plan.md` (COMPLETE per the container). This session was
  design/ADR work on top of the branch, outside any plan phase.
- **Tool calls**: heavy ADR authoring + `adr-interview`/`adr-review` cycles. No code changed.

## Completed

### Verified the container's two "misses" against source — both correct, one corrected my own review

- **Miss 1 (the bare-`rank` gate is unreachable):** confirmed at `parser.ts:323/525` — a `rank` rung
  only exists inside the `use scoring` body, so a stray one is `parse.rank-outside-scoring` at parse
  time, earlier and more precise than the `analysis.scoring-needs-use` gate the AC asked for. The AC
  clause was unsatisfiable; the grammar makes the illegal state unrepresentable. Not a miss.
- **Miss 2 (promotion narrator derives instead of observing `rank_risen`):** confirmed at
  `game-engine.ts:1145` — `pluginContext.actionEvents` is a frozen snapshot built before the plugin
  loop, so no plugin sees another's output. **This corrected an error I introduced in review**: my
  ADR-260 D6 amendment said "observe the event," which is impossible. The container's derive-from-ledger
  fix is right, and both plugins persist their tracking state (`loader.ts:857`).

### Architecture verdict: sound; one real seam

Plugin model (ADR-120), state machines (ADR-119), extension contract (ADR-215) all held under the
scoring build. The only genuine seam is the **two-tier gate** (miss #1's cousin): `score`/`award` are
pre-existing core grammar needing a semantic gate, while `rank` gets a clean structural one — because
ADR-215 extensions can't contribute core grammar. Recorded, not yet acted on.

### Banded-meter design arc → three scope reductions

Investigating "should scoring's crossing machinery generalize" produced, in order:
1. Rejected a generic `define meter` construct — it genericized a concept with one real consumer and
   read like configuration.
2. Landed on **shared engine, bespoke Chord surface per concept** (owner's framing).
3. The decisive cut: the **continuous-vs-discrete line**. Only concepts with a *continuous number
   underneath* (score, hunger, sanity) need the engine; *discrete named states* (personality,
   reputation-as-standings) already work via `states:`/`define machine` (`onEnter` announces —
   `plugin-state-machine/src/types.ts:35,202`). This dissolved the per-entity and bidirectional forks
   the generic framing had raised.

Result: the engine is **scoring generalized to an arbitrary continuous scalar** — small.

### ADRs written/accepted (all on this branch, uncommitted until now)

- **ADR-262 (ACCEPTED)** — the internal banded-scalar crossing engine: `bandOf` in world-model, a
  crossing-watcher TurnPlugin factory, one generic `if.event.band_crossed` event carrying the full
  span (`bandsCrossed[]`), four verbosity modes (all/collapsed/combined/silent), one-directional,
  derive-not-store. No authoring construct. Scoring refactored on as consumer #1. Fixes the shipped
  multi-band collapse (`rank-watcher-plugin.test.ts:97`). `adr-review` 10/16 → 16/16 (five fixes; the
  sharpest: acceptance #1 reached for combat health, which its own D8 scopes out — same "reached for a
  consumer its rules exclude" pattern as ADR-260).
- **ADR-263 (ACCEPTED)** — hunger + sanity as continuous-meter extensions over the 262 engine;
  personality + reputation documented as existing-syntax patterns (no new construct). `adr-review`
  11/15 → 15/15 (six fixes; the two blockers: hunger's decay and death re-pointed to Chord's existing
  `on every turn` and `kill the player` rather than invented — the session's recurring "reuse the
  existing construct" catch). Eating reuses `if.event.eaten` + `nutrition` (missing = zero).
- **ADR-264 (NAMED, unwritten)** — a generic Chord numeric-counter primitive, spun off from ADR-263
  Q-4: Chord has no way to raise a plain number (`award` is dedup-by-identity). Sanity's madness is an
  instance. Foundational; deferred to its own session.
- **ADR-261 (AMENDED)** — D7's silence-by-default reversed by ADR-262 D3: silence is now the explicit
  `announce silent` mode, a phraseless rung renders an overridable platform fallback, and
  `if.event.rank_risen` → `if.event.band_crossed`.

## Key Decisions

1. **Architecture is sound; do not rework the three subsystems.** The banded machinery is the only
   thing worth sharing, and narrowly.
2. **Shared engine, bespoke language per concept** — no generic `define meter`.
3. **Continuous vs discrete** decides what needs the engine; discrete stats use existing `states:`/
   `define machine`.
4. **Four announce modes; silence is explicit** — reverses ADR-261 D7 (recorded, amended).
5. **Report each elevation** — the full-span event is a data-layer invariant in every mode; the shipped
   multi-band collapse becomes the `collapsed` mode.
6. **`use scoring`/`rank` kept as sugar** over the engine (carries enablement/`no_scoring` the engine
   lacks); ranks are consumer #1.
7. **Chord needs a numeric-counter primitive** (ADR-264) — a real gap, spun off, not bridged silently.

## Next Phase
- **Write ADR-264** (numeric counters) as its own session — foundational, non-urgent (blocks only
  sanity, the non-blocking fast-follow).
- **Build the actual multi-band "report each elevation" fix** on `hatch-scoring` — 262/263 specify it;
  nothing implements it yet. This is the only player-visible item.
- The two-tier-gate seam remains recorded, unacted.

## Open Items
- ADR-264 unwritten; sanity's build depends on it (hunger does not).
- The multi-band scoring fix is designed but unbuilt.
- These ADRs are on `hatch-scoring`, not `main` — they reach main when the branch merges. ADR-261's
  amendment is therefore on hatch-scoring only until then.

## Files Modified
- `docs/architecture/adrs/adr-262-define-meter-banded-derived-state.md` — new, ACCEPTED
- `docs/architecture/adrs/adr-263-standard-meters-hunger-sanity.md` — new, ACCEPTED
- `docs/architecture/adrs/adr-261-chord-use-scoring-ranks.md` — D7 amended (reversal)

## Notes
No code changed — all ADR/design. The session's throughline: **reach for the existing construct before
inventing one** (personality→`states:`, eating→`if.event.eaten`, hunger decay→`on every turn`, death→
`kill the player`), and **scope-reduce ruthlessly** (generic construct → engine + bespoke concepts →
only the continuous ones). `adr-review` again caught real defects in my own drafts, including one
tracing back to an error I made in a prior review this session.

---

## Session Metadata
- **Status**: COMPLETE
- **Blocker**: N/A
- **Rollback Safety**: safe (documentation only)

## Architectural Decisions
- ADR-262 (new, ACCEPTED): banded-scalar crossing engine.
- ADR-263 (new, ACCEPTED): hunger/sanity meters + discrete-stat pattern.
- ADR-264 (named): generic numeric counters — spun off, unwritten.
- ADR-261 (amended): D7 silence-by-default reversed by 262 D3.

## Recurrence Check
- Recurring pattern, YES: "reached for a consumer/construct that its own scoping excludes" appeared in
  both 262 review (combat health vs D8) and echoes ADR-260's "schema looked used." And "reuse the
  existing construct" was the fix in three separate places. Not a bug class needing a sweep — a review
  lens that keeps paying.

## Test Coverage Delta
- None (no code). ADRs specify new coverage incl. REAL-PATH via hunger through `dist/cli/sharpee.js`.

---
**Progressive update**: Session completed 2026-07-24 03:27
