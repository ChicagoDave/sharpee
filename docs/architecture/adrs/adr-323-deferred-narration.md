# ADR-323: Deferred narration — "say it later" as a prose-pipeline primitive

**Status**: **ACCEPTED** (2026-08-21, session 502b0b). Accepted as a **scoping** ADR:
it settles what the primitive is, where it lives, the ladder, the tension model, the
queue's unit, the horizon and the throughput cap. It does **not** specify the stage's
signature, the queue-entry shape, the IR field, or the test scenarios — those belong
to the implementing child, and `adr-review` correctly records them as open (7/18 at
acceptance, the two blockers fixed). Interview: five open questions resolved
2026-08-21, folded as D7-D11.

**Platform change, requires this ADR's acceptance before implementation** (project
rule). Expected packages: `packages/engine` (a new `prose-pipeline/stages/` stage
plus its wiring in `pipeline.ts`), `packages/chord` (parser/analyzer/IR for the
authored surface), `packages/world-model` (the `textState` capability the queue
persists through — see Consequences). No story changes; nothing here retires running
code.

**Date**: 2026-08-21 (session 502b0b)
**Depends on**: ADR-296 (turn narrative slots — the split this copies), ADR-174
(engine-internal prose pipeline), ADR-322 (state-space analysis — D5 below).
**Relates to**: ADR-320 D7 (conversation initiative), ADR-310 D8 (goal priority),
ADR-262 D3 (metering announce modes) — three mechanisms this is repeatedly mistaken
for, distinguished in Context.

---

## Context

Textfyre's I7 `Dramatic Priority` extension, read while scoping a Chord port of
*Jack Toresal and The Secret Letter*, holds a six-level importance ladder —
trivial, unimportant, interesting, important, essential, show-stopping — against a
running `current tension`. Each turn it collects the candidate atmospheric events
into one list, sorts them by priority, keeps what outranks the moment, drops the
trivia, and **pushes the important-but-losing ones onto a deferred queue that comes
back later.**

**Three quarters of that already exists here**, which is why the feature looks
built:

| Mechanism | What it does | Shape |
|---|---|---|
| ADR-296 narrative slots (`prose-pipeline/stages/sort.ts`) | Phrases render at declared frame boundaries; sources in occurrence order | *Placement* |
| ADR-320 D7 `define initiative` / `hold their tongue` | Forces or suppresses an NPC seizing the conversational floor | *Suppression*, per-entity, boolean |
| ADR-310 D8 `goal <name>, <priority>` | critical / high / medium / low | *A ladder* — for goal arbitration, not output |
| `prose-pipeline/stages/filter.ts` | Drops `system.*` and request-phase platform events | Categorical, not graded |

A ladder, suppression, and placement are all present. **What is absent is the
fourth part, and it does not reduce to the other three.** Every mechanism above
decides one item in isolation — this goal's priority, this entity's initiative,
this phrase's slot — and every one of them decides *now*: render, or do not.
Nothing in the platform can say **"not this turn, but soon."** `filter` drops,
`initiative` suppresses, `sort` reorders. None of them defers.

**The origin is suspect; the problem is not.** Dramatic Priority existed to serve
an invariant that no longer applies — Textfyre wrote for a non-IF middle-school
audience, and burying a plot beat under atmosphere was fatal for readers who would
not dig for it. That audience constraint is gone. But Fernhill's
`on every turn while one chance in 6` mutterings are the same noise class, and the
collision between an atmospheric daemon and a dramatic beat is not
audience-specific. The mechanism generalizes even though its original
justification does not.

Measured against the story rather than inherited from another document:
`branch-stories/fernhill/fernhill.story` carries **three** such daemons — `one chance
in 12` (line 18), `one chance in 6` (line 29), and `one chance in 8` while ticking
(line 780). The motivating collision is not hypothetical in the pilot corpus.

---

## Decision

**D1 — The primitive is deferral, and the feature is named for it.** Not "dramatic
priority." The ladder is the portable-looking half and the least valuable; naming
the feature after it would invite porting six levels nobody here has justified, and
would hide the one capability the platform lacks behind one it already has three of.

**D2 — Chord declares; the engine arbitrates.** The authored surface names what may
be deferred and how urgent it is; the prose pipeline decides, per turn, what that
means. **This is ADR-296's split, reused, not a new architectural shape** —
`_narrativeSlot` is authored and realized in the pipeline, and deferral takes the
same path. A second instance is what makes it a pattern.

**D3 — A new prose-pipeline stage, between `filter` and `sort`.** The order is
load-bearing and is a decision, not an implementation detail:

| Stage | Question it answers |
|---|---|
| `filter` | Is this narratable at all? |
| **new** | Is it narratable **this turn**? |
| `sort` | Where in the turn does it go? |

Deferral must precede placement, because a deferred phrase has no slot in the turn
it was deferred from. Running it after `sort` would mean placing phrases that then
vanish, and slot arithmetic computed against a set that changes underneath it.

