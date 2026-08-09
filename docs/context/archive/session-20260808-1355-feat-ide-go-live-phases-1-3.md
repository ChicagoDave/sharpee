# Session Summary: 2026-08-08 - feat/ide-go-live-phases-1-3 (CDT, session c29681)

**Status: COMPLETE** — Phase 6 (transcript acceptance pass) started and
immediately productive: D1/D2/F1–F3 editor defects fixed same-day; issues
248–254 filed → proposal `phase-6-fallout` (reviewed, all 7 ACCEPTED,
ADR-304 written) → planned → merged into go-live as Phase 6 remediation
track 6a–6f (David's ruling); Fix A (theme lists) shipped; **Phase 6a
implemented, click-through defects fixed, pinned by a new real-browser
Playwright live spec**. Phase 6 exercise + 6b–6f continue next session.
Blocker Category: N/A.

## Goals
- Phase 6: prove the transcript editor by writing Fernhill's suite through it — no text editor, no terminal.

## Phase Context
- **Plan**: Sharpee IDE Go-Live (`docs/work/ide-go-live/plan-20260806-go-live.md`), Phase 5 built and awaiting this acceptance; Phase 6 now started.
- Pre-session audit: clean — no blockers, `tsc --noEmit` clean, tree clean, all of last session's work landed in `0546de1f`.

## Completed
- Phase 6 staged: plan marked CURRENT, `phase-6-acceptance-log.md` created, the
  15 fernhill transcripts `git mv`ed to `fernhill-transcripts-phase6-baseline/`
  (David's call), suite dir left empty for the through-the-editor rewrite.
- **D1 found and fixed** (first gesture of the exercise): the tab had no way to
  create the first/root transcript — the only create affordance was
  branch-from-open-document. Added the New-transcript bar (browse mode, gated
  on story attachment), an empty-suite explainer, root create through the
  existing `createTranscript` wire, and create feedback routed to the surface
  the author is on (status line in browse, edit note in document).
- Evidence: tab vitest 82 passing; `tsc --noEmit` clean (tab project); bundle
  rebuilt into Resources; new Swift real-path test
  `testAnEmptySuiteOffersRootCreationAndTheFirstTranscriptLandsOnDisk` green,
  full `TestingTabRealPathTests` class 32 passing, 0 failures. All three
  mutation-verification gaps closed in the same test (hidden-before-attach,
  field-clear, refusal-to-status, detach-withdraws).
- Filed David's three publish/theming asks as issues: #248 (web client Reset
  menu item), #249 (built-in themes missing on publish), #250 (Chord Writer
  play-surface theme picker).
- Verified and wrote up #250 (IDE-side straightforward, ~50 lines; picker must
  be IDE chrome since Play hides the client menu; persistence must be
  UserDefaults since Play wipes localStorage; blocked on #249's ruling) and
  #249 (machinery intact — the theme LIST was dropped in the dungeo→Chord
  move; publish rebuilds through buildBrowser so it's one lever).
- Componentization question answered (keep one index.html: ADR-253
  copy-and-edit + play/publish fidelity are load-bearing); the one real smell
  filed as #251 (ThemeManager renders its own theme menu, drop the build-time
  #theme-menu regex; do it with #248).
- **Fix A done** (David's go-ahead): `themes:` line in fernhill.story + chord
  scaffold; TS scaffold gains `sharpee.themes` (was absent — menu-without-CSS
  bug) + THEMES_JSON constants to all four in init.ts/init-browser.ts.
  browser-build.test.ts updated for the new scaffold truth + new de-list
  phase pinning AC-4 no-linger. Evidence: devkit `vitest run browser` 35
  passing; fernhill real build "Wired 4 theme(s)", all four CSS + system-6
  assets + menu in dist; devkit rebuilt dist + dist-esm; repo `tsc --noEmit`
  clean. Commented on #249.
- Mutation-verification on Fix A: the init.ts THEMES_JSON substitution was
  DEAD (init's templates carry no browser-entry tokens; chord init chains
  into init-browser, whose substitution is the live one) — removed the whole
  dead token block from init.ts; added the Chord-scaffold real-path test
  (story header line + all four ids in the scaffolded entry, no leftover
  token). Final: devkit browser+init tests 37 passing; devkit rebuilt
  dist + dist-esm; `tsc --noEmit` clean.

- **D2 fixed**: `SaveOutlook` gains first-class `empty` kind (zero commands,
  one problem, serializer round-trips byte-for-byte — the husk guard); add
  bar enabled on empty ("Add the first command…"); source face explains.
  3 rule-14 updates in promote.test.ts; new grammar tests; 86 tab tests
  passing. Swift authoring-loop test written but NOT yet run — xcodebuild
  CodeSign fails while David's Chord Writer is open from the same build.
- **David's six-point UX batch logged as F2–F6** (phase-6 log): F3 (selection
  render race — `replaceChildren` on selectionchange kills the drag, the
  promote gesture was humanly impossible; Swift test passed only because it
  drives selection synthetically) FIXED via persistent `#promoteslot` patched
  in place, watcher never triggers document renders. Trash (F6) verified
  working — feedback gap only. F2 (authored commands should render as cards
  before a run) proposed, awaiting David's nod. F5 copy batch + "golden"
  naming = David's call. F1 (empty transcript kills suite run) platform
  ruling still open.

- **F2 built on David's direction**: authored-but-unrun commands render as
  [NEW] cards immediately (warn-color edge, guidance line); assertions
  written since the run show instantly as orange `claim fresh` chips (tracked
  by command input in `surface.freshClaims`, confirmed writes only); stale
  claims stay hidden as pinned. 86 tab tests passing; bundle rebuilt; F2
  pins added to both Swift real-path tests (not yet run — app open).
