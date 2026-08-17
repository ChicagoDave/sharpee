# exp-05 — The Lie Ledger

**Concept under test**: maintained claims per audience — a character who has
lied must keep the lie consistent to that audience, without theory of mind: a
record of *my own utterances*, never a model of the listener (the
Versu/D14 knife, in its original application). Also the concept that unlocks
the two words reserved upstream: exp-02's `break-a-promise` and exp-03's
`caught lying`.

**Scenarios**: B7 (the maintained lie), B5 (honest disagreement — the
boundary case: disagreement must mint nothing).

**The question under the question**: in a system where every line is
authored (D12/D15 — the model selects, never generates), what does a lie
ledger mechanically *do*? Answer that survived drafting: it constrains the
**selector**. The runtime cannot know a line is a lie by reading its prose —
prose is opaque — so something must carry what a line *claims*, and the
ledger's job is holding selection consistent per audience afterward.

---

## Iteration 1 — run 2026-08-15

Trace scene: **the Steward** — `thinks the killer is the Master, certain,
witnessed` + `protects the Master` + `nature love over duty`. His topic
table for the crime carries an honest line and an alibi line. **B7**: he
lies to the player, must stay lied-to under repeated and friendlier
questioning, is honest with the Maid, and the two answers meet through
gossip. **B5**: the Cook (`thinks the killer is the Butler, suspects, told`)
and the Maid (`thinks the killer is the Colonel, certain, witnessed`)
disagree honestly — no ledger entry may exist.

### Candidate A — claims as line metadata; the ledger pins the selector

```chord
define topics for the Steward
  the crime:
    steward-truth, claims the killer is the Master
  or
    steward-alibi, claims the killer is nobody
```