**D4 — Deferral is bounded, and every deferred emission resolves.** It lands within
a stated horizon or it expires. (D9 fixes the unit as the declared *source*; D10
fixes the horizon.) **No unbounded queue.** Two reasons and they are
independent: an unbounded queue is a leak, and a line that surfaces forty turns
after its cause is not deferred, it is non-sequitur. Expiry is a normal outcome,
not an error.

**D5 — The deferral queue must be shown to leave the state-space signature, not
assumed to.** ADR-322's working document (`docs/proposals/state-space-analysis.md`
§9, Tractability) derives the signature from what conditions actually read,
and a pending-narration queue is per-turn state nothing branches on — so it *should*
project out. "Should" is how a sweep becomes intractable. Whoever implements this
runs the check against Fernhill and records the states-per-depth and dedup ratio
with and without the queue. This is cheap now and expensive after ADR-322's
children ship.

**D6 — The six-level ladder is not ported.** Textfyre's levels were calibrated to a
design invariant this project does not share. What transfers is the mechanism, not
the calibration. Levels are added when a real story demonstrates two events that
need distinguishing and cannot be — the same evidentiary bar ADR-322 D5 sets for
syntax.

**D7 — Tension is an authored per-turn ratchet, not a persistent global.** It
begins each turn at the floor, the story raises it as events occur, it never falls
within a turn, and it resets when the turn ends.

Author-first: the story decides what a moment carries. It is *not* derived from
scene, timer or initiative state — a derivation gives the author no lever when it
guesses wrong, and would couple the pipeline to story semantics, muddying D2's
split.

**The reset is what makes an authored value safe.** The obvious alternative — a
persistent global with `set tension to <level>` — fails the moment an author raises
it for a scene and forgets to lower it, after which deferred material never returns
and nothing says so; that is the rot class ADR-322 D4 banned for suppression-only
annotations. A second alternative was considered and rejected: declaring tension
lexically on a set piece, restored on exit. It solves the same problem but requires
a scope concept Chord does not have, where the ratchet requires none. **Structure,
not discipline, either way — the ratchet is just the cheaper structure.** Ported
from Textfyre's mechanism, which resets `current tension` to its floor in the same
every-turn rule that consumes it.

**Within-turn arbitration is retained alongside it, not replaced.** The ratcheted
tension sets the bar a phrase must clear; arbitration across the turn's candidate
set decides among the phrases that clear it. Two mechanisms, complementary — the
first answers *"how loud is this moment?"*, the second *"is something else louder
right now?"* — and neither subsumes the other.

**D8 — Three levels, named for what they do: drop, defer, always.** One scale,
used twice: it grades a phrase's importance and expresses the ratcheted bar.

The count is empirical rather than aesthetic. Textfyre's six levels collapse to
three behavioral roles in its own arbitration rule — at-most-`interesting` is
removed when it loses, `important` through `essential` is deferred,
`show-stopping` clamps the bar so it does not block everything behind it — and its
documentation states the same three: *"to allow the important events to stand out,
the interesting ones to survive, and the trivial ones to die: as quietly and
unremarkably as if they had never considered happening at all."* Six labels, three
outcomes. D6 refuses the labels; D8 takes the outcomes.

The **words** are not decided here — `drop`/`defer`/`always` name the roles, not the
authored vocabulary. Syntax stays last, per D6 and ADR-322 D5.

**Precedence against D11, stated because the two levels collide otherwise:** the cap
wins. `always` means **never dropped and first in line**, not *rendered this instant*.
Two `always` sources in one turn narrate one and defer the other; it lands next turn.
Nothing is lost, because deferral is what catches it — and D11's guarantee stays
absolute, which it would not if any level could bypass it. Textfyre resolves it the
same way: its cap is unconditional, and its top level clamps the *bar* so a
show-stopper cannot starve everything behind it, never the cap.

**D9 — Deferral attaches to the declared source, not to individual phrases.** The
emitter carries the level; when it loses the turn, its emission defers as a unit.

**The queue is therefore a set of declared sources, bounded by a compile-time
constant** — and that bound is the point. A queue whose size is fixed by the source
text is trivially shown to leave the state-space signature; a per-phrase queue grows
with emissions and is precisely the per-turn state that inflates a sweep for reasons
no condition ever branches on. **D9 makes D5's check a formality; the alternative
makes it a real risk.**

Textfyre does the same thing and deliberately: its dramatic events are declared
objects, and its deferral line reads `add x to the deferred dramatic possibilities,
if absent` — the dedupe makes the queue a set of distinct declared events rather
than a log of pending texts.

**D10 — Expiry is a platform constant now, and an authored value only when a story
demonstrates the need.** The horizon is not about memory — D9 already bounds the
queue by the declared-source count. It exists to prevent two other failures:
**starvation**, where a story that stays tense never lets deferred material land,
and **non-sequitur**, where it lands so late its cause is forgotten.

