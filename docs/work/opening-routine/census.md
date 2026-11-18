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
