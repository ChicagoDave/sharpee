# ADR-345: The engine's lifecycle phase is an explicit concept

**Status**: **ACCEPTED** (David, 2026-09-10, session b314e2 — "accept it". Written the same session on `main` at David's "write up the ADR question", after ADR-344 Phase 2's last failing test turned out to be a symptom: D6a had made an `installStory` guard unreachable, and the reorder that fixed it raised the question of why the order was ever ambiguous. **All six open questions resolved by interview**, Q-1 first — "I believe the explicit engine phases are legit" — so the premise is ruled and D1 stands; the Open Questions section is gone and D1–D14 are the whole decision. `adr-review` ran at 10/19 NEEDS WORK, five findings, **two of them against this ADR's own text** — an unverified host count in D10 and no named amendment owner for ADR-344 D6a — all folded, ending at 21/21 READY FOR IMPLEMENTATION.

**Acceptance authorizes no implementation by itself.** D6 schedules the work as its own plan, started after the ADR-344 plan closes at its Phase 6; D13 obliges the implementing session to amend ADR-344 D6a in the same commit as the code, gated by AC-8.)

**Scope**: `packages/core/src/events/game-events.ts` (D12), `packages/engine/src/game-engine.ts`, `packages/engine/src/turn/context.ts`, `packages/engine/src/session/save-restore-service.ts`, `packages/bridge/src/bridge.ts`, `packages/runtime/src/bridge.ts` (D7, Q-3). The phase type itself stays inside `GameEngine`; what reaches outward is the optionality it disproves. `packages/bridge` and `packages/runtime` are therefore in the platform-approval set for this work.

## Date: 2026-09-10

## Parent

