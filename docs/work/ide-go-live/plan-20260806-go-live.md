# Sharpee IDE — Go-Live Plan

Plan for the seven items in `todo-list.md`. Written 2026-08-06.

The list is the source of truth for *what* and *why*; this is *in what order*
and *how we know each is done*. Decisions already made are recorded there and
are not re-litigated here.

**Nothing in this plan is started without David's go-ahead per phase.**

---

## Ordering

The dependencies are real, not bureaucratic:

```
Phase 1  Modal landing page            (item 6)     DONE 2026-08-06
Phase 2  Documentation audit           (item 2a)    DONE 2026-08-06
Phase 3  Documentation tab             (item 2b)    DONE 2026-08-06 (item 8 folded in)
Phase 4  Transcript discovery pass     (item 7.1)   no dependencies
Phase 5  Transcript editor             (item 3)     needs Phase 4
Phase 6  Transcript acceptance pass    (item 7.2)   needs Phase 5
Phase 7  Publish tab                   (item 1)     DONE 2026-08-06
Phase 8  DMG                           (item 4)     needs Phases 3 and 6

Added by Phase 2:
  item 8   Fix 15 stale story headers on sharpee.net   DONE 2026-08-06 (in Phase 3)
  item 9   Write transcript-testing documentation      after Phase 4
```

Phases 1, 2, 4 and 7's scoping step are independent and can run in any order or
together. Item 5 (the diagnostic wording) is a one-line change gated on a
decision, not a phase — fold it into whichever phase is running when David
rules on it.

Two orderings matter and are easy to get wrong:

- **Phase 4 precedes Phase 5.** Writing Fernhill's transcripts back by hand is
  what tells us what the editor should be. Building the editor first means
  designing from a blank page.
- **Phase 2 precedes Phase 3.** There is no point building a documentation
  surface before deciding which corpus it shows, given what Phase 2 will find.

---

## Phase 1 — Modal landing page (item 6)

**Status: COMPLETE** — 2026-08-06, session 20260806-1650. Acceptance below met
except the two noted there; details and the two out-of-scope consequences are
recorded under item 6 in `todo-list.md`.

**Goal.** The app launches into a modal landing page instead of silently
reopening the last project.

**Scope.**

- New modal window shown at launch: recents list (5), **Open**, **Create
  Story**, **Close Chord Writer**.
- Recents from `RecentProjectsStore` (already exists, caps at 10 — show first
  5). `SessionState.projectURL` stops being the launch path and becomes an
  entry in the list.
- Create Story: title field plus location field defaulting to
  `~/Documents/{story title}/`, mirroring the title until the author edits the
  location, then mirroring off permanently. Scaffolding is
  `StoryScaffold` (already exists); its default destination changes.
- Dismissed once, gone until next launch. No summon-back shortcut.

**Out of scope.** News / Advice / Community sections from the Inform launcher.
Sample-project listing arrives with Phase 8.

**Acceptance.**

- Launching with a saved session shows the modal, not the project.
- Picking a recent opens it, and `SessionState` still restores its tabs,
  expansion and pane visibility.
- Create Story with a title produces a story at the mirrored location; editing
  the location then editing the title again leaves the location alone.
- Closing the last story window quits (already true — confirm unchanged).
- Tests drive the real modal, not a stub, in the style of the existing
  `SnapPanesSettingTests` / `ProjectPaneCollapseTests`.

**Before starting.** Check David's IDE mock artifacts — IDE surface design
lives there.

**Open.** Sanitising the mirrored default for path-illegal characters and
length. Default-quality, not correctness, since the location is editable.

### Acceptance, checked