`claims <fact> is <value>` rides beside a line's prose, checked at compile
time against `define fact`'s closed value set (a misspelled value is D14's
diagnostic). Runtime rule: **delivering a line whose claim contradicts the
speaker's held belief mints a ledger entry** `(speaker, audience, subject,
facet) → claimed value`; delivering a claim that matches belief mints
nothing. Once an entry exists, the selector holds consistent lines to that
audience until an authored break (a state transition, an on-block) or
conscience `breaking` (exp-04's outlet). Lines that claim nothing carry no
tag — most dialogue asserts nothing and pays nothing.

### Candidate B — no ledger: lying as hand-authored bookkeeping

The null-hypothesis candidate: the author encodes the lie with existing
constructs — a state per audience (`states: lied-to-player`), set in the
alibi line's on-effects, with `when` gates keeping the truth line fenced
off. Does the concept earn its machinery at all?

### Candidate C — claims as dialogue acts on goal steps

Proactive deception: a goal step that lies unprompted (`say steward-alibi`
inside a mislead-the-investigation goal). Fielded to test whether
NPC-initiated lies need their own construct.

### Traces

**B7 under A:**

1. Player asks about the crime. Duty (honest line) vs love (protect) →
   nature: love wins → `steward-alibi` selected. Claim (`nobody`) ≠ belief
   (`the Master`) → ledger mints (Steward→player: killer=nobody). And the
   defeated duty principle deposits — **exp-04's conscience feed engages
   with zero extra machinery**: maintaining a lie is expensive by
   construction.
2. Player returns with gifts; disposition warms. Without the pin, the
   selector's force balance might now favor the honest line — the lie would
   silently evaporate on a mood swing. With the pin: `steward-alibi` again,
   strained voice as bands climb. Consistency is the model's job, not the
   author's. Both traces agreed.
3. The Maid asks. Forces evaluate per-audience (love's feed is disposition
   and the protect-scope, fear's is threat — none oppose honesty toward
   her): `steward-truth` selected, claim matches belief → **no entry**.
   Honesty is never bookkept.
4. The Maid `spreads` what she learned (D10); the contradiction reaches the
   player as two conflicting told-beliefs with sources (D14) — the lie
   unravels *socially*, through machinery that already exists. No
   contradiction-detector was built; none is needed.
5. Confrontation: the player presents the truth with evidence. The audience
   of the lie now demonstrably holds the true value → the **`caught lying`
   face-act** fires (exp-03's reserved word unlocks): honor live if audience
   matches, conscience already burdened — the break is authored (an
   on-block or exp-04's breaking outlet), never automatic prose.

**B7 under B (null hypothesis):**

Encodable — one state per lie per audience, on-effects to set it, `when`
fences on every truth-adjacent line. Trace 2's mood-swing hazard becomes the
author's job: forget one fence and the Steward blurts the truth when the
player brings him tea — silent, invisible in testing, per lie per audience
per NPC. Depth is reachable; the cost curve and the silent-failure class
are exactly what a model exists to own. This is what pre-model stories
already do by hand, which is the strongest evidence the concept is real.

**B7 under C:** the goal step's lie needs the same claim metadata to mint an
entry — and the metadata already lives on the *line* (`steward-alibi,
claims …` in the phrase/topic definition), which the goal's `say` step
references by name. C adds nothing A's marking doesn't already cover.
Collapses into A.

**B5 under A:**

1. Cook asserts the Butler (matches her belief — told, suspects): no entry.
2. Maid asserts the Colonel (matches hers — witnessed, certain): no entry.
3. The player holds both reports with divergent sources and confidences —
   D14 working as designed. Nobody is "the liar"; the ledger stays empty.
   Boundary confirmed; both traces agreed trivially.

### Grades

| Candidate | Scenario | Depth | Cost | Predictability | Legibility |
|---|---|---|---|---|---|
| A | B7 | GREEN | GREEN — one `claims` tag per claiming line only | GREEN — mint rule and pin rule are two sentences | GREEN — the unraveling reaches the player as prose from D10, never as a readout |
| A | B5 | GREEN | GREEN (zero) | GREEN | GREEN |
| B | B7 | YELLOW — reachable by hand | **RED** — state + fences per lie per audience; silent-drift failure class | YELLOW | GREEN |
| C | B7 | — collapses into A | | | |

### Verdict

**A wins; B is rejected and is the concept's justification; C collapses.**
The ledger is pure runtime bookkeeping with a one-tag authoring surface:
`claims <fact> is <value>` on the lines that assert something. Everything
else — minting, pinning, unraveling, getting caught — is composition with
machinery the earlier experiments already established.

**Findings for the companion ADR:**

1. **Prose is opaque; claims are metadata.** The runtime can never infer
   what a line asserts — the `claims` tag is the entire bridge between
   authored prose and the belief model, compile-checked against `define
   fact` value sets. Lines that assert nothing carry nothing.
2. **The mint rule and the boundary**: entry on claim-contradicts-belief at
   delivery, per audience; honest assertion mints nothing (B5). Lying is
   *defined* by D14's value slot — without valued belief there is no
   mechanical lie.
3. **The pin**: a minted claim holds the selector consistent to that
   audience until an authored break or conscience `breaking`. Mood and
   disposition drift cannot silently evaporate a maintained lie.
4. **Both reserved words unlock.** `caught lying` (exp-03 face-act): the
   lie's audience demonstrably acquires the true value and confronts.
   `break-a-promise` (exp-02 category): a promise is a ledger entry whose
   subject is the speaker's own future act — violation detected when the
   contrary act executes. Promises need no new construct; they are claims
   about oneself.
5. **The unraveling is social.** Differential claims travel by D10 and land
   as conflicting told-beliefs with sources (D14). No contradiction
   detector exists anywhere in the design.
6. **The scope line holds a third time**: the ledger records own utterances
   per audience. No theory of mind (D14), no anticipation (exp-03), no
   model of what the listener concluded (here).
7. **Maintaining a lie costs by construction**: every maintained-lie
   selection is a duty defeat, feeding exp-04's pressure. The liar's arc —
   composed, strained, breaking, caught or confessing — emerges from four
   experiments' machinery with no dedicated code.

**Open for iteration 2**: whether the *player's* lies are tracked — the
player is not selector-driven, but an NPC receiving contradictory tellings
from the same source already holds the makings of noticing (D14 sources +
belief resistance); the confrontation would be an authored outlet. Deferred:
it is an interface question (what the player can SAY/TELL) before it is a
model question. Also: whether a pinned lie survives save/restore (it must —
it is trait state per D17).