ADR-344 D6 (the player comes from the story; `installStory` constructs the `GameContext`) and its D6a amendment (`start()` requires an installed story, David's ruling 2026-09-10). This ADR is a finding *against* the shape those decisions left behind, in the same spirit ADR-344 was a finding against ADR-334's refactor: D6 and D6a are both correct and both stay: what they exposed is that the engine had no place to put them except another hand-written guard.

**Related**: ADR-334 A1 (`STORY_INSTALL_STEPS` — the install sequence *is* modeled as data, which is exactly the contrast drawn below). `docs/work/archive/adr-344-role-holder-seam/plan.md` Phase 2, whose last failing test surfaced this.

## Context — verified, not assumed

Every line cited was read this session at `f63455aaa` plus this session's uncommitted change.

### The proximate finding

`packages/engine/tests/unit/story-install-order.test.ts:94` pins the promise that `installStory` refuses a post-`start()` call with a message naming `running: true`. After ADR-344 D6a, that guard became **unreachable**: `installStory` checked `this.story` first and `this.running` second, and since `start()` now requires an installed story, a running engine always carries one — so the story guard answered every install-after-start with "already installed" and the running guard was dead code.

The fix applied this session was to swap the two guards (`game-engine.ts:409` before `:412`), with the test converted to install a story before starting so the case is reachable, and the order pinned: reversing it makes the test fail with the "already installed" message, verified by reverting and re-running.

**That fix is correct and this ADR does not propose undoing it.** It is recorded here because the question it raised — "which of these two guards should fire first?" — is a question that only exists because the state they read is spread across two independent fields.

### The actual finding: five proxies for one concept

The engine's lifecycle phase has no name and no type. Six guards ask about it, through five different fields:

| Guard | Reads | Message |
|---|---|---|
| `installStory` `:409` | `this.running` | `Cannot install a story after start() (running: true)` |
| `installStory` `:412` | `this.story` | `A story is already installed (story: '…')` |
| `start` `:489` | `this.running` | `Engine is already running` |
| `start` `:498` | `this._context` | `Cannot start: no story installed — call installStory() first.` |
| `resume` `:635` | `this.channelService` | `Engine must have been started before it can resume` |
| `executeTurn` `:713` | `this.commandExecutor` | `Engine must have a story set before executing turns` |

Plus the `context` getter at `:153`, which throws `No story installed: the game context does not exist until installStory() has run.`

Three of those seven ask "is there a story?" — through `this.story`, through `this._context`, and through `this.commandExecutor` — and answer in three different sentences. `this.story` and `this._context` are in fact always set together (`:421`, `:425`) and cleared together (never), so they are one fact stored twice; the code cannot know that, which is why `start()` reaches for the context to report a *story* problem.

### The tell: `resume()` cannot use the boolean pair at all

`resume` `:635` checks `this.channelService` — a collaborator, not a state flag — to decide whether the engine was ever started. It has to, because `running === false` is true in **two distinct phases**: "installed, never started" and "started, then stopped." The boolean pair cannot tell them apart, so the one method that needs the distinction reaches outside the pair for a field that happens to be created during `start()`.

That is the strongest available evidence that the model is wrong rather than merely untidy. A state machine whose states are not distinguishable by its own state variables is not being modeled; it is being simulated.

### Why this is not simply a tidiness complaint

Every new engine method that cares about lifecycle must choose a proxy, and nothing guides the choice. The wrong choice does not fail — it produces a guard that is subtly unreachable, or a message that names the wrong cause, and both survive review because each individual line reads sensibly. D6a's arrival made one guard dead **without any test noticing**; the test that eventually caught it was pinning a message string, not the state machine.

The neighbouring precedent is in the same package: ADR-334 A1 made the *install sequence* explicit data (`STORY_INSTALL_STEPS`), and `unit/story-install-order.test.ts` can therefore assert its order, its dependencies and its completeness by name. The engine's *lifecycle* got no such treatment, and that asymmetry is the gap.

### The framing, stated honestly

Eric Evans' strategic patterns — bounded context, context mapping, ubiquitous language negotiated with domain experts — do not apply here, and the ADR-344 plan already recorded that this work touches no bounded context. What applies is the tactical half, *Making Implicit Concepts Explicit* (DDD Ch. 9): "an engine before a story" and "an engine playing a story" are genuinely different things in this domain, the difference is currently carried by primitives, and every method has to re-derive it. Naming it is the whole of the proposal. This ADR does not claim the install pipeline is a domain model.

## Decision

**The premise is ruled** (David, 2026-09-10, session b314e2, Q-1): the engine's lifecycle phase becomes an explicit, named concept rather than something each method re-derives from whichever field is nearest. The deciding evidence was `resume()` — a method that cannot ask the question it needs to ask, because `running === false` spans two distinct phases — which makes this a modeling failure rather than untidiness.

D1 below therefore stands. D2–D5 are its shape; D6–D13 are the rulings from the rest of the interview and from review.

**D1 — The lifecycle phase becomes one discriminated field on `GameEngine`, replacing `running`, `story`, `_context` and the two collaborator proxies as the way lifecycle is read.**

```ts
type EnginePhase =
  | { name: 'empty' }
  | { name: 'ready';   story: Story; context: GameContext }
  | { name: 'playing'; story: Story; context: GameContext }
  | { name: 'stopped'; story: Story; context: GameContext };  // no reason: D9
```

**D2 — Each lifecycle method names the phases it accepts, and one refusal reports the phase it found.** `installStory` accepts `empty` only; `start` accepts `ready`; `resume` accepts `stopped` **and tolerates `playing` as a no-op — see D8a, which is an exception to this sentence, not an oversight in it**; `executeTurn` accepts `playing`. The guard-order question dissolves rather than being answered: there is one guard per method, so there is no order.

**`executeTurn` has two guards today, not the one this ADR's table shows.** `game-engine.ts:709` checks `!this.running` and throws `'Engine is not running'`; `:713` checks `!this.commandExecutor`. The table above lists only `:713`. Both collapse into the single `playing` check, which retires the string `'Engine is not running'` — asserted at `packages/engine/tests/unit/engine-resume.test.ts:24`. AC-2 covers rewriting that assertion; recorded here because the table understated the work.

**D3 — The `context` getter narrows instead of throwing on undefined.** Readers in a phase that carries a context get it without a null check; the throw survives only as the `empty`-phase refusal.

**D4 — D6a stops being a bespoke check.** "`start()` requires a story" is the statement that `start` accepts `ready`, not a hand-written `if (!this._context)` with its own sentence.

**D5 — What is deliberately NOT proposed: a type-level lifecycle** (`installStory(story): InstalledEngine`, making illegal states unrepresentable). `GameEngine` is a long-lived host object whose callers subscribe listeners *before* install, and a changed return type would ripple through `bootstrap`, `bridge`, `runtime`, `devkit` and every test — for a guarantee D1 already delivers at the one seam that matters. Recorded so a later session does not re-propose it as the obvious improvement.

**D6 — This work is scheduled as its own plan, started after the ADR-344 plan closes at its Phase 6** (David, 2026-09-10, Q-2). Not an appended phase and explicitly not folded into ADR-344 Phase 3: three of ADR-344's four remaining phases change engine or install state, and its Phase 5 (`isPlayable`'s default flip, written from IR) has the widest blast radius in that plan — modeling the lifecycle against a `GameEngine` those phases are still moving would mean modeling it twice. ADR-344's plan keeps its "D1–D8 only" scope line unamended, and this ADR stays DRAFT in the interval, which is what a DRAFT ADR is for.

