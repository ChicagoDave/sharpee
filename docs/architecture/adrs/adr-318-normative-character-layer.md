# ADR-318: The Normative Layer — What a Character Will Not Do

**Status**: ACCEPTED (2026-08-15, session 00aaa0 — marked accepted by David
after the open-questions interview resolved all six questions the same day
(1 by D3 `temperament`, 2 by D4/D7, 3 and 4 by D8, 5 by D12a, 6 by D9's
deferral) and the post-interview `adr-review` returned one finding, accepted
as implementation-plan work rather than ADR text: TypeScript-level contracts
(arbiter API, trait field shapes, selector-pin hook, tick-phase signature)
are first deliverables of the implementation plan. Written from the
five-experiment series at `docs/work/adr-310/experiments/`, this ADR's
evidence base, cited per decision. Acceptance authorizes no implementation
by itself — the work is planned separately.)
**Date**: 2026-08-15 (session 00aaa0)
**Builds on**: ADR-310 (character model in Chord — this is its companion),
ADR-141 (character model), ADR-145 (goals), ADR-146 (influence), ADR-239
(topic tables), ADR-163 (channels), ADR-293/294 (testing intelligence)
**Evidence**: `docs/work/adr-310/experiments/method.md` and exp-01 through
exp-05 — each decision below names the experiment and finding it rests on.

---

## Context

ADR-310 maps the character model's descriptive layers into Chord: what a
character knows and believes, how they feel, how they stand toward others,
what they want. The 2026-08-15 session identified what that leaves out, by
walking the elements of dialogue as layers of why a person says what they
say: **the normative layer** — what a character will not do and what they
must (ethics, honor, conscience, duty), what speaking has already committed
them to, and the arbitration that decides which layer wins when they
collide.

The gap matters because **drama lives in the collisions**. The honest man
who must lie, the loyal servant who knows the master is guilty, the coward
whose conscience finally outruns his fear — every one is a normative element
colliding with an epistemic or affective one. A model with knowledge, mood,
and goals but no norms can represent a character who *reacts*; it cannot
represent a character who *refuses*. And no shipping IF platform has ever
made this layer authorable: Versu modeled it and was barely authorable;
topic tables are authorable and don't model it. The frontier — stated by
David as the design brief — is *stretch toward Versu's depth, hold Chord's
ease*.

Four rules governed every candidate surface in the experiments, and they
govern this ADR (method.md):

1. **Words, never rules.** Declarations in closed or author-named
   vocabularies; the runtime owns all inference. An author who writes a
   precondition→action rule is rebuilding Praxis.
2. **Depth is opt-in by ladder** — the D4/D5 ladder from ADR-310: one word →
   named `define` profile → partial override. A character who ignores the
   layer costs zero lines (ADR-310 D7).
3. **Emergence speaks only through authored mouths** (ADR-310 D12). Internal
   depth is unbounded because the only outlets are authored phrases; author
   workload scales with visible behaviors wanted, not model complexity.
4. **The runtime boils the pot; the author writes the boiling over.**
   Pressure and decay are simulated, never declared (ADR-310 D6); dramatic
   discharge is an authored outlet.

Every construct below was traced against the benchmark corpus (B1–B7) before
it was written here; grades and losing candidates are in the experiment
files. The line counts held: a principled refusal under threat costs three
lines, an honor-bound refusal two, a maintained lie one tag.

## Decision

### D1. Five forces, closed, each with a runtime feed.

The arbiter's vocabulary is `fear`, `desire`, `duty`, `honor`, `love` —
closed because a force without a feed is dead weight, and feeds are runtime
definitions, not authorable surface (exp-01 finding 1):

| Force | Fed by |
| --- | --- |
| `fear` | threat level and high-arousal negative mood |
| `desire` | active goals (ADR-310 D8) |
| `duty` | principles and obligations (D4–D6 below) |
| `honor` | face-acts before declared audience (D7 below) |
| `love` | disposition toward the entities in play |

A force is **live** when its feed is off-baseline. The arbiter runs whenever
two live forces disagree on the act under consideration — dialogue acts
(comply, refuse, evade) and goal selection both.

### D2. The default is intensity. Character is what overrides it.

