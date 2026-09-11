# ADR-347: The ending is an explicit concept

**Status**: **ACCEPTED** (David, 2026-09-11, session aceb2e — "accept". Written the same session on `main` at his "yes, write it". Raised during GH #414's Phase 1 when `mutation-verification` found that a RESTORE at an end-game prompt loaded a live save into an engine that still refused every command — and the fix for that was a patch reconciling two records of one fact. The framing is Evans, *Domain-Driven Design* ch. 9: do not leave implicit what should be explicit.

**All six open questions resolved by interview** (2026-09-11, same session), Q-1 first — the premise is ruled and implementation is scheduled, not deferred — so the Open Questions section is gone and D1-D5 with their sub-decisions are the whole decision. The interview also **corrected the Context**: the claim that no client reads the ending was wrong in the ADR's favour, and the `endgame` channel it missed is a fourth naming of the same fact rather than a counterexample.

`adr-review` ran at **11/20 NEEDS WORK**, eight findings — no Acceptance Criteria section at all, three unpinned interface contracts, no rejection test for a double ending, no amendment owner for ADR-345, and **three internal contradictions where prose written as a proposal had not caught up with the interview's rulings** (a Consequences bullet still placing the value in `if-domain` after Q-2 put it on `WorldModel`, another still offering deferral after Q-1 declined it, and D2b pointing at D4a where it meant D2c). All folded, ending at **20/20 READY FOR IMPLEMENTATION**.

**Acceptance authorizes no implementation by itself.** The work is scheduled as Phase 2 of `docs/work/meta-commands-work-after-ending/plan.md`, which needs rewriting against this ADR before it starts; D4b obliges the implementing session to amend ADR-345 in the same commit as the code, gated by AC-8.)