**D7 — The phase stays inside `GameEngine`; what reaches outward is the optionality it disproves** (David, 2026-09-10, Q-3). Surveyed against every scenario that touches an engine — building, play testing, unit testing, IDE context reads, publishing — **no consumer outside the engine needs to read the phase.** Building and publishing construct no engine at all. `EngineIntrospection` (`introspection/introspect.ts:105`) is `actions`/`traits`/`behaviors`/`messages`, built from world, registry and language: entirely static, wanting no lifecycle state. Hosts (`BrowserClient`, `bridge`, `runtime`, transcript-tester) *call* phase-gated methods and never ask the phase. So the discriminant is not exported and `TurnEngine` does **not** gain a `phase` field — the turn pipeline runs in exactly one phase, and handing it the discriminant would invite branching on a decision it never has to make.

What does change outward:

- `TurnEngine` (`turn/context.ts:102`) — `story` and `channelService` stop being `| undefined`. Both are declared possibly-absent today at call sites reachable only while playing.
- `ISaveRestoreStateProvider` (`session/save-restore-service.ts:133`) — `getStory()` stops returning `Story | undefined`, for the same reason.
- `packages/bridge/src/bridge.ts:493` and `packages/runtime/src/bridge.ts:316` — both write `const context = this.engine.getContext()` then `context?.currentTurn ?? 0`. `getContext(): GameContext` is non-optional (`game-engine.ts:804`) and delegates to the throwing private getter, so the `?.` can never short-circuit and the `?? 0` is unreachable: if the context is absent the line throws a token earlier. **These two are the evidence that external hosts wanted this answer and could not get it** — they hedged against a phase they could not name, and the hedge is inert. The dead `?.`/`?? 0` goes in the same change, because `?? 0` is precisely the silent-wrongness shape this ADR exists to remove (a status line quietly reporting turn 0).

**D8 — `stop()` stays phase-tolerant while the other lifecycle methods become strict.** `BrowserClient.disposeAndReboot` (`platform-browser/src/BrowserClient.ts:750`) calls `stop('restart')` unconditionally and relies on it being a no-op when not running — its own comment says menu-path restarts have no turn in flight, so the engine never stopped itself. `stop` outside `playing` must therefore remain a no-op, not a refusal. Recorded because D2's "each method names the phases it accepts" reads as a licence to make every method strict, and this is the one that must not be.