| Criterion | State |
|---|---|
| Launch shows the modal, not the project | met — `LaunchFlowTests`, and seen live |
| Picking a recent opens it | met — `LaunchFlowTests` |
| …and `SessionState` still restores tabs/expansion/pane visibility | **partly** — the *decision* (`SessionState.restorable`: replay only for the project the session was saved for) is tested; the replay itself is the pre-existing `loadProject` path, unchanged and still untested for the reason `StoryHomeTests` records (it writes the developer's real Open Recent) |
| Create Story produces a story at the mirrored location | met — real-path test, real devkit template, real files |
| Editing the location then the title leaves the location alone | met — driven through the real field editor |
| Closing the last story window quits | **not re-verified** — `applicationShouldTerminateAfterLastWindowClosed` is untouched, so this is unchanged rather than confirmed |
| Tests drive the real modal, not a stub | met — real sheet on a real `MainWindowController`; only project-load, story-write and terminate are injected |

There were no mock artifacts for this surface (they cover the branch view and
the Testing tab), so the design came from the decisions in `todo-list.md`.

---

## Phase 2 — Documentation audit (item 2, first half)

**Status: COMPLETE** — 2026-08-06, session 20260806-1650. Decision recorded in
`phase-2-documentation-audit.md`. Summary: ship sharpee.net's own Chord corpus
(`website/src/app/chord` + `learn`), bundled at build time, pinned to
`CHORD_LANGUAGE_VERSION`; exclude `docs/reference/`, `genai-api`, **and the
book** — the book documents the retired TypeScript author path, not Chord.
Two new items came out of it (8 and 9) and Phase 3 gained a prerequisite.

**Goal.** Decide what the IDE's documentation *is*, before building anything
to show it. This phase produces a decision document, no UI.

**Why it is its own phase.** The corpus is large and its currency is uneven:

| Source | Size | State |
|---|---|---|
| `docs/reference/` | 8 files, ~9,530 lines | `chord-language.md` says **Chord 1.4.0**; the IDE status bar reports **Chord 3.0.0** |
| `docs/book/v2.0.0/` | 31 chapters over 8 parts | Complete and QA'd as of 2026-06-23 |
| sharpee.net | — | The maintained home for author docs |
| `packages/sharpee/docs/genai-api/` | generated | Repo-only, aimed at agents, not authors |

Shipping a documentation tab pointed at a stale corpus is worse than shipping
none: it makes the IDE authoritative about things that are no longer true.

**Scope.**

- Establish which sources the IDE ships, and at what version.
- Establish how they stay current — bundled at build time, fetched, or a
  pointer to sharpee.net. This decides whether stale docs are a release
  problem or a runtime one.
- Quantify the `chord-language.md` gap: 1.4.0 → 3.0.0 is two language
  versions. Is the fix a refresh, a regeneration, or a redirect to sharpee.net?
- Decide what an author actually needs at their desk while writing: language
  reference, stdlib reference, transcript-testing guide, and the book are four
  different jobs and may not all belong in the same surface.

**Acceptance.** A written decision covering: sources shipped, version, currency
mechanism, and what is deliberately excluded. Recorded in this directory.

**Out of scope.** Rewriting any documentation. If the audit finds the corpus
needs work, that becomes its own item on the list.

---

## Phase 3 — Documentation tab (item 2, second half)

**Status: COMPLETE** — 2026-08-06, session 20260806-1650. Both prerequisites
were resolved inside the phase: item 8 was fixed and verified against the real
compiler, and the static-export blocker was dissolved rather than solved (see
below). 143 pages bundle in ~150ms; 10 Swift real-path tests + 25 JS unit tests.

**The export decision changed.** The audit recommended `output: "export"` on the
website. That was dropped once `website/` turned out to have no `node_modules`
at all: the recommendation would have put `npm install` + `next build` inside an
Xcode pre-build phase, and `project.yml` already draws exactly that line — the
web-bundle passes are unconditional BECAUSE they are cheap, the toolchain
vendoring is opt-in BECAUSE it is not. Instead `tools/ide/web/docs-tab/build.mjs`
reads the same `content.mdx` sources directly, in the style of the website's own
zero-dependency `build-search-index.mjs`, so the website need not even be
installed. **The cost: a second renderer, so the tab can drift from
sharpee.net's presentation.** The bundler fails loudly on any MDX component it
does not know, which is what keeps the drift from becoming silent loss.

**Goal.** Documentation reachable without leaving the IDE.

**Shape — David's call, recorded.** Another **right-panel tab**, alongside
Build / Play / Testing / Index / Diagnosis.

**Why that is cheap.** The Testing tab (ADR-301) already establishes exactly
this pattern: local web content rendered in a right-panel tab through a custom
URL scheme handler — `TestingTabViewController`, `TestingTabSchemeHandler`,
`TestingTabWebRoot`, with the bundle under `SharpeeIDE/Resources/testing-tab/`
and built by `build-testing-tab.sh`. A documentation tab is the same machinery
pointed at a different bundle, which also settles how docs get into the app for
Phase 8.

**Scope.**

- New tab in `RightPanelViewController` (tab strip is `TabStripView`).
- Render the corpus Phase 2 chose, via the Testing-tab scheme-handler pattern.
- Navigation within the docs; search if the corpus warrants it.

**Acceptance, checked**

| Criterion | State |
|---|---|
| Renders the chosen corpus offline, no network dependency | met — the whole bundle is scanned for anything that would fetch over http(s) in an asset position. Resource Timing was tried first and abandoned: WKWebView records no entries for custom-scheme loads, so an empty list looks like proof and means nothing |
| Tab selection behaves like the existing tabs | met — `showDocsTab()` shows Docs and hides the rest |
| Theming | met by construction — the page carries the same tokens as `Theme.swift` and follows the app's appearance through `prefers-color-scheme`, as the Testing tab does |
| Font preferences | **not done** — the Testing tab does not honour `FontPreference` either, so this would be new behaviour for both rather than parity. Left out deliberately |
| Bundle produced by the build, not by hand | met — `build-docs-tab.sh` runs as a pre-build step; the test asserts the script is executable AND that `project.yml` runs it |
| Navigation within the docs | met — nav tree over all 143 pages, in-tab link following |
| Search | met — filter over titles and body text, no Fuse dependency |

Two things beyond the written acceptance, both from the audit:

- **The version gate.** The bundle records the `CHORD_LANGUAGE_VERSION` it was
  built from; a test asserts it equals both the compiler's constant and
  `ChordVersionCheck.supportedLanguageVersion`, and the page raises a banner if
  the installed toolchain reports something else at runtime.
- **Unknown MDX fails the build.** A component the website adds later throws,
  naming the page — it caught `<Callout kind="note">` (no `title`) on the first
  run, which would otherwise have silently emptied a callout.

**Dependencies.** Phase 2 — **and two things Phase 2 found**:

- **Item 8** must be fixed first, or the tab bundles the same 15 pages that
  teach a story header the compiler rejects.
- **The website needs a static-export path.** `website/next.config.ts` has no
  `output: "export"` and `deploy.sh` runs it as a live `next start` service, so
  there is no directory of HTML to bundle today. Recommended: `output: "export"`
  behind an env flag, with the three `redirects()` handled another way in that
  mode, so one corpus serves both the live site and the bundle.

---

## Phase 4 — Transcript discovery pass (item 7, pass 1)

**Goal.** Find out what writing transcript tests is actually like, so Phase 5
is designed from evidence rather than imagination.

**Scope.**

1. Move Fernhill's 22 transcripts from
   `branch-stories/fernhill/tests/transcripts/` to
   `docs/work/ide-go-live/fernhill-transcripts-baseline/`. Moved, never
   deleted. Out of the story folder entirely so the story genuinely has no
   tests and Phase 8's DMG cannot ship a stashed copy.
2. Write the tests again from scratch, working as an author.
3. Keep a friction log: what was reached for, what had to be looked up, what
   was got wrong, what was tedious.
4. Only then diff against the baseline. **What was missed is the finding.**

**Method — the part that is easy to ruin.** Do not read the moved originals
before writing. Reading all 22 turns the exercise into transcription and
destroys the signal.

**Honest caveat.** Whoever does this knows the codebase, so it surfaces
friction, not ignorance. It will not simulate a first-time author.

**Constraints.** ADR-294 D4 removed the control-flow directives — a rewrite
must not reintroduce them. Combat sequences are exact pinned-seed counts,
re-derived by `--exec` probing or the `forces:` / `point-seed:` header fields
(ADR-293 Phase C), never guessed.

**Acceptance.** Fernhill has a working transcript suite again, plus a friction
log and a coverage diff against the baseline. The friction log is the
deliverable that matters — it is Phase 5's input.

**Known consequence.** Between step 1 and step 2 completing, Fernhill has no
transcript tests. Checked: only historical session summaries and archived plans
reference the old paths; no build script, config or CI job does.

**Before starting.** Explicit go-ahead from David for the move.

**Status: COMPLETE** — 2026-08-07, session 6ad977. 22 originals `git mv`'d to
`docs/work/ide-go-live/fernhill-transcripts-baseline/` (frozen ADR-301/302
fixture confirmed to hold its own copy first). 15 transcripts (161 authored
commands) rewritten blind, then diffed against the baseline. Deliverables:
`docs/work/ide-go-live/phase-4-friction-log.md` (F1–F27) and
`docs/work/ide-go-live/phase-5-editor-requirements.md` (R1–R11) — the latter
is Phase 5's required input.

---

## Phase 5 — Transcript editor (item 3)

**Status: CURRENT** — scoped 2026-08-08, session acc261, in
`phase-5-editor-scope.md`. The shape: the editor is the Testing tab's document
view grown a probe, in five slices. All buildable work is done: slices 1–3a
(session acc261); slice 4 (turn budget) and 5a (record/re-record) — session
648342, on David's go-ahead for the `turn` wire field and the #239 `--bless`
port; 2f (in-place retype), 3b (terminal marking, R9), 3c (reparenting), and
the ADR-290 D7 sidebar refresh — session a45deb, commit e7d47119. The three
platform remainders all closed 2026-08-08, session 3c1b4d, on David's
go-ahead ("finish phase 5"): R9's clean case (`CommandResultEvent.ending`),
5b's re-record review (`diff` on the wire; record mode already replays past
divergence), and R3/R5's world on the wire (`WorldSnapshot` under
`--capture-world`: inherited-state header + click-to-assert `[STATE:]`
chips). See the scope doc's Done sections. **The slice list is now fully
built.** One named v1 bound: state-assertion offers cover location and
inventory only — trait-state offers need `[STATE:]` evaluator work first
(scope doc, slice 3 remainder). The phase stays CURRENT because its
acceptance is Phase 6 — Fernhill's transcripts written through the editor.