Not a port: **Textfyre has no horizon.** Its every-turn rule tips the deferred set
straight back into the candidate pool (`add the deferred dramatic possibilities to
the dramatic possibilities`), so an event competes forever until it wins. The bound
is this project's addition.

Per-declaration patience is the obvious upgrade — D9 already gives each source a
declaration carrying its level, so the marginal authored surface is one word — but
it is the anticipatory vocabulary D6 and ADR-322 D5 both refuse until a story shows
two sources that genuinely need different patience. **The upgrade costs nothing to
defer**, because an optional authored value falls back to the platform default, so
adopting it later invalidates nothing written against the constant.

**D11 — At most one deferrable source narrates per turn.** The winner is the top of
a reverse-priority sort with a random shuffle applied first, so ties break fairly
rather than by declaration order. Everything else drops or defers per D8.

**The cap governs the deferrable pool only.** Under D9 only declared sources enter
this arbitration; action output, room descriptions and ordinary phrases never do.
"At most one" means one atmospheric source per turn, not one line per turn.

**The cap, not the ladder, is what fixes the motivating case.** The obvious
alternative — everything at or above the bar renders — fails exactly where the
feature is needed. D7's ratchet starts each turn at the floor and rises only when
something happens, so on a *quiet* turn the bar stays low and everything clears it;
and a quiet turn is precisely when every idle daemon has room to fire. Textfyre's
own documented failure is a `WAIT` turn carrying four stacked atmospheric lines, and
against a floor-level bar all four clear and all four print. **The ladder decides
which one survives; the cap is what makes it one.**

---

## Non-goals

- **Not a priority system for goals or actions.** ADR-310 D8 owns goal arbitration.
- **Not conversation initiative.** ADR-320 D7 owns who takes the floor. A held
  tongue is a decision not to speak; a deferred phrase is a decision to speak later.
- **Not a replacement for `filter`.** Categorical drops stay categorical — a
  `system.*` event is not low-priority, it is not narration.
- **Not pacing analysis.** This changes what a turn says. It measures nothing.

---

## Consequences

**ADR-296's split becomes a pattern.** One instance is a design; two is a
convention. Anything later that wants authored control over pipeline behavior
should be read against these two before inventing a third shape.

**The prose pipeline already holds persistent state, and the queue belongs in it.**
An earlier draft of this ADR claimed the pipeline had never held cross-turn state and
offered that as the strongest argument against building the feature. That was wrong,
and checking it dissolved the objection: `prose-pipeline/pipeline.ts:203-205`
constructs a `WorldTextStateStore`, documented as a *"persistent text-state store
backed by the world's `textState` capability — survives save/restore, unlike the
turn-scoped seams"* (ADR-192 W2, ADR-196).

So the deferral queue is not a new kind of state, and it has an existing home with an
existing save/restore story. **It goes in `textState`** — which is also what makes the
queue survive a save, so a story saved with material pending restores with it pending
rather than silently losing it.

**Fernhill is the first test case**, not Secret Letter. Its
`one chance in 6` mutterings are the noise class this exists for, and it is the
story already used as the pilot corpus everywhere else in this line of work.

**It interacts with ADR-322 in both directions.** D5 guards the sweep against the
queue; the sweep, once it exists, is also how anyone would find out that a deferred
phrase can be starved forever by a story that stays tense.

---

## Acceptance

- **AC-1** — Every deferred source lands or expires within a stated horizon (D4,
  D10). A queue that can hold a source indefinitely fails, regardless of whether any
  story triggers it.
- **AC-2** — The deferral stage runs before placement (D3). Checkable by pipeline
  order.
- **AC-3** — D5's signature check is run against Fernhill and its numbers recorded
  before the feature is merged. Absence of the numbers is a failure, not a pending
  item.
- **AC-6** — At most one deferrable source narrates per turn (D11), and tie-breaking
  is randomized rather than declaration-ordered. A turn that prints two atmospheric
  sources fails, including two at `always` (D8 precedence).
- **AC-7** — A story saved with sources pending restores with them pending. The queue
  lives in the world's `textState`; a queue that empties across save/restore fails.
- **AC-4** — Exactly three levels ship (D8), and no fourth exists without a story
  demonstrating a distinction the three cannot express (D6).
- **AC-5** — Nothing in this feature drops a source silently. Expiry is
  observable — a source that expires is reportable, or the queue is a place output
  goes to die.

---

---

## Session

Session 502b0b, 2026-08-21, branch `feat/adr-321-world-index`. Scoped at David's
direction out of a discussion of whether the feature was already implemented —
which it three-quarters is, and the Context table exists because that question will
be asked again. Arose from reading Textfyre's I7 extensions while scoping a Chord
port of *Jack Toresal and The Secret Letter*, whose conversation David has decided
to rebuild natively rather than port.