When live forces collide and the character has no declared ordering between
them, **whichever feed currently burns hotter wins** (exp-01 finding 2). No
platform editorial ordering exists: an ordinary person is ruled by the
strongest pressure of the moment, and declaring an ordering is what having
character *means*. The declaration is the deviation. This also gives
principles their human texture (D6): kept in calm, breakable under enough
fear — until a temperament makes them unconditional.

### D3. Temperament: named orderings, state-bound, never directly mutated.

The ordering is declared as a **temperament** (David's ruling, 2026-08-15,
resolving Open Question 1 — chosen over the experiments' working keyword
`nature` and over `spine`; the experiment files retain `nature` as a
historical record of the runs), on the ladder (exp-01 verdict):

```chord
define temperament steadfast
  duty over fear
  duty over desire
end temperament

create the Witness
  a person, nervous, slightly honest
  states: cowed, resolute
  temperament timid while cowed
  temperament steadfast while resolute
```

- Pair lines (`duty over fear`) inside `define temperament`; `with` overrides
  compose as in ADR-310 D4.
- A temperament is **static or state-bound**. There is no `change temperament`: the
  only lever that moves an ordering is the entity-state ratchet Chord
  already has — so a character arc is authored as `change it to resolute`,
  and the ratchet, the score, the temperament swap, and the phrasebook voice all
  hang off the same state. The create block is the complete truth of the
  character at read time. (This is ADR-310 Q3's deep answer: mood is
  weather; the arc is a state.)
- Two temperaments bound to the same state via trait composition is a
  compile-time diagnostic, same shape as ADR-310 D16's phrasebook tie.

### D4. Principles: a closed act-category vocabulary, scope marked on data.

A principle binds mechanically or not at all: **principle words are act
categories the runtime can detect, and the author marks scope on data,
never on acts** (exp-02 finding 1):

```chord
create the Witness
  knows the secret, witnessed, confided
  never betrays a confidence

create the Housekeeper
  never lies, except to protect the children
  protects the children
```

- Initial category set (David's ruling 2026-08-15, resolving Open Question
  2a): **betray a confidence** (reveal a topic marked `confided` — the
  marker joins the `knows` line's comma slot), **lie** (assert contrary to
  own held belief — detectable *only because* ADR-310 D14 gave beliefs
  values), **harm [scope]**, **steal**, **break a promise** (defined by D9
  below), **abandon [scope]** (depart while a scoped, protected entity is in
  danger — the refusal dual of `protects`), **trespass** (enter where not
  permitted, via room ownership/permission). Obligation words: **protects
  [scope]**, **answers honestly** (the obligation dual of `lie`: compels a
  truthful answer when asked directly — evasion satisfies `never lies` but
  violates `answers honestly`, which is why it earns its own word). A
  category the runtime cannot detect cannot be a word.
- `except` is ADR-310 D9's `except`, verbatim — the one predicate language.
- Named bundles ride the ladder: `define code servants-code … end code`,
  used as `code servants-code`; bare lines union with the code (exp-02
  verdict).
- **Tendencies are not commitments** (exp-02 finding 4): personality
  adjectives never imply principles. `slightly honest` is a weight that
  bends; `never lies` is a line that feeds duty. The same word is never
  both — otherwise the concept's defining counterfactual (remove the
  principle, the character complies) becomes untestable.
- Principles burn at a strong fixed baseline under D2's default (exp-02
  finding 3): *a principle is a strong habit until character makes it a
  commitment*.

### D5. Obligations compile to standing goals.

`protects the children` is not an act gate — it generates behavior, which is
ADR-310 D8's goal machinery with a duty feed (exp-02 finding 2). Refusals
gate acts; obligations are goals. One new surface, zero new runtimes.

### D6. Colliding principles resolve by `except`, or by paralysis.

Temperament orders *forces*, not principles. Two unexcepted principles in live
collision produce **evasion** through the authored evasion outlet —
dramatically human, fully predictable — plus an author-channel warning
naming both principles (exp-02 finding 5). No hidden precedence, no
list-order semantics.

### D7. Honor: its own force, face-acts, bound to the room.

```chord
create the Colonel
  a person, proud, ruthless
  honor before the regiment
  temperament honor over fear
```

