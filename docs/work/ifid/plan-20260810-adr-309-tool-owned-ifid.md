# Session Plan: ADR-309 Tool-Owned IFID

**Created**: 2026-08-10
**Plan Status**: DONE (2026-08-10, session ed3730 — all three phases,
including the held Swift dead-code removal, which David closed the same
evening and which landed in PR #258 alongside the SonarCloud sort fix).
**Overall scope**: Implement ADR-309 end to end — the `{story-name}.config.json`
sidecar becomes the canonical home of a story's IFID; `sharpee init` and Chord
Writer's Create Story mint it and write the config before the author types a
word; both hosts reconcile the `.story` header's `ifid:` line to the config
(devkit on build/compose, Chord Writer on save); a broken config is a named
error, never a silent re-mint; the `analysis.missing-ifid` diagnostic and its
Problems quick-fix retire only once both hosts guarantee the field, in the
same edit set that stamps amendment pointers onto ADR-298 D5 and ADR-284.
Lands pre-DMG (ADR-309 Consequences).
**Bounded contexts touched**: N/A — this codebase does not use DDD framing.
Phases are named by host/surface: devkit CLI, Chord Writer (IDE), docs +
diagnostic retirement.
**Key domain language**: IFID (Treaty of Babel identifier, ADR-074), config
sidecar (`{story-name}.config.json`, ADR-309 D1), reconciliation (rewriting
the header's `ifid:` line to match the config — never the reverse), adoption
(a legacy header-only story's first host contact writes a config from its
existing value, no re-mint), broken config (malformed JSON or missing/invalid
`ifid` — a named error, distinct from absent), backstop (ADR-284's
publish-time refusal, now unreachable-by-construction for tool-built stories).

## References consulted
- `docs/architecture/adrs/adr-309-tool-owned-ifid.md` — the ACCEPTED ADR this plan implements (19/19 review). D1–D6, the E2E scenario, and AC-1..AC-5 are the acceptance bar. Binding constraints: `compile()` stays pure (hosts own minting/writing, never the compiler); reconciliation timing differs by host (Chord Writer on save, CLI on build/compose read-write moments) but is "the same rule from the file's point of view"; the diagnostic-deletion + ADR-298/ADR-284 amendment-pointer stamps must land in ONE edit set, and never before hosts guarantee the field ("Flip owner" clause, the ADR-307 flip pattern).
- `docs/architecture/adrs/adr-298-story-block-metadata.md` — D5 is the diagnostic and CLI-mint-only provenance this ADR amends (`analysis.missing-ifid`, `sharpee init` minting). This plan's final phase stamps an amendment pointer here (D5 superseded by ADR-309 D2/D3) — it does not rewrite D5's text.
- `docs/architecture/adrs/adr-284-chord-writer-publishing.md` — the publish-time hard-error backstop (`publish.missing-ifid` in `checkPublishable`) stays untouched in behavior (ADR-309 D6: it becomes unreachable-by-construction for tool-built stories, reachable only for a bare story that never passed through any host). Amendment A1's "deliberately not built" note (no second IFID check in Chord Writer's Publish tab) is a constraint this plan must not violate — Publish stays thin.
- `docs/context/project-profile.md` — TS strict mode / pnpm+vitest conventions for the devkit and chord work (Phase 1, Phase 3); the Swift/xcodebuild conventions live in the project's own memory notes, not this file.
- `docs/context/session-20260810-1535-feat-testing-tab-embed.md` — most recent session; records ADR-309's acceptance today and the go-live sequencing this plan is queued into ("remaining = ADR-309 implementation → package version bump → Phase 8 DMG"). No open blockers relevant to this plan besides the standing DerivedData-clean note for IDE signing-rot recurrence.

## Phases

### Phase 1: devkit CLI — config sidecar, minting, and reconciliation
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `packages/devkit` (author CLI) — the config sidecar's
  read/write/validate/reconcile logic and its three call sites: `sharpee
  init` (D2 mint), `sharpee build`/`sharpee compose` (D3 reconcile), `sharpee
  publish` (D6 — verify it rides the same reconciliation, not a fourth
  parallel path).
- **Entry state**: ADR-309 ACCEPTED; `analysis.missing-ifid` still fires
  (untouched this phase — the flip is Phase 3). `packages/devkit/src/standalone/init.ts`
  already mints an IFID into the header at scaffold time (ADR-298 D5) but
  writes no config; `publish.ts#checkPublishable` and
  `packages/devkit/src/commands/compose.ts#runComposeGates` each call
  `compile()` directly and independently — **note found in survey**: these
  are two separate `readFileSync` + `compile()` call sites, not one shared
  path, so a reconciliation helper wired into only one of them leaves the
  other reading a stale or unreconciled header. Both — plus `build.ts`'s
  `runChordBuild` — must call the same reconciliation function.
- **Deliverable**:
  - A new module (e.g. `packages/devkit/src/standalone/story-config.ts`)
    owning: the JSON schema (`version` + `ifid`, D1, "designed-open" —
    minimal today, no speculative fields), `readConfig`/`writeConfig`,
    `reconcileHeader(storyFile, projectDir)` — the single function D3
    describes, covering all three states: ABSENT (adopt existing header
    value, or mint if the header has none — D2), PRESENT-AND-CONSISTENT
    (no-op), PRESENT-AND-DIVERGED (overwrite the header line from the
    config, byte-identical value), and BROKEN (named error, no mint, no
    reconcile — D5, distinct code from "absent").
  - `init.ts` calls the mint-and-write path so a fresh scaffold has the
    config before the header is even rendered (D2 mainline — CLI-only
    authors are mainline, not an edge).
  - `build.ts#runChordBuild` and `compose.ts#runComposeGates` both call
    `reconcileHeader` before their `compile()` call, and re-read the file
    if the reconciliation rewrote it (compile on the reconciled bytes).
  - `publish.ts#checkPublishable` calls the same `reconcileHeader` before
    its own `compile()` call (D6 — "publish rides build's reconciliation"
    read literally: same function, not "publish trusts build ran first").
  - A named error (e.g. `PublishError`-shaped or a new `StoryConfigError`)
    surfaced as a non-zero CLI exit with a clear message on BROKEN — for
    `compose --json`, fold it into the existing unified diagnostics stream
    (`ComposeDiagnosticRecord[]`, ADR-276 D4 pattern already used for hatch
    findings) rather than inventing a second channel, so the IDE's Problems
    panel gets it for free once Phase 2 wires the row through.
  - Decide and record the fate of `sharpee ifid` (`standalone/ifid.ts`,
    `generate`/`validate` subcommands): the ADR's context lists it among
    retiring author-facing remedies, but `generateIfid`/`validateIfid` in
    `@sharpee/core` remain load-bearing utilities the new module itself
    calls. Recommend keeping the raw CLI utility (it has no story-file
    coupling, unlike the retiring Problems quick-fix) but state the
    recommendation explicitly rather than deleting the command
    unilaterally — flag for David's confirmation if removal is proposed.
  - Real-path tests (rule 13a): `runInitCommand` produces
    `<id>.config.json` beside `<id>.story` with matching `ifid` (AC-1);
    `reconcileHeader` against a real tmpdir story file for each of the four
    states (AC-2, AC-3, AC-4); `checkPublishable`/`runComposeGates`
    exercised through their real function calls against files on disk, no
    stubbing of `fs` or `compile()`.
- **Exit state**: `sharpee init`, `sharpee build`, `sharpee compose`,
  `sharpee publish` all reconcile through one shared function; AC-1
  (born with identity), AC-2 (reconciliation, both directions), AC-3
  (adoption, value-equality asserted), AC-4 (broken config stops the line)
  hold for the devkit CLI. `analysis.missing-ifid` still exists (Phase 3
  removes it) — chord's own test suite is untouched this phase.
- **Status**: DONE (2026-08-10, session ed3730). Delivered:
  `story-config.ts` (schema v1 `{version, ifid}`, format-free ifid — legacy
  non-UUID IFIDs adopt verbatim; BROKEN covers bad JSON/non-object/unknown
  version/unusable ifid, distinct from ABSENT); `reconcileHeader` with
  `mint` option (publish passes `mint: false` — publication never invents
  identity, preserving ADR-284's backstop for a clone whose committed
  config went missing); init writes the config BEFORE templates (chord
  branch; TS story form has no `.story` — out of ADR scope); both build
  entries reconcile with named exit-1 refusal; compose is READ-ONLY (the
  IDE feeds it buffer snapshots — a writing compose would mint garbage
  configs beside them; ADR D3's "compose" reconcile moment implemented as
  check-and-report + gate failure, flagged to David); publish's
  missing-ifid message rewritten off the retired remedies (D4). Evidence
  (2026-08-10 ~17:00): devkit **166 passing, 1 skipped** (+18: 11
  story-config, AC-1 scaffold, publish adopt/broken/no-identity, compose
  broken read-only, 3 build entry-point tests closing
  mutation-verification's warning); tsc clean; dist rebuilt;
  `tsf build --npm` green. `sharpee ifid`: RECOMMEND KEEP as raw
  generate/validate utility (no story-file coupling; the new module uses
  the same core primitives) — David's call, flagged in the phase report.
- **Deletions**: none performed.

### Phase 2: Chord Writer (IDE) — Create Story, reconcile-on-save, broken-config surfacing
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `tools/ide/SharpeeIDE` — `Workspace/StoryScaffold.swift`
  (Create Story), `Workspace/StoryHeaderIFID.swift` (header-line mechanics),
  the document save path (`Editor/Document.swift` /
  `Editor/EditorViewController.swift`'s `saveActiveDocument`/
  `saveAllDocuments`), `Compose/ProblemsView.swift` +
  `MainWindow.swift#applyProblemFix` (the retiring quick-fix).
- **Entry state**: Phase 1's JSON schema is final (this phase must write and
  read the byte-identical shape devkit produces — no independent schema
  decision). `StoryScaffold.create` mints an IFID into the header template
  but writes no config. `StoryHeaderIFID.insertion(of:into:)` currently
  **returns nil when an `ifid:` line already exists** — survey finding:
  this method was built for the one-shot Generate-IFID quick-fix, not
  reconciliation, and needs to grow an "overwrite the existing line's
  value" branch or a sibling function to satisfy D3's "edited line
  overwritten back" case. This is a repurpose-and-extend, not a
  retirement — do not delete `StoryHeaderIFID.swift`.
- **Deliverable**:
  - `StoryScaffold.create` mints the IFID, writes it into both the
    rendered header and a sibling `<id>.config.json` (D2), matching Phase
    1's schema exactly (cross-host interop: a CLI-created story opened in
    Chord Writer, and vice versa, must read as consistent).
  - A reconciliation hook on the `.story` save path (scoped to `.story`
    files only — `Document.save()`/`EditorViewController` is generic
    across all editor tabs): on save, read or create the config (D2
    adoption for a legacy config-less story: adopt the header's exact
    existing value, or mint once if the header has none), then splice the
    header's `ifid:` line to match — insert if missing, overwrite if
    diverged, no-op if already consistent. The config file's bytes are
    untouched by this path (AC-2).
  - BROKEN config (malformed JSON, missing/invalid `ifid`) surfaces as a
    named Problems row (D5) — reuse the existing `ComposeDiagnosticRecord`
    shape family so `ProblemsView` needs no new row type, sourced either
    from devkit's compose `--json` payload (if Phase 1 folded it into that
    stream) or from a save-time check if compose hasn't run yet. Decide
    which, and record the decision — do not silently duplicate the check
    in two places.
  - Retire the Generate-IFID quick-fix's TRIGGER: `ProblemsView.swift`'s
    `fixes["analysis.missing-ifid"]` entry and `MainWindow.swift`'s
    `applyProblemFix`/`presentFixFailure` become unreachable once Phase 3
    deletes the diagnostic — flag them as dead code in this phase's
    findings, but the actual removal happens in Phase 3 alongside the
    diagnostic deletion (same reasoning as the "Flip owner" sequencing:
    don't remove the fix's trigger before the thing it fixes is gone).
  - Confirm Publish (`PublishView.swift`) stays thin — no second IFID
    check added (ADR-284 Amendment A1's "deliberately not built" note).
    D6 already holds once devkit's `checkPublishable` reconciles.
  - Real-path tests (rule 13a, `xcodebuild test -project
    SharpeeIDE.xcodeproj -scheme SharpeeIDE -derivedDataPath
    ./DerivedData`, DerivedData clean per the signing-rot note): extend
    `StoryScaffoldTests.swift` for config-file creation, extend
    `StoryHeaderIFIDTests.swift` for the overwrite case, extend
    `DocumentTests.swift` (or add a new suite) for the real save-path
    reconciliation — no stub of the file-system write.
- **Exit state**: Create Story and the reconcile-on-save path hold AC-1
  through AC-4 for Chord Writer, using the identical config schema Phase 1
  established. The quick-fix trigger is flagged dead but not yet deleted.
- **Status**: DONE (2026-08-10, session ed3730). Delivered:
  `Workspace/StoryConfig.swift` (`StoryConfig` + `StoryConfigStore` +
  `StoryIdentity.reconcile`); `StoryHeaderIFID` gained
  `read`/`hasStoryBlock`/`edit(setting:in:)`/`apply` — the overwrite branch
  the survey called for, in the same offset/length/text `Edit` shape
  `StoryHeaderPublishSource` already uses (`insertion` untouched, retires
  with the quick-fix in Phase 3); `StoryScaffold.create` writes the config
  BEFORE rendering the header from the same minted value (one mint, not
  two); `Document.save()` reconciles `.story` documents at the single write
  choke point (⌘S, save-all, close-prompt) and returns a `SaveOutcome`;
  `EditorViewController` reloads the visible buffer when a save rewrote it.
  **Two judgment calls, both recorded in code comments**: (1) a BROKEN
  config never blocks the save — losing an author's text over a sidecar
  problem is the worse failure — so the save proceeds untouched and the
  config is reported instead; (2) a new `onStoryReconciled` callback
  re-composes the REAL file after a reconciling or broken-config save,
  closing a hole the "compose owns the row" decision would otherwise leave
  (while editing, compose runs on a hidden snapshot with no config of its
  own, so a `story-config.broken` row raised on open would vanish at the
  first keystroke and never return). The CHECK still lives only in devkit's
  compose gates — this re-triggers it, never duplicates it.
  **Cross-host byte contract**: Foundation's pretty-printer writes
  `"key" : value` where `JSON.stringify` writes `"key": value`, so the two
  hosts would have produced different bytes for one story's identity file;
  the Swift writer now hand-assembles the JSON (value still encoder-escaped)
  and BOTH suites pin the same literal, so a format change on either side
  fails a test instead of showing up in an author's git status.
  Evidence (2026-08-10 ~17:15): IDE suite **491 passing, 0 failures, TEST
  SUCCEEDED** (+22 over the 469 baseline: 11 StoryIdentity, 5
  EditorStoryIdentity, 5 StoryHeaderIFID edit/read, 1 scaffold AC-1);
  devkit **167 passing, 1 skipped** (+1 byte-contract pin); `tsf build
  --npm` green; dist rebuilt. Real-path E2E against the BUILT dist on a
  real `sharpee init` project: minted at init → line deleted → reconcile
  restored the identical value (no re-mint) → hand-edit overwritten back →
  broken config refused by name with its bytes intact.
- **Findings for Phase 3** (flagged, not acted on): dead quick-fix code is
  `ProblemsView.fixes["analysis.missing-ifid"]` (line ~32),
  `MainWindow.applyProblemFix` (~753), `presentFixFailure` (~770) and the
  wiring at ~359; `PublishView.swift`'s header comment (lines 6–10) claims
  "the Problems panel offers Generate IFID at compile time" — false once
  Phase 3 lands, rewrite it alongside the ADR-284 A1 stamp. Publish itself
  is confirmed THIN (no IFID check in Swift), so ADR-284 A1's rule holds.
- **Deletions**: none planned. Dead-code flags on
  `ProblemsView.fixes["analysis.missing-ifid"]` and
  `MainWindow.applyProblemFix`/`presentFixFailure` are recommendations for
  Phase 3, not actions this phase takes.

### Phase 3: Docs, diagnostic retirement, and the ADR-298/ADR-284 flip
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: `website/src/app/` (D4 author docs), `packages/chord/src/analyzer.ts`
  (the diagnostic itself), the chord test suite's two dedicated describe
  blocks, and the ADR amendment-pointer stamps.
- **Entry state**: Phases 1 and 2 both guarantee the field (devkit CLI and
  Chord Writer both mint-at-creation and reconcile-on-write). This is the
  precondition the ADR's "Flip owner" clause exists to enforce — do not
  start this phase until Phases 1 and 2 are DONE.
- **Deliverable**:
  - D4 docs statement across the four pages the survey found reference
    IFID: `website/src/app/chord-writer/publishing/content.mdx`,
    `website/src/app/chord-writer/building-playing-and-testing/content.mdx`
    (the passage describing the Problems-panel Generate-IFID fix — rewrite,
    it no longer exists), `website/src/app/chord/guide/world/the-story-header/content.mdx`
    (the `ifid:` field row and its "The IFID" section — state plainly that
    it is tool-owned, never hand-edited, edits don't stick, no remedy
    instructions), `website/src/app/chord/getting-started/install/content.mdx`
    (the `ifid` CLI command listing — update per Phase 1's decision on
    that command's fate).
  - Delete `analysis.missing-ifid` from
    `packages/chord/src/analyzer.ts` (`checkHeaderFields`, ~line 841) —
    confirmed by survey as the sole emission site.
  - Delete or rewrite the two test blocks written specifically to assert
    this diagnostic's existence/span: `packages/chord/tests/analyzer.test.ts`
    lines 253–304 (`describe('analysis.missing-ifid span (ADR-298 D5)')`)
    and `packages/chord/tests/story-block-fields.test.ts` lines 285–297
    (`describe('missing IFID (AC-5, compile-time half)')`). The
    widespread `.filter((d) => d.code !== 'analysis.missing-ifid')` lines
    across ~25 other chord/story-loader/devkit test files become
    harmless no-ops once the code never appears — leave them (cosmetic
    cleanup only, not required for AC-5) unless doing so is cheap in the
    same edit set.
  - AC-5's grep check: `grep -rn "analysis.missing-ifid" packages/chord/src/`
    returns nothing.
  - Stamp amendment pointers, in the SAME edit set as the deletion above:
    ADR-298 D5 gets a pointer noting it is superseded by ADR-309 D2/D3 (the
    warning and CLI-only-mint provenance are retired); ADR-284 gets a
    pointer noting its publish-time refusal is now the D6 backstop,
    unreachable-by-construction for tool-built stories, AND covering
    Amendment A1's "the author meets the fix earlier — the Problems panel
    offers Generate IFID" sentence (plan-review finding: that fix retires
    with the diagnostic; the tool now guarantees the field, so there is no
    fix to meet). Do not rewrite
    either ADR's original decision text — amend, don't overwrite (per this
    codebase's own ADR-worthy-change convention, mirrors the ADR-307 flip
    pattern already used once this session).
  - Now execute Phase 2's flagged dead-code removals in Swift
    (`ProblemsView.fixes` entry, `MainWindow.applyProblemFix`/
    `presentFixFailure`) — confirm with David before deleting, per the
    project's never-delete-without-confirmation rule; these are source
    edits (removing dead branches), not whole-file deletions, but still
    flagged here explicitly.
  - Full regression sweep: `pnpm --filter '@sharpee/chord' test`, `pnpm
    --filter '@sharpee/devkit' test`, the IDE's `xcodebuild test` target,
    `tsf build --npm --package chord` and `--package devkit` (touched
    publishable packages), dist AND dist-esm rebuilds for both, and
    `./repokit build dungeo` as the platform-level smoke check (dungeo has
    a real minted IFID already, so this exercises the backstop path
    staying quiet for an already-compliant story).
  - Walk the ADR's End-to-End Scenario by hand (Create Story, delete the
    line and save, edit the value and save, open a pre-ADR header-only
    story, corrupt the config, compile a bare fixture) as the acceptance
    gate — this is the same shape as ADR-307's Phase 5 two-consumer
    parity sign-off.
