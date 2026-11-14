# Session Plan: Chord Writer paired with Sharpee 5.6.1 / Chord 4.0.2 — both heads current, one release cut

**Created**: 2026-11-13
**Plan Status**: ACTIVE
**Overall scope**: Bring the macOS Swift head (`tools/ide/SharpeeIDE`) and the Avalonia head (`tools/ide/PaneHost`, `tools/ide/editor-bridge`) up to the published Sharpee 5.6.1 / Chord 4.0.2, then cut a Chord Writer release whose bundled toolchain is that pair. The shipped app is 1.4.0, whose bundled CLI prints `Sharpee 5.3.0 · Chord 3.6.0` and cannot build any story (census F-13). This plan ends with the new version on sharpee.net for both macOS slices and a notarized arm64 Avalonia build kept local.
**Bounded contexts touched**: N/A — infrastructure and tooling (`tools/ide`, release tooling, `website/src/lib/versions.json`). One test-fixture change under `packages/chord/tests` is flagged for David's discussion (D-4).
**Key domain language**: N/A. Technical terms used throughout: **the pin** (`tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift:66`), **the golden** (the lexer golden corpus both lexers are pinned to, ADR-258 D7), **the toolchain** (vendored Node plus the sealed devkit closure, ADR-279 D4), **the real-path test** (`tools/ide/toolchain-realpath-test.sh`), **a slice** (one architecture's release).

## References consulted
- `docs/architecture/adrs/adr-257-chord-language-version.md` — D2 as amended 2026-08-29: `CHORD_LANGUAGE_VERSION` moves once per publish, so the pin follows the published 4.0.2; the language number is not the app's number.
- `docs/architecture/adrs/adr-258-ide-chord-authoring-environment.md` — D7: the Swift lexer port is pinned by one golden enforced on the TypeScript side, so the corpus lives in `packages/chord/tests` and a lexer divergence is fixed in the port. D9: the IDE checks its language version against `sharpee --version`.
- `docs/architecture/adrs/adr-279-chord-writer-packaging.md` — D1: Chord Writer has its own version line, with platform and Chord shown beside it. D4: the app ships the exact toolchain it was built against. D7 and Amendment A3: Sparkle with one feed per architecture. Amendment A2: sharpee.net hosts the artifacts directly. Consequences: a release needs David's Apple credentials, and releasing includes publishing an appcast to the site.
- `docs/architecture/adrs/adr-341-chord-writer-windows.md` — D5: protocol types are generated, never hand-mirrored. D6/D7: Windows is x64 with a Windows-native release under Azure Trusted Signing, none of which exists yet. This plan does not reach Windows (D-3).
- `docs/architecture/adrs/adr-351-chord-writer-host-shape.md` — The Avalonia head is the carried-forward shape. The ADR proposes no change to the shipping macOS app and authorizes no retirement of it. It is DRAFT on Q-2/Q-4/Q-6, and this plan asks it nothing.
- `docs/architecture/adrs/adr-352-protocol-type-generation.md` — Both `Generated/` targets come from `./repokit protocol`, and `--check` is the freshness gate. Nothing here hand-edits them.
- `docs/architecture/adrs/adr-358-new-story-starts-and-teaching-completion.md` — DRAFT. Editor completion (D2/D4) is designed but unbuilt in either head, which is why #679 is out of scope.
- `docs/architecture/adrs/adr-395-exploring-tests-run-on-test-stories.md` — Exploring tests run on `test-stories/`, and real stories other than Dungeo never gate. The Avalonia authoring-loop check therefore runs on a copy of `test-stories/lodge/`.
- `docs/work/chord-writer-avalonia-production/plan.md` — Parked (still live behind its `**Superseded by**` stamp) and not modified here. It records the Avalonia packaging recipe and its notary route (`tools/ide/notary-submit.py`), the launch-and-use bar (`--app-exit-state`), David's 2026-09-22 ruling that the Avalonia head ships arm64 only, and Phase 3b (Windows/Linux) BLOCKED on hardware.
- `docs/work/archive/ide-delta-audit/census.md` — The measured baseline: Sections C, D.4, F, H and the seam map H.4. K.3's proposed fix shape is what this plan follows for the in-scope findings (items 1, 2 and 4).
- `docs/context/project-profile.md` — `PaneHost.Tests` is a separate `dotnet test` gate outside turbo; the three test gates; no CI gates.
- `docs/context/session-20261113-1730-main.md` — 5.6.1 publish verified; open items #652 (pin, target now 4.0.2) and #681 (unrelated familyzoo mirrors).
- `docs/core-concepts/README.md` — Publishing to npm is the CI workflow. The IDE release is local and outside it. `./repokit` builds the platform.
- `docs/core-concepts/prerequisites.md` — A stale `packages/*/dist` vendors silently, so `./repokit build` comes before any vendoring. `./repokit build` restamps `stories/dungeo/src/version.ts`.
- `CLAUDE.md` — `packages/` changes are discussed first. Never auto-retry a failed build or test. No CI gates. Versions move at publish. Story-exploring tests use test stories.
- Product ADRs not consulted (no Scope intersection): none

## Measured starting point (2026-11-13, main at ab8d2780b)

- Platform: `packages/chord/src/version.ts:355` `CHORD_LANGUAGE_VERSION = '4.0.2'`; `packages/devkit/package.json:3` `5.6.1`; `packages/chord/src/ir.ts:33` `story language 6`. Running `git log 95bde75e9..HEAD -- packages/` prints nothing, so `packages/` is exactly what was published as 5.6.1.
- The pin: `tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift:66` reads `"3.6.0"` (#652). Its honesty condition (lines 22-24) requires a golden corpus that exercises the new surface.
- Two tests depend on the pin. `tools/ide/SharpeeIDETests/ChordVersionCheckTests.swift:86` compares it with the repo CLI's Chord version. `tools/ide/SharpeeIDETests/DocsTabRealPathTests.swift:277` compares it with the docs bundle's stamp, which `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` holds as `3.6.0` (#648).
- Every macOS build rewrites the derived bundles in place (`tools/ide/project.yml:103-124`).
- Lexer: `packages/chord/src/lexer.ts:203` makes `&` a word. `tools/ide/SharpeeIDE/Editor/ChordLexer.swift:210` sends it to the `punct` default (#656). No corpus file in `packages/chord/tests/fixtures/lexer-golden/` contains `&`.
- Keyword sets: `tools/ide/SharpeeIDE/Editor/SyntaxHighlighter.swift:21-47` and its hand copy `tools/ide/PaneHost/Editor/ChordColorizer.cs:27-38`. Neither holds `claims`, `landmarks`, `passage`, `position`, `pushing` or `sailing`, the six block openers in `packages/chord/chord.ebnf` (lines 122, 521, 594, 626, 642, 1427).
- App version: `tools/ide/project.yml:202-203` reads `1.4.0` / `7`. The published feed's newest item is 1.4.0 / 7 (census C-7, 2026-11-06; not re-fetched).
- `website/src/lib/versions.json` holds `chordWriter: 1.4.0`. The download card names its DMGs from it (`website/src/components/download-card.tsx:51`, `:57`), and the docs tab bundles it.
- Toolchain: `tools/ide/vendor-toolchain.sh:202` vendors whatever version is in the workspace (`pnpm deploy`), with Node 22.23.1 (`:79`). Its darwin target signs with the Developer ID (`:660-705`).
- `tools/ide/package-avalonia.sh:164-167` only checks that `tools/ide/editor-bridge/dist/lexer-server.js` exists. The copy on disk dates from 2026-09-16 and is gitignored.
- Neither `tools/ide/package.sh` nor `tools/ide/package-avalonia.sh` runs the real-path test. That unrun check is how the published 1.4.0 shipped unable to build a story (census H.2, H.4).
- Avalonia identity is provisional (`tools/ide/package-avalonia.sh:59-61`, #480), and its version follows `tools/ide/project.yml` (`:100`).
- Closed since the audit, nothing owed: #457, #658, #659, #660.

## Scope decisions (D-5 — David strikes any row at approval)

| Item | Disposition | Why |
|---|---|---|
| #653 pre-4.0 toolchain in both heads | **In**, Phase 3 | The release itself. |
| #652 Swift pin 3.6.0 | **In**, Phase 1 | — |
| #656 Swift lexer `&` | **In**, Phase 1 | Fixed alongside the corpus file that makes the golden see it. |
| #648 bundled docs lag the website | **In**, Phase 1 | Coupled to the pin: `DocsTabRealPathTests.swift:277` fails if either moves alone, and every macOS build regenerates the bundle anyway. |
| #502 docs-tab vitest 3 of 43 | **In**, Phase 1 | The docs tab is rebuilt here, and its own suite is the automated check on it. The fix is `tools/ide`-only, about 20 calls. |
| #655 stale `tools/ide/README.md` | **In**, Phase 2 | `tools/ide`-only, about 20 calls. It misdescribes the release path, the pin coupling and the twin keyword sets this plan exercises. |
| #662 seams with no automated check | **Item 2 in**, Phase 2; items 1 and 3 out | Item 2 (the real-path test inside the package scripts) is the check whose absence let 1.4.0 ship broken. Items 1 and 3 change nothing an author downloads, and item 3 waits on #657. The issue stays open. |
| #657 Avalonia reads IR by key, no gate | **Out** | An architecture change (read the compose payload through the generated C# types, per #658's ruling, about 80 calls). Every key the head reads still exists at 5.6.1 (census E.2; `protocol --check` green), so the pairing does not need it. |
| #663 deprecated `hdiutil` verbs | **Out** | Warnings only, and the DMG layout test passes. Rewriting DMG assembly right before a release puts risk on the only macOS distribution route. Phase 2 re-runs the layout test to confirm. |
| #480 Avalonia bundle identity | **Out as work; a ruling only** (D-2) | The Avalonia build keeps its provisional identity and stays unpublished unless David rules otherwise. |
| #661 real-path test, relative path | **Out** (related, not on the list) | Every call here passes an absolute path. |
| #679 `is a` value completion (ADR-394, in 4.0.2) | **Out** (found while planning) | Neither head has completion code (census D.1, and a search while planning found none). The dropdown it names reads as ADR-358's unbuilt completion. It stays open. |
| Older keyword gaps: 11 `define` nouns, the `auto-assertion` key (census D.4) | **Out** | They predate 1.4.0. Whether the set is curated or complete is a ruling, not a 4.0.2 obligation. |
| Windows and Linux packaging | **Out** (D-3) | — |

## Decisions for David

**Ruled 2026-11-13 (session 90a471, David: option "a" — approve as recommended):** D-2 is (a); D-3 is macOS only as written; D-4 is yes; D-5's scope table is ratified with no row struck; D-6 is covered by plan approval. D-1 (the version string) stays open until Phase 3. The plan-review's `notarytool` tension stays as written: `tools/ide/package.sh` is not moved onto `notary-submit.py` in Phase 2.

- **D-1 — the Chord Writer version.** CFBundleShortVersionString is David's call (1.4.1, 1.5.0, or another). CFBundleVersion defaults to `8`, because Sparkle offers an update only above the published `7`. Needed before Phase 3.
- **D-2 — the Avalonia build.** Recommended: (a) sign, notarize and staple the arm64 build in Phase 3 under its provisional identity, and keep it local.
  - (b) Rule #480 now; the ruling is applied through `tools/ide/package-avalonia.sh:59-61`, still unpublished.
  - (c) Stop at Phase 2's unsigned rehearsal.
  - No hosting or update feed exists for this head, so publishing it is not offered here.
- **D-3 — platforms.** macOS only. The Swift head ships both slices (arm64 and x86_64, per-arch feeds under ADR-279 A3). The Avalonia head is arm64 only (David, 2026-09-22). Windows and Linux are not in this plan: the parked plan's Phase 3b is BLOCKED on hardware, and ADR-341 D7's Windows signing has never been set up.
- **D-4 — platform discussion.** Phase 1 adds one corpus file under `packages/chord/tests/fixtures/lexer-golden/` and extends the drift guard in `packages/chord/tests/lexer-golden.test.ts`. These are test fixtures only: `packages/chord/package.json` ships only `dist` and `dist-esm`, and no source or API changes. The 1.4.0 alignment (d936024cc) took the same shape. Phase 1 starts only on a yes.
- **D-5 — the scope table above**, ratified at approval.
- **D-6 — local signing before the attended session.** Phase 2 vendors a toolchain (which codesigns the vendored Node with the Developer ID) and runs `tools/ide/package.sh --no-notarize`, which signs a rehearsal app. Nothing is submitted to Apple and nothing leaves the machine. Recommended: covered by plan approval. If not, Phase 2's evidence runs 4a, 4b, 4c and 4e move into Phase 3's attended session.

## Who must be at the keyboard

- **Phases 1 and 2 run unattended.** The macOS suite and the Avalonia `--app-exit-state` run each open a window on the logged-in desktop for about a minute, with no clicks. The macOS test bundle signs from the keychain without a prompt (census H.2).
- **Phase 3 needs David throughout.** He must:
  - rule D-1 before it starts;
  - unlock the login keychain holding the Developer ID Application identity (team RSNGKW5LNH), the `dc-notary` notarytool profile and the Sparkle EdDSA key;
  - provide the App Store Connect API key (`.p8`, key id, issuer) for `tools/ide/notary-submit.py`;
  - give an explicit go-ahead before anything is signed and submitted to Apple;
  - give an explicit go-ahead before the upload to sharpee.net (or run the `scp` himself);
  - ask for the push of the version commit;
  - run the website deploy on the server, which needs sudo.
- **Optional felt check:** David's installed 1.4.0 offers the new version under Check for Updates (ADR-279 Acceptance 7). Nothing in the harness can see that.

## Sequencing

Phases 1 and 2 are independent. Phase 2 touches only `tools/ide` scripts and docs, so it can run first while D-4 is pending. Phase 3 needs both, plus D-1 and D-2.

## Phases

### Phase 1: Both editors know the Chord 4.0.2 surface; the Swift pin and the docs tab move to 4.0.2 together
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Each head's language knowledge (census S2), and the pin coupled to the docs bundle (S1, S4). **Touches `packages/chord/tests`, so it starts only after David's yes on D-4.**
- **Entry state**:
  - D-4 answered yes.
  - `./repokit build` has run at HEAD, so `node packages/devkit/dist/cli.js --version` prints Sharpee 5.6.1 · Chord 4.0.2.
  - `xcodegen generate --spec tools/ide/project.yml` has run.
  - The full macOS suite has run once and its failure count is recorded as this phase's baseline. The census measured 2 at 4.0.1, both the pin. A TestRunnerTests timeout is #581 and is reported, never retried.
  - `npx vitest run --root tools/ide/web/docs-tab` has run once and its count is recorded (census: 40 passing, 3 failures).
- **Deliverable**:
  1. A new corpus file, `packages/chord/tests/fixtures/lexer-golden/chord-4-surface.story` (new), gate-clean under `sharpee compose --check` at 4.0.2. Every spelling is lifted from the guide fences under `website/src/app/chord/`, as the 3.6.0 corpus file was, so no story content is invented. It covers:
     - the `claims`, `landmarks`, `passage`, `position`, `pushing` and `sailing` blocks;
     - a vehicle;
     - `servings <n>`;
     - ADR-392's trait words (`wearable on the`, `opens when`, `closes when`, `smelly`, `loud`);
     - a story trait read after `is a` (ADR-394);
     - a name carrying `&`.

     The golden is regenerated with `UPDATE_GOLDEN=1` (`packages/chord/tests/fixtures/lexer-golden/lexer-golden.json`), with every existing stream unchanged. The drift guard in `packages/chord/tests/lexer-golden.test.ts` is extended to name each new construct.
  2. In `tools/ide/SharpeeIDE/Editor/ChordLexer.swift`, `&` becomes a word token, mirroring `packages/chord/src/lexer.ts:203`. Closes #656.
  3. Both keyword sets gain the six block openers in the same commit, following the 3.3.0 and 3.6.0 precedent. `tools/ide/SharpeeIDETests/SyntaxHighlighterTests.swift` pins them for the Swift head. A new case under `tools/ide/PaneHost.Tests/` pins them for the Avalonia colorizer, which has no test today (census D-4).
  4. The pin moves to `"4.0.2"`. Its doc comment gains a dated 4.0.2 paragraph naming the new corpus file, which meets the honesty condition at `ChordVersionCheck.swift:22-24`. Closes #652.
  5. `tools/ide/build-docs-tab.sh` rebuilds the docs tab from the current website, so `docs-index.json` reads `chordLanguageVersion` 4.0.2. Closes #648. The macOS build's other pre-build scripts may rewrite the remaining derived bundles; whatever they produce is committed, and an unexpected diff is reported.
  6. `loadRealNav` (`tools/ide/web/docs-tab/tests/nav-bridge.test.mjs:208`) bundles `nav.ts` the way `loadNav` (`tools/ide/web/docs-tab/build.mjs:162`) does, so the three real-site tests resolve `versions.json`. Closes #502.
- **Files**: `packages/chord/tests/fixtures/lexer-golden/`, `packages/chord/tests/lexer-golden.test.ts`, `tools/ide/SharpeeIDE/Editor/ChordLexer.swift`, `tools/ide/SharpeeIDE/Editor/SyntaxHighlighter.swift`, `tools/ide/PaneHost/Editor/ChordColorizer.cs`, `tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift`, `tools/ide/SharpeeIDETests/`, `tools/ide/PaneHost.Tests/`, `tools/ide/SharpeeIDE/Resources/`, `tools/ide/web/docs-tab/tests/nav-bridge.test.mjs`, `stories/dungeo/src/version.ts`, `docs/work/chord-writer-5-6-pairing/plan.md`
- **Exit state**:
  - The pin, the docs bundle's stamp and the workspace CLI all say 4.0.2.
  - The golden corpus exercises the 4.0 block openers, `servings`, the 4.0.2 trait words and `&`.
  - The two keyword sets are identical and both carry the six openers.
  - The macOS suite has 0 failures, the chord golden suite is green, and the docs-tab suite is 43 of 43.
  - The generated protocol is fresh.
  - #652, #656, #648 and #502 are closed, each with its evidence inline.
- **Demonstration**:
  - `pnpm --filter @sharpee/chord test:ci lexer-golden` passes.
  - `ChordLexerGoldenTests`, run before the `ChordLexer.swift` edit, fails on the `&` token of the new corpus file, and passes after it.
  - The full macOS suite passes: `xcodebuild test -project tools/ide/SharpeeIDE.xcodeproj -scheme SharpeeIDE -destination platform=macOS -derivedDataPath tools/ide/DerivedData`, with SYMROOT and OBJROOT under tools/ide/DerivedData/Build, prints Executed N tests, with 0 failures.
  - `dotnet test tools/ide/PaneHost.Tests/PaneHost.Tests.csproj --filter ChordColorizer` passes.
  - The keyword and property word lists extracted from `tools/ide/SharpeeIDE/Editor/SyntaxHighlighter.swift` and `tools/ide/PaneHost/Editor/ChordColorizer.cs` compare equal; the one-off diff command and its empty output are recorded in Demonstrated.
  - `npx vitest run --root tools/ide/web/docs-tab` reports 43 passed.
  - `./repokit protocol --check` prints that the generated protocol types match the TypeScript wire contract.
- **Demonstrated**: 2026-11-13, session 90a471, main at ab8d2780b plus this phase's uncommitted edits.
  - Baselines before any edit: `node packages/devkit/dist/cli.js --version` → `Sharpee 5.6.1 · Chord 4.0.2`; the macOS suite → `Executed 626 tests, with 2 failures` (`ChordVersionCheckTests.swift:86` and `DocsTabRealPathTests.swift:277`, both the pin); `npx vitest run --root tools/ide/web/docs-tab` → `Tests 3 failed | 40 passed (43)`. [verified: CLI — writer re-ran `node packages/devkit/dist/cli.js --version` → `Sharpee 5.6.1 · Chord 4.0.2`, 2026-11-13 19:40 CST (no `packages/` source changed this phase); docs-tab baseline — event "Tests failed", Test Files 1 failed | 2 passed, Tests 3 failed | 40 passed, 2026-11-13 19:10:23 CST] [macOS baseline 626 / 2 failures: reported by session, unverified — xcodebuild runs leave no event row]
  - `node packages/devkit/dist/cli.js compose packages/chord/tests/fixtures/lexer-golden/chord-4-surface.story --check` → `compose: Chord 4.0.2 — … is gate-clean`. [verified: writer re-ran → `is gate-clean (--check: IR not emitted)`, 2026-11-13 19:39 CST]
  - `pnpm --filter '@sharpee/chord' golden:lexer`, then `git diff --numstat` on `lexer-golden.json` → `13267 0` (additions only; the seven existing streams unchanged). `pnpm --filter '@sharpee/chord' test:ci lexer-golden` → `Tests 2 passed (2)`; the full `pnpm --filter '@sharpee/chord' test:ci` → `Test Files 119 passed (119)`, `Tests 1842 passed (1842)`. [verified: writer re-ran all three 2026-11-13 19:38 CST — numstat `13267 0`; `test:ci lexer-golden` → `Tests 2 passed (2)`; full `test:ci` → `Test Files 119 passed (119)`, `Tests 1842 passed (1842)`]
  - `xcodebuild test … -only-testing:SharpeeIDETests/ChordLexerGoldenTests` before the `ChordLexer.swift` edit → `Executed 6 tests, with 1 failure`, `chord-4-surface.story:7: Swift lex diverges from the golden` (the line's `&`). [reported by session, unverified — no event row, and the before-edit state cannot be re-run]
  - The full macOS suite after every edit (the command in Demonstration) → `Executed 626 tests, with 0 failures`, `** TEST SUCCEEDED **`. [reported by session, unverified — no event row; not re-run by the writer because it opens the app on the desktop]
  - `dotnet test tools/ide/PaneHost.Tests/PaneHost.Tests.csproj --filter ChordColorizer` → `Failed: 0, Passed: 8`. [verified: writer re-ran → `Passed! - Failed: 0, Passed: 8, Skipped: 0, Total: 8`, 2026-11-13 19:39 CST]
  - Keyword parity: instead of a one-off diff, `ChordColorizerTests` (`the_keyword_set_equals_the_macos_heads`, `the_property_set_equals_the_macos_heads`) reads `SyntaxHighlighter.swift` from the checkout and compares both sets; both pass in the run above. `ChordColorizer.Keywords` and `.Properties` became `internal` for it. [verified: the writer's 19:39 CST run above; its 8 cases are the six-opener theory plus both parity facts]
  - `npx vitest run --root tools/ide/web/docs-tab` → `Test Files 3 passed (3)`, `Tests 43 passed (43)`. [verified: writer re-ran → same counts, 2026-11-13 19:38 CST]
  - `bash tools/ide/build-docs-tab.sh` → `docs tab: 167 pages … (Chord 4.0.2)`; `docs-index.json` reads `"chordLanguageVersion":"4.0.2"`. [verified: writer read `"chordLanguageVersion":"4.0.2"` in `docs-index.json`, 2026-11-13 19:40 CST] [167-page count: reported by session, unverified]
  - `./repokit protocol --check` → `generated protocol types match the TypeScript wire contract`. [verified: writer re-ran → same line, 2026-11-13 19:38 CST]
  - Departure from Deliverable 1: the `claims` block is in a second corpus file, `chord-4-claims.chord`, because `compose --check` refuses a claims block in a story (`analysis.claims-in-story`); `corpusFiles()` in `lexer-golden.test.ts` now takes `.chord` beside `.story`. That fragment is pinned by the golden and lexes clean; it was not run through a claims compile. `use scoring` was added to the corpus header so the guide's `define action` fence compiles.
  - Derived bundles the macOS pre-build rewrote, all to be committed: 14 changed and 4 new pages under `Resources/docs-tab/`, and `Resources/testing-surface/surface.js`. [verified: `git status --short` 2026-11-13 19:37 CST — the 14 changed are 13 pages plus `docs-index.json`; 4 new pages; `surface.js` modified]
  - #652, #656, #648 and #502 close by the `closes` keywords of the commit that lands this phase (David's `/devarch:finalize`, 2026-11-13), each with an evidence comment posted after the push.
- **Status**: DONE

### Phase 2: The packaging path proves the 5.6.1 toolchain in both heads before anything is released
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The vendored toolchain (S1) and the packaging seams (S8). `tools/ide` only, with no platform change.
- **Entry state**:
  - D-6 answered.
  - main is clean.
  - `./repokit build` has run at HEAD.
  - `git log 95bde75e9..HEAD -- packages/` shows nothing outside `packages/chord/tests`.
  - `dotnet`, `xcodegen` and `vpk` are present (`tools/ide/package-avalonia.sh:48`).
  - Phase 1 is not required.
- **Deliverable**:
  1. `tools/ide/package-avalonia.sh` builds the editor bridge itself (`node tools/ide/editor-bridge/build.mjs`) instead of accepting whatever `lexer-server.js` is on disk. The Avalonia editor's lexer is then always the workspace's own at packaging time.
  2. Item 2 of #662: both package scripts run `tools/ide/toolchain-realpath-test.sh` against the bundle they just produced, with an absolute path. They also check that the bundled `sharpee --version` reads the workspace's own `Sharpee <packages/devkit version> · Chord <CHORD_LANGUAGE_VERSION>` (ADR-279 D4's exact pairing; this catches a stale `dist`). Either failure stops the script.
     - `tools/ide/package.sh` runs the check after signature verification and before any notarization submission, on both the build path and the `--dmg-from` path. A `--no-toolchain` bundle has no toolchain and is exempt.
     - `tools/ide/package-avalonia.sh` runs it as its last step.
  3. `tools/ide/README.md` is rewritten for #655, with every statement checked against the code. It covers:
     - both heads, the bundled toolchain, the real `tools/ide/project.yml` deployment target and bundle id, and the full layout;
     - the generated protocol (ADR-352);
     - the conformance obligations: the golden, the twin keyword sets, and the pin and docs-bundle coupling;
     - each suite's exact command;
     - the release path for each head.
  4. Evidence runs, unattended. Local signing is covered by D-6, and every output goes to a scratch directory:
     - **a.** `tools/ide/vendor-toolchain.sh` assembles a toolchain at HEAD. Its CLI prints Sharpee 5.6.1 · Chord 4.0.2, and the real-path test passes.
     - **b.** Negative control: in a copy-on-write copy of that toolchain, with `@sharpee/character/dist-esm` moved aside, the real-path test fails with the #457 error. This shows the new package-script check can fail.
     - **c.** The full `PaneHost.Tests` suite passes with SHARPEE_IDE_TOOLCHAIN pointing at the HEAD toolchain, and SHARPEE_IDE_CAPABILITY_FIXTURE and SHARPEE_IDE_CAPABILITY_STORY pointing at the dedicated fixture in Documents.
     - **d.** `tools/ide/package-avalonia.sh` with `--arch arm64 --no-sign` rebuilds the bridge and passes the new check. The unsigned bundle is then run with `--app-exit-state` against a copy of `test-stories/lodge/` outside the repository. Its shell log shows the story opened, Build exit 0, Check gate-clean and Run Tests exit 0.
     - **e.** `tools/ide/package.sh` with `--arch arm64 --no-notarize` archives, vendors and signs, and passes the new check. Nothing goes to Apple.
     - **f.** `tools/ide/dmg/dmg-layout-test.sh` still passes on this macOS (census: 20 passing).
- **Files**: `tools/ide/package.sh`, `tools/ide/package-avalonia.sh`, `tools/ide/README.md`, `stories/dungeo/src/version.ts`, `docs/work/chord-writer-5-6-pairing/plan.md`
- **Exit state**:
  - Both package scripts refuse to produce a bundle whose toolchain cannot build a story outside the repository, or whose CLI does not report the workspace's versions.
  - The Avalonia packaging builds its lexer bridge every time.
  - The README describes the app as it is.
  - Rule 13a applies. The OWNED dependencies are the vendored toolchain, the bundled Node, the editor bridge and the two package scripts. Their real-path tests are runs 4a, 4c and 4d, with 4b as the control. No stub stands in.
  - #655 is closed, and #662 has a comment recording item 2.
- **Demonstration**:
  - `bash tools/ide/toolchain-realpath-test.sh <scratch>/stage/toolchain` prints Sharpee 5.6.1 · Chord 4.0.2 and "PASS — the bundled toolchain is self-contained". The negative-control copy prints FAIL with Could not resolve "@sharpee/character".
  - `dotnet test tools/ide/PaneHost.Tests/PaneHost.Tests.csproj`, with the three variables set, reports Failed 0.
  - The `package-avalonia.sh --no-sign` and `package.sh --no-notarize` logs each show the new check's PASS line.
  - The `--app-exit-state` shell log shows Build exit 0, gate-clean and Run Tests exit 0 on the lodge copy.
  - `bash tools/ide/dmg/dmg-layout-test.sh` reports 0 failures.
- **Demonstrated**: 
- **Status**: CURRENT (since 2026-11-13)

### Phase 3: Chord Writer ships against 5.6.1 / 4.0.2 — both macOS slices published, the Avalonia arm64 build notarized
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: The release (S1): signing, notarization, the Sparkle feeds and sharpee.net. **Attended: David at the keyboard throughout** (see "Who must be at the keyboard").
- **Entry state**:
  - Phases 1 and 2 are DONE, and D-1 and D-2 are ruled.
  - The tree is clean.
  - `git log 95bde75e9..HEAD -- packages/` shows only `packages/chord/tests`. If anything else appears, STOP and ask David: the toolchain would carry unpublished code under the 5.6.1 label.
- **Deliverable**:
  1. The version is set per D-1 in `tools/ide/project.yml` (lines 202-203: CFBundleShortVersionString, and CFBundleVersion 8) and in `website/src/lib/versions.json` (`chordWriter`). Both are committed before the build, because the docs tab bundles `versions.json`. The website is not deployed yet.
  2. **[Gate: David's go-ahead]** `bash tools/ide/release-all.sh` builds, signs, notarizes and staples both slices, then makes their DMGs and Sparkle payloads. Everything is collected under `tools/ide/release/<version>/` with UPLOAD.md and CHECKSUMS.txt.
     - Each slice must pass Phase 2's real-path check before it is submitted.
     - A notary submission whose output lacks Successfully uploaded file is dead. It is resubmitted through `tools/ide/notary-submit.py`, and the new id is recorded in that slice's ledger (the standing practice).
     - A failure is reported and never retried in a loop.
  3. The Avalonia build, per D-2 (a):
     - `bash tools/ide/package-avalonia.sh --arch arm64` signs the build and runs the real-path check;
     - `tools/ide/notary-submit.py` notarizes it with `--wait`;
     - the bundle is stapled and assessed with `spctl`;
     - the `--app-exit-state` loop runs inside the stapled bundle, against a copy of `test-stories/lodge/` outside the repository.

     The build is kept local and not uploaded.
  4. **[Gate: David's go-ahead]** `tools/ide/release/<version>/downloads/` is uploaded to sharpee.net in UPLOAD.md's order (zips before appcasts). Then the version commit is pushed, and David runs `./website/deploy.sh` on the server, which pulls `versions.json` and serves the new files.
  5. #653 is closed with the evidence, and #662 gets a comment on item 2's first release use.
- **Files**: `tools/ide/project.yml`, `website/src/lib/versions.json`, `tools/ide/SharpeeIDE/Resources/`, `stories/dungeo/src/version.ts`, `docs/work/chord-writer-5-6-pairing/plan.md`
- **Exit state**:
  - Both feeds' newest item is the new version, at sparkle:version 8.
  - The download page links the new DMGs, and every served file returns 200.
  - Each shipped slice's bundled CLI is the published 5.6.1 / 4.0.2.
  - The Avalonia build is notarized, stapled and usable from outside the repository.
  - Rule 13a applies (deploy). The real-path tests are:
    - the package scripts' real-path check on every stapled bundle;
    - the `--app-exit-state` loop inside the notarized Avalonia app;
    - Gatekeeper assessment on all three apps.
- **Demonstration**:
  - In each stapled app, the bundled `Contents/Resources/toolchain/bin/sharpee --version` prints Sharpee 5.6.1 · Chord 4.0.2.
  - The release logs show the real-path check's PASS for the arm64 slice, the x86_64 slice and the Avalonia app.
  - `spctl --assess --type execute --verbose` reports accepted, source=Notarized Developer ID, for all three.
  - After the deploy, `curl -s https://sharpee.net/downloads/chord-writer/appcast-arm64.xml` and the x86_64 feed each show the new version with sparkle:version 8.
  - `curl -I` on each new DMG and zip URL returns 200.
- **Demonstrated**: 
- **Status**: PENDING