- **Honor is a separate force**, not principles-with-an-observed-qualifier
  (exp-03's rejected candidate): the brazen-it-out character and the
  public-confessor differ by one temperament line (`honor over duty` vs `duty
  over honor`) only if honor and duty are separately orderable.
- **Face-acts are a closed platform vocabulary**, parallel to D4's
  categories: backs down, shows fear, admits fault, pleads, accepts insult,
  caught lying (D9). Frozen as this six by David's ruling 2026-08-15
  (resolving Open Question 2b; accepts-charity and performs-menial-work were
  considered and left off — additions stay possible, removals break). Same
  rule: no detectable act, no word. `honor before <scope>` buys the full
  bundle; a named selective bundle (`define honor …`) is the ladder rung
  above.
- **Honor sees the room, not the future** (exp-03 finding 3): it binds on
  the *presence* of declared audience — no anticipated-reputation feed, no
  "word will get out" inference. The same knife as no-theory-of-mind
  (ADR-310 D14), applied to time.
- Audience scope reuses ADR-310 D9/D10 scope grammar (`anyone`, kinds,
  entities, `except`).
- Reputation needs no construct: a witnessed face-act becomes knowledge via
  the observer, travels by `spreads` (ADR-310 D10), and lands as changed
  dialogue — exp-03's B4 trace, with topic names per D12a.

### D8. Conscience: guilt is the ledger of the arbiter's defeats.

**A live principle that loses an arbitration deposits pressure.** No
authored feed exists; no code, no guilt (exp-04 finding 1). Temperament
declarations thereby acquire running costs — the character who puts honor
over duty pays for it every scene, mechanically.

- Pressure runs on a closed **band vocabulary** — `clear`, `burdened`,
  `breaking` — three bands: baseline, visible strain, discharge point
  (David's ruling 2026-08-15, resolving Open Question 3: trimmed from the
  experiments' four; the early-tell band `uneasy` was cut — foreshadowing
  before `burdened` is the voice's job, not a gate's). Bands gate
  phrasebooks, `when`, and `active when` exactly as mood words do. Curves
  and rates are runtime-owned (rule 4).
- **Two outlets, ADR-310 D16 intact** (exp-04 finding 3): in conversation,
  the crack is the selector picking the confession response at `breaking`;
  out of conversation, it is a goal gated `active when it is breaking` —
  the character seeks you out. Conversation-suppresses-goals needs no
  exception.
- **Sensitivity is personality**: `remorseful` / `untroubled` ride the
  existing adjective machinery. Principles without guilt (the mercenary
  with a professional code) is expressible.
- **Pre-story guilt is initial state**: `burdened by <topic>` (the topic
  must be held — compile check). States declarable, curves not.
- **Discharge contract** (amended 2026-08-16, session 55a70a — the seam-2/5
  ruling): discharge is *delivery through a `breaking`-gated outlet on
  self*. **The gate is the marker** — there is no authored discharge
  keyword. A phrase whose selection condition provably requires the
  speaker's own `breaking` (the conservative `conditionRequiresSelfBreaking`
  walker in chord: an `and` needs one self-breaking operand, an `or` needs
  all of them; negation and other entities' bands prove nothing; a gate on
  *another* entity's breaking never discharges the owner) drains the curve
  when delivered. A goal whose `active when` is provably self-breaking is
  stamped `discharges` at compile (`.discharges()` on the TS builder) and
  drains on completion. Band-gated phrasebooks that are not
  self-breaking-gated are the non-discharging color channel. **Discharge
  drains the curve only — it never touches the lie ledger** (D9 owns pin
  release; a global unpin here would evaporate lies still maintained to
  absent audiences). Discharge emits `character.author.pressure_drain` on
  the D11 channel. With ADR-145's edge-triggered activation (amended the
  same day), discharge → re-climb → re-break re-fires each outlet once per
  cycle — the recurring confessor needs no extra machinery.
- Belief resistance `reinterprets` is the natural rationalization channel —
  the flexible bleed pressure by changing their mind about what happened;
  the rigid can only break.
- **`breaking` does not terminate** (David's ruling 2026-08-15, resolving
  Open Question 4): discharge resets the curve, which can run again. The
  platform keeps no memory of having broken — *breaking is weather; being
  broken is a state*. An author who wants permanence writes `change it to
  confessed` in the confession outlet itself, and temperament, voice, and
  score hang off that state per D3.

### D9. The lie ledger: claims are metadata; the ledger pins the selector.

Prose is opaque — the runtime can never infer what a line asserts. The
bridge is one tag (exp-05 verdict):

```chord
define topics for the Steward
  the crime:
    steward-truth, claims the killer is the Master
  or
    steward-alibi, claims the killer is nobody
```

