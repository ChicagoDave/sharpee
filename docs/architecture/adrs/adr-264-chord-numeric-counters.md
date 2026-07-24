# ADR-264: Chord numeric counters — a raisable named number

## Status: DRAFT (2026-07-24) — proposes a generic numeric-counter primitive for Chord: a named number an author can `raise`/`lower` and test in conditions, persisted as story state. Spun off from ADR-263 Q-4, where `use sanity`'s "madness" needed a raisable number and Chord had none. Foundational language addition — warrants `/devarch:adr-interview` on the Open Questions before ACCEPTED. Not implemented.

## Parent: ADR-263 (`use sanity` raises a madness counter from `on` clauses — the forcing consumer; hunger does NOT need this, its severity is system-internal). Relates to: ADR-129/260/261 (the score ledger / `award` — identity-based and dedup, NOT additive), ADR-119 (`define machine` / `change to <state>` — discrete named states, not a number), ADR-262 (the banded-scalar crossing engine — a counter is exactly the kind of continuous scalar a meter bands over; A+B compose), ADR-254 (kebab story keys), ADR-257 (language versioning), ADR-236 (`on every turn` daemons, one source of raises).

## Date: 2026-07-24

## Context — verified, not assumed

Chord has three constructs that "change a value," and **none is an additive counter**:

- **`award <name>`** (ADR-261/260) is **dedup-by-identity**: it grants a scoring identity once, and
  `award treasure` twice is a single award (`world/ScoreLedger.ts` `award` returns false on a repeat).
  It cannot express "+15 each time."
- **`change to <state>`** (ADR-119 state machines) moves between **discrete named states**
  (`introvert`/`ambivert`/`extrovert`). There is no number underneath — you cannot add to a state.
- **`score <name> worth N`** attaches an owner-qualified **scoring identity** summed into the one
  global ledger the SCORE verb reads. Also identity-based, and it is *the score*, not an arbitrary
  named quantity.

So an author who wants a plain number that moves — sanity's madness, a suspicion meter, a tally of
how many times a thing happened, a consumable resource — has **no Chord spelling**. Today they drop to
a TypeScript hatch. ADR-263 D2 hit this directly: `use sanity` is a fine concept *surface*, but the
raise it needs (`raise madness by 15` from an `on` clause) has no primitive beneath it, which is why
ADR-263 spun the primitive out to this ADR rather than folding a bespoke counter into sanity.

This is a **language primitive**, deliberately separate from any one meter: madness is the first
consumer, but a counter is a general tool (and, per ADR-262, the natural scalar a banded meter sits
on — `use sanity` = a counter (this ADR) + a band ladder (ADR-262)).

## Decision (proposed — resolve the Open Questions before ACCEPTED)

### D1 — `define counter <name> [starts <n>] [between <lo> and <hi>]`

A named numeric counter, declared in the story header or body. `starts` sets the initial value
(default `0`); optional `between <lo> and <hi>` bounds it (mutations clamp, see D2). The name is a
kebab key in the story namespace (ADR-254). The counter is **story state** — saved and restored with
the world (D5), exactly as ADR-263's hunger severity is. A `raise`/`lower`/condition naming an
undeclared counter is a compile error (`analysis.unknown-counter`), so a typo cannot silently create a
second counter.

### D2 — `raise <counter> by <n>` / `lower <counter> by <n>`

The additive mutation, usable anywhere an effect runs — `on` clauses, `after`/`before`, `on every
turn` daemons (ADR-236). `raise madness by 15`; `lower suspicion by 1`. `<n>` is a non-negative
integer literal; **`lower` exists so authors never write a negative** (`raise … by -5` reads worse and
is rejected). When the counter declares bounds, a mutation clamps to `[lo, hi]` rather than erroring —
a meter cannot exceed its ceiling or fall below its floor.

### D3 — Counters read in conditions

A counter is a first-class value in the condition grammar: `when madness >= 90`, `while suspicion is
0`, `when madness > sanity-limit`. This is what lets gates, `while` blocks, and endings react to a
counter — and what lets a banded meter (ADR-262) or `kill the player when <counter> >= N` (ADR-263
`fatal`) test it.

### D4 — Counters compose with the ADR-262 banded engine, but are not it

