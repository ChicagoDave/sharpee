# Session Summary: 2026-08-10 09:00 - feat/testing-tab-embed (session 3a899e)

## Goals
ADR-307 plan Phase 5: two-consumer parity — AC-2/AC-3 sign-off and the E2E
scenario. Carry-overs: tab tally (commands) vs CLI report (lines) at AC-2;
splice gesture chrome awaits David's ruling.

## Completed
- Session start: recap + pre-session audit relayed (clean), gate cleared.
- **Tally parity (the AC-2 carry-over)**: the tab's run tally now counts
  LINES, derived in the surface's fold (`run.ts` `run-end` case) from its
  own per-line results — the wire's `run-end` totals sum commands (the
  transcript world's contract) and are no longer copied. The tab's tally
  now agrees with its rows and with the CLI human report. Swift assertion
  updated ("1 passing, 1 failures"); bundle rebuilt into `Resources/`.
- **AC sign-off suite** (`tests/ac-signoff-cli.test.ts`, 6 tests): spawns
  the REAL devkit CLI subprocess with the tab's exact arguments over
  documents authored through the real `TreeSessionModel` driven by the
  real engine. AC-2: green run with identical derived labels across model
  / CLI stream / tab fold / human report, document bytes untouched by the
  run; a failing claim cited byte-identically (wire `failure` → tab's
  `turn N — msg` / report's `cmd: msg`). AC-3 per gesture (branch,
  tail-cut, splice-in, splice-out): byte-level "exactly the specified
  tree" via the shared serializer, seam = that claim's failure with the
  branch still passing, splice-out restores byte-identity.
- **E2E click-through script** written:
  `docs/work/testing/e2e-click-through-20260810.md` — the ADR scenario
  verbatim over fernhill (verified: starts at Iron Gates, first north =
  Gravel Drive with no east exit; step 2 authors the contains claim the
  seam step needs, since policy defaults synthesize live and can't go
  stale). Awaits David's walk — the Phase 5 exit item.

- **Fresh-start parity gap found by David's real click-through** (screenshot,
  ~08:55): tests + .json deleted, tab opened, build, Run → CLI FAIL
  `command "look" has no assertion` while the tab showed synthesized
  defaults. Root cause: the tab's 2026-08-09 default-policy ruling vs
  ADR-294 D2's "absent = let me decide" at the CLI.
- **David's ruling (~09:00): "auto assertion is the default."** Implemented:
  `DEFAULT_AUTO_ASSERTION_POLICY = 'room-name-and-description'` lives ONCE in
  branch-tester's `auto-assertion.ts`; the tree-walker applies it to each
  line's booted game when the story declares none (one code path, D6 — the
  transcript world keeps D2 until Phase 6); devkit's document runs add
  `room-name`/`room-description` to the capture set (the default's carriers —
  uncaptured carriers would demote synthesis to skips); the page defaults via
  the same constant; Swift's `defaultPolicy` copy DELETED (injects only the
  declared header); Test → Auto-Assertion first item renamed "Let Me Decide"
  → "Default (Room Name and Description)". Walker test rewritten (bare card
  under no policy now synthesizes; declared policy never overwritten); devkit
  bare-document test added (the screenshot case, exit 0); ac-signoff story
  now header-LESS + fresh-start test (purely-recorded session green in the
  real CLI). Also: document-run failure citations drop the meaningless
  `line 0 —` prefix (fold-side).

- **Turn-count parity find (clean IDE run, 09:17)**: under the default
  policy every line gains an `(opening)` claims row, exposing that the tab's
  PASS rows counted passed command results (boot + opening included) while
  the CLI report counts turn cards. Proposed an optional `turnCount` wire
  field; **David's ruling (~09:25): "turns have no meaning unless the author
  gives them meaning (time puzzles)"** — so turn counts came OFF the rows in
  BOTH consumers instead of being synced: tab PASS rows are count-free
  (`cards.ts`), CLI report rows are count-free (`formatTreeDocumentRun`).
  Failure citations keep their `turn N` position (identity, not a metric);
  the line tally and the replay-share line stay. ADR-307's E2E scenario
  text ("rows with PASS and turn counts") needs a matching amendment —
  queued for the Phase 6 ADR edit set with the default-policy amendment.

