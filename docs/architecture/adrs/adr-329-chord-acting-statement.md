# ADR-329: The Chord acting statement — `<actor> <verb> <object>`

**Status**: **ACCEPTED** (David, 2026-08-29, session aeade8 — "accepted"). Written
2026-08-28 as ADR-328 D7's child ADR — the Chord surface for a character *performing* a
standard action from story text. All four open questions were resolved through the
rule-11a interview 2026-08-28/29 (verb inflection free, D1; refusals narrate as the
pipeline does, D5; `the player` excluded as actor, D1; the goal-step lowering lands here,
D6); `adr-review` 19/19 after two folds (the engine's entry is private to its actor phase —
one public method is a named surface; ADR-328 Acceptance item 2 stamped). Acceptance
authorizes no implementation by itself: Phase 9 of
`docs/work/adr-328-actors-platform-concept/plan.md` re-plans from this ADR.

**Language + platform change.** Expected surfaces: `packages/chord/src/parser.ts` (one new
statement production, beside `move`), `packages/chord/src/analyzer.ts` (verb-to-action
matching against the manifest's grammar shapes; the body gates of D3), `packages/chord/src/ir.ts`
(one statement kind), `packages/story-loader/src/runtime.ts` (the statement executor, calling
the engine's execution entry; nested-act event splicing at `fireAfterClauses`),
`packages/character/src/tick-phases.ts` (goal-step execution lowers onto the same entry — D6),
**two more at landing** (`packages/event-processor/src/processor.ts` and `packages/engine/src/command-executor.ts` — failed reactions surface as `command.failed`; `packages/story-loader/src/loader.ts` pass 2 — every entity's `carries`/`wears` placed; see the D5 landing note), and **one engine line**: `packages/engine/src/game-engine.ts` exposes the execution entry
it already builds for its actor phase (`game-engine.ts:372-380`, read 2026-08-29 — a closure
over `CommandExecutor.executeAsActor` handed only to `ActorTurnPlugin`; no public surface
today) as a public method the loader receives at `onEngineReady`, the seam it already uses
for `getNpcService()` and `getRandomService()`. **No stdlib or world-model change**: the
executor's entry (ADR-328 D2, landed Phase 3), the actor-matched heads (ADR-327 D7, landed
Phase 4), witnessing (ADR-328 D3) and actor voice (D4) all exist. Paper trail: EBNF row,
`chord-grammar-changes.md`, ADR-257 minor bump.

**Date**: 2026-08-28 (session aeade8)
**Parent**: [ADR-328](adr-328-actors-are-a-platform-concept.md) D7 — *"a child ADR designs
the syntax alongside the platform phases, so language and runtime land together rather than
the substrate shipping doorless"*; the lessons-learned method it prescribes is applied below.
**Related**: [ADR-327](adr-327-explicit-references.md) (heads name their actor; D7 fires named
actors on ADR-328's path — the statement is the *cause* those heads were waiting for; D1's
"`the player` is the role" reading carries over), [ADR-325](adr-325-chord-presence-and-duration.md)
(`move` is authorial teleportation and stays so — D7 here), [ADR-326](adr-326-adjacent-room-place-expression.md)
(rides `move`, untouched), [ADR-310](adr-310-character-model-in-chord.md) D8 (goal steps —
the plan-shaped acting vocabulary Chord already has, D6 here), [ADR-318](adr-318-normative-character-layer.md)
(the arbiter whose chosen act becomes a pipeline invocation, per ADR-328 D5),
[ADR-276](adr-276-chord-source-authoritative-errors.md) (the stdlib manifest the analyzer
matches against), ADR-270 (story-defined actions the verb may name), ADR-257 (language
version), `docs/architecture/chord-lessons-learned-timers.md` (lessons 2, 7, 8, 10).

## Context

ADR-328 built the door and ADR-327 put the names on it. Anyone who acts runs the same
four-phase action with their own actor id (`executeAsActor`, `command-executor.ts:359`);
`on the guards taking` fires when the guards take and `on the player taking` does not
(`adr-327-ac2-execution-entry.test.ts`); the player witnesses a non-player act in the third
person from the same room and sees nothing from another (ADR-328 Acceptance item 2, satisfied
2026-08-28). A TypeScript behavior walks through that door with `context.act(IFActions.TAKING,
{ directObject })` (`stdlib/src/npc/types.ts`). **A Chord story cannot say it at all.**

What Chord has where a character "does" something is authorial mutation, by design:
`move the necklace to the player` in the monkey's `on the player giving` clause
(`branch-stories/secret-letter/monkey.chord:102`) puts the necklace in Jack's hands; it is
not the monkey giving. `move` is teleportation (ADR-325), and ADR-328 D1 kept it that way:
*"Authorial mutation remains what it is — this ADR governs acting, not teleportation."* The
port's next beats want the other verb: Teisha handing over the dress and hat on the TE20
trade (`change-document.md`, "The escape disguise"), the mercenaries taking a sword back
(ADR-328 D7's own example). Each is a character performing `giving` or `taking` — refusable
by a trait, witnessed, narrated in the actor's voice — and none is a `move`.

One place in Chord already lets a character act, and it acts off the pipeline. ADR-310 D8's
goal steps — `acquire`, `give`, `drop`, `move to` — compile to the character package's
plan runner, whose `applyStepMutation` (`character/src/tick-phases.ts:862-875`) executes
them as bare `world.moveEntity` calls: no validate, no interceptor, no witnessing. That is
the shadow-system shape ADR-328 D1 retired for `NpcService`, still alive one package over;
ADR-328 D5 says where it goes (*"the character layer's output is the pipeline"*) and its
impact analysis §B4 names the seam. This ADR is where the language half and that runtime
half meet.

## The block first

Lesson 10: *write the story block you want, with no platform in mind, then list what it
needs.* The block is the AC-2 fixture's Chord — a yard, guards, a sword, Alex as the player
— extended by two lines. **The two lines marked `## NEW` are the only syntax in this block
that does not compile today.**

```chord
create the Yard
  a room

  A yard.

  after the player entering
    the guards take the sword           ## NEW — the guards act, now, as themselves
  end after

create the guards
  a person, plural
  in the Yard

  Guards.

create the sword
  in the Yard

  A sword.

  after the guards taking
    phrase they-take                    ## the head ADR-327 built fires from the statement
  end after

create Alex
  a person
  playable
  starts in the Yard

  You.
```

Read in play: Alex walks into the Yard; the room's reaction has the guards take the sword.
The sword is in the guards' hands, `after the guards taking` prints its "They take it.",
and Alex — in the room — witnesses the take in the third person. From the next room she
witnesses nothing, and the sword is still gone. The fixture's other variant puts `on the
guards taking / refuse not-theirs` on the sword instead: then the statement's act is
consulted exactly as Alex's would be, refused, and the sword stays in the Yard.

The same word position, on the corpus that motivates it (no story change is proposed here —
the content is David's; these show the shape, not a ruling):

```chord
  ## monkey.chord:100-105 as it is — authorial: the necklace is put in Jack's hands
  on the player giving
    move the necklace to the player when the monkey has the banana

  ## the shape this ADR makes available — the monkey gives it
  after the player giving
    the monkey gives the necklace to the player when the monkey has the banana   ## NEW
```

**What the block needs** (the list lesson 10 asks for):

1. A statement whose subject is a named character and whose verb is an action — the one
   new form. Its actor position is the word ADR-327 already put at the head of every
   clause; its verb is the word the manifest's grammar shapes already carry (`take :item`,
   `give :item to :recipient` — `stdlib-manifest.ts:147,176`, read 2026-08-28). Nothing in
   it is a new concept.
2. The verb resolved to an action id at compile time — the analyzer already matches
   gerunds against the manifest for heads (ADR-327 D3; `parser.ts:4936` reads the head's
   action word, read 2026-08-28).
3. The loader calling the execution entry as that actor — the entry exists
   (`CommandExecutor.executeAsActor`, `command-executor.ts:359`, read 2026-08-28; real path
   `packages/engine/tests/execute-as-actor.test.ts`), but the engine hands it only to its
   own actor phase (`game-engine.ts:372-380`, read 2026-08-29) — **one public engine method
   is the whole platform cost.**
4. The act's events joining the turn's output in the right place when the statement runs
   inside another action — **new, loader-side**, and the one genuinely new mechanism.
5. Heads, refusals, witnessing, and voice for the acting actor — all landed under ADR-327/328
   (`adr-327-ac2-execution-entry.test.ts`, read 2026-08-28; ADR-328 Acceptance item 2,
   stamped satisfied 2026-08-29).

Five items; three already exist, one is a method that exposes what exists, and the fifth is
a splice. By lesson 10's own test the block is right and the change is small.

## Decision

### D1. The statement: `<actor> <verb> [<object>] [<preposition> <object>] [when <condition>]`

A statement whose first word is a character's name (or `the player`) and whose verb is an
action performs **that action, now, as that character, through the execution entry** —
one four-phase action with the named actor: the same validate, the same interceptors and
capability dispatch, the same events, the same witnessing and voice as anything the player
does. It is not a plan: it seeks nothing, walks nowhere, and retries never. If the guards
are not where the sword is, `the guards take the sword` is refused by `taking`'s scope like
any out-of-reach take, and that is the answer.

```chord
the guards take the sword
the monkey gives the necklace to the player
Teisha drops the measuring cord
the wandering mercenaries go east
```

- **The actor is any `a person` entity other than the player.** `the player` — the role
  (ADR-327 D1), and therefore whichever character currently holds it — is the analyzer
  error `analysis.act-player-actor` (Q-3 resolved 2026-08-29, David: option b). A forced
  player action would hand the language a second, worse spelling for the eject scene
  ADR-326 settled as a `move` effect on ADR-295's invariant (*"never a post-report retcon
  of a movement command"*): `the player goes east` in an `after the player entering` clause
  re-runs `going` as the player, narrates a second arrival, and re-fires the next room's
  entering clause. Behind that it breaks the invariant transcripts, tree documents, ADR-129
  scoring, and the timer clauses all assume — one typed command, one player action per
  turn — and reads in the second person as a choice the player never made. A forced player
  action is its own ADR if a story ever needs one, with the turn-structure question
  answered on purpose.
- **Slots are names**, resolved as every other name in a statement body is (ADR-327 D2's
  explicit-reference posture; no `it`). A direction word fills `going`'s slot.
- **`when <condition>`** is the statement-final suffix every mutation statement carries.
- **The verb is written in whichever inflection reads right** — `the mercenaries take the
  sword`, `Teisha gives the dress to the player` — and the analyzer matches on the lemma;
  number agreement is never checked (Q-1 resolved 2026-08-28, David: option a). Agreement
  is a fact about the name, not the statement; this is one verb in two English forms, not
  two spellings of one word, so ADR-326 D1's single-spelling posture for a *place* does not
  bind here.

### D2. The verb is matched, not guessed

The verb and its slot shape are matched against the grammar shapes the analyzer already
holds — `STDLIB_MANIFEST.locales['en-US'].grammarShapes` for the standard actions (`give
:item to :recipient`, `hand :recipient :item` … any registered shape of the action) and the
story's own registered shapes for its dispatch and extended actions (ADR-270/215 surfaces).
A verb that matches no shape, or matches with the wrong number of slots, is the analyzer
error `analysis.act-unknown-verb` / `analysis.act-slot-shape`, whose fix-it lists the shapes
that would have matched. Matching is on the verb's lemma (D1): `take` and `takes` both match
`take :item`. This is ADR-327 D3's posture (*"the gerund is matched, not
guessed"*) applied to the base form: the language never invents an action.

### D3. Where the statement is legal — reactions act; interceptors decide

Legal in every body that runs *after* something has happened or *on* the turn's own clock:
`after` bodies, `when` bodies (timer expiry, `becomes`, `the player moves`), `on every
turn`, and conversation rows (a Teisha row that hands over the dress is an act, ADR-320's
rows being where the port's TE20 lives). **Not legal** in an `on` intercept body, in a
`refuse when`/`must` position, or in `before the game starts`: an interceptor is deciding
whether the triggering action happens and has no business performing another; nothing acts
before turn one. Both are the analyzer error `analysis.act-in-intercept` with the fix-it
"move this line to an `after` clause". The existing EBNF already gates statements per body
(`refuse` is "not in `after` bodies"); this is the mirror gate.

### D4. Execution and ordering: run to completion, splice after the trigger

The loader performs the act at the moment the statement runs, through the engine's
public execution entry (the method named in the surfaces above — the same
`(actorId, actionId, slots) → ActResult` shape stdlib's `ExecutionEntry` type already
declares, `stdlib/src/npc/types.ts`, with `success` already folding `refused`), and it
runs to completion before the next statement.

- **Turn-phase sites** (timers, `on every turn`, `becomes`) run the act directly; its events
  are the turn's events, in the order acted — the same posture as an NPC behavior's
  `context.act`.
- **Inside a running action** (`after` bodies, conversation rows) the act **nests**: the
  triggering action is already in its report phase (`fireAfterClauses` runs there,
  `runtime.ts:3583`), so the nested act's `TurnResult.events` are spliced into the outer
  turn's stream immediately after the triggering action's own report, where the clause's
  phrases already go. The player therefore reads *You enter the Yard. … The guards take the
  sword.* in that order, never the reverse.
- **Heads fire for the acting actor** (ADR-327 D7): the sword's `after the guards taking`
  fires from the statement exactly as from a behavior's `act`.
- **Re-entry is bounded.** An act whose own reactions act again nests at most **8** deep,
  after which the loader performs no further act and raises the runtime diagnostic
  `runtime.act-reentry`, naming the chain — ADR-327 D5's cap, same number, same posture;
  a ceiling no story should approach, not a tuning knob.

### D5. A refused act performs nothing, and says what the pipeline says

When the action's validate refuses, the world is unchanged and the statement is over; no
retry, no fallback. **The refusal narrates exactly as any witnessed refusal would** — the
action's own message, in the third person via ADR-328 D4, only where the player is present
to witness it (D3): *The guards can't reach that.* No special case, nothing to document
(Q-2 resolved 2026-08-28, David: option a — *"this is something that is likely to
evolve"*; a generic attempt line such as *The guards try to take the sword and fail*, or a
silent default, are both open to a later ADR once the corpus shows what it wants). The
author who wants a different outcome guards the statement (`when`, or the clause's
`while`) — lesson 2: guards belong at the event that changes the situation, not inside the
act. Note the one asymmetry this leaves: a TypeScript behavior's `context.act` is silent on
refusal; the statement is not.

*(Landed — execution half, 2026-08-29, session aeade8, Phase 9b. D4's "splice" is
delivered, not spliced: a nested act's events are applied inside the entry, and an action's
or a chain handler's return is applied again by `EventProcessor` (`runPhases` →
`processEvents`; a chain-fired clause → `processReactions`), so they never ride that return.
They wait in the loader (`pendingActEvents`) and land on the engine's plugin path, which
enriches, tags presence and appends without re-applying: a `chord.acted-events` TurnPlugin at
priority 150 — ahead of the actor phase (100), so the act narrates immediately after the
report that caused it — and a `chord.act-drain` daemon for acts fired inside daemon bodies.
The engine surface is `GameEngine.executeAsActor(actorId, actionId, slots): ActResult`,
hoisted from the actor phase's closure. Two platform corrections the real-path suite forced:
the loader now places every entity's `carries`/`wears` at load (the role-holder's only,
before — an NPC's `carries the sword` had never been placed), and a story handler that throws
now surfaces as `command.failed` through `ProcessedEvents.failed` instead of a console line,
which is what lets `runtime.act-player-actor` — and `runtime.move-arrival-reentry` — reach the
player from a chain-fired clause. Slot roles: shape order gives `directObject` then
`indirectObject`; a story action's `is an instrument` slot gives `instrument`; the direction
literal is the loader's `toDirection`. Real path: `adr-329-act-statement.test.ts`, 9,
on `GameEngine.executeTurn`; Dungeo chain 952/17 and the Chord corpus identical to baseline.)*

### D6. Goal steps lower onto the same entry — `applyStepMutation` retires

ADR-310 D8's step verbs are this ADR's verbs in plan form, and they execute through the same
door: when the arbiter's chosen step is `acquire`, the tick performs `taking` as the NPC
once the item is in reach (`seek` remains the plan half); `give` performs `giving`; `drop`
performs `dropping`; `move to` performs one `going` per turn along the path. The bare
`world.moveEntity` calls in `character/src/tick-phases.ts:862-875` retire. A trait refusal
can block a goal step for the first time; a witnessed goal step narrates for the first time.
ADR-310 D8 is stamped with the amendment by the landing change — the flip owner is the
implementer of the plan phase that retires `applyStepMutation`, and the trigger is that
phase's real-path test going green (Acceptance item 3). This lands **under this ADR** (Q-4
resolved 2026-08-29, David: option a): there is one ruling about how a Chord character
acts, statement-form and plan-form alike, so there is never a second truth. The
`packages/character` cutover is a platform change scoped by this ADR; the implementation
plan may sequence it as its own phase with its own real-path gate (Acceptance item 3), but
this ADR is not complete until it lands.

*(Landed — 2026-08-29, session d04ae1, Phase 9c. `applyStepMutation` is gone;
`performStep` resolves the evaluator's intent to one action and its slots — `move` →
`going` by the direction of the current room's exit whose destination is the next room
(the planner's graph is bidirectional, the room is not: a one-way passage walked backwards
resolves to no exit and the NPC does not act); `take` → `taking`; `give` → `giving`;
`drop` → `dropping` — and runs it through the tick's `act`, the same `ExecutionEntry` the
engine already handed every tick phase (`NpcTickContext.act`), which the character phase's
own context had simply not carried. The act's events join the tick's stream, already
applied. Refusal ruling, David 2026-08-29: a refused step is exactly a failed mutation was —
no advance, no announcement, retried next tick — and each witnessed attempt narrates its
refusal; a step that keeps being refused is loud every turn, by design. Real path:
`packages/story-loader/tests/adr-329-goal-steps.test.ts`, 5, on `GameEngine.executeTurn` —
a recipient's `on the Maid giving … refuse` blocks the `give` and the letter stays, the
refusal narrating `present` on each retried turn; a `drop` narrates `present` in the room
and `absent` from another; `acquire` takes a coin and is refused on scenery, the goal stuck
at that step; `move to` performs `going` through the room's real exit, one hop per turn.
Corpus identical to baseline (ides 39 — it carries a `move to the Stage` step — fernhill 36,
secret-letter 131/29; Dungeo chain 952). Follow-on, not folded in: a goal step as any
acting-statement shape, so a story verb can be a step — GH #321.)*

### D7. `move` is unchanged: *move puts; acting does*

ADR-325's `move` and ADR-326's adjacent-room place are authorial teleportation and stay
exactly as written — no observer change, no arrival change, no new spelling. The reference
documents the two verbs side by side in one sentence: `move the monkey offstage` *puts* the
monkey somewhere; `the monkey gives the necklace to the player` *does* something, and can
be refused, witnessed, and reacted to. An author reaching for `move` to make a character
act is reaching for the wrong word, and the reference says so where `move` is documented.

*(Landed — compile half, 2026-08-29, session aeade8, Phase 9a of the program plan.
Three refinements the code forced. (1) The split is the analyzer's: `parser.ts` admits a
name-led line as an `act` candidate when some word after the first lemma-matches a verb
opening a standard shape or one of the file's own `define action`/`extend action` grammar
lines, and carries the words raw with the body kind; `analyzer.ts` finds the longest name
prefix that names an entity, matches the rest against the story's shapes first and the
manifest's second (most literal words win: `take the sword off` is `taking_off`), resolves
each slot as a name, and gates the body — so a line with no action verb anywhere is still
`parse.unknown-statement`. (2) One error id beyond the four named above: `analysis.act-actor`
(no character named here acts / `X` cannot act). (3) A `going` shape's literal direction
arrives in the IR as a `direction` slot with a literal value, since the manifest expands
directions into literal words. The compile-time `the player` gate covers the spelled role;
the runtime half of D1's exclusion — an actor who currently holds the role — is the loader's,
in the execution phase. The EBNF row lands with the 4.1.0 bump (D8), because
`language-version.test.ts` pins the grammar file's hash to the language version. Tests:
`packages/chord/tests/act-statement.test.ts`, 18; chord suite 1082 passing.)*

### D8. Paper trail

EBNF row beside `move` in the statement production; `chord-grammar-changes.md` entry;
ADR-257 **minor** bump (additive — every story valid at 4.0.0 is valid after).

*(The 4.1.0 this landed as was folded, with 3.4.0 and the 4.0.0 major, into public **3.5.0**
by the owner's consolidation ruling of 2026-08-29 — nothing past Chord 3.3.0 / Sharpee 5.1.1
had been published. ADR-257 D2, sixth recorded exception.)*

### D9. What this ADR's acceptance flips

The DRAFT → ACCEPTED flip (owner: the rule-11a interview) stamps ADR-328 D7 with this ADR's
number — its child exists — and nothing else. ADR-325/326 are untouched (D7 here);
ADR-310 D8's stamp waits for D6's landing, above.

### D10. A goal step is an acting statement with the actor implied (GH #321)

*(Amendment, 2026-08-29, session 9de27b — **ACCEPTED** by David the same day ("flip"), after
it landed in full on his three phase gos. Raised during Phase
9c: the goal block's step vocabulary is closed — seek, acquire, wait for, move to, act, say,
give, drop — so a story verb a character can perform from a reaction (D1/D2, in a `when` or
`after` body) cannot be a step of its plan.)*

The block first (lesson 10). A wizard whose plan is to put the key where it belongs — the
prompt is David's (GH #321): *an actor with a magical ability to place an item in a known
location*. **The two lines marked `## NEW` are the only syntax that does not compile today**;
the rest is ADR-310 D8's block as it ships.

```chord
define action conjuring
  grammar
    conjure the item into the place
  the item must be reachable
  otherwise refuse conjure-what

define trait conjurable
  on the wizard conjuring
    move it to the Vault               ## the spell's effect — the trait's clause claims
  end on                               ## the dispatch, as thealderman's `accusing` does
end trait

create the key
  conjurable

  A key.

create the wizard
  a person
  in the Tower

  goal secure-the-key, high
    active when the player has the key
    seek the player
    take the key                       ## NEW — the same step `acquire the key` is
    conjure the key into the Vault     ## NEW — a story verb, performed as the wizard
    say wizard-gloats
  end goal
```

**A goal body line that is none of the eight step verbs (and not `active when`) is tried as
an acting statement whose actor is the block's owner.** Its first word's lemma opens a shape
(the story's own `define action`/`extend action` grammar first, the manifest's second — D2's
matching, unchanged); its slots are names, resolved as every other step ref is (`the player`
is admissible in a slot, as `give … to the player` already is; the owner never appears — the
block names the actor). The line lowers to one **`perform` step** carrying the action, the
shape, and the slots already sorted into the roles the execution entry takes — direct object,
indirect object, instrument (a story action's `is an instrument` slot), direction (a `going`
shape's literal) — and the tick performs it exactly as D6 performs `give`: one action, run
through `NpcTickContext.act` as the NPC, validated, interceptable, witnessed. **It acts now**:
a `perform` step seeks nothing and waits for nothing — the action's own validate is the only
gate, so a `take the key` written where the key is out of reach is refused, and 9c's refusal
ruling applies unchanged (no advance, no announcement, retried next tick, each witnessed
refusal narrating). Guarding a step is what `wait for` is for; a step carries no `when`
suffix (the statement's suffix skips a line; a step that should not run yet waits, and a
step that should not run at all is not written).

**The standard verbs keep their planning half as spellings.** Three of the shapes an acting
statement can take are already steps with a plan attached, and the plan is the point of
writing them in a goal: the analyzer folds them onto the existing step kinds, so the tick's
behaviour is exactly what it was —

| The line matches | Lowers to | Which means |
| --- | --- | --- |
| any `taking` shape with one item (`take the key`, `pick up the key`) | `acquire` | waits, silently, until the item is in the room; then takes it |
| any `giving` shape with an item and a recipient | `give` | blocked (loud) unless held; waits until the recipient is in the room; then gives |
| any `dropping` shape with one item | `drop` | blocked (loud) unless held; drops |
| everything else — `go east`, `open the door`, `conjure the key into the Vault` | `perform` | acts now; refusal retries next tick |

`move to <place>` stays the planner's spelling (a path, one `going` per turn); `go east` is a
`perform` of one `going`. Nothing new is decided about how a character acts — D6's one truth
holds for both forms, and the four rows above are the same words meaning the same thing in
a reaction body and in a plan.

**Errors are D2's, by name.** A first word that opens no shape stays `parse.goal-step`
(the parser admits the line only when its first lemma is an action verb the file or the
manifest knows, the same admission `tryParseActStatement` makes); a verb whose shapes the
words do not fit is `analysis.act-slot-shape`, listing them; an unknown name in a slot is
the existing unknown-entity error; a `when` suffix on a step is `parse.goal-step` naming
`wait for`.

**Surfaces.** `packages/chord/src/parser.ts` (a default case in `parseGoalBodyLine` before
the step error), `analyzer.ts` (`perform` lowering beside the goal-step switch, sharing `matchActShape` and
the name-splitting helpers with the statement; the roles are sorted here, at compile time,
from the AST's own `slotTypes` — the statement's roles stay the loader's, `performAct`, so
one rule is stated at two sites rather than shared across the package boundary), `ast.ts`/`ir.ts` (one step
kind), `packages/character/src/goals/goal-types.ts` (`PerformStep`, one `StepMutation`
kind), `step-evaluator.ts` (completes with the mutation), `apply-compiled.ts` (`mapGoalStep`,
with the loader supplying the qualified action id the way it already supplies entity ids),
`tick-phases.ts` (`stepAction`'s one new case). **No engine, stdlib, or world-model change.**
Paper trail: EBNF (the goal-step production gains the row), `chord-grammar-changes.md`,
the reference's goal page. No separate ADR-257 bump: D10 rides the **3.5.0** consolidation
(owner ruling 2026-08-29 — 3.4.0, 4.0.0, 4.1.0, and D10 are one public minor alongside
Sharpee 5.2.0; ADR-257 D2's sixth recorded exception), so only the EBNF hash re-pins.

**Acceptance** (numbered on from item 5): **6.** compile tests — each row of the table
lowers as stated; a story verb lowers to `perform` with its roles; `go east` carries the
direction; the errors fire by name. **7.** REAL-PATH (rule 13a), on `GameEngine.executeTurn`
through the character tick: the wizard's `conjure the key into the Vault` moves the key
(asserted on `world.getLocation`) and advances the step; `take the key` waits until the
key is in the room and then takes it (the `acquire` fold, on the real path); a refused
`perform` leaves the world unchanged, does not advance, and narrates its refusal to a
present player each retried turn. **8.** corpus identical to baseline (thealderman,
b3-conscience, and ides carry goal blocks; none uses the form).

*(6 — satisfied 2026-08-29, session 9de27b: `packages/chord/tests/adr-329-d10-perform-step.test.ts`,
18 — every row of the fold table, the wizard's story verb with its roles, the instrument slot,
`go east`'s direction, lemma matching, `the player` in a slot, and each error by name; chord
1100 passing / 72 files. **7** — satisfied the same session: `packages/story-loader/tests/adr-329-d10-perform-step.test.ts`,
6, on `GameEngine.executeTurn` — the conjure moves the key and advances; `take the key` waits
until the key is dropped in the room, then takes it; a refused `open the chest` narrates
`open_blocked` `present` on each retried turn and never advances; plus the actor-binding
correction's own case. **8** — satisfied the same session, all through the rebuilt
`dist/cli/sharpee.js` and `./sharpee test --tree`: fernhill 36 cards, ides 39, secret-letter
131 passing / 29 failing (GH #319, pre-existing), thealderman 4; cloak-of-darkness 80 passing /
2 failing and friendly-zoo 75 / 1 (the 9b baseline's pre-existing three); character-acceptance
b1 15, b3 62 / 1 (`b3-seek-out-recycle`, pre-existing), p10 21, p8+p9 19; Dungeo chain 952
passing / 17 transcripts, unmoved. Paper trail: `chord.ebnf` `goal-block` production (new —
the goal block had never been in the file), `chord-grammar-changes.md` row, the reference's
create-block table and the goals guide; EBNF hash re-pinned under 3.5.0.)*

*(Landed — compile half 2026-08-29, session 9de27b, plan Phase 1:
`packages/chord/tests/adr-329-d10-perform-step.test.ts`, 18 (Acceptance 6). Runtime half the
same session, Phase 2: `PerformStep` → `StepMutation.perform` → `stepAction`'s one new case,
`mapGoalStep` qualifying the action name through a loader-supplied `resolveActionId`. Real
path `packages/story-loader/tests/adr-329-d10-perform-step.test.ts`, 6, on
`GameEngine.executeTurn` (Acceptance 7): the wizard's conjure moves the key and advances;
`take the key` waits, silently, until the key is dropped in the room, then takes it; a
refused `open the chest` narrates `if.event.open_blocked` `present` on each retried turn and
never advances; unrefused it opens; `go east` is one `going`. **One platform correction the
real path forced**: the story dispatch action bound `the actor` — and the actorId handed to
capability validate/execute/report and to `fireAfterClauses` — to `context.player`, so a
story action performed by a character (statement or step) tested the player's whereabouts
and matched the player's heads; it now binds whoever acts (`runtime.ts`, `buildDispatchAction`),
with a real-path case that fails without it. One fixture finding, reflected in the block
above: a story action's effect is a trait clause (`define trait … on the wizard conjuring …
end trait`) the entity composes — entity `on` clauses never fire on the dispatch path, the
loader's own rule. Version: rides 3.5.0, per the consolidation ruling.)*

## Non-goals

- **No NPC parsing, no scope resolution at parse time** — slots are names the author wrote.
- **No plan in the statement.** Seeking, pathing, waiting, and retrying are ADR-310 D8's
  goal steps; the statement is one action, now.
- **No new witnessing or voice** — ADR-328 D3/D4 already render a non-player act.
- **No change to `move`, `remove`, or any ADR-325/326 place.**
- **No forced player action.** `the player` is not an admissible actor (D1); Inform's
  `try taking the apple` has no Chord spelling under this ADR.
- **No conversation-row semantics beyond admitting the statement** (ADR-320 stands).

## Consequences

- The port's TE20 trade and the monkey's handover become writable as what they are —
  characters giving — and the mercenaries example ADR-328 D7 promised becomes one line.
  Chord characters act under the player's physics, which is the sentence ADR-328's impact
  analysis (§B4) said the whole program traces back to.
- The last off-pipeline mutation of a character verb (`applyStepMutation`) retires under D6.
- One word position is new — the actor that already heads every clause now heads a
  statement — and no new word: `take`, `give`, `drop`, `go` are the manifest's own.
- Refusals gain a second audience: a story whose `on the guards taking` clause refuses now
  refuses the guards' *statement* too, which is the point (one truth), and a reason authors
  write those clauses with the actor in mind (ADR-327 D1).
- Chord bumps a minor; the reference (ADR-272's surfaces) gains the statement and D7's
  sentence.

## Acceptance

1. **Compile tests**: the statement parses in each legal body (D3) with one-, two-, and
   direction-slot shapes; the analyzer errors fire by name — an intercept body, a `before the
   game starts` body, an unknown verb, a wrong slot shape, a non-person actor, `the player`
   as the actor, an unknown name in a slot — each with its fix-it.
   *(Satisfied 2026-08-29, session aeade8 — Phase 9a: `packages/chord/tests/act-statement.test.ts`,
   18, real `parser.ts`/`analyzer.ts`; one more error id than named, `analysis.act-actor`.)*
2. **REAL-PATH loader tests (rule 13a), through a real engine** (the `adr-327-ac2` harness
   shape): `after the player entering` → `the guards take the sword` moves the sword into the
   guards (asserted on `world.getLocation`), fires `after the guards taking` and not the
   player's head; the `on the guards taking` refusal leaves the sword where it was and fires
   no `after`; the player in the room receives the act's third-person narration in the
   turn's output *after* the entering report, and from another room receives nothing while
   the sword still moved (ADR-328 AC-2's scene, from Chord); a timer-fired act in the turn
   phase; a conversation-row act; the re-entry cap raises `runtime.act-reentry` at depth 8
   and performs no ninth act; a save taken mid-sequence restores and continues.
   *(Satisfied 2026-08-29, session aeade8 — Phase 9b: `packages/story-loader/tests/adr-329-act-statement.test.ts`,
   9, on `GameEngine.executeTurn`; every clause of this item is one of its cases.)*
3. **D6, REAL-PATH**: a character-model NPC's `give` step runs
   through the entry — a trait refusal on the recipient blocks it and the item stays; a
   witnessed `drop` step narrates in the NPC's voice.
   *(Satisfied 2026-08-29, session d04ae1 — Phase 9c: `packages/story-loader/tests/adr-329-goal-steps.test.ts`,
   5, on `GameEngine.executeTurn` — the recipient's `on the Maid giving … refuse` keeps the
   letter and narrates `present` on each retried turn; the `drop` narrates `present` in the
   room and `absent` from another; plus `acquire` (taken; refused on scenery) and `move to`
   (`going`, one hop per turn).)*
4. **Corpus green**: every story suite passes (fernhill, friendly-zoo, cloak, ides,
   secret-letter, fixtures) with zero diffs — nothing in the corpus uses the statement yet;
   Dungeo is TypeScript and untouched, its chain byte-identical.
   *(Satisfied 2026-08-29, session d04ae1 — after 9c's `./repokit build dungeo --skip
   character`: ides 39 cards, fernhill 36, secret-letter 131 passing / 29 failing — all
   identical to the `c31ab561` baseline (the secret-letter failures pre-date this ADR, GH
   #319); Dungeo chain 952 passing across 17 transcripts, unmoved. cloak and friendly-zoo
   were matched to baseline at 9b (2 and 1 pre-existing failing cards).)*
5. **Paper trail** (D8) landed; the reference updated.
   *(Satisfied 2026-08-29, session d04ae1 — Phase 9d: EBNF row beside `move` in the
   statement production plus the `verb-words` production; `chord-grammar-changes.md` entry
   dated 2026-08-29; `CHORD_LANGUAGE_VERSION` 4.0.0 → 4.1.0 with the surface pin
   re-recorded; the reference grammar table and the statements guide carry the statement
   and D7's sentence beside `move`.)*

## Session

2026-08-28, session aeade8 (`docs/context/session-20260828-2334-feat-adr-321-world-index.md`)
— Phase 8 of `docs/work/adr-328-actors-platform-concept/plan.md`, written after Phase 6c
closed the book chapter. The block was written first, on the AC-2 fixture, then the list.
