# ADR-404 acceptance: AC-1 to AC-11 on one build

Run 2026-11-19, 00:08 to 00:15 CST, session 41eb17, on `main` at cb78f6689. The build is the one `./repokit build dungeo` made for Sharpee 5.6.4: `dist/cli/sharpee.js`, 5397765 bytes, written 2026-11-18 23:27:20 CST, from the source committed in 2a0878f87. cb78f6689 adds only a session summary, and `git status --short` listed only that summary before and after the sweep, so no run below changed a tracked file. The same commit is what npm carries: publish run 44468832972 finished `success` on 2a0878f87, and `npm view @sharpee/devkit dist-tags.latest` printed `5.6.4`.

**Result: all eleven hold.** What was not re-run, and what a result rests on, is under "Limits of this sweep" at the end.

## AC-1, the turn numbers: holds

`yes wait | head -81 | ./sharpee play tutorials/relighting/chord-v4.1.0/chapter-19`

- "The light has turned. The shadows in the Hall have begun to lean east." is on output line 169; the lines up to and including it hold 50 `> wait` prompts, so it is in the reply to the 50th command.
- "Dusk comes down on Lanternhall and finds the Lantern dark. …" is on output line 261; the lines up to and including it hold 80 `> wait` prompts, so it is in the reply to the 80th.

## AC-2, nothing has run: holds