- **David's rulings (~09:40): "the test run should show details for every
  card and its assertions" + "the JSON should be the source of truth for
  all testing elements"** — reversing v2's "policy defaults synthesize
  live, never persist" rule. Implemented as one pivot:
  - **Record-time persistence**: the tab synthesizes under the effective
    policy (declared ?? platform default) when a turn LANDS and writes the
    result into the card — opening channel claims (prologue/title/
    description), turn contains/exact claims, explicit `skip: true` when
    the policy had nothing to read. `compose.ts` gained
    `recordedTurnAssertions`; `TurnDelivery` carries
    assertions/skip/openingAssertions (append-only; a BINDING delivery
    never overwrites — but FILLS a claim-less non-skip card, which is how a
    spliced-in turn gains its truth on the whole-path replay). Authoring
    onto a `[SKIP]` card lifts the demotion (`liftSkip`).
  - **Run time assumes nothing**: the walker CLEARS `autoAssertionPolicy`
    (even declared) — a document run evaluates exactly what the JSON says;
    a bare card is the ADR-294 D2 failure again (hand-edited docs only).
    devkit's capture set = exactly `channelIdsReferencedBy(document)`.
  - **`noDefaults` left the schema** (closed grammar — documents carrying
    it are malformed by design); narrowing collapsed to plain per-family
    removal (`removeDefault`/`removeOpeningDefault` deleted); compose's
    live-default rendering gone; bare cards render `no assertions`.
  - **Run detail**: `command-result` gained optional `assertionResults`
    (`AssertionOutcome {description, passed, message?}`) — ide-protocol
    type+guard, transcript-tester emitter, branch-tester
    `describeAssertion`/`streamableCommandResult` (one spelling, tab claim
    idiom), devkit emits on both `--tree` paths (`test.ts`'s
    transcript-tester world strips the raw field instead). The tab's fold
    accumulates per-command `CommandOutcome`s; the run column renders line
    header → each command → ✓/✗ per assertion with failure messages.

- **David's ruling (~11:05): "every assertion counts"** — the tally
  aggregates the detail itself in BOTH consumers: cards (executed commands,
  opening row included; skips join neither side) and assertions, e.g.
  `4 cards passing, 12 assertions passing, 1 card failing, 1 assertion
  failing`; line-level errors/unreached keep their counts. Implemented in
  the fold's `run-end` (tab) and `formatTreeDocumentRun` (CLI) with
  identical wording; expectations re-pinned from real engine runs
  (ac-signoff green: 5 cards/12 assertions; devkit fixture: 4 cards/5
  assertions; Swift fixture: 2+2 passing, 1+1 failing). Evidence: IDE suite
  **474 passing, 0 failures, TEST SUCCEEDED** — ~11:15; branch-tester 397,
  devkit 178+1, surface 60 + tsc clean, ide-protocol 46, transcript-tester
  278; bundle + dist/dist-esm + `tsf --npm` all green.

- **David's click-through find (~11:20): opening claims lost + only gesture
  is "Not contains…"**. Root causes: (1) the opening card's claims persisted
  only on FRESH creation — the opening seat-bind had no void-fill, so any
  replayed document with a bare opening (incl. pre-pivot documents) lost
  them forever; (2) the opening card's action row gated Channel… (and
  everything else but Not contains…) to `ordinal > 0`, though the opening's
  claims ARE channel claims. Fixed: opening seat-bind fills a claim-less,
  non-skip opening from the boot delivery's `openingAssertions`
  (fill-never-overwrite, same rule as all binds — pre-pivot documents heal
  on first replay); the Channel… picker now serves the opening, reading the
  boot record's captures (`bootRecordOrdinal`). Model heal/no-overwrite
  test added; fernhill Swift test now asserts the recorded `info.title`
  claim rides the opening card through the real engine. Evidence: surface
  **61 passing** + tsc clean; IDE suite **474 passing, 0 failures, TEST
  SUCCEEDED** — ~11:35 (incl. the new fernhill opening-claims assertion
  against the real engine); bundle rebuilt.

