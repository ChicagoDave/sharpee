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
| F-05 | [#656](https://github.com/ChicagoDave/sharpee/issues/656) | S2 | The Swift lexer port lexes `&` as punctuation; the TypeScript lexer makes it a word. The golden corpus has no `&`. Older than the delta range. |
| F-06 | [#657](https://github.com/ChicagoDave/sharpee/issues/657) | S3 | The Avalonia head reads the IR and the world index by hand-written key with no version gate; its generated types are used only by a test. |
| F-07 | [#658](https://github.com/ChicagoDave/sharpee/issues/658) | S3 | The IR `format` field is documented as the shells' hard wire gate and compared by neither head. |
| F-08 | [#659](https://github.com/ChicagoDave/sharpee/issues/659) | S5 | A rebuild of the testing-surface bundle at HEAD pulls 55 Chord compiler modules in from `dist-esm` (11,496 lines nothing calls), because the assertion core now imports the `@sharpee/chord` barrel. |
| F-09 | [#660](https://github.com/ChicagoDave/sharpee/issues/660) | S4, S6 | The New Story template compiles clean on 4.0.1 and opens with two World tab findings. |
| F-10 | [#661](https://github.com/ChicagoDave/sharpee/issues/661) | S8 | `toolchain-realpath-test.sh` fails at step 2 on a relative path, with an error that reads as a broken toolchain. |
| F-11 | [#662](https://github.com/ChicagoDave/sharpee/issues/662) | S8 | Four seams have no automated check: the Avalonia editor bridge, Avalonia packaging, the C# protocol round trip, growth of the committed bundles. |
| F-12 | [#663](https://github.com/ChicagoDave/sharpee/issues/663) | S8 | `assemble-dmg.sh` uses `hdiutil` verbs this macOS reports as deprecated. |
| F-13 | [#457](https://github.com/ChicagoDave/sharpee/issues/457) | S1, S8 | The published macOS Chord Writer 1.4.0 cannot build any story: its toolchain (vendored 09-04) ships `@sharpee/character` without `dist-esm`. The Avalonia 1.4.0 toolchain (vendored 09-17, after `f875425f3`) builds one. Measured on the real path (H.2); recorded on #457. |
| F-14 | [#488](https://github.com/ChicagoDave/sharpee/issues/488) | S9 | Six parity gaps #488 does not list (inline diagnostics and editor helpers, project-tree depth and menu, status-bar versions, Settings and Build Settings, structured Problems, Play header controls) plus session persistence; one #488 item overtaken (Index landed). Recorded on #488. |

Existing issues this audit builds on rather than repeats: #648 (bundled docs lag; measured in Section F, comment added), #457 (vendored toolchain exports; confirmed on the shipped macOS app in Section H as F-13, comment added), #480 (Avalonia bundle identity), #488 (Avalonia parity), #502 (docs-tab vitest; reproduced in Section G, cause corrected in a comment).

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

## Section D: language knowledge

Measured 2026-11-06 at `9305edab5` (Phase 2). The tree differs from `2a71ec866` only by this audit's own documents.

### D.1 Where each head keeps what it knows about Chord

"Derived" is built from `packages/chord` by a script or an import; "hand" is typed into the IDE's source and must be moved by a person.

| # | Knowledge | Head | Kind | Pinned by | State |
|---|---|---|---|---|---|
| D-1 | Tokenizer: `SharpeeIDE/Editor/ChordLexer.swift` | macOS | hand port of `packages/chord/src/lexer.ts` | `ChordLexerGoldenTests` against `lexer-golden.json` | The TypeScript lexer did not change in the range. One older divergence: `&` (F-05) |
| D-2 | Tokenizer: `editor-bridge/src/lexer-server.ts` behind `PaneHost/Hosting/ChordLexerService.cs` | Avalonia | derived: bundles `lexer.ts` and `diagnostics.ts` from source | no test in `PaneHost.Tests` names the lexer or the colorizer | Current when rebuilt. The bundle on disk (2026-09-16, gitignored) postdates the last behavioural lexer change (2026-09-06) |
| D-3 | Keyword set (40 words) and header property keys (15): `SharpeeIDE/Editor/SyntaxHighlighter.swift` | macOS | hand | `SyntaxHighlighterTests` | Nothing owed by the range. Six block forms added since 1.4.0 are absent (below) |
| D-4 | The same 40 and 15, copied: `PaneHost/Editor/ChordColorizer.cs` | Avalonia | hand copy of D-3 | none | Identical to D-3 today (both counted); every change is made twice |
| D-5 | Chord version pin: `SharpeeIDE/Compose/ChordVersionCheck.swift:66` | macOS | hand | `ChordVersionCheckTests`, `DocsTabRealPathTests` | Stale (F-01). The Avalonia head has no pin and no launch check |
| D-6 | Story header readers and writers: `SharpeeIDE/Workspace/StoryHeader{Lines,IFID,Themes,PublishSource,AutoAssertion}.swift` | macOS | hand | four `StoryHeader*Tests` (IFID, themes, publish-source, auto-assertion) | The parser's header code did not change in the range. The three `auto-assertion` values equal the parser's (`parser.ts:1045-1047`) |
| D-7 | New Story: `Workspace/StoryScaffold.swift` over `Resources/story-templates` | macOS | derived mirror | `StoryScaffoldTests` | Mirror identical to `packages/devkit/templates/story-chord` (C-18) |
| D-8 | Import and fragment edits: `Editor/ImportCommands.swift`, `ImportRefactor.swift` | macOS | hand (`story` … `end`, import lines) | `ImportRefactorTests`, `EditorImportCommandTests` | The range's EBNF changes do not touch these productions |
| D-9 | World tab source edits: `World/WorldSourceEdit.swift`, `WorldPhraseLocator.swift`, `WorldProseChunker.swift` | macOS | hand (`create`, `aka`, `the` line shapes) | `WorldSourceEditTests`, `WorldPhraseLocatorTests` | The range's EBNF changes do not touch these productions |
| D-10 | Index bucketing by kind name (room, region, person, thing): `Compose/StoryIndex.swift` and `PaneHost/Shell/StoryIndex.cs` | both | hand, twin copies | `StoryIndexTests` in each suite | The IR members they read did not change in the range (Section E) |
| D-11 | Diagnostic codes | both | none kept | — | No production source in either head names a `parse.` or `analysis.` code; codes pass through as text |
| D-12 | Claim syntax in the Testing tab | shared web pane | derived: imported from `@sharpee/branch-tester` | `web/testing-surface/tests` | Bundle freshness is Q-05 |

Not present in either head: completion, an alias catalog, any copy of `chord.ebnf`. `Editor/AutoIndenter.swift` and `BracketMatcher.swift` hold no Chord words.

### D.2 The six grammar-log rows, per head

Classified against the IDE's source at HEAD, not against the shipped binary, which runs a 3.6.0 compiler whatever the editor knows (F-02).

| Row | macOS head | Avalonia head |
|---|---|---|
| ADR-382: rules cross as structured parts (no EBNF change) | not applicable | not applicable |
| ADR-383 D3/D4: seats; `analysis.seat-conflict`, `analysis.unknown-slot` (no EBNF change) | handled: codes pass through Problems | handled: the head prints the CLI's own output (`ShellWindow.axaml.cs:991`) |
| ADR-383 D9: `about` rows in a `define action` (EBNF `topic-row`) | handled: no new token kind; `about` was never colored in topic tables either; the IR's new `topics` is not read | handled: the real lexer; same list |
| Chord 4.0.0 bump | **stale**: the pin (F-01) | not applicable: no pin |
| `servings <n>` entity line (EBNF `servings-line`) | handled: a word and a number; entity lines are not colored by the set's own rule; three new codes pass through | handled |
| Chord 4.0.1 bump | **stale**: the pin (F-01) | not applicable: no pin |
| **Totals** | handled 3, stale 2, not applicable 1 = **6** | handled 3, stale 0, not applicable 3 = **6** |

### D.3 Diagnostic codes

Seven codes appear only on added lines of `git diff 388ac54c7 HEAD -- packages/chord/src`: `analysis.about-without-topic`, `analysis.act-unseated-slot`, `analysis.seat-conflict`, `analysis.servings-duplicate`, `analysis.servings-owner`, `analysis.unknown-slot`, `parse.servings-number`. None was removed. `validate-ir.ts` (ADR-389) carries 51 code-literal occurrences, all in the `analysis.` family. `diagnostics.ts` gained one method (`add`), no code. Neither head enumerates codes, so nothing is owed (Q-04 closed).

### D.4 What the pin move owes, by its own precedent

The comment above the pin says a bump is honest only when the golden corpus exercises the new surface; the 3.3.0 and 3.6.0 bumps each added a corpus file and extended the keyword set. Measured, and recorded as a comment on #652:

- The seven corpus stories contain none of `end claims`, `end landmarks`, `end passage`, `end position`, `end pushing`, `end sailing`, `servings`, `vehicle`, `expanse`, `define machine`.
- `chord.ebnf` gained six block forms between 1.4.0 (`d936024cc`, 2026-09-04) and the baseline: claims, landmarks, passage, position, pushing, sailing. None is in the keyword set. The range itself added no block form and no `define` noun (28 at the baseline, the same 28 now).
- Older gaps in the same lists, for a ruling on whether the set is curated or complete: 11 of the 28 `define` nouns are uncolored, and the header key `auto-assertion` is not in the property set.

This answers Q-01: the keyword set does not cover the 4.0 surface, and nothing in the range made that worse.

## Section E: wire contract

Measured 2026-11-06 at `9305edab5`.

### E.1 Generated protocol

```
$ ./repokit protocol --check
protocol --check: generated protocol types match the TypeScript wire contract
exit status: 0
```

`--check` regenerates in memory and compares; it wrote nothing (`git status` unchanged). Both `tools/ide/SharpeeIDE/Generated/SharpeeProtocol.swift` and `tools/ide/PaneHost/Generated/SharpeeProtocol.cs` are fresh (Q-03 closed).

### E.2 The IR members the heads read, against `story language 6`

Over the range `packages/chord/src/ir.ts` changed as follows (non-comment lines of the diff): `IR_FORMAT` 5 to 6; a new required `identity: IRIdentity` on the story (stamp, entities, exits, clauses, selects, chapters, timers, landings, counters); `servings?` on an entity; `id` on an on-clause; `topics?` on an action; the function `primarySlotOf` removed.

The heads decode a projection, `IdeStoryIR` in `tools/repokit/src/commands/protocol-projection.ts`: `format`, `languageVersion`, `meta` (title, fields: id, storyVersion, authors), `grammarFile`, `entities` (id, name, isPlayable, kinds, containing, descriptionSource, roomNameSource, span), `actions` (name, span), `phrases` (defaultLocale, locales). None of these members changed. The projection carries a compile-time assertion that it narrows the real `StoryIR` (`STORY_IR_PROJECTION_IS_A_NARROWING`), and `tools/repokit` compiled at HEAD: its `dist/commands/protocol.js` was rebuilt on 2026-11-06 by the Phase 1 commit gate's run.

| Member added by the range | Read by the macOS head | Read by the Avalonia head |
|---|---|---|
| `identity` (ADR-388 manifest and stamp) | no | no |
| `servings` | no | no |
| on-clause `id` | no | no |
| action `topics` | no | no |

Nothing is stale here. The identity manifest is consumed by the loader and the restore path inside the toolchain, not by the IDE.

### E.3 Version gates

| Contract | Platform | macOS head | Avalonia head |
|---|---|---|---|
| Compose payload `schemaVersion` | 2 (`compose-diagnostics.ts:28`) | gate, 2 (`Compose/ComposeDiagnostics.swift:35, 52`) | no gate; the head does not call `compose --json` |
| Introspection manifest `schemaVersion` | 1 (`types.ts:19`) | gate, 1 (`Project/ProjectManifest.swift:17, 30`) | not read |
| World index `schema` | `world-index/4` (`world-index/src/document.ts:67`, file unchanged in the range) | gate (`World/WorldIndexDocument.swift:25, 848`) | no gate (`Shell/WorldMapView.cs:52` parses the file by key) |
| Run events `schemaVersion` | 2 (`run-events.ts:52`, unchanged in the range) | none native, by ADR-352: the Testing tab is TypeScript and imports the guards | same |
| IR `format` | `story language 6` | decoded, compared to nothing | not read |

Two findings:

- **F-06** ([#657](https://github.com/ChicagoDave/sharpee/issues/657)): the Avalonia head's production code uses none of the generated C# types. `Shell/StoryIndex.cs` reads `dist/<id>.ir.json` by 18 string keys and `Shell/WorldMapView.cs` reads the world index by string key, with no version gate. All 18 keys are members of the projection today, so nothing is broken; a rename would fail no build.
- **F-07** ([#658](https://github.com/ChicagoDave/sharpee/issues/658)): the projection documents `format` as "the shell's hard wire gate" and neither head compares it (Q-02 closed as a finding). The envelope's `schemaVersion` did not move when the IR format did.

### E.4 Reconcile and player identity

A search of `tools/ide/SharpeeIDE`, `tools/ide/PaneHost`, `tools/ide/web/testing-surface/src`, `tools/ide/web/docs-tab/src` and `tools/ide/editor-bridge/src` for `save_reconciled`, `saveReconciled`, `playerId` and `getPlayer` returns nothing. No IDE source handles the ADR-388 reconcile channel or reads a player id. Both reach the app only inside the browser bundle `sharpee build` writes; the Play pane is checked in Phase 3.

## Section F: bundled content

Measured 2026-11-06 at `cd6e5f2f0` (Phase 3, session 351c89). The tree differs from `2a71ec866` only by this audit's own documents and session records.

### F.1 Method

The two bundlers (`web/docs-tab/build.mjs`, `web/testing-surface/build.mjs`) write to a fixed path inside `SharpeeIDE/Resources` and have no check mode, and the two mirror scripts delete their target before copying. None was run in place. Instead the tracked sources were exported to a scratch directory (`git archive HEAD packages website/src tools/ide/web tools/ide/SharpeeIDE/Resources tsconfig.base.json tsconfig.json package.json`, with `node_modules` linked in for esbuild), the two bundlers were run there, and their output was compared with the checked-in bundles by `diff -r`. The mirrors are plain copies, so `diff -r` of source against mirror is the whole check. `git status` afterwards shows the checked-in tree untouched.

`tools/ide/vendor/node` holds the four Node archives and no unpacked `bin/node`, so the scripts' first tier misses and they fall through to the Node on `PATH`. The scratch builds ran on that Node, `v25.8.1`.

### F.2 Verdict per content class

| Class | Committed copy | Verdict | Differing items |
|---|---|---|---|
| Docs tab (`Resources/docs-tab`) | 163 pages, `chordLanguageVersion` 3.6.0, last built at `388ac54c7` (10-23) | **stale** | 16 of 177 files: 4 pages missing, 11 pages changed, the index |
| Story template (`Resources/story-templates`) | 2 files | fresh | 0 (`diff -r` against `packages/devkit/templates/story-chord` prints nothing) |
| Play themes (`Resources/play-themes`) | manifest, 4 themes, 2 fonts | fresh | 0 (`diff -r` against `packages/platform-browser/styles/themes` prints nothing) |
| API reference | not shipped (F-03) | not applicable | — |
| Sample stories | none bundled; the template stands in | fresh, with F-09 | — |

Both pre-build mirrors and both bundlers run on every macOS build (`project.yml:103-124`), so the docs bundle and the testing-surface bundle (Section G) are rewritten in the working tree the next time the app is built.

### F.3 The docs tab, page by page

```
$ node tools/ide/web/docs-tab/build.mjs        (in the scratch export)
docs tab: 167 pages in nav order, 5 excluded by EXCLUDED_GROUPS/EXCLUDED_PAGES, 6 images (Chord 4.0.1)
exit status: 0
```

The build is healthy at HEAD: no unhandled MDX component, and the nav and the content tree agree. Compared with the committed bundle: 12 files changed, 4 added, 0 removed, 161 identical.

| Page | State | Website change behind it |
|---|---|---|
| `chord/guide/world/vehicles` | missing from the app | new page, `67d41ee38` (10-26) |
| `chord/guide/world/expanses` | missing | new page, same commit |
| `chord/guide/world/sailing` | missing | new page, same commit |
| `chord/guide/flow/state-machines` | missing | new page, same commit |
| `chord/stdlib/npcs/eating-and-drinking` | changed (10 lines out, 27 in) | the page #648 names |
| `chord/guide/vocabulary/define-action` | changed (1 out, 18 in) | ranking, seats, gate refusals (`64a7108ba`) |
| `chord/guide/vocabulary/extend-action` | changed | |
| `chord/guide/world/kinds-traits-and-settings` | changed (8 in) | `servings` |
| `chord/guide/world/states` | changed | |
| `chord/guide/world` (overview) | changed | links to the three new pages |
| `chord/guide/flow` (overview) | changed | link to the new page |
| `chord/guide/tooling/migrating-from-removed-constructs` | changed | |
| `chord/stdlib/plugins/npc-and-state-machine-plugins` | changed | |
| `chord/stdlib/reference` | changed | |
| `chord-writer` (overview) | changed | its status-bar example prints `versions.json`, now 5.6.0 / 4.0.1 |
| `docs-index.json` | changed | version stamp 3.6.0 to 4.0.1, four nav entries, search text |

`docs.js`, `docs.css`, `index.html` and the six images are identical. The 15 pages map one to one onto the range's changes under the bundler's inputs: 14 `content.mdx` files (10 changed, 4 new) and `versions.json`. This closes Q-06 and is recorded on #648: the lag is the whole Chord 4.0 documentation delta, not one page.

The bundle's version stamp matters twice. The tab shows a banner when the running toolchain reports a different Chord version; today the committed stamp (3.6.0) matches the shipped 1.4.0 toolchain and would mismatch a toolchain vendored at HEAD (F-02). And it is the value `DocsTabRealPathTests` compares against the Swift pin (F-01).

### F.4 The story template on the current compiler

The template was scaffolded in the scratch directory with `sharpee init -y`, and the `.story` and its config sidecar were copied alone into a second directory to match what the IDE's New Story writes. The commands are the ones the Swift head runs, on the workspace CLI (`Sharpee 5.6.0 · Chord 4.0.1`, `dist` built 2026-11-06 03:26, after the last `packages` commit).

| Command | Result |
|---|---|
| `compose <story> --json` | `"schemaVersion":2,"diagnostics":[]`, `"format":"story language 6"`, `"languageVersion":"4.0.1"` |
| `build <story> --no-menu` | "Validated … (gate-clean)", `game.js` 1715.8 KB, "Wired 4 theme(s): modern-dark, retro-terminal, paper, system-6", "Build complete" |
| `world-index <ir>` | `world-index/4`, `ok: true`, `analyzerVersion` 5.6.0; `incomplete.counts`: missingWord 1, noObject 1, ambiguous 0, undescribed 0 |
| `test <story> --tree --capture-output --capture-world --json` | "no test tree found … expected a <story-id>.tests/ directory" (the story has none) |

The template uses the kind-led create block and needs nothing from the range. Its two World findings are **F-09** ([#660](https://github.com/ChicagoDave/sharpee/issues/660)): the lantern's description says "old" and the lantern has no such word, and the Landing's description says "story" with no object to answer it.

Not measured: the same story on the shipped 1.4.0 toolchain. A hand run of the Avalonia bundle's CLI stopped at `Cannot find module '@sharpee/platform-browser'`; the app supplies a module path the hand run did not, and #457 already says that toolchain cannot build a Chord story. It was not pursued, so whether the range changed the template's World findings is unknown.

### F.5 Play themes

The mirror equals its source, and `packages/platform-browser/styles` did not change in the range (`git diff --stat` prints nothing). The manifest's four ids are the four the template's `themes:` line names and the four the build wired. The theme files style 13 class names without the `sharpee-` prefix (`command-echo`, `game-status`, `system-message`, `selected`, and nine save-dialog and startup-dialog classes); every one sampled (7) still exists in the client's source or templates, so no theme rule points at a class the client stopped writing.

## Section G: testing surface, tree runtime, World tab, Play pane

Measured 2026-11-06 at `cd6e5f2f0`.

### G.1 The committed testing-surface bundle (Q-05)

```
$ node tools/ide/web/testing-surface/build.mjs        (in the scratch export)
testing-surface bundled
```

| | Committed (`8480b15d2`, 10-22) | Rebuilt at HEAD |
|---|---|---|
| `surface.js` | 5,049 lines, 218,168 bytes | 16,545 lines, 797,590 bytes |
| `surface.css` | — | identical |

The diff is 11,496 lines added and none removed. All of them are 55 modules from `packages/chord/dist-esm`. With those lines removed the rebuilt file is byte-identical to the committed one.

The cause is one line: `packages/transcript-tester/src/assertion-core.ts:47`, `import { clauseHeadId, spokenClauseHead } from '@sharpee/chord'`, added by `b504f4652` (ADR-388 Phase 2, 10-29). `build.mjs` aliases nine modules to source and has no alias for `@sharpee/chord`; the package declares no `sideEffects`, so esbuild keeps the whole barrel. Neither name appears in the rest of the bundle. This is **F-08** ([#659](https://github.com/ChicagoDave/sharpee/issues/659)).

So Q-05 has two answers. The committed bundle is functionally current: every module the surface runs is unchanged. And it cannot be rebuilt cleanly: the next build adds about 580 KB read from `dist-esm`, which the bundler's own header says it must not depend on.

### G.2 The surface against the tree runtime's public surface

- `npx tsc --noEmit -p tools/ide/web/testing-surface/tsconfig.json` printed no errors. The surface's source and tests type-check against the current sources of the modules it imports.
- `packages/branch-tester/src` changed in 7 files over the range (`claims/claim-candidates`, `claim-lock`, `claim-predicates`, `claims-game`, `claims-walk`, `derived-runner`, `tree-walker`). None is one of the four the bundle carries (`auto-assertion`, `types`, `tree-document`, `claims/claim-report`). The two bundled modules that did change, `assertion-core.ts` and `story-loader/src/pin-grammar.ts`, change nothing the surface reaches (G.1).
- The line-visit and story-as-suite decisions (ADR-353, ADR-356) are carried by those modules and by the surface's own source, which did not change in the range (`git diff --stat 8480b15d2 HEAD -- tools/ide/web/testing-surface/src` prints nothing).

### G.3 Tree-document format

`TREE_DOCUMENT_VERSION = 3` (`packages/branch-tester/src/tree-document.ts:85`); the file did not change in the range. The reader refuses a newer version by name and calls an older one malformed. Neither native head reads the version: the Swift head reads the manifest's pinned seed (`TestingSurfaceViewController.swift:310`) and treats the `<story-id>.tests/` directory as files, as does `PaneHost/Shell/TestingSession.cs`. The version check lives only in the web surface, through the imported module. Nothing is owed.

### G.4 The docs tab's own suite (#502)

```
$ npx vitest run --root tools/ide/web/docs-tab
tests/markdown.test.mjs (16 tests)      passed
tests/mdx.test.mjs (9 tests)            passed
tests/nav-bridge.test.mjs (18 tests | 3 failed)
```

40 passing, 3 failures. The three are the "the real site" tests, each with `Failed to resolve module specifier "./versions.json" from "data:text/javascript;base64,…"`. #502 is reproduced, and its body names the wrong function: `build.mjs`'s `loadNav` bundles `nav.ts` and works (F.3 exited 0). The test keeps its own copy, `loadRealNav` (`tests/nav-bridge.test.mjs:208-213`), which still calls `esbuild.transform`; a bare transform leaves the relative import in place and a data URL has nothing to resolve it against. Recorded as a comment on #502. The test file's own comment says the suite is not in `pnpm test:ci`, which is how it has stayed red since `nav.ts` gained the import (`3d3c9d829`, 2026-08-18).

### G.5 World tab

`packages/world-index/src` changed in 6 files over the range (`vocabulary.ts` most of it). `document.ts`, which declares the output, did not, and the schema is still `world-index/4`. The current CLI's output on the scaffolded story carries that schema. The Swift head gates the schema; the Avalonia head reads by key with no gate (F-06). The decoders themselves were not exercised here: `WorldIndex*` tests run in Phase 4.

### G.6 Play pane

| The Swift head expects | The current build writes |
|---|---|
| `index.html`, `index-testing.html` | both |
| `game.js`, `game.js.map` | both |
| `themes/<id>.css` | four, plus `themes/system-6/fonts` |
| channels `turnEvents`, `testingSurface`, `testingConsole` (testing page only) | `host-bridge.ts` unchanged in the range |

`packages/platform-browser/src` changed by two lines over the range, both the ADR-390 player read (`SaveManager.ts`, `world-digest.ts`). The built `game.js` embeds `story language 6`.

- **ADR-388 reconcile.** `save_reconciled` is a platform event rendered from `lang-en-us/src/platform-messages.ts` through the engine's platform dispatcher; it is in the built `game.js`. It needs no IDE code. In the Play pane it can hardly occur: every boot clears the page's storage (`PlayViewController.swift:83`), so no save outlives a rebuild there, and the testing page uses a non-persistent data store (`TestingSurfaceViewController.swift:215`).
- **ADR-390 player role.** Read inside the client only. No IDE source names it (E.4).

Nothing is stale in the Play pane's contract. The Avalonia Play sub-pane serves the same build output (Section B) and was not examined separately; head parity is Phase 5.

## Section H: the IDE's own tests

Measured 2026-11-06 at `abf2b9d24` (Phase 4, session 351c89). Two measurements re-run 2026-11-07 at `4ae0396f6` (session 35701b) on David's ruling: the toolchain real-path script given absolute paths, and the Avalonia capability tests given their environment. Both re-runs were in place (neither touches a tracked file; `git status` afterwards unchanged), each once.

### H.1 Method

The macOS build's four pre-build phases write into `SharpeeIDE/Resources` (Section F.2), so an in-place `xcodebuild test` would have rewritten 17 tracked files. Every suite below was therefore run in a copy-on-write clone of the repository in the scratch directory (`cp -cR`, 26 seconds), which carries the workspace's built `dist` and `node_modules` as they stood. Each suite ran once. Nothing was retried and nothing was fixed. `git status` in the real tree afterwards shows only this audit's own `plan.md` stamp.

### H.2 Results

| Suite | Command | Result |
|---|---|---|
| `SharpeeIDETests` (macOS, 79 test classes) | the pinned `xcodebuild test` (below) | 626 tests: 624 passing, 2 failures |
| `PaneHost.Tests` (Avalonia) | `dotnet test PaneHost.Tests/PaneHost.Tests.csproj` | environment unset (11-06): 135 tests, 127 passing, 8 failures; with `SHARPEE_IDE_TOOLCHAIN`, `SHARPEE_IDE_CAPABILITY_FIXTURE` and `SHARPEE_IDE_CAPABILITY_STORY` set (11-07): 135 tests, 135 passing, 0 failures, 0 skipped, 2 s |
| `web/testing-surface` | `npx vitest run --root tools/ide/web/testing-surface` | 23 files, 247 tests: 247 passing, 0 failures |
| `web/docs-tab` | `npx vitest run --root tools/ide/web/docs-tab` (the Phase 3 run, G.4; not repeated) | 43 tests: 40 passing, 3 failures (#502) |
| `dmg/dmg-layout-test.sh` | no arguments | 20 passing, 0 failures |
| `toolchain-realpath-test.sh` | against the two built 1.4.0 apps, absolute paths (11-07) | macOS app (`Sharpee 5.3.0 · Chord 3.6.0`): FAIL at step 3, `sharpee build` cannot resolve `@sharpee/character` (F-13, #457); Avalonia app (`Sharpee 5.4.1 · Chord 3.6.0`): PASS, `game.js` 1,441,895 bytes, `engine.css` beside it |
| `sparkle/update-realpath-test.sh` | — | not run: it signs with the real Sparkle key from the keychain |
| `tools/ide/editor-bridge` | — | has no suite (Section B) |
| `test-fixtures/fernhill-frozen` | `sharpee compose fernhill.story --check` | "Chord 4.0.1 — … is gate-clean" |

**The macOS suite.** `xcodegen generate`, then from `tools/ide` in the clone:

```
xcodebuild test -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -destination 'platform=macOS'
  -derivedDataPath ./DerivedData-audit -clonedSourcePackagesDirPath ./DerivedData/SourcePackages
  SYMROOT=<clone>/tools/ide/DerivedData-audit/Build/Products
  OBJROOT=<clone>/tools/ide/DerivedData-audit/Build/Intermediates.noindex

Executed 626 tests, with 2 failures (0 unexpected) in 51.895 (52.039) seconds
** TEST FAILED **
```

It differs from the pinned invocation in two ways: a fresh derived-data directory, because the cloned one holds the real tree's paths, and `-clonedSourcePackagesDirPath`, to reuse the Sparkle checkout already on disk. The Manual-signed test bundle signed from the keychain and the hosted app launched in the logged-in session; the run finished in about a minute without waiting on a prompt. The Phase 4 concern about signing and a GUI session did not materialise.

The two failures are the two predicted in Phase 1, and both are F-01 (recorded on #652):

- `ChordVersionCheckTests.testRealVersionOutputParses` (`ChordVersionCheckTests.swift:86`): `("3.6.0") is not equal to ("4.0.1")`.
- `DocsTabRealPathTests.testTheBundledCorpusIsPinnedToTheCompilersChordVersion` (`DocsTabRealPathTests.swift:277`): `("4.0.1") is not equal to ("3.6.0")`. The 4.0.1 is the docs bundle the build had just regenerated.

The build confirmed Sections F and G on the real path. Its log carries "docs tab: 167 pages … (Chord 4.0.1)" and "testing-surface bundled", and `git status` in the clone afterwards lists 17 changed tracked files: the 16 docs files and `surface.js`, now 16,545 lines with 55 banners reading `packages/chord/dist-esm/…`. `TestingSurfaceRealPathTests` passed against that enlarged bundle, so F-08 is weight and a `dist-esm` dependency, not a behaviour change (recorded on #659).

**The Avalonia suite.** On 11-06 all 8 failures were one unmet precondition, not assertions about the product: 7 read `SHARPEE_IDE_TOOLCHAIN is not set` and 1 reads `SHARPEE_IDE_CAPABILITY_FIXTURE is not set`. They are the capability tests in `HostCapabilityTests.cs` (`SubprocessTests` 5, `DocumentsFolderTests` 2, `ToolchainResolutionTests` 1), which by design fail rather than skip when their environment is missing (`PaneHost/README.md`).

On 11-07, on David's ruling, the suite was re-run once with the three variables the README names: `SHARPEE_IDE_TOOLCHAIN` at the staged toolchain (`~/Library/Caches/net.sharpee.panehost/stage/toolchain`, `Sharpee 5.4.1 · Chord 3.6.0`, dated 09-26), `SHARPEE_IDE_CAPABILITY_FIXTURE` at `~/Documents/Sharpee Capability Fixture` and `SHARPEE_IDE_CAPABILITY_STORY` at its `capability-fixture.story`. `dotnet test` printed `Passed!  - Failed:     0, Passed:   135, Skipped:     0, Total:   135, Duration: 2 s`. The tests rewrote the fixture's `avalonia-capability-check.txt` (stamp `2026-11-07T00:07:34`), which is what they are for. So the Avalonia head's real-path layer (the vendored Node, the sealed shim, compose through it, the Documents folder) **passes against the September toolchain**. It is still not measured against a toolchain vendored at HEAD: `vendor-toolchain.sh` signs with the Developer ID Application certificate and a timestamp, so it was not run, and the staged toolchain is the one from 09-26.

**The toolchain real-path script.** On 11-06, given a relative path from `tools/ide`, both runs passed the scrub check and the version check (`Sharpee 5.3.0 · Chord 3.6.0` for the macOS app, `Sharpee 5.4.1 · Chord 3.6.0` for the Avalonia app) and then failed at `sharpee init` with `env: …/toolchain/bin/sharpee: No such file or directory`. The script changes directory before step 2 and never makes its argument absolute. That is **F-10** ([#661](https://github.com/ChicagoDave/sharpee/issues/661)); it says nothing about either toolchain.

On 11-07, on David's ruling, the script was re-run once per app with an absolute path (`release/arm64/Chord Writer.app` and `release-avalonia/arm64/Chord Writer (Avalonia).app`, the two built 1.4.0 bundles of C-10 and C-12). Both passed steps 0 to 2, which confirms F-10 is path handling and nothing else. They then diverge:

- The macOS app's toolchain (`Sharpee 5.3.0`, vendored 2026-09-04, the slice the appcast publishes, C-7) **fails step 3**: `sharpee build` validates the story gate-clean, writes the IR, and dies in esbuild with `Could not resolve "@sharpee/character"` three times, each `The module "./dist-esm/index.js" was not found on the file system` from `@sharpee/story-loader/dist-esm/{evaluator,loader,runtime}.js`. The vendored `@sharpee/character` holds `dist`, `package.json`, `README.md` and no `dist-esm`. This is [#457](https://github.com/ChicagoDave/sharpee/issues/457) exactly, now measured on the shipped bundle rather than a fresh vendoring: **the published Chord Writer 1.4.0 cannot build any story**. That is **F-13**.
- The Avalonia app's toolchain (`Sharpee 5.4.1`, vendored 2026-09-17) **passes**: `game.js` 1,441,895 bytes and `engine.css` beside it, `PASS — the bundled toolchain is self-contained`. Its vendored `@sharpee/character` carries `dist-esm`. The difference is `f875425f3` (2026-09-16, "toolchain correctness (Phase 3a)"), which added `dist-esm` to the `files` list of `bootstrap`, `character` and `sharpee`, between the two vendorings. Of #457's seven packages, `bridge` and `runtime` still list only `dist`, and `branch-tester` and `transcript-tester` now have no `files` key at all; none of the four is imported by the story bundle, so the build passes with them as they are.

**The DMG script** printed a deprecation warning for every `hdiutil` verb it and the production `assemble-dmg.sh` use: **F-12** ([#663](https://github.com/ChicagoDave/sharpee/issues/663)).

### H.3 Old-format fixtures (Q-07)

Six test files carry hand-written IR with `story language 1` (1 occurrence) or `story language 2` (6), and language versions `2.1.0` (1) and `3.0.0` (6): `StoryIndexTests.swift`, `SplitDividerTests.swift`, `WindowTitleTests.swift`, `ComposeDiagnosticsTests.swift`, `IRTreeStateTests.swift` and `PaneHost.Tests/ProtocolTypeTests.cs`. Every one of those tests passes, because neither head compares the format (F-07). The frozen Fernhill fixture compiles gate-clean on 4.0.1. Its README names a consumer, `TestingTabRealPathTests.swift`, that no longer exists; the fixture is used today by `ShippedThemesRealPathTests.swift` and `AutoAssertionMenuTests.swift` (recorded on #655). Q-07 is closed: no suite fails on the 4.0.1 compiler for a fixture reason.

### H.4 The seam map

"Real path" means the test drives the owned dependency itself: the workspace CLI, a real page, a real socket, a real image.

| Seam | Real-path test | State | Smallest missing check |
|---|---|---|---|
| Swift head to the CLI (compose, build, test, world-index) | `SharpeeIDETests/ComposeRunnerTests.swift`, `BuildRunnerTests.swift`, `TestRunnerTests.swift`, `WorldIndexTests.swift`, through `TestToolchain.devkitCLI` | pass | — |
| Testing surface: page, CLI, sidecar | `SharpeeIDETests/TestingSurfaceRealPathTests.swift`; `web/testing-surface/tests/claims-real-path.test.ts`, `derived-real-path.test.ts`, `lock-gesture-real-path.test.ts`, `tree-session-real-path.test.ts`, `ac-signoff-cli.test.ts` | pass | — |
| Play pane and shipped themes | `SharpeeIDETests/ShippedThemesRealPathTests.swift` (unit tests beside it: `PlayURLSchemeHandlerTests.swift`, `PlaySurfaceScriptTests.swift`) | pass | — |
| Docs-tab build | `SharpeeIDETests/DocsTabRealPathTests.swift`; `web/docs-tab/tests/nav-bridge.test.mjs` | 1 failure (the pin), 3 failures (#502) | the test's `loadRealNav` bundling as `build.mjs` does |
| Chord version pin | `SharpeeIDETests/ChordVersionCheckTests.swift` | 1 failure (F-01) | — |
| Swift lexer port | `SharpeeIDETests/ChordLexerGoldenTests.swift` | pass; the corpus has no `&` and none of the 4.0 forms (F-05, D.4) | corpus stories for both |
| Avalonia editor bridge | none | untested | F-11: the built lexer-server against the lexer golden |
| Avalonia pane door | `PaneHost.Tests/PaneDoorTests.cs`, `PaneServerTests.cs`, `LocalOriginHttpTests.cs` (real HTTP; `PaneRelayTests.cs` is a unit test beside them) | pass | — |
| Avalonia host capabilities | `PaneHost.Tests/HostCapabilityTests.cs` | pass against the staged 5.4.1 toolchain of 09-26 (H.2); a HEAD toolchain is not measured | — |
| Generated protocol round trip, C# | none; `PaneHost.Tests/ProtocolTypeTests.cs` decodes hand-written JSON | scaffolding only | F-11: the capability test's real `compose --json` output through the generated type |
| Save identity and reconcile, player role | none | no IDE code to test (E.4, G.6) | — |
| macOS packaging: bundled toolchain | `toolchain-realpath-test.sh` | FAIL on the shipped 1.4.0 app: cannot build a story (F-13, #457); PASS on the Avalonia 1.4.0 app | — |
| macOS packaging: DMG | `dmg/dmg-layout-test.sh` | pass | — |
| macOS packaging: update feed | `sparkle/update-realpath-test.sh` | not run: signs | — |
| Avalonia packaging | none | untested | F-11: the toolchain real-path script as the last step of `package-avalonia.sh` |
| Growth of the committed bundles | none | untested | F-11: the bundler refusing a module outside its alias list |

Neither `package.sh` nor `package-avalonia.sh` calls the real-path scripts; they run when someone runs them. The four untested seams are **F-11** ([#662](https://github.com/ChicagoDave/sharpee/issues/662)).

## Section I: head parity

Read from the code of both heads 2026-11-07 at `d8f426311` (Phase 5, session 35701b). #488 (2026-09-17) is the parity record this section builds on; it is cited for what it already holds and extended only where the code says something it does not.

### I.1 What #488 records, re-checked

| #488 item | State on 2026-11-07 | Evidence |
|---|---|---|
| Four menu stubs: New Import…, Extract Selection to Import…, Shipped Themes ▸, Auto-Assertion ▸ | still stubs, greyed | `PaneHost/Shell/ShellWindow.axaml.cs:200, 217, 244, 252` (`NotYet(...)`) |
| Right panel: five tabs of eight, Index / Diagnosis / Publish missing | **six of eight**: Index landed; Diagnosis and Publish still absent | `ShellWindow.axaml.cs:158` (`RightTabs.Tabs = Build, Play, Testing, Index, Documentation, World`); `Shell/IndexPaneView.cs`, `Shell/StoryIndex.cs` (the six sections the Swift `IndexView.swift:210-215` has) |
| The remark in the shell that still says "five of them" | stale comment | `ShellWindow.axaml.cs:1447-1450` |
| Menu structure mirrors the Swift menu (6 top-level) | still so; the Swift App menu's Settings… and Check for Updates… have no Avalonia counterpart (I.2) | `ShellWindow.axaml.cs:198-260`; `SharpeeIDE/Menus/MenuBuilder.swift` |

### I.2 The four areas #488 left unchecked

| Area | macOS head | Avalonia head | Gap not in #488 |
|---|---|---|---|
| Editor | lexer-driven highlighting; bracket matching (`Editor/BracketMatcher.swift`); auto-indent (`Editor/AutoIndenter.swift`); line numbers (`Editor/LineNumberRulerView.swift`); diagnostic underlines and gutter flags with click-to-jump from Problems (`Editor/EditorViewController.swift:439-458, 398-421`); import commands and the extract refactor (`Editor/ImportCommands.swift`, `ImportRefactor.swift`); tabs with dirty dot and close (`Editor/TabBarView.swift`) | AvaloniaEdit with the real lexer's colours (`ShellWindow.axaml.cs:146`, `Editor/ChordColorizer.cs`); line numbers and word wrap; undo/redo/cut/copy/paste; tabs with dirty dot and close (`Shell/EditorTabBarView.cs`) | inline diagnostics (no underline, gutter or Problems-row navigation: no `underline`, `Indent`, `Bracket` hit in `ShellWindow.axaml.cs`), bracket matching, auto-indent. Neither head has completions, hover or go-to-definition (#281, #282, #283 stay open for both) |
| Project pane | typed groups Story / Walkthroughs / Assets / Feelies / Web Template / Other (`Project/ProjectArtifacts.swift:39-44`), nested folders, double-click opens, Reveal in Finder context menu (`Project/ProjectTreeViewController.swift:244`), expanded-folder persistence | the same groups minus Feelies, top-level files only (`Shell/ProjectPaneView.cs:57-63`), single click selects and double opens (#489), no context menu (`RevealInFinder()` exists in the shell at `:822`) | Feelies group, nested folders, the tree's context menu |
| Status bar | build pill (click cancels a build or toggles the panel) and `Chord Writer <app> · Sharpee <x> / Chord <y>` (`AppIdentity.swift:35-43`, `MainWindow.swift:1838-1849`) | `BuildPill` (built / not built / unbuilt changes / build failed / gate-clean / gate errors) and `StatusText` (`sharpee (bundled toolchain)` or `(vendored)`, tests passed / failed, the running command; `ShellWindow.axaml.cs:480, 904-906, 992, 1018, 1047`) | no app or toolchain version shown; `--version` is never called by the shell |
| Settings | Settings… window: reopen last story at launch, snap panes to 50% (`Settings/SettingsWindowController.swift`); Build Settings sheet (`Build/BuildSettingsViewController.swift`); Check for Updates… (Sparkle, `Updates/`) | none: no Settings window, no Build Settings, no updater (no `velopack`, `sparkle` or `checkForUpdates` in `PaneHost`); Font and Appearance are View-menu items in both heads | Settings window, Build Settings, in-app updates (#462 covers Velopack packaging, not the menu) |

### I.3 Other surfaces compared

| Surface | macOS head | Avalonia head | Where recorded |
|---|---|---|---|
| Launch | landing page: product name, five recents, Open / Create Story / Close (`Launch/LandingPageViewController.swift`) | reopen the last story, else the Docs pane; New Story… through the toolchain's `init` and a `NameDialog` | #479 (product decision, open) |
| Bottom panel | Problems as a structured, clickable list (`Compose/ProblemsView.swift`) and Game Errors (`Build/GameErrorsView.swift`) | tabs Problems / Game Errors / Log over one text log; the tab selection handler is empty (`ShellWindow.axaml.cs:159, 168, 1089`) | **new**: structured Problems rows and navigation. ADR-324 (PROPOSED) would move the Swift Problems into Build (#297), so the target is moving |
| Persistence | project, open documents, active tab, expanded folders, pane visibility, right tab (`Persistence/SessionState.swift:10-22`); recents (`RecentProjectsStore.swift`) | last story and eight recents (`Shell/ShellState.cs:12, 26`) | **new**: open documents, tab and layout restore; Testing view-state is #586 |
| Play | header with Restart and Play after build, theme picker (`Play/PlayViewController.swift:14-19`) | the built bundle in a web view; no Restart, no play-after-build, no theme picker (no `Restart` or `PlayAfterBuild` in `ShellWindow.axaml.cs`) | **new**: Play header controls. Explains Q-08: the Avalonia bundle carries no `play-themes` because nothing in that head selects one |
| World | Map / Reach / Incomplete (`World/*.swift`) | Map / Reach / Incomplete with counts (`ShellWindow.axaml.cs:164, 1419-1424`) | parity |
| Index | six section tabs over a table (`Play/IndexView.swift`) | six grouped sections in a drawn list (`Shell/IndexPaneView.cs`) | parity in content (I.1) |
| Documentation | bundled docs tab | the same bundle, copied at packaging (S4) | parity (#648 applies to both) |
| Testing | the surface plus the view-state sidecar | the surface, no sidecar | #586 |
| Publish | tab and menu | menu item only | #488 |
| Updates | Sparkle feed (`sparkle/`) | none | #462 (packaging), I.2 (menu) |
| Story templates | bundled `story-templates` | none; `init` in the toolchain supplies the template | answers Q-08: not a gap, the template travels with the toolchain |

### I.4 Disposition

Six gaps are new to #488 (bold above): inline diagnostics and editor helpers, the project tree's depth and menu, the status bar's versions, Settings and Build Settings, the structured Problems list, Play header controls, plus session persistence; and one item in #488 is overtaken (Index landed). All are recorded in one comment on #488 rather than as new issues, because #488 is the list David asked to be worked through, and a second list would split it: **F-14**. Q-08 is closed: the two bundle omissions are explained (play-themes: no picker; story-templates: the toolchain's), and the picker is now a row on #488.

## Section J: open-issue triage

Taken 2026-11-07 at `d8f426311`: `gh issue list --state open --limit 400` returned **247** open issues; the title filter `grep -Eiw 'Chord Writer|Avalonia|IDE'` (whole words, case-insensitive, so `ide-protocol` matches and "decide" does not) returned **46**. Every one is a row below. Verdicts: **still true** (the issue's claim holds in the code at HEAD), **fixed, open** (the code no longer has the defect, the issue was never closed), **superseded** (a later ruling retired the surface the issue is about), **ruling** (the issue exists to carry a decision only David can make). Nothing was closed this session; the eight rows marked ⚑ carry a comment with the evidence and are listed for David's ruling in J.2.

### J.1 The table

| # | Title (short) | Verdict | Evidence |
|---|---|---|---|
| 188 | Window title shows the story title | fixed, open ⚑ | `MainWindow.swift:654` applies `WindowTitle.title(for:)`; the issue's own 2026-08-02 comment records the implementation |
| 193 | Bless is dead until Record | superseded ⚑ | Bless and Record are retired: `MenuBuilder.swift:294` ("No Bless / Checkpoint items: ADR-299 D8"); no `RecordingSession.swift` in the tree |
| 194 | Blessed turns not marked in Play | superseded ⚑ | same as #193 |
| 198 | Saving a test asks for a location | superseded ⚑ | `saveSingleTranscript` and `transcriptsSaveDirectory` are gone from `Play/PlayViewController.swift`; tests live in the `<story-id>.tests/` tree (ADR-355) |
| 238 | Docs tab layout and continuity | still true, part done | the decided fix landed: `web/docs-tab/build.mjs:55-61` orders by `nav.ts` section titles; "continuity" is still undefined, as the issue says |
| 252 | Testing workspace, Play beside Testing | superseded ⚑ | built as ADR-304, retired by ADR-306 D1: `MainWindow.swift:1762-1764` |
| 254 | Create Transcript from played commands | superseded ⚑ | retired by ADR-306 D1: `Play/PlayViewController.swift:8-10` |
| 281 | Tap a phrase name to edit its test | still true | no symbol interaction in `SharpeeIDE/Editor/` (no `definition` or `complet` hit); same in the Avalonia head (I.2) |
| 282 | Hover a phrase name for its definition | still true | as #281 |
| 283 | Hold a modifier to reveal phrase text | still true | as #281 |
| 284 | A right-panel Read tab | still true | `Play/RightPanelViewController.swift:88-95` registers eight tabs, no Read |
| 289 | Remove Test ▸ Testing Play Surface | still true | `MenuBuilder.swift` still has the item; the Avalonia head mirrors it (`ShellWindow.axaml.cs:250`) |
| 291 | Annotations: markdown attached to code | still true | `packages/chord/chord.ebnf` has no annotation form |
| 292 | Feature flags in Settings | still true | Settings has two preferences (`Settings/SettingsWindowController.swift`); the World tab is unconditional (`RightPanelViewController.swift:95`) |
| 293 | Move the World map into Index | still true | `Play/IndexView.swift:210-215` has six sections, no Map; the map stays in `World/WorldMapView.swift` |
| 294 | Index tab mocks | still true | `Play/IndexView.swift:21` is still an `NSTableView` |
| 296 | Diagnosis tab's permanent slot | still true, parked | folded into ADR-324, still PROPOSED (2026-08-22); the tab is registered at `RightPanelViewController.swift:92` |
| 297 | Remove the bottom Problems panel | still true, parked | ADR-324 as #296; `Build/BottomPanelViewController.swift` present |
| 298 | Extensions with declared Chord version support | still true | `chord.ebnf` has platform `use` extensions (ADR-235, ADR-330) and no author-shareable extension with a version declaration |
| 299 | Source control for authors | still true | no git anywhere in `SharpeeIDE` (the two `git` hits are unrelated words) |
| 386 | ADR-341: Chord Writer for Windows | still true, re-shaped | ADR-341 ACCEPTED (WPF or WinUI 3 by spike); since then the four-way evaluation and David's ruling "native macOS paired with Avalonia on Windows — and Linux?" (`docs/work/avalonia-ide-evaluation/plan.md:4`); ADR-351 DRAFT; `tools/winide` empty. The ADR is not amended to the Avalonia route — a ruling (J.2) |
| 390 | Opening another story closes all files | still true | `Persistence/SessionState.swift:10-11`: one `projectURL`, one `openDocumentURLs` list, not keyed by project |
| 392 | Export the Testing view to HTML | still true | no export in `SharpeeIDE` or `MenuBuilder.swift` |
| 438 | An ADR on keeping OpenSilver reachable | ruling | the four-way comparison is complete (comments 2026-09-13 to 09-15); ADR-351 is DRAFT; no ruling recorded |
| 461 | Web IDE Phase 1 owed items | ruling ⚑ | `docs/work/web-ide-evaluation/plan.md:4` is DONE and the web shape was not chosen; the two owed checks are moot unless the web tier is reopened |
| 462 | Avalonia + Velopack: four owed items | still true in part | (1) answered (comment 2026-09-16); (3) `PaneHost/Editor/ChordColorizer.cs:50-54` still owns its brush constants; (2) and (4) unexercised |
| 477 | `IPaneDoor.Configure` untested | still true | `PaneHost.Tests/PaneDoorTests.cs:7` says so; F-11 (#662) |
| 479 | Installed Avalonia app opens empty | ruling | partially addressed (reopen last story, else Docs: comment 2026-09-17); the product question stands |
| 480 | Avalonia bundle identity provisional | ruling | `package-avalonia.sh:60-61`: `Chord Writer (Avalonia)`, `com.The_Sharpee_Project.ChordWriterAvalonia` |
| 484 | `ShellWindow` has no xunit coverage | still true | no test references `ShellWindow` except the stub note in `TestingSurfacePostsTests.cs:6`; F-11 |
| 488 | Avalonia parity audit: remaining gaps | still true, updated | Section I: Index landed, six gaps added (F-14) |
| 489 | One file at a time, single-click open, dead close glyph | fixed, open ⚑ | `Shell/EditorTabBarView.cs:8-9` hit-tests the close glyph; `Shell/ProjectPaneView.cs` selects on one click and opens on two; `ShellWindow.axaml.cs:683` keeps a document list |
| 495 | Ephemeral-port localStorage | ruling | `Hosting/LocalOrigin.cs:6-7, 62`: still an ephemeral loopback port |
| 502 | docs-tab vitest fails 3 of 43 | still true | reproduced in Phase 3 (G.4) |
| 544 | Re-land ADR-333 play-to-write | still true | no `PlayToWrite` or `MessageCatalog` in `SharpeeIDE` |
| 574 | ADR-361 Scope amendment | still true | `adr-361` has no amendment line; its Scope names neither `packages/bootstrap` nor `website/.../examples.ts` |
| 581 | `TestRunnerTests` cancel timeout | still true, not reproduced | `SharpeeIDETests/TestRunnerTests.swift:288` still waits 30 s; the test passed in the 11-06 full run (H.2) |
| 586 | Avalonia Testing view-state sidecar | still true | `Shell/TestingSession.cs` has no sidecar or `LocalApplicationData` |
| 648 | Bundled docs lag the website | still true | this audit, F.3 |
| 652 | Swift Chord pin 3.6.0 | still true | this audit, F-01 |
| 653 | 1.4.0 carries a pre-4.0 toolchain | still true | this audit, F-02; H.2 adds that the macOS one cannot build (F-13) |
| 654 | API reference reaches no author | still true | this audit, F-03 |
| 655 | `tools/ide/README.md` describes the July app | still true | this audit, F-04 |
| 657 | Avalonia reads IR by hand-written key | still true | this audit, F-06 |
| 658 | IR format field compared by neither head | still true | this audit, F-07 |
| 662 | Four seams with no automated check | still true | this audit, F-11; #477 and #484 are two of its seams |

46 rows.

### J.2 For David's ruling

Eight rows carry a comment with the evidence and a recommendation to close; none was closed, because each was reported by David or records a ruling, and the verification is his:

- **Fixed, open**: #188 (window title), #489 (one file at a time).
- **Superseded by his own rulings**: #193, #194, #198 (ADR-299 D8 retired Bless; the tree document replaced transcript saving), #252 and #254 (ADR-306 D1 shred ruling, 2026-08-09).
- **Moot unless reopened**: #461 (web tier not chosen).

Ruled 2026-11-07 (session 9f22d5): David ruled "if the audit items are complete, close and archive"; each code fact above was re-verified and all eight were closed with the evidence in a closing comment. The five decision rows below stay open.

Five more are decisions, not defects, and stay as they are: #438 (an OpenSilver ADR), #479 (what the Avalonia app opens), #480 (its bundle identity), #495 (its origin), and #386's shape question — whether ADR-341 is amended to record the Avalonia route the evaluations chose.

### J.3 Outside the title pattern

Issues this audit filed or confirmed whose titles carry none of the three words, so the table does not list them: #457 (vendored toolchain exports, F-13), #656 (Swift lexer `&`), #659 (testing-surface bundle growth), #660 (New Story template findings), #661 (`toolchain-realpath-test.sh` path), #663 (`hdiutil` deprecation). All are IDE issues and all are still true.

## Section K: the categorised, costed list

Written 2026-11-07 at `f87f6812f` (Phase 6, session 35701b). Nothing here is implemented; this is the shape of the fix plan, for David's reading. Tier and budget follow the plan's own scale (Small ≈ 100 tool calls, Medium ≈ 250). "Ruling" means a decision only David can make; "platform" means a change under `packages/` that CLAUDE.md says is discussed first.

### K.1 Reconciliation

| Phase | Sections | Findings | Ids |
|---|---|---|---|
| 1 | A, B, C | 4 | F-01, F-02, F-03, F-04 |
| 2 | D, E | 3 | F-05, F-06, F-07 |
| 3 | F, G | 2 | F-08, F-09 |
| 4 | H | 4 | F-10, F-11, F-12, F-13 |
| 5 | I, J | 1 | F-14 |
| **Total** | | **14** | |

Fourteen findings, fourteen rows in the "Findings so far" table, fourteen rows in K.2. Three existing issues the audit measured rather than filed (#648, #502, #457) appear in K.2 beside the finding they belong to and are not counted as findings. The triage (Section J) produced no findings of its own: its output is the eight close candidates and five rulings in K.4.

### K.2 By category

| Category | Finding | Issue | Severity | Tier, budget | Depends on | Ruling or platform |
|---|---|---|---|---|---|---|
| Version and toolchain | F-01 Swift Chord pin 3.6.0; keyword set lacks the six 4.0 block forms | [#652](https://github.com/ChicagoDave/sharpee/issues/652) | high: two failing tests, a docs banner that will fire against a HEAD toolchain | Small, ~40 | fixes #648 in the same commit, or the docs pin test inverts (K.3) | neither |
| Version and toolchain | F-02 Chord Writer 1.4.0 carries a pre-4.0 toolchain in both heads | [#653](https://github.com/ChicagoDave/sharpee/issues/653) | high: the shipped app and the language disagree | Medium, ~150: vendor at HEAD, both heads, both slices, notarize | F-01 first (the pin must match the vendored compiler); F-13's package fix is already in the tree | ruling: a release, and versions move at publish |
| Version and toolchain | F-13 the published macOS 1.4.0 cannot build any story (`@sharpee/character` without `dist-esm`) | [#457](https://github.com/ChicagoDave/sharpee/issues/457) | **critical**: Build is dead in the app authors download | the ship fix is F-02; the remaining #457 work (bridge and runtime `files`, a content seal in `vendor-toolchain.sh`) is Small, ~40 | — | platform (`packages/bridge`, `packages/runtime` manifests) |
| Language knowledge | F-05 the Swift lexer port lexes `&` as punctuation | [#656](https://github.com/ChicagoDave/sharpee/issues/656) | low: no corpus story has `&` | Small, ~20, plus a corpus story that does | — | neither |
| Wire | F-06 the Avalonia head reads IR and world index by hand-written key, no version gate | [#657](https://github.com/ChicagoDave/sharpee/issues/657) | medium: a renamed IR member fails silently in that head | Medium, ~80 | F-07's ruling says what the gate is | neither, after F-07 |
| Wire | F-07 the IR `format` field is documented as the hard gate and compared by neither head | [#658](https://github.com/ChicagoDave/sharpee/issues/658) | medium | Small, ~30 once ruled | — | **ruling**: keep the field as the gate and compare it, or retire the claim |
| Bundled content | F-03 the generated API reference reaches no author | [#654](https://github.com/ChicagoDave/sharpee/issues/654) | low | Small, ~30 to fix the two documents; Medium if it is to ship | — | **ruling**: ship it (where), or correct the docs that say it ships |
| Bundled content | F-04 `tools/ide/README.md` describes the July app | [#655](https://github.com/ChicagoDave/sharpee/issues/655) | low | Small, ~20 | — | neither |
| Bundled content | (existing) bundled docs lag the website by 16 files | [#648](https://github.com/ChicagoDave/sharpee/issues/648) | low | Small, ~10: run `build-docs-tab.sh` | must land with F-01 (K.3) | neither |
| Bundled content | F-09 the New Story template opens with two World findings | [#660](https://github.com/ChicagoDave/sharpee/issues/660) | low | Small, ~20 | — | **ruling**: change the template, the analyzer's threshold, or accept |
| Testing surface | F-08 a rebuild of the testing-surface bundle pulls 55 Chord compiler modules from `dist-esm` | [#659](https://github.com/ChicagoDave/sharpee/issues/659) | medium: 11,496 dead lines in every rebuild; the committed bundle cannot be regenerated cleanly | Small, ~30 | — | platform: the import at `packages/transcript-tester/src/assertion-core.ts:47` |
| The IDE's tests | F-10 `toolchain-realpath-test.sh` fails on a relative path | [#661](https://github.com/ChicagoDave/sharpee/issues/661) | low | Small, ~5 | — | neither |
| The IDE's tests | F-11 four seams with no automated check: Avalonia editor bridge, Avalonia packaging, C# protocol round trip, bundle growth | [#662](https://github.com/ChicagoDave/sharpee/issues/662) | medium | Medium, ~150 | F-10 (the packaging check runs that script); #477 and #484 are two of the seams | neither |
| The IDE's tests | F-12 `assemble-dmg.sh` uses `hdiutil` verbs this macOS reports as deprecated | [#663](https://github.com/ChicagoDave/sharpee/issues/663) | low: warnings today | Small, ~25 | — | neither |
| The IDE's tests | (existing) docs-tab vitest fails 3 of 43 | [#502](https://github.com/ChicagoDave/sharpee/issues/502) | low | Small, ~20 | — | neither |
| Parity | F-14 six gaps plus persistence not in #488; Index landed | [#488](https://github.com/ChicagoDave/sharpee/issues/488) | medium: the Avalonia head is the Windows route and the list is what it is measured by | Large: several Medium phases (editor helpers; Problems list; Play header; persistence; Settings; status bar), ~400 in all | ADR-324 (PROPOSED) decides where Problems lives before the Problems list is built; #586 is one of the persistence rows | ruling on ADR-324; otherwise neither |

Severity counts: 1 critical, 2 high, 5 medium, 8 low (16 rows: 14 findings and 2 existing issues; #457 is F-13's row).

### K.3 The follow-on plan's shape

Ordered by cost and risk, cheapest and safest first; a phase bundles the items that must land together.

1. **Mechanical fixes, no rulings** (Small): F-10, F-04, F-05, #502, F-12. Five independent commits or one; none touches `packages/`.
2. **The pin and the docs bundle together** (Small): F-01 and #648 in one commit. They are coupled: `DocsTabRealPathTests.swift:277` compares the bundle's Chord stamp to the Swift pin, so moving either alone fails that test (today the bundle says 3.6.0 and a rebuild says 4.0.1). Also the keyword set's six block forms (D.4). This turns the two failing macOS tests green.
3. **Platform discussion, then two small changes**: F-08 (the assertion-core import) and the #457 remainder (`bridge` and `runtime` `files`, a content seal in `vendor-toolchain.sh`). Discussed first per CLAUDE.md; each is a Small change once agreed.
4. **The release** (Medium, David's hands and certificate): F-02 and F-13's ship fix. Vendor a HEAD toolchain into both heads, both macOS slices, notarize, publish the appcast. Waits on phase 2 (the pin must match) and on David's ruling on the version numbers (versions move at publish). This is the only phase that changes what an author downloads, and it is the one that fixes the critical finding.
5. **Rulings, then the small wire and content fixes** (Small each): F-07 then F-06; F-09; F-03. Each waits on a question in K.4 and is cheap afterwards.
6. **The seams** (Medium): F-11, after phase 1's F-10. Four checks, one per seam; the Avalonia packaging check is `toolchain-realpath-test.sh` as the last step of `package-avalonia.sh`.
7. **Parity** (Large, its own plan): F-14 with #488 as the list, after ADR-324 is ruled so the Problems row has a target. The eight close candidates in K.4 shrink the open list before it starts.

Phases 1, 2, 3 and 6 can run without David present. Phases 4, 5 and 7 cannot start until a question below is answered.

### K.4 Open rulings, as questions

Findings:
- **F-07 (#658)**: is the IR `format` field the shells' hard gate? If yes, both heads compare it and refuse on mismatch; if no, the documentation that says so is corrected and F-06 chooses another gate.
- **F-03 (#654)**: should the generated API reference ship to authors, and where (npm package, the app's Documentation tab, the website)? Or do the two documents that say it ships get corrected?
- **F-09 (#660)**: the New Story template opens with `missingWord 1, noObject 1`. Change the template, change the analyzer, or accept it as the first thing a new author sees?
- **F-02 / F-13 (#653, #457)**: what version does the re-release carry (1.4.1, 1.5.0), and does the Avalonia head ship under its provisional identity (#480) or wait?
- **F-14 (#488) and ADR-324**: is ADR-324 accepted as written, so the Problems list moves into Build on both heads?

Triage (Section J.2):
- Close as fixed: #188, #489?
- Close as superseded by ADR-299 D8 and ADR-306 D1: #193, #194, #198, #252, #254?
- Close as moot: #461?
- Decisions carried unchanged: #438 (an OpenSilver ADR), #479 (what the Avalonia app opens), #480 (its identity), #495 (its origin), #386 (amend ADR-341 to the Avalonia route the evaluations chose?).

Carried from earlier phases and unchanged: the scratch-versus-in-place rebuild question was taken at the plan's default (scratch) and is closed.

## Carried questions

| Id | Settled in | Question |
|---|---|---|
| Q-01 | Phase 2: closed | The keyword set does not cover the 4.0 surface (D.4); recorded on #652. |
| Q-02 | Phase 2: closed | The IR `format` field is never compared: F-07. |
| Q-03 | Phase 2: closed | The generated protocol is fresh (E.1). |
| Q-04 | Phase 2: closed | Neither head enumerates diagnostic codes (D.3). |
| Q-05 | Phase 3: closed | The committed testing-surface bundle is functionally current and cannot be rebuilt cleanly: F-08 (G.1). |
| Q-06 | Phase 3: closed | The docs bundle is stale by 16 files, 15 of them pages (F.3); recorded on #648. |
| Q-07 | Phase 4: closed | No suite fails on the 4.0.1 compiler for a fixture reason; the old-format fixtures pass because nothing compares the format (H.3, F-07). |
| Q-08 | Phase 5: closed | The built Avalonia bundle holds no `play-themes` or `story-templates`. Not in #488 until now: themes because that head has no theme picker (I.3, now on #488 as a Play-header gap); templates because `init` in the toolchain supplies them, so that one is not a gap. |
