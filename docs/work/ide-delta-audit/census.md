# IDE delta audit: census

What the two Chord Writer heads (`tools/ide/SharpeeIDE`, macOS Swift; `tools/ide/PaneHost`, Avalonia) have fallen behind since the last commit that touched `tools/ide`. This file is the audit's record: it fixes nothing. Plan: `docs/work/ide-delta-audit/plan.md`.

- **Baseline**: `388ac54c7` (2026-10-23), the last commit touching `tools/ide` (`git log -1 -- tools/ide`, 2026-11-06).
- **Measured at**: `2a71ec866` (2026-11-06), main. Every command below was run on 2026-11-06 in session b9404f unless a row says otherwise.
- **Delta range**: `388ac54c7..2a71ec866`.

## Conventions

**Findings** are numbered `F-nn` across the whole audit, in the order found. Each is a GitHub issue; the census links it and never restates its body.

**Carried questions** are numbered `Q-nn`: something Phase 1 saw but did not measure. Each names the phase that settles it, where it becomes a finding or is closed with its evidence.

**Filing an issue**: search open issues first (`gh issue list -R ChicagoDave/sharpee --state open --search "<terms>"`; the repository had 234 open on 2026-11-06). An existing issue gets a comment, not a duplicate. A new one is filed with `bash ~/.claude/scripts/issues.sh create <title> <body> <labels> <provenance>` so it carries the `devarch` label and the session, plan and phase.

**Surface codes** (`S1`–`S10`) are defined in Section B and used everywhere else.

## Findings so far

