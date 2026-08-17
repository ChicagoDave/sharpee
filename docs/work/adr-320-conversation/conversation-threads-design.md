# Conversation Threads — ADR-320 amendment design (draft for discussion)

**Status**: RESOLVED — the five design questions answered by David
(2026-08-17, session 13a3e0); folded into ADR-320 as **D14** (with AC14
and the amendment scope) the same session. This doc is the design
record and the vocabulary-freeze worksheet for the implementation
phases.
**Written**: 2026-08-17, session 13a3e0, during Phase 10 — the
demonstration story exposed the gap.
**Requirement source**: David, 2026-08-17, three statements:
1. "being able to script conversations where the NPC continues or opens
   a conversation"
2. "continuations are the most important and need depth... the author
   has to be able to create 1..n beats where n is a clear conclusion to
   the topic of conversation"
3. "a conversation may or may not happen in one flow... and alternate
   topics may switch conversations and the author has to be able to
   manage those transitions or enforce single topic completion"

## 1. The gap, precisely

The shipped ADR-320 surface covers scenes (boundaries, floor,
interruption, decay), exchange points (one question, gripped answers),
manner, time words, threading predicates, and initiative occasions.
What has no authoring surface is the **thread**: an author-scripted
conversation about one subject that the NPC carries forward beat by
beat to a defined conclusion, across as many sittings as it takes.

The skeleton anticipated it — `ContinuationEntry` and
`ConversationContext.continuations` (lifecycle.ts) — but these are
exported types with no Chord authoring surface and no runtime consumer
(verified 2026-08-17: type exports only). Related seams found during
Phase 10:

- **#273**: initiative-row `then asks` (the NPC opening a question
  unprompted) is grammar-legal but wedges the engine on the tick-side
  seize path. The thread construct is its sanctioned home.
- **Goal `say X to the player` opens no scene** — Phase 8's goal-say
  scene-opening is modeled-NPC-target only, so "seek the player and
  start talking" produces a line with no conversation state.
- **#275**: subject-change occasions never fire for player-dialogue
  scenes (clock off-by-one) — the transition moments threads need are
  currently only half-alive.

## 2. The construct (sketch for the freeze discussion)

```
define conversation the-defection for Will Kemp, blocking
  about "the rose", "the admirals men", "leaving the company"
  opens when the grievance was discussed and it is in the Tavern
  beat:
    phrase kemp-looks-south
  beat:
    phrase kemp-names-henslowe
    then asks the-offer
  beat, when Will Kemp is sworn:
    phrase kemp-plans-the-jig
  on parting:
    phrase kemp-holds-the-thought
  on resuming:
    phrase kemp-as-i-was-saying
  on refusing:
    phrase kemp-answer-me-first
  conclusion:
    phrase kemp-settles-it
end conversation
```

Row-by-row:

- **Header** — `define conversation <key> for <name>[, <strength>]`.
  The comma-modifier strength reuses the frozen
  `passive`/`assertive`/`blocking` words (Phase 4 freeze §4). Unset:
  runtime derives from continuation intent, as exchanges do.
- **`about <topic-keys>`** — the thread's topic filter, the same
  topic-key grammar as topic rows (quoted tier + entity tier). An ask
  matching the filter engages/resumes this thread. A thread's filter
  and the owner's plain topic rows may overlap; the thread wins while
  unconcluded (innermost-wins extends: exchange > thread > table).
- **`opens when <condition>`** — optional NPC-opened entry: when the
  condition holds and the owner can take the floor (disposition and
  interruption rules unchanged), the NPC opens the thread himself —
  scene opened if none, first beat spoken. Without `opens when`, the
  thread engages only via its topic filter.
- **`beat:`** — 1..n ordered beats. One beat per conversational turn
  the owner holds the floor while the thread is active. A beat body is
  a conversation-row body (phrases, mutations, `then asks`, `deflect
  to`, `leave`); a beat with `then asks` holds until its exchange
  closes. `beat, when <condition>` holds position until true — the
  thread waits for the world.
- **`on parting:` / `on resuming:`** — the transition rows (David's
  requirement 3): what the owner says when the thread parks
  unconcluded (subject switched away, scene closed, player left) and
  what he says when it re-engages. Spelling candidates for the freeze:
  `on parting`/`on resuming` vs `on leaving`/`on return` (the greetings
  words — overloading them here may confuse; parting/resuming are
  thread-specific).
- **`conclusion:`** — beat n, required. Fires once; the thread is then
  CONCLUDED: it stops claiming its topics (asks fall through to the
  table), its cursor is terminal, and the predicate below becomes true.

## 3. Semantics

**Activation and switching.** Per owner-pair, at most one ACTIVE
thread; others are PARKED (cursor held) or CONCLUDED. An ask matching a
parked thread's filter is a resume; an ask matching another thread's
filter (or a plain table topic) while a thread is active is a
transition, governed by the ACTIVE thread's strength:

| Active thread strength | Off-thread ask |
|---|---|
| `passive` | parks silently-by-default (`on parting` row renders if authored); the other topic serves |
| `assertive` | `on parting` row renders as protest, then parks and the other topic serves — one authored beat of resistance, not a wall |
| `blocking` | the ask is refused back into the thread: the authored `on refusing:` row serves when present, the current beat re-serves otherwise (David: "authored first, repeat second") — single-topic completion enforced until `conclusion` fires or the player physically breaks the scene (world acts stay exempt, D8) |

**Beat advance — both paths (David: "either").** The owner advances
one beat per turn he holds the floor while the thread is active —
through the existing open-floor initiative path, so authored initiative
rows, disposition, silence decay, and interruption all still apply.
The player advances it with a **continuation prompt** — the frozen
list "tell me more" / "continue" / "go on" / "and?" — a small
`parser-en-us` addition (the one narrowing of ADR-320's parser
carve-out, recorded in the amendment). A held beat (unmet `when`, or
open exchange) does not advance on either path.

**Persistence ("may or may not happen in one flow").** The thread
cursor, per owner-pair, lives beside conversation memory on the trait
(schema bump), rides `WorldModel.toJSON`, and restores mid-beat —
exactly the manner-rotation/scene-store discipline. Scene close does
NOT reset it; `on resuming` renders at the next engagement whether
that's the same scene, the next day, or after a restore.

**Conclusion as state.** `conclusion` marks the thread concluded in
the pair's conversation memory and records its topics discussed. New
predicate for the freeze: **`when the-defection is concluded`**
(candidates: `is concluded` / `was concluded` / `is settled`) —
readable by any row, greeting, manner condition, goal `active when`,
and ending logic. This is the "n is a clear conclusion" contract:
conclusion is queryable world truth, not just a last line.

**Wire (D12).** Thread lifecycle joins the scene channel
(`character.thread.opened/beat/parked/resumed/concluded`), and an
active thread's next-beat presence joins the affordance surface so
tooling and chat clients can show "Kemp has more to say." Additive to
the Phase 9 schema.

## 4. What it deliberately does not do

- **No branching trees.** Beats are a single authored spine; branching
  stays where it lives today (conditions on beats/rows, exchanges for
  question-points, deflects). If real branching is wanted later it is
  its own amendment.
- **No new interruption physics** — strengths reuse the shipped grip
  machinery; world acts still break anything.
- **No NPC↔NPC threads in v1** — threads are owner↔player. NPC↔NPC
  scenes remain propagation-made-visible (D10). Revisit only with a
  concrete story need.

## 5. Implementation scope (post-confirmation)

1. **Amendment + freeze**: ADR-320 amendment text; vocabulary freeze on
   `define conversation`, `beat`, `conclusion`, `on parting`/`on
   resuming`, `opens when`, `is concluded` (this doc is the freeze
   worksheet).
2. **chord**: grammar/AST/IR/analyzer (block, rows, gates: at least one
   beat + exactly one conclusion, filter/strength reuse, cross-owner
   `then asks` rules); language version bump + pin.
3. **world-model**: thread state shape (cursor, status, per-pair) on
   the character trait + scene-wire additions.
4. **character**: thread runtime — activation/switch/park/resume/
   conclude; beat advance in the open-floor path; `opens when` through
   the initiative/floor machinery; #273's seize-runner fix lands here
   (an ask-beat opening its exchange in a player scene instead of
   throwing).
5. **story-loader**: registration, serving beats through the D15
   selector, predicate evaluator (`is concluded`), affordance snapshot.
6. **stdlib**: dispatch precedence (exchange > active thread > parked-
   thread resume > topic table), transition enforcement by strength.
7. **engine**: save/restore proof for mid-beat threads (real-path).
8. **Story**: rework The Ides of March onto threads — Kemp's defection
   as an NPC-opened, blocking-completion thread; Shakespeare's
   suspicion as a passive thread parked and resumed across all three
   days — plus transcripts for every transition row and the
   enforcement matrix.

## 6. Design questions — RESOLVED (David, 2026-08-17)

1. Block spelling: **`define conversation`**.
2. Transition-row words: **`on parting` / `on resuming`**.
3. Conclusion predicate: **`is concluded`**.
4. Blocking refusal: **authored `on refusing:` row first, re-serve the
   current beat when absent** ("authored first, repeat second").
5. Beat advance: **both paths** — the NPC's own floor turns AND player
   continuation prompts ("tell me more" / "continue" / "go on" /
   "and?").

## 7. Freeze list — FROZEN (David, 2026-08-17: "frozen go")

Author-facing words this design adds — each is compatibility surface
the moment the first story ships on it:

- Block: `define conversation <key> for <name>[, <strength>]`
  (strengths reuse the frozen `passive`/`assertive`/`blocking`).
- Rows: `about <topic-keys>`, `opens when <condition>`, `beat:` /
  `beat, when <condition>:`, `on parting:`, `on resuming:`,
  `on refusing:`, `conclusion:`.
- Predicate: `when <key> is concluded`.
- Player continuation prompts (parser-en-us): "tell me more",
  "continue", "go on", "and?".
