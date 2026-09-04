# ADR-264: Chord numeric counters — a raisable named number

## Status: ACCEPTED (2026-07-24) — a generic numeric-counter primitive for Chord: a named number an author can `raise`/`lower` and test in conditions, at **story or entity scope**, persisted as story state. Explicit `define counter` (`starts`/`between` optional), bounded mutations clamp silently, add/subtract-only, `counter` keyword; `use sanity` auto-declares its own counter (ADR-263). Spun off from ADR-263 Q-4. All Open Questions resolved via `/devarch:adr-interview` (2026-07-24). Not implemented.

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

## Decision

### D1 — Explicit declaration, at story or entity scope

A named numeric counter is **explicitly declared** — inference on first `raise` is rejected, so a
misspelling is a compile error rather than a silently forked second counter, and there is one home for
`starts`/bounds. Both suffixes are **optional**: the minimal form is a bare declaration (unbounded,
`starts 0`); `starts` sets a non-zero initial value; `between <lo> and <hi>` bounds it (mutations
clamp, see D2). The name is a kebab key in the story namespace (ADR-254). A `raise`/`lower`/condition
naming an undeclared counter is `analysis.unknown-counter`. The keyword is **`counter`** — chosen over
`meter` (which already denotes the ADR-262/263 banded-scalar concept) and `variable` (programmer-y,
and it invites general-variable expectations this primitive does not offer).

A counter is declared at one of **two scopes**:

- **Story-global** — `define counter <name> [starts <n>] [between <lo> and <hi>]` in the header or
  body. One value for the whole story (madness, a resource, a global tally).
- **Per-entity** — `counter <name> [starts <n>] [between <lo> and <hi>]` inside a `create <entity>`
  block, mirroring how `states:` and traits are declared on an entity. **Each entity instance carries
  its own value** (the innkeeper's suspicion, the guard's suspicion — independent). This is the natural
  home for a per-NPC quantity and is why per-entity was chosen over story-global-only.