**Goal.** Create, edit and delete transcript tests from inside the IDE.

**Scope.** Driven by Phase 4's friction log — the specific affordances are
deliberately not fixed here, because fixing them now would be the guess this
ordering exists to avoid. Now settled in `phase-5-editor-scope.md`, which is
also where ADR-301's "next decision — the editing interaction" is answered.

**Existing pieces.** The Testing tab (ADR-301), `TranscriptDiscovery`,
`TranscriptHighlighter`, and the mocks in `docs/work/ide-transcript-editor/`.

**Constraint.** ADR-294 D4's removed directives must not be offered by the UI.
The parser rejects each by name.

**Acceptance.** Phase 6.

**Dependencies.** Phase 4.

---

## Phase 6 — Transcript acceptance pass (item 7, pass 2)

**Status: CURRENT** — started 2026-08-08, session c29681. Log:
`phase-6-acceptance-log.md`. Passing this phase is Phase 5's acceptance.

**Goal.** Prove the editor by using it.

**Scope.** Write Fernhill's transcripts again, through the editor this time.

**Acceptance.** They can be produced through the UI without dropping to a text
editor or a terminal. If that is painful, Phase 5 is not done, whatever its own
tests say. The resulting suite is what Phase 8 ships.

**Dependencies.** Phase 5.

