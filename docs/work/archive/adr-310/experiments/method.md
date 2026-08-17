# The Frontier Experiment — Method

**Purpose**: iterate candidate Chord authoring surfaces for the character
model's normative layer (principles, arbitration, honor, conscience, the lie
ledger) along the axis David named 2026-08-15: *stretch the elements as close
to Versu as possible, balanced against ease of authoring*. This generalizes
ADR-222's elegance oracle — a one-shot "does the Chord form read better?" —
into a graded loop run against a fixed scenario corpus.

**Status**: method fixed, corpus half-picked (thealderman scenes are David's
call, marked below). First run: `exp-01-arbitration-ordering.md`.

**Relationship to ADR-310**: the experiment feeds the companion decision on
the normative layer (dialogue layers 5, 6, and the arbitration piece of 7, per
the 2026-08-15 session discussion). Nothing here is a decision; winners
graduate to ADR text, losers are recorded here so they are not re-proposed.

---

## The four design rules candidates are tested under

Every candidate surface must be compatible with all four. A candidate that
wins its grades by breaking one of these is disqualified, not clever.

1. **Words, never rules.** Declarations in closed or author-named
   vocabularies. The runtime owns all inference. The moment a candidate needs
   the author to write a precondition→action rule, it has rebuilt Praxis.
2. **Depth is opt-in by ladder.** The D4/D5 ladder, reused: one adjective →
   named profile (`define …`) → partial override (`with … and …`). The
   character who doesn't use the layer costs zero lines (D7).
3. **Emergence speaks only through authored mouths.** D12. Internal depth is
   unbounded because the only outlets are phrases/phrasebooks the author
   wrote. Author workload scales with visible behaviors wanted, not with
   model complexity.
