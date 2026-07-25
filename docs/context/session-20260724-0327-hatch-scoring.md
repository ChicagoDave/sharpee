# Session Summary: 2026-07-24 - hatch-scoring (CST)

## Goals
- Check out the container's `hatch-scoring` branch (it ran the scoring + hatch tracks autonomously).
- Explain two implementation "misses" the container recorded.
- Decide whether the plugin/state-machine/extension architecture is sound, and if not, rework it.
- Design whatever that produced, ADR-first.

## Phase Context
- **Plan**: `docs/work/adr-260-261-scoring-ranks/plan.md` (COMPLETE per the container). This session was
  design/ADR work, then a verification sweep after the container implemented it.
- **Tool calls**: ADR authoring + `adr-interview`/`adr-review` cycles, then a build/test/real-path sweep.

## Verification sweep (after the container implemented 262/263/261)

Pulled the container's implementation commit `91eb33c7` and swept it. Findings:

- **Engine is faithful** to the ADRs (band.ts, band-crossing.ts — full-span event, four modes, global
  fallback, rise-only, derive-not-store, two-plugins-one-detector). Multi-band "report each elevation"
  fix real and tested. Unit suites green (band 6, band-crossing 13, scoring 14, hunger 5, chord 525).
- **The one real defect: the branch never built.** `ext-scoring` and `ext-hunger` were missing from
  `PLATFORM_PACKAGES` and `BUNDLE_ALIASES` (`tools/repokit/src/repo.ts`), so `./repokit build` never
  built them — true for BOTH tracks, so the whole branch's green was vitest-only (source resolution),
  and the ADR real-path gates were never runnable. **Fixed** (added both, mirroring `ext-basic-combat`;
  commit `93da76aa`). Build now passes, bundle builds.
- **Two apparent failures were NOT defects** — both stale/obsolete artifacts of the never-built branch,
  each caught by verifying against source before editing:
  1. alias↔message bijection (message-alias-map) — **stale `lang-en-us` dist**; the fresh build cleared
     it. Source was correct; nearly "fixed" correct files.
  2. `dotted-phrase-keys.test.ts` (ADR-230 D5) — **obsolete**: ADR-254 (ACCEPTED) retired dotted
     `define phrase` keys, naming `if.action.taking.fixed_in_place` specifically. The parser is correct;
     the ban is tested by `dotted-key-rejection.test.ts` and the replacement (`override message
     taking-fixed-in-place`) by `message-override.test.ts`. Deleted the redundant orphan.
- **REAL-PATH green**: the hunger `starve` transcript passes through the fresh `dist/cli/sharpee.js`
  (ADR-262 #7 / ADR-263 #6). story-loader 360/360 after the delete.

**Sweep verdict**: implementation sound, real path works. Only defect was build-order wiring; the other
two "failures" were stale-branch artifacts, not logic bugs. Verifying each against source before
touching it prevented "fixing" three correct things.

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
- **ADR-265 (PARKED)** — captured author feedback (`docs/feedback/intfiction-20260724.txt`,
  Nathaniel Lindell: "the library in readable Chord form"). Not a decision — records the three-way
  distinction that makes it tractable: (A) self-hosting the compiler = off the table; (B) stdlib
  implemented in Chord = impractical (inverts the layering, every stdlib change becomes grammar churn);
  (C) a readable Chord *rendering* of the standard actions = the practical target. Key point: the
  grammar-extension model already gives each capability a readable Chord surface, so B is *unneeded*,
  and parity is a surface property, not implementation. Trigger to un-park: the IDE (ADR-258) hosting
  an index, or a second author reporting the gap.

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
- `docs/architecture/adrs/adr-265-standard-library-readable-chord-form.md` — new, PARKED
- `docs/feedback/intfiction-20260724.txt` — new (author feedback, source for ADR-265)

Committed across three pushes to `hatch-scoring`: `85caa7a0` (262/263/261 + summary), `340f57ca`
(265 + feedback), and this summary update.

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
**Progressive update 1**: ADR design arc (262/263, 261 amendment) — 2026-07-24 03:27
**Progressive update 2**: worked author feedback; parked ADR-265 ("stdlib in readable Chord form") —
distinguished self-hosting (no) from a readable Chord rendering (the practical target); confirmed the
grammar-extension path makes stdlib-in-Chord unneeded.
**Progressive update 3**: container implemented 262/263/261 (`91eb33c7`); verification sweep found the
branch never built (ext-scoring/ext-hunger missing from repokit's build order — fixed, `93da76aa`);
two other "failures" were stale-branch artifacts (stale lang dist; obsolete ADR-230 test deleted);
real-path starve transcript green; story-loader 360/360. Sweep clean.
**Progressive update 4**: merged hatch-scoring to main (fast-forward, `83d97e63`).
**Progressive update 5**: docs + website reference pass for scoring/hunger. Updated `chord-language.md`
(§4.5 announce modes + new Hunger subsection), `stdlib-reference.md` (ledger-model SCORE + regenerated
transcript), `chord-grammar.md` (extension surface: hunger, announce, D7 fix), and the website (two
scoring guide pages gained the `use scoring` gate + a Ranks section; new `guide/flow/hunger` page).
Commits `7d1d6519`, `4349b9a3`, `9d27a8fb`, `795922aa`. **Recurring finding: the stale ADR-261 D7
"a rung with no `says` is silent" claim appeared in every reference doc** — the container shipped the
ADR-262 D3 reversal in code but never updated the prose. Caught by checking each doc against shipped
behavior, not the ADRs. All doc prose follows David's voice (no em-dashes, complete sentences,
example-first); memory `book-voice-rules` corrected to note it governs reference/website docs, not
just the book.
**Progressive update 6**: platform published to npm at **3.5.0** (David, from the CLI). The version
stamps were committed here (`chore(release)`). ADR-264 (numeric counters) and ADR-265 (un-park
stdlib-in-Chord) are being worked in the docker container on branch
`adrs-264-265-counters-stdlib-reference`, not part of this session.
**Progressive update 7**: wrote PR #184 and merged the container's ADR-264/265 branch to main
(`12a274d9`). Merged locally (not blind) given the container's track record: main had diverged, so it
was a real merge. Only `search-index.json` conflicted (generated — regenerated from merged content).
**Verified before landing on main**: `./repokit build` green, chord counters (12), story-loader
counter/reference/stdlib-chord (14), counter-demo real-path through the bundle (7), full story-loader
regression 374/374. This branch was sound (unlike the prior one) — verification confirmed rather than
caught. ADR-265's implementation is the generator/rendering path (option C, the "readable Chord
rendering" I recommended in the parking ADR), not stdlib self-hosting (option B) — so the un-park
landed on the practical path, not a reversal of the parking reasoning.