### Phase 6 remediation track (6a–6f) — the fallout, folded in

The first hours of the exercise produced fixes landed on the spot (D1/D2
create-and-first-command, F2 [NEW]/orange, F3 selection, F1 skip semantics —
see the log) and seven larger items captured as proposal
`docs/proposals/phase-6-fallout.md` (issues 248–254, all PLANNED). David's
ruling 2026-08-08: **this is part of go-live** — "it's all about the testing
editor" — so the six planned phases live here as 6a–6f, not in a separate
plan. Full per-phase detail (references consulted, budgets, evidence lists)
is in `../phase-6-fallout/plan-20260808-phase-6-fallout.md`, MERGED here and
tracked HERE. Two independent clusters: theming/web-client (6a–6c) and
authoring UX (6d–6f); only within-cluster order and 6e→6f are real
dependencies. Phase 8 (DMG) should ship after this track.

**Phase 6a — Web-client Reset menu + ThemeManager owns its menu** (P-3+P-4,
Medium) **Status: CURRENT (since 2026-08-08) — implementation landed same
day** (session c29681): `wipeStoryStorage` + `handleReset` + `#menu-reset`
(template, fernhill custom page); `ThemeManager.renderMenu` from the page's
`#sharpee-wired-themes` JSON data block (build injects DATA + links, never
menu markup; the TS-path stale-entry hazard and dungeo's classic-doubling
both handled); theme clicks delegated. Evidence: platform-browser 126,
devkit browser 36, real fernhill build carries data block + Reset item, tsc
clean, both packages rebuilt dist+dist-esm. Mutation-verification's four
findings all closed same day: handleReset's full flow tested both ways in
the restart-reboot harness (declined = keys survive + no reboot; confirmed =
real keys gone + engine.stop + reboot); the `</script>` neutralization
pinned with a hostile-name unit test; the legacy Dungeo template got the
Reset item too (P-3 reaches every published client); the built page's
`id="menu-reset"` asserted in the real-path build test. Final: devkit
browser 38, platform-browser 128, tsc clean. David's click-through then
surfaced three live defects, all fixed + pinned in a NEW real-browser
Playwright spec (`tests/visual/live-client.spec.ts`, serves the real
fernhill build over http in Chromium): (1) menu items carried `data-theme`,
which theme CSS scopes by — every row painted itself in its own palette;
payload renamed `data-theme-choice` (legacy attr still honored for custom
static menus); (2+3 were ONE bug) Reset wiped storage and rebooted but
nothing re-applied the theme — page kept wearing the wiped theme, and the
next manual refresh "reset to classic"; `ThemeManager.resetToDefault()`
(apply without persisting) now runs in handleReset. Live spec: menu one
palette/no data-theme, picked theme survives refresh, Reset wipes + reboots
to classic — 3 passing; full visual suite 12 passing; platform-browser 128;
fernhill rebuilt; tsc clean. Reset deletes every storage
key under the story's prefix and restarts, on confirmation; the `#theme-menu`
build-time regex is deleted from `injectThemes` (link injection stays),
ThemeManager renders the menu at runtime — in the SHARED build core
(browser-core.ts, ADR-252 D5), custom pages keeping `#theme-menu` included.
Evidence: platform-browser + devkit vitest, a real CLI build inspected, both
packages rebuilt dist + dist-esm, tsc clean.

