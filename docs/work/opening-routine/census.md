# Census for the opening routine (ADR-404), taken before any platform change

Taken 2026-11-18 (session 0349f4) on `main` at 64f686e60, after `./repokit build dungeo` (exit 0). Every count here was measured that day, by the command shown.

## 1. Sites that run an opening look

`git grep -n -E "execute(Turn|Command)\(['\"]look['\"]\)" -- packages scripts tools stories docs/work/stdlib-reference`, leaving out tests and archives:

| Site | Kind |
|---|---|
| `packages/devkit/src/commands/play.ts:129` | head (`sharpee play`) |
| `packages/platform-browser/src/BrowserClient.ts:677` | head (failed restore) |
| `packages/platform-browser/src/BrowserClient.ts:688` | head (new game) |
| `packages/transcript-tester/src/cli.ts:177` | head (interactive mode) |
| `packages/branch-tester/src/claims/claims-walk.ts:129` | head (claims walk) |
| `scripts/bundle-entry.js:429` | head (bundle `--play`) |
| `scripts/fast-cli.js:102` | head |
| `tools/explorer-probe/explore.js:499` | head |
| `tools/explorer-probe/plan.js:623` | head |
| `packages/bootstrap/README.md:29` | teaches the pattern |
| `packages/sharpee/README.md:59` | teaches the pattern |
| `packages/engine/examples/basic-demo.ts:106` | teaches the pattern |
| `packages/engine/docs/text-service-migration.md:68` and `:75` | teaches the pattern |
| `docs/work/stdlib-reference/verify.mjs:85` | teaches the pattern |

The tree walker is the tenth head and the pattern cannot see it: `packages/branch-tester/src/tree-walker.ts:822`, `if (card.type === 'boot') return 'look';`.

The headless transcript runner runs no opening look: its one `executeCommand` call is `packages/transcript-tester/src/runner.ts:402`, on the commands a transcript lists.

## 2. Sites that name `boot`

`git grep -n -E "'boot'|\"boot\""`, leaving out tests, generated files and archives. Two different things share the spelling.

**The tree's `boot` card type:**
- `packages/branch-tester/src/tree-document.ts:125` and `:941`
- `packages/branch-tester/src/tree-walker.ts:378` and `:822`
- `packages/branch-tester/src/claims/claim-lock.ts:252` and `:267`
- `scripts/make-story-artifacts.mjs:150`
- `tools/ide/web/testing-surface/src/cards.ts:995` and `model.ts:444`
- `tools/ide/SharpeeIDE/Resources/testing-surface/surface.js:855`, `:856`, `:2193`, `:3414` (the built copy)

