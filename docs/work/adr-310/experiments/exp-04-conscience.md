# exp-04 — Conscience

**Concept under test**: internal enforcement — guilt as pressure that
accumulates from a character's own violations of their own code, discharging
at authored outlets. Rule 4 is the frame: the runtime boils the pot, the
author writes the boiling over. Feeds nothing in the arbiter directly —
conscience is not a fifth force in a scene; it is what the scenes *cost*.

**Scenarios**: B3 (conscience outruns loyalty). N3 (thealderman native
scene) — **pending David's pick**.

**What a candidate must answer**: what feeds the pressure (without authored
rules); how the author gates behavior on it (without numbers — D6 forbids
declared curves); what the outlets are; whether conscience is universal,
declared, or dialed; and where pre-story guilt comes from.

---

## Iteration 1 — run 2026-08-15

Trace scene: **the Clerk** witnessed the Master's crime. `knows the crime,
witnessed` + `never lies` (duty feed) + `protects the Master` (obligation →
loyalty) + `nature love over duty` — loyalty wins each questioning, and B3
requires that each win *costs*, with the voice straining before the break
and the confession arriving at an authored moment.

### Candidate A — conscience is free: the feed is the arbiter's own defeats

No conscience declaration exists. **A live principle that loses an
arbitration deposits pressure.** The author writes only the outlets:

```chord
create the Clerk
  a person, nervous, meticulous
  knows the crime, witnessed
  never lies
  protects the Master
  nature love over duty

  goal confess-to-player, critical
    active when it is breaking
    seek the player
    say clerk-confession
  end goal

define phrasebook clerk-strained while the Clerk is burdened
  denial:
    "I keep the ledgers. I keep them very well." He does not look up.
end phrasebook
```

Pressure runs on a closed **band vocabulary** — `clear`, `uneasy`,
`burdened`, `breaking` — which gates phrasebooks, `when`, and `active when`
exactly as mood words do. The curve between bands is runtime-owned (D6).

### Candidate B — sensitivity as personality

```chord
  a person, nervous, remorseful      -- or: untroubled
```

A dial on accrual rate, spelled as a D2 personality adjective with the
existing intensity-word machinery. Buys the Macbeth (`remorseful`) and the
mercenary with a professional code he breaks and sleeps on (`untroubled`) —
principles without guilt is a real character, so the dial has depth value.

### Candidate C — authored burdens

```chord
  burdened by the old sin
```

The author marks a guilt source directly. As a *replacement* for A's derived
feed it is static — B3's accumulation-from-behavior has nowhere to come
from. As an *initial state* it fills a hole A cannot: pre-story guilt, the
man haunted by something done before turn one.

### Traces

**B3 under A (+B):**

1. T1: player asks about the crime. Duty (answer honestly) vs love
   (protect) → nature: love wins → evasion, composed voice. **The defeated
   principle deposits.** Band: clear → uneasy.
2. T2–T3: repeated questioning, repeated defeats, repeated deposits. Band
   climbs to burdened → the `clerk-strained` phrasebook takes the voice. The
   player sees denial fraying; the mechanics are invisible (D12 clean).
3. Band reaches breaking → the confession goal's `active when` goes true.
   **Traced conflict found**: D16 suppresses goal pursuit during
   conversation — the boiling-over would be blocked by the very questioning
   that boils it. Resolved without an exception (finding 3): *within*
   conversation, the crack is not a goal at all — D15's selector picks
   responses by band, and the confession is simply the response selected at
   breaking; the *goal* form is the other outlet — the Clerk seeks the
   player out after the conversation ends. The 3am knock. Both traces
   agreed after the split.
4. Counterfactual 1 — remove `never lies`: no principle is ever defeated,
   nothing deposits, the loyal liar is at peace forever. Conscience
   presupposes a code. B3's definition holds.
5. Counterfactual 2 — swap `remorseful`/`untroubled` (B): band sequence
   identical, pacing shifts. **Predictability framing forced by the trace**:
   exact turn counts are runtime-owned, so traces cannot agree on
   *scheduling* — they agree on *ordering* (bands move monotonically, the
   confession fires at breaking, never before burdened shows). Graded on
   ordering; tests pin bands via ADR-293 forcing. Both traces agreed under
   that framing.
6. C as initial state: `burdened by the old sin` starts the curve at
   burdened (topic must be held — compile check against the `knows` lines).
   Traces fine. C as sole mechanism: RED on Depth, B3 unrepresentable.

### Grades

| Candidate | Scenario | Depth | Cost | Predictability | Legibility |
|---|---|---|---|---|---|
| A | B3 | GREEN | GREEN — zero declaration lines; author writes only outlets they wanted anyway | GREEN (ordering, not scheduling — see trace 5) | GREEN — bands reach the player only through authored voices |
| B | B3 | GREEN — the untroubled-professional is expressible | GREEN (0 lines, rides D2) | GREEN | GREEN |
| C | B3 alone | **RED** — static; accumulation unrepresentable | GREEN | GREEN | GREEN |
| C | as initial state | GREEN — fills A's pre-story hole | GREEN (1 line) | GREEN | GREEN |

### Verdict

**A + B + C compose; none competes.** The feed is derived (A), the
sensitivity is a personality adjective (B), the starting point is declarable
(C) — and the whole concept ships with almost no new grammar: one band
vocabulary, one `burdened by` line, and outlets that are D13 phrasebooks and
D8 goals the author was going to write anyway. Conscience is the cheapest
concept so far because it is almost entirely runtime.

**Findings for the companion ADR:**

1. **Guilt is the ledger of the arbiter's defeats.** A live principle that
   loses an arbitration deposits pressure; no authored feed exists; no code,
   no guilt. This makes exp-01's nature declarations *dramatically
   expensive in the best way* — the character who puts honor over duty pays
   for it every scene, mechanically.
2. **Bands, not numbers**: `clear` / `uneasy` / `burdened` / `breaking`,
   platform-closed, gating phrasebooks and predicates exactly as mood words
   do. Curves and rates are runtime-owned (D6's line holds).
3. **Two outlets, D16 intact.** In conversation, the crack is D15 selector
   behavior — the confession is the response selected at breaking. Out of
   conversation, it is a D8 goal gated `active when it is breaking`. The
   traced D16 conflict (conversation suppresses goals, but questioning is
   what boils the pot) dissolves without an exception.
4. **Sensitivity is personality**: `remorseful` / `untroubled` ride D2's
   existing adjective machinery. Principles without guilt is expressible;
   tendencies-are-not-commitments (exp-02 finding 4) survives from the other
   side.
5. **Pre-story guilt is initial state**: `burdened by <topic>`, the D3/D6
   split applied — states declarable, curves not.
6. **Predictability for pressure is ordering, not scheduling.** Band
   sequences are traceable; turn counts are not authorable facts. ADR-293's
   forcing is how tests pin a band. This framing is a rubric refinement the
   method should carry forward for every curve-backed concept.
7. **Runtime weave, no surface** (design note only): confession ends the
   losing collisions, so deposits stop and pressure drains; and belief
   resistance `reinterprets` (D14's firmness fields) is the natural
   rationalization channel — the flexible bleed pressure by changing their
   mind about what happened, the rigid can only break. Cognitive profile
   modulating conscience discharge is the kind of emergent depth rule 3
   permits precisely because it can only reach the player through authored
   mouths.

**Open for iteration 2 / N3**: atonement beyond confession (out of scope for
now — story events handle it); whether `breaking` needs a terminal semantic
(does a character who confessed re-accumulate from scratch?); the N3 native
scene when David picks it.