A counter is the raw number; ADR-262's engine is the band-crossing machinery over a number. `use
sanity` (ADR-263) is a counter (this ADR) *plus* a band ladder (ADR-262): the author raises the
counter, the engine announces the crossings. The counter primitive ships independent of any meter — a
story can `define counter` and test it with zero banding.

### D5 — Save/restore is world state, not a new mechanism

Counter values persist through the existing world-state serialization (`world.toJSON`/`loadJSON`) —
the same seam ADR-263's `hunger.severity` uses. No new persistence machinery; a counter is just named
story state with additive mutators and a declared domain.

### D6 — The grammar change carries a Chord version bump

`define counter`, `raise`/`lower`, and counter reads in conditions are author-visible grammar, so
`docs/reference/chord.ebnf` changes and `CHORD_LANGUAGE_VERSION` takes a minor bump with a re-pinned
EBNF SHA (ADR-257), like every grammar addition on the scoring/meters arc (Chord is at 1.3.0 as of
ADR-263).

## Open Questions

### Q-1: Explicit `define counter` declaration, or infer a counter on first `raise`?
- **Why it matters**: Explicit declaration gives one place for `starts`/bounds and makes a typo a
  compile error; inference is less ceremony but silently forks a second counter on a misspelling and
  has nowhere to declare bounds. (Proposed: explicit, matching `define phrase`/`define machine`.)
- **Blocks**: D1's grammar shape and the `analysis.unknown-counter` diagnostic.

### Q-2: What are the bounds/clamp semantics?
- **Why it matters**: `between lo and hi` clamps on mutation (D2). Open: whether bounds are optional
  (an unbounded counter — proposed yes), and whether out-of-range should clamp silently, warn, or be
  configurable per counter.
- **Blocks**: D1's optional `between` clause and D2's mutation behavior.

### Q-3: Story-global counters only, or per-entity too?
- **Why it matters**: Per-entity counters (a suspicion value per NPC) are a larger scope. Proposed
  story-global only, matching ADR-262 D8 deferring per-entity continuous meters.
- **Blocks**: the declaration's binding site and the save-state key scheme.

### Q-4: Vocabulary — `counter` vs `tally` / `variable` / `meter`?
- **Why it matters**: Sets the keyword authors write. Proposed `counter` — neutral, and `meter`
  collides with the ADR-262 banded framing.
- **Blocks**: the EBNF keyword and all author-facing docs.

### Q-5: Does `use sanity` auto-declare its counter, or does the author declare and point at it?
- **Why it matters**: Decides whether ADR-263's `use sanity` implicitly `define counter`s its madness
  scalar or the author declares it separately — i.e. how a bespoke meter surface names its scalar.
- **Blocks**: the ADR-263 sanity build's binding to this primitive; resolve jointly with it.

### Q-6: Arithmetic beyond add/subtract?
- **Why it matters**: `set <counter> to <n>`, multiply/scale, or derived counters would widen the
  primitive. Proposed out of scope — `raise`/`lower` only; richer arithmetic is a later ADR if a real
  consumer needs it.
- **Blocks**: nothing now (non-blocking) — recorded so a later consumer knows it was considered.

## Acceptance (to be finalized post-interview)

1. `define counter madness starts 0 between 0 and 100` compiles; a bare `raise`/read of an undeclared
   counter is `analysis.unknown-counter`.
2. `raise madness by 15` accumulates additively across turns; `lower` subtracts; both clamp to declared
   bounds; `raise … by -n` is rejected.
3. A condition reads the counter (`when madness >= 90`) and gates a block / ending.
4. The value survives save/restore (world-state round-trip), like `hunger.severity`.
5. A `use sanity`-style meter bands over a counter through the ADR-262 engine — the counter is the
   value accessor, the engine announces crossings.
6. Version pin moves as one unit (EBNF SHA + `CHORD_LANGUAGE_VERSION` minor).
7. **REAL-PATH**: a story that raises a counter from an `on` clause, gates on it, and saves/restores it
   plays through `dist/cli/sharpee.js`.

## Consequences

**Gained.** Resource / suspicion / madness / tally mechanics become writable in pure Chord — no TS
hatch for "a number that moves." Unblocks ADR-263's **sanity** fast-follow (hunger did not need it).
Gives ADR-262 meters a first-class Chord scalar to band over.

**Lost / cost.** New grammar to build, document, and version. A **fourth** "changes a value" construct
alongside `award` (identity), `change` (state), and `score` (ledger) — the docs must draw the lines
crisply so authors reach for the right one (this ADR's Context is the seed of that guidance).

**Constrained going forward.** Counters are story-global (Q-3) and add/subtract-only (Q-6) until a
consumer forces otherwise; per-entity and richer arithmetic are deliberate later work.

**Not addressed.** Per-entity counters; `set`/multiply/derived arithmetic; a UI/status readout for a
counter (a story renders its own via conditions today); the exact `use sanity` ↔ counter binding
(Q-5, resolved with ADR-263's sanity build).

## Session

Session of 2026-07-24, written at the owner's request alongside ADR-265. Foundational primitive spun
off from ADR-263 Q-4 (sanity's raisable madness). DRAFT rather than ACCEPTED because it is a language
addition that deserves an interview pass on the Open Questions — the design here is the starting
proposal, not a settled decision.