- **David's feature ask (~12:00): group cards by region, collapsible.**
  Rulings: collapsed headers keep their branch chips + the active group
  stays open; headers show just the region name. Implemented wholly
  IDE-side: room→region map derived from the Story IR (`containing`
  members, now decoded in `ComposeStoryIR.Entity`; `MainWindow.regionMap`)
  and injected at boot + rebuild alongside the policy; `groupByRegion` in
  `cards.ts` cuts the active path into chronological region runs (opening
  inherits its neighbor's region; region-less rooms run flat; re-entry =
  new group); headers toggle collapse (cards hide, chip rows stay visible,
  the LAST group — the play point — never collapses); collapse keys are D7
  view ephemera (`view.collapsed` through the opaque sidecar, zero Swift
  store changes). Nothing touches the tests.json — groups are derived like
  labels. Tests: `groups.test.ts` (5, chronology/holes/region-less/flat),
  Swift `testRegionGroupsRenderCollapseAndPersistViewState` (headers,
  collapse, sidecar key, document untouched, last-group immunity).
  Evidence: surface **66 passing** + tsc clean; IDE suite **475 passing, 0
  failures, TEST SUCCEEDED** (+1, the region test) — ~12:25; `containing`
  confirmed on the real compose wire (fernhill: Grounds/House member ids);
  two test fixtures gained the new Entity field; bundle rebuilt.
- **Gutter rail removed (~14:00)**: David's screenshot point (clarified) —
  the left margin + vertical line. Removed `.ts-session`'s rail gradient,
  the per-row `.ts-pick` spacers (cards + branch rows), `.ts-gutter-cap`,
  and the dead checkbox CSS; cards start at the pane edge, the region
  headers' dashed rule stays. (The chip-count strip from the misread
  still stands under the turns ruling.) Evidence: surface 66 passing +
  tsc clean; IDE suite **475 passing, 0 failures, TEST SUCCEEDED** —
  ~14:10; bundle rebuilt.
- **Chip counts stripped (~13:50)**: David's screenshot showed the branch
  chips still carrying `· N turns` — the turns ruling applied to them too
  (`> north` command-only; `· replay pending` kept, it is state not a
  metric). Signing rot recurred a SECOND time today (CodeSign fail, no
  tests ran) — full DerivedData clean again, then IDE suite **475 passing,
  0 failures, TEST SUCCEEDED** — ~13:55. Surface 66 passing + tsc clean;
  bundle rebuilt.

## Key Decisions
- The run tally counts lines, not commands — decided in the surface's
  fold, NOT on the wire: `run-end`'s command totals stay as-is for the
  transcript world's consumers.
- The E2E script includes an explicit claim-authoring step (ADR's "edit a
  room description → failed contains" requires an authored claim).

## Evidence (source-of-truth pivot, ~10:15–10:45)
- branch-tester **397 passing** (walker tests rewritten: bare card = D2
  failure, declared policy synthesizes nothing at run time, skip cards).
- devkit **178 passing, 1 skipped** (persisted-opening-claims test with
  wire detail verdicts; claim-less opening = no row; bare card = exit 1).
- transcript-tester **277 passing** (stream builder gained the optional
  assertionResults pass-through); **278 passing** after closing
  mutation-verification's gap (the carries/omits convention test for the
  new field). ide-protocol **46 passing** after its gap test (guard
  accepts/rejects assertionResults shapes) — ~10:55.
- Surface **60 passing** + `tsc -p` clean (compose record-time builders,
  model persistence incl. void-fill + liftSkip, fold detail, ac-signoff
  rewritten: byte-exact trees incl. recorded claims, detail chain through
  the real CLI, splice repair as splice → replay-fill → seam).
- IDE suite **474 passing, 0 failures** clean run (~10:45; a prior run's
  single failure was EditorExternalChangeTests watcher timing under CPU
  contention from parallel npm builds — 4/4 green in isolation, out of this
  change set). Swift rewrites: opening claims persisted + plain removal,
  undo preserves recorded claims.
- dist + dist-esm rebuilt for ide-protocol/transcript-tester/branch-tester/
  devkit; `tsf build --npm` green for all four; bundle rebuilt into
  `Resources/`.

## Evidence
- Surface: **55 passing** + `tsc -p` clean — 08:41; after the ruling work
  **57 passing** (run 10, ac-signoff 7) + `tsc -p` clean — 09:12.