**world-index's start-block command kind**, the moment `before the game starts` runs, which is not a card:
- `packages/world-index/src/branches.ts:188` and `:803`
- `packages/branch-tester/src/derived-runner.ts:931`, which reads it. ADR-404 lists this line as a boot-card site; it is not one (the plan's Settle item 5).

## 3. Heads that show a turn count

- `packages/platform-browser/src/BrowserClient.ts`, `renderCombinedStatus`: `Score: ${this.currentScore} | Turns: ${this.currentTurn}`.
- `packages/platform-browser/src/channels/status.ts:68`: `Turns: ${value}` from the `turn` channel.
- `packages/platform-browser/src/display/StatusLine.ts:38`: `Score: ${score} | Turns: ${turns}`.
- `packages/devkit/templates/browser/index.html:70`: the static text `Score: 0 | Turns: 0`.
- `packages/channel-service/src/render-to-string.ts:285`, `renderStatusLine`: prints `Turns:` from a `status.turns` block. Nothing in live source produces that block: `git grep -n "status.turns" -- packages` finds only this reader and `packages/_archive/runtime/README.md:208`. So this one has no input today.

The command-line heads print no turn count. The two IDE heads were not searched for a turn count of their own beyond the browser client they host; Phase 6 does that before it changes anything.

## 4. What the `turn` channel carries today

- The engine's counter starts at 1 (`packages/engine/src/game-engine.ts:606`).
- A turn's packet is stamped with the turn number passed to `emitChannelPacket` (`packages/engine/src/turn/channel-packet.ts:33`).
- A meta command's packet is stamped with `engine.context.currentTurn` (`packages/engine/src/turn/meta-render.ts:40`), which after one command is the next turn's number.
- The channel itself is `contentType: 'number'`, `emit: 'always'`, `produce: (ctx) => ctx.turn` (`packages/stdlib/src/channels/standard.ts:347-351`).

Whether a regular turn's stamp is the turn executed or the turn after it was not run here; Phase 2 pins it by test before it relies on it.

## 5. The opening's stage list, stage by stage

From `packages/engine/src/turn/stages.ts` and each module's `requires` (`grep -n "requires:" packages/engine/src/turn/*.ts`). "Kept" is the proposal of ADR-404 decision 9: a turn's stages from `execute-command` on, without `plugin-tick`, `advance-turn` and `command-history`.

| Stage, in turn order | `requires` | In the opening | A `requires` the opening leaves out |
|---|---|---|---|
| chain, held-command, exchange-offer, undo-snapshot, validate-input, turn-start, input-mode, parse | (routing) | no | |
| execute-command | parse | kept | parse |
| enrich-events | execute-command | kept | |
| command-history | execute-command | no | |
| emit-events | enrich-events | kept | |
| plugin-tick | emit-events | no | |
| sound-dispatch | plugin-tick | kept | plugin-tick |
| advance-turn | sound-dispatch | no | |
| player-switch | advance-turn | kept | advance-turn |
| platform-operations | enrich-events, plugin-tick | kept | plugin-tick |
| detect-death | plugin-tick, platform-operations | kept | plugin-tick |
| render-prose | platform-operations, player-switch | kept | |
| channel-packet | render-prose | kept | |
| clear-turn-events | channel-packet, detect-death | kept | |
| turn-complete | clear-turn-events | kept | |
| ending | turn-complete, detect-death, emit-events | kept | |

Five kept stages name a stage the opening leaves out: `execute-command`, `sound-dispatch`, `player-switch`, `platform-operations` and `detect-death`. The plan's Settle item 1 lists six; its sixth, `render-prose` → `player-switch`, holds if `player-switch` is kept, as it is in this table. The check that would reject the list is `requiresOrderViolations` (`packages/engine/src/turn/runner.ts:84`). Whether each kept stage belongs in an opening at all is Phase 2's check, module by module; this table records only the `requires`.

## 6. Trees that hold a boot card

`git grep -l -E '"type": ?"boot"' -- '*.json'` finds 55 segment files (the plan said 60).

- **Gating (7):** `test-stories/ferry/ferry.tests`, `test-stories/lodge/lodge.tests`, `test-stories/orchard/orchard.tests`, `packages/branch-tester/tests/fixtures/state-pins/state-pins.tests`, `packages/devkit/tests/fixtures/claims-tier/claims-tier.tests`, `packages/devkit/tests/fixtures/derived-fail/derived-no-vocabulary.tests`, `packages/devkit/tests/fixtures/derived-pass/derived-skip.tests`.
- **The manual's companions (37):** `tutorials/relighting/chord-v4.1.0/`, chapters 05 to 34 and 36 to 40, `part-1` and `part-8`.
- **Non-gating (6):** `branch-stories/fernhill`, `ides-of-march`, `secret-letter`, `secret-letter/prototypes/w10-dance`, `upps`, and `stories/thealderman/chord`.
- **David's (1):** `docs/work/chord-primer/example/cellar-bell.tests`. Not touched without his word.
- **Archived (4):** under `docs/work/archive/`. Left as they are.

`test-stories/bazaar` has no boot card.

## 7. Baseline counts on the unchanged platform

| Gate | Command | Result |
|---|---|---|
| Dungeo chain | `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` | 949 passed, 0 failures, 17 transcripts; every golden matched |
| engine | `pnpm --filter '@sharpee/engine' test:ci` | 885 passed, 7 skipped, 0 failures (99 files) |
| platform-browser | `pnpm --filter '@sharpee/platform-browser' test:ci` | 206 passed, 0 failures (25 files), the two new opening cases among them |
| branch-tester | `pnpm --filter '@sharpee/branch-tester' test:ci` | 464 passed, 0 failures (39 files) |
| devkit | `pnpm --filter '@sharpee/devkit' test:ci` | 237 passed, 1 skipped, 0 failures (36 files) |
| Testing surface | `npx vitest run`, from `tools/ide/web/testing-surface` | 255 passed, 0 failures (25 files) |

The plan's command for the Testing surface, `npx vitest run --config tools/ide/web/testing-surface/vitest.config.ts` from the repository root, finds no test files and exits 1: the config's include pattern is relative to the working directory. The suite is run from its own directory.

## 8. What the baselines show

- **`--play`** (`baseline/quay-play.txt`): the prologue, a blank line, the three banner lines, a blank line, the room name, the first-visit paragraph, a blank line, the contents line. The command line prints **no chapter card**; the plan's Phase 1 Demonstration expected one.
- **The browser** (`baseline/quay-browser.html`): the prologue in its own element, the three banner lines, the chapter card, the room name, the first-visit paragraph, the contents line.
- **The prologue has a fixed place in the browser.** The client puts it in an element of its own, `#sharpee-prologue`, inserted ahead of the main log (`packages/platform-browser/src/BrowserClient.ts:548-554`), and the `prologue` channel's renderer writes there (`packages/platform-browser/src/channels/index.ts:203-204`). It is not appended to the log in arrival order. So one packet per routine (ADR-404 decision 6) will not by itself put the prologue after the room or the banner in a browser page when an author's block asks for that; the client's slot would have to move. That is a client change the ADR's sentence "prints the author's order with no change of its own" did not foresee, and Phase 6 stops on it.
- **A room's `first time` paragraph replaces its ordinary description** on the first look, so the opening shows only the first-visit paragraph.
- The build restamped `stories/dungeo/src/version.ts` (`BUILD_DATE` only).

## 9. Phase 2 as built: the opening's stage list and what it showed

Measured 2026-11-18 (session a57d77), after `./repokit build dungeo` (exit 0) on the changed platform.

**The list** (`OPENING_STAGES`, `packages/engine/src/turn/stages.ts`), in run order, with the `requires` each entry states in this list:

| Stage | `requires` here | Source |
|---|---|---|
| opening-plugins | (none) | new: each plugin's `onOpening`, once |
| opening-look | opening-plugins | new: the looking action through `executeAsActor`, as the player |
| enrich-events | opening-look | the turn's `run`, `requires` restated |
| emit-events | enrich-events | the turn's stage, unchanged |
| sound-dispatch | emit-events | the turn's `run`, `requires` restated |
| player-switch | sound-dispatch | the turn's `run`, `requires` restated |
| platform-operations | enrich-events, sound-dispatch | the turn's `run`, `requires` restated |
| detect-death | platform-operations | the turn's `run`, `requires` restated |
| render-prose | platform-operations, player-switch | the turn's stage, unchanged |
| opening-packet | render-prose | new: the look's channels only, stamped 0 |
| clear-turn-events | opening-packet, detect-death | the turn's `run`, `requires` restated |
| ending | clear-turn-events, detect-death, emit-events | the turn's `run`, `requires` restated |

Left out, beyond the three ADR-404 names (`plugin-tick`, `advance-turn`, `command-history`) and the routing stages: `turn-complete`, because no turn completed and a listener counting `turn:complete` must not count the opening; and `channel-packet`, which `opening-packet` replaces. `requiresOrderViolations(OPENING_STAGES)` is empty, and section 5's five unsatisfiable `requires` are each restated above. ADR-334 D2's check did not change.

**Findings.**

- **Every status channel is `emit: 'always'`, and so is `prologue`** (`packages/stdlib/src/channels/standard.ts`: `prompt`, `location`, `score`, `turn`, `info`, `ifid`, `prologue`). Only `banner` is sparse among the opening's channels. So once the prologue is written, every later full packet carries it, as it did before the change; a story whose opening has no `show-prologue` never has it written.
- **The engine cannot strip a full packet down to a routine's channels.** `ChannelService.build` caches each channel's value as sent, so a story's sparse channel stripped from one packet would never be sent. `build` takes an `only` list instead (Settle item 2, ruled).
- **`show-prologue` sends no packet for a story with no prologue.** The default opening names the routine for every story.
- **The opening's events are stamped with turn 1**, the counter's value, and stored and cleared under it; only the packets and the banner's `text:output` carry 0. `start()`'s pending events (the `game.started` among them) are taken out of that store when the opening begins.
- **The transitional write.** Until every head calls `runOpening()`, the first input on an engine whose opening never ran writes the prologue (`GameEngine.executeTurn`, marked TRANSITIONAL). Phase 6 removes it.
- **Seeded streams.** No head calls `runOpening()` yet, so no run in this phase could show a shifted draw: the Dungeo chain is 949 of 949 with the routine present and uncalled. Which streams the look draws from was not traced to the end here: the looking action's files name one selector that can draw, a room snippet's `random` selector (`packages/stdlib/src/actions/standard/looking/snippet-resolver.ts:52`), and a room description's `randomly` phrase or a story's clause on looking can draw too. Phase 4's Dungeo census is where a shifted draw would show, and it is carried there.
- **Two existing tests moved with Settle item 10.** `packages/engine/tests/integration/channel-bootstrap.test.ts`, "a literal prologue lands on the storyInfo capability and the prologue channel" and "a phrase-ref prologue resolves … at the opening", asserted the write at `start()`; they now assert nothing is written at `start()` and the text is written by `runOpening()` (David: "proceed", 2026-11-18).

**What `mutation-verification` found, and what was done.** Four warnings, all fixed before the counts below were taken. (1) No test sent a non-empty `onOpening` batch through the engine; `opening-routine.test.ts` now has a plugin whose hook returns an event, asserted in the look's packet and absent from the first command's. (2) Two assertions on the first command's `result.events` could not fail; the test now reads the command's rendered blocks, which come from the turn's store. (3) No channel-service test could tell an untouched cache from a reset one; a full, subset, full sequence now does. (4) `show-prologue` sent an empty packet for a prologue phrase that does not resolve; it now sends none, because `writePrologue` reports whether it wrote, and a test pins it.

**Counts on the changed platform**, on the final build, 2026-11-18:

| Gate | Command | Result |
|---|---|---|
| engine | `pnpm exec turbo run test:ci` (its engine task) | 917 passed, 0 failures, 7 skipped; Phase 1 had 885 |
| opening routine | `pnpm --filter '@sharpee/engine' test opening-routine` | 29 passed, 0 failures |
| stage order, install order, surface | `pnpm --filter '@sharpee/engine' test turn-stage-order story-install-order public-surface` | 25 passed, 0 failures |
| chapters | `pnpm --filter '@sharpee/ext-chapters' test` | 12 passed, 0 failures |
| channel service | `pnpm exec turbo run test:ci` (its channel-service task) | 137 passed, 0 failures |
| Dungeo chain | `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` | 949 passed, 0 failures, "All tests passed!" |
| platform-browser | `pnpm --filter '@sharpee/platform-browser' test:ci` | 206 passed, 0 failures (25 files), both opening baselines among them |
| play baseline | `pnpm test:scripts opening-baseline` | 1 passed, 0 failures |
| trees | `./sharpee test test-stories/ferry`, `lodge`, `orchard` | exit 0 each |
| every package | `pnpm exec turbo run test:ci` | 73 tasks successful of 73 |

## 10. Phase 3 as built: the Chord block, and the corpus compiled

Taken 2026-11-18, session 6d715d, on `main` at f8a2a9e4b with the Phase 3 changes uncommitted, after `./repokit build dungeo` (exit 0, bundle 5393747 bytes).

**The block.** `when the game starts … end when` is a top-level declaration (`OpeningBlockDecl`, `packages/chord/src/ast.ts`), parsed by `parseOpeningBlock` (`packages/chord/src/parser.ts`), lowered by the `buildOpening` pass (`packages/chord/src/analyzer.ts`) to `StoryIR.opening` (`packages/chord/src/ir.ts`), and set on the story as `ChordStory.opening` (`packages/story-loader/src/loader.ts`). The body is not a statement body: each line at the body's indent is a routine name alone, or it is refused.

| Refusal | Code | Reported on |
|---|---|---|
| a routine named twice | `analysis.opening-routine-repeated` | the second line |
| `show-prologue` with no header `prologue:` | `analysis.opening-no-prologue` | the line |
| any other line in the block, a line indented under a routine among them | `parse.opening-statement` | the line; lines under a refused line report nothing more |
| a routine name outside the block: at the top level, in a statement body, or among a `create` block's lines | `parse.opening-routine-outside` | the line |
| a second block | `analysis.duplicate-opening-block` | the second block |
| hand-built IR: an unknown name, a repeat, a prologue-less `show-prologue` | `analysis.opening-unknown-routine` and the two analysis codes above, from `validateIR` | the loader throws `LoadError` on the first |

**What the phase found.**

- **`IR_FORMAT` did not move.** The field is `opening: IROpeningRoutine[] | null`, null for no block (David, 2026-11-18: "a", on whether to emit null or leave the field out). IR written before the field existed has no such key, and both `validateIR` and the loader read that as no block, so a published page's embedded IR still loads.
- **Four golden IR snapshots moved by one line each**, `"opening": null`: `analyzer`, `analyzer-phase-b`, `analyzer-each-package` and `zoo-phase-c-parse` under `packages/chord/tests/__snapshots__/`. Re-recorded on David's "a".
- **A refused line is left out of the IR's list**, so a compile reports each defect once, on its line, and `validateIR`'s rule over the finished IR adds nothing. Its rule carries no span of its own and reports at line 1; only IR that reached a loader without a compile can draw it.
- **A routine name is refused in three places outside the block**: at the top level, in every statement body, and among a `create` block's lines ahead of its prose, where it would otherwise read as a composition line and draw `analysis.trait-not-declared` with advice to define a trait of that name. In a block's prose the words are prose.
- **`./repokit protocol --check` is clean**: the IDE projection decodes no `opening` field.
- **The website's `chord.ebnf` was already behind the package's**, missing the `define sound` block and the one-key `emit` of GH #713. Copying the file brought both in with this phase's production.
- **A pin moved in `packages/story-loader/tests/docs-adr-327-spelling.test.ts`**: the grammar reference's parse-blocked fence is now the page's third `chord` fence, since the opening block's example joined the page ahead of it.
- **`mutation-verification` reported three warnings, all fixed.** (1) A line indented under an accepted routine was dropped with no report; it is now `parse.opening-statement`, pinned by a test. (2) and (3) No test loaded hand-built IR; `opening-block.test.ts` in story-loader now loads IR without the field, with a hand-written list, and with each of the three invalid lists, asserting the `LoadError` and its message.
- **The clock copy shows the three clocks at rest through the opening.** In `seeded/quay-clock.story` the tide's timer record is equal before and after `runOpening()`, the hunger severity is 0 and the engine's counter is 1; the first `wait` prints the tide's first line and the first hunger rung and reads severity 3 and `turn` 1, the second prints the tide's second line, and the third prints the sequence's `at turn 3` step with `turn` 3.

**The corpus compiled (ADR-395).** `./sharpee compose <file> --out <tmp>` on every `.story` under `stories/`, `branch-stories/`, `test-stories/` and `tutorials/relighting/chord-v4.1.0/`: 241 stories, 192 compiled clean, 49 did not. No story's output names an opening code or `parse.removed-when`, and those are the only diagnostics this phase can add, so the phase added none.

| Corpus | Stories | Clean | Not clean |
|---|---|---|---|
| `stories/` | 20 | 20 | 0 |
| `branch-stories/` outside `upps/seeded/` | 23 | 23 | 0 |
| `branch-stories/upps/seeded/` | 141 | 92 | 49: the seeded authoring mistakes, each failing on its own planted line (`TEST-001-A` to `-P`, and the lettered copies of rooms 02 to 06) |
| `test-stories/` | 14 | 14 | 0, the six new `quay` copies among them |
| `tutorials/relighting/chord-v4.1.0/` | 43 | 43 | 0 |

**Gates on the final build.**

| Gate | Command | Result |
|---|---|---|
| chord | `pnpm --filter '@sharpee/chord' test` | 1959 passed, 0 failures (125 files); 1927 before this phase's 32 |
| the block, compiler | `pnpm --filter '@sharpee/chord' test opening-block` | 32 passed, 0 failures |
| story-loader | `pnpm --filter '@sharpee/story-loader' test` | 1712 passed, 0 failures, 1 skipped (212 files) |
| the block, real engine | `pnpm --filter '@sharpee/story-loader' test opening-block` | 16 passed, 0 failures |
| Dungeo chain | `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` | 949 passed, 0 failures, "All tests passed!", the Phase 1 count |
| quay | `./sharpee compose test-stories/quay/quay.story --check` | "gate-clean" |
| protocol | `./repokit protocol --check` | "generated protocol types match the TypeScript wire contract" |
| play baseline | `pnpm test:scripts opening-baseline` | 1 passed, 0 failures |
| trees | `./sharpee test test-stories/ferry`, `lodge`, `orchard` | exit 0 each |
| every package | `pnpm exec turbo run test:ci` | 73 tasks successful of 73 |
| verify | `./repokit verify` | FAILED at its third step, the entropy gate, with 8 issues, none in a file this phase touched: `tools/repokit/entropy-allowlist.txt` has drifted since 2026-09-09 (GH #803; the id idiom behind it is GH #804). `grammar --check` passed, the step that reads `chord.ebnf`. The control-byte step failed first, on 3 raw control bytes in `packages/character/src/conversation/conversation-memory.ts:48` and `:50` (U+0000, last changed 2026-08-17 in 4131ae5d7) and `docs/work/archive/history-retrospective/output/build-genai-index.mjs:22` (U+0001); each was written as an escape on David's "a" and the step then passed, with the character suite at 641 passed, 0 failures. `tsf build --npm` and the publish dry run did not run. David ruled the phase closes with verify recorded this way ("b"). The protocol check, which verify also runs behind the failure, passed on its own (`./repokit protocol --check`). |

## 11. Phase 4 as built: the headless and command-line heads

Taken 2026-11-18, session 70211a, on `main` at 59e8fbcbe with the Phase 4 changes uncommitted, after `./repokit build dungeo` (exit 0, bundle 5397548 bytes on the final build).

**The handle.** `LoadedGame` (`packages/bootstrap/src/index.ts`) gains `runOpening()`, `openingPackets` and `openingPending`. `runOpening()` calls the engine's routine and records each packet as it arrives: its composed prose, and the flattened lines and structured values of each captured channel it carried. The opening's captures become `bootChannelValues`. `assembleGame` does not call it, so the tree walker and the claims walk are as they were (Phase 5).

| Head | File | What it does now |
|---|---|---|
| the transcript runner | `packages/transcript-tester/src/runner.ts`, `command-core.ts` (`openNewGame`) | opens a game it finds pending, once, before the first command; a chain's later members find it open |
| the outcome search | `packages/transcript-tester/src/search.ts` | the same call, before the driver's first command |
| the tester's interactive CLI | `packages/transcript-tester/src/cli.ts` | `runOpening()`, then the packets in arrival order |
| the bundle's `--play` | `scripts/bundle-entry.js` | `runOpening()` and the packets in order; with `--restore`, no opening |
| the bundle's `--exec` | `scripts/bundle-entry.js` | the opening before the first command's echo; with `--restore`, no opening |
| the bundle's `--test` and `--chain` | through the runner | |
| `sharpee play` | `packages/devkit/src/commands/play.ts` | `runOpening()` and the packets in order, with its own banner layout as before |
| fast-cli | `scripts/fast-cli.js` | the line reads `engine.runOpening()`; the script cannot run (below) |
| the explorer probe | `tools/explorer-probe/explore.js`, `plan.js` | `game.runOpening()` |

**What the phase found.**

- **A RESTART's opening is a new opening, not part of the restart command.** On a handle that was opened with `runOpening()`, the reboot runs the new engine's opening; its packets replace `openingPackets`, its captures replace `bootChannelValues`, and the restart command's own `lastOutput` stays the acknowledgement. A head that prints the opening tells a reboot by the array's identity changing, and the three interactive heads print the new opening after the acknowledgement. A handle that was never opened reboots as before.
- **The `(opening)` row reads the opening's own captures.** It read the first command's captures, because that was the turn the banner and the prologue rode. It now reads `bootChannelValues` and is checked before the first command runs. A game with no `runOpening` (a test stub) that is asked an opening claim fails the claim.
- **The banner's layout is each head's own, and stayed so.** The bundle prints title, story version, platform version, subtitle, credits; `sharpee play` prints title, subtitle, credits, story version; the tester's CLI prints the record's flattened line. Only the order of prologue, banner and look is the story's.
- **Parts are separated by one blank line**, which for the default opening is byte for byte what `--play` printed before (`pnpm test:scripts opening-baseline`, 1 passed).
- **The Dungeo census found no line that differs** (`dungeo-census.md`): the chain is 949 of 949 with every golden matched, and the unit transcripts give identical output with and without the runner's call. No seeded draw shifted, which closes the question section 9 carried.
- **`scripts/fast-cli.js` cannot run today.** It loads `dist/sharpee.js`, constructs `GameEngine` with positional arguments and imports a `TextService` the platform no longer has. Its opening line was changed so the search of AC-5 is clean; nothing else in it was touched.
- **The two design scripts under `docs/architecture/diagrams/design/` were left.** `test-command-history.js` and `.mjs` run `look` as the command whose history entry they inspect, not as an opening.
- **`packages/engine/docs/text-service-migration.md`** used `look` as its sample command twice; it now uses `inventory`, so it no longer reads as an opening.
- **The plan's AC-8 command names a save that does not exist**, `wt-13a`. `wt-13` was used: `node dist/cli/sharpee.js --exec "look" --story stories/dungeo --restore wt-13` prints the seed line, `> look` and the Living Room, with no banner and no first room ahead of them.
- **The bundle's `--play` loses piped lines after the first** (its `question()` loop, the defect `sharpee play` fixed as GH #240), so AC-2's second `wait` was run through `--exec "wait/wait"` instead of the piped command the plan gives. This is as it was before the phase.
- **`node --test tools/explorer-probe/tests/*.test.js` fails 9 of 43, and failed the same 9 before the phase**: with `explore.js` put back to its typed `look` the count is the same, 34 passed and 9 failed. The failures are pins that no longer match (`91 !== 41` dimensions; a walk that ends `frontier-exhausted` where the pin says `max-states`). The phase's Demonstration names this suite as passing; it does not pass, for a cause outside the phase.

**What `mutation-verification` found, and what was done.** Nine warnings; eight fixed before the counts below were taken, one left as reported. (1) Only stubs reached `openNewGame`, so a renamed handle member would have skipped the opening with every suite passing; `opening-run.test.ts` now runs the runner on a real `assembleGame` handle with an `(opening)` row. (2) Nothing would have noticed commands' packets joining `openingPackets`; the length is now asserted after a command and after a restart. (3) `runOpening()` left the boot captures as the live buffer until the first command, so a packet arriving in between would have joined them; the buffers now start fresh after the opening, a test sends such a packet, and the handle's last-run fields are asserted. The `lastError` assignment, which could not be observed, is gone. (4) No test sent RESTART through a head; `opening-heads.test.ts` and devkit's `play.test.ts` now do, and assert the new opening follows the acknowledgement. (5) One `play.test.ts` assertion passed on the old code; it now claims only the blank line between parts. (6) The `(opening)` row's move ahead of the first command was not pinned; a first command that spoils the boot captures now pins it. (7) A reboot whose opening threw left `openingPackets` and `bootChannelValues` describing different games; both are now the new game's, as far as its opening got, pinned with a story whose opening plugin throws. (8) Nothing ran `--play --restore`; `cli-restore.test.ts` now does. (9) Left: `fast-cli.js` cannot run, and `explore()` and `verifyPlan()` have no tests of their own. The tester's interactive CLI (`cli.ts`) has no test either; its reprint is the same four lines as the bundle's.

**The acceptance runs.**

| Criterion | Command | Result |
|---|---|---|
| AC-1 | `yes wait \| head -81 \| ./sharpee play tutorials/relighting/chord-v4.1.0/chapter-19` | "The light has turned" in the reply to command 50, "Dusk comes down" in the reply to command 80 |
| AC-2 | `node dist/cli/sharpee.js --exec "wait/wait" --story stories/hunger-demo/hunger-demo.story --seed 42` | neither hunger line in the opening; "A hollow ache settles behind your ribs." after the first `wait`; "Your stomach knots and will not let go." after the second |
| AC-3, command line | `pnpm test:scripts opening-baseline` | 1 passed, 0 failures |
| AC-4, command line | `pnpm test:scripts` (its `opening-heads` file) | the reordered copy prints the room before the banner; the no-look, no-banner, no-prologue and empty copies print only what their block names |
| AC-8, headless | `node dist/cli/sharpee.js --exec "look" --story stories/dungeo --restore wt-13`; `pnpm --filter '@sharpee/bootstrap' test assemble-opening` | no opening on the restored session; the restart reboot runs the new game's opening |
| AC-11 | see `dungeo-census.md` | no line differs |

**Gates on the final build.**

| Gate | Command | Result |
|---|---|---|
| bootstrap | `pnpm --filter '@sharpee/bootstrap' test` | 68 passed, 0 failures (7 files); 57 before this phase's 11 |
| transcript-tester | `pnpm --filter '@sharpee/transcript-tester' test` | 385 passed, 0 failures (29 files); 374 before this phase's 11 |
| `sharpee play` | `pnpm --filter '@sharpee/devkit' test play` | 8 passed, 0 failures; 5 before |
| scripts | `pnpm test:scripts` | 146 passed, 0 failures (21 files) |
| Dungeo chain | `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` | 949 passed, 0 failures, "All tests passed!" |
| trees | `./sharpee test test-stories/ferry`, `lodge`, `orchard` | exit 0 each |
| every package | `pnpm exec turbo run test:ci` | 73 tasks successful of 73 |
| explorer probe | `node --test tools/explorer-probe/tests/*.test.js` | 34 passed, 9 failed, the same 9 as before the phase |
| the search | `git grep -n -E "execute(Turn\|Command)\(['\"]look['\"]\)" -- packages scripts tools`, tests and archives left out | `packages/platform-browser/src/BrowserClient.ts:677` and `:688` (Phase 6) and `packages/branch-tester/src/claims/claims-walk.ts:129` (Phase 5) |

## 12. Phase 5 as built: the tree's one opening card

Taken 2026-11-18, session 4c696b, on `main` at 19f133b31 with the Phase 5 changes uncommitted, after `./repokit build dungeo` (exit 0, bundle 5397785 bytes).

**The card.** `TreeCardType` is `'opening' | 'turn'` (`packages/branch-tester/src/tree-document.ts`). The reader refuses any other type and names the one it found: `'root0000.cards[1].type' is 'boot'; a card's type is 'opening' or 'turn'`. Nothing is migrated in the reader.

| Consumer | File | What it does now |
|---|---|---|
| the walker | `packages/branch-tester/src/tree-walker.ts` | opens every game it boots with the game's `runOpening()`, before that game's first command; types no `look`; a line's prefix is its typed commands only; the opening card is turn 0 for the line observer |
| the tree runner | `packages/branch-tester/src/runner.ts` | records the `(opening)` row first, ahead of every command and when the line has none; the row reads the opening's packets in arrival order, its captures and its events |
| the claims walk | `packages/branch-tester/src/claims/claims-walk.ts` | runs the opening when it is pending; no `look` turn |
| the claim lock | `packages/branch-tester/src/claims/claim-lock.ts` | opens the game it replays on; every prefix command is a typed turn |
| world-index | `packages/world-index/src/branches.ts`, read at `derived-runner.ts` | the start-block command kind is `start`, not `boot` (Settle item 5; David: "proceed") |
| make-story-artifacts | `scripts/make-story-artifacts.mjs` | no `look` probe; the opening card asserts the room the run's opening printed |
| the Testing surface | `tools/ide/web/testing-surface/src/model.ts`, `cards.ts`, `main.ts`, `compose.ts`, `run.ts` | the opening's record seats the one opening card (ordinal 0) and makes no card and no row of its own |

**The migration.** `node scripts/migrate-boot-cards.mjs` moved 50 trees, one root segment each: the first-look card's `contains` and `states` joined the opening card and the card was removed, then each tree was written through `assembleTree` and `segmentTree`. A second run reports "0 tree(s) would be migrated". The 50 are the 7 gating trees, the 37 companion trees under `tutorials/relighting/chord-v4.1.0/`, and the 6 non-gating trees. Not touched: the 4 archived files under `docs/work/archive/` and `docs/work/chord-primer/example/cellar-bell.tests` (Settle item 7; David: "proceed" on leaving it).

**What the phase found.**

- **No gating tree's claims moved.** `ferry`, `lodge` and `orchard` pass on the migrated cards with nothing re-recorded: the room text the first-look card claimed is in the opening, and no claim in them is keyed to a turn the opening used to cost.
- **`quay.tests` is recorded**: one opening card claiming the prologue, the title, the first-visit paragraph and `info.title`; "1 card passing, 4 assertions passing". OB-53 in the test set.
- **OB-40 is rewritten** in `test-stories/orchard/orchard.test-set.md`, and `scripts/__tests__/narrative-pinned-prose.test.ts` reads it: the opening card is the run's first row, with no `turn`, and `north` is turn 1.
- **Three things were added beyond the plan's list.** `LoadedGame.openingEvents` in bootstrap, so an event claim on the opening card has the opening's events to read; `openNewGame` on transcript-tester's barrel, so the walker and the lock open a game the way the transcript runner does; and State…, Event… and Branch… on the surface's opening card, because a branch from the opening is now the only way to record an alternate first command, and the first look's state and events are the opening's.
- **`check-test-trees.mjs` skips `docs/work/archive/` and `docs/work/chord-primer/`** (David: "proceed"). Without that, `--all` exits 1 on `docs/work/archive/john-chord-samples/no-signal-home.tests` and the primer's tree, which the reader now refuses.
- **The search for the old card type does not print nothing.** It finds `scripts/migrate-boot-cards.mjs:60`, the constant naming the type the script removes, and after this phase's commit it will also find the fixture line in `scripts/__tests__/migrate-boot-cards.test.ts`, which builds old trees to migrate. The plan's Demonstration says the search prints nothing; it prints nothing in branch-tester, world-index, the Testing surface's source and its built bundle.
- **An `exact` block cannot sit on the opening card.** The opening's row is checked against everything the opening printed, so the migration refuses a first-look card carrying one (none did), and the surface turns a policy's `exact` for the first look into `contains` lines (`openingAssertionsOf`).
- **The interim in the IDE, as the plan states it.** The browser client still runs its own first `look` as feed turn 1 until Phase 6. The surface binds that record to the opening card, so the card column reads "opening", "turn 2", "turn 3", one ahead of the command line, until then.
- **`scripts/make-story-artifacts.mjs` still writes a version-1 single file** (`version: 1`, no card ids, no segments), which the reader has not accepted since ADR-355. Its opening handling is changed here; its output format is as it was. Phase 7 names it for regenerating three recipe stories and will meet this.
- **Two builds failed before the one above**, both on a type this phase added (`openingEvents` on the runner's game type); each stopped for David and was fixed on his "proceed".
- **One chained suite run did not finish, and it was not bootstrap's.** A single command running the branch-tester, world-index, bootstrap and transcript-tester suites in turn was still running after 10 minutes with a `node (vitest)` process alive; it had printed world-index's counts and nothing after. This section first blamed the bootstrap suite, which passes alone in under a second. The summary writer then found world-index's `test` script is `vitest` in watch mode: it prints its counts, waits for file changes and never exits, so the chain never reached bootstrap (GH #810). That the chained run stopped there for that reason is the likely cause, not a confirmed one.
- **The Xcode test build regenerated three docs-tab files** (`docs-index.json`, `chord-writer.html`, `chord__reference__grammar.html` under `tools/ide/SharpeeIDE/Resources/docs-tab/`), which Phase 7 regenerates.

**Gates on the final build.**

| Gate | Command | Result |
|---|---|---|
| branch-tester | `pnpm --filter '@sharpee/branch-tester' test` | 473 passed, 0 failures (39 files); 464 before the phase |
| world-index | `pnpm --filter '@sharpee/world-index' test` | 239 passed, 0 failures, 1 skipped (19 files) |
| devkit | `pnpm --filter '@sharpee/devkit' test` | 240 passed, 0 failures, 1 skipped (36 files) |
| bootstrap | `pnpm --filter '@sharpee/bootstrap' test` | 70 passed, 0 failures (7 files); 68 before |
| transcript-tester | `pnpm --filter '@sharpee/transcript-tester' test` | 385 passed, 0 failures |
| scripts | `pnpm test:scripts` | 155 passed, 0 failures (23 files); 146 in 21 files before |
| Testing surface | `npx vitest run`, from `tools/ide/web/testing-surface` | 261 passed, 0 failures (25 files); 255 before; `npx tsc --noEmit -p .` clean |
| trees | `./sharpee test test-stories/quay`, `ferry`, `lodge`, `orchard` | exit 0 each |
| canonical gate | `node scripts/check-test-trees.mjs --all`, with the migrated trees staged | exit 0 |
| Dungeo chain | `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` | 949 passed, 0 failures, "All tests passed!" |
| every package | `pnpm exec turbo run test:ci` | 73 tasks successful of 73 |
| the IDE | `xcodebuild test … -only-testing:SharpeeIDETests/TestingSurfaceRealPathTests`, the pinned invocation | 27 tests, 0 failures, "TEST SUCCEEDED"; `TestRunnerTests` 7 and `TestingSurfaceExitNoteTests` 2 passed in the run before it |
| no typed opening | `git grep -n "return 'look'" -- packages/branch-tester/src` | prints nothing |
| no old card type | `git grep -n -E "'boot'\|\"boot\"" -- packages/branch-tester/src packages/world-index/src scripts tools/ide/web/testing-surface/src tools/ide/SharpeeIDE/Resources/testing-surface` | with the new script staged: `scripts/migrate-boot-cards.mjs:60`, the constant naming the type it removes. Its test, `scripts/__tests__/migrate-boot-cards.test.ts`, builds old trees with the type and will be a second line once tracked. Nothing else |

**What `mutation-verification` found, and what was done.** Six warnings, all missing tests and none a mutation that fails to happen; all six were written before the counts above were taken. (1) Nothing read `LoadedGame.openingEvents`; `assemble-opening.test.ts` now asserts it is empty before the opening, holds the opening's events after, is untouched by a command and is replaced by a RESTART's reboot. (2) No event claim on an opening card ran through the real walker; `lock-failed-card.test.ts` now runs one that holds and one that fails on a real `assembleGame` handle. (3) The claims walk's and the lock's tests showed only that no `look` ran; `claims-walk-refusals.test.ts` now counts the opening as run once and first, and `claim-lock.test.ts` asserts the order opening, `read note`, `north`, and that an opening that throws is refused with nothing replayed. (4) Nothing checked the observer's turn-0 call; `tree-walker.test.ts` now does, with the game already opened and nothing typed. (5) `openingAssertionsOf` had no direct test; `compose.test.ts` has four. (6) The three scripts had none: `scripts/__tests__/migrate-boot-cards.test.ts` (new, 6 cases: a tree the reader refuses before the migration and reads after, the merge, a skipped card, a tree it cannot move, the two exclusions, `--check` and the second run), a case in `check-test-trees.test.ts` for the two skipped directories with the same tree refused outside them, and `scripts/__tests__/make-story-artifacts.test.ts` (new, 2 cases over `quay`). The migration script gained `--root <dir>` so its test can point it at a scratch repository. Left untested: the surface's State… and Event… pickers on the opening card (`recordBehind(0)`), and `addOpeningCard`'s branch that appends to an opening row already on the board. The fixes were not re-audited by the agent.

## 13. Phase 6 as built: the browser client opens with the routine

Taken 2026-11-18, session 5f2a8f, on `main` at c51a2cb33 with the Phase 6 changes uncommitted, after `./repokit build dungeo` (exit 0, bundle 5397765 bytes, written 17:57 CST).

**The client.** `BrowserClient.start()` (`packages/platform-browser/src/BrowserClient.ts`) calls a new private `openNewGame()` when it finds no autosave and when a restore throws. `openNewGame()` calls `engine.runOpening()` and posts one feed record for it. A RESTART reaches it through the client's reboot, which runs the entry's boot and so `start()` on a fresh engine. A restored session never calls it.

| Site | What it does now |
|---|---|
| `BrowserClient.start()`, new game | `openNewGame()`: the engine's opening, no typed `look`, no echo |
| `BrowserClient.start()`, failed restore | the same call |
| the play feed (`turn-events.ts`) | the opening's record carries `opening: true` and no `command`; `TurnEventPayload.command` is optional |
| `renderCombinedStatus`, `StatusLine.setScoreTurns`, the `turn` channel renderer (`channels/status.ts`) | 0 is shown as no count: `Score: 0`, then `Score: 0 \| Turns: 1` (`turnsText`, `scoreTurnsText` in `display/StatusLine.ts`) |
| `packages/devkit/templates/browser/index.html` and `templates/browser/index.html` | the static text is `Score: 0` |
| `GameEngine.executeTurn` | the transitional prologue write is gone (Settle item 10's ruling): the first input on an engine whose opening never ran marks the opening `missed` and writes nothing |
| the Testing surface (`tools/ide/web/testing-surface/src/main.ts`) | `deliver()` seats the opening card on the record's own `opening` mark; the positional `expectBoot` flag is gone; `surface.js` rebuilt |

**The two workarounds, examined.**

- **`turnOffset`: removed. It was wrong at both restore seams, before this phase and after it.** A save's `metadata.turnCount` is the engine's counter minus 1 (`packages/engine/src/session/save-restore-service.ts:262`), and a restore sets the counter back to that plus 1 (`:403`), so the `turn` channel goes on from the right number with nothing added. The offset added the save's count minus 1 on top. Measured on a real `BrowserClient` and `GameEngine` with the offset still in place and the opening already a routine (`channel-restore-real-path.test.ts`, 17:52 CST): at the boot seam, three commands, a reload, and one more command showed `Turns: 6` where 4 is right; at the Restore-menu seam, a save after two commands, restored, and one more command showed `Turns: 4` where 3 is right. With the offset removed both cases pass. The Restore-menu case is a real-engine test (GH #800): the one stand-in is the dialog's answer, which is a person's click.
- **The play feed's `[SKIP]` boot turn: nothing records one any more.** The feed's first record is the opening, marked as such, and the surface seats the opening card from it and makes no turn card. `capture-parity.test.ts` runs no priming `look` on either side: the CLI's `--exec` and the browser both open with the routine, and the typed turns align one to one. The `[SKIP]` demotion that remains in the surface (`model.ts`, `compose.ts`) is a different thing: a typed turn the policy had nothing to assert on.

**What the phase found.**

- **A new game writes no autosave until the first command.** The autosave rides `channel:packet` and skips packets stamped turn 0, which every opening packet is. The typed `look` used to write one at turn 1. A page reloaded before any command opens as a new game.
- **The default opening in the browser is word for word the Phase 1 recording** (`opening-real-path.test.ts`, OB-46, against `baseline/quay-browser.html`).
- **The feed ordinal is unchanged.** The opening's record still claims the next page-lifetime ordinal, and its elements are stamped with it, so a first load's cards read "opening", "turn 2". The plan's stated interim was the engine's turn count, which is now right: the first command is the engine's turn 1.
- **`templates/browser/index.html`, the TypeScript path's template, carried the same static `Score: 0 | Turns: 0`** and was changed with the devkit template. It is not in the phase's file list.
- **Built story pages still carry the static text.** `branch-stories/fernhill/browser/index.html` (a story's own page) and every built `dist/web/*/index.html` say `Score: 0 | Turns: 0` until their first packet replaces it. None was edited; Phase 7 rebuilds the recordings.
- **`TestToolchain.captureResponses` (SharpeeIDETests) primed with a `look`.** It has no caller. Its priming command and the dropped first block were removed so it no longer states the old opening.
- **The IDE heads show no turn count of their own.** `git grep "Turns:"` over `tools/ide/SharpeeIDE` and `tools/ide/PaneHost` finds nothing outside the built web bundles (census section 3's open point).
- **`render-to-string.ts` in channel-service was not touched.** Nothing produces a `status.turns` block (section 3).
- **Settle item 11 is ruled "a", and built: the browser prints the prologue into the log where its packet arrives.** David, 2026-11-18: "a", and "we should have given the author control anyway - without expecting them to modify the template". The `#sharpee-prologue` element and the layout's `prologue` slot are gone (`channels/layout.ts`, `BrowserClient.adaptHostLayout`); the `prologue` renderer (`channels/info.ts`) appends its paragraphs to the log. The channel sends its value on every packet once written, so the renderer prints a value once and not again; a renderer is built per engine, so a RESTART's new game prints its prologue afresh. At both restore seams the client tells the renderer the log already holds the opening (`adoptPrinted`), and `prologue` joins the channels a save leaves out, because the transcript restores it. `styles/base.css` spaces the paragraphs inside the prose pane; no page was looked at in a browser for it. OB-46's recording was made again and differs by one thing: the prologue's paragraph is the log's first entry and has lost the `<div>` wrapper it sat in ahead of the log. A block that puts `show-prologue` last prints it last (`opening-real-path.test.ts`). ADR-298 D3 carries a dated amendment.
- **The IDE's Chord version check moved to 4.0.3 (GH #729), on David's word during the phase**: "the first step before testing in the IDE should be to update the version check". The full scheme had failed 2 of 626 on it (`ChordVersionCheckTests.testRealVersionOutputParses`, `DocsTabRealPathTests.testTheBundledCorpusIsPinnedToTheCompilersChordVersion`). A new lexer corpus file, `packages/chord/tests/fixtures/lexer-golden/chord-4-0-3-surface.story`, carries the surface since 4.0.2 (the two `the story is` conditions, a `define sound` block, a one-word `emit`, the `when the game starts` block); `./sharpee compose --check` reports it gate-clean at Chord 4.0.3; the golden grew by 4166 lines with no line of the nine existing streams changed; `ChordLexer.swift` did not move.
- **`dotnet test tools/ide/PaneHost.Tests` needs three machine-local variables** (`SHARPEE_IDE_TOOLCHAIN`, `SHARPEE_IDE_CAPABILITY_FIXTURE`, `SHARPEE_IDE_CAPABILITY_STORY`; `tools/ide/PaneHost/README.md`). Run bare it fails 8 of 145 by design; with them named it passes 145.
- **Fernhill's browser bundle was rebuilt** (`node ../../packages/devkit/dist/cli.js build fernhill.story --browser`, from `branch-stories/fernhill`), because the IDE's real-engine test loads it and the old bundle's client posts no `opening` mark.
- **One assertion of mine was wrong on its first run.** The engine test for the removed transitional write expected the capability's prologue to be undefined; it is the empty string it is created with. The assertion was corrected and the file re-run.

**Gates on the final build.**

| Gate | Command | Result |
|---|---|---|
| browser client | `pnpm --filter '@sharpee/platform-browser' test:ci` | 228 passed, 0 failures (25 files); 206 before the phase |
| engine | `pnpm --filter '@sharpee/engine' test:ci` | 917 passed, 0 failures, 7 skipped (100 files) |
| devkit | `pnpm --filter '@sharpee/devkit' test:ci` | 240 passed, 0 failures, 1 skipped |
| chord | `pnpm --filter '@sharpee/chord' test:ci` | 1959 passed, 0 failures (125 files) |
| Testing surface | `npx vitest run`, from `tools/ide/web/testing-surface` | 264 passed, 0 failures (26 files); 261 before the phase; `npx tsc --noEmit -p .` clean |
| scripts | `pnpm test:scripts` | 155 passed, 0 failures (23 files) |
| every package | `pnpm exec turbo run test:ci` | 73 tasks successful of 73 |
| Dungeo chain | `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` | 949 passed, 0 failures, "All tests passed!" |
| trees | `./sharpee test test-stories/quay`, `ferry`, `lodge`, `orchard` | exit 0 each |
| no typed opening | `git grep -n -E "execute(Turn\|Command)\(['\"]look['\"]\)" -- packages scripts tools`, tests left out | only `packages/_archive/bridge`, `interpreter` and `runtime` |
| the IDE | `xcodebuild test -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -destination 'platform=macOS' -derivedDataPath ./DerivedData`, with the pinned SYMROOT and OBJROOT, from `tools/ide` | 626 tests, 0 failures, "TEST SUCCEEDED" (`Test-SharpeeIDE-2026.11.18_18-43-20--0600.xcresult`, on the final surface bundle and Fernhill's bundle rebuilt after the prologue moved); the run before the version bump failed 2 of 626 |
| PaneHost | `dotnet test tools/ide/PaneHost.Tests`, with its three variables | 145 passed, 0 failures |

The build was run again after the last source edit (the prologue's move, 18:42 CST), and the browser client, IDE, Dungeo, scripts and every-package rows above are from after it. The engine and Testing surface rows are from the build before the prologue moved, and the devkit, chord, trees and PaneHost rows from the one before that; no file those suites read changed afterwards, and the every-package run covers the engine, devkit and chord again.

**What `mutation-verification` found, and what was done.** Every mutation happens and each has a test asserting the state change. Four warnings and three notes.

1. Nothing told the surface's `opening` mark apart from the old positional rule, because the fixture and the real client both post the opening first. The rule is now one function, `isOpeningRecord` (`tools/ide/web/testing-surface/src/feed-record.ts`), with `tests/feed-record.test.ts` (3 cases): a typed turn that is a session's first record, which is what a restored session posts, is not the opening. No test drives a restored session through `deliver()` itself; the function is what `deliver()` calls.
2. No test typed RESTORE and read the count. `channel-restore-real-path.test.ts` now does: the command's own packet shows the save's count, and the next command one more.
3. No restore test checked the prologue once the engine stopped rewriting it. `opening-real-path.test.ts` now asserts it is on the page after a reload and once, not twice, after the next command.
4. **The failed-restore fallback is a new game only when the engine refuses the save before touching the world.** The test's spoiled save is refused at the version check. A restore that throws after `world.loadJSON` leaves the loaded world, and the opening then runs over it or the engine refuses it and the page shows `[Startup Error]`. The typed `look` had the same hazard before this phase. Nothing was changed for it; the comment in `start()` now says what holds. It is not handled (GH #811).

Notes: the spoiled-save precondition now checks the spoiled save's own fields; `openNewGame`'s doc says the record's events are the first look's (the engine returns only the look's result); `story-info-projection.ts`'s header no longer says the prologue is written at start; the new restore cases name the client's private seam as a type and use no `any`. Left as it was: the engine test's `?.prologue ?? ''`, which would also pass with no `storyInfo` capability; the packet assertion beside it carries the check. Two of the new cases pass on the old client too (no opening after a restore; no record posted by a restored session) and guard behaviour that did not change. The fixes were not re-audited by the agent.