**Phase 6b — Play-surface theme picker** (P-2, Small) **Status: CURRENT
(since 2026-08-08) — implementation landed same day** (session acf4d5).
Picker lists Classic + all built-ins regardless of the story's list; applies
live + at boot, no flash; persists in UserDefaults; CSS supply is IDE chrome —
vendored platform-browser theme CSS injected into the play page
(playSurfaceScript precedent); the built bundle untouched. Evidence:
real-path Swift test asserts `data-theme` on the loaded play page.
As built: NSPopUpButton in the Play header — **Story Default** (nil pick, no
IDE interference; the escape back to what the story actually wears) + Classic
+ the four built-ins from the vendored mirror
(`SharpeeIDE/Resources/play-themes/`, mirrored by `vendor-play-themes.sh` as a
committed folder resource + non-opt-in preBuild phase, docs-tab pattern).
Persistence: `SharpeeIDEPlayThemeChoice` in UserDefaults (absent = Story
Default). Boot: the document-start surface script injects `<link>`s for
unshipped built-ins (`PlayURLSchemeHandler.themesFallbackDirectory` backfills
`themes/…` misses from the mirror; bundle files win; traversal refused) and
enforces the pick with a MutationObserver — load-bearing, because the
client's own boot `applyTheme` (BrowserClient.ts) re-applies its saved/default
theme after document start and would silently undo the pick. Live pick
restyles the running page in place (a played session is never rebooted);
Story Default live hands `data-theme` back to the client's stored theme.
Evidence: PlayThemeChromeTests (8, new — real WKWebView over the real scheme
handler with the app's real vendored mirror: picked-theme-wins-boot-clobber,
story-default non-interference, live restyle + persistence, unloaded pick
dresses the next boot, CSS fetch through the backfill, catalog real-path),
PlayHeaderViewTests (5, new), PlayURLSchemeHandlerTests +4 backfill cases;
full SharpeeIDETests suite 472 passing, 0 failures (2026-08-08);
mutation-verification's 2 warnings closed same day. Remaining 6b acceptance:
David's in-app click-through.

