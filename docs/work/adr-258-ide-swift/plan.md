# Session Plan: ADR-258 — IDE Chord authoring environment (Swift/Mac side)

**Created**: 2026-07-27
**Overall scope**: Ship the Swift/Mac half of ADR-258 — the four D3 swap-table
rows (ChordLexer.swift port, `compose --json` Swift decoder, IR-sourced project
tree, `.story` build/play paths) plus D8 persisted-state migration and D9
language-version tracking — against the already-IMPLEMENTED platform half
(`docs/work/adr-258-ide-platform/plan.md`, Phases 1-3 all DONE). This plan
touches only `tools/ide/` (XcodeGen spec, Swift sources, README) — no
`packages/` change is planned or needed; the wire contract and golden fixture
this plan consumes already exist on `main`.
**Bounded contexts touched**: N/A — this is native macOS app / editor-tooling
work (no `docs/ddd/notation.yaml`; not domain modeling). In the ADR's own
vocabulary: the IDE's Build, Editor, Play, Project, Persistence, and Workspace
subsystems (`tools/ide/SharpeeIDE/*`).
**Key domain language**: gates + IR no load-proof, `schemaVersion` (loud
decoder rejection on mismatch), Story IR, atomic load (IR meaningful only when
`ok`), last-`ok`-IR retention with a stale marker, exact-span navigation (no
name-matching fallback), golden token stream / conformance pin, grammar-header
`.story` (Build/Play disabled), `CHORD_LANGUAGE_VERSION`.