**Scope**: `packages/if-domain/src/endings.ts` (the concept's home), `packages/engine/src/turn/ending.ts`, `packages/engine/src/game-engine.ts` (the phase's relationship to it), `packages/story-loader/src/loader.ts` (Chord's emitter and `isComplete`). **Amended by Q-5's ruling**: `packages/stdlib/src/channels/standard.ts` (the `endgame` channel's payload) and `packages/platform-browser` are **in** scope and in the platform-approval set — D3a rules that the Ending reaches clients in this decision. `packages/transcript-tester` and `packages/branch-tester` remain consequences pending Q-6.

## Date: 2026-09-11

## Parent

**Supersedes nothing. Revisits**: ADR-345 D9 (the `stopped` phase carries no reason) — not to overturn it, but because it settled where the *reason* lives without asking who owns the *ending*.

**Related**: ADR-345 D15 (a stopped engine accepts meta commands), ADR-210 Platform Prerequisite 3 (which created `endings.ts`), ADR-224 (death detection and the live-state re-check), GH #414.

## Context — verified, not assumed

### The concept has a name and a home, and two of its three declared consumers do not use it

`packages/if-domain/src/endings.ts` exists. It defines `StoryEndingEvents` (`story.victory`, `story.defeat`), `StoryEndingKind`, `IStoryEndingData`, and `STORY_ENDING_FLAG = 'story.ending'` (`:35`). Its own header states who it is for:

> shared by the story-loader (emits on `win`/`lose`), **the engine/clients (react to endings)**, and transcript tests (assert on the event types)

Measured 2026-09-11 against the source:

- **story-loader uses it.** `triggerEnding` sets the flag (`loader.ts:1531`); `isComplete()` reads it (`loader.ts:1512-1514`); the scheduler reads it to stop firing (`runtime/scheduler-constructs.ts:209`).
- **The engine does not.** It never imports `endings.ts`. It reaches the ending only indirectly, by calling `Story.isComplete()` (`turn/ending.ts:42-43`) — a boolean, carrying no kind, no cause, and no turn.
- **No client reads it.** Grepping `story.victory`, `story.defeat` and `StoryEndingEvents` across `platform-browser/src`, `runtime/src` and `bridge/src` returns nothing.

**Corrected mid-interview (2026-09-11), because that last line understated the case rather than overstating it.** The clients are not blind to endings — they are fed a *fourth* surrogate. `stdlib/src/channels/standard.ts:501` defines an `endgame` channel, and the browser renders it (`platform-browser/src/channels/index.ts:206`, as a transient notification via `channels/notify.ts:59`), alongside a sibling `death` channel. But that channel keys off neither the flag nor `StoryEndingEvents`: it scans for **`game.won` / `game.lost`** (`standard.ts:76-81`), the engine's own `stop()`-emitted pair — a third naming of the same fact, after the world flag and `story.victory`/`story.defeat`. And it projects a **message string**, `contentType: 'text'`, `emit: 'sparse'`.

So the client is told the ending in prose and never in state. It can render "*** You have won ***" and still cannot answer "has the story ended?" — which is exactly why GH #414 defect 3 leaves the input box live. The original claim was that the model was never built; the truth is worse, in that a fourth partial model was.

The vocabulary was written down three times over. The model was never built.

### Five places reach around the concept that is not there

1. **`endingStage` recomputes it every turn** from three unrelated sources — a `story.victory` event seen this turn, a death event crossed with a live `HealthTrait` re-check, and `Story.isComplete()` (`turn/ending.ts:48-73`). Nothing records the answer; the next turn asks again.
2. **`loadSaveData` had to be patched.** A restore replaces the world wholesale, and the world is where Chord's ending lives — so after a restore the world said one thing and the engine's phase said another. The fix shipped in GH #414 Phase 1 sets the phase from the outside (`game-engine.ts`, `if (this.phase.name === 'stopped') this.resume()`), which is a patch reconciling two records, not a model.
3. **The reload loop (GH #414 defect 2) is the same disagreement from the other side.** The browser autosave persists a world carrying the ending flag (`platform-browser/src/BrowserClient.ts:435`), a fresh engine boots at `playing`, and the first turn re-discovers the ending and stops again — permanently, because the stop re-autosaves.
4. **The browser client cannot ask.** It has no ending listener, so the input box stays live after the story ends (GH #414 defect 3). It cannot subscribe to a raw engine event either — this client's only engine subscriptions are `channel:manifest` and `channel:packet` by design (`BrowserClient.ts:266-268`).
5. **The test harnesses detect it by string-matching an error message that no longer exists.** `transcript-tester/src/command-core.ts:525` and `branch-tester/src/tree-walker.ts:332` both compare against `'Error: Engine is not running'`, which ADR-345 retired in 5.3.2. Both branches have been dead since, silently.

Five consumers reaching for a concept that does not exist is the chapter-9 tell.

### The two surrogates answer different questions

| | `phase === 'stopped'` | `STORY_ENDING_FLAG` |
| --- | --- | --- |
| Question it answers | may the engine take a turn | did this story reach a conclusion |
| Kind of fact | session / permission | narrative / world |
| Survives save-restore | no — it is engine state | yes — it is world state |
| Distinguishes victory from quit | **no** — ADR-345 D9 stores no reason, so `stop('restart')`, `stop('quit')` and `stop('victory')` are one phase | yes — the flag is a `StoryEndingKind` |
| Set by | `stop()`, for five different reasons | the story, on `win`/`lose` only |

**And a third and fourth naming, found mid-interview**: the engine's `stop()` emits `game.won` / `game.lost`, which is what the `endgame` channel scans for, while `story.victory` / `story.defeat` — the pair `endings.ts` blesses as the contract — is what the story-loader emits and nothing downstream consumes. One fact, four vocabularies, no owner.

Neither is the ending. `stopped` is overloaded and session-scoped; the flag is narrative and Chord-only — a TypeScript story implements `isComplete()` however it likes and need never set it.

### What ADR-345 D9 settled, and what it did not

D9 ruled that the *reason* for stopping is an emitted event and does not also sit on the phase, because "one fact in two places is the exact defect this ADR was written about." That reasoning is correct and this ADR does not propose undoing it.

What D9 did not ask is whether `stopped` is a fact about the engine or a fact about the world. It assumed the first. The restore defect is the counterexample: the ending outlived the engine that observed it, because it was already living somewhere else.

## Decision

**The premise is ruled** (David, 2026-09-11, session aceb2e, Q-1: "A"). The ending becomes an explicit concept and the implementation is scheduled, not deferred — the full reading, over the two alternatives offered. Two consequences follow immediately and are not left to a later session's judgement: **GH #414's defect 2 is fixed through the concept rather than at the autosave call site**, and **the `loadSaveData` / `undo()` resume patch shipped in Phase 1 is scheduled for retirement by D3** rather than standing as a rule.

The deciding evidence was the measurement rather than the argument: five consumers re-derive a fact that `endings.ts` already names, for three declared consumers it serves one of.

**D1 — The ending becomes an explicit domain concept, owned in one place, rather than something five consumers each re-derive.** It carries at minimum what kind of ending it was and is absent while play continues; a story that has not ended has no Ending, which is a different statement from "has an Ending that says nothing."

**D2 — The Ending is world-scoped, not engine-scoped.** It is a fact about the story's state, and the save/restore behavior is the evidence: it already survives serialization today, by accident of living in world state, and every defect above comes from the engine holding a second, shorter-lived copy.

**D2a — It is a first-class member of `WorldModel`, not a state-bag key and not a capability** (David, 2026-09-11, session aceb2e, Q-2: "C"). The type stays in `if-domain/src/endings.ts`, which is types-only and unchanged in that respect; the *value* becomes a real member with a real accessor and its own serialization wiring.

**The precedent is `getPlayer()` / `setPlayer()`.** The world already carries one narrative-shaped fact as a first-class member, so the objection that a narrative concept does not belong on the world's public surface is answered by the surface as it stands. The two rejected alternatives and why: a **state-bag key** (widening `STORY_ENDING_FLAG`'s value) is the cheapest change and keeps every current reader working, but leaves the concept a string key in an untyped `getStateValue` bag — which is the implicitness this ADR exists to remove, so buying the fix and declining the modelling would be the worst of both. A **world capability** (`registerCapability`, as `help` uses for `GAME_META`) serializes by an existing typed route, but makes registration a boot step every story must perform, dragging a stdlib-flavoured concept into hand-written stories — Q-4's problem arriving early and by the back door.

**D2b — `Story.isComplete()` goes; an ending is declared, never polled** (David, 2026-09-11, session aceb2e, Q-3: "A"). The optional hook (`install/story.ts:323`) drops off the `Story` interface and `endingStage` reads the Ending directly. A story that wants "complete when X" sets the Ending at the moment X becomes true.

**The distinction is declared versus polled, and it is the same distinction as the concept itself.** A poll is how a system fakes a fact it has nowhere to put: `endingStage` asks every story every turn whether it has finished, because nothing records that it did. Chord already declares — `win`/`lose` call `triggerEnding` (`loader.ts:1530-1531`) at the moment it becomes true — so the poll survives only for stories written against the TypeScript surface.

**Measured before ruling, because "breaking change" overstates it** (2026-09-11): the only non-Chord implementations in the tree are `stories/dungeo/src/index.ts:818-821`, which returns a hardcoded `false` under the comment "full game completion TBD", and `packages/engine/tests/stories/completion-test-story.ts`, a fixture. **Nothing in the tree actually polls for completion.** Keeping the hook for compatibility would therefore have bought one `return false` and one fixture — while leaving an override that can report complete while the world carries no Ending, putting the engine back in the split state D3 exists to prevent. Fixing the engine's copy of the fact while licensing the story's is not a compromise, it is the defect with better manners.

**The cost, named rather than discovered later**: polling is easier to author for a condition like "complete when every treasure is scored," because declaring means finding every place the last treasure could be scored. That is an authoring-ergonomics problem and it lands in D2c's territory (Q-4) — a surface where declaring is cheap is a precondition for this decision being kind, not merely correct.

**D2c — One declaring verb in `@sharpee/stdlib`, serving both surfaces** (David, 2026-09-11, session aceb2e, Q-4: "A"). `endStory(world, kind, opts)` sets the world's Ending (D2a) and builds the blessed `story.victory` / `story.defeat` event; Chord's `triggerEnding` routes through it rather than carrying its own implementation.

**The precedent is exact and already load-bearing: the death path.** `killPlayer` lives in stdlib, takes `(world, player, opts)`, and Chord's `kill` statement calls it (`story-loader/src/runtime/statements.ts:129`) instead of reimplementing death. One verb, two surfaces, no drift — because there is only one implementation to drift from. D2c gives the ending the same shape as the death it sits beside.

**Why not a world-model setter**, which D2a's own `setPlayer` precedent would suggest: a bare setter does not emit the ending event, so an author must do two things and forgetting the second is a silent story-ends-with-no-closing-prose bug. Making the setter emit would put event construction on `WorldModel` — the wrong layer, and one this repository keeps clean deliberately. **Why not an engine method**: the engine is not in reach where it matters. An action or an event handler holds `world`, not `engine`.

**This answers the cost D2b named.** Declaring is only kind if the verb is at hand wherever the condition becomes true, and `world` is the one thing every such site already has.

**D2d — The three contracts this decision creates, pinned rather than left to the implementing session.** The review that followed the interview failed this ADR on interface completeness; these are the answers.

**The Ending's shape**, beside the existing types in `if-domain/src/endings.ts`:

```ts
export interface IStoryEnding {
  readonly kind: StoryEndingKind;      // 'victory' | 'defeat'
  readonly turn: number;               // the turn it happened on
  readonly messageId?: string;         // the ending phrase, when the author supplied one
  readonly cause?: string;             // free-form, e.g. the cause `killPlayer` carried
}
```

`turn` is not decoration: it is the field that lets a client say *when* and a save say *whether this ending is the one it was written at*. `messageId` matches `IStoryEndingData`'s existing field and carries the same rule — it identifies the phrase, it does not render it (GH #274).

**The verb's signature**: `endStory(world: WorldModel, kind: StoryEndingKind, opts?: { messageId?: string; cause?: string }): ISemanticEvent | undefined`. It returns the blessed event for the caller to emit, which is what `triggerEnding` does today (`loader.ts:1530-1540`).

**Its rejection rule — the first ending wins.** Called on a world that already carries an Ending, `endStory` writes nothing, emits nothing, and returns `undefined`. The precedent is `killPlayer`, which is already idempotent for the same reason, recorded at `engine/src/turn/detect-death.ts:26-28`: when several fire in one turn the first is authoritative. An ending that could be overwritten would make the Ending's `turn` a lie and give a story two closing events for one conclusion.

**The channel contract — a new state-mode sibling, not a widened `endgame`.** `endgameChannel` keeps its text payload and its rendered notification; a sibling channel carries `IStoryEnding` as state. D3a left this to the implementer and the review is right that it should not have: **widening `endgame`'s payload would delete the notification text it currently renders**, which moves rendered output and therefore moves the Dungeo goldens — a 952-assertion baseline shifted as a side effect of a type change. The sibling costs one channel registration and moves nothing.

**D3 — The engine's phase derives from the Ending across a restore rather than being set alongside it.** A restore of a save with no Ending plays; a restore of a save carrying one does not. This retires the `loadSaveData` patch shipped in GH #414 Phase 1 rather than keeping it as a standing rule.

**D3a — The Ending reaches clients as state on the channel surface, in this decision** (David, 2026-09-11, session aceb2e, Q-5: "A"). The `endgame` channel carries the Ending record rather than a message string — as a widened payload or a state-mode sibling, the implementing session's call — and the `game.won` / `game.lost` naming is reconciled here rather than left as a fourth vocabulary. `packages/platform-browser` and the ADR-163 channel contract are therefore in this ADR's platform-approval set.

**The plumbing already exists; only its payload is wrong.** `endgameChannel` (`stdlib/src/channels/standard.ts:501`) is defined, registered, and rendered by the browser as a transient notification (`platform-browser/src/channels/index.ts:206` via `channels/notify.ts:59`), with a `death` sibling beside it. But it is `contentType: 'text'`, `emit: 'sparse'`, projecting a message. A client can print *"\*\*\* You have won \*\*\*"* and still cannot answer "has the story ended?" — which is precisely why GH #414 defect 3 leaves the input box live after the story is over. This is a change of payload, not new plumbing.

**Why not a follow-up ADR**, which would have kept this one tighter: deferring means Phase 2 ships a client fix built on prose-sniffing — adding a fifth consumer of the weakest surrogate, immediately after writing down that four namings of one fact is the defect. The scope saved is also illusory, since Phase 2's work is the same work either way; only the ADR's page count differs.

**This is ADR-163 applied, not amended.** Channels are the universal surface carrying every story→UI signal; an ending is such a signal, and it has simply been travelling as prose because there was no state to send.

**D4 — `stopped` keeps its current meaning and stays overloaded on purpose.** It answers "may the engine take a turn," which is what every one of its guards asks. `stop('restart')` and `stop('victory')` should continue to produce the same phase, because the engine's permission to run is the same in both cases. The Ending is the concept that tells them apart, and D9 stands: the phase does not grow a reason field.

**D4a — Four of the five reach-arounds are retired by this decision; the two dead string matches are filed separately and are not in scope** (David, 2026-09-11, session aceb2e, Q-6: "B is fine").

| Reach-around | Fate |
| --- | --- |
| `endingStage` recomputing the ending every turn | Retired by D2b — it reads the Ending. |
| `loadSaveData` / `undo()` resume patch | Retired by D3, explicitly. |
| The reload loop (GH #414 defect 2) | Fixed through the concept, per Q-1's ruling. |
| The browser's live input box (GH #414 defect 3) | Fixed by D3a. |
| The two dead `'Error: Engine is not running'` matches | **Out of scope — filed as its own issue.** |

**The line is drawn at what the decision governs, not at what the investigation touched.** `transcript-tester/src/command-core.ts:525` and `branch-tester/src/tree-walker.ts:332` compare against a string ADR-345 retired in 5.3.2, so both branches have been silently dead since — and they would be equally dead if the premise had been ruled out at Q-1. Their defect is a stale literal, not a missing concept. Bundling them would widen this ADR's approval set by two packages for a fix that shares nothing with it but the session that found it.

**They are broken now, which is why "separately" means immediately.** Dead detection in the test harnesses is the kind of fault that hides other faults.

**D4b — The implementing session amends ADR-345 in the same commit as the code, and this ADR names the trigger.** Two things in ADR-345 go stale when this lands. **D9** ruled that engine state is the record of what phase and said nothing about the ending being a world fact — D2 answers a question D9 did not ask, so D9 gains a pointer here rather than a contradiction. **D15's** `loadSaveData` / `undo()` resume patch is retired by D3, and ADR-345's Phase-1 record describes it as a standing rule. The owner is the implementing session; the trigger is the commit that lands D3; the gate is AC-8. This follows ADR-345's own D13, which owed ADR-344 the identical duty and named it the same way — an unowned flip is how a corpus of Status lines stops being trustworthy.

**D5 — What is deliberately NOT proposed: deriving the phase from the Ending continuously.** Only the restore seam (D3). A live engine may legitimately be `playing` while the world carries an Ending — that is the transcript-tester RETRY path and ADR-345 D8a's tolerance, where a harness revives a dead player deliberately. Making the phase a pure function of world state would break that, and it is recorded here so a later session does not propose it as the obvious completion.

## Acceptance Criteria

Each names the command that decides it and is graded per DevArch's self-verifying test: does the AC's own mechanism detect the failure of its premises, or does a premise need establishing first?

**The end-to-end scenario all of these serve** — GH #414 as a player experiences it: a story reaches victory in the browser; the player reloads the page; they are restored to a live pre-ending turn and can type; and at the ending itself the input box is disabled with an end-game prompt, where `restart` and `restore` both work.

1. **AC-1 (D1, D2a) — the Ending is read from one place.** After the change, `grep -rn "STORY_ENDING_FLAG" packages --include="*.ts"` returns hits only inside `world-model`'s own accessor and `if-domain`'s declaration — no consumer derives the ending from the state bag. **SELF-VERIFYING** — a surviving derivation shows up in the grep that defines the criterion.

2. **AC-2 (D2b) — the poll is gone.** `isComplete` is absent from the `Story` interface (`install/story.ts`), and a test drives a story to victory and asserts the engine stopped with no `isComplete` implementation existing anywhere. Must fail if the hook is kept "for compatibility." **SELF-VERIFYING**.

3. **AC-3 (D2c) — one verb, two surfaces.** A test runs a Chord `win` and a TypeScript `endStory(world, 'victory')` and asserts identical world Ending state and the same event type from both. Must fail if Chord keeps its own implementation. **SELF-VERIFYING** — drift is what it asserts against.

4. **AC-4 (D2c) — the first ending wins.** A test calls `endStory` twice on one world and asserts the second writes nothing, emits nothing, returns `undefined`, and leaves the first Ending's `turn` intact. **SELF-VERIFYING** — this is the rejection test the review found missing.

5. **AC-5 (D3) — the phase derives at the restore seam.** Three assertions: restoring a save carrying an Ending into a stopped engine leaves it stopped; restoring a save with no Ending into a stopped engine returns it to play; and `grep -n "this.phase.name === 'stopped') this.resume()" packages/engine/src/game-engine.ts` returns nothing, because D3 retires the Phase-1 patch rather than keeping it. **SELF-VERIFYING** — the third assertion is the one that proves the patch was retired rather than merely joined.

6. **AC-6 (D3a) — the client acts on state, not prose.** Two checks, in order: a channel test asserting the state-mode sibling carries an `IStoryEnding` on the ending turn, then a browser test asserting the input box disables from that record with the story's prose mocked empty. Then `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` returning **952 passed across 17 transcripts** with all 17 goldens matched — the count measured on `main` 2026-09-11 during GH #414 Phase 1. One run: the chain is deterministic at the pinned seed. **PREMISE-DEPENDENT** — the goldens prove nothing about the new channel unless it actually fires, and the empty-prose assertion is what proves the client stopped reading prose; those two are the premise checks that make the golden result meaningful.

7. **AC-7 (D4) — `stopped` did not change meaning.** ADR-345's AC-4 and AC-7 still pass unmodified, and a test asserts `stop('restart')` and `stop('victory')` still produce the same phase. **SELF-VERIFYING** — this exists to catch over-application, the mirror of ADR-345 AC-4's purpose.

8. **AC-8 (D4b) — ADR-345 is amended in the same commit as D3.** Its D15 text no longer describes the retired resume patch as a standing rule, and its D9 carries a pointer here. **PREMISE-DEPENDENT** — nothing mechanical reads an ADR's prose, so this is verified by inspection of the commit, and its premise (that D3 landed) is AC-5's.

**Not an acceptance criterion, deliberately**: "no behavior change." D3a changes what reaches clients and D2b removes an interface member; folding those into one green suite is how a blast radius hides. AC-6 and AC-2 gate them separately.

## Consequences

- **GH #414's defects 2 and 3 stop being separate fixes.** Defect 2 becomes "the autosave carries the Ending and boot honours it" rather than a gate on the autosave call site; defect 3 becomes a query rather than an event subscription the client's own design forbids.
- **The `loadSaveData` / `undo()` resume patch becomes temporary by construction** (D3). It ships now because GH #414 needs it now; this ADR is the record that it is a reconciliation, not the model.
- **One more concept in a system that already carries several.** The honest cost is that `WorldModel`'s public surface grows a member (D2a) and `if-domain` grows a record type beside its frozen constants — the constants file stays types-only, which D2a preserves deliberately. The counter-argument is that `endings.ts` already claims three consumers and serves one, and that ADR-210 Platform Prerequisite 3 authorized "a small platform service" whose shipped form carries the line "No behavior lives here." The concept was scoped and then delivered as vocabulary; this ADR builds what was already approved.
- **Phase 2 of `docs/work/meta-commands-work-after-ending/plan.md` is where this lands**, since defect 2 is the same seam. Deferral was offered at Q-1 and declined: the premise is ruled and the implementation is scheduled, so Phase 2 fixes defect 2 through the concept rather than at the autosave call site. The plan's Phase 2 needs rewriting against this ADR before it is started.
- **Persistence: no migration, and that is a ruling rather than an oversight.** The Ending replaces `STORY_ENDING_FLAG` as the stored form, so saves written before this change carry the old key. No story has been released, so no save in the world needs reading — the same standing ruling that governs ADR-293's interim save handling. The implementing session writes no compatibility shim and no version reader.
- **The chapter-9 lesson generalises past this case**: `endings.ts`'s header named its consumers and nobody checked that they used it. A header that documents an intended model is not evidence the model exists.

## Session

Session aceb2e, 2026-09-11, branch `main`. Written after GH #414 Phase 1 landed green (typecheck 77/77, `test:ci` 76/76, Dungeo walkthrough chain 952 passed in 17 transcripts, `test:scripts` 14/14), during the review of the patch that Phase 1 needed and this ADR argues should not have been necessary.