- Filed #252 (testing workspace: Play takes the left pane while Testing is
  active, explicit Exit) and #253 (Testing settings: auto-assertion policy on
  new commands — really "first run of a new command auto-writes which
  assertion"); logged as F7/F8.

- **F1 ruled ("skipped is fine") and built**: `transcript-end` wire status
  `skipped`; tree-runner skips zero-command nodes (no boot, children run);
  parse gates exempt sole-no-commands; report "N skipped (no commands yet)";
  tab renders skipped status. Evidence: branch-tester 398, transcript-tester
  267, ide-protocol 45, devkit test-json 19, tab 87 all passing; CLI repro
  empty+good → skipped+passed exit 0; tsc clean; 4 packages rebuilt both
  targets; tab bundle rebuilt.
- Filed #254 (Play pane margin selection → Create Transcript with #253's
  auto-assertion policy); logged as F9.
- Mutation-verification on F1 found a real semantic gap — the skip path
  dropped an empty node's declared `seed:`/`point-seed:` (silently unpinning
  its subtree's dice, divergently on replays). Fixed: `applyReseed` fires
  before the skip return, authored and replay visits both. Added: fork-
  through-empty-node test + reseed-carried test (branch-tester 400 passing)
  and a permanent real-CLI regression case in devkit test-json (20 passing):
  empty transcript → skipped, sibling passes, exit 0. branch-tester rebuilt
  both targets.

- **Proposal → plan → merged into go-live**: `docs/proposals/phase-6-fallout.md`
  (issues 248–254) written, reviewed (2 blocking findings), all 7 items
  ACCEPTED→PLANNED. P-1 reframed by David (IDE theme corral, author picks —
  dissolves the ADR-188 conflict); ADR-304 written+ACCEPTED (testing
  workspace, modal Play-left, D1–D4). P-6 "all emitted text" sharpened by
  David: any ORDERED emission (before text, room name, description, list
  contents, NPC activity), in order, all of them. David's ruling: the work is
  PART OF GO-LIVE — merged as the go-live plan's Phase 6 remediation track
  (6a–6f); the standalone plan file is MERGED (detail reference only);
  `.current-plan` never moved (rule 18b dissolved). 6a (Reset menu +
  ThemeManager menu) is CURRENT, awaiting David's go to start.

- **Phase 6a implemented** (my pick — web-side, doesn't fight David's open
  app for Xcode): Reset menu (wipeStoryStorage prefix-scoped + handleReset +
  #menu-reset in template AND fernhill's custom page) and ThemeManager-owned
  menu (renderMenu from the page's #sharpee-wired-themes JSON — build
  injects DATA + links, never markup; injectThemes menu regex deleted;
  generateEntry carries manifest names; theme clicks delegated on #menu-bar;
  classic never doubled — dungeo's entry declares it). Evidence:
  platform-browser 126 passing (9 new), devkit browser 36 (rule-14 update to
  data-block claims), real fernhill build carries block + Reset, tsc clean,
  platform-browser + devkit rebuilt both targets. Mutation-verification's 4
  findings closed same day: handleReset flow tested both ways (restart-
  reboot harness + key/length stub upgrade); hostile-name `</script>`
  neutralization unit-tested; legacy Dungeo template got menu-reset;
  built-page `id="menu-reset"` asserted in the real-path build test. Final:
  devkit browser 38, platform-browser 128, tsc clean. Remaining 6a
  acceptance: David's in-browser click-through.

- **6a click-through defects (David, live) — all fixed + pinned in a new
  real-browser Playwright spec** (`platform-browser/tests/visual/
  live-client.spec.ts`, serves the real fernhill build over http): menu
  items carried `data-theme` (theme CSS scopes by it → every row its own
  palette) → payload renamed `data-theme-choice`, legacy honored, delegation
  + checkmarks updated; "refresh resets theme" + "reset doesn't restart the
  screen" were ONE bug — Reset wiped storage + rebooted but never re-applied
  the theme → `ThemeManager.resetToDefault()` (apply, don't persist) in
  handleReset. Evidence: live spec 3 passing, full visual suite 12 passing,
  platform-browser 128, tsc clean, platform-browser rebuilt both targets,
  fernhill rebuilt.

## Key Decisions
- Root creation lives on the browse surface (a branch is defined by its
  parent, so it stays on the open document); the "No story open" wire sentinel
  is mapped to `story = null` in exactly one place (onReset).

## Next Phase / Open Items
- David continues the Phase 6 exercise in Chord Writer (app rebuild picks up
  the Testing tab bundle + vendored toolchain with skip semantics); the
  exercise log keeps growing in `phase-6-acceptance-log.md`.
- Remediation track: 6a done pending David's re-check; 6b–6f queued (6b
  play-surface picker wants an app-closed Xcode window — batch with the two
  pending Swift real-path test runs: empty-suite authoring loop + promote
  fresh-chip pins).
- F5 copy batch (branch/reparent labels, Record Golden tooltip) not yet in
  any phase — small, fold into 6b or the next tab touch.
- #249 Fix B is superseded by P-1's corral reframe (no default-on ruling
  needed anymore); #249 can close when David agrees Fix A + corral cover it.

## Files Modified
- `tools/ide/web/testing-tab/src/{index.html,views.ts,main.ts,tab.css}` +
  rebuilt bundle in `tools/ide/SharpeeIDE/Resources/testing-tab/`
- `tools/ide/SharpeeIDETests/TestingTabRealPathTests.swift` (1 new test)
- `docs/work/ide-go-live/plan-20260806-go-live.md` (Phase 6 CURRENT),
  `phase-6-acceptance-log.md` (new), fernhill transcripts moved to baseline