Both scopes are **story state**, saved and restored with the world (D5): a story-global counter as a
world state value (like ADR-263's `hunger.severity`), a per-entity counter as part of that entity's
persisted state.

### D2 — `raise <counter> by <n>` / `lower <counter> by <n>`

The additive mutation, usable anywhere an effect runs — `on` clauses, `after`/`before`, `on every
turn` daemons (ADR-236). A story-global counter is named bare (`raise madness by 15`); a per-entity
counter is named by possessive — `raise the innkeeper's suspicion by 5`. `<n>` is a non-negative
integer literal; **`lower` exists so authors never write a negative** (`raise … by -5` reads worse and
is rejected). When the counter declares bounds, a mutation **clamps silently** to `[lo, hi]` — no error,
no warning: a meter naturally saturates (sanity tops out, hunger fills), so a `raise` past the ceiling
lands at the ceiling and a `lower` past the floor lands at the floor, with no guard required at the call
site. An unbounded counter never clamps.

`raise` and `lower` were the **only** mutators as accepted — no `set`/multiply/derived arithmetic. A
reset to the floor was `lower <counter> by` a large amount (it clamps); absolute assignment and
richer arithmetic were deferred to a later ADR if a real consumer needed them (Consequences).

> **Amended 2026-08-23 (ADR-325 D4, GH #310).** `set <counter> to <n>` is now the one absolute
> write: the same target forms as `raise`/`lower` (bare story counter, `<entity>'s <name>`), a
> number literal only, clamped to the declared bounds. `raise`/`lower` are no longer the
> only mutators. Arithmetic between counters, money, and prices remain deferred (ADR-325 D4's
> math-and-money subsystem).

> **Amended 2026-08-27 (ADR-327 D2).** Syntactic `it`/`its` left the language, so the
> `its <counter>` spelling is struck from D2's mutations, from the D4/`set` target list
> above, and from D3's conditions below. The possessive-by-name form (`the innkeeper's
> suspicion`) is the survivor everywhere. `it`/`its` remain legal inside `define trait`,
> where they mean the carrier (ADR-327 D8) — that is a scoped role word, not this one.

### D3 — Counters read in conditions

A counter is a first-class value in the condition grammar. Comparisons come in **two interchangeable
spellings** (owner decision, 2026-07-24) that lower to one IR compare node: a **word form** — `when
madness is at least 90`, `is more than`, `is at most`, `is less than`, and plain `is` for equality — and
a **symbolic form** — `when madness >= 90`, `<=`, `>`, `<`. Story-global counters read bare (`madness`);
per-entity counters read by the same possessive form the mutations use (`the innkeeper's
suspicion is at least 50`, `while the innkeeper's suspicion is 0`). Both spellings are accepted everywhere a
condition is — this is what lets gates, `while` blocks, and endings react to a counter, and what lets a
banded meter (ADR-262) or `kill the player when <counter> is at least N` (ADR-263 `fatal`) test it. The
symbolic form requires the lexer to emit compound `>=`/`<=` tokens; the word form rides the existing
word tokenizer.

### D4 — Counters compose with the ADR-262 banded engine, but are not it

A counter is the raw number; ADR-262's engine is the band-crossing machinery over a number. `use
sanity` (ADR-263) is a counter (this ADR) *plus* a band ladder (ADR-262): the author raises the
counter, the engine announces the crossings. The counter primitive ships independent of any meter — a
story can `define counter` and test it with zero banding.

**A bespoke meter surface auto-declares its own counter.** `use sanity` implicitly creates the
underlying scalar (its "madness"), which the author raises by that conventional name — no separate
`define counter` line. This is the *extension* declaring a counter on the author's behalf as part of
its construct; it is **not** the inference-on-first-`raise` that D1 rejects for hand-written counters
(a plain `raise madness by 15` outside a `use sanity` block still requires an explicit `define
counter`). The convenience of owning the scalar is exactly what a bespoke surface buys; the trade is
that the meter is bound to its counter's conventional name.

**Boundary with ADR-262 D8**: banding is defined over a *story-global* scalar. A per-entity counter
(D1) is fully usable in mutations and conditions, but **banding one per-entity** — a per-NPC meter that
announces its own crossings — is still deferred by ADR-262 D8 (which scoped per-entity continuous
meters out). So per-entity counters exist here without contradicting that; wiring a per-entity counter
into the crossing engine waits on ADR-262 D8 being revisited.

### D5 — Save/restore is world state, not a new mechanism

Counter values persist through the existing world-state serialization (`world.toJSON`/`loadJSON`) —
the same seam ADR-263's `hunger.severity` uses. A story-global counter is a world state value; a
per-entity counter rides that entity's persisted state, so each instance's value round-trips
independently. No new persistence machinery; a counter is just named story state with additive
mutators and a declared domain.

### D6 — The grammar change carries a Chord version bump

`define counter`, `raise`/`lower`, and counter reads in conditions are author-visible grammar, so
`docs/reference/chord.ebnf` changes and `CHORD_LANGUAGE_VERSION` takes a minor bump with a re-pinned
EBNF SHA (ADR-257), like every grammar addition on the scoring/meters arc (Chord is at 1.3.0 as of
ADR-263).

## Acceptance

1. `define counter madness starts 0 between 0 and 100` compiles; a bare `raise`/read of an undeclared
   counter is `analysis.unknown-counter`.
2. `raise madness by 15` accumulates additively across turns; `lower` subtracts; both clamp to declared
   bounds; `raise … by -n` is rejected.
3. A condition reads the counter and gates a block / ending — in **both** spellings: `when madness is
   at least 90` and `when madness >= 90` compile to the same comparison and evaluate identically.
4. The value survives save/restore (world-state round-trip), like `hunger.severity`.
4a. A **per-entity** counter (`counter suspicion` on two NPCs) holds an independent value per instance
   — raising the innkeeper's does not move the guard's — is read/mutated by possessive/`its`, and each
   instance's value survives save/restore.
5. A `use sanity`-style meter bands over a *story-global* counter through the ADR-262 engine — the
   counter is the value accessor, the engine announces crossings. (Banding a per-entity counter stays
   out of scope per ADR-262 D8.)
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

**Constrained going forward.** Counters are add/subtract-only until a consumer forces richer
arithmetic. Per-entity counters exist (D1) but **banding one** — a per-NPC meter with its own crossing
announcements — waits on ADR-262 D8 being revisited; until then per-entity counters serve logic and
conditions, not banded narration.

**Not addressed.** `set`/multiply/derived arithmetic; per-entity *banding* (ADR-262 D8); a UI/status
readout for a counter (a story renders its own via conditions today).

## Session

Session of 2026-07-24, written at the owner's request alongside ADR-265. Foundational primitive spun
off from ADR-263 Q-4 (sanity's raisable madness). Started DRAFT; all six Open Questions resolved the
same day via `/devarch:adr-interview` and folded into the decisions above — the interview's one
scope-expanding call was Q-3 (per-entity counters, added across D1–D5 with an explicit ADR-262 D8
boundary) — then flipped to ACCEPTED.
