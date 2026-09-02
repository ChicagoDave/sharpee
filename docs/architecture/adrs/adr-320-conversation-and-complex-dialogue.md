# ADR-320: Conversation and Complex Dialogue — The Other Side of NPC Agency

**Status**: ACCEPTED (2026-08-16 — ten open questions resolved by interview, review
findings addressed, flipped with David's approval, session 02073f). No implementation
authorized by acceptance; the implementation plan is a separate step.
**Date**: 2026-08-16 (session 02073f)
**Related**: ADR-310/318 (the character interior this layer sits on — shipped, acceptance
discharged 2026-08-16), ADR-239 (topic tables — the shipped conversation interface),
ADR-142 (conversation system, DRAFT April 2026 — its principles "conversation is a
projection of character state" and "no procedural generation, no surprises the author
didn't plan for" are precedents this ADR must reconcile or supersede), ADR-132 (PC
switching), ADR-133 (structured text output — the Reflections rendering surface)
**Prior art**: `docs/work/adr-320-conversation/prior-art.md` — the merged reference
(April 2026 systems survey + August 2026 pass 1, reconciled 2026-08-16), including the
re-grade of the field's gap list against what ADR-310/318 already closed
**Motivated by**: the character features exist *for* this. Temperament, mood, goals,
influence, the lie ledger, and arbitration were built so NPCs could hold up their end of
complex conversation (David, 2026-08-16: "the other side of NPC agency and why we built
the character features — actual dialogue and complex conversation"). *Reflections*
(three actors, iMessage-style chat, rotating PC) is the forcing story for the multi-party
and NPC-initiated end.

---

## Context

ADR-310/318 shipped the NPC's interior: valued beliefs with source and confidence, mood
and temperament, dispositions, goal pursuit, influence with resistance, propagation,
principles, honor, conscience bands, and a lie ledger with pins — all authored in Chord,
all deterministic, all persistent. Against the field (see the merged prior-art
reference), that interior is ahead of anything shipped: per-character knowledge with
reliable enforcement and trackable unreliable narration — two of the six gaps the April
survey named as open across the whole field — are closed.

What is *not* built is the layer the interior was built for. Today the conversational
surface is topic dispatch: `define topics for …` matches a topic row, arbitration and
the ledger gate or suppress it, a phrase is emitted. Measured against the prior-art
maps, Sharpee's interior is built for the top of the NPC-agency ladder (goal-directed,
autonomous) while its conversational surface sits at the bottom (answers when asked).
Concretely, the interior state **gates** dialogue (whether a row is available, whether a
reveal is refused, whether a lie is maintained) but never **shapes** it (how the same
answer sounds from a frightened Viola versus a composed one). The dialogue-selector
socket (ADR-310 D15) exists for exactly this and has zero production registrants — the
wiring audit classifies that as authoring surface awaiting this layer, and with the TS
builder retired the Chord path is the only path left to serve.

The merged prior-art reference locates the unshipped value in five places: shaping
(Galatea's proven mood-variation effect, by mechanism instead of brute force);
conversational memory and relevance (Heaven's Vault's recency-driven salience — the
ledger already carries turn stamps nothing consumes); NPC conversational agency
(initiative, continuation, steering, exit — agenda patterns sitting on already-shipped
goal pursuit); lifecycle and flow (greetings, attention, threading, subject-change
noticing — the field's most commoditized layer, absent here); and multi-party
(turn-taking norms, audience awareness — with witnessing already shipped and
*Reflections* forcing the question).

Settled ground this ADR builds on and does not re-open:

- **Interface and model are different axes** (ADR-310's F2 finding, folded): topic
  tables are the interface; the character model is the model; they compose. This ADR
  changes what selects and colors the phrase, not the `define topics` surface.
- **Innermost active context wins outright; conversation suspends goal pursuit**
  (ADR-310 D16).
- **Platform announcement is forbidden; authored behavior carries legibility** (ADR-310
  D12 as written: nothing the platform generates may name a model concept, and the
  model's only player-facing channel is behavior the author wrote — with the stated
  cost that unauthored interior life is invisible. The *Best of Three* lesson —
  invisible reasoning reads as a script — is the pass-1 prior-art finding F1
  (`docs/work/archive/adr-310/prior-art.md`), which D12's cost paragraph anticipates;
  F1's recommended amendment to ADR-310 was not folded, so the lesson is cited here
  from the prior art, not from ADR-310's text).
- **The interior is fixed input.** ADR-310/318's model, vocabulary, and persistence are
  shipped surface; this ADR consumes them and does not amend them. (Chord-surface gaps
  for the interior are tracked separately — issues #268/#269.)

## Decision

- **D1 — This is the third companion ADR, consuming the interior, not amending it.**
  ADR-310 (descriptive interior) and ADR-318 (normative interior) get their payoff
  layer: conversation that reads the interior. Any need this ADR discovers for new
  interior state is raised against ADR-310/318 as an amendment, never smuggled in.
- **D2 — The topic-table interface survives.** `define topics for …`, phrasebooks, and
  specificity remain the authoring surface authors already know; this layer plugs in
  beneath them (the D15 socket is the named seam). Whatever complex conversation
  becomes, a simple story's topic table keeps working unchanged, at unchanged authoring
  cost (the ADR-318 AC8 discipline: stories that opt out compile byte-identically).
- **D3 — Authored, deterministic, testable.** Whatever mechanism emerges: no generation,
  no surprises the author didn't plan (ADR-142's principle, reaffirmed), reproducible at
  a pinned seed, expressible in transcripts. The LLM-era counter-argument gets its
  hearing in pass 2 of the prior art, but determinism is not on the table.

- **D4 — A conversation is a scene; the exchange point is its inner primitive.**
  (Resolved from Open Question 1, interview of 2026-08-16.) Two levels:
  - **The scene**: participants (PC and/or NPCs), a contested floor, lifecycle
    boundaries the platform recognizes (first meeting, return, exit, silence), and at
    most one open exchange at a time. A scene is opened by a participant addressing
    someone, by the NPC's own initiative, **or by any witnessed world event** — a PC
    act, another character's act, or a story event ("everyone notices a shadow passing
    the open window"): those present react aloud, the floor rule orders them, and the
    event becomes what the conversation is about. Moves within a scene are utterances,
    acts, or events — one vocabulary.
  - **The exchange point**: a named moment where a speaker's line defines what the next
    responses mean — opened from a topic row (`then asks …`, `then invites`) or a
    boundary block; while open, its responses (verbal rows and act/event rows alike)
    overlay the topic table, under D16's innermost-active-context-wins-outright rule.
    The topic table is the floor's default when no exchange is open.
  - **Memory and initiative are scene obligations**: re-approach is recognized and
    repetition is visible authorable state, expressed as words not numbers (asked
    once / again / many times — the runtime owns the counting, the D6 discipline);
    NPCs can open and re-open scenes at boundaries ("I see you're back. You're
    terribly persistent. What's on your mind?").
  - **Substrate**: the ADR-142-era conversation lifecycle machinery stranded in
    `@sharpee/character` (`ConversationIntent`, `ConversationStrength`,
    `ContinuationEntry`, `InitiativeTrigger`, attention decay, redirect results) is
    the scene's runtime skeleton — wired into the Chord topic-dispatch path through
    the D15 socket seam rather than reinvented.
  - Floor selection under open address, the interruption threshold (strength vs.
    motivation), and NPC↔NPC scene scheduling are Q6's to resolve; phrase shaping
    within the loop is Q1's residual below.

- **D5 — The manner layer: delivery declared once, content rows always win.**
  (Resolved from Open Question 1's residual, interview of 2026-08-16.) A character
  gets a **manner block** — declared once, read through the one predicate grammar:

  ```
  define manner for Viola Wainright
    when mood is fearful:
      beat "Her hands find the cigarette case."
      beat "She glances at the door before answering."
    when it is breaking:
      voice flat
  end manner
  ```

  Manner colors any phrase the character delivers — topic rows, exchange responses,
  boundary blocks — that lacks a more specific authored variant; where the author
  hand-wrote a state-conditioned row, the row wins untouched (most-specific-wins, the
  phrasebook discipline). `beat` lines rotate without back-to-back repetition (runtime
  owns the rotation, ADR-310 D6 discipline); `voice` markers color delivery. Manner is authored
  behavior text, never platform readout — compliant with ADR-310 D12 by construction. The effect:
  every NPC carries ambient emotional texture from one block, and content differs by
  state exactly where the author decided it mattered. A story with no manner blocks
  compiles byte-identically to today (D2's opt-out discipline).

- **D6 — Time lapse is conversational state.** (Resolved from Open Question 2,
  interview of 2026-08-16: "we def need a way for time lapse to impact conversations.")
  Elapsed time reaches conversation as **words, never numbers**, in three places:
  - **Recency over the ledger**: what a character witnessed or learned carries its
    existing turn stamp; rows may condition on recency (`when program-shown is fresh`)
    — the runtime owns what counts as fresh and how it ages (ADR-310 D6's
    runtime-owns-the-curve discipline), the author conditions on the word.
  - **Absence at boundaries**: a scene knows how long since the last one with this
    participant; boundary rows condition on it ("twice in one evening" vs. "it's been
    days"). The exact word list (fresh/recent/stale; just-now/lately/after-some-time or
    equivalents) is authored vocabulary and goes through the freeze review before it
    ships, like every vocabulary slice before it.
  - **One clock seam**: all of this reads time through `@sharpee/character`'s existing
    clock-access seam, so ADR-316's elapsed-time semantics, when un-deferred, change
    one seam (the same preparation issue #269 records for goal waits).
  The full relevance-engine pole (per-row requirements/redundancy ranking, the
  Heaven's Vault shape) is explicitly deferred — the recency word is designed so a
  ranking layer could later consume it without re-plumbing.

- **D7 — Initiative is a personality trait, affected by circumstances.** (Resolved from
  Open Question 3, interview of 2026-08-16, David's words.) Whether an NPC opens,
  interjects, or holds their tongue starts from **who they are** — a baseline
  propensity derived from the shipped personality words (brash interjects at any
  excuse; guarded volunteers nothing), with no new author-facing knob — and is **bent
  by circumstances**: mood and pressure band (fearful suppresses, breaking compels),
  what is at stake (a protected scope or active goal touched — guarded John speaks
  first when Stephanie is threatened), who is present, and what just happened
  (D6 recency). Brash Ross falls silent when genuinely frightened; the trait is the
  resting state, never a fixed rule. Occasions (a witnessed event, a goal step
  arriving, an open floor, a silence) are plumbing — disposition-under-circumstance
  decides whether this character seizes this one, through the same
  forces-feed-arbitration idiom ADR-318 uses for acts, pointed at "do I speak?".
  Authored rows always win where written (an explicit boundary/initiative row or goal
  step forces or suppresses the moment) — most-specific-wins, as everywhere. This same
  disposition-under-circumstance scoring is the natural input to Q6's floor selection
  (who answers an open remark) — carried there, not resolved here.

- **D8 — Conversational agency is world-bounded; silence is the inalienable move.**
  (Resolved from Open Question 4, interview of 2026-08-16: "NPCs have as much agency
  as the author can give them … if an NPC is handcuffed to a chair, they have no
  agency — but they *can* remain silent.") Steering and exit exist, gated three ways:
  - **Capability is platform**: deflection (`deflect to <topic>`), counter-topics
    (`then asks`), and leaving (`leave`) are row outcomes alongside the shipped
    `refuse when`; unauthored defaults ride D7's disposition-under-circumstance plus
    the lifecycle's `ConversationStrength` and attention decay, so scenes end
    naturally when unauthored.
  - **Possibility is the world**: a conversational move that is a world act obeys the
    world. Exit is movement — a restrained, cornered, or blocked NPC cannot take it;
    the scene consults the world model, never a private conversation-only physics.
    Exits and silences are ordinary observable behavior, witnessed by those present
    through the shipped machinery like any act — no special conversational memory
    rule.
  - **Silence is always available**: any character may answer anything with silence,
    regardless of circumstance. Silence is a *rendered response*, not an absence —
    ("Ross says nothing.") — and D5 manner colors it like any delivery. Nothing in
    the platform compels speech; compulsion (a breaking-band confession, a
    temperament that must answer) is always the author's grant through the interior
    model.

- **D9 — Threading is two words: discussed-ness and subject-change.** (Resolved from
  Open Question 5, interview of 2026-08-16.) Tight sequencing is already the exchange
  point (`then asks`, D4). The rest of thread structure ships as two platform-tracked,
  word-conditioned pieces:
  - **`when <topic> was discussed`** — the loose prerequisite (Threaded Conversation's
    indirectly-follows, without graph authoring): the platform tracks per-pair which
    topics have been covered, across scenes and in any order; rows condition on it
    (`phrase viola-inheritance-candid when the half-sister was discussed`). Scene
    state under D17 persistence; retires the hand-plumbed story-flag idiom for
    cross-topic dependencies (flags remain for genuinely story-level state).
  - **`when the subject changes`** — the scene notices a live thread abandoned and
    exposes it three ways: a manner condition (D5 — "she takes the change of subject
    gratefully"), a row condition, and a D7 occasion a disposition can seize ("don't
    change the subject on my account"). Who's relieved, who pounces — character and
    authoring, never a platform rule.
  Numbers are never exposed; the runtime owns the tracking (ADR-310 D6 discipline).

- **D10 — Multi-party: floor by disposition, interruption by strength-vs-motivation,
  NPC↔NPC scenes as visible propagation.** (Resolved from Open Question 6, interview
  of 2026-08-16.) The three specifics D4 carried here:
  - **The floor**: an open, unaddressed remark selects one speaker by D7's
    disposition-under-circumstance scoring — and **non-speakers still react**: their
    D5 manner emits its beat (John's silence renders, Viola's cigarette case clicks
    shut) without taking the floor. One speaker, many tells — in the mystery genre
    the open question is a probe and the ensemble reactions are the evidence.
  - **Interruption**: an outsider takes the floor when their D7 occasion-seizure
    outranks the scene's grip, expressed as the lifecycle's existing strength words —
    `passive` yields to any motivated interjection, `assertive` protests then yields,
    `blocking` holds against everything except world events and acts (D8's
    exemption: a gunshot interrupts anything). Authors may set strength on an
    exchange; otherwise intent derives it. No numbers.
  - **NPC↔NPC scenes**: goal pursuit drives them (seek-out is shipped), they run in
    the NPC turn phase, and they render only when observable — the PC present or in
    earshot gets the eavesdropping surface; otherwise the scene happens silently and
    only its effects land (facts move, ledgers record) — the scene is **propagation
    made visible when witnessed**, one machinery with two faces. PC intrusion is the
    interruption rule with the PC as interrupter; participants' reactions are
    ordinary D7/D5 material.

- **D11 — The player's utterances are witnessed claims.** (Resolved from Open
  Question 7, interview of 2026-08-16: "as with everything about NPCs, the PC's
  actions are witnessed.") The PC is an ordinary witnessed actor — their acts already
  land in the observation stream (act detection watches steal/harm/reveal); their
  **statements now do too**: what the player TELLs or SAYs becomes a claim in each
  hearer's ledger through the same witnessing machinery that records NPC claims —
  remembered per audience, traveling by propagation and NPC↔NPC scenes (D10), checked
  against what a hearer knows and hears (D6 recency, D9 discussed-ness). A caught
  contradiction is *material* for the interior — disposition shifts, a pointed row, a
  D7 occasion — never a platform-imposed penalty; the consequences are authored. This
  completes the strategic symmetry: both sides can lie, both sides can be caught, one
  ledger discipline. Player-facing tone/stance input (the Varicella dimension) is not
  part of this resolution — it rides Open Question 8's input-surface decision.

- **D12 — Presentation-agnostic by construction; exchanges advertise their responses
  as data.** (Resolved from Open Question 8, interview of 2026-08-16.) The scene model
  carries no parser assumptions:
  - **Output**: a scene emits structured events on the wire — speaker, addressee,
    phrase, manner beats, floor changes, interruptions, rendered silences — under the
    channel discipline (data only, clients render). Parser prose and *Reflections*'
    chat bubbles are two renderings of one stream.
  - **Input affordances**: an open exchange advertises its available responses as
    wire data — its verbal rows, act/event rows, and silence. A chat client renders
    them as reply choices; the parser client ignores them or renders authored topic
    hints; the IDE testing surface consumes the same data for "what could the player
    say here?", recording, and coverage. Future stance/tone inputs, if a story ever
    wants them, are one more advertised response kind — no new architecture.
  - Exchange rows are declarative and therefore enumerable; the response-affordance
    shape is part of the wire schema from first release.

- **D13 — The demonstration story: a Shakespeare-era theatre company, rehearsal to
  performance.** (Resolved from Open Question 9, interview of 2026-08-16; premise is
  David's.) A new vehicle, not a thealderman extension: a theatre in the Shakespeare
  era — the actors, the playwright, the extras and workers — played across the time
  it takes to rehearse and perform a play. The premise exercises the decision set by
  construction: an ensemble whose daily life is open-address floor scenes (D10);
  NPC↔NPC scenes as the ambient fabric a player walks in on (D10); time lapse as
  structure — rehearsal days, absence, the performance as a clock (D6); theatrical
  temperaments carrying initiative (D7); company gossip moving the player's own
  claims (D11); and the play-within-the-story setting scripted lines against living
  conversation. Per the *City of Secrets* discipline (Consequences), the player task
  is specified before mechanism is built; casting and content decisions are settled
  at planning time. **Reflections is named, not used**: it remains the requirements
  forcing story for multi-party/chat (D12) but is held back by David as a potential
  competition entry — it is not a platform fixture, and no platform work builds on
  its content.

- **D14 — Conversation threads: authored continuations to a conclusion.** (Amendment,
  2026-08-17 — David: NPC-driven continuation is the most important conversational
  surface and needs depth; requirements stated in session 13a3e0, design in
  `docs/work/adr-320-conversation/conversation-threads-design.md`.) A **thread** is an
  author-scripted conversation about one subject that the NPC carries forward beat by
  beat to a defined conclusion — across as many sittings as it takes.
  - **Construct**: `define conversation <key> for <name>[, <strength>]` — an `about`
    topic filter (topic-key grammar reused), an optional `opens when <condition>`
    (the NPC opens the thread himself when it holds and he can take the floor), 1..n
    ordered `beat:` rows (conversation-row bodies; `beat, when <condition>` holds
    position until true; a beat's `then asks` holds until its exchange closes), the
    transition rows `on parting:` / `on resuming:`, an `on refusing:` row for the
    blocking case, and a required `conclusion:` row.
  - **Advance**: one beat per turn the owner holds the floor while the thread is
    active (through the existing initiative/floor path — disposition, interruption,
    and decay unchanged), AND on a player continuation prompt ("tell me more" /
    "continue" / "go on" / "and?" — the frozen prompt list). Either side can move
    the conversation; neither must.
  - **Transitions** (a conversation may not happen in one flow): per pair, at most
    one ACTIVE thread; others are PARKED with their cursors held or CONCLUDED. An
    off-thread ask while a thread is active is governed by the active thread's
    strength — the frozen `passive`/`assertive`/`blocking` words: passive parks
    (rendering `on parting` if authored), assertive protests via `on parting` then
    parks, **blocking enforces single-topic completion** — the ask is refused back
    into the thread, serving the authored `on refusing:` row when present and
    re-serving the current beat otherwise. World acts remain exempt (D8).
  - **Conclusion is state**: the `conclusion` beat fires once; the thread stops
    claiming its topics; the predicate **`when <key> is concluded`** becomes true for
    rows, greetings, manner, goals, and endings; the thread's topics record as
    discussed.
  - **Persistence**: the per-pair cursor and status live beside conversation memory
    on the trait, ride save/restore, and survive scene closes — `on resuming` renders
    at the next engagement whether the gap was three turns, a day boundary, or a
    restore.
  - **Wire**: thread lifecycle joins the scene channel
    (`character.thread.opened/beat/parked/resumed/concluded`) and an active thread's
    continuability joins the affordance surface (D12, additive).
  - **Dispatch precedence extends D16's innermost-wins**: open exchange > active
    thread > parked-thread resume > topic table.
  - Deliberately not in v1: branching beat trees (conditions, exchanges, and deflects
    are the branching surface) and NPC↔NPC threads (D10's one-machinery discipline
    stands).

## Implementation

Packages that change (the ADR-310 idiom — named here, contracted at planning time):

- **`packages/chord`** — grammar, analyzer, and manifest slices for the new constructs:
  `define manner`, boundary blocks (`define greetings` or its final spelling), exchange
  blocks and row outcomes (`then asks`/`then invites`/`deflect to`/`leave`), act/event
  response rows, and the new predicate words (recency, absence, `was discussed`,
  `the subject changes`, repetition).
- **`packages/character`** — the scene runtime: the stranded lifecycle machinery wired
  live (D4), floor and interruption scoring (D7/D10), manner selection (D5), the
  conversation-memory state (visits, per-pair discussed topics, recency reads through
  the existing clock seam), and the compiled-story application seam extended to the
  new blocks.
- **`packages/world-model`** — persistence shape for scene/conversation-memory state
  (rides `CharacterModelTrait` versioning per ADR-310 D17 unless the contract work
  finds it needs its own home) and vocabulary modules for the new word slices.
- **`packages/stdlib`** — topic dispatch consults the scene (exchange overlay before
  table match), the D15 socket gains its first production registrant, SAY/TELL feed
  D11's witnessed player claims at the existing act-detection sites, open address
  enters dispatch.
- **`packages/engine`** — NPC↔NPC scene scheduling in the NPC turn phase (D10);
  scene events into the turn event stream.
- **`packages/story-loader`** — load-time instantiation of the new compiled blocks;
  evaluator coverage for the new predicate kinds.
- **`packages/platform-browser` / `packages/devkit`** — the D12 wire schema: scene
  event stream and exchange response affordances, carried as data under the channel
  discipline; testing-page consumption.
- **IDE testing surface** (`tools/ide/web/testing-surface`) — scene/affordance
  rendering in the explain panel and recording flows.
- **Deliberately untouched**: `parser-en-us` (ASK/TELL/SAY/YES/NO and topic-word
  parsing already exist; exchanges reinterpret meaning, not syntax — any new
  player-facing verb would be its own discussion) and `lang-en-us` (no platform
  player-facing text: every rendered word is authored, per ADR-310 D12).
  **Amended by D14 (2026-08-17)**: the parser carve-out narrows once — `parser-en-us`
  gains the continuation-prompt forms ("tell me more" / "continue" / "go on" /
  "and?") as thread-advance input, the discussion D14 is; everything else about the
  carve-out stands, and `lang-en-us` remains untouched.

**D14 amendment scope (2026-08-17)**: `chord` (the `define conversation` block, rows,
gates, `is concluded` predicate; version bump + pin), `world-model` (per-pair thread
cursor/status beside conversation memory; thread wire kinds), `character` (thread
runtime: activation, switch/park/resume, beat advance on the floor path, `opens when`
through initiative; the #273 seize-runner fix lands here), `story-loader`
(registration, beat serving through the D15 selector, evaluator, affordance
snapshot), `stdlib` (dispatch precedence, strength-governed transition enforcement),
`parser-en-us` (prompt forms, above), `engine` (mid-beat save/restore proof), and the
demonstration story reworked onto threads.

**TS-level contracts are the implementation plan's first deliverable**, before any
phase codes against them — the scene and conversation-memory state shapes, the wire
affordance schema, the socket registration signature, and the floor/interruption
scoring interface — the same discipline ADR-310/318 used. Concrete Chord grammar for
every construct is likewise implementation work: syntax sketches in this ADR are
illustrative, and every new vocabulary slice goes through the freeze review with
David before it ships as compatibility surface.

## Consequences

- The dialogue-selector socket (D15) stops being dormant surface: it is the seam this
  ADR's mechanism registers into.
- D4 makes the conversation scene an engine-visible construct: NPC↔NPC scenes need
  scheduling (goal pursuit is the natural driver), scenes must appear on the author
  channel and in transcripts (the D12/AC8 discipline), and scene state — participants,
  open exchange, visit/repetition counts — persists through save/restore like all
  character state (ADR-310 D17).
- The stranded ADR-142 lifecycle machinery graduates from dead code to the scene
  skeleton; its types become compatibility surface when the first story ships on them.
- ADR-142 (April 2026) is **SUPERSEDED by this ADR** (resolved from Open Question 10,
  interview of 2026-08-16): its principles live on in D3, its lifecycle implementation
  in D4; its pre-Chord mechanism sketches are replaced by D4–D13. Its Status line
  carries the supersession stamp.
- The testing surface inherits whatever state this layer adds, per the ADR-310 D12/AC8
  channel discipline: author-channel visibility, player-channel silence.
- A demonstration story precedes mechanism (the *City of Secrets* lesson, already
  applied once via thealderman): the player task is specified before the model is built.

## Acceptance

Each criterion is asserted on real dispatched/persisted state per the project's
mutation-signature bar, at the pinned seed, via the built bundle where a story is
involved.

1. **Scene lifecycle round trip.** TALK TO opens a scene whose boundary row is
   selected by first-time vs. return vs. absence words; exiting closes it; the
   per-pair visit/absence state advances and persists. Rejection leg: a boundary row
   conditioned on a state that doesn't hold never fires.
2. **Exchange overlay.** A `then asks` row opens an exchange; while open, its rows
   (verbal and act/event alike) win over the topic table (D16 innermost-wins); when
   it closes, the floor reverts. Rejection leg: input matching neither exchange rows
   nor table falls through to the existing default path — never a crash, never a
   silent swallow.
3. **Manner fallback.** A phrase with no state variant renders with the character's
   manner beat; a hand-written state-conditioned row renders untouched; beats never
   repeat back-to-back. Cost leg: a story with no manner blocks and no scene
   constructs compiles byte-identically to today (D2 — the ADR-318 AC8 discipline).
4. **Time words.** A row conditioned on recency fires only while fresh and stops
   firing after the runtime's aging; absence words at a boundary select the right
   greeting after short vs. long gaps; all time reads go through the one clock seam.
5. **Initiative by disposition.** The same occasion with the same authored rows
   produces different seize behavior for different personalities; a circumstance
   change (mood/band) flips the same character's behavior; an explicit authored row
   forces the moment regardless of disposition.
6. **Interruption.** An `assertive` scene yields to a motivated outsider after
   protest; a `blocking` scene does not — and a world act (D8's exemption) breaks
   even `blocking`.
7. **World-bounded exit; silence renders.** An NPC whose exit is physically
   impossible cannot leave the scene (rejection leg) but can answer with silence,
   which renders as a response, is manner-colored, and is witnessed by those present.
8. **NPC↔NPC scenes observable.** A goal-driven NPC↔NPC scene emits its text only
   when the PC can observe it; unobserved, its effects still land (facts move,
   ledgers record). PC intrusion produces participant reactions per their rows and
   manner.
9. **Player claims travel.** A player TELL lands as a claim in each hearer's ledger;
   it travels via propagation/NPC↔NPC scenes; a hearer holding contradicting
   knowledge exposes the contradiction to authored rows (asserted on ledger state,
   not on prose).
10. **Threading words.** `when <topic> was discussed` holds across separate scenes,
    in any order, and across save/restore; `when the subject changes` fires on
    thread abandonment and is available to manner, rows, and initiative occasions.
11. **Wire affordances and isolation.** An open exchange advertises its responses as
    structured wire data consumed by the testing surface; the player-facing build
    carries no scene internals beyond rendered prose (the ADR-310 D12/AC8 channel
    isolation, re-asserted for scene state).
12. **Mid-scene save/restore.** Save with a scene and exchange open, restore, and
    the continuation is byte-identical at the pinned seed — scene state rides
    ADR-310 D17.
13. **The demonstration story.** The theatre story (D13) plays end-to-end via
    `dist/cli/sharpee.js`, exercising every construct above; its player task is
    specified before mechanism work begins (Consequences).
14. **Conversation threads (D14).** A thread's beats advance on both paths (the
    owner's floor turns and the player's continuation prompts); a `blocking` thread
    refuses off-topic asks through its authored `on refusing:` row (current beat
    re-served when absent) until `conclusion` fires; `passive`/`assertive` threads
    park with their transition rows and resume — including across a scene close, a
    day boundary, and a save/restore — via `on resuming:`; `when <key> is concluded`
    is false before the conclusion beat and true after, asserted on persisted state;
    thread lifecycle and continuability ride the D12 wire. Rejection legs: an
    `opens when` thread never opens while its condition is false or the floor is
    denied; a concluded thread never re-claims its topics.

## Session

Direction stated by David, 2026-08-16, session 02073f, immediately after ADR-310/318
acceptance closed: research the conversational side the character features were built
for, starting from the merged prior art, as an ADR rather than a plan. Drafted same
session; no implementation authorized.

**D14 amendment**: 2026-08-17, session 13a3e0, during Phase 10 — the demonstration
story exposed that the continuation surface (ContinuationEntry) was types with no
authoring construct and no runtime consumer. Requirements stated by David; the five
design questions (block spelling, transition-row words, conclusion predicate,
blocking-refusal shape, advance paths) resolved by David the same session; design
record in `docs/work/adr-320-conversation/conversation-threads-design.md`.


## Amendment — D10a: the interruption rule as it will be built (2026-09-02)

**Context.** The W-10 dance prototype (`branch-stories/secret-letter/prototypes/w10-dance/`, session 6a3da1) showed that an NPC's `opens when` thread never opens while the player is in another NPC's scene: `ensureScene` (`packages/character/src/tick-phases.ts`) refuses when either party is seated elsewhere, and nothing outside dialogue dispatch closes a scene. D10's interruption is designed and unbuilt for that path (GH #348). The plan is `docs/work/adr-320-d10-interruption/plan.md`; the three rulings below are David's, 2026-09-02, and Phase 1 builds against them.

**D10a — three rulings.**

1. **An authored `opens when` is an interjection.** When an NPC's thread is ready to open toward the co-located player and the player is in another scene, the thread challenges that scene through the existing `resolveIntrusion` call (`scene-binding.ts`), `worldAct: false`, exactly as the player-address path already does. `passive` yields, `assertive` protests then yields, `blocking` holds — no new scoring.
2. **The grip is thread-aware.** The strength the challenge meets is the stronger of the scene's grip (`sceneGrip`: an open exchange's or the scene's authored strength) and the outgoing pair's ACTIVE thread strength — so a `blocking` thread holds, as D14's "single-topic completion" requires. Today `sceneGrip` ignores the thread; the same hole exists on the player-address path and closes with it. (Found by `plan-review`, 2026-09-02.)
3. **`on parting` renders on every park.** Every path that parks an ACTIVE thread renders its authored `on parting` — the new interruption close, world-act intrusion, player-address intrusion, movement exit, silence decay — through one shared step on the park-on-close path; the dispatch path's inline render (`runtime.ts`, the same-pair topic switch) is refactored onto it. David: "if we need to fix on parting, then we fix it." Before this, `on parting` rendered only on the same-pair switch; every other close parked silently.

**Ordering.** The thread floor turn reads the world after the story's own clocks under ADR-332 (ACCEPTED 2026-09-02): the scheduler runs before the actor phase, so a state an author changes in `when <timer> expires` is seen by the NPC's floor turn in the same turn.

**Contract delta.** No new state shape, no new wire kind — `interruption` and `thread-parked` exist in `scene-wire.ts`; the delta is a delivered messageId on the park-on-close path. `docs/work/archive/adr-320-conversation/contracts.md` §1.3 is amended by one line when Phase 1 lands.

**Session.** 2026-09-02, session 6a3da1 — Phase 0 of the plan above. Not implemented.