**D8a — `resume()` is tolerant of `playing` too, on the same grounds** (David's ruling, 2026-09-10, session 772af3, on a full pros/cons: "go with option A"). **D8 as first written named only `stop()`, and that was an incomplete survey**: `resume` carries the identical tolerance at `game-engine.ts:630` (`if (this.running) return;`), pinned by `packages/engine/tests/unit/engine-resume.test.ts:37` — *"is a no-op while running… must not throw or disturb the session"* — and depended on by a host that calls it unconditionally.

That host is the branch-tester tree walker. `packages/branch-tester/src/tree-walker.ts:360` calls `game.reviveEngine?.()` — `engine.resume()` through `bootstrap/src/index.ts:378` — on **every test line**, under a comment that states the dependency outright: *"A prefix ending on the card that ended the game leaves the engine stopped; the line's own cards still run (fork-on-the-death-card is a legitimate shape). Harmless when the engine is running."* The common case is a prefix that did not end in death, so the engine is `playing` and `resume` returns early. A strict `resume` throws on every non-death line of every tree.

So `resume` accepts `stopped` and tolerates `playing`; it refuses `empty` and `ready`. The distinction D1 was written to deliver is untouched — `resume` still stops reading `this.channelService` to tell "never started" from "started, then stopped," which is this ADR's motivating evidence.

**Why the alternative was rejected rather than merely not chosen.** Making `resume` strict is defensible on D2's own terms, and its honest form is for the tree walker to *ask* the phase instead of guessing — `if (game.isStopped?.()) game.reviveEngine()`. But that requires phase information to reach outside `GameEngine`, and **D7 ruled explicitly, on a survey of every engine-touching scenario, that no consumer outside the engine needs to read the phase.** Option B is therefore not an implementation detail; it is a challenge to D7's load-bearing premise, and it would additionally widen this ADR's Scope to `packages/branch-tester` and `packages/bootstrap`. If a later session wants it, it is raised as an amendment to D7, not decided inside an implementation phase.

**D9 — The `stopped` phase carries no reason; the reason is an emitted event and stays one** (David, 2026-09-10, Q-4: "if there is a reason, it gets emitted to one of the message lists"). `stop` (`game-engine.ts:644`) already publishes it — `createGameEndingEvent(reason)`, then the reason-specific `createGameWonEvent` / `createGameLostEvent` / `createGameQuitEvent` / `createGameAbortedEvent`, then `createGameEndedEvent(reason, session, details)` — all through `emitGameEvent`, which fans to listeners and buckets into `turnEvents`. The streams are the record of *why*; engine state is the record of *what phase*.

Putting the reason on the phase as well would be **one fact stored twice — the exact defect this ADR was written about**, where `story` and `_context` hold one fact in two fields and the code cannot know they agree. A modeling ADR that introduced a second instance of its own complaint would not be worth accepting.

The `stopped` phase is therefore `{ name: 'stopped'; story; context }`, distinguished from `ready` by its discriminant and nothing else — which is all any reader needs, since no reader consults the reason after `stop` returns. The one construction that would have wanted it (gating `resume` by reason: permit after `'defeat'`, refuse after `'quit'`) is a behavior change nobody asked for, would break `bootstrap`'s unconditional `reviveEngine()` (`bootstrap/src/index.ts:377`), and is not smuggled in here. Adding a field to a discriminated union later is a one-line change; removing one that hosts have begun reading is not.

**D10 — `restart` is engine disposal, not a phase transition; the four states are a closed set** (David, 2026-09-10, Q-5). Two independent places say so. `createRestartAckEvent` (`game-engine.ts:686`, citing ADR-248): on confirmed restart the engine *does not rebuild in place* — it renders the acknowledgment, stops with reason `'restart'`, and the client owns the reboot via its own boot path. `BrowserClient.disposeAndReboot` (`platform-browser/src/BrowserClient.ts:750`) is that client half: `stop('restart')`, fence the play feed, then `reboot()`, which builds a fresh story, world and engine. The old engine ends at `stopped` like any other ending and is discarded; the "restarted engine" is a different object beginning at the first state.

So there is no fifth state and no back-edge to the first: `empty → ready → playing ⇄ stopped`, with `resume` the only back-edge. **What would falsify this**: any host re-installing a story into a stopped engine. None exists — `installStory` refuses a second call, and the one host that has a restart path at all, `platform-browser`, builds a fresh engine. Measured 2026-09-10: grepping `restart`/`reboot` across `packages/bridge/src`, `packages/runtime/src` and `packages/bootstrap/src` returns nothing — those three have no restart path to get wrong.

Recorded because a future reader will likely assume otherwise: the *world* object **is** reused across a Zifmia restart (cleared and repopulated). That is a world-model lifecycle, not an engine one, and it does not touch this decision.

**D11 — The state names describe a condition, not an outcome: `empty → ready → playing ⇄ stopped`** (David, 2026-09-10, Q-6, naming half). The first draft mixed grammatical categories — `bare` an adjective, `playing` a gerund, `installed` and `stopped` past participles — so a reader could not tell whether the field recorded *what happened last* or *what is true now*. It records what is true now, because **every consumer is a guard**, and a guard asks what it may do, never what happened.

Two renames follow. `installed` → **`ready`**: `installed` names the action performed *on* the engine rather than the condition it is *in*, and the codebase already names that exact moment — `onEngineReady` (ADR-343) fires at the end of `installStory`, so an engine in `ready` is precisely one that has fired it. `bare` → **`empty`** (David's preference, over `new`): `new` is temporal rather than conditional and goes stale — an engine untouched for an hour is not "new" but is still in that state — and it reads badly beside `new GameEngine()`. `empty` states the condition: no story in it. `playing` and `stopped` stand, both reading cleanly as conditions.

**D12 — `resume()` emits `game.resumed`, and this ADR carries the fix** (David, 2026-09-10, Q-6, event half: "it's okay to include it — we can expand to core"). `resume()` (`game-engine.ts:629-639`) sets `running = true` and emits nothing, while every sibling transition emits: `installStory` → `game.story_loading`/`game.story_loaded`, `start` → `game.initialized`/`game.starting`/`game.started`, `stop` → `game.ending`/reason-specific/`game.ended`. Rule 10 calls a silent state change a bug, and this one sits on the transcript-tester RETRY path via `bootstrap`'s `reviveEngine()` (`bootstrap/src/index.ts:377`), so a session can go dead-to-live with no stream record — anyone reconstructing a session from events sees a game that ended and then kept taking turns.

**One event, not a pair.** `GameEventType` (`core/src/events/game-events.ts:195`) pairs an `-ing` intent with an `-ed` completion for transitions that have a middle (`GAME_STARTING`/`GAME_STARTED`, `SESSION_SAVING`/`SESSION_SAVED`), but carries `PC_SWITCHED` alone for one that does not. `resume` is atomic — a synchronous flip after its guard, with nothing that can fail in between — so it follows the `PC_SWITCHED` precedent: `GAME_RESUMED: 'game.resumed'`, past tense per rule 10, emitted through `emitGameEvent` like its siblings. The payload's exact shape is the implementing session's, matching the neighbouring creators in that file.

**This makes the ADR no longer a pure refactor.** D1–D11 change no behavior; D12 adds an event that anything consuming the game event stream will now see. The plan owes it an acceptance criterion of its own, and the two must not be verified as one thing.

**D13 — The implementing session amends ADR-344 D6a in the same commit as the code.** D4 changes how D6a is realized, and ADR-344 D6a (`adr-344-…:136`) quotes its refusal verbatim — `Cannot start: no story installed — call installStory() first.` D2 replaces that with a refusal naming the phase it found, so the quoted string goes stale inside an ACCEPTED ADR unless someone amends it. The owner is the implementing session and the trigger is the commit that lands D2, on ADR-344's own precedent: its D5 and D7 owed amendments to ADR-289 D4 and ADR-327 D9, written by the implementing session in the same commit and gated by an AC (there, AC-4 and AC-5; here, AC-8). An unowned flip is how a corpus of Status lines stops being trustworthy.

**D14 — `game.resumed` must render no prose, and that is verified rather than assumed.** D12 adds an event to a stream that already has consumers, and the one that matters is the transcript goldens: `resume` is the RETRY path, so an event that reaches rendered output would shift pinned recordings — and the Dungeo walkthrough chain is this repository's baseline gate.

Traced 2026-09-10 through `packages/engine/src/prose-pipeline/pipeline.ts`: an unrecognized `game.*` type falls past the `switch` (`:318`) to `default:` (`:349`), is not `platform.`-prefixed, and reaches `handleGenericEvent` (`handlers/generic.ts:67`), which returns `[]` when the payload carries no `message`/`text` (`:73-82`) and no language template is registered under the event type (`:88-96`). So the event renders nothing **on two conditions**: its payload carries neither `message` nor `text`, and `lang-en-us` registers no `game.resumed` template. Both are conditions the implementation must hold, not properties it inherits — hence AC-6.

## Acceptance Criteria

Each names the command that decides it and is graded per DevArch's self-verifying test: does the AC's own mechanism detect the failure of its premises, or does a premise need establishing first?

1. **AC-1 (D1, D2, D11) — the phase is the only way lifecycle is read.** After the change, `grep -n "this.running\|this.story\b\|this._context\|this.channelService\|this.commandExecutor" packages/engine/src/game-engine.ts` returns no line that is a lifecycle *guard* — every remaining hit is a field write or a non-lifecycle read. The four members are named `empty`, `ready`, `playing`, `stopped`. **SELF-VERIFYING** — a surviving proxy guard shows up in the grep that defines the criterion.

2. **AC-2 (D2, D3) — one refusal per method, naming the phase it found.** Four rejection tests in `packages/engine/tests/unit/`: `installStory` outside `empty`, `start` outside `ready`, `resume` outside `stopped`, `executeTurn` outside `playing`. Each asserts the refusal names the phase actually found, and each must fail if its guard is deleted. Replaces `story-install-order.test.ts:94`'s guard-*order* pin, which becomes meaningless once there is one guard per method. **SELF-VERIFYING**.

3. **AC-3 (D7) — the optionality the phase disproves is gone.** `TurnEngine.story` and `.channelService` and `ISaveRestoreStateProvider.getStory()` no longer carry `| undefined`; `bridge.ts:493` and `runtime/src/bridge.ts:316` no longer carry `?.`/`?? 0`. Verified by per-package `npx tsc --noEmit` for `engine`, `bridge` and `runtime` plus `./repokit build dungeo` exiting 0 — **explicitly not** by `npx tsc --noEmit` at the repo root, which carries `files: []` and four project references and therefore never sees any of these packages (ADR-344 AC-3 records the session where that check was cited as evidence and meant nothing). **SELF-VERIFYING**.

4. **AC-4 (D8) — `stop()` stayed tolerant.** A test calls `stop('restart')` on a `ready` engine and on a `stopped` engine and asserts both are no-ops: no throw, no emitted event. Must fail if `stop` is made strict alongside its siblings. **SELF-VERIFYING** — this is the one criterion whose purpose is to catch over-application of D2.

5. **AC-5 (D12) — `resume()` emits exactly one `game.resumed`.** A test subscribes, drives `start` → `stop('defeat')` → `resume`, and asserts exactly one `game.resumed` event, past-tense type, no `-ing` partner. **SELF-VERIFYING**.

6. **AC-6 (D12, D14) — the new event renders nothing, and the goldens prove it.** Two checks, in order: a pipeline test asserting `ProsePipeline` yields zero blocks for a `game.resumed` event, and `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` returning **952 passed across 17 transcripts** with all 17 goldens matched — the count measured on `main` 2026-09-10 before any of this work. One run: the chain is deterministic at the pinned seed. **PREMISE-DEPENDENT** — the chain passing proves nothing unless `game.resumed` actually fires on some path the chain drives, which it may not; the pipeline test is the premise check that makes the golden result meaningful.

7. **AC-7 (D10) — the state set is closed.** A test asserts `installStory` on a `stopped` engine refuses, pinning that there is no back-edge to `empty` and no re-installation. **SELF-VERIFYING**.

8a. **AC-9 (D8a) — `resume()` stayed tolerant of `playing`.** A test calls `resume()` on a `playing` engine and asserts it is a no-op: no throw, no emitted event, and the session undisturbed (a following `executeTurn` still succeeds). A second assertion pins the host dependency the ruling rests on: `resume()` on an `empty` engine and on a `ready` engine both refuse, naming the phase found. Must fail if `resume` is made strict alongside its siblings. **SELF-VERIFYING** — the mirror of AC-4, and it exists for the same reason: D2 reads as a licence to make every method strict, and two methods must not be.

8. **AC-8 (D13) — ADR-344 D6a is amended in the same commit as D2.** Its quoted refusal string no longer contradicts the shipped one. **PREMISE-DEPENDENT** — nothing mechanical reads an ADR's prose, so this is verified by inspection of the commit, and the premise (that D2 landed) is AC-2's.

**Not an acceptance criterion, deliberately**: "no behavior change." D1–D11 change none, D12 changes one, and verifying them as a single claim is what would let the event's blast radius hide inside a refactor's green suite. AC-5 and AC-6 gate D12 alone.

## Consequences

- Every future engine method gets a phase to check instead of a proxy to choose, and an unreachable guard becomes a compile-time narrowing failure rather than a live line no test exercises.
- The three sentences that currently report "no story" collapse to one, which changes user-visible error text for hosts that surface engine errors — small, but it is a text change and belongs in the plan's acceptance criteria, not discovered at review.
- `resume()` stops depending on `channelService` existing, removing a coupling between the revival seam and the channel bootstrap that nothing documents.
- **D12 is the one outward-visible change**: anything subscribed to the game event stream begins seeing `game.resumed`. Consumers were traced rather than assumed (D14) — the prose pipeline renders it as nothing under two stated conditions, and AC-6 holds both. Channel-I/O consumers receive it as an ordinary lifecycle event, the same way they already receive `game.ended`.
- One more concept for a reader to learn, in a class that already carries a lot. The honest cost is that `GameEngine` grows a type before it shrinks a behavior.

## Session

Session b314e2, 2026-09-10, branch `main`. Written after ADR-344 Phase 2 reached 764 passed / 7 skipped on the guard reorder, which is the change that made the underlying question visible.