**Phase 6c — IDE theme corral** (P-1, Medium) **Status: CURRENT
(since 2026-08-08) — implementation landed same day** (session acf4d5; 6b
awaits David's click-through in parallel — he is remote). Author
picks which built-ins their story ships; toggling writes the `.story`
header's `themes:` line via a header-writing seam beside
StoryHeaderIFID/PublishSource (ADR-298 fielded schema; editor owns the field
like `continues:`); build/publish honor the list unchanged. Evidence:
real-path toggle → header changes → next build's `dist/web/themes/` matches.
As built: **Build → Shipped Themes** submenu — checkmark item per vendored
built-in (from `PlayThemeCatalog`, 6b's mirror; Classic is the `:root`
baseline, always ships, no toggle); enablement + checkmarks via
`validateMenuItem` reading the buffer-first header state
(`shippedThemeIds()`). Toggling routes AppDelegate →
`RootViewController.toggleShippedTheme` → new `StoryHeaderThemes` seam
(read/edit/apply on the shared `StoryHeaderLines` scanner: replace in place
preserving author field order, insert after last header field, empty list
REMOVES the line, nil for no-story-block/unchanged) → the editor's undoable
`replaceText` path — tab left dirty, disk untouched until the author saves.
Evidence: StoryHeaderThemesTests 11 passing; ShippedThemesRealPathTests 3
passing — (1) the exit criterion end-to-end: temp fernhill-frozen copy,
toggle-on edit, header read back, REAL devkit `build` (NODE_PATH supplies
the workspace walk tmp lacks), `dist/web/fernhill/themes/` = exactly
{paper.css, system-6.css, system-6/} with untoggled themes absent, then a
toggle-off edit reads back in place; (2) menu-construction pin (ids, classic
excluded, action selector); (3) the menu toggle path through a real
MainWindowController + real compose outcome + real NSTextView buffer —
buffer gains the line, tab dirty, DISK UNCHANGED until save, in-place
add/remove — first-ever coverage of the editor `replaceText` seam
(mutation-verification found it untested repo-wide, the IFID fix included).
Full SharpeeIDETests 492 passing, 0 failures, 116.4s, `** TEST SUCCEEDED **`
(2026-08-08 18:43 CDT, session bd3d6b) — includes the late-added editor-path
test, closing the earlier 491-run's predates-that-test caveat;
ShippedThemesRealPathTests re-run standalone the same session, 3 passing,
0 failures. Remaining 6c acceptance: David's in-app click-through.

**Phase 6d — Testing workspace** (P-5, Large, **ADR-304**) **Status: CURRENT
(since 2026-08-08, session bd3d6b) — implementation landed same day; David
exercised it live the same evening**. Built to D1–D4 exactly: Testing tab
moves Play to the left pane; modal, one unmissable Exit Testing; the Play web
view reparents without reload (a played session survives); editor
document/cursor/scroll restore on exit. As built: any route to the Testing
tab (click or the Test menu's run entry) enters the workspace;
`RightPanelViewController` lends/reclaims the Play surface (content
constraints re-anchored strip-side so the surface can leave); a new
`LeftPaneHostViewController` hosts the editor permanently (hidden, never
removed — D4 for free) and overlays Play under an accent
`TestingWorkspaceExitBar`; while modal, all other tab switches and the
build's play-tab-forward are suppressed. Evidence:
TestingWorkspaceRealPathTests 4 passing — layout+modality+single exit;
WKWebView JS-world marker survives the reparent round-trip alive (D3, same
instance); editor document/cursor/scroll byte-identical across the trip (D4,
real NSTextView); a build finishing inside the workspace loads Play on the
left without breaking modality (fixture composes via a real in-checkout
compose — scratch under `test-fixtures/.compose-scratch-*`, gitignored).
Full SharpeeIDETests 496 passing, 0 failures, 119.3s, `** TEST SUCCEEDED **`
(2026-08-08 20:05 CDT). Fallout fixed en route, same session: (1)
pre-existing `LineNumberRulerView` infinite draw loop on files without a
trailing newline (found by the D4 test; one loop guard); (2) Testing tab's
Cards/Source face switcher stranded at the window edge in the full-width
workspace pane — moved into the title cluster (David's live finding;
web suite 87 passing, bundle re-vendored). David's live exercise also
confirmed the play surface jump; remaining 6d acceptance: his next
exercise round on the rebuilt app. The missing turn-selection margin he
noted is 6f scope, not a 6d defect.

**Phase 6e — Auto-assertion policy** (P-6, Medium) **Status: PENDING**.
Design step first: settle the setting's home (per-story vs per-user) and
confirm the "all emitted text" form captures David's definition — **any
ordered emission (before text, room name, description, list contents, NPC
activity), asserted in order, all of them** — as a per-command `[OK]` +
literal block (ADR-287 exact-match; assertion tier, NOT a golden recording,
ADR-294 D1/D2). Then: the four-way setting (default "let me decide"
unchanged); on a new command's first run the policy auto-writes the
assertion, identically from CLI and editor; only retained grammar ever
written (ADR-294 D4).

**Phase 6f — Create Transcript from played commands** (P-7, Large) **Status:
PENDING — hard-depends on 6e; composes with 6d**. Design step first: seed
pinning (session seed as provenance, ADR-294 D3), mid-session selections'
ancestry prefix, meta commands in the selection. Then: left-margin selection
over played turns + Create Transcript; the file holds exactly the selected
commands, seed pinned, 6e's policy applied at creation. Evidence: real-path
test plays, selects, creates, and the resulting transcript passes a real run
(rule 13a — no stubbed runner).

---

## Phase 7 — Publish tab (item 1)

**Status: COMPLETE** — 2026-08-06, session 20260806-1650. `sharpee publish`
exists in devkit and a Publish tab drives it. Acceptance below, checked:

| Criterion | State |
|---|---|
| `publish` produces a playable zip | met — fernhill publishes to 0.4 MB; unzipped, index.html is at the root, references are relative, audio/ and images/ are carried |
| No IFID → refuses, writes nothing | met — exit 2, nothing built (verified end to end, plus unit tests) |
| Zip structure pinned by test | met — `index.html` at the archive root |
| The tab runs the toolchain command, never a second path | met — `PublishController` spawns `sharpee publish`; a real-path test drives a real child process |
| The IFID precondition is *offered as a fix* in the tab | **not done** — a second IFID check in Swift is the drift ADR-284 D1 exists to prevent. The author meets the fix earlier: Problems offers Generate IFID at compile time, and the CLI's refusal names both fixes |
| itch.io upload verified by hand | **not done** — needs a real account; a David-only step |

**Found and fixed while verifying**: `buildBrowser` writes into `dist/web/<id>`
WITHOUT clearing it, so the first real publish of fernhill carried a
`game.js.map` five hours older than its `game.js` despite `sourcemap: false`.
Anything left by an earlier build was shipping to strangers. Clearing the story's
own output first took the artifact from **1.2 MB to 0.4 MB** — the stale source
map was two thirds of the download.

**Scoping step: COMPLETE** — 2026-08-06, session 20260806-1650.
`phase-7-publish-scope.md`. The phase is unblocked and can start any time.

Headline: Publish is already designed — ADR-284 (ACCEPTED) decides D1 (mechanics
in devkit, IDE invokes the toolchain, no IDE-only path) and D2 (v1 artifact is a
zip of the self-contained browser build). Its one stated implementation blocker,
Q-2 "where does Publish live", is answered by item 1's right-panel tab. So Phase
7 builds what ADR-284 specified and nobody has built: **`sharpee publish` does
not exist** (no `publish` case in `packages/devkit/src/cli.ts`), while
everything under it does — `dist/web/<id>/index.html` is already the itch.io
shape, `assets/` is already copied, the IFID is already mintable in-IDE. Publish
v1 is build + zip + the ADR-298 D5 refusal on a missing IFID.

One ruling needed: ADR-284 Acceptance 1 names a "customized Web Template", but
ADR-286's `.templates` DSL **is not implemented** (the string appears nowhere in
devkit or chord source). Recommendation in §6.1 — read it against the
`browser/<storyId>.css` override that does exist, and amend the ADR, rather than
making Phase 7 wait on an unscoped DSL.

**Goal.** Publishing reachable from the IDE.

**Original scoping questions, now answered in the scope document:**

- What "publish" means here — produce a distributable, upload somewhere,
  register an IFID, generate an iFiction record, or some subset.
- ADR-284 makes an IFID a publishing precondition. That precondition is now
  reachable in-IDE: the Problems panel mints one on demand
  (`StoryHeaderIFID`), so a Publish tab can rely on it rather than reimplement
  it.
- Relationship to `./sharpee publish` in devkit — does the tab drive it, or is
  it a separate path?

**Acceptance.** Defined once scope is.

---

## Phase 8 — DMG (item 4)

**Goal.** A distributable Chord Writer that arrives with documentation and a
working sample story.

**Scope.**

- Package the app with `tools/ide/package.sh`, notarised via
  `scripts/mac-release.sh`.
- Bundle the documentation from Phase 3.
- Install Fernhill and its transcript tests to
  `~/Documents/The Folly at Fernhill/` — the same shape Create Story uses, so
  the sample is not a special case.
- The landing page must surface it on a fresh install, where there is no last
  project and no recents. This is the job Inform's "Open a Sample Project"
  section does, and it is the one piece of Phase 1 deliberately deferred to
  here.

**Acceptance.** On a machine that has never run Chord Writer: install, launch,
see the modal offering Fernhill, open it, read the docs in the right panel,
run its transcript tests, and play it.

**Dependencies.** Phases 3 and 6.

---

## Item 5 — Missing-ifid diagnostic wording

Not a phase. `packages/chord/src/analyzer.ts:841` still tells authors to run
`sharpee ifid`, which is wrong now that Problems has a **Generate IFID**
button. Proposed replacement is in `todo-list.md`. A `packages/` change, so it
waits on David's sign-off, then folds into whatever phase is running.

---

## What this plan does not cover

Items David has not raised. The list is explicitly open and expected to grow;
when it does, this plan gets a phase rather than a footnote.
