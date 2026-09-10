# ADR-344: The player role-holder invariant belongs at the install seam

**Status**: **ACCEPTED** (David, 2026-09-10, session 7776c8 — "accept ADR-344". Written the same session on `main` after the diagnosis of GH #278 showed the defect was not the test fixture it was filed as. All four open questions resolved by interview before review: Q-1 → D5, Q-2 → D6, Q-3 → D7, Q-4 → D8. `adr-review` ran twice: 13/20 NEEDS WORK with six findings folded, then — at David's "review it again" — three further findings, two of them blockers (D6 left `GameContext.player`'s pre-install state unspecified; D7's default flip silently broke `packages/helpers`' author-facing builder), both folded, ending at 21/21 READY FOR IMPLEMENTATION. **Acceptance authorizes no implementation by itself.** D9 already shipped in `f3d3d24a3`; D1–D8 are design and need their own plan, and D5 and D7 are the two that change author-visible behavior. The amendments D5 and D7 owe to ADR-289 D4 and ADR-327 D9 are written by the implementing session, in the same commit as the code, gated by AC-4 and AC-5.)

**Scope**: `packages/engine/src/install/` (the install step list and one new step), `packages/engine/src/install/story.ts` (the `createPlayer` contract's documented obligation), `packages/engine/src/game-engine.ts` (the constructor's `player` parameter), `packages/bootstrap/src/index.ts` (the fabricated placeholder player), `packages/story-loader/src/loader.ts` (`finalizeRoleHolder`'s placement fallback), `packages/world-model/src/traits/actor/actorTrait.ts` (the `isPlayable` default), `packages/helpers/src/builders/actor.ts` (the new `.playable()` opt-in), the hand-written stories that build a protagonist and must now opt in — `stories/concealment-test`, `stories/armoured`, `stories/family-zoo-tutorial`, `stories/channel-service-test`, `packages/devkit/fixtures/basic-story`, and `packages/engine/tests/stories/`, `packages/engine/tests/test-helpers/setup-test-engine.ts` and the nine story-less engine tests that lean on its player, `packages/devkit/templates/browser/` plus `packages/devkit/templates/story/index.ts.template` and `packages/devkit/src/standalone/browser-build.test.ts` (D9), and amendment lines in `docs/architecture/adrs/adr-289-chord-routing-decided-once.md` and `adr-327-explicit-references.md`. No Chord change, no wire change, no rendered-text change.

## Date: 2026-09-10

## Parent

ADR-327 D10 (design C, ruled 2026-08-26 — the world is built first and the player found second; `createPlayer` is a lookup, `playable` is a reserved bare composition). ADR-334 (the engine turn pipeline and, in its A1 residue, `installStory` as `STORY_INSTALL_STEPS`) — this ADR is a finding *against* that refactor, not an extension of it. ADR-132 is deliberately **not** cited as authority: it is ancient, and the player model below is read from the code as it stands.

**Related**: `docs/work/archive/refactoring-survey/assessment-20260907-umbrella.md` — the umbrella assessment of the refactoring survey, whose Impact table graded ADR-334 as *"On the seam: a vocabulary of stage names the runtime can cite, though nothing obliges it to."* That clause describes this defect in advance. GH #278 (filed 2026-08-18, the symptom); GH #395 (closed 2026-09-10, the neighbouring fixture gap).

## Context — verified, not assumed

Every file and line below was read this session at `87f06800c`.

### The player model as the code has it

A story's characters are ordinary world entities. Chord marks the eligible ones `playable` (`packages/chord/src/ir.ts:258`), the `before the game starts` block assigns the role with `change the player to`, and the analyzer refuses a target that is not `playable` (`packages/chord/src/analyzer.ts:5585`). **Exactly one entity holds the role at a time, and the role can move to any other playable actor** — carrying `me`, `myself`, `self` with it, because those name the role and never a character (`packages/world-model/src/traits/actor/playerRole.ts:23`, `:53`).

### Where the invariant is enforced today

For Chord stories, in the loader and nowhere else. `finalizeRoleHolder` (`packages/story-loader/src/loader.ts:763`) settles the role holder, maps the `player` sentinel, and — explicitly — places an unplaced holder in the first declared room. Its comment states the invariant in one line (`:780`):

> an unplaced NPC is offstage on purpose, an unplaced PC is nowhere to play.

`ChordStory.createPlayer` (`:730`) is then a lookup that stamps `actor.isPlayer = true` and calls `addPlayerRoleVocabulary`.

### What the engine's seam actually does

`createPlayerStep` (`packages/engine/src/install/create-player.ts:17`) is three statements: call `story.createPlayer(world)`, put the result in the draft, `world.setPlayer(player.id)`. **It validates nothing** — not that the entity is placed, not that it carries an `ActorTrait`, not that it is playable, not that it holds the role vocabulary. The next step in the frozen list (`install/steps.ts:44`, order `initializeWorldStep` → `createPlayerStep` → `listenerTraitStep` at `:49-51`) then adds a `ListenerTrait` to it unconditionally (`install/listener-trait.ts:25`). The engine commits to the entity as the player before anything has established that it can be one.

So the invariant holds for Chord because the loader upholds it, and silently does not hold for a `Story` written directly in TypeScript — a path core-concepts states is supported.

### The fixture is one instance of that, and it fails on three counts

`createMinimalStory()` (`packages/engine/tests/test-helpers/setup-test-engine.ts:87-94`) is exactly such a hand-written `Story`:

1. **It builds in `createPlayer` instead of looking up** (`:88`) — which D10's ordering makes illegal, and is why the entity cannot have been placed by the world build.
2. **The built actor is never placed.** `initializeWorld` (`:91`) creates a room and moves nothing into it. No loader fallback reaches a hand-written story.
3. **`world.createEntity('You', EntityType.ACTOR)` grants no `ActorTrait`.** `DEFAULT_TRAITS` maps `SCENERY` and nothing else (`packages/world-model/src/world/default-trait-registry.ts:31-33`, conservative by design per ADR-189). So the engine's player has neither `isPlayer` nor `isPlayable`.

The third is the sharp edge once `playable` exists: **the engine runs with a player that its own role-switching would refuse to switch to**, at `packages/engine/src/game-engine.ts:790` ("does not have ActorTrait") and `:794` ("is not playable"). Probed directly this session — `setupTestEngine()` then `installStory(createMinimalStory())` yields `a01@r01, a02@UNPLACED`, with `a02` the entity `world.getPlayer()` returns.

### The refactor's part in this, stated plainly

The gap is older than the refactor. Pre-refactor `setStory` had the identical three lines and the identical absent validation (`git show c0efdcd6c^:packages/engine/src/game-engine.ts`, the `createPlayer` / `context.player` / `setPlayer` sequence). **What the refactor did was carry it across faithfully and discard the prose that was compensating for it.** The old comment read:

> `createPlayer` is now a lookup of that character, not a build, and a story places it in `createPlayer` (where the world is finished) rather than in `initializeWorld`.

`install/create-player.ts` keeps the first half and drops the second — the half that told a story author where placement belongs. An informal contract was trimmed in an extraction that encoded nothing in its place.

That is an alignment failure by the project's own stated test. Core-concepts: *"A change that does neither — that serves the platform's own internal tidiness while the seam stays where it was — is a change to question rather than a detail to sort out later."* ADR-334 was scoped as "decompose GameEngine", which is internal-tidiness framing, and it delivered exactly what it asked for: eighteen named steps with `requires:` edges that **look** like a contract made explicit, while the one contract Chord leans on is encoded in none of them.

### The spanking: nothing tested the seam, and the one signal that existed was retired

This is the part worth being blunt about, because every condition for catching it was present and none of them fired.

- **The survey's own assessment predicted the shape.** `assessment-20260907-umbrella.md` graded ADR-334's seam contribution as *"a vocabulary of stage names the runtime can cite, though nothing obliges it to."* The survey proceeded through sixteen phases without anyone asking what else the new step list failed to oblige.
- **764 engine tests pass with an invalid player.** Not one assertion in the package checks that the installed role holder is placed, is an actor, or is playable. A suite that large having zero coverage of the seam's central invariant is the finding, not an incidental gap.
- **The one signal that did exist was removed as a side effect.** GH #278's 24-per-run `evaluateScope: No location found for actor` warnings came from `packages/world-model/src/world/WorldModel.ts:1680`. `evaluateScope` now has no caller anywhere in `packages/*/src` outside `WorldModel` itself — the refactor took it off the turn path. The defect did not get fixed; it got quiet. Anyone re-checking #278 by grepping CI noise would have closed it as resolved.
- **#278 was open the whole time.** Filed 2026-08-18, it names `setup-test-engine.ts` and `game-engine.ts`'s `createPlayer` block by line. The refactor rewrote both. Sixteen phases and roughly 8,100 inserted lines of engine change passed directly through the code an open issue was pointing at, and the issue was neither closed nor consulted.

A refactor that moves a seam's code without testing the seam's invariant has not verified that it preserved behavior; it has verified that the tests it already had still pass. Those are different claims, and only the second one was ever made.

### The second spanking: a REAL-PATH criterion that asserted both ends and not the middle

`playable` was not forgotten. **ADR-327's own scope line names the missing step verbatim** (line 20): *"the `playable` create-block line (parser → IR → loader sets `ActorTrait.isPlayable`, D9)"*. Parser and IR shipped. The loader write did not, and has not for the three weeks since D10 was ruled on 2026-08-26.

What let that pass is the shape of the acceptance criterion. ADR-327 AC-5 is labelled **"compile and REAL-PATH"** (line 460) and asserts, at one end, that a non-`playable` target produces the named analyzer error; at the other, that the clause's turn ends with `game.pc_switched`, that the next turn's `after the player entering` fires for the new PC and not the old, and that two switches in one turn raise the diagnostic. **It never asserts the flag between them.**

Both ends are independently satisfiable without the middle. The analyzer end is satisfied by the analyzer, which reads the IR and never consults the trait. The runtime end is satisfied by the switch machinery, which emits its event and moves the role whether or not the guard could have refused. So a criterion that ran the real path, on a real engine, passed while the step the decision was named for did not exist — and `adr-review` scored the ADR, David accepted it, and nothing anywhere noticed.

This is the same defect as the one above, one layer down, and the two together are the finding: **exercising the real path is not the same as asserting the state the decision is about.** DEVARCH rule 13a asks for a REAL-PATH test to stop a stub standing in for an owned dependency; it does not, by itself, stop a test from running the genuine article and checking everything except the thing at issue. A pipeline's ends can both be green while its middle is absent, and here they were, for three weeks, on an ACCEPTED decision with an explicit criterion pointed straight at it.

### The third spanking: the file that ships to authors is the one the type checker cannot see

Found by David on plover, 2026-09-10, and verified here the same session. ADR-334 A1 Phase 4 renamed `GameEngine.setStory` to `installStory` (`c0efdcd6c`). That commit touched **98 files** and updated every consumer the toolchain can see — twelve story-loader test files, `boot-engine.ts`, `boot-turns.ts`, `stories/dungeo/src/browser-entry.ts`, `stories/armoured/src/browser-entry.ts`, `stories/concealment-test`, `stories/family-zoo-tutorial`, `stories/channel-service-test`. As a sweep it was thorough.

It missed exactly three files, and they are the three that ship to authors:

| file | line | call |
|---|---|---|
| `packages/devkit/templates/browser/browser-entry.ts.template` | 122 | `engine.setStory(story)` |
| `packages/devkit/templates/browser/chord-browser-entry.ts.template` | 197 | `engine.setStory(story)` |
| `packages/devkit/templates/browser/playground-entry.ts.template` | 137 | `engine.setStory(story)` |

`setStory` does not exist; `game-engine.ts:383` declares `installStory` and nothing else. So the scaffolded entry point fails at runtime with `engine.setStory is not a function`.

**The mechanism is a file suffix.** `stories/dungeo/src/browser-entry.ts:158` was updated to `installStory`. `packages/devkit/templates/browser/browser-entry.ts.template:122` was not. Same code, same call, one suffix apart — and the second is the one an author actually receives, because `packages/devkit/src/standalone/init-browser.ts:156` scaffolds it into their project. These files are invisible to `tsc` twice over: they sit outside devkit's `include: ["src/**/*"]`, and they end in `.template` regardless. No type check, no test, no lint reaches them.

`browser-core.ts:919` reads `playground-entry.ts.template` for the playground build, which is how this surfaced on plover rather than in anyone's test run.

**And a real-path test already covered this file and could not fail.** `packages/devkit/src/standalone/browser-build.test.ts` is headed *"No stubs of esbuild or the template — this is the integration's acceptance"*. Its second case scaffolds the real template, runs the real browser build, and asserts the bundle exists and is non-empty. But `runBuildBrowserCommand` is esbuild, which strips types without checking them, so a bundle containing `engine.setStory(story)` is non-empty and every assertion below that line passes. The test's own comment at line 99 names `tsc` — as the *author's* `npm run build`, explaining why `version.ts` must be seeded — and the test never invokes it. **The check already existed**: `runBuildCommand` runs `execSync('npx tsc')` at `build.ts:122` and exits 1 on a type error. The test chain simply went `init → init-browser → build-browser`, skipping the one step that type-checks.

Set beside the other two, this is the least subtle and the most preventable. The first two are invariants asserted in one layer and unenforced in the next — arguably hard to see. This is a **public method rename with three un-typechecked consumers**, mechanically catchable by any check that compiles the templates, and it shipped to the author-facing tool. Nothing in the survey's sixteen phases, nor its gate, nor `tsc --noEmit`, could have caught it, because none of them can read the files.

The common thread across all three: **each was verified by a check that structurally could not observe the thing that broke.** The install pipeline's green suite never asserted the role holder. ADR-327's REAL-PATH criterion asserted both ends of a pipeline and not its middle. And a repo-wide type check swept every consumer it could see, which by construction excluded the three that matter most.

## Decision

**D1 — The install seam validates the role holder.** A new install step named **`validate-role-holder`** — following the pipeline's own convention that a step which validates says so in its name (D8) — is added to `STORY_INSTALL_STEPS` with `requires: ['create-player']`, running immediately after `create-player` and before `listener-trait`. It refuses installation unless the entity `story.createPlayer` returned satisfies all three:

- it is located somewhere (`world.getLocation(player.id)` is defined) — **a hard error, with no fallback placement anywhere** (Q-1 resolved, David, 2026-09-10: option c),
- it carries an `ActorTrait`,
- that trait's `isPlayable` is true — a real condition only after D7, which gives the field a producer (Q-3 resolved, David, 2026-09-10).

The failure is a thrown error naming the entity and which condition failed, in the wording the language uses — "nowhere to play" for the placement case. Per project convention, the ADR number is cited in a code comment above the throw, never in the message text.

**D2 — The obligation is documented on the contract, not only in the step.** `Story.createPlayer`'s doc comment in `packages/engine/src/install/story.ts` states what the returned entity must satisfy, restoring in contract form the half of the pre-refactor comment that was dropped.

**D3 — The test fixture is brought into compliance rather than special-cased.** `createMinimalStory()` builds and places its actor in `initializeWorld`, gives it an `ActorTrait`, and returns it from `createPlayer` as a lookup. `setupTestEngine()` stops creating a player and a room of its own; the story supplies both. The nine engine test files that use the helper without installing a story install a generated temp story instead of hand-building a player — `command-executor.test.ts:40` currently calls `story.createPlayer(world)` directly, outside any install, which is the same violation in a second place.

**D4 — The invariant gets a test at the seam, not only in the fixture's shadow.** At least one test asserts that a `Story` whose `createPlayer` returns an unplaced, non-actor, or non-playable entity fails installation, and one asserts that the installed role holder of a compliant story is placed, actor-trait'd, and playable.

**D5 — The loader's first-declared-room fallback is removed, and ADR-289 D4 is amended to say so.** `finalizeRoleHolder`'s placement fallback (`loader.ts:775-782`) goes; every story places its own protagonist, Chord and TypeScript alike, and one rule governs the seam. ADR-289 D4 currently ends its placement paragraph "keeping the first-declared-room fallback only for a player with no placement line at all" — that clause is struck by amendment, leaving the rest of D4 (the `in` / `on` / `starts in` unification, which is D4's actual subject) untouched.

Measured before the ruling, not assumed: of the 85 in-repo Chord sources carrying `change the player to`, **64 place the protagonist explicitly, 19 rely on the fallback, and all 19 of those are `packages/chord/tests/fixtures/` compiler fixtures — no shipped story relies on it** (measured 2026-09-10 at `87f06800c`). Those fixtures are compiled rather than installed, so the fallback's removal may not reach them at all; whichever way, the change is invisible to players of every real story.

**Re-measured at implementation, 2026-09-10 (session 86894c), and the totals corrected.** The corpus is **80** Chord sources, not 85: `git grep -l "change the player to" -- "*.story"` returns 80 files at `HEAD` and 80 at `87f06800c` itself, so the 85 was a mis-count at the time (most likely a grep that swept in the two `.ts.template` files and three `.swift` fixtures that quote the same line), not a corpus that has since shrunk. Of the 80, **61 place the protagonist explicitly and 19 rely on the fallback** — and the 19 are the same 19: all `packages/chord/tests/fixtures/` files, **0 shipped stories**. The material half of AC-4's premise therefore holds exactly as recorded; only the two totals move, 85 → 80 and 64 → 61.

Sharper than the original note, too: **17 of the 19 never reach the loader at all** — nine `gates/` and eight `malformed/` fixtures consumed only by `@sharpee/chord`'s parser and analyzer suites, several of which pin diagnostic line numbers (`expect(errors[0].span.line).toBe(14)`), so adding a placement line to them would break the assertion it was meant to tidy. The two that do reach the loader — `death.story` (world-initialized in `story-loader/tests/death-constructs.test.ts`) and `traits-basic.story` (`createStory` only, for hatch binding) — do not depend on the fallback for placement: the death suite moves the protagonist explicitly before every scenario. Removing the fallback needed **no fixture edits**, which the green suites below confirm rather than predict.

**D6 — The player always comes from the story source; the engine never receives one at construction** (Q-2 resolved, David, 2026-09-10: *"the player always comes from the story source code, whether it's an existing story or you've generated a temp test story"*). `EngineOptions.player` is removed — it is required today (`game-engine.ts:229`) and every caller satisfies it with a placeholder that `installStory` discards seconds later. `packages/bootstrap/src/index.ts:274` fabricates an actor literally named `'player'`, calls `setPlayer` on it, and installs the story eighteen lines on at `:292`; nothing in the engine or the install steps ever removes the superseded entity.

**Corrected 2026-09-10 during Phase 1.** The original text read: *"Every Chord story booted through bootstrap carries this stray entity"*, on the evidence that `node dist/cli/sharpee.js --world-json --story stories/cloak-of-darkness/cloak.story` reports the protagonist as `a02` while `a01` appears in no projection, reasoned as the phantom being invisible to a filter that requires an `ActorTrait`. **Both halves were wrong.** `packages/bootstrap/src/index.ts:316-318` already removes the placeholder after `start()`, under a comment naming the exact leak the claim "discovered" — *"Remove it so it doesn't leak into world enumeration — e.g. project introspection showing a stray 'player' (ADR-184/185)."* `a01` was absent from the dump because it had been deleted, not because a projection filtered it.

What is true: **`packages/bridge/src/bridge.ts:195` and `packages/runtime/src/bridge.ts:170` fabricate the same placeholder and never remove it**, so native-subprocess and iframe-runtime hosts do carry it. And bootstrap's cleanup is itself the tell — a deletion that exists only to undo a fabrication the constructor forced. D6 removes both the fabrication and the workaround; on the bootstrap path what remains is the entity-id offset alone.

There is no legitimate case for a pre-story player: a caller with no story to install should generate a temp test story, which is what D3 asks the nine story-less engine tests to do.

**What `GameContext.player` is before install — amended 2026-09-10, session 7776c8, during Phase 1.** The original text said the field becomes `IFEntity | undefined` and that "two readers must handle it… no other reader exists in the class." That was scoped to `game-engine.ts` and is misleading: `player` lives on `GameContext`, which the whole package reads. The measured inventory is **nine reader sites across six files** — `turn/enrich-events.ts:27, :55, :71`, `turn/player-switch.ts:45`, `turn/ending.ts:31`, `turn/plugin-tick.ts:85`, `command/capability-dispatch-helper.ts:240, :281`, and `game-engine.ts:797, :1286`. Every one of them runs only during a turn, which only happens after `installStory`, so a nullable field would force nine sites to handle a case that cannot occur. Nine `!` assertions or nine dead guards is the same defect this ADR convicts elsewhere: a type saying "maybe" where the code means "always."

**So the mechanism changes, and the decision does not.** `installStory` **constructs** the `GameContext` rather than patching five fields onto one the constructor built. `this.context` is assigned once at `game-engine.ts:258` and nothing reads it before `installStory`, so nothing is lost. `GameContext.player` stays `IFEntity`, non-optional, and none of the nine readers change. The engine's own `context` field becomes optional and its 34 `this.context` sites route through a private accessor that throws "no story installed"; the public `getContext()` (`:760`) gains the same throw. One honest guard in one class replaces nine dishonest ones across six files.

This puts the uncertainty where the uncertainty is. The phantom player existed because the constructor built a context that needed a player before any story existed; building the context at install removes the cause rather than making its symptom nullable.

**D6a — `start()` requires a story** (David's ruling, 2026-09-10, during Phase 2). An engine with no story has no player, no world content and nothing to render, so starting one is meaningless. `start()` refuses — stated as its own contract rather than left to the context getter's incidental throw, so the requirement carries its own message instead of an implementation detail leaking out.

**Amended 2026-09-10, session 772af3, in the commit that landed ADR-345 D2 (its D13, gated by its AC-8).** This paragraph quoted the refusal verbatim as `Cannot start: no story installed — call installStory() first.` ADR-345 D4 replaced that bespoke `if (!this._context)` check with the statement that `start()` accepts the `ready` phase, so the shipped refusal now names the phase it found:

> `Cannot start(): the engine is in the 'empty' phase, and start() requires 'ready'. Call installStory() first.`

**The decision is unchanged; only its realization is.** D6a said "`start()` requires a story" and gave it a message of its own rather than an incidental throw, and both still hold — the requirement is now carried by the phase model instead of a hand-written guard, which is what ADR-345 was written to do. The remedy hint survives word-for-word because it was the useful half of the original string.

Amended here rather than left to drift on ADR-345's own precedent for this ADR's D5 and D7, which owed amendments to ADR-289 D4 and ADR-327 D9 and got them from the implementing session in the same commit, gated by AC-4 and AC-5. An unowned flip is how a corpus of Status lines stops being trustworthy.

This surfaced as a test asserting the opposite: `packages/engine/tests/game-engine.test.ts:208`, *"should start without a story if dependencies are provided"*, which was the pre-D6 contract written down. It is now a rejection test. D6 states where the player comes from; D6a states what follows — if the story is the only source of a player, an engine without one cannot run.

**D7 — `playable` is connected to the runtime, and the trait's default is flipped to match the language.** ADR-327 D9's unimplemented step is completed: the loader writes `ActorTrait.isPlayable` from `irEntity.isPlayable` at `loader.ts:1634`. Separately, `ActorTrait.isPlayable`'s class default changes from `true` to `false` (`actorTrait.ts:154`), so absence means what Chord means by absence — `playable` is opt-in, most persons are not, and the trait's default has been asserting the opposite.

Measured 2026-09-10 at `87f06800c`: across `packages/` and `stories/`, excluding tests and `_archive`, there are **32 `ActorTrait` constructions and none passes `isPlayable`**. Fifteen pass `isPlayer`. So the field is `true` for every actor in every story — Dungeo's troll, bat and robot included — and its single reader, `switchPlayer`'s guard at `game-engine.ts:793`, has never been able to fire. Flipping the default makes all 32 correctly non-playable; the loader gains the one write, and the handful of hand-written stories that have a protagonist (`concealment-test`, `family-zoo-tutorial`, `armoured`, `channel-service-test`, the devkit fixture, the engine's own test stories) opt in explicitly.

The half-measure to avoid is writing the flag while leaving the default `true`: every hand-built actor stays playable and the guard stays decorative for precisely the callers — TypeScript stories, which have no analyzer in front of them — it exists to protect.

**The author-facing builder gains an explicit opt-in.** `packages/helpers/src/builders/actor.ts:128` adds a bare `new ActorTrait()` and the builder exposes no way to set playability at all, while its own header calls it a builder for "players and NPCs" and its example is `actor('yourself')`. With the default flipped, every protagonist built through the documented author API would fail D1's third condition. The builder therefore gains a `.playable()` method, and an author writes `actor('yourself').playable().build()`. **It does not default to `true` for its own construction** — a silent `true` default one layer up is the same mistake that left `isPlayable` dead for three weeks, and the builder is the layer where an author would be least likely to notice it.

**ADR-327 D9 carries a pointer amendment** recording that its loader step was completed here. The decision itself lives in this ADR; ADR-327 is not reopened.

**Site-list corrections, 2026-09-10 (session 52e228, implementing).** D7's own list of
hand-written protagonists to opt in was short by two, both found before the flip landed
and both now opted in:

- **`stories/dungeo`.** The paragraph above names Dungeo's troll, bat and robot among the
  actors that correctly become non-playable, but Dungeo also has a hand-written
  `createPlayer` (`stories/dungeo/src/index.ts:683`) whose `ActorTrait` passed only
  `isPlayer: true`. Left alone, the flagship story would have failed
  `validate-role-holder` with `not-playable` at install. The walkthrough-chain gate
  would have caught it; the site list should have named it.
- **`packages/helpers/tests/fixtures/external-story/story.js`.** The REAL-PATH bundle
  fixture builds its protagonist through the documented author API —
  `actor('yourself').…build()` — which is exactly the case the builder paragraph above
  predicts. It now calls `.playable()`, making the fixture the worked example of the
  opt-in it argues for. Worth noting how it surfaced: the helpers vitest suite passed
  against source while the real path was broken, and only failed once `./repokit build`
  rebuilt the bundle with the flipped default. That is the same
  "check structurally incapable of observing what broke" pattern this plan has hit four
  times, and the same REAL-PATH test that caught the Phase 2 defect caught this one.

Beyond those two, sixteen test-side role holders across `engine`, `bootstrap` and the
engine's shared fixtures needed the same opt-in; each surfaced as a
`RoleHolderValidationError … is not marked playable` at install, which is the guard
doing its job rather than a defect. NPCs and bystanders in the same files were left
non-playable deliberately.

**Amendment ownership (both amendments).** The session that implements the decision writes the amendment into the target ADR's own file, in the same commit as the code, before that decision's acceptance criterion can be marked met: AC-4 gates D5's strike of ADR-289 D4's fallback clause, AC-5 gates D7's pointer note on ADR-327 D9. Neither target ADR's Status changes — both stay ACCEPTED; these are amendments, not supersessions.

**D8 — The unguarded story handoffs are named, and only `createPlayer`'s is closed here** (Q-4 resolved, David, 2026-09-10, by measurement). Audited 2026-09-10 at `87f06800c`: of the eighteen install steps, **three validate anything, and all three are the ones named `validate-*`** (`validate-config`, `validate-room-snippets`, `validate-combatant-health`). Validation in this pipeline is opt-in by naming convention.

Only four steps consume story-supplied input at all: `config` (read by six steps), `initializeWorld`, `createPlayer`, and the optional `initialize?`. **`config` is the only one guarded**, by a step deliberately placed first whose header already states the general lesson — *"every required field is read somewhere later without a guard, so a story missing one used to surface as a TypeError from whichever step touched it first — an engine stack trace where the author needed the field's name."* That reasoning was written for `config` and never carried across to the other three.

D1 closes `createPlayer`'s. The other two are recorded, not fixed:

- **`initializeWorld`** — nothing asserts the story built anything. A story with no rooms is a real possibility, and after D5 removes the first-room fallback it surfaces at `create-player` as an unplaced-protagonist error rather than at `initialize-world` as "this story has no rooms", which is the message the author needs. A `validate-world` step asserting at least one room would say the right thing at the right point.
- **`story-initialize`** — an optional hook with no post-condition. Lowest value of the three; listed for completeness, not urgency.

Neither is in this ADR's scope. They are named so the next person does not have to re-derive the audit.

**D9 — The scaffold test calls the type-check it already had.** The three files in `packages/devkit/templates/browser/` are repaired to call `installStory`, and `browser-build.test.ts`'s scaffold case gains one line — `await runBuildCommand([], projectDir)` — between seeding and bundling. No new machinery: `runBuildCommand` already runs `npx tsc` over the scaffolded project and exits 1 on failure, and the test already spies on `process.exit` to turn that into a test failure. A test rather than a CI gate, per this project's standing preference for local guards.

**Implemented and verified 2026-09-10, this session.** The guard was demonstrated to fail on the original defect before being trusted: with `setStory` restored, `src/browser-entry.ts(122,10): error TS2551: Property 'setStory' does not exist on type 'GameEngine'. Did you mean 'getStory'?`; with the fix in place, green.

**On its first run it found two more of the same class.** `StoryConfig.author` became `authors: string[]` under ADR-298, and four templates were never updated — `browser-entry.ts.template:23`, `chord-browser-entry.ts.template:125`, `playground-entry.ts.template:85`, and `story/index.ts.template:19`, the last emitting `author:` into every scaffolded story's config literal. All four repaired. Evidence: `pnpm --filter '@sharpee/devkit' test` — 27 files, 177 passing / 1 skipped (2026-09-10 00:50 CDT).

That a one-line guard surfaced two unrelated three-week-old breakages on first execution is the measure of how long the templates have been outside every check the repository runs.

This is outside the player-role subject of the rest of this ADR, and is recorded here because it is the third instance of the same failure and was found while the other two were being written. If it wants its own record, it should take one; it should not go unrecorded in the meantime.

## Acceptance Criteria

Each criterion names the command that decides it. AC-9 is met; the rest gate implementation.

1. **AC-1 (D1, D4) — the seam refuses an invalid role holder.** A `Story` whose `createPlayer` returns an entity that is unplaced, carries no `ActorTrait`, or is not playable fails `installStory` with an error naming the entity and the condition that failed. Three tests, one per condition, plus one asserting a compliant story's installed holder is placed, actor-trait'd and playable. Verified by `pnpm --filter '@sharpee/engine' test`. **SELF-VERIFYING** — each rejection test fails if the step is absent, reordered out of position, or drops a condition.

2. **AC-2 (D3) — the engine suite runs on story-supplied players only.** `setup-test-engine.ts` creates no player and no room; `createMinimalStory` builds and places its actor in `initializeWorld` and returns it from `createPlayer` as a lookup; the nine story-less test files install a generated temp story; `command-executor.test.ts` no longer calls `story.createPlayer(world)` outside an install. Verified by `pnpm --filter '@sharpee/engine' test` at its current count (80 files, 764 passing / 7 skipped at `87f06800c`), and by `setupTestEngine` itself containing no `createEntity` call — `createMinimalStory` still creates a `You` actor, in `initializeWorld`, which is the point of D3, so a repo-wide grep for that pattern is the wrong check and would never pass. **SELF-VERIFYING.**

3. **AC-3 (D6, D6a) — no caller fabricates a player, and a story-less engine refuses to start.** `start()` on an engine with no installed story throws, asserted by `game-engine.test.ts`'s rejection test.  `EngineOptions.player` is gone from the constructor's type; `GameContext` is constructed by `installStory`, not patched, and `GameContext.player` remains non-optional; `packages/bootstrap/src/index.ts` creates no `'player'` entity; `node dist/cli/sharpee.js --world-json --story stories/cloak-of-darkness/cloak.story` shows the protagonist at `a01` rather than `a02`, with no unaccounted id. Verified by that command plus **`./repokit build dungeo`** exiting 0. **Not** by `npx tsc --noEmit` at repo root: `tsconfig.json` carries `files: []` and references only four projects (`core`, `stdlib`, `extensions/conversation`, `cloak-of-darkness`), so it never type-checks `engine`, `bootstrap`, `bridge`, `runtime`, `story-loader`, `world-model` or `devkit`; and consumers resolve `@sharpee/engine` through `dist/index.d.ts`, so a source change is invisible to them until that package is rebuilt. Measured 2026-09-10: after removing `player` from the constructor, the root check still exited 0 with zero errors, while `./repokit build` and per-package checks surfaced `TS2353` at `bootstrap:287`, `bridge:204` and `runtime:179`. **SELF-VERIFYING** — the world dump is the observation the defect was found with.

4. **AC-4 (D5) — one placement rule, and ADR-289 says so.** `finalizeRoleHolder` contains no first-room fallback; a Chord story whose protagonist has no placement line fails installation; ADR-289 D4's "keeping the first-declared-room fallback" clause is struck by an amendment written in `adr-289-chord-routing-decided-once.md` in the implementing commit. Verified by the new refusal test, by `./sharpee test branch-stories/fernhill` and the Dungeo chain still passing, and by reading the amended ADR. **PREMISE-DEPENDENT** — premise: that no shipped story relies on the fallback. Established by the measurement recorded in D5 (85 sources, 64 explicit, 19 fixtures, 0 shipped, 2026-09-10 at `87f06800c`), to be re-run at implementation.

5. **AC-5 (D7) — `playable` reaches the runtime.** `ActorTrait.isPlayable` defaults to `false`; the loader writes it from `irEntity.isPlayable`; a Chord character without `playable` fails `switchPlayer`'s guard, and one with it passes; ADR-327 D9 carries the pointer amendment. Verified by a new world-model test on the default, a story-loader test asserting the written flag for both cases, an engine test driving `switchPlayer` both ways, a helpers test that `actor(...).build()` is non-playable while `actor(...).playable().build()` is playable, and green suites for the six hand-written stories that now opt in. **SELF-VERIFYING** — the write is pinned in both directions: with the class default now `false`, dropping the loader write fails the POSITIVE assertions (a `playable` character reads back non-playable), while the negative assertion pins that the write is conditional on the IR rather than a blanket `true`. Before D7 neither could fail, which is the exact failure ADR-327's own AC-5 could not detect.

   **MET 2026-09-10** (session 52e228). Evidence, all run 2026-09-10 10:33–10:41 CDT:
   - `pnpm --filter '@sharpee/world-model' test --run` — 86 files, **1516 passed, 0 failed** (default flip + the new "playability is opt-in" block).
   - `pnpm --filter '@sharpee/story-loader' test --run` — 123 files, **1111 passed, 0 failed** (1107 → 1111; `adr-344-d7-playable-reaches-runtime.test.ts`, 4 tests).
   - `pnpm --filter '@sharpee/engine' test --run` — 82 files, **776 passed, 0 failed, 7 skipped** (`adr-344-d7-switch-player-playability.test.ts`, 4 tests, drives `switchPlayer` both ways).
   - `pnpm --filter '@sharpee/helpers' test:ci` — 5 files, **17 passed, 0 failed** (13 → 17; `actor-builder-playable.test.ts`).
   - `pnpm exec turbo run test:ci` — **67 tasks, 67 successful**, run after `./repokit build dungeo` (exit 0, bundle 4,434,065 bytes).
   - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` — **952 tests in 17 transcripts, 952 passed**, all 17 goldens matched (single run, pinned seed).
   - `./sharpee test branch-stories/fernhill` — **86 cards passing, 104 assertions passing**, 222 commands.
   - `node dist/cli/sharpee.js --test stories/concealment-test/tests/transcripts/*.transcript` — **38 tests in 2 transcripts, 38 passed**.
   - Nine of the ten other Chord stories carrying `playable` boot and play a turn through the bundle. `branch-stories/secret-letter` does not — a shelved port that fails on `analysis.import-unresolved` (the bundle CLI provides no import resolver, GH #352) and undeclared traits, phrases and timers. `stories/armoured`'s opt-in is verified by inspection only: it is an old sample kept for early testing, outside the workspace with no build path (David, 2026-09-10).

   **Two corrections to D7's own site list, found while implementing** — both recorded in D7 above.

6. **AC-6 (D2) — the contract states the obligation.** `Story.createPlayer`'s doc comment in `install/story.ts` names all three conditions the returned entity must satisfy. Verified by reading it. **PREMISE-DEPENDENT** — premise: AC-1 landed, so the comment describes enforced behavior rather than aspiration.

7. **AC-7 (D8) — the two unclosed handoffs stay named, not silently fixed.** `initializeWorld` and `story-initialize` remain unguarded and are recorded in D8; no step is added for them under this ADR. Verified by reading `STORY_INSTALL_STEPS`. **SELF-VERIFYING** — a step added for either without its own decision contradicts this criterion.

8. **AC-8 — the tree is green end to end.** **`./repokit build dungeo`** exits 0 — the root `npx tsc --noEmit` is not the check, for the reasons recorded under AC-3, and CLAUDE.md already directs that `./repokit build` is how this repository compiles; `pnpm --filter '@sharpee/engine' test`, `--filter '@sharpee/story-loader' test`, `--filter '@sharpee/world-model' test`, `--filter '@sharpee/helpers' test` and `--filter '@sharpee/devkit' test` all pass; the Dungeo walkthrough chain runs byte-identical at its pinned seed. **SELF-VERIFYING.**

9. **AC-9 (D9) — MET 2026-09-10.** The three browser templates call `installStory`; `browser-build.test.ts` type-checks the scaffold via `runBuildCommand` before bundling; the guard demonstrably fails on the defect (`src/browser-entry.ts(122,10): error TS2551: Property 'setStory' does not exist on type 'GameEngine'. Did you mean 'getStory'?`) and passes with the fix; four `config.author` → `authors` sites repaired. Evidence: `pnpm --filter '@sharpee/devkit' test` — 27 files, 177 passing / 1 skipped, 2026-09-10 00:50 CDT. **SELF-VERIFYING.**

## Implementation closed — the nine-AC evidence table

D1–D8 landed across six phases (`docs/work/archive/adr-344-role-holder-seam/plan.md`), 2026-09-10, sessions 7776c8, b314e2, 86894c, 52e228 and 4b4f4d. Every line below names the command, what it returned, and when it was run. Unless marked otherwise, the runs are the closing sweep of 2026-09-10 11:16–11:18 CDT, taken **after** `./repokit build dungeo` — the ordering Phase 5 learned the hard way, when `@sharpee/helpers`' bundle-reading test passed against a stale `dist/cli/sharpee.js` and failed once it was rebuilt.

| AC | Command | Result | Date |
|---|---|---|---|
| AC-1 (D1, D4) | `pnpm --filter '@sharpee/engine' test --run` | 82 files, 776 passed / 7 skipped, 0 failed — includes `tests/unit/validate-role-holder.test.ts` (8 tests) | 2026-09-10 11:16 CDT |
| AC-1 self-verification | three mutations run and reverted: step removed from `STORY_INSTALL_STEPS`; step moved after `listener-trait`; the `not-playable` condition deleted | 7 / 2 / 1 tests fail respectively — absence, misordering and a dropped condition are each detected independently | 2026-09-10 (Phase 3, session b314e2) |
| AC-2 (D3) | `sed -n '/export function setupTestEngine/,/^}/p' … \| grep -c createEntity` | `0` — the helper creates no player and no room; `createMinimalStory` builds and places its actor in `initializeWorld` | 2026-09-10 11:19 CDT |
| AC-3 (D6, D6a) | `node dist/cli/sharpee.js --world-json --story stories/cloak-of-darkness/cloak.story` | one actor, `a01` "Alex" at `r01` with `actor`/`container`/`identity`/`listener`; no `a02` and no unaccounted id anywhere in the dump | 2026-09-10 11:18 CDT |
| AC-3 (build) | `./repokit build dungeo` | exit 0, bundle 4,434,065 bytes | 2026-09-10 11:16 CDT |
| AC-4 (D5) | `git grep -l "change the player to" -- "*.story"`, split by placement line | 80 sources, 61 explicit, 19 on the fallback, **0 shipped stories** — the premise holds exactly; the 85/64 in D5 was a mis-count, corrected there | 2026-09-10 (Phase 4, session 86894c) |
| AC-4 (runtime) | `./sharpee test branch-stories/fernhill` | 86 cards passing, 104 assertions passing, 222 commands | 2026-09-10 11:18 CDT |
| AC-5 (D7) | see the MET block under AC-5 above | reconfirmed by this sweep's world-model (1516), story-loader (1111) and helpers (17) runs | 2026-09-10 11:16 CDT |
| AC-6 (D2) | read `packages/engine/src/install/story.ts:280-302` | the `createPlayer` doc comment states the lookup-not-build contract and all three conditions, and names `validate-role-holder` as their enforcer | 2026-09-10 11:19 CDT |
| AC-7 (D8) | read `packages/engine/src/install/steps.ts:46-66` | 19 steps; exactly one added by this ADR — `validateRoleHolderStep` at position 7, between `createPlayerStep` and `listenerTraitStep`. `initialize-world` and `story-initialize` each delegate to their story hook and assert nothing, unguarded as D8 records | 2026-09-10 11:18 CDT |
| AC-8 (suites) | `pnpm --filter` on `world-model`, `story-loader`, `engine`, `helpers`, `devkit` | 1516 / 1111 / 776 (+7 skipped) / 17 / 177 (+1 skipped) passing, 0 failed | 2026-09-10 11:16 CDT |
| AC-8 (workspace) | `pnpm exec turbo run test:ci` | 67 tasks, 67 successful | 2026-09-10 11:17 CDT |
| AC-8 (chain) | `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` | 952 tests in 17 transcripts, 952 passed, all 17 goldens matched (single run, pinned seed) | 2026-09-10 11:18 CDT |
| AC-9 (D9) | MET 2026-09-10 00:50 CDT; see the block under AC-9 above | `pnpm --filter '@sharpee/devkit' test` — 27 files, 177 passing / 1 skipped | reconfirmed 2026-09-10 11:16 CDT |

**The root `npx tsc --noEmit` was run and exited 0 (2026-09-10 11:16 CDT), and it is recorded here only so its weakness is on the page.** `tsconfig.json` carries `files: []` and four project references, so it type-checks none of the packages this ADR touched and none of the test files Phase 6 swept. AC-3 and AC-8 name `./repokit build dungeo` as the check for exactly this reason. This is the fifth instance the plan logged of a check structurally incapable of observing what broke; the class is tracked as an open item for a systemic audit, not closed here.

**Phase 6 carried one code change, not none.** The `new GameEngine({ ..., player })` sweep left over from Phase 1 finished here: eleven test sites across `story-loader` (7), `engine` (3) and `platform-browser` (1) still passed a `player` field the constructor no longer declares, most of them fabricating a throwaway actor and deleting it again after `installStory`. All eleven now construct player-free and take the protagonist the story supplies. Because none of those files is reached by the root check and vitest type-checks nothing, every one of them was invisible to both gates — including `engine-parser.test.ts`, which destructured a `player` that `setupTestEngine` has not returned since Phase 1.

## Consequences

- **Chord and hand-written stories get the same guarantee through the one path both take.** The loader's `finalizeRoleHolder` continues to *satisfy* the invariant; it stops being the only thing that *knows* it.
- **This is a behavior change, not an extraction.** A story that today installs with an invalid role holder will fail at install after D1. The in-repo blast radius is the engine test fixture; whether anything outside the repo relies on the current permissiveness is unknown and unknowable from here, and no backward-compatibility path is planned (project convention: one-shot cutovers).
- **ADR-289 D4 needs an amendment before D5 lands.** Its placement paragraph names the fallback as kept; D5 strikes that clause. The amendment is narrow — D4's subject is the `in` / `on` / `starts in` unification, which is unaffected — but it is a change to an ACCEPTED decision and belongs in ADR-289's own file, not only here.
- **D6 is an engine API change, and the blast radius is wider than this bullet first claimed.** `EngineOptions.player` is a required parameter today, so every construction site changes. **Amended 2026-09-10** with a measured inventory taken while planning D1-D8 (`grep -rln "new GameEngine(" packages stories tools branch-stories`, excluding `node_modules`, `dist` and `_archive`): **27 files**, of which 16 are tests and 11 are not. The non-test eleven: `packages/bootstrap/src/index.ts`, `packages/bridge/src/bridge.ts`, `packages/runtime/src/bridge.ts`, the three author-facing devkit browser templates (`browser-entry.ts.template:96`, `chord-browser-entry.ts.template:188`, `playground-entry.ts.template:134`), `stories/armoured/src/browser-entry.ts`, `stories/dungeo/src/browser-entry.ts`, and three documents that teach the constructor — `packages/sharpee/README.md:51`, `packages/engine/README.md:63` and `:101`, and `packages/engine/docs/language-migration-guide.md` (six occurrences, on a positional signature that predates the options object). The original bullet named only bootstrap, the test helper and the nine story-less engine tests; `bridge`, `runtime`, the templates, both browser entries and the three docs were missing. Two version-pinned tutorial editions and one archived story are deliberately excluded (tutorial drift is GH #224). That the templates went unnamed is the same blind spot D9 records — they are invisible to `tsc` — and the guard D9 added is now what catches them. No backward-compatibility path is planned (project convention: one-shot cutovers).
- **The bootstrap phantom disappears from every shipped story's world, and the resulting entity-id shift is a plain hard break.** Allocation shifts by one for every Chord story. **No save-format version reader is written and no migration path is provided** — David, 2026-09-10: *"there are no released stories to date, so no save format versioning is required until I say so."* The standing preference for a version reader over a hard break resumes the moment a story ships; it is dormant here, not withdrawn. In-repo, the shift is visible only to tests that assert on a literal entity id, which the implementation re-pins.
- **Nineteen compiler fixtures may need a placement line.** They are the entire measured blast radius of D5. No shipped story changes behavior.
- **D7 makes `switchPlayer`'s guard live for the first time.** A Chord character not marked `playable` now fails the guard at runtime as well as at compile time, and a hand-written TypeScript story — which has no analyzer in front of it — gets playability enforcement it has never had.
- **Flipping the default is a silent behavior change for anything that reads `isPlayable` and was relying on the true default.** The measurement says nothing does today, but a saved game or an out-of-repo story is outside what can be measured from here.
- **Validation stays opt-in by naming convention, and this ADR does not change that.** D1 adds one more guarded step; fifteen of eighteen still assert nothing. Whether the pipeline should require a post-condition per step is a larger question this ADR deliberately does not open.
- **D9 is a live breakage, not a latent one.** Any author scaffolding a browser project today gets an entry point that throws at runtime, and the playground build reads the same broken template. It should be fixed ahead of the rest of this ADR, which is design work.
- **A future refactor of the install pipeline inherits a testable claim.** D4's tests fail if a later reordering drops the check, which is the property ADR-334's step list was supposed to provide and did not.
- **The survey's remaining findings deserve the same question asked of them.** This ADR verifies exactly one instance. ADR-334's internal-tidiness framing would produce the same result anywhere a seam happened to run through the code being tidied; that is a reason to check, not a claim that it did.
- **`evaluateScope` is now dead outside `WorldModel`.** Not this ADR's scope, and recorded here only because its retirement is what silenced #278. Whether it should be removed is its own decision.

## Session

Session 7776c8, 2026-09-10, on `main`. Written after a diagnosis pass over GH #278 that began as ledger verification and ended in a seam finding. An earlier fixture-level patch attempted this session was reverted at David's direction as symptom-treatment ("no hacking — diagnose the problem thoroughly"), which is what produced this ADR. **D9 was implemented this session** (templates repaired, guard added, verified in both directions, full devkit suite green); D1-D8 are design and remain unimplemented pending acceptance.
