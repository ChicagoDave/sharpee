# ADR-195 (Slot) — Target Scenarios in Friendly Zoo

**Status:** design driver (pre-ADR). Not a spec — a concrete consumer that the ADR-195
decisions must satisfy.
**Created:** 2026-06-28
**Consumer:** `stories/friendly-zoo` (see [[friendly-zoo-testing-target]]). Each scenario
below names real zoo entities, daemons, and rooms so the design is pressure-tested against
working code, not invented examples.
**Reserved kind:** `Slot` (ADR-192 §2, the `contribute(slotKey, phrase, opts)` seam). The
seam is declared and currently inert (`engine/prose-pipeline/render-context.ts` drops
contributions; the Assembler throws `PhraseNotImplementedError` for `kind: 'slot'`).

---

## 1. Why this doc exists

`Slot` is the only remaining reserved kind with **no consumer** and the **heaviest open
design** (the contribution channel; ADR-192 §2 / the S-append scenario in
`dynamic-text-scenarios.md`). Building it speculatively risks a contract that no real
feature pushed on. So before the ADR, we enumerate exactly what Friendly Zoo would do with
slots — what gets contributed, by whom, when, and what the joined prose must read like at
0, 1, and N contributions. The ADR's decisions are answers to the questions these scenarios
raise (§6).

## 2. What a Slot is (recap)

A `Slot` is an **open, named append target** in a template that stays open until the turn's
text finalizes. Independent sources `contribute(slotKey, phrase, opts)` clause-level content
during the turn, **without knowing about each other**. At realize time the slot collects all
contributions for its key, orders them deterministically (for save/replay), and joins them
under **one** punctuation authority. The invariant (from `dynamic-text-scenarios.md` S-append):

> Zero contributions leave the stem + terminator clean; N contributions join under one
> punctuation rule regardless of count, order, or source; **the slot owns the lead-in /
> connective grammar, not the contributor.**

## 3. The two contribution paths

The zoo splits cleanly across the two paths, which matters because only one is easy:

- **Realize-time contribution** (easy) — a contributor that runs *during realization* and
  holds a `RenderContext`. Example: realizing a room's NounPhrase notices an occupant and
  appends a presence clause. A turn-scoped contribution store on the context handles it.
