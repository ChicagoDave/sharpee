# Session Summary: 2026-08-10 15:35 - feat/testing-tab-embed (session ed3730)

## Goals
ADR-307 plan Phase 6 (cutover) on David's go; plus a cursory Testing
Navigation ADR raised before starting.

## Completed
- Session start: recap + pre-session audit relayed (clean), gate cleared.
- **ADR-308 drafted** (`adr-308-testing-navigation.md`, DRAFT, cursory by
  request): navigation aids for fully-tested stories — derived-view-only
  direction (D1), candidate set (overview graph without card details,
  search, failure navigation, deliberately-open ???), card list stays
  primary (D3). Five open questions; interview offered, superseded by
  "phase 6". Does not gate the cutover.
- **Phase 6 cutover landed** — the transcript grammar is gone from the
  Chord/IDE world. David confirmed the full delete list plus four rulings:
  - **A**: `from-play.ts` + `sharpee transcript-from-play` deleted;
    ADR-305 flipped SUPERSEDED (play IS recording — nothing to promote).
  - **B**: orphaned satellites deleted (watch, coverage, search, aggregate,
    reporter, story-loader, game-factory, trait-formatter, cli.ts, and the
    v1 tree runner trio tree-runner/tree/tree-report).
  - **C**: `sharpee test` is document-only — discovery of
    `<story-id>.tests.json` is the ONLY lookup; `.transcript` args,
    `--chain`, `--coverage` refuse by name (exit 2); `--tree` accepted as
    the IDE spawn's spelling; module projects (no `.story`) now have no
    `sharpee test` (named error, noted to David).
  - **D**: Swift transcript chrome removed — `TranscriptHighlighter.swift`
    (+ tests + editor dispatch), `ProjectArtifacts` tests/ special case
    (legacy `tests/` now an ordinary Other folder); `sharpee init` no
    longer scaffolds `tests/transcripts`.