4. **The runtime boils the pot; the author writes the boiling over.**
   Pressure, decay, accumulation: simulated, never declared (D6's pattern).
   The dramatic discharge — when and how it shows — is an authored outlet.

## Grading rubric

Four axes, each graded RED / YELLOW / GREEN per candidate per scenario.
A candidate ships only on all-GREEN or GREEN-with-one-YELLOW (justified in
the verdict). Grade *only* failures in prose; a GREEN needs no narration.

| Axis | Question | GREEN | YELLOW | RED |
|---|---|---|---|---|
| **Depth** | Does the scenario's collision get represented? | The drama is declarable and the trace exhibits it | Representable with contortion (extra scaffolding entities, abused constructs) | The drama falls outside what can be declared |
| **Cost** | What does it cost the author? | ≤6 lines on the character beyond D2–D3 baseline; ≤2 new keywords; zero-interest character still costs 0 | ≤12 lines or ≤4 new keywords | More; or the zero-interest character pays anything |
| **Predictability** | Reading the source, can you say what happens next turn? | Two independent hand-traces agree | Traces agree after one clarifying re-read of the candidate's spec | Traces diverge — the Versu failure, instant kill |
| **Legibility** | Does the behavior reach the player through authored prose slots? | Every visible beat maps to an authored phrase/phrasebook slot | Needs a slot type we haven't decided (flag it) | Only works if the player can see mechanics (D12 violation) |

**Predictability is graded by procedure, not opinion**: the candidate's author
writes the scenario trace; a second pass (other session, or same session after
a context break, or David) traces it cold from the source alone; diff the
traces. Divergence anywhere that matters is RED.

## The corpus

Two halves. Each scenario is a one-paragraph statement of the drama it must
exhibit, not a script — candidates decide how the drama is *declared*, the
scenario only fixes what must be *true*.

### Imported benchmarks (from the prior-art canon, `../prior-art.md`)

- **B1 — Refusal on principle.** A character is asked (by player or NPC) to do
  something within their power that they will not do, and the refusal is not
  fear, mood, or disposition — remove the principle and they'd comply.
  *(Anchor: CiF social norms; Versu practice violation.)*
- **B2 — The audience changes the man.** The same request, same character,
  same mood — different answer depending on who else is in the room.
  *(Anchor: Versu norm-violation being "noticed"; honor as audience-scoped.)*
- **B3 — Conscience outruns loyalty.** A character conceals a truth across
  repeated questioning; pressure accumulates by simulation; the confession
  discharges at an authored outlet, not at a platform-chosen moment.
  *(Anchor: Versu escalation-through-interpretation; rule 4's boil/boil-over.)*
- **B4 — The fallout travels.** A violation witnessed by one NPC alters a
  third NPC's dialogue later, via propagation — the player never sees the
  transmission, only the changed behavior. *(Anchor: ToTT propagation; Versu
  gossip carrying justifications; D10.)*
- **B5 — Honest disagreement.** Two characters hold different values for the
  same fact and each speaks from their own belief without either being
  scripted as "the liar." *(Anchor: ToTT divergent beliefs; D14.)*
- **B6 — The arc flip.** A character's ordering changes at a dramatic moment
  (fear-over-duty becomes duty-over-fear), authored as a ratcheted state
  transition, and dialogue on both sides of the flip comes from different
  voices. *(Anchor: the Q3 discussion — mood is weather, the arc is a Chord
  state; D13/D16 phrasebook selection.)*
- **B7 — The maintained lie.** A character who has lied must keep the lie
  consistent to that audience in later conversation, without theory of mind —
  a ledger of own claims, not a model of the listener. *(Anchor: Versu's
  explicit no-theory-of-mind cut; D14's addressing, audience-scoped.)*

### Native benchmarks (thealderman — David picks)

The six suspects and their authored knowledge are the raw material (from
`stories/thealderman/src/npcs/index.ts`): Ross Bielack (very impulsive,
defensive, slightly honest), Viola Wainright (very deceptive, charming,
bitter), John Barber (very guarded, cold, intelligent), Catherine Shelby
(very observant, honest, protective, warm), Jack Margolin, Chelsea Sumner —
with fact ids like `stephanie-death`, `gambling-debts`, `stephanie-lover`,
`half-sister`, `inheritance-cut-out`, `enforcement-work`, `executor-of-will`.

**Slots open — the scene picks are story decisions, not the experiment's:**

- **N1 — [David: a suspect whose silence is principled, not fearful.]**
- **N2 — [David: a suspect whose answer should depend on who's listening.]**
- **N3 — [David: the confession you'd want conscience pressure to produce.]**

A native scene can double an imported benchmark (N1 may be B1 with real
characters); the point of the native half is that grades get sanity-checked
against people who exist, in the story D18 made the demonstration.

## The loop

One file per concept: `exp-NN-<concept>.md`. Each iteration inside the file:

1. **Scenario(s)** — which corpus entries this concept is tested against.
2. **Candidates** — 2–3 competing Chord spellings of the same declaration.
   Paper only. Full `create` blocks, not fragments — cost is graded on the
   whole character.
3. **Traces** — a turn-by-turn hand-trace per candidate per scenario, written
   next to the source. The trace is the semantics; if writing it forces a
   semantic decision the candidate didn't specify, that's a finding — record
   it in the candidate, then trace.
4. **Grades** — the rubric table, failures narrated in one line each.
5. **Verdict** — winner / revise-and-rerun / concept fails. A verdict of
   "revise" states exactly what changes; the next iteration is appended below,
   never overwritten — losing candidates are the record of why.

**Null results are decisions.** A concept where no candidate passes
Predictability at GREEN/YELLOW Cost is evidence the concept belongs in the
runtime as automatic behavior (decay's precedent), not on the authoring
surface. That verdict goes to the companion ADR as a decision, not a failure.

**Escalation, only on a genuine tie**: if two candidates survive hand-tracing
undifferentiated, a throwaway interpreter sketch in scratch (never
`packages/`, never committed as platform code) runs the candidates against
stub NPCs. The expectation is that paper settles nearly everything —
hand-tracing *is* the predictability test.

## Run order

1. `exp-01-arbitration-ordering.md` — the ordering everything else leans on
   (what wins when principle, fear, desire, honor collide). Scenarios B1, B6.
2. `exp-02-principles.md` — refusal/obligation declarations. B1, N1.
3. `exp-03-honor-audience.md` — audience-scoped behavior; the
   propagation/reputation weave. B2, B4, N2.
4. `exp-04-conscience.md` — pressure and authored outlets. B3, N3.
5. `exp-05-lie-ledger.md` — maintained claims per audience. B7, B5.

Order is dependency order, not priority — a later experiment may send an
earlier one back for a rerun, and that's the loop working.