## References consulted
- `docs/architecture/adrs/adr-258-ide-chord-authoring-environment.md` — the
  plan's target: D1 (Chord-only IDE), D2 (`.story`-not-npm-project, grammar
  header amendment), D3 (the four-row swap table — the per-commit ordering
  constraint this plan's phase sequence must honor), D4 (`sharpee build
  <file>.story`, Play loads `dist/web/<id>/`), D5 (`compose --json` Problems
  transport, `schemaVersion` loud-reject), D6 (IR-sourced tree, last-`ok`
  retention + stale marker, exact-span nav, no name-matching), D7 (Swift lexer
  port pinned by the TS-side golden, deliberate-mismatch demo required), D8
  (recents/session migration on load, no migration file), D9 (Chord version
  check via `sharpee --version`). Acceptance's full "Done when" list is this
  plan's acceptance gate verbatim.
- `docs/work/adr-258-ide-platform/plan.md` — the completed platform plan
  (Phases 1-3 DONE, confirmed via `Status: DONE` on all three). Its "Out of
  scope — the Mac/Swift handoff" section is the exact contract this plan
  consumes: `ComposeJsonPayload`/`ComposeDiagnosticRecord`/
  `COMPOSE_JSON_SCHEMA_VERSION` from `@sharpee/ide-protocol`, and the committed
  `packages/chord/tests/fixtures/lexer-golden/lexer-golden.json` (+ 3 corpus
  `.story` files) the Swift `ChordLexer` conformance test pins against.
- `packages/ide-protocol/src/compose-diagnostics.ts` — read in full. The wire
  shape this plan's Swift decoder mirrors: `ComposeJsonPayload {
  schemaVersion, diagnostics: ComposeDiagnosticRecord[], ir?: StoryIR }`,
  `ComposeDiagnosticRecord { severity, code, message, file, line, span? }`
  (`span` present for compile diagnostics, absent for `hatch.*` findings — no
  end-span). `COMPOSE_JSON_SCHEMA_VERSION = 1`, distinct from
  `ProjectManifest`'s own `SCHEMA_VERSION`.
- `packages/chord/src/lexer.ts` — read in full (203 lines). The `lex()`
  contract the Swift port must reproduce exactly: `Line { lineNo, indent, raw,
  tokens, afterBlank, comment }`, `Token { kind, text, span }`,
  `TokenKind` = word/number/string/colon/comma/lparen/rparen/lbracket/rbracket/
  lbrace/rbrace/compare/punct. Tab-in-indent and comment-blank-line-delimiter
  diagnostics are lexer-level; the golden pins clean-lex corpus only (the TS
  test asserts the corpus itself lexes with zero diagnostics).
- `packages/chord/tests/fixtures/lexer-golden/lexer-golden.json` (+
  `alterations-counters.story`, `grammar-surface.story`, `story-core.story`)
  and `packages/chord/tests/lexer-golden.test.ts` — read the golden's exact
  JSON shape (per-corpus-file array of `Line` objects, full span fidelity) and
  the TS conformance test's regeneration contract (`UPDATE_GOLDEN=1`, the
  corpus-coverage drift guard, the "regenerate + update the Swift port"
  failure message). This is the literal artifact the Swift XCTest in Phase 3
  below reads — no Node subprocess, no regeneration logic on the Swift side.
- `tools/ide/project.yml` — read in full. Confirms the `SwiftTreeSitter` +
  `TreeSitterTypeScript` Swift Package dependencies (to be removed in Phase 3,
  once nothing references them), the `SharpeeIDE`/`SharpeeIDETests` targets,
  and the one scheme (`SharpeeIDE`, wired for both build and test) this plan's
  build/test commands target.
- `tools/ide/README.md` — read in full. Confirms the stale "Phase 0 — empty
  3-pane shell" claim (Acceptance requires this gone) and the
  `xcodegen generate` / `xcodebuild` command shapes already documented there.
- Swift sources surveyed in full to ground every phase in current code, not
  assumption: `BuildRunner.swift` (spawns `node_modules/.bin/sharpee build`,
  `npm install`, `sharpee init-browser`), `BuildSettings.swift` (author-facing
  `--browser`/`--zifmia`/`--skip <pkg>` argument builder — a repokit-flavored
  shape, not a single-`.story` shape), `BuildController.swift` (chains
  install→init-browser for "New Story"), `BuildPanelView.swift` (the ONLY
  consumer of `TSCDiagnosticParser` — there is no dedicated Problems panel
  today, so Phase 1 below builds new UI, not just a new decoder behind
  existing UI), `TSCDiagnostic.swift` (regex `tsc` scraper, dies with Phase 1),
  `WebBundle.swift` (`dist/web/` — no `<id>` segment), `EntitySourceIndex.swift`
  (tree-sitter TypeScript scan for string-literal call args, `.exact`/`.scope`
  name-matching — dies with Phase 2), `IntrospectionRunner.swift` (spawns
  `node_modules/.bin/sharpee introspect`, buffers stdout, decodes
  `ProjectManifest` — the Process/pipe pattern Phase 1/2's compose runner
  reuses), `ProjectManifest.swift` (the existing Codable-mirror-with-
  schemaVersion-gate pattern Phase 1's `ComposeJsonPayload` decoder follows),
  `Project.swift` / `ProjectTreeViewController.swift` (today's tree is a raw
  filesystem `NSOutlineView`, not entity-shaped — Phase 2 must decide how the
  IR-sourced entity tree coexists with or replaces this filesystem view),
  `SyntaxHighlighter.swift` (binds `TreeSitterTypeScript` for TS highlighting —
  dies with Phase 3), `BrowserEntry.swift` (`src/browser-entry.ts` template
  writer — dies with Phase 4), `StoryDetector.swift` /
  `PackageDetector.swift` (package.json-based story/package discovery for the
  monorepo `./sharpee build [story] --skip <pkg>` model — both need rework or
  removal in Phase 4), `StoryScaffold.swift` (writes the OLD
  `templates/story/*.template` TS scaffold — Phase 4 repoints this),
  `RecentProjectsStore.swift` / `SessionState.swift` (UserDefaults-backed,
  additive-Codable — the exact shape Phase 5's D8 migration filters on load),
  `PlayURLSchemeHandler.swift` (serves a bundle root directory over a custom
  scheme — unaffected by the `<id>` path change other than which root it's
  pointed at).
- `packages/devkit/src/standalone/init.ts` + `packages/devkit/templates/
  story-chord/{story.story.template,package.json.template}` — read in full.
  A Chord scaffold template **already exists on the platform side**
  (`sharpee init` writes `<id>.story` + `package.json` for the default,
  non-`--ts`, path). This surfaces a genuine tension with ADR-258 D2 ("must
  not require — or create — package.json") that Phase 4 must resolve
  explicitly rather than silently pick a side — see "Questions for the user"
  below.
- `packages/devkit/src/cli.ts` — grepped for `--version`: confirms
  `Sharpee ${platformVersion()} · Chord ${CHORD_LANGUAGE_VERSION}` is already
  shipped output (D9 reads this; no platform change needed).
- `packages/chord/src/ir.ts` — grepped for `StoryIR`/`IRMeta`: confirms
  `languageVersion: string` sits directly on `StoryIR`, and `meta.raw` carries
  the header fields (`id`, `version`, `blurb`, ...) — `dist/web/<id>/`'s `<id>`
  (D4) is `ir.meta.raw.id` (or the equivalent typed accessor if one exists;
  Phase 4 confirms the exact field name against the live type, not this
  grep).
- `docs/context/session-20260727-0800-adr-276-p1.md` (most recent session) —
  Open Items item 1 names exactly this work as next ("Swift/Mac side of
  ADR-258 ... consumes `ComposeJsonPayload` + `COMPOSE_JSON_SCHEMA_VERSION`
  from ide-protocol and `packages/chord/tests/fixtures/lexer-golden/
  lexer-golden.json`"), confirming this plan's premise and inputs.
- `docs/context/project-profile.md` (2026-07-16 origin date; stale past the
  7-day freshness window as of 2026-07-27, but still the only profile
  available) — confirms `tools/ide` is a recognized top-level tool directory
  in the monorepo map; carries no Swift-specific conventions (the profile is
  TS/pnpm-centric), so this plan does not defer to it for Swift style.
- `CLAUDE.md` — checked the "platform changes require discussion first" gate:
  it scopes to `packages/` (engine, stdlib, world-model, parser-en-us, etc.);
  `tools/ide/` is neither `packages/` nor `stories/`, so the gate does not
  fire for any phase below. Testing-commands section confirms the
  `dist/cli/sharpee.js` bundle is the required target for any transcript/
  corpus regression this plan's real-path tests touch incidentally.

## Hard constraints carried from the ADR (not re-litigated by this plan)
1. **Swap ordering is per-commit, not per-phase-boundary** (D3): the app
   builds and its full suite passes at **every** commit, not just at the end
   of a phase. Each phase below is itself further decomposable into
   commit-sized steps during implementation; no commit may delete a
   subsystem before its replacement lands in the same commit.
2. **`TreeSitterTypeScript`/`SwiftTreeSitter` cannot leave `project.yml`
   until BOTH consumers are gone.** `SyntaxHighlighter.swift` (Phase 3) and
   `EntitySourceIndex.swift` (Phase 2) both bind `TreeSitterTypeScript`. The
   ADR's swap table lists the dependency removal under row (a)/D7, but Phase 2
   must retire `EntitySourceIndex` **before** Phase 3 deletes the package
   dependency, or Phase 3's own commit would break Phase 2's
   already-shipped code. This plan's phase order (2 before 3) exists
   specifically to satisfy this.
3. **D2's "must not require or create `package.json`/`node_modules`" is
   absolute for the IDE's own runtime behavior** — opening, building, and
   playing a bare `.story` folder never touches npm. Whether the IDE's own
   "New Story" scaffold (Phase 4) writes a `package.json` is a separate,
   genuinely open question (see below) — D2 governs the open/build/play path,
   not necessarily what a freshly-scaffolded project starts with, but the
   tension is real and must be surfaced, not silently resolved either way.
4. **Hatch modules are never resolved on the editor (Problems/Tree) path**
   (D6) — Phase 1 and Phase 2's compose runner must never construct a
   `WorldModel` or `require` a hatch module; a story with an unresolvable
   hatch import must still produce gates + IR successfully under `--json`.
   Build (Phase 4) is a different path and may legitimately need the
   toolchain.
5. **The Swift decoder rejects an unrecognized `schemaVersion` loudly** (D5) —
   a visible "IDE is out of date for this toolchain" state, not a partial
   decode. `ProjectManifest.decode`'s existing `DecodeError.
   schemaVersionMismatch` pattern is the precedent to follow, not reinvent.
6. **The golden fixture is read, never regenerated, from the Swift side**
   (D7) — `packages/chord/tests/fixtures/lexer-golden/lexer-golden.json` is
   committed TS-side artifact; the Swift XCTest decodes and compares against
   it as-is. No Swift-side regeneration script, no Node subprocess.
7. **No name-matching fallback anywhere in the navigation path** (D6
   Acceptance) — a click-to-open either resolves to an exact IR span or the
   tree shows the node is unresolved; `SourceRef.resolution`'s `.exact`/
   `.scope` distinction is retired with `EntitySourceIndex`, not carried
   forward in a new guise.
8. **The IDE suite is green at every commit** (D3 Acceptance) and **real-path
   tests drive the real `sharpee` bin against a real `.story`** (rule 13a,
   D3/D4/D6 Acceptance) — `BuildRunnerTests` and whatever replaces
   `IntrospectionRunnerTests` must exercise the actual `Process`/pipe spawn
   against a real fixture story (e.g. `stories/fernhill/fernhill.story`), not
   a hand-written stand-in for the toolchain.
9. **No `packages/` change is in scope.** If any phase below discovers it
   actually needs a platform-side change, that is a question for the user
   (see below), not something to plan or implement here.

## Questions for the user (surfaced, not resolved, by this plan)
- **Q1 — which `sharpee` executable does the shipped IDE invoke?** D2/D4
  forbid `node_modules/.bin/sharpee`. The realistic candidate is a
  globally-installed `sharpee` (ADR-180 Phase U2's "outside authors" npm
  package) resolved via the login-shell `PATH` (`ShellEnvironment`, the same
  mechanism `npm` already uses in `BuildRunner`). This plan's Phase 1 and
  Phase 4 assume that resolution path and surface a clear "sharpee not found
  on PATH — install it" failure state when it's absent, mirroring the
  existing "missing bin" failure shape. **This assumption should be confirmed
  before Phase 4 lands** — if wrong, Phase 4's build/play invocation changes.
  (Tests are unaffected either way: they drive `node dist/cli/sharpee.js`
  directly against fixture stories, per CLAUDE.md's bundle-testing guidance —
  not the production resolution path.)
- **Q2 — does the IDE's own "New Story" scaffold write a `package.json`?**
  `packages/devkit/templates/story-chord/package.json.template` exists and
  `sharpee init`'s own Chord path writes one today — but ADR-258 D2 says the
  IDE "must not require — or create" one. Phase 4 defaults to **not**
  scaffolding `package.json` (matching D2's letter) and only writing
  `<id>.story`, diverging from `sharpee init`'s current behavior. Flagging
  this divergence for confirmation rather than silently matching or silently
  diverging.
- **Q3 — live-as-you-type vs. debounced-on-edit vs. on-save Problems/Tree
  refresh?** ADR Acceptance says "Introducing a syntax error mid-file leaves
  the tree populated and marked stale while Problems shows the new error" —
  which reads as live editing, not only post-save. Phase 1 plans a
  debounced recompile (~300-500ms after the last `NSTextStorage` edit,
  hooking the existing `Document`/`EditorViewController` change notification)
  rather than only-on-save. Flagging the debounce interval and trigger as a
  design choice this plan makes, open to adjustment.

## Working resolutions (session 59006f — user pre-authorized "run as much
## without questions"; these are recorded decisions, revisitable at review)

- **Deletion gate (plan-review CONTRADICTION resolution)**: files ADR-258 D3
  explicitly names for removal — `TSCDiagnostic.swift`, `EntitySourceIndex.
  swift`, `BrowserEntry.swift`, the TreeSitterTypeScript bindings, the
  `src/index.ts` scaffold template usage, plus each one's dedicated test file
  (Acceptance: "with their tests") — are deleted under the user's blanket
  go-ahead for this ADR. Files the ADR does NOT name (`PackageDetector.swift`,
  `StoryDetector.swift`, `ProjectManifest.swift`, `IntrospectionRunnerTests`
  etc.) are rewritten or left dormant, never deleted this session; their
  removal is deferred to an end-of-session question for David.
- **Q1**: production app resolves `sharpee` via the login-shell PATH
  (`ShellEnvironment`), with a clear "sharpee not found on PATH" failure state;
  tests drive `node dist/cli/sharpee.js` per CLAUDE.md. Proceeding on this.
- **Q2**: the IDE's New Story scaffold writes `<id>.story` only — NO
  `package.json` (D2's letter). Divergence from `sharpee init` recorded.
- **Q3**: Problems/Tree refresh is debounced-on-edit (~400ms after last edit),
  not save-gated.

## Phases

### Phase 1: D5 — `compose --json` Swift decoder + Problems panel
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Platform packages touched**: none. Consumes the already-shipped
  `@sharpee/ide-protocol` wire contract read-only (no `packages/` edits).
- **Focus**: retire `TSCDiagnostic.swift`'s regex `tsc`-output scraping and
  replace it with a structured `sharpee compose --json` pipeline feeding a
  new Problems panel — the first of the four D3 swap rows, and the one with
  no dependency on the other three.
- **Entry state**: platform plan Phases 1-3 DONE on `main` — `compose --json`
  and `--json --check` work end-to-end (verified by the platform plan's own
  tests); `ComposeJsonPayload`/`ComposeDiagnosticRecord`/
  `COMPOSE_JSON_SCHEMA_VERSION` are exported from `@sharpee/ide-protocol`.
  `IntrospectionRunner.swift`'s Process/buffered-stdout/decode pattern and
  `ProjectManifest.swift`'s schemaVersion-gated `decode(from:)` pattern exist
  as the precedents to follow, not reinvent.
- **Deliverable**:
  - A Swift Codable mirror of the wire contract (e.g.
    `ComposeJsonPayload.swift` in `Project/` or a new `Compose/` group):
    `ComposeJsonPayload { schemaVersion, diagnostics, ir }`,
    `ComposeDiagnosticRecord { severity, code, message, file, line, span? }`,
    with a `decode(from:)` that throws a typed error on `schemaVersion`
    mismatch (mirroring `ProjectManifest.DecodeError`) — loud, not partial.
  - A `ComposeRunner` (or similarly named) process class spawning the
    resolved `sharpee` executable (Q1) with `compose <file>.story --json`,
    buffering stdout to completion (mirrors `IntrospectionRunner`, not
    `BuildRunner`'s streaming — the payload is one JSON document), decoding
    into `ComposeJsonPayload`.
  - A debounced trigger (Q3) wired to the active `.story` document's edit
    stream, re-running `ComposeRunner` after a quiet period.
  - A new Problems panel view (list of `ComposeDiagnosticRecord`s grouped/
    filterable by `code`, severity icon, click-to-jump using the existing
    `SourceLocation` click-to-open path `TSCDiagnostic.swift` already
    established for Build). Warnings render alongside errors (D5).
  - `TSCDiagnostic.swift` + `TSCDiagnosticParser` + `TSCDiagnosticParserTests.
    swift` deleted; `BuildPanelView.swift`'s per-line tsc-scrape hookup
    removed (Build panel goes back to plain streamed text — Problems is now
    the structured surface).
  - Hatch-record rendering: a `ComposeDiagnosticRecord` with no `span` (a
    `hatch.*` code) renders as a file+line-only Problems row, no range
    underline.
- **Exit state**: opening a `.story` with an `analysis.*` error shows it in
  Problems with severity/code/message and the full span underlined
  (column→endColumn); a hatch-lint finding shows file+line only; editing to
  introduce/fix an error updates Problems live (per the debounce); the app
  builds and the full Swift suite passes with `TSCDiagnostic` gone.
- **Test scenarios**:
  - Real-path (rule 13a): drive the actual resolved `sharpee` bin's
    `compose --json` against a real fixture story with one analyzer error —
    assert the decoded `ComposeJsonPayload` carries the exact span, no stub.
  - Schema-version rejection: feed the decoder a payload with
    `schemaVersion: 999` — assert the typed error, not a partial decode.
  - Hatch-record shape: a fixture with a hatch-lint violation decodes to a
    record with `span == nil`; Problems renders it without a range.
  - Unresolvable-hatch-module story: `compose --json` still returns
    successfully (gates + IR) — Problems shows real diagnostics, not a crash
    or an empty panel (proves the editor path never touches the load-proof).
  - Debounce: rapid simulated edits followed by a pause trigger exactly one
    `ComposeRunner` invocation, not one per keystroke.
  - Full `SharpeeIDETests` suite green at this commit (no `TSCDiagnostic*`
    remaining).
- **Status**: CURRENT

### Phase 2: D6 — IR-sourced project tree (retires `EntitySourceIndex`)
- **Tier**: Large
- **Budget**: ~400 tool calls
- **Platform packages touched**: none.
- **Focus**: replace the world-introspection-shaped tree (`ProjectManifest`/
  `IntrospectionRunner`/`EntitySourceIndex`) with a tree sourced directly from
  the Story IR that Phase 1's `ComposeRunner` already fetches — "one command
  serves both" (D6).
- **Entry state**: Phase 1 landed — `ComposeRunner`/`ComposeJsonPayload`
  exist and are exercised by Problems. `ir` is populated on the payload
  whenever the compile succeeds (atomic-load invariant: never present for a
  failed compile).
- **Deliverable**:
  - A tree model built from `ComposeJsonPayload.ir` (rooms/objects/NPCs/
    regions per the IR's entity shape) replacing `ProjectManifest`-driven
    tree population. `IntrospectionRunner.swift` is rewritten against
    `ComposeRunner`'s `--json` call (no separate `--introspect` invocation,
    per D6's "one command" note) or deleted outright if `ComposeRunner`
    fully subsumes it — implementation decides based on how much of
    `IntrospectionRunner`'s buffering logic is actually still distinct.
  - **Last-`ok`-IR retention with a stale marker**: the tree view keeps
    rendering the most recently successful IR when a new compose run fails,
    visually marked stale (e.g. dimmed / a "stale" badge), while Problems
    (Phase 1) always reflects the current (possibly failing) compose run.
    A `.story` that has never compiled cleanly shows an empty tree with a
    stated reason, not a blank pane with no explanation.
  - **Exact-span click-to-open, no name-matching fallback**: tree node
    activation jumps to the IR element's exact `Span` — `SourceRef`'s
    `.exact`/`.scope` distinction and `EntitySourceIndex.swift` are deleted
    outright, not preserved as a fallback path.
  - `ProjectTreeViewController.swift` gains (or is joined by a sibling
    controller for) an entity-tree render mode distinct from the existing
    raw-filesystem `NSOutlineView` — implementation decides whether the
    existing filesystem tree stays as a secondary view or the entity tree
    replaces it as the Project pane's primary content per the ADR's
    "Sharpee-aware tree of rooms/objects/NPCs/regions" acceptance wording.
  - `EntitySourceIndex.swift` + `EntitySourceIndexTests.swift` deleted.
    `ProjectManifest.swift` / `IntrospectionRunnerTests.swift` /
    `ProjectManifestTests.swift`: retired if fully subsumed, or left in place
    if some other consumer still needs the world-introspection shape (check
    before deleting — the ADR's Consequences section notes
    `ProjectManifest`/`bootstrap`'s `buildManifest` remain valid for the
    TS/world-model path even though the IDE stops using them).
- **Exit state**: opening `stories/fernhill/fernhill.story` from a clean
  checkout (no `dist/`) populates the tree before any build runs; introducing
  a syntax error mid-edit leaves the tree populated-and-stale while Problems
  shows the new error; fixing the error un-stales the tree; clicking a node
  opens the exact authored span; `EntitySourceIndex` and tree-sitter-based
  name-matching are gone from the navigation path (constraint 7). Full suite
  green.
- **Test scenarios**:
  - Real-path (rule 13a): real `sharpee compose --json` against real
    fernhill — assert the tree model's node count/shape matches the IR,
    clicking a node's recorded span matches the actual source line.
  - Stale-retention: a passing compose followed by a failing one — assert
    the tree still shows the passing IR's shape, marked stale; Problems shows
    the new error.
  - Never-compiled: a `.story` with a syntax error from first open — assert
    empty tree + stated reason, not a crash or a silently-empty pane.
  - No-name-matching: grep the diff for any reintroduced `.scope`/name-index
    resolution — must be absent.
  - Full `SharpeeIDETests` suite green at this commit.
- **Status**: PENDING

### Phase 3: D7 — `ChordLexer.swift` port + conformance pin (retires tree-sitter)
- **Tier**: Medium
- **Budget**: ~300 tool calls
- **Platform packages touched**: none. Reads the already-committed
  `packages/chord/tests/fixtures/lexer-golden/lexer-golden.json` (+ corpus
  `.story` files) as a fixed input; does not modify it.
- **Focus**: port `packages/chord/src/lexer.ts` (203 lines) to Swift, pin it
  against the committed golden with a conformance XCTest, wire it into
  `SyntaxHighlighter`, and — only now that Phase 2 has already retired
  `EntitySourceIndex`'s tree-sitter usage — remove `TreeSitterTypeScript` and
  `SwiftTreeSitter` from `project.yml` entirely (constraint 2).
- **Entry state**: Phase 2 landed — `EntitySourceIndex.swift` is gone, so
  `SyntaxHighlighter.swift` is the last remaining `TreeSitterTypeScript`
  consumer in the tree.
- **Deliverable**:
  - `ChordLexer.swift`: a line-for-line port of `lex()`'s behavior —
    `Line`/`Token`/`TokenKind` Swift types matching the TS shapes exactly
    (including `afterBlank`, `comment`, tab-in-indent handling, the
    `##`-comment-blank-line-delimiter rule, and the `compare`/`lbrace`/
    `rbrace` token kinds ADR-264/216 added).
  - A JSON-decodable Swift mirror of the golden file's shape (per-corpus-file
    array of `Line`), and a conformance XCTest that reads
    `lexer-golden.json` from the test bundle's resources, runs `ChordLexer`
    over each corpus `.story` file's contents, and deep-equals against the
    golden — no Node subprocess, no live cross-language call (constraint 6).
    The corpus `.story` files + golden JSON need to be added as test-bundle
    resources in `project.yml` (a `SharpeeIDETests` resource, not a build
    input).
  - `SyntaxHighlighter.swift` rewritten to tokenize via `ChordLexer` instead
    of the `TreeSitterTypeScript` query pipeline — highlighting keys off
    `TokenKind`, not tree-sitter capture names (no parse tree is available or
    needed for token-level highlighting, per D7's "no tree-sitter grammar
    is authored" ruling).
  - `project.yml`: `SwiftTreeSitter` and `TreeSitterTypeScript` package
    dependencies removed entirely; `SyntaxHighlighterTests.swift` rewritten
    against `ChordLexer` fixtures (Chord source, not TypeScript).
- **Exit state**: `project.yml` declares no tree-sitter dependency at all
  (Acceptance); the conformance XCTest is green against the current golden;
  a deliberate, reversible mutation to `ChordLexer.swift` (mirroring one of
  the TS-side lexer changes the golden pins, e.g. altering `compare`-token
  handling) turns the XCTest red, demonstrating the pin fires, then is
  reverted (Acceptance: "demonstrated by a deliberate mismatch during
  review"). Chord source in the editor highlights correctly. Full suite
  green.
- **Test scenarios**:
  - Conformance: `ChordLexer` over all 3 corpus files matches
    `lexer-golden.json` exactly (byte/structure equality, not a loose diff).
  - Deliberate-mismatch demonstration: temporarily mutate `ChordLexer.swift`,
    assert the XCTest fails, revert, assert green again.
  - Highlighting smoke test: `SyntaxHighlighter.highlight(_:)` over a Chord
    corpus fragment produces the expected token-kind→color mapping (word,
    string, number, compare, etc.) with no `TreeSitterTypeScript` reference
    anywhere in the diff.
  - `grep -r TreeSitterTypeScript tools/ide/` returns nothing outside
    `project.yml`'s own removed lines (i.e. nothing) — confirms the swap is
    total, not partial.
  - Full `SharpeeIDETests` suite green at this commit.
- **Status**: PENDING

### Phase 4: D2/D3/D4 — `.story` build/play paths (retires `BrowserEntry`, npm housekeeping)
- **Tier**: Large
- **Budget**: ~450 tool calls (the largest single swap row — touches Build,
  Play, and Workspace subsystems together)
- **Platform packages touched**: none. Depends on Q1's resolution (which
  `sharpee` executable the shipped app invokes) — flagged, not blocking:
  implementation proceeds on the PATH-resolution assumption and surfaces a
  clear failure state if wrong, per "Questions for the user."
- **Focus**: the last and largest D3 swap row — `BuildRunner`, `BuildSettings`,
  `BuildController`, `WebBundle`, `BrowserEntry`, `StoryDetector`,
  `PackageDetector`, and `StoryScaffold` all currently assume an npm-project
  author path (ADR-185) that Chord stories don't have.
- **Entry state**: Phases 1-3 landed (Problems, Tree, and highlighting are
  Chord-native; `ComposeRunner` exists and can fetch a story's IR header,
  including `ir.meta.raw.id`, needed for the `dist/web/<id>/` path below).
- **Deliverable**:
  - `BuildRunner.swift`: `start(projectDir:)` replaced with a `.story`-file-
    targeted build — spawns the resolved `sharpee` executable (Q1) with
    `build <file>.story` (no `--browser` flag — browser is the default
    client per ADR-252 D1/D6), no working-directory-relative
    `node_modules/.bin/sharpee` lookup. `startInstall`/`startInitBrowser`
    deleted outright — there is no npm housekeeping step for a Chord story.
  - `BuildSettings.swift`/`BuildSettingsStore.swift`: the `clients`/
    `skipFrom` fields (`--browser`/`--zifmia`/`--skip <pkg>`, a
    repokit-flavored monorepo shape) are removed; the settings surface
    shrinks to whatever a single-`.story` build genuinely varies (likely
    just the target file path, already implied by "the open project" — audit
    whether `BuildSettings` is needed as a persisted type at all post-shrink).
  - `BuildController.swift`: the install→init-browser chaining for "New
    Story" deleted; New Story's flow becomes scaffold → (optionally) build,
    with no intermediate npm step.
  - `WebBundle.swift`: `directory(projectRoot:)`/`indexURL(projectRoot:)`
    resolve `dist/web/<id>/` where `<id>` comes from the IR header (fetched
    via `ComposeRunner`, Phase 1/2's runner — reused, not re-spawned)
    rather than a bare `dist/web/`. A story with `browser/index.html`
    (ADR-253 D3) is served as-is — the IDE never injects into the author's
    page (already true today; unaffected by the path change).
  - **Grammar-header handling (D2 amendment)**: opening a `.story` whose
    header is `grammar "..."` rather than `story "..."` disables Build and
    Play (greyed-out / explicit "not a story" state) while highlighting
    (Phase 3) and Problems (Phase 1) apply unchanged. This is new UI-state
    logic in whatever view model gates the Build/Play affordances.
  - `BrowserEntry.swift` + `BrowserEntryTests.swift` deleted outright — no
    `src/browser-entry.ts` template, no `init-browser` concept survives.
  - `StoryDetector.swift`: rewritten to discover `.story` files (scanning
    `stories/`/`tutorials/` for files carrying a `story` or `grammar` header,
    not directories containing `package.json`) — or deleted if the "detect
    stories under a monorepo root" use case doesn't survive the shift to
    "the open target IS a `.story` file" (D2). Check actual call sites before
    choosing rewrite vs. delete.
  - `PackageDetector.swift` + `PackageDetectorTests.swift`: deleted — the
    `--skip <pkg>` platform-build concept has no equivalent for an author
    building a single `.story` (that flag belongs to `./repokit build`, a
    platform-dev tool this ADR explicitly keeps out of author scope).
  - `StoryScaffold.swift`: repointed from `templates/story/*.template`
    (TS: `index.ts.template`, `package.json.template`, `tsconfig.json.
    template`) to `templates/story-chord/story.story.template` (writes
    `<id>.story`) — and, per Q2, **does not** also write
    `package.json.template` unless the user confirms otherwise. `project.yml`'s
    bundled-resource path (`../../packages/devkit/templates/story`) updated to
    `templates/story-chord`.
  - `StoryScaffoldTests.swift` rewritten against the Chord template's
    substitution tokens (`{{STORY_ID}}`, `{{STORY_TITLE}}`, `{{AUTHOR}}`,
    `{{DESCRIPTION}}` — no `{{DEVKIT_VERSION}}`, the Chord package.json
    template doesn't use it, if a package.json is scaffolded at all per Q2).
- **Exit state**: opening a bare `.story` folder with no `package.json`/
  `node_modules` never prompts for or runs `npm`/`init-browser` (Acceptance);
  Build/Play resolve `dist/web/<id>/` verified end-to-end against fernhill
  (Acceptance); a grammar-header file highlights and shows its tree but
  Build/Play are disabled; `BrowserEntry`, the tree-sitter-era npm
  housekeeping, and `src/browser-entry.ts` references are gone from source
  and tests (Acceptance). Full suite green.
- **Test scenarios**:
  - Real-path (rule 13a): the real resolved `sharpee` bin's `build
    fernhill.story` (or the bundle's `node dist/cli/sharpee.js build` in
    tests, per CLAUDE.md) against real fernhill — assert `dist/web/<id>/
    index.html` exists at the ID-qualified path and Play's WebBundle resolves
    it.
  - No-npm-path: open a bare `.story` folder fixture with no `package.json` —
    assert no `npm`/`node_modules` file-system touch anywhere in the open/
    build/play flow (spy or absence-of-side-effect assertion).
  - Grammar-header story: Build and Play controls assert disabled; tree
    shows `define action` blocks (from Phase 2's IR tree); Problems and
    highlighting work unchanged.
  - New Story scaffold: creates `<id>.story` (and, per Q2's resolution,
    optionally `package.json`) from the Chord template with substitutions
    correctly applied; no `src/index.ts`/`tsconfig.json` written.
  - `grep -r "browser-entry\|init-browser\|node_modules/.bin/sharpee"
    tools/ide/SharpeeIDE tools/ide/SharpeeIDETests` returns nothing —
    confirms the swap is total.
  - Full `SharpeeIDETests` suite green at this commit.
- **Status**: PENDING

### Phase 5: D8/D9 — persisted-state migration, language-version check, polish
- **Tier**: Medium
- **Budget**: ~200 tool calls
- **Platform packages touched**: none.
- **Focus**: close out the ADR's remaining acceptance items that don't belong
  to any single swap row — stale persisted state, the Chord version check,
  and the README's stale claim — then run the full acceptance sweep.
- **Entry state**: Phases 1-4 landed — `.story`-based detection (Phase 4)
  exists for D8's "not a `.story` (or a folder containing one)" test; the
  resolved `sharpee` executable (Q1) is already wired for D9's `--version`
  call.
- **Deliverable**:
  - `RecentProjectsStore.swift`: `load(from:)` filters out any entry that is
    not a `.story` file and does not contain a folder with one, dropping it
    from the returned list (not offered-then-failing at open time). No
    migration file, no version bump — this is a load-time filter, matching
    D8's "the persisted data is a cache of user convenience."
  - `SessionState.swift`/`SessionStateStore`: a restored session whose
    `projectURL` fails the same `.story`-presence check opens the empty
    state with a one-line explanation (new UI text), rather than attempting
    to open a stale TypeScript project and failing silently or crashing.
  - A small `ChordVersionCheck` (or similar) that calls the resolved
    `sharpee --version`, parses `Sharpee X · Chord Y`, and compares `Y`
    against the IDE's known `CHORD_LANGUAGE_VERSION` (a Swift constant this
    phase adds, tracking the platform's current value — 2.1.0 as of this
    plan's writing; kept in one place for future bumps). A newer-than-known
    Chord version surfaces a clear, non-blocking warning (D9) rather than a
    silent mis-highlight.
  - `tools/ide/README.md`: the "Phase 0 — empty 3-pane shell" status line
    replaced with an accurate current-state description (Chord authoring
    environment, ADR-258 implemented) — Acceptance requires this stale claim
    gone.
  - A final full-suite run plus a manual (or scripted) walk of the ADR's
    worked example against `stories/fernhill/fernhill.story`: highlight →
    tree-before-build → Problems on an injected error → build → play,
    confirming every Acceptance bullet in one pass.
- **Exit state**: every ADR-258 "Done when" Acceptance bullet is checked off
  against the actual Swift app (not inferred); a recents entry pointing at a
  stale TS project is silently dropped, never offered; `sharpee --version`
  drift is surfaced, not silent; README is current. Full suite green at this
  final commit.
- **Test scenarios**:
  - `RecentProjectsStoreTests`: a persisted list containing a non-`.story`
    entry — assert it's absent from `load(from:)`'s result.
  - `SessionStateTests`: a restored session pointing at a stale project —
    assert the empty-state-with-explanation path, not a crash or a silent
    open-nothing.
  - Version-check: mock/real `--version` output newer than the known
    constant — assert the warning fires; matching version — assert no
    warning.
  - Full acceptance walk against real fernhill (rule 13a) covering every
    Acceptance bullet from the ADR in one session, recorded as this phase's
    completion evidence.
  - Full `SharpeeIDETests` suite green; `xcodebuild build` clean.
- **Status**: PENDING

## Build/test commands (all phases)
```bash
cd /Users/david/repos/sharpee_v2/tools/ide

# Regenerate the .xcodeproj after any project.yml edit (Phase 3, 4)
/opt/homebrew/bin/xcodegen generate

# Build
xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -configuration Debug build

# Test (the one scheme wires both build and test targets)
xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE \
  -destination 'platform=macOS' test
```
Real-path fixture builds/composes invoked by tests should shell out to the
in-repo bundle per CLAUDE.md (`node /Users/david/repos/sharpee_v2/dist/cli/
sharpee.js compose <file>.story --json`, `... build <file>.story`) against
real fixture stories (`stories/fernhill/fernhill.story` is the primary one
already named throughout the ADR) — never a stubbed toolchain, per rule 13a.
This is distinct from the production app's own invocation (Q1).

## Session state seed
Phase 1 is CURRENT with the budget above. See
`docs/context/.session-state.json`.
