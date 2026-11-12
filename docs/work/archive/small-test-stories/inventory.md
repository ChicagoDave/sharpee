# Inventory: what the exploring tests prove (GH #684, Phase 1)

**Written**: 2026-11-11, session ece425, on `main` at c3823f727.
**Plan**: `docs/work/small-test-stories/plan-20261111-small-test-stories.md`

This is step one of David's process: list everything the real-path tests need to prove. It changes nothing outside this directory.

## What the measurements say

The time is in two test cases, not in two packages.

| Case | File | Time |
|---|---|---|
| Nine claim walks over Fernhill | `packages/branch-tester/tests/claims-fernhill.test.ts` (whole file, one shared run) | 111.6 s |
| The UPPS breaking edit | `packages/devkit/tests/claim-broken.test.ts`, "AC-4 on UPPS" | 121.8 s |
| Everything else in the turbo gate that runs a real story | five files, listed under Timings | 7.3 s |

Those two cases are 233 s of the gate's 306 s of vitest time. The UPPS case costs a full walk budget: its claim's walk ends on the 120-second limit (`packages/devkit/src/commands/test-claims.ts#CLAIMS_WALK_BUDGET`), which is the outcome the test asserts. The Fernhill case in the same file takes 2.0 s.

Three things the plan assumed turned out differently:

- `tools/ide/web/testing-surface/tests/lock-gesture-real-path.test.ts` does not read Fernhill. It runs on devkit's own two-room fixture (`packages/devkit/tests/fixtures/claims-tier/`), so it is already on a dedicated story and has nothing to move.
- The IDE web suite is fast today: 25 files, 255 tests, 13.1 s in all, every one passing. Its Fernhill cases take about 8 s each and run in parallel.
- `pnpm test:scripts` is red, and the explorer lens tests are red, for reasons listed under "Suites that are red today".

## The recorded search

Two passes, joined and sorted. The first reads file contents, the second file names (it finds a fixture whose name carries a story's name while its content does not).

```
git grep -l -i -E 'branch-stories|fernhill|ides-of-march|secret-letter|upps[./"'"'"'` ]|wumpus|familyzoo|thealderman|stories/(armoured|character-acceptance|cloak-of-darkness|counter-demo|eating-removal-test|expanses|friendly-zoo|grammar-alterations|hunger-demo|nautical|presence-test|sailing|trait-classification-test|trait-field-test|vehicles|channel-service-test|concealment-test|family-zoo-tutorial)|SHARPEE_TRANSCRIPT_CORPUS|NARRATIVE_STORY' -- packages scripts tools website