`node dist/cli/sharpee.js --exec "wait/wait" --story stories/hunger-demo/hunger-demo.story --seed 42` (the bundle's `--play` drops piped lines after the first, so the run is `--exec`, as in Phase 4)

- The opening is the banner ("The Long Cold", "By DevArch", "Story v1.0.0") and the Waste, with neither hunger line.
- After the first `> wait`: "Time passes..." then "A hollow ache settles behind your ribs."
- After the second: "Time passes..." then "Your stomach knots and will not let go."

The timer half: `pnpm --filter '@sharpee/story-loader' exec vitest run opening-block`, 16 passed, 0 failures, with the case "the opening steps no timer, counts no turn and grows no meter; the first command does each once"; and `pnpm test:scripts`, whose `opening-heads` case "the clocks answer the first wait, not the opening" passed on the bundle.

## AC-3, the default: holds, against a recording that two rulings moved

- Command line: `pnpm test:scripts`, 155 passed, 0 failures (23 files); `opening-baseline.test.ts` (1 test) compares the bundle's `--play` opening of `test-stories/quay` at seed 42 with `docs/work/opening-routine/baseline/quay-play.txt`.
- Browser: `pnpm --filter '@sharpee/platform-browser' exec vitest run opening-real-path chapter-before-room channel-restore-real-path restart-reboot`, 32 passed, 0 failures (4 files), `opening-real-path.test.ts` (14 tests) among them.

The recording is not word for word the one Phase 1 made before the change. Two differences were ruled by David and recorded then: the browser prints the prologue into the log in arrival order (Settle item 11, Phase 6), and the bundle's banner prints the byline before the story version, as `sharpee play` does (2026-11-18, in 2a0878f87). Nothing else in either recording moved.

## AC-4, the author's order: holds

- Engine: `pnpm --filter '@sharpee/engine' exec vitest run opening-routine`, 29 passed, 0 failures, with "a reordered opening sends the room before the banner" and the four cases for an opening that leaves a routine out or is empty.
- Chord story on a real engine: the story-loader run above (16 passed), with "the reordered block: prologue, the look, then the banner" and the no-banner, no-prologue, no-look and empty cases.
- Command line: `opening-heads.test.ts` (7 tests, in the 155), with "a reordered block prints the room before the banner" and the no-look, no-banner, no-prologue and empty cases.
- Browser: `opening-real-path.test.ts`, "a reordered block prints the room before the banner, with the card just ahead of the room (AC-4, AC-6)".

## AC-5, no head types the opening: holds

- `git grep -n -E "execute(Turn|Command)\(['\"]look['\"]\)" -- packages scripts tools`, test files left out: five lines, all under `packages/_archive/` (`bridge/src/bridge.ts:250`, `interpreter/src/context/GameContext.tsx:358` and `:394`, `runtime/src/bridge.ts:35` and `:216`). With tests left in it also lists test files in bootstrap, branch-tester, engine, platform-browser and story-loader, where a typed `look` is a test's own command.
- `git grep -n -E "'boot'|\"boot\"" -- packages/branch-tester/src packages/world-index/src scripts tools/ide/web/testing-surface/src tools/ide/SharpeeIDE/Resources website/src`: two lines, `scripts/migrate-boot-cards.mjs:60` (the constant naming the card type the migration removes) and `scripts/__tests__/migrate-boot-cards.test.ts:32` (that script's fixture). No `boot` card type in any site the ADR lists.
- `git grep -n "return 'look'" -- packages/branch-tester/src`: prints nothing.

## AC-6, the chapter card: holds

- The platform-browser run above: `chapter-before-room.test.ts` (2 tests) passed; `opening-real-path.test.ts` passed its reordered case (the card just ahead of the room) and "a block with no first look prints no room and no card, and the first command's reply opens with the card (AC-4, AC-6)".
- The story-loader run above: "no block: prologue, banner, then the look with the chapter card and the room, every packet stamped 0" and "no look in the block: the opening has no card, and the first command's reply carries it once".

## AC-7, refusals: holds

- Compiler: `pnpm --filter '@sharpee/chord' exec vitest run opening-block`, 32 passed, 0 failures. Its group "what the compiler refuses about the opening" covers a routine named twice (`analysis.opening-routine-repeated`), `show-prologue` with no prologue (`analysis.opening-no-prologue`), another statement inside the block, a routine name outside the block (in an `after` clause body and among a create block's lines), and a second block (`analysis.duplicate-opening-block`).
- Engine at install: the engine run above (29 passed), group "a stated opening the engine could not run is refused at install": a routine named twice, an unknown routine, and `show-prologue` in a story with no prologue.
- The loader refuses the same three in hand-written IR with a `LoadError` (story-loader run above).

## AC-8, when it runs: holds, with one filed limit

- First load: AC-1, AC-2 and AC-3 above.
- RESTART: `opening-heads.test.ts`, "prints the opening again after the acknowledgement, in the story's order" (command line); `opening-real-path.test.ts`, "a RESTART opens the new game: a fence, then the opening again, and the count is blank again (AC-8)"; `restart-reboot.test.ts` (8 tests) passed.
- A restore that fails: `opening-real-path.test.ts`, "a restore that fails opens a new game (AC-8)", passed. GH #811 stays open: the fallback is a new game only when the engine refuses the save before touching the world.
- A restored session, browser: `opening-real-path.test.ts`, "a restored session posts no opening record and prints no opening (AC-8)"; `channel-restore-real-path.test.ts` (8 tests) passed.
- A restored session, headless: `node dist/cli/sharpee.js --exec "look" --story stories/dungeo --restore wt-13` printed the seed line, `> look` and the Living Room, with no banner and no first room ahead of the command.

## AC-9, the status line: holds

- Browser: `opening-real-path.test.ts`, "the status line shows no turn count before the first command and 1 after it (AC-9)", passed.
- Engine: the engine run above, group "the turn channel through the opening": "is 0 in every opening packet that carries it, and every opening packet is stamped 0" and "is 1 in the first command's packet and 2 in the second's".

## AC-10, the trees: holds

- One `opening` card, no `boot` card: `node scripts/check-test-trees.mjs --all`, exit 0, no output; AC-5's second search above; each of the four gating trees (`quay`, `ferry`, `lodge`, `orchard`) holds exactly one card of type `opening`.
- The walker runs no opening look: AC-5's third search prints nothing.
- The trees pass: `./sharpee test` over the 43 directories under `tutorials/relighting/chord-v4.1.0/` and the four gating test stories, 47 runs. 41 exit 0 and no output line anywhere reads "failing"; the six that exit 2 are `part-2` to `part-7`, which hold no tree.
  - `chapter-19`: "25 cards passing, 44 assertions passing".
  - `chapter-40`: "182 cards passing, 277 assertions passing"; "the ward on the stair can be lifted" locked "at turn 82 — held there" and "the story can be won" locked "at turn 138 — held there".
  - `quay`: "1 card passing, 4 assertions passing". `ferry`: "10 cards passing, 12 assertions passing", "claims: 4 of 4 held (seed 42)". `lodge`: "10 cards passing, 13 assertions passing", "claims: 8 of 8 held (seed 42)". `orchard`: "21 cards passing, 28 assertions passing".

## AC-11, Dungeo: holds

- The census was made first, in Phase 4, before anything was re-recorded: `docs/work/opening-routine/dungeo-census.md`, "No line differs", accepted by David ("a"). Nothing was re-recorded, because there was no line to re-record.
- `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`: "Total: 949 tests in 17 transcripts", "949 passed", "All tests passed!", the count Phase 1 recorded before any platform change.

## The whole suite

`pnpm exec turbo run test:ci`: "Tasks: 73 successful, 73 total", "Cached: 73 cached, 73 total". Every task was replayed from turbo's cache, which means each task's inputs are the ones a passing run already ran on; it is not a fresh execution. The suites named under the criteria above were executed fresh in this sweep.

## Limits of this sweep

- The vitest suites run package source through vitest, not the built `dist/`; the runs on the built platform are the bundle and `./sharpee` runs (AC-1, AC-2, AC-3's command line, AC-8's headless restore, AC-10's trees, AC-11, and `pnpm test:scripts`, which spawns the bundle).
- Not re-run: the IDE's `xcodebuild` scheme (626 passed in Phase 6) and `TestingSurfaceRealPathTests` (27 passed in Phase 5), `dotnet test tools/ide/PaneHost.Tests`, and `node --test tools/explorer-probe/tests/*.test.js` (fails 9 of 43 for a cause outside this work, GH #805). No acceptance criterion names them.
- Not re-run: the non-gating recordings Phase 7 left as they were (GH #813, #620, #625, #636, #682). They are a record, not a gate (ADR-395 D7).
- Open and bearing on a criterion: GH #811 (AC-8's failed-restore fallback), GH #812 (the browser's prologue move has had no mutation-verification review and no look in a real browser), GH #814 (a `.transcript` opening row has no prose to search).