- **Turn-time contribution** (hard) — a daemon / NPC behavior / trait that runs *during the
  turn* (action execution) and holds **no** `RenderContext` (the same wall as Verb case-B:
  producers don't hold a context at report time). The design doc routes this through the
  **ADR-163 channel model** — contributions become events on a channel, drained by the slot
  at realize. This is the part with the open design and is a candidate to **defer**.

Friendly Zoo exercises **both**, and the scenarios are tagged accordingly.

---

## 4. Scenarios

Notation: `{slot:key}` is the open slot. "0 / 1 / N" shows the joined output as contributions
arrive. Contributors name real zoo code.

### S1 — Room occupants (realize-time) — IN SCOPE (first cut)

A room's "who/what is here" line, today hard-built by the contents producer, becomes a slot
that present NPCs append themselves to.

- **Template (Aviary):** `"The Aviary is a high-netted enclosure full of birdsong.{slot:here}"`
- **Contributors** (each appends a presence clause when it is in the player's room):
  - zookeeper **Sam** (`characters.ts` `KEEPER_PATROL_ID` patrol → mainPath/pettingZoo/aviary)
    → `Sam is here, jingling a ring of keys.`
  - the **parrot** (`parrotBehavior`, Aviary) → `A scarlet parrot eyes you from its perch.`
- **Output:**
  - 0 → `The Aviary is a high-netted enclosure full of birdsong.`
  - 1 (parrot only) → `… full of birdsong. A scarlet parrot eyes you from its perch.`
  - 2 → `… full of birdsong. Sam is here, jingling a ring of keys. A scarlet parrot eyes you from its perch.`
- **Why it fits:** contributors are entities present at realize time; the slot owns the
  sentence break. Proves the realize-time path end-to-end with two independent sources.

### S2 — Object detail appends (realize-time) — IN SCOPE (first cut)

The S-append cabinet example, zoo-flavored. An object's one-line description carries an open
slot that its **traits** append state clauses to — the "dead adjectives" problem generalized
to clauses.

- **Template (flashlight / radio, both `SwitchableTrait`):** `"A {detail-obj}{slot:detail}."`
- **Contributors** (trait-driven, at realize time):
  - `SwitchableTrait.isOn` → `humming` (radio) / `LightSourceTrait.isLit` → `casting a thin beam` (flashlight)
  - a low-battery daemon flag → `its battery light blinking red`
- **Output (radio):**
  - 0 → `A radio.`
  - 1 (on) → `A radio, humming.`
  - 2 → `A radio, humming, its battery light blinking red.`
- **Why it fits:** same realize-time mechanism as S1 but joining **mid-sentence** (comma list
  + relative clause) rather than across sentences — so it tests the slot's connective grammar,
  not just sentence concatenation. Contrast with ADR-193 state-adjectives (single-word,
  pre-noun); slots handle **clauses**, post-noun, multi-source.

### S3 — After-hours candid asides (realize-time, runtime-swapped) — IN SCOPE (stretch)

After the zoo closes (`zoo.after_hours`), animals in the player's room speak candidly. Today
each is a **separate `game.message`** block (`events.ts` `animalCandidDaemon`, lines 224–271);
as slots they'd append to one room-asides slot.

- **Template (room footer):** `"{room-desc}{slot:asides}"`
- **Contributors** (after-hours, per `animalCandidDaemon`):
  - goats (Petting Zoo) → `A goat mutters that the feed is overpriced.`
  - rabbits (Petting Zoo) → `A rabbit confides it's been plotting an escape.`
- **Output (Petting Zoo, after hours, both unheard):**
  - `… The main path is back to the west. A goat mutters that the feed is overpriced. A rabbit confides it's been plotting an escape.`
- **Why it fits / what it tests:** two contributors to the **same** slot in the **same** turn,
  from a single daemon emitting an array — exercises **deterministic ordering** (goats before
  rabbits, stable across save/replay) and the "N from one source" case. Borderline between
  paths: the daemon runs at turn time but could stage contributions the room realization drains.

### S4 — PA / ambient announcements (turn-time, channel) — DEFERRED (target, not first cut)

The hard path. A daemon firing mid-turn wants to append an ambient line to whatever the turn
already printed, independent of the player's action.

- **Template:** any action's output carries a trailing `{slot:ambient}`.
- **Contributors** (daemons with **no** RenderContext):
  - PA announcements (`createPAAnnouncementDaemon`, every 5 turns) → `Over the PA: "… closing in three hours."`
  - feeding-time fuse (`createFeedingTimeFuse`) → `A bell rings — feeding time at the aviary.`
  - goat bleating (`createGoatBleatingDaemon`) → `The goats bleat expectantly.`
- **Output:** `Taken. Over the PA: "Willowbrook Family Zoo will be closing in three hours."`
- **Why it's deferred:** the contributor holds no RenderContext, so this is the ADR-163
  channel integration. It's the **concrete feature that justifies** building the turn-time
  channel later — captured here so the first-cut design doesn't paint it into a corner, but
  not built until S1–S3 prove the realize-time core. Today these render as separate narrated
  blocks (`narrate: true`); the slot would *fold* them into the turn's prose instead.

---

## 5. What each scenario is today (the baseline being replaced)

| Scenario | Today in friendly-zoo | With Slot |
|----------|----------------------|-----------|
| S1 occupants | contents producer / per-NPC examine | NPCs `contribute('here', …)` at realize |
| S2 object detail | static description string only | traits `contribute('detail', …)` at realize |
| S3 after-hours asides | N separate `game.message` blocks (`events.ts:224`) | one `{slot:asides}`, joined |
| S4 PA/ambient | separate `narrate: true` blocks (`events.ts:53,86,107`) | one `{slot:ambient}`, folded via channel |

## 6. Open design questions these scenarios force

The ADR must answer each; the scenario that raises it is named.

1. **Contribution source & timing (S1 vs S4).** Does the first cut support only realize-time
   contributors (hold a RenderContext), or also turn-time (channel)? *Recommendation: realize-
   time only in ADR-195; name the channel path as future work.*
2. **Connective ownership / join grammar (S2).** Slot owns lead-in/connective. Is a
   contribution a **bare clause** (slot inserts comma/"and"/sentence break) or does it carry
   its own connective? *S-append's load-bearing decision — bare clause keeps punctuation clean.*
   What join *modes* exist (sentence-concatenation for S1/S3 vs comma-list for S2)? Is the mode
   a slot property (`{slot:detail mode=clauses}`) or fixed?
3. **Ordering & determinism (S3).** `SlotContributionOptions.order` is declared. What is the
   tie-break when `order` is equal (insertion order? contributor id?) and is it stable across
   save/restore? S3 needs goats-before-rabbits to be reproducible.
4. **Scope: turn vs message (S1, S4).** Is a slot store turn-scoped (shared across every
   message realized this turn) or message-scoped? S4's ambient line attaches to *another*
   message's output → turn-scoped. The per-turn factory in `render-context.ts` already binds
   seams per turn, which fits.
5. **Empty discipline (all).** Zero contributions must leave stem + terminator clean — already
   the `Empty`-absorption rule (ADR-192 AC-6); confirm `{slot:key}` with no contributions
   realizes to `Empty`, not a dangling space or connective.
6. **`Slot` fields.** The stub is bare (`interface Slot { kind: 'slot' }`). Minimum: `slotKey:
   string`. Candidates from the scenarios: `conj`/`mode` (join grammar, S2), default lead-in.

## 7. Proposed first cut (for the ADR to confirm)

- **In:** the `Slot` kind + `slotKey` (+ join `mode`); a **turn-scoped** contribution store on
  the engine `RenderContext` (replace the no-op `contribute` in `render-context.ts`); the
  Assembler `Slot` case that drains, orders (`order` then insertion), absorbs `Empty`, and
  joins under the punctuation authority. Proven by **S1 + S2** (and S3 if cheap) as
  friendly-zoo transcripts + assembler unit tests.
- **Out (named, not silently dropped):** the **turn-time channel** (S4) — contributors without
  a RenderContext. Deferred to a follow-on that sits on ADR-163, justified by the PA/ambient
  feature.

## 8. Relationships

- Follow-on of ADR-192 (reserved `Slot` kind, `contribute` seam). Reuses the ADR-194
  entity→NounPhrase bridge where a contribution is an entity. Sibling of the other realized
  atoms (193/194/197/198/199/200). The deferred channel path relates to ADR-163.
- Consumer: [[friendly-zoo-testing-target]]. Plural-name fix that cleaned the zoo prose first:
  [[friendly-zoo-plural-name-bug]].