git ls-files packages scripts tools website | grep -i -E 'fernhill|ides-of-march|secret-letter|upps|wumpus|familyzoo|thealderman'
```

288 files. Dungeo's readers are not searched for by name: they are replay (the walkthrough chain and its unit transcripts) and stay.

A file that reaches a story only through a helper is found through the helper: every importer of `scripts/__tests__/support/fernhill-run.ts`, `story-under-test.ts` and `tools/ide/web/testing-surface/tests/spawn-cli.ts` was checked, and each is in the list (`lock-gesture-real-path.test.ts` imports the spawn helper and reads no real story).

## Classes

- **EXPLORING**: what the test asserts depends on a search of the story's state space (a claims walk, an explorer walk) or, under Question 1 yes, on the derived tier's run over the story's clause branches.
- **COMPANION**: walks nothing, but its subject is an exploring test's fixture or helper. It moves with that test.
- **REPLAY**: asserts on a fixed command list's output.
- **STRUCTURAL**: reads source, IR or files without running a turn.
- **OUT OF SCOPE**: not a test in this repository's gates (the IDE's native suites and app sources, archived tools, site content).
- **NAME ONLY**: a sixth label this inventory adds. The file names a story in a comment, a doc, or hand-built data and reads no story file. Nothing to move.

Where Question 1's two answers classify a file differently, both are shown as yes / no. The derived tier runs one arranged command per clause branch and searches nothing, so under "no" those suites are replays of a fixed plan.

## Every file the search finds

### EXPLORING (21)

| File | Stories named | Class (Question 1 yes / no) | Why |
|---|---|---|---|
| `packages/branch-tester/tests/claims-cone-acceptance.test.ts` | secret-letter | EXPLORING | one claim walk over Secret Letter's market, plus the cone's compile finding on it |
| `packages/branch-tester/tests/claims-fernhill.test.ts` | fernhill | EXPLORING | nine claim walks over Fernhill through the real engine |
| `packages/devkit/tests/claim-broken.test.ts` | upps,fernhill | EXPLORING | two cases run the real `sharpee test` on scratch copies of UPPS and Fernhill; three use devkit's own fixture |
| `packages/devkit/tests/test-claims.test.ts` | fernhill | EXPLORING | two cases run the real `sharpee test` on Fernhill, claims tier included; eight cases use devkit's own fixture |
| `scripts/__tests__/narrative-coverage-numbers.test.ts` | fernhill | EXPLORING / REPLAY | pins Fernhill's three coverage ratios, the derived tier's among them |
| `scripts/__tests__/narrative-endings.test.ts` | fernhill | EXPLORING / REPLAY | END STATE cards on Fernhill and on scratch edits of its tree |
| `scripts/__tests__/narrative-holds.test.ts` | fernhill | EXPLORING / REPLAY | the story-agnostic beats, run on Fernhill |
| `scripts/__tests__/narrative-names-the-cause.test.ts` | upps,fernhill | EXPLORING / REPLAY | runs UPPS's seeded rooms and reads the cause on the failed card |
| `scripts/__tests__/narrative-pinned-prose.test.ts` | fernhill | EXPLORING / REPLAY | Fernhill's boot card and first move, from the shared run |
| `scripts/__tests__/narrative-playing-through.test.ts` | fernhill | EXPLORING / REPLAY | Fernhill's eleven lines, its fork, and a two-process replay |
| `scripts/__tests__/narrative-rule-tests-itself.test.ts` | fernhill | EXPLORING / EXPLORING* | derived rows on Fernhill and on a scratch copy with a planted rule (*asserts on the derived tier itself, so it stays on Fernhill only under a strict "no") |
| `scripts/__tests__/narrative-support.test.ts` | fernhill | EXPLORING / REPLAY | the support module's own tests; one spawns the Fernhill run |
| `scripts/__tests__/narrative-unexpected-failure.test.ts` | fernhill | EXPLORING / EXPLORING* | Tobias's derived topic rows on Fernhill (*as above) |
| `scripts/__tests__/narrative-what-runs-when.test.ts` | fernhill | EXPLORING / REPLAY | exit codes: one case on Fernhill, the rest on scratch projects |
| `scripts/__tests__/support/fernhill-run.ts` | fernhill | EXPLORING / REPLAY | spawns `sharpee test --json` on Fernhill for every narrative suite: tree replay, derived tier, claims tier |
| `scripts/__tests__/support/scratch-story.ts` | fernhill | EXPLORING / REPLAY | makes the scratch copies the narrative suites edit |
| `scripts/__tests__/support/story-under-test.ts` | fernhill,secret-letter | EXPLORING / REPLAY | lists the stories narrative-holds runs: Fernhill always, plus `NARRATIVE_STORY` |
| `tools/explorer-probe/tests/lens-examinable.test.js` | fernhill | EXPLORING | walks Fernhill to 600 states and pins the lens's findings |
| `tools/ide/web/testing-surface/tests/claims-real-path.test.ts` | fernhill | EXPLORING | folds the claims tier of a real Fernhill run |
| `tools/ide/web/testing-surface/tests/derived-real-path.test.ts` | fernhill | EXPLORING / REPLAY | folds the derived tier of a real Fernhill run |
| `tools/ide/web/testing-surface/tests/line-verdict.test.ts` | fernhill | EXPLORING / REPLAY | two cases tint lines from a real Fernhill run with a planted failure; the rest are pure |

### COMPANION (5)

| File | Stories named | Class | Why |
|---|---|---|---|
| `packages/branch-tester/tests/claims-fragment.test.ts` | fernhill | COMPANION | compiles Fernhill's fragment and compares it with the fixture the walked test reads |
| `packages/branch-tester/tests/fixtures/claims/fernhill.json` | fernhill | COMPANION | the claim set claims-fernhill walks |
| `packages/branch-tester/tests/fixtures/claims/secret-letter-market.claims.chord` | - | COMPANION | the claim set claims-cone-acceptance walks |
| `packages/branch-tester/vitest.config.ts` | - | COMPANION | sets the corpus variable the walked tests read |
| `tools/ide/web/testing-surface/tests/spawn-cli.ts` | fernhill | COMPANION | the spawn helper the real-path suites share |

### REPLAY (1)

| File | Stories named | Class | Why |
|---|---|---|---|
| `packages/platform-browser/tests/visual/live-client.spec.ts` | fernhill | REPLAY | drives Fernhill's built browser page through fixed steps (Playwright; not in `test:ci`) |

### STRUCTURAL (15)

| File | Stories named | Class | Why |
|---|---|---|---|
| `packages/branch-tester/tests/claim-fragment-gate.test.ts` | fernhill,upps | STRUCTURAL | checks the two real fragments (Fernhill, UPPS) are in canonical shape; runs nothing |
| `packages/channel-service/tests/ac-16-cleanup-grep-gate.test.ts` | dungeo | STRUCTURAL | greps `stories/` source |
| `packages/character/tests/roundtrip/thealderman-port.test.ts` | thealderman | STRUCTURAL | compiles the Alderman port |
| `packages/chord/tests/adr-362-corpus-fold.test.ts` | fernhill,ides-of-march,secret-letter,upps,cloak-of-darkness,friendly-zoo,thealderman | STRUCTURAL | compiles the hand-listed corpus |
| `packages/chord/tests/adr-368-gerund-list.test.ts` | fernhill,ides-of-march,secret-letter,upps,cloak-of-darkness,friendly-zoo,thealderman | STRUCTURAL | compiles the hand-listed corpus |
| `packages/chord/tests/fixtures/lexer-golden/lexer-golden.json` | ides-of-march | STRUCTURAL | a lexer golden recorded from Ides of March's text; read as data |
| `packages/devkit/src/standalone/browser-core-build.test.ts` | fernhill | STRUCTURAL | builds Fernhill's browser bundle; plays no turn |
| `packages/transcript-tester/tests/corpus.ts` | - | STRUCTURAL | parses and serializes every `.transcript` under `stories/` |
| `packages/transcript-tester/vitest.config.ts` | - | STRUCTURAL | sets the corpus variable for the parse sweeps |
| `packages/world-index/tests/cli.test.ts` | fernhill | STRUCTURAL | spawns the world-index CLI on Fernhill's compiled IR; static analysis |
| `packages/world-index/tests/corpus.ts` | fernhill,thealderman,ides-of-march | STRUCTURAL | compiles Fernhill, the Alderman and Ides of March for the static world-index tests |
| `packages/world-index/tests/refusal.test.ts` | upps | STRUCTURAL | compiles UPPS's seeded rooms; events are hand-shaped |
| `scripts/__tests__/narrative-world-tab.test.ts` | fernhill | STRUCTURAL | static world-index views of Fernhill |
| `tools/explorer-probe/tests/lens-declared-state.test.js` | fernhill,secret-letter | STRUCTURAL | static lens over Fernhill's and Secret Letter's IR |
| `tools/ide/web/testing-surface/tests/outline.test.ts` | secret-letter | STRUCTURAL | reads Secret Letter's tree as a document |

### OUT OF SCOPE (121)

| File | Stories named | Class | Why |
|---|---|---|---|
| `tools/_archive/zifmia/tests/rooms-routes.test.ts` | familyzoo,dungeo | OUT OF SCOPE | archived tool |
| `tools/_archive/zifmia/tests/story-scanner.test.ts` | familyzoo,dungeo | OUT OF SCOPE | archived tool |
| `tools/ide/PaneHost.Tests/LocalOriginHttpTests.cs` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/PaneHost.Tests/PaneDoorTests.cs` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/PaneHost.Tests/PaneServerTests.cs` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/PaneHost.Tests/StoryIndexTests.cs` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/PaneHost.Tests/TestingSessionTests.cs` | secret-letter,upps | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/PaneHost.Tests/WorldReachViewTests.cs` | secret-letter | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/PaneHost/Editor/EditorWindow.axaml.cs` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/PaneHost/Hosting/RepoPaths.cs` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/PaneHost/MainWindow.axaml.cs` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/PaneHost/Shell/ProjectPaneView.cs` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/PaneHost/Shell/ShellWindow.axaml.cs` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/PaneHost/Shell/StoryProject.cs` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Compose/ChordVersionCheck.swift` | ides-of-march | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Launch/StoryLocationMirror.swift` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Menus/MenuBuilder.swift` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` | fernhill,dungeo | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord__guide__behavior__topic-tables.html` | upps | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord__guide__flow__chapters.html` | secret-letter | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord__guide__tooling__claims.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord__guide__vocabulary__define-phrasebook.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord__guide__world__sound-music-and-images.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord__guide__world__the-story-header.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord__reference__grammar.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/learn__fernhill.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/learn__fernhill__browser.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/learn__fernhill__endings.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/learn__fernhill__people.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/learn__fernhill__state.html` | - | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/learn__fernhill__things.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/learn__fernhill__time.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Resources/docs-tab/pages/learn__fernhill__world.html` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/Test/TestRunner.swift` | fernhill,cloak-of-darkness | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDE/World/WorldIndexDocument.swift` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDE/World/WorldIndexRunner.swift` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/SharpeeIDETests/AutoAssertionMenuTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/BuildRunnerTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/ComposeRunnerTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/CreateStorySheetTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/LaunchFlowTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/ProblemsVisibilityTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/PublishTabTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/ShippedThemesRealPathTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/SpanTextUnderlineTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/StoryHeaderIFIDTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/StoryHeaderPublishSourceTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/StoryIndexTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/StoryLocationMirrorTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/SyntaxHighlighterTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/TestRunnerTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/TestingBuildIdentityTests.swift` | upps | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/TestingSessionStoreTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/TestingSurfaceManifestSeedTests.swift` | secret-letter | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/WebBundleTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/WindowTitleTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/WorldIndexTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/WorldPhraseLocatorTests.swift` | ides-of-march | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/SharpeeIDETests/WorldSourceEditTests.swift` | fernhill | OUT OF SCOPE | IDE native suite (Swift or C#), a separate gate |
| `tools/ide/package-avalonia.sh` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/README.md` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/fernhill.story` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/arrival.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/cellar-dark.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/compass.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/concealment.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/containers.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/dawn-lose.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/doors.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/e-group.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/frost-seal.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/fuse-lose.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/fuse.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/key.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/machine.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/media-degrade.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/npcs.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/phrasebooks.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/recorded.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/restart.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/smoke.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/the-long-night.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/timeline.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `tools/ide/test-fixtures/fernhill-frozen/tests/transcripts/tool-gates.transcript` | fernhill | OUT OF SCOPE | IDE app source, script or resource |
| `website/deploy.sh` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/public/downloads/the-folly-at-fernhill.zip` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/public/downloads/the-ides-of-march.zip` | ides-of-march | OUT OF SCOPE | site content, not a test |
| `website/public/search-index.json` | dungeo,fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/chord-writer/download/content.mdx` | fernhill,ides-of-march | OUT OF SCOPE | site content, not a test |
| `website/src/app/chord/guide/behavior/topic-tables/content.mdx` | upps | OUT OF SCOPE | site content, not a test |
| `website/src/app/chord/guide/flow/chapters/content.mdx` | secret-letter | OUT OF SCOPE | site content, not a test |
| `website/src/app/chord/guide/tooling/claims/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/chord/guide/vocabulary/define-phrasebook/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/chord/guide/world/sound-music-and-images/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/chord/guide/world/the-story-header/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/chord/reference/grammar/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/browser/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/browser/page.tsx` | - | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/endings/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/endings/page.tsx` | - | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/page.tsx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/people/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/people/page.tsx` | - | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/state/content.mdx` | - | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/state/page.tsx` | - | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/things/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/things/page.tsx` | - | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/time/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/time/page.tsx` | - | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/world/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/learn/fernhill/world/page.tsx` | - | OUT OF SCOPE | site content, not a test |
| `website/src/app/page.tsx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/play/page.tsx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/playground/page.tsx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/sharpee/platform/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/app/style-guide/content.mdx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/components/prose.tsx` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/lib/nav.ts` | fernhill | OUT OF SCOPE | site content, not a test |
| `website/src/lib/releases-data.json` | upps | OUT OF SCOPE | site content, not a test |