| Id | Issue | Surface | Finding |
|---|---|---|---|
| F-01 | [#652](https://github.com/ChicagoDave/sharpee/issues/652) | S1, S2 | The Swift head's Chord pin is `3.6.0`; the language is `4.0.1`. |
| F-02 | [#653](https://github.com/ChicagoDave/sharpee/issues/653) | S1 | Chord Writer 1.4.0 carries a pre-4.0 toolchain in both heads; no build pairs with Sharpee 5.6.0 / Chord 4.0.1. |
| F-03 | [#654](https://github.com/ChicagoDave/sharpee/issues/654) | S4 | The generated API reference reaches no author: not in the npm package, not in the app, though two documents say otherwise. |
| F-04 | [#655](https://github.com/ChicagoDave/sharpee/issues/655) | (docs) | `tools/ide/README.md` describes the July app. Older than the delta range. |

Existing issues this audit builds on rather than repeats: #648 (bundled docs lag), #457 (vendored toolchain exports), #480 (Avalonia bundle identity), #488 (Avalonia parity), #502 (docs-tab vitest).

## Section A: the delta range

`git rev-list --count 388ac54c7..2a71ec866` prints **135**. The range is closed at `2a71ec866`: commits after it, this audit's own among them, are not part of it.

Each commit is classified by the paths it changed, under the rules below (applied by a session script that is not committed; the rules are the whole of it). The classification is by path, so it over-includes: a comment-only change inside `packages/chord/src` counts as direct.

| Class | Commits | Meaning |
|---|---|---|
| direct | 28 | Changed a source an IDE surface reads directly (S2–S7) |
| version | 1 | A version cut and nothing direct (5.5.1) |
| passenger | 40 | Platform runtime source that reaches the IDE only inside the vendored toolchain (S1) |
| not relevant | 66 | Session records, plans, ADR texts, merges, CI, tests only, stories, website paths the docs tab does not read |
| **Total** | **135** | |

IDE-relevant: 28 + 1 + 40 = **69**. Direct commits per surface (one commit can count in several): S2 10, S3 18, S4 8, S5 4, S6 3, S7 1.

**Rules.** S2: `packages/chord/chord.ebnf`, the grammar log, and `packages/chord/src` files named for the lexer, tokens, manifests, aliases or keywords. S3: every other non-test file in `packages/chord/src`, `packages/devkit/src`, `packages/ide-protocol/src`. S4: `website/src/app/{chord,learn,chord-writer}`, `website/src/images`, `website/src/lib/{nav.ts,versions.json}` (the docs-tab bundler's inputs, read from `tools/ide/web/docs-tab/build.mjs`), and `packages/devkit/templates/story-chord`. S5: `packages/branch-tester/src`, `packages/transcript-tester/src`. S6: `packages/world-index/src`. S7: `packages/platform-browser/{src,styles}`. A version cut is a commit stamping 20 or more `package.json` files. Passenger: any other non-test `packages/*/src` file.

### A.1 Direct and version commits (29)

The number is the commit's position in the range, oldest first.

| # | Commit | Date | Surfaces | Subject |
|---|---|---|---|---|
| 4 | `a3cb8f77c` | 10-23 | S2, S3, S1 | parser review step 2 Phase 3: one pattern module in chord (ADR-382 D5) |
| 6 | `0057939f0` | 10-23 | S3, S1 | step 2 Phase 4: loader and repokit register through `rule(spec)` (ADR-382) |
| 7 | `8e2935d46` | 10-23 | S2 | step 2 Phase 5: grammar-log row for ADR-382 |
| 12 | `d9da89a53` | 10-23 | S2, S3, S1 | step 3 Phase 3: Chord seat tables, `analysis.seat-conflict` (ADR-383 D3, D4) |
| 15 | `f698c1ed5` | 10-23 | S2, S3, S1 | step 3 Phase 5: dispatch and acting statements seat by the table (ADR-383 D6) |
| 19 | `a8082a2bc` | 10-24 | S2, S3, S1 | step 3 Phase 7: a `define action` answers its topic slot with `about` rows (ADR-383 D9) |
| 20 | `be81764a4` | 10-24 | S2 | step 3 Phase 8: grammar-log rows for the seat table and `about` rows |
| 25 | `75a25c3df` | 10-24 | S3, S1 | step 4 Phase 4: bare-verb prefix rules retired (ADR-384 D5) |
| 26 | `eb1876ba8` | 10-24 | S3 | step 4 Phase 5: stale bare-verb comments corrected in chord |
| 35 | `4eff9e607` | 10-25 | S6, S1 | step 6 Phase 7: scope-builder no-ops deleted; world-index follows (ADR-385 D9) |
| 48 | `a7d0a1dc2` | 10-25 | S2, S6, S1 | step 7 Phase 3: the language provider is the one word table (ADR-387) |
| 55 | `ee0e08b69` | 10-26 | S3, S5, S1 | PR #633 quality gate: comparators on seven sorts |
| 59 | `a9e3c226c` | 10-26 | S2, S3, S1 | release: Chord 4.0.0 and Sharpee 5.5.0 |
| 61 | `58e9f2bd6` | 10-26 | S4 | website delta Phase 2: `versions.json` reads 5.5.0 / 4.0.0 |
| 62 | `c6425300e` | 10-26 | S4 | website delta Phase 3: stdlib reference, migration page |
| 63 | `67d41ee38` | 10-26 | S4 | website delta Phase 4: guide pages for vehicles, expanses, sailing, state machines |
| 64 | `64a7108ba` | 10-26 | S4 | website delta Phase 5: define-action ranking, seats, gate refusals |
| 73 | `b504f4652` | 10-29 | S3, S5, S6, S1 | ADR-388 Phase 2: head-derived clause ids, `clauseOccurrenceKey` |
| 77 | `bb3c0a89c` | 10-29 | S3, S1 | ADR-388 Phase 4: identity manifest and stamp in the IR; `story language 6`; `IRIdentity` re-exported by ide-protocol |
| 79 | `f7aaf68fd` | 10-29 | S1 | release: 5.5.1 (version class) |
| 82 | `19a7c6a61` | 10-31 | S3, S5, S7, S1 | ADR-390: the player is a role the session holds |
| 85 | `7a1c62790` | 11-01 | S3, S1 | ADR-389 Phase 4: `validateIR` in chord, entity and composition gates |
| 87 | `dad0f5f5d` | 11-01 | S3, S1 | ADR-389 Phase 5: `validateIR` grammar gates |
| 89 | `4a84a9344` | 11-01 | S3, S1 | ADR-389 Phase 6: `validateIR` use-gated construct gates |
| 114 | `9bc70efeb` | 11-04 | S3, S5, S1 | bootstrap story seam Phase 1: devkit's `unknown` becomes `Story` |
| 126 | `dc9e6d8b3` | 11-05 | S2, S3, S4, S1 | `servings <n>` is an entity line (EBNF `servings-line`) |
| 128 | `26e89444b` | 11-05 | S4 | a fully eaten item leaves the world: the eating-and-drinking page rewritten (#648) |
| 130 | `2f0af36e5` | 11-05 | S4, S1 | a fully drunk item leaves the world: the same page again |
| 132 | `c60727594` | 11-05 | S2, S3, S4, S1 | release: Sharpee 5.6.0 and Chord 4.0.1 |

### A.2 Passenger commits (40), all S1

| Work stream | Count | Range positions |
|---|---|---|
| Parser review steps 2–7 (ADR-382 to ADR-387) | 21 | 3, 10, 13, 16, 23, 24, 29, 30, 31, 32, 33, 36, 38, 40, 42, 43, 44, 45, 50, 51, 52 |
| ADR-388 Phases 3 and 5 (persist by name; restore-time reconciler) | 2 | 75, 78 |
| ADR-389 loader phases | 7 | 81, 84, 86, 92, 95, 97, 98 |
| ADR-391 core contract | 4 | 104, 105, 106, 108 |
| Bootstrap story seam | 2 | 115, 116 |
| Event-processor one writer; eating | 4 | 121, 122, 125, 127 |
| **Total** | **40** | |

These change what a story does at run time (parser search and ranking, the noun matcher, saves, the player role, opening and closing events, eaten items). The IDE has no code that reads them. They arrive when the toolchain is re-vendored, and then show up in Play output and in any saved test tree whose recorded text moved.

### A.3 Not relevant (66)

Range positions 1, 2, 5, 8, 9, 11, 14, 17, 18, 21, 22, 27, 28, 34, 37, 39, 41, 46, 47, 49, 53, 54, 56, 57, 58, 60, 65, 66, 67, 68, 69, 70, 71, 72, 74, 76, 80, 83, 88, 90, 91, 93, 94, 96, 99, 100, 101, 102, 103, 107, 109, 110, 111, 112, 113, 117, 118, 119, 120, 123, 124, 129, 131, 133, 134, 135. Two merges (57, 100), Sonar and CI configuration (56, 133), blog drafts (69, 70), the Family Zoo mirror (71), a branch-tester test bound (17), the website lockfile (134), this audit's plan (135); the rest are session records, plans and ADR texts.

### A.4 ADRs accepted in the range (10)

`git diff --name-status 388ac54c7 HEAD -- docs/architecture/adrs` shows 10 added and 31 modified. Status lines are not trusted; the surfaces come from the code paths the implementing commits changed.

| ADR | Decision | IDE surface |
|---|---|---|
| 382 | Grammar rules cross as structured parts | S2 (grammar-log row, no EBNF change), S3 |
| 383 | A rule declares each slot's seat; `about` rows in `define action` | S2 (EBNF `topic-row`), S3 (new diagnostics) |
| 384 | Rules rank without confidence; bare-verb prefixes retired | S3, S1 |
| 385 | One noun matcher | S6 (world-index), S1 |
| 386 | The parser searches slot extents | S1 |
| 387 | One word table per language | S6 (`world-index/src/vocabulary.ts`, 117 lines added and 55 removed), S1 |
| 388 | Persisted identity for Chord saves | S3 (`story language 6`, `IRIdentity`), S5 (clause occurrence key in the assertion core), S6, S1 |
| 389 | Chord loader: one identity, `validateIR` in chord | S3, S1 |
| 390 | The player is a role the session holds | S3 (devkit), S5 (branch-tester, 12 files), S7 (platform-browser, 7 files), S1 |
| 391 | Core names its contract | S1 |

### A.5 Language delta

`git diff 388ac54c7 HEAD -- docs/architecture/chord-grammar-changes.md` adds **six** rows: ADR-382 (10-23), ADR-383 D3/D4 (10-23), ADR-383 D9 `about` rows (10-24), the 4.0.0 bump (10-26), `servings <n>` (11-05), the 4.0.1 bump (11-05). Two change `chord.ebnf`: `topic-row` on `action-line` and `servings-line` on `entity-line` (24 lines added, 1 removed, by `git diff --numstat`).

`git diff --shortstat 388ac54c7 HEAD` is empty for `packages/chord/src/lexer.ts` and for `packages/chord/tests/fixtures/lexer-golden`: the lexer and its golden token stream did not change in the range.

## Section B: the surface map

Read from `tools/ide` on 2026-11-06. "Derived" means built from platform source by a script; "hand" means maintained in the IDE's own source.

| Code | Surface | macOS head | Avalonia head | Reads from the platform |
|---|---|---|---|---|
| S1 | Version identity and the vendored toolchain | `project.yml` version; `vendor-toolchain.sh`; `Compose/BundledToolchain.swift`; the Chord pin in `Compose/ChordVersionCheck.swift` (hand) | `package-avalonia.sh` (takes the version from `project.yml`, runs `vendor-toolchain.sh`) | `@sharpee/devkit` and `@sharpee/platform-browser` closures by `pnpm deploy`; Node 22.23.1 from `tools/ide/vendor/node` |
| S2 | Chord language knowledge | `Editor/ChordLexer.swift` (hand port, pinned by the lexer golden); `Editor/SyntaxHighlighter.swift` keyword set (hand); `Workspace/StoryHeader*.swift` and `StoryScaffold.swift` (hand) | `editor-bridge/src/lexer-server.ts` (derived: bundles `packages/chord/src/lexer.ts`); `Hosting/ChordLexerService.cs`; `Editor/ChordColorizer.cs` | `packages/chord` lexer, `chord.ebnf`, the grammar log |
| S3 | Wire and CLI contract | `Generated/SharpeeProtocol.swift` (derived, `repokit protocol`); gates in `Compose/ComposeDiagnostics.swift` and `Project/ProjectManifest.swift` (hand); CLI calls `compose <story> --json`, `build <story> --no-menu`, `publish`, `--version`, `test <story> --tree --capture-output --capture-world --json` | `Generated/SharpeeProtocol.cs` (derived); CLI calls `init`, `build`, `compose --check`, `publish`, `test`, `test --tree … --json` | `packages/ide-protocol`, the IR projection in `tools/repokit/src/commands/protocol-projection.ts`, `packages/devkit` |
| S4 | Bundled content | `Resources/docs-tab`, `Resources/story-templates`, `Resources/play-themes` (all derived and committed) | `docs-tab` copied at packaging | `website/src/app`, `website/src/lib/{nav.ts,versions.json}`, `packages/devkit/templates/story-chord`, `packages/platform-browser/styles/themes` |
| S5 | Testing surface and tree runtime | `Resources/testing-surface` (derived and committed); `TestingSurface/*.swift`; `Test/TestRunner.swift` | `testing-surface` copied at packaging; `Shell/TestingSession.cs`, `TestingSurfacePosts.cs` | `web/testing-surface` imports `@sharpee/branch-tester` (tree-document, auto-assertion, claim-report, types, derived-runner, coverage), `@sharpee/ide-protocol` (run-events, claim-output), `@sharpee/platform-browser/host-bridge`; the transcript-tester assertion core from source |
| S6 | World tab | `World/*.swift` (12 files), calling `sharpee world-index <ir>` | `Shell/WorldMapView.cs`, `WorldReachView.cs` | `packages/world-index` through the CLI's JSON |
| S7 | Play pane | `Play/*.swift` serving `dist/web/<id>/`; `PlayThemeCatalog.swift` | Play sub-pane in `Shell/ShellWindow.axaml.cs` | The browser bundle `sharpee build` writes (`packages/platform-browser`) |
| S8 | The IDE's own tests | `SharpeeIDETests` (79 test files and one helper); `toolchain-realpath-test.sh`, `sparkle/update-realpath-test.sh`, `dmg/dmg-layout-test.sh` | `PaneHost.Tests` (14 files) | — |
| S9 | Head parity | — | — | #488 |
| S10 | Open-issue triage | — | — | — |

Shared: `web/testing-surface` (vitest, 23 test files) and `web/docs-tab` (vitest, 3 test files).

### Corrections to the plan's starting inventory

The plan's "dimensions 1–8" are not enumerated in `plan.md`; they are reconstructed here from what Phases 2–5 name (version and toolchain, language knowledge, wire, bundled content, testing surface, the IDE's tests, parity, triage). All eight are kept. Changes:

1. **Added: S6, the World tab.** Phase 3 looked for `packages/world-index` in the web panes. No web pane imports it. Its consumers are the Swift `World/` directory and two PaneHost views, through `sharpee world-index`. `packages/world-index/src` changed in 6 files over the range (148 added, 74 removed).
2. **Added: S7, the Play pane.** ADR-388's reconcile message and ADR-390's player role are referenced by no IDE source: a search of `SharpeeIDE`, `PaneHost`, `web/testing-surface/src`, `web/docs-tab/src` and `editor-bridge/src` for `save_reconciled`, `playerId` and `getPlayer` returns nothing. They reach the IDE only inside the browser bundle the toolchain builds.
3. **Removed: a shipped API reference.** The IDE ships none (F-03).
4. **Removed: bundled sample stories.** The app bundles the story template only. The one story the IDE owns is the test fixture `tools/ide/test-fixtures/fernhill-frozen`, which belongs to the tests (S8).
5. **Corrected: `tools/ide/editor-bridge` has no test suite.** It is `src/lexer-server.ts` and `build.mjs`. `tools/ide/web/testing-tab` holds only `node_modules`.
6. **Confirmed out of scope: `tools/winide`** holds a README saying it is deliberately empty, and nothing else.

Phases 2–5 of `plan.md` are edited to match.

## Section C: version identity

All rows measured 2026-11-06.

| # | Fact | Command or file | Result |
|---|---|---|---|
| C-1 | Platform version | `node packages/devkit/dist/cli.js --version` | `Sharpee 5.6.0 · Chord 4.0.1` |
| C-2 | Published platform | `npm view @sharpee/devkit version` | `5.6.0` |
| C-3 | Chord language version | `packages/chord/src/version.ts:343` | `CHORD_LANGUAGE_VERSION = '4.0.1'` |
| C-4 | IR format | `packages/chord/src/ir.ts:33` | `IR_FORMAT = 'story language 6'` |
| C-5 | The same four at the baseline | `git show 388ac54c7:<file>` | Sharpee `5.4.1`, Chord `3.6.0`, `story language 5` |
| C-6 | App version in source | `tools/ide/project.yml:202-203` | `CFBundleShortVersionString: "1.4.0"`, `CFBundleVersion: "7"` |
| C-7 | Published app | `curl https://sharpee.net/downloads/chord-writer/appcast-arm64.xml` | newest item `1.4.0`, `sparkle:version 7`, pubDate 2026-09-04 |
| C-8 | Swift head's Chord pin | `tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift:66` | `supportedLanguageVersion = "3.6.0"` (F-01) |
| C-9 | Committed docs bundle | `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` | `"chordLanguageVersion":"3.6.0"` |
| C-10 | Built macOS app, both slices | `PlistBuddy` on `release/{arm64,x86_64}/Chord Writer.app/Contents/Info.plist` | `1.4.0` / `7`, built 2026-09-04 |
| C-11 | Its bundled toolchain | the app's own `toolchain/node/bin/node toolchain/devkit/dist/cli.js --version` | `Sharpee 5.3.0 · Chord 3.6.0`; chord `dist/ir.js` carries `story language 4`; Node `v22.23.1` (F-02) |
| C-12 | Built Avalonia app (arm64) | `Contents/MacOS/sq.version`; its bundled CLI `--version` | `1.4.0`, built 2026-09-17; `Sharpee 5.4.1 · Chord 3.6.0`; `story language 4`; Node `v22.23.1` (F-02) |
| C-13 | Where the vendored version comes from | `tools/ide/vendor-toolchain.sh:202, 271, 282` | Read from `packages/devkit/package.json`; `pnpm deploy` of the workspace. Nothing pins it: a rebuild at HEAD vendors 5.6.0. |
| C-14 | Node pin | `tools/ide/vendor-toolchain.sh:79` | `NODE_VERSION="22.23.1"`; four archives present in `tools/ide/vendor/node` |
| C-15 | Compose payload gate | `ide-protocol/src/compose-diagnostics.ts:28` against `SharpeeIDE/Compose/ComposeDiagnostics.swift:35` | `2` and `2` |
| C-16 | Manifest gate | `ide-protocol/src/types.ts:19` against `SharpeeIDE/Project/ProjectManifest.swift:17` | `1` and `1` |
| C-17 | Protocol package change in range | `git diff 388ac54c7 HEAD -- packages/ide-protocol/src` | One line: `story-ir.ts` re-exports `IRIdentity` |
| C-18 | Story template mirror | `diff -r packages/devkit/templates/story-chord tools/ide/SharpeeIDE/Resources/story-templates` | No output: identical |
| C-19 | Play theme mirror | `diff -r packages/platform-browser/styles/themes tools/ide/SharpeeIDE/Resources/play-themes` | No output: identical |
| C-20 | When each committed derived bundle last changed | `git log -1 -- <path>` | docs-tab `388ac54c7` (10-23); testing-surface `8480b15d2` (10-22); story-templates `1d842b3f5` (10-05); play-themes `765e1537e` (08-08); both `Generated/` `58c2bb750` (10-09) |

**Reading.** At the baseline the Swift pin equalled the language version, because `CHORD_LANGUAGE_VERSION` stayed at 3.6.0 for the whole of the `chord-4-0` branch and moved only at the cut (`a9e3c226c`). The pin therefore never said whether the IDE's language surfaces knew the unpublished 4.0 syntax (Q-01). The app version, the pin and the docs bundle's version are the three hand-moved numbers; everything else in S1 follows the workspace at build time.

## Carried questions

| Id | Settled in | Question |
|---|---|---|
| Q-01 | Phase 2 | Does the highlighter's keyword set cover the 4.0 surface (kind-led create blocks, vehicles, expanses, state machines, `about` rows, `servings`)? The pin cannot answer (Section C reading). |
| Q-02 | Phase 2 | The generated `ComposeStoryIR.format` is documented as "the shell's hard wire gate", and no source in either head compares it to anything: `story language` appears only in test fixtures, which carry formats 1 and 2. |
| Q-03 | Phase 2 | The generated protocol is expected fresh (C-17: the generator's inputs did not change), to be confirmed by the generator's own check. |
| Q-04 | Phase 2 | `packages/chord/src/diagnostics.ts` gained 5 lines and the range added diagnostic codes (`analysis.seat-conflict`, `analysis.about-without-topic`, the `servings` codes). Does any IDE table enumerate codes? |
| Q-05 | Phase 3 | The committed testing-surface bundle dates from 10-22; its sources changed after: `branch-tester/src` 7 files, `transcript-tester/src` 4 files (`assertion-core.ts`, 18 lines added and 11 removed, for ADR-388's clause occurrence key). |
| Q-06 | Phase 3 | The committed docs bundle against 18 changed files under `website/src/app/chord`; #648 names one page. |
| Q-07 | Phase 4 | Test fixtures carry `story language 1` and `2` and language versions `2.1.0` and `3.0.0`; `fernhill-frozen` is a 2026-08-07 snapshot. Which suites still pass on the 4.0.1 compiler? |
| Q-08 | Phase 5 | The built Avalonia bundle holds `docs-tab`, `editor-bridge`, `testing-surface` and `toolchain`, and no `play-themes` or `story-templates`. Is that in #488? |