- **Exit state**: AC-1 through AC-5 hold across both hosts; the diagnostic
  and its quick-fix trigger are gone; ADR-298 and ADR-284 carry amendment
  pointers; the go-live sequencing note ("ADR-309 implementation → package
  version bump → Phase 8 DMG") can advance to the version bump.
- **Status**: DONE except the Swift dead-code removal (2026-08-10, session
  ed3730 — that one item is held for David's confirmation per the standing
  never-delete rule; everything it gates is otherwise complete). Delivered:
  - **Docs (D4)**: `the-story-header` gained a rewritten "The IFID" section
    (tool-owned; deleting or editing the line does not stick; commit the
    config; a damaged config stops rather than re-mints, because a new IFID
    makes the story a different work to every archive that knows it), plus
    a field-table pointer; `chord-writer/publishing` reframed — the refusal
    is now only reachable via a lost config, with restore-from-VCS as the
    remedy; `building-playing-and-testing` dropped the Generate-IFID
    sentence. `install`'s `ifid` command listing left alone pending David's
    call on keeping that command. `next build` green.
  - **Diagnostic retired (AC-5)**: `analysis.missing-ifid` deleted from
    `analyzer.ts#checkHeaderFields`; `tests/analyzer.test.ts`'s span block
    removed (replaced by a note); `story-block-fields.test.ts`'s block
    rewritten to assert the opposite contract (an absent `ifid:` compiles
    with NO diagnostic, and a present one still reaches the IR).
    `version.ts`'s changelog line rewritten. **AC-5 grep note**: the exact
    grep over `packages/chord/src/` returns ONE hit by design — the
    changelog line recording the retirement, which is what a future reader
    grepping that code deserves to find. No emission remains (dist and
    dist-esm rebuilt, `grep -c` on the built analyzer = 0).
  - **Stamps (same edit set as the deletion, per the Flip owner clause)**:
    ADR-298 D5 carries a SUPERSEDED IN PART block naming both retired
    halves (provenance and the warning) and what still stands; ADR-284
    carries an AMENDED block covering A1's now-false Generate-IFID
    rationale while keeping its thin-Publish rule, and stating the backstop
    is unreachable-by-construction plus publish-never-mints.
    `PublishView.swift`'s header comment corrected to match.
  - **Regression sweep**: chord **740 passing**, devkit **167 passing, 1
    skipped**, story-loader **480 passing**, IDE **492 passing, 0 failures,
    TEST SUCCEEDED**; `tsf build --npm` green for chord and devkit; chord
    dist + dist-esm rebuilt; `./repokit build dungeo` clean (bundle
    3,669,785 bytes). One IDE run mid-sweep showed a single failure in
    `EditorExternalChangeTests.testWatcherSurvivesAtomicReplaceChains` —
    the documented watcher-timing flake under CPU contention (a platform
    build was running in parallel); classified by isolation (4/4 green,
    0.9s) and confirmed by a clean full run (492/0). Not in this change
    set — that suite tests file-watcher reload, untouched here.
- **Held item — CLOSED** (PR #258, `2f4d91ab`): the Swift dead-code removal
  landed with the whole quick-fix path (registry, button, `fixClicked`,
  `onFix`, `applyProblemFix`, `presentFixFailure`, wiring,
  `StoryHeaderIFID.insertion` + `Insertion`), two fixtures retargeted off
  the retired diagnostic, and IDE **480 passing, 0 failures**. Originally
  scoped as —
  `ProblemsView.fixes["analysis.missing-ifid"]` (~line 33),
  `MainWindow.applyProblemFix` (~753) + `presentFixFailure` (~770) + the
  wiring (~359), `SpanText.swift`'s example comment (~27), and
  `StoryHeaderIFID.insertion(of:into:)` with its tests. All are now
  unreachable (the diagnostic that triggered them is gone) but harmless;
  deleting source is a confirm-first action per CLAUDE.md.
- **Deletions**: `analysis.missing-ifid`'s emission code and its two
  dedicated test blocks are deletions this phase performs directly (they
  test/emit behavior the ADR explicitly retires — not a "confirm first"
  case, since AC-5 names the deletion as the acceptance bar). The Swift
  dead-code removals (`ProblemsView`/`MainWindow`) require confirmation
  before deleting, per the standing rule — ask before removing.