### NAME ONLY (125)

| File | Stories named | Class | Why |
|---|---|---|---|
| `packages/branch-tester/package.json` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/branch-tester/src/coverage.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/branch-tester/src/tree-walker.ts` | upps | NAME ONLY | source or doc that names a story; not a test |
| `packages/branch-tester/tests/auto-assertion.test.ts` | fernhill,ides-of-march | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/branch-tester/tests/claim-predicates.test.ts` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/branch-tester/tests/derived-coverage.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/branch-tester/tests/derived-stream.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/branch-tester/tests/fixtures/derived/guard-defect.story` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/branch-tester/tests/fixtures/derived/vine-defect.story` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/branch-tester/tests/fixtures/derived/vine.story` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/branch-tester/tests/tree-document.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/branch-tester/tests/tree-walker.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/branch-tester/turbo.json` | - | NAME ONLY | source or data that names a story path; not a test |
| `packages/character/src/arbiter/scope.ts` | thealderman | NAME ONLY | source or doc that names a story; not a test |
| `packages/character/turbo.json` | thealderman | NAME ONLY | source or data that names a story path; not a test |
| `packages/chord/src/version.ts` | secret-letter | NAME ONLY | source or doc that names a story; not a test |
| `packages/chord/tests/adr-325-w1-make-wear.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/chord/tests/claims.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/chord/tests/fixtures/lexer-golden/conversation-surface.story` | ides-of-march | NAME ONLY | names a story in a comment only |
| `packages/chord/tests/gh-359-detail-gate-timer-read.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/chord/tests/language-version.test.ts` | secret-letter,upps | NAME ONLY | names a story in a comment only |
| `packages/chord/tests/secret-letter-phase4-resolution.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/chord/tests/story-block-fields.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/chord/turbo.json` | - | NAME ONLY | source or data that names a story path; not a test |
| `packages/devkit/src/commands/test-claims.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/devkit/src/commands/test-tree-document.ts` | fernhill,upps | NAME ONLY | source or doc that names a story; not a test |
| `packages/devkit/src/commands/tree-document-discovery.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/devkit/src/repo.ts` | familyzoo | NAME ONLY | source or doc that names a story; not a test |
| `packages/devkit/src/standalone/browser-core.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/devkit/src/standalone/publish.test.ts` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/devkit/src/standalone/publish.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/devkit/tests/compose-json.test.ts` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/devkit/turbo.json` | fernhill,upps | NAME ONLY | source or data that names a story path; not a test |
| `packages/engine/tests/integration/channel-bootstrap.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/ide-protocol/src/run-events.ts` | upps | NAME ONLY | source or doc that names a story; not a test |
| `packages/ide-protocol/tests/compose-diagnostics.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/ide-protocol/tests/guards.test.ts` | thealderman | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/ide-protocol/tests/run-events-claims.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/ide-protocol/tests/run-events-derived.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/ide-protocol/tests/run-events.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/ide-protocol/tests/test-results.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/platform-browser/src/managers/SaveManager.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/platform-browser/tests/reset-and-theme-menu.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/plugin-scheduler/src/scheduler-service.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/sharpee/README.md` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/sharpee/docs/genai-api/character.md` | thealderman | NAME ONLY | source or doc that names a story; not a test |
| `packages/sharpee/docs/genai-api/plugins.md` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/sharpee/docs/genai-api/presentation.md` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/sharpee/docs/genai-api/tooling.md` | upps | NAME ONLY | source or doc that names a story; not a test |
| `packages/stdlib/tests/channels/standard.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/stdlib/tests/unit/actions/engine-version-single-source.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/stdlib/tests/unit/actions/sleeping-waking-golden.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/src/decisions.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/story-loader/tests/adr-325-w1-make-wear.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/authored-move-order.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/channel-record.test.ts` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/docs-adr-327-spelling.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/story-loader/tests/gh-275-subject-change-occasion.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/gh-362-sleeping-waking-standard.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/gh-364-entity-description-markers.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/gh-365-372-region-gate-offstage-timer.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/gh-370-366-select-on-state-collision.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/gh-371-strategy-progress-per-phrase.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/on-after-pair.test.ts` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/passage-block-runtime.test.ts` | wumpus | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/story-loader/tests/publish-readiness-phase12.test.ts` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/story-loader/tests/two-pass-routing.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/story-loader/turbo.json` | friendly-zoo | NAME ONLY | source or data that names a story path; not a test |
| `packages/transcript-tester/src/run-event-stream.ts` | upps | NAME ONLY | source or doc that names a story; not a test |
| `packages/transcript-tester/tests/claim-kinds.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/transcript-tester/tests/header-folding.test.ts` | - | NAME ONLY | names a story in a comment only |
| `packages/transcript-tester/tests/run-event-stream.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/src/conditions.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/document.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/incomplete.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/prose.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/reach.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/refusal.ts` | upps | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/roles.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/statements.ts` | secret-letter,ides-of-march | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/story.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/src/unnamed.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `packages/world-index/tests/corpus-shape.test.ts` | fernhill,ides-of-march | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/tests/incomplete.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/tests/map.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/tests/reach.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/tests/roles.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/tests/scale-timing.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/tests/synthetic-corpus.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/tests/synthetic-corpus.ts` | fernhill | NAME ONLY | names a story in a comment only |
| `packages/world-index/tests/unnamed.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/tests/vocabulary.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `packages/world-index/turbo.json` | fernhill,ides-of-march,thealderman | NAME ONLY | source or data that names a story path; not a test |
| `scripts/__tests__/cli-chord-import.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `scripts/__tests__/cli-chord-seed.test.ts` | fernhill | NAME ONLY | names a story in a comment only |
| `scripts/build-snippet-page.cjs` | familyzoo | NAME ONLY | source or data that names a story path; not a test |
| `scripts/bundle-entry.js` | dungeo,fernhill | NAME ONLY | source or data that names a story path; not a test |
| `scripts/check-test-trees.mjs` | secret-letter | NAME ONLY | source or doc that names a story; not a test |
| `scripts/g3-fernhill-browser-proof.mjs` | fernhill | NAME ONLY | source or data that names a story path; not a test |
| `scripts/make-story-artifacts.mjs` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `tools/explorer-probe/dimensions.js` | secret-letter,fernhill | NAME ONLY | source or doc that names a story; not a test |
| `tools/explorer-probe/explore.js` | fernhill,secret-letter | NAME ONLY | source or doc that names a story; not a test |
| `tools/explorer-probe/lens-declared-state.js` | fernhill,secret-letter,ides-of-march | NAME ONLY | source or doc that names a story; not a test |
| `tools/explorer-probe/lens-examinable.js` | secret-letter,fernhill | NAME ONLY | source or doc that names a story; not a test |
| `tools/explorer-probe/necessary/fernhill.json` | fernhill | NAME ONLY | source or data that names a story path; not a test |
| `tools/explorer-probe/necessary/secret-letter.json` | secret-letter | NAME ONLY | source or doc that names a story; not a test |
| `tools/explorer-probe/plan.js` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `tools/ide/web/docs-tab/tests/nav-bridge.test.mjs` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `tools/ide/web/testing-surface/src/derived.ts` | secret-letter | NAME ONLY | source or doc that names a story; not a test |
| `tools/ide/web/testing-surface/src/main.ts` | secret-letter | NAME ONLY | source or doc that names a story; not a test |
| `tools/ide/web/testing-surface/src/outline.ts` | secret-letter | NAME ONLY | source or doc that names a story; not a test |
| `tools/ide/web/testing-surface/src/run.ts` | upps | NAME ONLY | source or doc that names a story; not a test |
| `tools/ide/web/testing-surface/tests/derived.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `tools/ide/web/testing-surface/tests/ending.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `tools/ide/web/testing-surface/tests/run.test.ts` | secret-letter | NAME ONLY | names a story in a comment only |
| `tools/ide/web/testing-surface/tests/tree-document.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `tools/repokit/entropy-allowlist.txt` | thealderman,dungeo,cloak-of-darkness | NAME ONLY | source or data that names a story path; not a test |
| `tools/repokit/src/commands/browser.ts` | fernhill | NAME ONLY | source or doc that names a story; not a test |
| `tools/repokit/src/commands/build.test.ts` | dungeo,familyzoo | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `tools/repokit/src/commands/build.ts` | dungeo | NAME ONLY | source or data that names a story path; not a test |
| `tools/repokit/src/commands/clean.test.ts` | dungeo,familyzoo | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `tools/repokit/src/commands/test-npm.ts` | dungeo,familyzoo | NAME ONLY | source or doc that names a story; not a test |
| `tools/repokit/src/consumer-gen.ts` | dungeo,familyzoo | NAME ONLY | source or doc that names a story; not a test |
| `tools/repokit/src/repo.test.ts` | fernhill | NAME ONLY | a story's name or id appears in hand-built data; no story file is read |
| `tools/repokit/src/repo.ts` | fernhill,familyzoo | NAME ONLY | source or data that names a story path; not a test |

## Obligations

One row per fact a test proves, in story-independent words, with what a story must contain to carry it. "Now" is where it is proven today.

### The claims runner (`claims-fernhill.test.ts`, seed 1209, budget 500,000 states / 120 s / depth 80)

| Id | Obligation | A story must contain | Now |
|---|---|---|---|
| OB-1 | An **ending** claim is held by a witness at a pinned depth | a winnable ending several commands deep | victory, depth 24 |
| OB-2 | A **placement in the player** claim is held by witness at a pinned depth | a thing the player can come to hold | the deed, depth 21 |
| OB-3 | An **event** claim (a person asked about a topic) is held by witness | a person with a topic | Tobias, depth 2 |
| OB-4 | A **declared state** claim is held by witness | a thing with `states:` that a command changes | the diary page, depth 10 |
| OB-5 | A **`never` placement not in a room** claim is **violated**, with its witness and depth | a thing that should stay in a room and can be carried out | the deed box, depth 14 |
| OB-6 | A **room** claim is held by witness | a room behind at least one gate | the Study, depth 8 |
| OB-7 | A **`never` room** claim under a condition is **held by exhaustion**: no depth, a pinned state count, stop reason `frontier-exhausted` | a room unreachable without a named thing, in a set small enough to exhaust | the Study without the sherry, 15 states |
| OB-8 | A **readable flag** claim is held by witness | a readable | the auction notice, depth 1 |
| OB-9 | A **fired clause** claim is held by witness | a clause on a thing that a command fires | the stopcock's turning, depth 4 |
| OB-10 | An **openable flag** claim that was locked from a tree line is held when walked | an openable, and a lock written from a line | the deed box, depth 20 |
| OB-11 | The run's tally is declared / held / violated / unproven, exactly | at least one violated claim among held ones | 10 / 9 / 1 / 0 |
| OB-12 | One walk per distinct set; claims that share a set share a walk; each walk is named by its set | two claims on the declared set, the rest with their own `needs` | ten claims, nine walks |
| OB-13 | Every walk stops because its claims settled or the frontier was exhausted, never on a budget | sets small enough to settle | all nine |
| OB-14 | The whole run finishes inside a wall-clock bound | (any) | under 120 s; see "The obligation a small story cannot carry" |
| OB-15 | Witness paths are exact, command for command, for one held and one violated claim | deterministic play at the pinned seed | 24 and 14 commands |
| OB-16 | Per claim, the things the cone reports inert are pinned; some claims have inert things and some have none; each verdict's inert count equals the cone's; no witness command names an inert thing | things in a set that cannot bear on a claim, beside things that can | sherry bottle and Mrs Kettle; garden shears; none elsewhere |

### The fragment and the manifest (`claims-fragment.test.ts`, companion)

| Id | Obligation | A story must contain | Now |
|---|---|---|---|
| OB-17 | The tree's manifest names the claims fragment | a tree directory whose manifest has the `claims` key | Fernhill |
| OB-18 | The fragment compiles against the story to exactly the claim set the walked test reads | a Chord claims fragment and its JSON twin | `fernhill.json` |
| OB-19 | The story compiles to the same IR with or without the fragment, and the IR carries no claim | (the same) | Fernhill |

### The cone's finding (`claims-cone-acceptance.test.ts`)

| Id | Obligation | A story must contain | Now |
|---|---|---|---|
| OB-20 | For a claim whose set lists many things that cannot bear on it, the compile finding names every one inert, in set order, on the `needs things` line, and proposes dropping the line | a place with many independent takeable things and a claim about the place alone | Secret Letter's market, 26 wares |
| OB-21 | The trimmed set (rooms alone) holds the claim by exhaustion on the real engine | (the same) | about a second |

### `sharpee test`'s claims tier (`test-claims.test.ts`, the two Fernhill cases, the tree's seed)

| Id | Obligation | A story must contain | Now |
|---|---|---|---|
| OB-22 | The claims section prints after the derived report; its ratio line carries the tree's seed; a violated claim leaves the exit at 0 | a tree, a fragment, a violated `never` | `9 of 10 held, 1 violated (seed 42)` |
| OB-23 | Lines prove the positive claims they reach, so only the `never` claims and the claims no line reaches are walked; the walk count and the held-by-line count are exact | tree lines that reach some positive claims and not others | 4 walks, 6 held by line |
| OB-24 | A violated `never` prints as `VIOLATED … (never) — at depth N:` with its witness | (as OB-5) | the deed box |
| OB-25 | A claim held by a line names the line's id, its label and the turn; a lock's row names its card and turn and reads "held there"; the lock can be held at its card while the claim is reported held by another line | a lock on one line and a second line that also reaches the claim | the deed box lock |
| OB-26 | With and without the manifest's `claims` key: the same exit code, the tally differing by exactly the held lock's one assertion, and the same report up to the claims | (the same) | 107 against 106 assertions |

### The breaking edit (`claim-broken.test.ts`, the UPPS and Fernhill cases)

| Id | Obligation | A story must contain | Now |
|---|---|---|---|
| OB-27 | After a story edit that breaks a locked claim, an earlier card fails with the story's own output printed under its cite, and the run exits 1 | a lock late on a line, and a one-line edit that breaks the line before it | UPPS's drop lever |
| OB-28 | The lock's card fails on its own row: `lock "…" not held here:` and what is so instead | (the same) | the Kraken Landing lock |
| OB-29 | The claim is UNPROVEN, "not reached by any line", and its walk "stopped at" a budget | a claim whose set cannot settle inside a budget | a 120 s stop; a depth stop words it the same way |
| OB-30 | The lock's row names line id, label and turn and reads "NOT held there:" with what is so | (as OB-27) | UPPS |
| OB-31 | After an edit that leaves every card green and puts a claim out of reach: exit 0, the ratio line counts one unproven, the claim reads UNPROVEN by exhaustion naming its set, and another lock still reads "held there" | a claim provable only by walk, a one-line edit that moves its thing out of the set, and a second lock | Fernhill's auction notice |

### The IDE web testing surface

| Id | Obligation | A story must contain | Now |
|---|---|---|---|
| OB-32 | The page folds every `claim-result` and the summary of a real run; the lock names its card; the tab's lines are the CLI's stderr lines | (as OB-22 to OB-25) | `claims-real-path.test.ts`, Fernhill, 8.4 s |
| OB-33 | (Question 1) The page folds every `derived-branch` and the summary; its report lines are the CLI's stderr tail | rules that yield derived rows, a SKIPPED branch, an unreached ending | `derived-real-path.test.ts`, Fernhill, 8.2 s |
| OB-34 | (Question 1) With one planted failing line, that line and its fork heading tint as fail and every other line as pass; a run the CLI refuses leaves every line untinted with the pipeline note | a tree with a fork | `line-verdict.test.ts`, two cases, Fernhill, 8.4 s and 1.3 s |

### The explorer's examinable lens

| Id | Obligation | A story must contain | Now |
|---|---|---|---|
| OB-35 | A bounded walk reaches a pinned list of rooms in order and stops on its state budget; the phrases it examines fall into pinned classes and counts; findings fold by phrase with the rooms each recurs in; a carried thing explains a recurrence | described and undescribed things, a phrase with no entity, a carried readable | `lens-examinable.test.js`, Fernhill at seed 1209 / 600 states. **Failing today.** |

### The author narrative (`scripts/__tests__/narrative-*`, all Question 1)

| Id | Obligation | A story must contain | Now |
|---|---|---|---|
| OB-36 | The three coverage ratios with their gaps: each SKIPPED branch with a shape and a span, the unreached ending at its source line, every room entered; the report on stderr reads the same as the wire | a SKIPPED branch, an ending no line reaches | `narrative-coverage-numbers`. **Failing today.** |
| OB-37 | END STATE cards are asserted from the engine's ending record; two lines reach two endings of three; a line that stops short fails at its END STATE card naming the ending; a removed END STATE card leaves a named gap, not a failure | three endings, a fork that reaches a second | `narrative-endings`. **Not running today.** |
| OB-38 | The story-agnostic beats hold on a known story, and on a second one `NARRATIVE_STORY` names | (any story with a tree) | `narrative-holds`, 14 cases. **One failing.** |
| OB-39 | Seeded authoring mistakes: a thing never placed and a thing missing a trait each fail one named card, the wire names the cause with its fix, the report prints both sentences; the correct story fails nothing | seeded variants of one room | `narrative-names-the-cause`, UPPS's seeds. **Failing today.** |
| OB-40 | The boot card pins the room name and opening paragraph; the first move becomes a card with the room name the default policy pins; the whole main line passes | (any) | `narrative-pinned-prose` |
| OB-41 | The tree is N lines, each opened and closed once, in order; a three-way fork starts three branches on one turn; every card has a verdict; two processes replay to the same events, timing aside | a tree with a three-way fork | `narrative-playing-through`. **One failing.** |
| OB-42 | A rule yields derived rows nobody authored; a row arranges its precondition and types one command; a planted rule that fights the first fails exactly one row, naming the thing and the two rooms; the planted clause is itself one more row; the tree notices the same break at a card; a SKIPPED negation branch moves neither exit code | a rule with a `when` precondition, a negation branch, a card the planted rule breaks | `narrative-rule-tests-itself`. **Not running today.** |
| OB-43 | A person's topic rows pass, each proving the reply, with the thing asked about brought to the person; no derived row fails and the run exits 0 | a person with two topic rows about things | `narrative-unexpected-failure` |
| OB-44 | One gesture runs everything and a clean story exits 0 | (any clean story) | one case of `narrative-what-runs-when`; its other eight use scratch projects and stay |
| OB-45 | The shared run is spawned once and reused by every suite | (the support module) | `narrative-support`, one case |

## The obligation a small story cannot carry

**OB-D1.** ADR-365 AC-2 bounds the claims run on a real-sized story: Fernhill's ten claims inside 120 seconds at seed 1209. A five-room story keeps the form of OB-14 (a bound) and loses its substance (that the walk stays fast at scale). That check is what caught #628's slowdown; today it runs at 111.6 s against its 120 s cap.

Options for David: keep it as an on-demand, non-gating measurement on Fernhill (a script or a skipped-by-default test), or let it go.

## Shapes no current test covers

Carried from planning, not grown by this work: a placement inside a container, and an ending by message or by cause. No real-path test proves either today, so no test story is asked to carry them.

## Timings

One run each on the current tree (c3823f727), 2026-11-11.

**The turbo gate**, from `pnpm exec turbo run test:ci --continue` (the 12:32 run, 73 of 73 tasks, 5m22.7s), beside the earlier 306 s total:

| File | Class | Time |
|---|---|---|
| `branch-tester/tests/claims-fernhill.test.ts` (5 cases) | EXPLORING | 111,574 ms |
| `branch-tester/tests/claims-cone-acceptance.test.ts` (2) | EXPLORING | 1,656 ms |
| `branch-tester/tests/claims-fragment.test.ts` (3) | COMPANION | 74 ms |
| `devkit/tests/claim-broken.test.ts` (5) | EXPLORING | 124,064 ms |
| `devkit/tests/test-claims.test.ts` (10, two on Fernhill) | EXPLORING | 3,480 ms |

`claim-broken` per case, from `pnpm --filter '@sharpee/devkit' exec vitest run tests/claim-broken.test.ts --reporter=verbose` ("Tests 5 passed (5)", 125.61 s): the UPPS case 121,813 ms, the Fernhill case 2,003 ms, the three fixture cases the remainder.

**`pnpm test:scripts`** (`pnpm test:scripts --reporter=verbose`): "Test Files 6 failed | 11 passed (17)", "Tests 9 failed | 83 passed | 11 skipped (103)", "Duration 124.84s".

**The IDE web testing surface** (vitest run from `tools/ide/web/testing-surface/`): "Test Files 25 passed (25)", "Tests 255 passed (255)", "Duration 13.10s".

**The explorer lens tests** (`node --test tools/explorer-probe/tests/lens-examinable.test.js tools/explorer-probe/tests/lens-declared-state.test.js`): 43 tests, 34 pass, 9 fail, 0.5 s. A first attempt passed the directory, which this Node version does not accept; that was the command's fault and is not a result.

## Suites that are red today

Measured, not fixed. Each failure is sorted by whether a new test story cures it.

| Suite | Today | Cause | Cured by a test story? |
|---|---|---|---|
| `narrative-coverage-numbers` | 3 of 4 fail | Fernhill moved under its pins: 36 exercised branches where 34 is pinned, `dawn-comes` no longer at line 636 (#627) | **Yes.** The suite re-pins on a story that does not move. |
| `narrative-names-the-cause` | 4 of 4 fail | the expected failed card `wear satchel` is absent and exits are 2 where 1 and 0 are expected (#627). Exit 2 means the tester could not run the seed at all; why was not read in this phase | **Probably.** New seeded mistakes on a test story replace UPPS's seeds. If the cause is the explainer and not the seeds, it is a platform matter and waits for a ruling. |
| `narrative-holds`, replay case | 1 of 14 fails | two processes' event lists differ (#627: the claims summary's `totalWalkMs` is not stripped before the compare; #587: wall-clock seconds in a byte-compared stderr) | **No.** The compare needs the timing fields stripped in `scripts/__tests__/support/`, which is test support and inside Phase 5's files, or the report changed in `packages/branch-tester/src/`, which is not this plan's. Needs a ruling. |
| `narrative-playing-through`, replay case | 1 of 4 fails | the same compare | **No.** As above. |
| `narrative-endings` | file fails, 5 cases skipped | not captured by this run's output; #627 records a spawn timeout in `beforeAll` | **Likely.** A small story's run is seconds. Unconfirmed until it runs. |
| `narrative-rule-tests-itself` | file fails, 6 cases skipped | as above | **Likely.** As above. |
| `lens-examinable`, the Fernhill pin and the fixture layer | 8 of its tests fail (and 1 in `lens-declared-state`) | stale pins since the syntax round (#583); one is a `TypeError` reading `sources` | **Partly.** The Fernhill pin is re-recorded on a test story. The fixture-layer failures are on the lens's own hand-built fixture and are not about any story; they wait for a ruling. |

## Files that become unused if every exploring case moves

Listed, never deleted; the decision is David's.

- `packages/branch-tester/tests/fixtures/claims/fernhill.json`
- `packages/branch-tester/tests/fixtures/claims/secret-letter-market.claims.chord`
- `scripts/__tests__/support/fernhill-run.ts` is renamed by Phase 5, not left behind.

Still used after the move, so not on the list: `branch-stories/upps/seeded/` (read by `packages/world-index/tests/refusal.test.ts`, structural) and both real claims fragments (read by `claim-fragment-gate.test.ts`).

## Where the stories live (Question 2)

- **(a)** A new top-level `test-stories/<story-id>/`. One home every consumer reads; the name says what they are; a real story's edit no longer changes the test stories' consumers' cache keys. Cost: a second directory branch-tester reads, so ADR-302 D16 takes a dated note, and a Chord census sweeps one more directory. **Recommended.**
- **(b)** `branch-stories/<story-id>-test/`. No new directory, but test and real stories sit side by side.
- **(c)** Per-package fixtures, as devkit's claims-tier project is. Two packages, the scripts and the IDE suite would each reach into another's tests, or copy.
- **(d)** `stories/<name>-test/`. That is the transcript harness's corpus, which D16 exists to keep tree stories out of.

## Questions for David

1. **Is the derived tier an exploring test?** It runs one arranged command per clause branch and searches nothing. Yes moves the narrative suites and the web surface's derived suites; no leaves them on Fernhill. What this inventory adds: the web surface's derived cases cost 8 s and pass, so speed does not argue either way there. The narrative suites are red on Fernhill mostly because Fernhill keeps moving under their pins, which a test story stops. And say which story the narrative's beats are held to, since the objective they serve was retargeted to the UNDERGROUND port (#671).
2. **Where do the stories live?** Recommended: (a).
3. **ADR-worthy?** Recommended: yes, a process record written in Phase 2.
4. **A line in `CLAUDE.md`** saying the real stories other than Dungeo do not gate? Recommended: yes, in Phase 7.
5. **OB-D1.** Keep the scale check on Fernhill as an on-demand measurement, or let it go?
6. **The replay compare** (`narrative-holds`, `narrative-playing-through`). Strip the timing fields in the scripts' support code as part of Phase 5, fix the report in branch-tester separately, or leave both cases failing and out of this plan?
7. **The lens's fixture-layer failures** (#583). In Phase 6, or left to #583?

## What this means for the plan

- The gate's saving comes from two moves: the claims walks (Phase 3) and the UPPS breaking edit (Phase 4). After them the exploring tests in the turbo gate cost seconds.
- Phase 6 shrinks: the lock-gesture suite is already on a dedicated fixture, and the claims suite is one case.
- Phases 5 and 6 are about stable pins more than speed, and both start from a red suite.

## Where each obligation lives now (Phase 7, 2026-11-11)

Every row above is as Phase 1 wrote it, with what was true on Fernhill, UPPS and Secret Letter that day. This table is the close-out: the test story, file and case that proves each obligation now.

| Id | Story | File | Case |
|---|---|---|---|
| OB-1 | lodge | `packages/branch-tester/tests/claims-real-path.test.ts` | settles all ten claims with the measured verdicts and witness depths |
| OB-2 | lodge | same | same |
| OB-3 | lodge | same | same |
| OB-4 | lodge | same | same |
| OB-5 | lodge | same | same, and the witnesses are the measured paths |
| OB-6 | lodge | same | settles all ten claims |
| OB-7 | lodge | same | settles all ten claims; runs one walk per distinct set (nine states, `frontier-exhausted`) |
| OB-8 | lodge | same | settles all ten claims |
| OB-9 | lodge | same | same |
| OB-10 | lodge | same | same (the claim written by `sharpee claim` at the main line's sixth turn) |
| OB-11 | lodge | same | same (the tally) |
| OB-12 | lodge | same | runs one walk per distinct set |
| OB-13 | lodge | same | same |
| OB-14 | lodge | same | the whole run finishes inside a 10-second bound |
| OB-15 | lodge | same | the witnesses are the measured paths |
| OB-16 | lodge | same | AC-9: nothing a witness touches is reported inert |
| OB-17 | lodge | `packages/branch-tester/tests/claims-fragment.test.ts` | the manifest names the fragment |
| OB-18 | lodge | same | the fragment compiles against the story to exactly the claim set the walked test reads |
| OB-19 | lodge | same | AC-6: the story compiles to the same IR whether or not the fragment is read |
| OB-20 | bazaar | `packages/branch-tester/tests/claims-cone-acceptance.test.ts` | the finding names all eight wares inert |
| OB-21 | bazaar | same | the trimmed set holds the claim by exhaustion |
| OB-22 | ferry | `packages/devkit/tests/test-claims.test.ts` | reports 5 held and 1 violated from the manifest line |
| OB-23 | ferry | same | same (three held by lines, three walks) |
| OB-24 | ferry | same | same (the violated `never` and its witness) |
| OB-25 | ferry | same | same (held by the main line at turn 6; the lock held on the branch at turn 7) |
| OB-26 | ferry | same | exits as the same run exits without the manifest line |
| OB-27 | ferry | `packages/devkit/tests/claim-broken.test.ts` | AC-4 on the ferry: the lever no longer docks the ferry |
| OB-28 | ferry | same | same |
| OB-29 | ferry | same | same (`max-depth-reached` after 159 states) |
| OB-30 | ferry | same | same |
| OB-31 | ferry | same | AC-4 on the ferry: a claim's own verdict moves nothing |
| OB-32 | ferry | `tools/ide/web/testing-surface/tests/claims-real-path.test.ts` | folds every claim-result and the summary |
| OB-33 | orchard | `tools/ide/web/testing-surface/tests/derived-real-path.test.ts` | folds every derived-branch and the summary |
| OB-34 | orchard | `tools/ide/web/testing-surface/tests/line-verdict.test.ts` | AC-1: the tint from a real run with one planted failure (two cases) |
| OB-35 | none | `tools/explorer-probe/tests/lens-examinable.test.js`, unchanged | **Not moved.** The lens returns nothing on its own fixture (GH #583), so its pin stays on Fernhill, failing, until the lens is repaired; then it is recorded on orchard. David's ruling, 2026-11-11. |
| OB-36 | orchard | `scripts/__tests__/narrative-coverage-numbers.test.ts` | the Coverage strip (four cases) |
| OB-37 | orchard | `scripts/__tests__/narrative-endings.test.ts` | all five cases |
| OB-38 | orchard | `scripts/__tests__/narrative-holds.test.ts` | all fourteen cases |
| OB-39 | orchard | `scripts/__tests__/narrative-names-the-cause.test.ts` | seeds T, U and Z (four cases) |
| OB-40 | orchard | `scripts/__tests__/narrative-pinned-prose.test.ts` | all three cases |
| OB-41 | orchard | `scripts/__tests__/narrative-playing-through.test.ts` | all four cases |
| OB-42 | orchard | `scripts/__tests__/narrative-rule-tests-itself.test.ts` | all six cases |
| OB-43 | orchard | `scripts/__tests__/narrative-unexpected-failure.test.ts` | both cases |
| OB-44 | orchard | `scripts/__tests__/narrative-what-runs-when.test.ts` | the story as written: every card passes |
| OB-45 | orchard | `scripts/__tests__/narrative-support.test.ts` | spawns the story's test --json once and shares the run |

OB-D1, the scale check on a real-sized story, has no destination: it was let go (ADR-395 D8).

## Final timings (Phase 7)

Each from one run on 2026-11-11, beside Phase 1's figure from the same day.

| Gate | Phase 1 | Now | Command |
|---|---|---|---|
| The turbo gate, vitest time summed over packages | 306 s | 72 s | `pnpm exec turbo run test:ci --force --continue` (Phase 4's run; 1m55s wall clock uncached, 73 of 73 tasks) |
| branch-tester's suite | 117.7 s | 4.0 s | within that run |
| devkit's suite | 126.8 s | 3.7 s | within that run |
| `pnpm test:scripts` | 124.8 s, 9 failed, 11 skipped | 3.9 s, 103 of 103 | `pnpm test:scripts --reporter=verbose` (Phase 5) |
| The IDE web testing surface | 13.1 s, 255 of 255 | 2.8 s, 255 of 255 | `vitest run` from `tools/ide/web/testing-surface/` (Phase 6) |
| The explorer lens tests | 9 of 43 failing | unchanged, not re-run | left to GH #583 by ruling |

## Which tests still read a real story

After the move, by the recorded search's classes:

- **Exploring**: none in a gate. The examinable lens's Fernhill pin remains in its failing file (GH #583).
- **Structural, staying**: chord's corpus compiles, world-index's corpus and CLI tests and its UPPS seeds, character's Alderman port, devkit's Fernhill browser build, transcript-tester's parse sweeps, branch-tester's canonical check of the two real fragments, the declared-state lens, `narrative-world-tab`, the web surface's outline test.
- **Replay, staying**: Dungeo's walkthrough chain and unit transcripts; platform-browser's visual spec.
- **Out of scope**: the IDE's native suites.

## Files nothing read after the move

Deleted on David's go, 2026-11-11 ("yes to all"):

- `packages/branch-tester/tests/fixtures/claims/fernhill.json`
- `packages/branch-tester/tests/fixtures/claims/secret-letter-market.claims.chord`

branch-tester's suite after the deletion: 29 files, 384 tests, all passing.
