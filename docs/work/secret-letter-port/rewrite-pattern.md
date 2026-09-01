# The Quip-Tree → Chord Rewrite Pattern (Plan Phase 7, P-6a)

**Created**: 2026-08-31 (session bfb2ce). **Reworked twice the same session**
on David's corrections: (1) the first draft proposed topic tables as the
port-wide default, generalizing from a Chapter 1 build comment — wrong; the
port exists in part to exercise the ADR-320 conversation system's full
capabilities; (2) the ruling that settles it, now recorded in the change
document's standing rulings: **every NPC's conversation is open dialogue;
`define topics` is not an NPC surface anywhere in this story** (David,
2026-08-31: "every topic-based interaction with an NPC needs to be remapped
to open dialogue" — "every NPC").
**Status**: RULED (2026-09-01) — all five open questions in §7 carry
David's rulings; the demonstration conversion (Sandler + Bobby, §7 OQ-1)
is unblocked — and **deferred** (2026-09-01, session c2a3b7, David: "I'm not
ready to write dialogue at this point — keep this until we're done with the
port"). Until Phases 10 and 11 are built, every conversation is a *stub*:
its triggers and world side effects live, its text a TODO — see plan.md's
standing "Conversation stubs" rule. The demonstration runs on those stubs
afterward; nothing here changes.

This is the written half of Phase 7's deliverable: a general mapping from
Textfyre's menu-driven quip tree (the `Quips` extension) to Chord's
conversation surface, plus the per-NPC perception mechanism. Grounds: the
`Quips` extension source
(`docs/references/textfyre/secretletter/extensions/Textfyre/Quips`), full
reads of the `TE`, `DS`, `BO`, and `CB` trees (the 23-tree inventory is
`INVENTORY.md` §4), ADR-320's decision set, the shipped syntax verified
against `ides-of-march.story`, and the dispatch path verified in
`packages/stdlib/src/actions/helpers/dialogue-selector.ts` (grip precedence:
open exchange > active thread > parked resume). No story prose appears in
this document — examples quote Gentry's source or already-built code only.

---

## 1. The stance: the menu was a workaround; the rewrite outgrows it

The 2009 quip tree is what complex conversation looked like when the
alternative was bare ASK/TELL: the numbered menu carried structure —
sequence, stance, NPC initiative — that a topic table cannot. Flattening the
trees into topics would keep the workaround's *content* while throwing away
its *structure*. Under the standing ruling there is no topic table to flatten
into: every tree is read for the dramatic structure the menu was simulating,
and that structure is authored in the construct built for it:

| What the menu was simulating | The construct that owns it now |
| --- | --- |
| an occasioned opening ("We haven't had the pleasure of your company in a while") | `define greetings` — first-time / return / **absence words** |
| a sequence the NPC drives to a landing (Bobby's proposal) | `define conversation` — beats, strength, conclusion |
| an NPC question whose replies define the next input (DS14, BO8) | `define exchange` — `answer` rows, `on silence`, `on leaving` |
| stance forks merging into one reply (transitional quips) | exchange `answer` rows sharing a continuation |
| a hub of subjects the player raises freely | **subject threads** (`about`-claimed) and **hub exchanges** (NPC-prompted) — §3 M10 |
| fired-state gating, cross-tree gates (`HO1` → `DS4`) | `was discussed`, freshness words |
| the NPC's personality showing in every reply's framing | `define manner` — ambient beats, voice |
| deciding to speak at all (`start conversation with` sites) | `opens when` + D7 initiative |

Dispatch needs no floor beneath these: the shipped precedence (open exchange
> active thread > parked-thread resume) resolves every conversational input
inside the scene, and input nothing claims falls to the action's default —
a per-NPC authored fallback line where the source has one.

---

## 2. The source model, for reference

A quip is a node: `menu text` (what the player may choose), `display text`
(said when fired), `repeat text` (on re-fire), and `response` — an ordered
quip list that becomes the numbered menu. Around the nodes: `talk to` runs an
`initiating conversation` rule that picks the opening gambit by occasion
(Dame Sandler's `DS1`/`DS24`/`DS31`/`DS49` dispatch, `story.ni:5252-5273`);
`start conversation with X on Q` (40 sites) fires NPC- and event-initiated
entries — on room entry (`CB1`, `BO1`), on trying to leave (`BO7`, `DS14`),
on plot beats (`TE20`), some `even if not present` (offstage voices, `BO16`).
Transitional quips (47) fire and immediately fire their `following quip`
(stance merges). `After populating` rules prune the offered menu — including
cross-tree gates (`DS4` offered only after Holstenoffer's `HO1` fired).
Fired state drives `[first time]…[subsequently][rp]…[only]` rendering and
the gating. Empty `response` or walking away ends the conversation; `After
firing` rules carry world side effects (`BO10` removes Bobby; `DS29` ejects
the player and locks the shop).

---

## 3. The mapping

**M1 — Entry occasions → `define greetings`, with the time words.** The
initiating rule's occasion dispatch becomes greeting arms split on statement
`when` (story state, NPC states) — and a greeting arm may `then asks` the
NPC's hub exchange, so the scene opens *into* dialogue rather than into
silence. What the source faked by hand, the boundary layer owns: `DS1`'s
*"We haven't had the pleasure of your company in a while"* is an
**absence-word** arm (ADR-320 D6); `TE5`'s *"Back so soon?"* is a return arm
on recency rather than a hand-tracked flag.

**M2 — Sequences → `define conversation` threads.** A run of quips that
tells one thing in order and must land is a thread: ordered `beat:` rows,
`conclusion:` carrying the plot consequence. Bobby's proposal
(`BO7`/`BO6` → `BO8` → in-or-out → `BO10`) maps beat for beat, and the
source's own enforcement hardware maps onto the thread's: `Instead of going
… start conversation with Bobby on BO7` is `opens when` (the NPC seizes the
floor); *"C'mon, Jack, tell me: are you in or out?"* is the `blocking`
strength's `on refusing:` row; a parked resume renders `on resuming:`.

**M3 — NPC questions and stance forks → `define exchange`.** Wherever the
NPC's line defines what the next player input means: a posed question with
stance replies (`DS14` → `DS15`/`DS16`/`DS17`; `BO8` → `BO9`/`BO10`)
becomes `then asks <exchange>` with the stances as `answer` rows; a
transitional-quip merge (three stances → `DS18`) becomes `answer` rows
sharing the merged continuation. `on silence` and `on leaving` carry what
the source did with walking-away rules — and give the port something 2009
never had: silence as a rendered, characterized response (D8).

**M4 — Personality framing → `define manner`.** The source hand-writes each
NPC's delivery into every display text (Dame Sandler's knowing smile across
`DS10`/`DS11`/`DS18`; Bobby's grin). Gentry's prose keeps what it has —
manner never rewrites an authored line (D5: most-specific-wins) — but each
NPC gets a manner block so delivery texture is ambient rather than restated
per row, and so mood shifts color rows written once. Manner beat lines are
new text, hence David's — `(TODO during play-testing — …)` markers where
not yet written.

**M5 — Fired state → `first-time` + `was discussed`.** Rendering
(`[first time]…[subsequently][rp]…[only]`) is the `first-time` phrase
strategy with the source's `[rp]` prefixes inline (established). Logic —
pruning, cross-tree gates — is the `was discussed` predicate: `if HO1 is
unfired, remove DS4` becomes a condition on the Holstenoffer subject having
been discussed. No hand-plumbed story flags for conversation state; `when
the subject changes` (D9) is available where the source had an NPC notice
evasion (Dame Sandler is written as exactly the character who pounces).

**M6 — `After populating` world-state prunes → row `when`s.** Ordinary
conditions (Bobby carries the thing; the mercenaries are on-stage) — the
mechanism the whole market already uses.

**M7 — World side effects → statements where the text fires.** Exchange
`answer` rows and thread `conclusion:` rows carry the mutations (`change`,
`move`, NPC acting statements — the TE20 precedent: the NPC gives through
the real action, witnessed and refusable; player acting statements stay
forbidden, ADR-329 D1). An effect a construct cannot legally carry is a gap
to report, not to work around.

**M8 — Event-fired entries → the owning scene's clauses + `opens when`.**
A `start conversation with` fired from a room arrival, timer, or plot beat
belongs to the thing that fires it (an `after the player entering` clause, a
timer expiry, a trait's `after`), which speaks the opening and lets the
thread's `opens when` take the floor. The `even if not present` sites
(offstage voices at the hanging) are flagged per-scene; Chord has no
offstage-speaker primitive and each is a David call when its chapter
arrives.

**M9 — The numbered menu is not carried; its guidance function is.**
Exchanges advertise their `answer` rows as wire affordances (D12 — the
browser client renders reply choices), threads advertise continuability
("tell me more" / "go on"), and player-raised subjects are seeded in the
prose (the source's display texts already name their subjects). Nothing
renders a numbered list.

**M10 — The order-free residue → subject threads and hub exchanges, never
topics.** Two open-dialogue homes replace the topic table, chosen by who
raises the subject:

- **Subject threads** — player-raised. Each subject becomes a
  `define conversation` with an `about` filter (the topic-key grammar,
  claimed through the thread grip): one beat for a single-answer subject,
  several for the source's multi-quip subjects, `conclusion:` recording it
  discussed. The NPC carries a subject forward across sittings — which the
  2009 menu could not do.
- **Hub exchanges** — NPC-prompted. The source's own hub shape (`DS2`
  *"Was there anything in particular on your mind?"*) becomes an exchange
  whose `answer` rows are the subjects; a row speaks its content and
  `then asks` the hub again (a chained `then asks` replaces the open
  exchange — verified, `scene-runtime`), so the NPC keeps the conversation
  alive until the player parts. Which subjects sit in the hub versus stand
  as threads is a per-tree disposition call, flagged per §5.

**M11 — Termination.** Empty-response exits are the scene closing when
nothing holds the floor (or decaying on the silence boundary); an exit that
also ends the visit (`DS29`/`DS30` — pushed out, door locked) carries its
mutations per M7.

---

## 4. Per-NPC perception (vision.md §3d) — the mechanism

**Status: STANDING (David, 2026-09-01, OQ-3).** Phase 8 applies this
mechanism across all trees.

The standing rule: some characters see Jacqueline regardless of presentation
(the gender sight — starting set: Teisha, Dame Sandler, Bobby, Widow
Shannon); everyone else sees what is presented — Jack's existing
presentation states (`urchin` / `dressed` / `identified`). Perception is
fixed per NPC; presentation varies at runtime. Two layers, only one runtime:

- **P1 — Perception is declared, then authored.** Each NPC's file header
  states their perception; the change document's per-character naming is the
  authority as each chapter arrives; every line of that NPC is *written*
  under it — address, pronouns, what they let slip. A perceiver's lines
  never need a runtime check to know she is a girl; Gentry's own source
  already does this for Shannon ("Miss Jacqueline", `SH1`/`SH7`/`SH13`).
- **P2 — Presentation is conditioned, not perception.** Where a
  non-perceiver's line varies with what Jack looks like right now, the row
  splits on the presentation states with ordinary `when` conditions — the
  mercenaries/gates mechanism. A perceiver's rows never split on
  presentation for address, only for circumstance ("you look a fright").
- **P3 — A marker only when shared text needs it.** The rebuilt stallkeeper
  dialogue is shared across ten non-perceivers, so no runtime flag is
  needed yet. If a shared construct ever must branch on the speaker's
  perception, the NPC gets a declared marker state — deferred until the
  first real consumer, named here so it isn't reinvented ad hoc.

The demonstration conversion must exercise both live layers: one perceiver
whose address P1 carries, one presentation-split row P2 carries.

---

## 4a. The unit of work is the NPC's set (David, 2026-09-01)

David's framing, recorded verbatim in substance: **for each NPC we decide
a set of conversations.** In one-on-one conversations Jack and the NPC
float within the set; in some cases the set carries information Jack
needs. One or more PC+NPC conversations with several participants (the
ballroom, certainly) are coming and will be their own challenge.

How the set maps onto the shipped machinery (verified 2026-09-01):

- **The set** is the NPC's greetings, threads, and exchanges together —
  the disposition table of §5 is the set's ledger. It is decided per NPC
  before that NPC's conversion runs, which is also where the NPC's
  perception (§4) and Vedd register are fixed.
- **Floating within the set** is ADR-320 D14's transition rule: per pair,
  at most one ACTIVE thread, the rest PARKED with cursors held or
  CONCLUDED; a `passive` or `assertive` thread lets Jack move off it and
  resume later (`on parting` / `on resuming`), a `blocking` one pins the
  set to that thread until it concludes. So "float" is authored per
  thread by strength, and the default posture of a set is passive.
  Dispatch precedence in `dialogue-selector.ts`: open exchange > active
  thread > parked-thread resume.
- **Information in the set** is a thread whose conclusion is state —
  `when <key> is concluded` becomes true for other rows, greetings, and
  gates across trees (M5's cross-tree `was discussed` and M7's
  conclusion mutations). The set's useful content is therefore
  enumerable: it is the concluding threads.
- **Several participants** — see §6, third seam, and GH #347. ADR-320
  D10 designs the floor (one speaker by disposition, non-speakers react
  through manner, interruption by strength) but the shipped runtime opens
  scenes only as pairs and holds threads per pair; the ballroom is
  platform work, not a story workaround. Sets for the ballgoers are
  decided against that surface when Phase 8 reaches the ball.

---

## 5. What each conversion records

Every converted tree gets a disposition table in its `.chord` file header
(or a companion worksheet where the tree is large): one row per quip —
greeting arm / thread beat / exchange answer / hub-exchange row / folded /
cut — with the source line cited. Folds and cuts are flagged to David before
the conversion lands; cross-tree `was discussed` gates are named on both
trees; manner-beat and other new-text spots are
`(TODO during play-testing — …)` markers under the standing
content-authority rule. The tree-document lines pin each construct:
greetings per occasion, thread beats in order with the conclusion's
mutations asserted by `states:` pins, exchange answers plus their
refusal/silence rows, the hub re-prompt loop.

---

## 6. Platform seams found while verifying (reported, not worked around)

- **The answer input surface.** Today an open exchange is answered through
  the ask/tell surface — `ides-of-march.tests.json` answers Kemp's offer as
  `ask kemp about yes`. There is no bare `yes`/`no` verb, no answering/say
  action in stdlib, and no bare-subject grammar, so a player in an open
  exchange cannot type `yes`, or a bare subject word, and be understood.
  Open dialogue as the port-wide surface makes this the first thing every
  player touches; GH #317 (bare-verb scoping/fall-through) is the adjacent
  known seam. **To discuss with David before filing.**
  *Re-verified 2026-09-01* against the bundle (`dist/cli/sharpee.js
  --exec "yes/no/say yes/answer yes/say hello to kemp"` on
  `ides-of-march.story`): all five return "I don't understand that."
  ADR-320's Implementation note that "ASK/TELL/SAY/YES/NO … already
  exist" in `parser-en-us` is stale — `grammar.ts` defines ask/tell/
  question/inquire only. `lang-en-us/src/actions/answering.ts` carries
  patterns for bare `yes`/`no`/`answer [response]` and
  `constants.ts:87` names `if.action.answering`, but no stdlib action
  directory and no grammar line back them: an orphaned surface, not a
  working one. GH #318 (clarification follow-up: the next input answers
  a held question) is the same shape one layer down.
- **Unclaimed conversational input inside a scene.** With no topic table,
  input no exchange or thread claims falls through to the asking/telling
  action's default path. Whether that default renders an authorable per-NPC
  fallback (the source's equivalent: "There is no reply.") or a stdlib
  line needs one probe during the demonstration — if it is not authorable,
  that is a second seam to raise.
- **Multi-participant scenes (the ballroom).** ADR-320 D10 decides the
  floor model for several participants, and the scene state carries a
  `participantIds: string[]` (`conversation-scene.ts:98`), but every
  opening path builds a pair — `openScene([actor, target], …)` in
  `dialogue-selector.ts:278` and `runtime.ts:1894` — a participant sits
  in at most one live scene (`conversation-scene-store.ts:15`), thread
  status is per pair (D14), and the selector's own comment says a
  multi-party scene with two active player-pair threads is produced by
  no current path (`dialogue-selector.ts:160-164`). D14 also lists
  NPC↔NPC threads as deliberately not in v1. Not needed for the
  demonstration (Sandler and Bobby are one-on-one); **needed before
  Phase 8 reaches the ballroom**. **REQUIRED (David, 2026-09-01: "we
  will need multi-NPC conversations") — filed as GH #347** with the
  ball's six co-located ballgoer trees and the "every ballgoer spoken
  to" gate (`story.ni:11155`) as the concrete need; platform work for
  its own session, with an ADR-320 amendment or companion ADR for the
  Chord surface and the join rules.

---

## 7. Open questions for David (block the demonstration, not the pattern)

- **OQ-1 — The demonstration conversation.** **RULED (David, 2026-09-01):
  both together** — Dame Sandler's first occasion AND Bobby's alley
  conversation. A scene apart in the same chapter, and between them they
  exercise every mapping rule: Sandler brings the four-occasion greetings with absence
  words (M1), the hub-exchange shape (M10 — `DS2` is the source's own hub),
  the leave-triggered exchange and stance forks (M3), the `HO1` cross-tree
  gate (M5), the ejection close (M7/M11), and P1 (a perceiver whose "Squire
  Jack" address is a remake ruling to capture); Bobby brings the thread
  with `opens when`, blocking refusal, and a concluding world change (M2,
  M7). (Sandler alone was the smaller alternative; not taken.)
- **OQ-2 — The chapter gate.** **RULED (David, 2026-09-01): build to the
  2009 source's defaults now.** Both candidates are Chapter 2 content and
  the change document has no Chapter 2 section yet; the demonstration
  builds under the standing 2026-08-30 ruling (mechanics default to the
  source, gaps reported not decided) and is re-checked when the Chapter 2
  change-document pass (the Phase 4 guided conversation) arrives. That
  pass changes prose and rulings, not the pattern the demonstration proves.
- **OQ-3 — Perception mechanism.** **RULED (David, 2026-09-01): confirmed
  as standing.** §4's two-layer reading (P1 authored perception, P2
  conditioned presentation, P3 marker deferred until a shared construct
  needs it) is the mechanism Phase 8 applies across all trees.
- **OQ-4 — The Chapter 1 rebuild's timing.** **RULED (David, 2026-09-01):
  Phase 8, first up.** Teisha's `define topics` block and the shared `ST`
  stallkeeper tree stay as built through the demonstration (David is
  play-testing them in Phase 6's tail); Phase 8 opens with deciding
  Teisha's set (§4a) and rebuilding both, where the Vedd register reaches
  her anyway.
- **OQ-5 — The answer input surface** (§6). **RULED (David, 2026-09-01):
  bare answers while an exchange is open, with `say X` / `answer X` as
  the explicit synonyms.** Bare input routes to the open exchange's
  answer rows; with no exchange open the same input falls through to the
  normal parse. Filed as GH #346 (platform work, its own session). Until
  it lands the demonstration answers exchanges as `ask X about <answer>`,
  the ides-of-march tests' interim, and its tree lines are updated when
  the surface arrives.