- **branch-tester survivors** (7 src files): tree-document, tree-walker,
  runner (the #253 file write-back removed — a run never writes; gained
  `aggregateTestRun`, kept here because transcript-tester's result types
  are narrower than this package's claim vocabulary), auto-assertion,
  channel-assert, types (coverage field removed), index (rewritten barrel).
  Tests pruned 33 → 6 files: grammar-feature suites deleted; four
  shared-behavior suites (auto-assertion, channel-assert, skip-executes,
  world-capture) rewritten over in-memory transcripts (the walker's shape).
- **devkit**: `test-tree.ts` deleted (`findTreeDocument` moved into
  `test-tree-document.ts`); `test.ts` rewritten (routing + named
  refusals); cli wiring/help cleaned; retired tests deleted
  (auto-assertion CLI write-back, test-json NDJSON-over-transcripts);
  `test-tree.test.ts` → `tree-document-discovery.test.ts`.
- **IDE**: surface `src/shims/fs.ts` deleted; TestRunnerTests rewritten to
  document fixtures (streams guard-shaped records; malformed document =
  exit 2 with ZERO events — refusal precedes the stream; edited document
  re-runs fresh); ProjectArtifacts/ProjectTreeGrouping tests updated;
  bundle rebuilt into Resources/.
- **Flips + amendments**: ADR-306 SUPERSEDED in part (range/tick §3,
  rulings 8/13/17 re ticking); ADR-302 SUPERSEDED in part (D1 at-rest for
  the Chord/IDE world); ADR-305 SUPERSEDED; ADR-307 header records the
  flips + Phase 5 rulings amended inline (D2 record-time synthesis/JSON
  source of truth, D3 recording-includes-claims + default policy, E2E
  count-free rows); functional-logic doc §1–§8 marked superseded → §9.
- **sharpee.net** (website/ in-repo): Testing section of
  building-playing-and-testing rewritten to the tree-document world
  (recording, `<story-id>.tests.json`, branches/regions/run detail, seams
  callout, CLI); install usage block, chord-writer overview/table,
  your-first-story, fernhill learn pages (3) updated; `next build` green.

## Evidence (all 2026-08-10 ~15:45–16:10)
- branch-tester **86 passing** (was 397 — grammar suites deleted with the
  grammar); devkit **148 passing, 1 skipped** (was 178); surface
  **66 passing** + `tsc -p` clean; transcript-tester **278 passing**
  (untouched world green — AC-5); ide-protocol **46 passing**.
- IDE suite **469 passing, 0 failures, TEST SUCCEEDED** via xcodebuild with
  `-derivedDataPath ./DerivedData` (was 475; TranscriptHighlighter suite
  deleted, rewrites 1:1). First run caught 4 real failures (1 missed
  fixture expectation, 3 transcript-mode TestRunner pins) — fixed, then
  green.
- AC-5 grep clean: no parseTranscript/serializeTranscript/renameTranscript/
  tests-discovery reachable in branch-tester, devkit, or the IDE
  (`standalone/build.ts` excluded — transcript-tester world, untouched per
  ADR-307's header). Root `tsc --noEmit` clean.
- dist + dist-esm clean-rebuilt (stale compiled modules of deleted sources
  removed); `tsf build --npm` green for branch-tester and devkit; website
  `next build` green.
- Mutation-verification: 2 warnings — scaffold-removal asserted only by
  omission (fixed: explicit `existsSync(tests/) === false`, suite green);
  test.test.ts positive path thin but covered by test-tree-document.test.ts
  (noted, no action).

## Key Decisions
- Rulings A–D above (David, pre-implementation).
- `aggregateTestRun` stays branch-tester's own (type drift: its claim
  vocabulary is wider than transcript-tester's; the wire stream itself
  remains transcript-tester's).
- Test-prune principle: a test dies with its grammar feature; shared
  behavior keeps coverage through the document world (four suites rewritten
  in-memory rather than deleted).

## Files Modified
See plan Phase 6 status block for the full list; deletions span
`packages/branch-tester/src` (16 files) + tests (27), `packages/devkit`
(test-tree.ts, from-play.ts + tests ×3), IDE surface shim, Swift highlighter
+ tests. Edits: branch-tester index/types/runner, devkit
test.ts/test-tree-document.ts/cli.ts/init.ts + tests, EditorViewController,
ProjectArtifacts + 3 Swift test files, 4 ADRs, functional-logic doc, plan,
7 website pages. New: `adr-308-testing-navigation.md`.

## Afternoon additions (post-cutover)
- **`.chord` imports question answered**: ADR-251 ACCEPTED + IMPLEMENTED
  (2026-07-21) — confirmed live in today's devkit suite.
- **Website version bump (site only, David's scope ruling)**: Sharpee
  section badge 4.1.2 → 5.0.0 (`nav.ts`), Chord Writer status-bar example
  → `Sharpee 5.0.0 / Chord 3.0.0`; Chord (3.0.0) and Chord Writer (1.0.0)
  already correct; `next build` green. Package versions untouched (4.6.0)
  — the real bump is queued pre-DMG.
- **Go-live reconciliation (read-only)**: remaining = ADR-309
  implementation → package version bump → Phase 8 DMG (+ plan bookkeeping:
  Phases 5/6/6a–6f statuses need supersession stamps from the ADR-306→307
  chain). Items 5 and 9 closed today.
- **ADR-309 Tool-Owned IFID: drafted, interviewed, reviewed, ACCEPTED**
  (all in-session). David's rulings: tool owns the IFID period (toolchain,
  not IDE — CLI-only authors are mainline); config sidecar
  `{story-name}.config.json` is canon, header line is the tool's rendering;
  reconcile on save; config designed-open (version + ifid now, committed,
  never gitignored); lands pre-DMG. Review 13/19 → five findings folded
  (D5 broken-config named error, D6 publish-rides-build, E2E scenario,
  ACs 1–5, flip owner) → 19/19 → ACCEPTED. Retires go-live item 5.
- **ADR-308 note**: drafted earlier this session (see above), still DRAFT
  with its five open questions — interview offer stands.
- **Session-planner dispatched** for ADR-309 implementation
  (docs/work/ifid/plan-20260810-adr-309-tool-owned-ifid.md); plan-review
  found 2 STALE-ADR wording findings (D6's "publish builds first" was
  structurally false — reworded; ADR-284 A1's Generate-IFID sentence added
  to Phase 3's stamp scope) — both fixed pre-implementation.
- **ADR-309 Phase 1 DONE** (devkit CLI): `story-config.ts` +
  reconcileHeader (mint-optional), init/build/build-browser/publish wired,
  compose read-only check (design call flagged: the IDE feeds compose
  buffer snapshots, so compose must never write — deviates from ADR D3's
  literal "compose" reconcile moment, delivers its intent). devkit **166
  passing, 1 skipped**; mutation-verification's build-entry gap closed with
  3 real-path tests; tsc clean, dist rebuilt, tsf --npm green.
  `sharpee ifid` keep-as-utility recommendation pending David.
- **ADR-309 Phase 2 DONE** (Chord Writer): `StoryConfig.swift`
  (store + `StoryIdentity.reconcile`), `StoryHeaderIFID.edit/read` (the
  overwrite branch), Create Story writes the config from the same mint,
  `Document.save()` reconciles at the single write choke point, editor
  reloads the buffer when a save rewrote it. Judgment calls: a broken
  config never blocks a save (report, don't refuse — never lose an
  author's text); new `onStoryReconciled` re-composes the real file after
  a reconciling/broken save, closing the snapshot hole that would have made
  the broken-config Problems row vanish permanently after the first
  keystroke. Cross-host byte contract fixed (Foundation's `"k" : v` vs
  `JSON.stringify`'s `"k": v`) — Swift now hand-assembles, both suites pin
  the same literal. Evidence: IDE **491 passing, 0 failures** (+22), devkit
  **167 passing, 1 skipped**, tsf --npm green, plus a real-path E2E against
  the built dist on a real `sharpee init` project (delete → restored
  identical; hand-edit → overwritten; broken → refused, bytes intact).

- **ADR-309 Phase 3 DONE except one held item**: docs rewritten (story
  header "The IFID" section, publishing preconditions, Problems sentence);
  `analysis.missing-ifid` DELETED from the analyzer with its two dedicated
  test blocks (one replaced by the opposite contract: an absent `ifid:`
  compiles with no diagnostic); ADR-298 D5 and ADR-284 (incl. A1's
  now-false Generate-IFID rationale) stamped in the same edit set;
  `PublishView`/`version.ts` comments corrected. Regression: chord **740**,
  devkit **167 +1 skipped**, story-loader **480**, IDE **492 passing, 0
  failures**; tsf --npm green (chord, devkit); chord dist+dist-esm rebuilt;
  `./repokit build dungeo` clean. Mid-sweep IDE run hit the known
  `EditorExternalChangeTests` watcher flake under parallel-build CPU load —
  isolated 4/4 green, clean full run 492/0.
  **HELD for David**: deleting the now-unreachable Swift quick-fix code
  (`ProblemsView.fixes` entry, `MainWindow.applyProblemFix` /
  `presentFixFailure` + wiring, `SpanText` comment,
  `StoryHeaderIFID.insertion` + tests) — confirm-first per CLAUDE.md.

## Ship (evening)
- **Sharpee 5.0.0**: `tsf version 5.0.0` across 33 packages, plus the trap
  the last bump hit — `ENGINE_VERSION` and dungeo's stamped constants
  re-stamped so the publish workflow's `git diff --exit-code` guard passes
  on its own build output. Chord language stays 3.0.0, Chord Writer 1.0.0;
  the website reads its badge live from `packages/sharpee/package.json`.
- **PR #257 merged** (`31ef79b2` → `fe5b4e94`): 168 files, +3,190/−12,369 —
  the ADR-307 cutover, ADR-309 implementation, and the version bump.
- **Publish dry run GREEN** (run 31440383661): every package built at
  5.0.0, stamping guard passed, artifacts built, Validate passed, Publish
  (dry run) passed, real Publish correctly skipped.
- **PR #258 merged** (`2f4d91ab` → `87a00365`) — the two items #257 left
  open, both closed on David's word:
  - **Quick-fix path retired** (Phase 3's held deletion): ProblemsView's
    `fixes` registry + button + `fixClicked` + `onFix`, MainWindow's
    `applyProblemFix`/`presentFixFailure`/wiring,
    `StoryHeaderIFID.insertion` + `Insertion`. Two fixtures that used the
    retired diagnostic as sample data retargeted to a generic
    block-spanning warning. IDE **480 passing, 0 failures** (−12).
  - **SonarCloud gate cleared**: all three "reliability bugs" were S2871
    (bare `.sort()`). Sonar's `localeCompare` advice would have been a REAL
    bug — one sort orders a persisted wire document's keys, the other picks
    which story a directory resolves to, and locale collation would make
    both machine-dependent. Fixed with explicit code-unit comparators.
    **SonarCloud PASS on #258** (it failed on #257).

## npm publish, and the deploy that reported success and changed nothing
- **Sharpee 5.0.0 is LIVE on npm** (run 31444888366): all 33 packages, no
  new packages and none removed (`--diff-filter=A`/`D` both empty —
  checked because `tsf publish --changed` would have shipped an unintended
  new package silently). David's fair hit afterwards: *"I suppose a dry run
  would have caught that."* Correct — I reasoned about half-published state
  (gates run before publish, so that risk was real but covered) and skipped
  the question a dry run actually answers, which is *what is in the set*.
  Three merges had landed since the dry run I did.
- **sharpee.net was serving a build from before ADR-298** (2026-08-02) — the
  deploy reported success and changed nothing. Root cause: the systemd unit's
  `WorkingDirectory` pointed at `/home/dave/repos/sharpee_v2/website`, a
  different clone, while `deploy.sh` derives its paths from its own location.
  It built in `~/repos/sharpee` and restarted a service reading elsewhere.
  Diagnosed from the outside: the live homepage's nav had NO `/chord-writer`
  links at all, which page caching cannot explain. Fixed the checked-in unit
  AND added a guard to `deploy.sh` that compares the service's
  `WorkingDirectory` to the tree it is about to build and refuses with the
  exact repoint command — the bug was the silence, not the path.

## Chord Writer icon (three renders)
- Wordmark versions failed the same way twice: text dissolves below 128px.
  The **chord diagram** won — pure geometry, nothing depending on legibility.
  Parchment at 128pt+, a geometrically-drawn eighth note at 16/32pt (Apple's
  own convention), note paper sampled from the diagram so they read as one app.
- Extraction notes worth keeping: Gemini paints a **fake transparency
  checkerboard** instead of writing alpha, so render #1 needed silhouette
  reconstruction; asking for **flat magenta** instead let renders #2–3 be
  keyed properly. Keying must be magenta-DOMINANCE, not "not green" — the
  black ink is green-dark too and a green key eats the notes.
- **The pipeline was the real bug.** My first two icon commits bypassed
  `tools/ide/art/make-app-icon.sh` entirely (ad-hoc PNGs copied in), leaving
  it pointed at `chord-book.png` — anyone running the documented tool would
  have silently restored the retired book icon. Same failure shape as the
  website deploy, hours later. Script rewired, masters committed to
  `tools/ide/art/`, and the shipped set regenerated THROUGH it.

## Website: download page + self-hosted analytics
- **`/chord-writer/download`** with both artifacts and install instructions.
  Fernhill ships as a committed 58 KB zip (source, tests, identity config,
  assets, README) — deliberately NOT the 4 MB `dist/`. Fernhill also gained
  `fernhill.config.json`, adopted from its existing header IFID through the
  real `reconcileHeader` (value preserved, header untouched) — ADR-309 says
  that file is committed, and a sample shipping without it teaches the
  opposite.
- **Analytics ported from Ledga** (`ChicagoDave/budgetman`). Client beacon
  nearly unchanged; server rewritten as one Next route appending JSONL (no
  AWS — sharpee.net *is* a server) with **IPs hashed under a daily-rotating
  salt, never stored** (Ledga keeps raw IPs under a published privacy policy;
  sharpee.net has none). Downloads tracked by a delegated click listener, so
  MDX needs no special component. Tested end to end against a real
  `next start`: pageview stored, download stored with asset, Googlebot
  rejected, no raw IP, `analytics.mjs` reading it back.
- **The salt was a latent bug, not a deploy step**: random-per-process meant
  every restart re-hashed the same visitor, and every deploy restarts — so
  returning visitors would silently double-count. Now persisted at 0600 in
  the data dir; verified stable across a restart. `deploy.sh` provisions
  `/var/lib/sharpee-analytics`, refuses if unwritable (the collector swallows
  errors by design, so an unwritable dir = a site that records nothing and
  says nothing), and probes `/api/p` after restart with a bot UA so the check
  writes no fake visit.

## Apple silicon floor + the DMG
- **Deployment target 26.0 → 11.0** (David: *"any M chip OS — we can't
  require 26"*). Cost four changes: three `isInspectable` calls
  availability-guarded, one `loadViewIfNeeded()` replaced with the portable
  `_ = view`. Verified the vendored node is `minos 11.0` too — otherwise the
  app would launch on an old Mac with nothing behind its Build button. Both
  website pages had claimed macOS 26 (and, before that, my own wrong "macOS
  14 / Intel" line) — corrected, along with the ADR-279 comment.
- **Three notarization submissions**, only the last worth stapling:
  `e264bb44` (old icon, minos 26), `fb7db755` (new icon, minos 26),
  **`90a8dfb6` (new icon, minos 11.0 — the shippable one)**. `notarytool`
  crashed with `Bus error` on all three, always in `submit --wait`,
  reproducible; `--keep-work` preserved the signed app on the last two.
  David's context: a first-time bundle can sit in Apple's queue up to 12
  hours, so this is waiting, not stuck.
- **Signed app staged durably** at `tools/ide/release/Chord Writer.app`
  (gitignored), copied out of `/var/folders` which macOS purges — signature
  re-verified after the copy. When Apple returns Accepted: staple THAT copy,
  run `dmg/assemble-dmg.sh`, drop the DMG in `website/public/downloads/`.
- **Phase 8 amended**: the bundled sample and landing-page offer are dropped
  — the website serves Fernhill now, and a bundled copy would be a third
  channel that drifts. The landing empty state was inspected before agreeing
  it was fine ("No Projects Yet" over "Create a story to begin…", with
  Open… / Create Story / Close), so what was missing was the offer, not a
  coherent first launch.

## Session Metadata
- **Status**: COMPLETE. ADR-307 plan DONE (six phases). ADR-309 DONE (three
  phases + the held deletion). **Sharpee 5.0.0 published to npm.** Website
  deploy fixed and serving current content. Go-live is one artifact away:
  the DMG, waiting on Apple.
- **Waiting on Apple**: `xcrun notarytool info 90a8dfb6-5989-4c36-898f-5cf74b0191ee --keychain-profile dc-notary`
- **Open items**: (1) `sharpee ifid` — KEPT (David 2026-08-10, "stays if
  anyone wants to use it"); recorded in its header. (2) ADR-308 navigation
  interview — five open questions, re-offer when that work starts.
  (3) Splice gesture chrome still unruled (carried). (4) Module projects have
  no test path post-cutover (ADR-307 ruling C). (5) branch-tester's runner
  still carries unreachable transcript-directive support — a later prune.
  (6) `package.sh` should submit without `--wait` and poll instead; the crash
  is 3/3 in that call and a 12-hour blocking wait was never the right shape.
  (7) go-live plan bookkeeping: Phases 5/6/6a–6f still need supersession
  stamps from the ADR-306→307 chain.
- **Homepage CTA** still points at the CLI install page rather than the new
  download page — probably backwards now that there is an app to download.