- IDE suite: **474 passing, 0 failures** via xcodebuild — 08:43 (includes
  the updated tally assertion against the rebuilt bundle). Post-ruling
  re-runs hit the KNOWN signing rot (CodeSign: "code object is not signed
  at all") AND a second stale `SharpeeIDE-*` DerivedData dir that compiled
  old test sources — full clean of BOTH plus `DerivedData/Build`, then
  **474 passing, 0 failures, TEST SUCCEEDED** — 09:29 (both rulings in,
  count-free rows, renamed menu, rebuilt bundle).
- branch-tester **396 passing** — 08:43; **397 passing** (+1 walker
  default-policy pair, one test rewritten) — 09:11. devkit **177 passing,
  1 skipped** — 08:43; **178 passing, 1 skipped** (+1 bare-document) —
  09:12. dist AND dist-esm rebuilt for both; `tsf build --npm` green for
  both — 09:13.

## Files Modified (source-of-truth pivot)
- `packages/ide-protocol/src/run-events.ts` (AssertionOutcome + guard)
- `packages/transcript-tester/src/run-event-stream.ts` (emit pass-through)
- `packages/branch-tester/src/auto-assertion.ts` (describeAssertion,
  streamableCommandResult), `tree-walker.ts` (policy cleared at run time,
  noDefaults mapping gone), `tree-document.ts` (noDefaults out of the
  schema), `index.ts`; tests: `tree-walker.test.ts`, `tree-document.test.ts`
- `packages/devkit/src/commands/test-tree-document.ts` (capture set,
  detail emit), `test-tree.ts` (detail emit), `test.ts` (strip);
  `test-tree-document.test.ts` (persisted-opening/bare-card rewrites)
- `tools/ide/web/testing-surface/src/compose.ts` (rewritten), `model.ts`
  (persistence + void-fill + liftSkip, narrowing machinery deleted),
  `main.ts` (record-time synthesis in the deliver pipeline), `run.ts`
  (per-command detail fold), `cards.ts` + `surface.css` (detail rows);
  tests: `compose/model/run/tree-session-real-path/ac-signoff-cli`
- `tools/ide/SharpeeIDETests/TestingSurfaceRealPathTests.swift` (opening
  claims persisted + plain removal; undo preserves recorded claims)
- `tools/ide/SharpeeIDE/Resources/testing-surface/` (rebuilt bundle)

## Files Modified
- `packages/branch-tester/src/auto-assertion.ts` (DEFAULT constant),
  `tree-walker.ts` (interface + default application), `index.ts` (export);
  `tests/tree-walker.test.ts` (rewritten bare-card test + declared-wins)
- `packages/devkit/src/commands/test-tree-document.ts` (room channels in
  capture set), `test-tree-document.test.ts` (bare-document test)
- `tools/ide/web/testing-surface/src/run.ts` (line-tally derivation +
  line-0 citation), `src/main.ts` (page-side default via shared constant),
  `tests/run.test.ts`, `tests/ac-signoff-cli.test.ts` (new, header-less)
- `tools/ide/SharpeeIDE/TestingSurface/TestingSurfaceViewController.swift`
  (defaultPolicy deleted), `MainWindow.swift` (declared-only injection),
  `Menus/MenuBuilder.swift` + `AppDelegate.swift` (menu rename),
  `SharpeeIDETests/TestingSurfaceRealPathTests.swift` (tally),
  `SharpeeIDETests/AutoAssertionMenuTests.swift` (titles)
- `tools/ide/SharpeeIDE/Resources/testing-surface/` (rebuilt bundle ×2)
- `docs/work/testing/e2e-click-through-20260810.md` (new; ruling note)
- `docs/work/testing/plan-20260809-adr-307-model-v2.md` (Phase 5 CURRENT)

---

## Session Metadata
- **Status**: IN PROGRESS (Phase 5 DONE — David walked the E2E in the real
  IDE ~15:00 and confirmed all steps; sign-off + findings recorded in
  `e2e-click-through-20260810.md`; plan updated. Phase 6 — cutover — is
  next, pending David's go and the delete-list confirmation.)
- **Blocker**: N/A. Carried open items: splice gesture chrome (unruled),
  ADR amendments queued for Phase 6's flip edit set.