- `claims <fact> is <value>`, compile-checked against `define fact` value
  sets (ADR-310 D14). Lines that assert nothing carry nothing.
- **Mint rule**: delivering a line whose claim contradicts the speaker's
  held belief mints a ledger entry `(speaker, audience, subject, facet) →
  claimed value`. Honest assertion mints nothing — disagreement is not
  lying (exp-05's B5 boundary).
- **The pin — gating** (amended 2026-08-16, session 55a70a: band-aware, the
  seam-4 ruling): a minted claim holds the selector consistent to that
  audience while the speaker is below `breaking`. At the speaker's own
  `breaking` the pin **stops gating** — the truth can escape — but
  suspension is not release: the entry stays pinned, and if the band drops
  back without the truth having been told, the pin gates again. Mood and
  disposition drift cannot silently evaporate a maintained lie — that
  bookkeeping is the model's, not the author's.
- **Maintenance accounting** (same amendment): maintenance is restating the
  *pinned* value (`pin_held` plus the duty deposit, unchanged). The
  honestly-contradicting truth delivered at `breaking` is neither mint nor
  maintenance — no cost, no deposit, and the delivery itself leaves the pin
  untouched (release is the next bullet's job). A *differently-valued lie*
  at `breaking` still costs via the lie check but mints nothing while a pin
  exists.
- **Release** (amended 2026-08-16, session 55a70a: per-audience, the seam-3
  ruling): a pin is released **per (audience, fact)** — a lie dies for an
  audience exactly when that audience gets the truth. Three release paths:
  (1) **truth-told** — delivering the honestly-contradicting truth to an
  audience releases that audience's pin and emits
  `character.author.pin_released`; the ledger entry survives unpinned —
  history, not obligation. (2) **caught lying** — ruled but dormant; rides
  the face-act confrontation detection when it is built. (3) **authored
  break** — the trait's `unpinLedger` method, a TS surface; no Chord
  statement until a story needs one. **Discharge (D8) never releases
  pins**: draining the curve for one confession must not evaporate lies
  still maintained to absent audiences.
- **Both reserved words unlock**: *caught lying* (face-act — the lie's
  audience demonstrably acquires the true value and confronts) and *break a
  promise* — **a promise is a ledger entry whose subject is the speaker's
  own future act**; violation is detected when the contrary act executes.
  Promises need no construct.
- **The unraveling is social**: differential claims travel by propagation
  and land as conflicting told-beliefs with sources. No contradiction
  detector exists in the design.
- The scope line holds: the ledger records own utterances per audience —
  never a model of what the listener concluded.
- Maintaining a lie costs by construction: every pinned selection is a duty
  defeat feeding D8's pressure. The liar's arc emerges with no dedicated
  code.
- **The player's lies are explicitly deferred, not designed and not
  foreclosed** (David's ruling 2026-08-15, resolving Open Question 6): the
  model side (NPCs holding told-values with sources, belief resistance on
  contradiction) already exists via ADR-310 D14; whether and how the player
  asserts claims is an interface question for the SAY/TELL surface, to be
  settled in its own ADR. Nothing in this layer builds it or blocks it.

### D10. What is deliberately excluded.

Named so it stays excluded rather than half-built (exp-03 finding 6,
method.md scope notes): **theory of mind** (ADR-310 D14's cut, reaffirmed at
each new surface); **anticipated reputation** (D7's presence rule);
**observed-qualified principles** — `never steals, when observed` spells
*pretense*, a hypocrite's principle, dramatically real and conceptually
distinct, admitted later only if a story demands it; **social-practice
simulation** (greetings, etiquette — Versu's bulk, almost none of it
dramatic); **numeric authoring surfaces** of any kind; **atonement
mechanics** beyond confession (story events handle it).

### D11. The predictability contract.

For curve-backed concepts (conscience, and any future pressure), the
authorable and testable fact is **ordering, not scheduling** (exp-04
finding 6): bands move monotonically, the confession never precedes the
strain, but turn counts are not authorable facts. Tests pin bands and
arbiter outcomes via ADR-293 forcing. The author channel (ADR-310 D12's
introspection surface) must carry, per NPC turn: the live forces and their
winner, principle defeats and deposits, band transitions, ledger mints and
pins, and paralysis warnings (D6). Systemic behavior that cannot be traced
is indistinguishable from a bug — this channel is in-scope work, not a
follow-up.

### D12a. Witnessed acts mint topics under a derived scheme, aliasable at the scene.

Resolves the naming gap exp-03 finding 5 identified (Open Question 5,
David's ruling 2026-08-15). Every mechanically-minted topic — a witnessed
act from D4's categories or D7's face-acts — gets a **deterministic
platform-derived name** (the actor and the act: *the Colonel backed down*),
gateable in `when it knows …` as such. The author may rename at the scene
where the act occurs (`witnessed as the-colonels-shame`), and the alias is
then the topic's name everywhere. The namespace is compile-checkable (actors
× detectable acts is a closed set) and the IDE's Index surface lists it;
coverage is total with zero authoring cost, and the alias keeps source
legible where a name carries story weight.

### D12. Persistence rides ADR-310 D17.

Everything this layer remembers is `CharacterModelTrait` state: current
temperament binding (via its state), pressure band and underlying value,
`burdened by` seeds, ledger entries and pins, promise entries. No
module-level service state; versioned trait shape. A restored liar is still
pinned; a restored penitent is still `burdened`.

## Consequences

- **The vocabulary freeze widens.** Forces, act categories, face-acts, and
  band words all become language surface with compatibility weight the
  moment the first story ships them. Each list should be reviewed by David
  before freeze (Open Questions 2–3) — after it, removing a word breaks
  stories.
- **The demonstration story must exercise this layer.** ADR-310 D18's
  thealderman port is where these constructs prove legible to a player —
  six suspects with secrets is precisely a normative-layer story. The
  experiment corpus's native slots (N1–N3) become acceptance scenes.
- **Chord's runtime opacity deepens** (extends ADR-310's Consequence): an
  arbiter verdict, a deposit, a pin — none visible in source. D11's author
  channel is the answer and its scope grows accordingly.
- **The conscience economy changes goal and temperament authoring.** Authors
  will discover that "cheap" temperament choices cost pressure downstream. The
  documentation must teach the defeat-ledger rule explicitly — it is the
  layer's central mechanic and its central surprise.
- **Performance adds little**: the arbiter runs only on live-force
  disagreement; deposits and pins are O(1) bookkeeping on existing turn
  phases. The propagation and goal costs are ADR-310's, unchanged.
- **Cost target held in the experiments, and becomes a regression bar**:
  a morally legible character in 3–6 lines beyond the ADR-310 baseline;
  the zero-interest character at zero.

## Implementation

Extends ADR-310's Implementation section; same discharge rule. Packages:

- **`packages/chord`** — grammar: `define temperament` / `temperament … [while
  <state>]` with pair lines; principle lines (`never …`, `protects …`,
  `except`), `define code`; `honor before <scope>`, `define honor`;
  `burdened by`; the `claims` tag on topic/phrase lines; `confided` in the
  `knows` comma slot; the `witnessed as` alias (D12a); band words in the
  predicate vocabulary; diagnostics
  (unknown category/force/face-act/band, same-state temperament tie, `burdened
  by` an unheld topic, `claims` value outside the fact's set).
- **`packages/world-model`** — trait data for temperaments, principles, bands,
  pressure, ledger; vocabulary modules for forces, categories, face-acts,
  bands; serialization per D12.
- **`packages/character`** — the arbiter and its feeds; deposit/drain
  logic; the selector's pin; act-category and face-act detection over the
  event stream; registration into stdlib's tick-phase socket.
- **`packages/stdlib`** — act detection hooks where acts live (taking =
  steal-candidate, combat = harm, reveal = topic delivery); selector
  integration (ADR-310 D15's socket); author-channel events per D11.
- **`packages/story-loader` / `packages/engine`** — load and save as in
  ADR-310's line; no new turn-cycle mechanism.
- **IDE / testing surface** — "explain this NPC's turn" grows D11's rows;
  ADR-293 forcing for bands and arbiter outcomes.

Unchanged: `packages/parser-en-us`, `packages/lang-en-us` (rule 3 — this
layer generates no player prose, ever).

## Acceptance

Each criterion is an experiment scenario promoted to a test; packages in
parentheses.

1. **B1 end-to-end**: threatened Witness with principle + temperament refuses in
   the panicked voice; delete the principle line → complies; delete only the
   temperament → complies under high fear, refuses under none. (chord, character,
   stdlib; transcript test)
2. **B2 + discriminator**: same demand, empty room vs regiment present,
   opposite outcomes; `honor over duty` vs `duty over honor` produce the
   brazen-out and the public confession respectively. (character, stdlib)
3. **B3**: repeated questioning climbs the bands monotonically with the
   strained phrasebook taking the voice at `burdened`; the in-conversation
   crack fires at `breaking`; the seek-out confession goal fires only
   outside conversation. Band pinned via the deterministic deposit ladder,
   not turn counts: deposits are fixed-size (sensitivity-scaled), each
   climbing turn is a meaningful maintained lie, and the crossing turn is
   arithmetic — ADR-293 `forces:` pins random point outcomes and has
   nothing to pin here. (chord, character, stdlib) *(Amended 2026-08-16 —
   the original "band pinned via forcing" named the wrong mechanism;
   conscience bands are deterministic deposits, not random draws.)*
4. **B4**: witnessed face-act reaches a third NPC's dialogue via
   propagation, gated under both a derived topic name and a scene alias
   (D12a); the player transcript contains no model concept. (character,
   stdlib, chord)
5. **B7 + B5**: the pinned lie survives warmed disposition and a
   save/restore cycle; honest disagreement mints no ledger entry; the
   caught-lying confrontation fires the face-act. (character, world-model,
   engine)
6. **Paralysis**: two unexcepted colliding principles produce evasion plus
   an author-channel warning naming both. (character, stdlib)
7. **Diagnostics**: every diagnostic in the Implementation list asserted as
   a compile error. (chord)
8. **Cost regression**: the acceptance stories' character blocks stay
   within the 3–6-line target; the no-layer character compiles byte-
   identically to today. (chord; whole-platform regression per ADR-310
   Acceptance 9)

## Open Questions

1. ~~**The keyword for the ordering construct.**~~ **Resolved 2026-08-15 by
   D3**: `temperament`, David's ruling — chosen over the working keyword
   `nature` and over `spine`. Folded into every example in this document;
   the experiment files keep `nature` as the historical record.
2. ~~**The face-act and act-category lists, reviewed before freeze.**~~
   **Resolved 2026-08-15 by D4 and D7**: act categories expanded to add
   `abandon [scope]`, `trespass`, and the obligation `answers honestly`
   (evasion satisfies `never lies` but not `answers honestly`); face-acts
   frozen at the drafted six.
3. ~~**The band words.**~~ **Resolved 2026-08-15 by D8**: three bands —
   `clear / burdened / breaking`. The four-band draft's `uneasy` was cut.
4. ~~**Does `breaking` terminate?**~~ **Resolved 2026-08-15 by D8**: no —
   discharge resets the curve; permanence is authored as a state transition
   in the confession outlet. The platform remembers nothing.
5. ~~**The event-to-topic naming contract**~~ **Resolved 2026-08-15 by
   D12a**: derived deterministic names (actor × act) with an authored
   `witnessed as` alias at the scene. Compile-checkable, Index-listable,
   total coverage at zero cost.
6. ~~**Are the player's lies tracked?**~~ **Resolved 2026-08-15 by D9**:
   explicitly deferred to the SAY/TELL interface work, its own future ADR.
   Not designed, not foreclosed — non-blocking for this layer.

## Session

Session 00aaa0 (2026-08-15). Produced from the frontier-experiment series
(`docs/work/adr-310/experiments/`, method + exp-01 through exp-05) run this
session at David's direction, after the session's re-framing of the
character model as layers of dialogue and the ruling that the Versu-depth /
authoring-ease balance is the design brief. Companion to ADR-310, which
carries the descriptive layers this ADR's normative layer arbitrates over.

Amended session 55a70a (2026-08-16), folding in the D11 seam rulings landed
the previous day (session f123de, David's per-seam go-aheads; evidence:
`docs/work/adr-310/wiring-audit.md` D11/D12): the D8 discharge contract
(gate-is-marker, self-only, both outlets, curve-only drain); the D9 pin
split into band-aware gating (seam 4), maintenance accounting, and
per-audience release (seam 3 — truth-told live, caught-lying dormant,
authored break as a trait method, discharge never unpins); and the AC3
parenthetical corrected from ADR-293 forcing to the deterministic deposit
ladder (the G4 finding in `docs/work/adr-310/gap-closure-design.md`). The
companion activation contract — edge-triggered goals — landed as an ADR-145
amendment the same session.
