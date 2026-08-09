# Session Summary: 2026-08-07 - feat/ide-go-live-phases-1-3 (CDT)

## Goals
- Diagnose and fix a workflow regression David noticed (Claude declining subagent use it hadn't declined before).
- Verify the premise of GH #238 (Docs tab nav mismatch) and decide its scope with David.
- Write the first author-facing Chord Writer documentation (none existed anywhere).
- Fix a stale-comment bug in devkit left behind by last session's ADR-284 work.
- Execute Phase 1 of the new `ide-docs-tab` plan: make the Docs tab bundler read `nav.ts` as the source of truth.
- Execute Phase 2: make the Docs tab UI render that nav data (rail tree, breadcrumbs, section-scoped pager).
- Commit the work and resolve whatever the DevArch test gate found blocking it.

## Phase Context
- **Plan**: `docs/work/ide-docs-tab/plan.md` — "Restructure the Chord Writer Documentation tab to mirror sharpee.net's real nav (GH #238)"
- **Phase executed**: Phase 1 — "Navigation-as-data in the bundler" (Medium), then Phase 2 — "Tab UI mirrors the site — nav tree, breadcrumbs, and a section-scoped pager" (Medium)
- **Tool calls used**: 203 / 250 (Phase 1); Phase 2 ran to completion in the same session, budget not separately tracked
- **Phase outcome**: Both phases completed. Plan is now fully DONE.

## Completed

### 1. Workflow regression traced to a Claude Code binary literal, not DevArch
David reported Claude repeatedly saying it had been told not to use subagents. Traced the strings "Do not call the AgentTool unless the user requested it" and "Do not use workflows or deep-research unless the user requested it" to literals in the Claude Code 2.1.224 binary itself, injected by a function gated on the model carrying the `opus_5_prompt_bundle` capability (kill switch `tengu_fennel_godwit`). Confirmed absence from `~/.devarch`, `~/.claude`, the repo's `.claude/settings*.json`, `~/.claude.json`, and the shell profile — fires by default on Opus 5 sessions, contradicting DEVARCH.md rules 3/15/16/18. Fix: added a new **Agents** section to the repo's `CLAUDE.md` (right after MAJOR DIRECTIONS) naming each DevArch lifecycle agent by rule number and declaring a standing user request — the condition the built-in defers to. Scoped narrowly: ad-hoc subagents (Explore, general-purpose, fan-out) still require asking.

### 2. GH #238 verified and scoped with David
Confirmed the issue's hypothesis by direct measurement: `tools/ide/web/docs-tab/build.mjs` derived page order/section/crumb from `readdirSync(dir).sort()` and never read `website/src/lib/nav.ts` (which already exports `pagerFor`/`crumbsFor`). Found zero orphans across 143 pages, alphabetical order opening the tab on `/chord/cookbook/containers-and-locks` instead of nav's real first page, and `/learn/*` mislabeled section `learn` instead of nav's title `Tutorial`. David's scope ruling (**D3**), recorded as GH #238 comment `issuecomment-5220574905`: ship the Chord bits only — the 2-page Sharpee section stays out, Tutorial (Fernhill) stays in. Zero-orphans promoted from an observation to an enforced build invariant.

### 3. New Chord Writer documentation
David ruled Getting Started in the IDE must be IDE-related (the app is already installed) and no author-facing Chord Writer documentation existed anywhere — not on sharpee.net, not in `docs/guides/`. Wrote four pages under `website/src/app/chord-writer/` (`/chord-writer`, `/your-first-story`, `/building-playing-and-testing`, `/publishing`), each grounded in verified source (`RightPanelViewController`/`BottomPanelViewController` for the 7+2 tabs, `MenuBuilder` for menus/shortcuts, `LandingPageViewController` for the launcher, `StoryScaffold` for the `.story`-only scaffold, `ComposeScheduler` for live compose, `BundledToolchain` for the vendored Node+devkit, `parser.ts:705` for publish-source) rather than assumption. Added a new first `nav.ts` section titled "Chord Writer", version 1.0.0. Route was initially `/ide`, renamed to `/chord-writer` because the site's search index humanizes URL segments for breadcrumbs (`/ide` → "Ide"; `chord-writer` → "Chord writer", matching the product name).

### 4. Real bug fixed in devkit (platform, authorized)
`packages/devkit/src/standalone/init-browser.ts` was stale in two places after last session's ADR-284 IR-embedding commit (`e913dd97`): the comment at 140-142 still cited the reversed 2026-07-18 compile-at-boot ruling, and line 160 printed "(Chord — compiles story.story at boot)" even though the template it describes imports `storyIR` and calls `createStory(storyIR)` directly. Fixed both, plus the same stale line reproduced verbatim in `website/src/app/chord/getting-started/first-story/content.mdx`.

### 5. Phase 1 of the ide-docs-tab plan — DONE
- New pure module `tools/ide/web/docs-tab/src/nav-bridge.mjs` — `shippedNav(nav, {sections, excludedGroups})` returns ordered `pages` + nested `tree`, walking only `section.groups` (so `/play`/`/playground` fall out structurally), throwing when a named section or excluded group doesn't exist.
- `build.mjs` transpiles `nav.ts` via esbuild's `transform` and imports it as a base64 data URL (no temp file). `SECTIONS = ['chord-writer','chord','learn']`, `NAV_SECTIONS = ['Chord Writer','Chord','Tutorial']`, `EXCLUDED_GROUPS = [{section:'Chord', group:'Getting Started'}]` (commented as a decision, not a bug). Emits a `nav` tree into `docs-index.json`; iterates in NAV order.
- Hard invariant enforced both directions: throws on mismatch, not just warns.

### 6. Commit `85d54966` landed Phase 1 + docs work, local only
`docs+fix(ide,website): Docs tab nav-driven build, Chord Writer docs, devkit staleness fix` — 31 files, +1112/-203. Not pushed at commit time. `scripts/clodpod.sh` was excluded from the commit and verified still present on disk afterward (it is deliberately untracked, per prior-session memory). The commit script also auto-archived two older session files into `docs/context/archive/` under its retention policy.

### 7. Dead package `docs/actions` blocked the commit gate — investigated and retired
The DevArch test gate failed on `docs/actions`, a directory that was never documentation but an abandoned package: `@sharpee/actions` v0.1.0, "Event-driven action system for Sharpee IF Platform," with `src/`, `examples/`, `tsconfig.json`, and workspace deps on core and world-model. Not a pnpm workspace member (`pnpm-workspace.yaml` covers `packages/*`, four extensions, four stories — nothing under `docs/`), no dependents, never built or published; last commit touching it `25e9c868`, 2026-01-14. Its `package.json` declared `"test": "vitest"` with zero test files, so vitest exited 1 on "no files found." `~/.devarch/scripts/git-assess.sh` discovers suites by filesystem walk (`find . -maxdepth 3`, any dir with a `package.json` carrying `scripts.test`, run via `npm test --silent`) rather than by workspace membership, so it picked up a package pnpm ignores. The script itself was last written 2026-08-07 04:08, between the previous session and this one — the package didn't start failing, the gate started looking at it. David confirmed the gate fix is correct behavior and the monorepo has legacy to clean up. **David's decision: delete `docs/actions/package.json`** (via `git rm`); `src/`, `examples/`, `README.md`, `tsconfig.json` deliberately kept. Verified fix: `DEVARCH_TEST_DETECT_ONLY=1 bash ~/.devarch/scripts/git-assess.sh` → 36 suites, none of them docs/actions. Related but unactioned: the same gate detects `packages/interpreter/src-tauri` via Cargo.toml despite `pnpm-workspace.yaml` excluding `packages/interpreter` with `!packages/interpreter` — not failing, not blocking, noted for later.

### 8. Phase 2 of the ide-docs-tab plan — DONE
`tools/ide/web/docs-tab/src/main.ts`, `src/docs.css`, and `tools/ide/SharpeeIDETests/DocsTabRealPathTests.swift`:
- The rail renders `index.nav` as section → group → item, replacing the old two-URL-segment bucketing. `groups()` and `humanize()` deleted.
- An item's children render only while the reader is on that branch (nav.ts's own documented rule for `children`).
- New section-scoped pager (`buildSteps`), mirroring `pagerFor` including its rule that a generic "Overview" is labeled with its group's title. Never crosses a section boundary.
- `boot()` now opens `index.pages[0]` rather than the hardcoded `/chord/getting-started/first-story`, which is no longer bundled at all.
- Search results stay deliberately flat, with a comment saying so.
- `docs.css` gains three rail levels plus pager styles, built only from existing `--fg`/`--fg-dim`/`--fg-faint`/`--accent`/`--border` tokens, so both palettes are covered with no new light/dark branching (ADR-297).

Evidence:
- `xcodebuild -project SharpeeIDE.xcodeproj -scheme SharpeeIDE -destination 'platform=macOS' test -only-testing:SharpeeIDETests/DocsTabRealPathTests` → `** TEST SUCCEEDED **`, `Executed 15 tests, with 0 failures` in 4.1s.
- `npx vitest run` in tools/ide/web/docs-tab → 43 passed (3 files).
- `bash tools/ide/build-docs-tab.sh` → `144 pages in nav order, 3 excluded by EXCLUDED_GROUPS (Chord 3.0.0)`.
- D2 verified by grep: no localStorage/sessionStorage/UserDefaults in the tab's JS or Swift.
- `main.ts` typechecked against its HEAD baseline: zero NEW type errors (the 4 reported are identical before and after, caused by the file having no import/export so `declare global` is invalid; there is no tsconfig — esbuild bundles without typechecking).

Technique note: the first xcodebuild run's diagnostics were lost because the command was piped through `tail -50`; the `.xcresult` bundle was read via `xcrun xcresulttool` instead of re-running.

## Key Decisions

### 1. DevArch agent standing-request lives in CLAUDE.md, not ~/.devarch/DEVARCH.md
The latter is overwritten by `devarch update`; the fix needed to survive that.

### 2. Product name is "Chord Writer," not "the Sharpee IDE"
`AppIdentity.productName`, `CFBundleDisplayName`, and the landing page all say Chord Writer; `SharpeeIDE` is only the internal Xcode target name and never reaches the UI. Used consistently across the four new docs pages and the plan.

### 3. NAV data does not replace the page `title` (deviation from the original plan)
NAV item titles are rail labels (`/chord/guide/world` is "Overview" in the rail, "Building your world" as a heading). Replacing `title` would have broken most section-opening page headings. `pages[]` now carries both `title` (unchanged `<DocPage title>`) and `navTitle` (rail label); order/`section`/`crumb` come from NAV as planned. Recorded in the plan as a deliberate deviation.

### 4. Group-level exclusion is a named decision, not a bug
`Chord › Getting Started` (CLI install/scaffold/run instructions) is dropped from the shipped bundle, superseded by the new Chord Writer section. Declared as `EXCLUDED_GROUPS` with a rationale comment so a future reader doesn't "fix" it back in — the plan explicitly warns against reading D1 ("mirror the site's nav") literally here.

### 5. Chord language version corrected to 3.0.0 in nav.ts
`nav.ts` advertised the Chord section as 2.1.0 while `CHORD_LANGUAGE_VERSION` is 3.0.0. David clarified the language is frozen at 3.0.0 and its version is unrelated to package versions; set with a comment recording the distinction.

### 6. On-branch children is user-visible and reversible
Rendering an item's children only while the reader is on that branch drops the resting rail from 144 links to 87, which broke `testTheNavigationListsTheCorpusAndFiltersIt`'s `> 100` assertion. Rather than lower the number silently, that test now asserts every top-level item is present at rest, and a new test proves the reachability the old count implied. Reversing it = remove the `onBranch` guard in `renderNavTree` and restore the old assertion.

### 7. A test was wrong, not the code, in the pager suite
`testThePagerFollowsNavOrder` asserted the previous link read "Overview" and failed with "Getting Started." `buildSteps` correctly mirrors `pagerFor`'s group-title relabel; the test's expectation was corrected and the reasoning recorded inline in the test.

## Next Phase
Plan complete — all phases done. `docs/work/ide-docs-tab/plan.md` has no remaining PENDING phase; GH #238 is functionally closed on the code side (deployment excepted — see Open Items).

## Open Items

### Short Term
- Deployment of the four Chord Writer pages (and the restructured Docs tab bundle) to sharpee.net is David's, explicitly.
- `~/.npmrc` sets `ignore-scripts=true`, so `npm run build` in `website/` does NOT run the `prebuild` search-index step — a locally-built deploy ships a stale `public/search-index.json` unless the script is run manually. Affects every page added since that flag went in, not just this session's four.

### Long Term
- Carried from prior session: ADR amendments for ADR-210/251/284/298, orphaned `StoryHeaderPublishSource.swift` + 11 tests, cover art / Treaty of Babel, nothing surfaces feelies to the player.

## Files Modified

**Workflow fix** (1 file):
- `CLAUDE.md` - new Agents section naming DevArch lifecycle agents + standing user request, scoped to exclude ad-hoc subagents

**Devkit bugfix** (2 files):
- `packages/devkit/src/standalone/init-browser.ts` - fixed comment/log line left stale by ADR-284 (still described compile-at-boot after IR-embedding shipped)
- `website/src/app/chord/getting-started/first-story/content.mdx` - fixed the same stale line reproduced in docs prose

**New Chord Writer documentation** (website/src/app/chord-writer/, 4 pages × content.mdx + page.tsx, plus nav):
- `website/src/lib/nav.ts` - new first NAV section "Chord Writer" v1.0.0; Chord section language-version corrected 2.1.0 → 3.0.0

**Docs tab bundler — Phase 1** (3 files):
- `tools/ide/web/docs-tab/build.mjs` - transpiles `nav.ts` via esbuild, walks NAV order instead of alphabetical `readdirSync`, emits `nav` tree field, enforces the shipped=walked−excluded invariant
- `tools/ide/web/docs-tab/src/nav-bridge.mjs` (new) - pure `shippedNav()` module
- `tools/ide/web/docs-tab/tests/nav-bridge.test.mjs` (new) - 18 new unit tests

**Docs tab UI — Phase 2** (3 files):
- `tools/ide/web/docs-tab/src/main.ts` - nav-tree rail (section → group → item), on-branch children, section-scoped pager (`buildSteps`), `boot()` opens `index.pages[0]`; `groups()`/`humanize()` deleted
- `tools/ide/web/docs-tab/src/docs.css` - three rail indentation levels + pager styles, existing theme tokens only
- `tools/ide/SharpeeIDETests/DocsTabRealPathTests.swift` - real WKWebView acceptance suite, 15 tests (rule 13a real-path gate)

**Planning**:
- `docs/work/ide-docs-tab/plan.md` (2 phases, both now DONE)
- `docs/context/.current-plan` - pointer updated to the new plan

**Retired dead package**:
- `docs/actions/package.json` - deleted (`git rm`); `src/`, `examples/`, `README.md`, `tsconfig.json` deliberately kept. Unblocked the DevArch test gate, which had begun walking it as a spurious 37th suite.

**Generated build output** (produced by `build.mjs` / `next build`, not hand-edited): `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json`, `docs.js`, 4 new `pages/chord-writer*.html`, 3 removed `pages/chord__getting-started__*.html`; `website/public/search-index.json`.

**Commit**: `85d54966` — `docs+fix(ide,website): Docs tab nav-driven build, Chord Writer docs, devkit staleness fix`, 31 files, +1112/-203. Local only as of this writing (not pushed). `scripts/clodpod.sh` excluded and confirmed still on disk; commit script auto-archived two older session files into `docs/context/archive/`.

## Notes

**Session duration**: ~2h15m Phase 1 (17:59–20:13 UTC / ~13:00–15:13 CDT) plus Phase 2 and the docs/actions cleanup in the same session.

**Approach**: Verification-first (measured GH #238's hypothesis before scoping rather than trusting it), new docs grounded in cited source files rather than assumption, test derivation via Behavior Statement for `nav-bridge.mjs` before writing its suite, and investigating the gate failure (docs/actions) to a root cause rather than overriding it.

---

## Session Metadata

- **Status**: COMPLETE — both plan phases done. GH #238 is functionally closed: the tab opens on Chord Writer's Overview instead of the middle of the Cookbook, the rail reads section → group → item from nav.ts, `/learn/*` is labeled Tutorial, breadcrumbs show real trails, and pages end in a section-scoped prev/next.
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — feature branch, nothing merged to main; commit `85d54966` is local only, not pushed. Changes are additive docs/tooling, two comment fixes, and one dead-package deletion (`docs/actions/package.json`, never a workspace member).

## Dependency/Prerequisite Check

- **Prerequisites met**: esbuild already a `build.mjs` dependency, used to transpile `nav.ts` to ESM at build time; `website/src/lib/nav.ts` already exported `pagerFor`/`crumbsFor` for Phase 2 to reuse.
- **Prerequisites discovered**: none blocking.

## Architectural Decisions

- None this session — no `docs/architecture/adrs/*.md` file was created or modified. Scope and naming decisions (D3, the route rename, the group exclusion) were recorded in the GH #238 comment and the plan's own text instead.

## Mutation Audit

- Files with state-changing logic modified: `tools/ide/web/docs-tab/build.mjs`, `tools/ide/web/docs-tab/src/nav-bridge.mjs`.
- Tests verify actual state mutations (not just events): YES (evidence: `npx vitest run` → "Test Files 3 passed (3) · Tests 43 passed (43)", event-log timestamp `2026-08-07T20:13:04Z`, after the last edit to `nav.ts`/`build.mjs`/`nav-bridge.mjs` at `20:12:59Z`). Both invariant directions were additionally verified by injection against the real emitted `docs-index.json` (an unlisted `content.mdx` and a removed nav-named page each threw the expected error), not by code inspection alone.

## Recurrence Check

- Similar to past issue? YES (related, n=1 so far) — the stale devkit comment (item 4) was left behind by the immediately preceding session's ADR-284 IR-embedding commit (`e913dd97`), caught and fixed same-day rather than surfacing as a separate future bug report. Not yet a recurring category; worth a quick grep for other comments still describing pre-ADR-284 compile-at-boot behavior if a third instance turns up.
- If YES: consider a one-time grep sweep of `packages/devkit` and `website/` for "compiles story.story at boot" / "compile-at-boot" language before Phase 2 ships.
- Separately, docs/actions (item 7) is not a recurrence of a prior *bug* but is worth flagging as a category: a filesystem-walking test-discovery script picking up abandoned, non-workspace packages. Worth a one-time scan for other `docs/` or top-level dirs with a stray `package.json` carrying a `test` script but no workspace membership, so this doesn't resurface as gate friction on a different dead directory.

## Test Coverage Delta

- Tests added: 18 (`tools/ide/web/docs-tab/tests/nav-bridge.test.mjs`, Phase 1) + 15 (`tools/ide/SharpeeIDETests/DocsTabRealPathTests.swift`, Phase 2, real WKWebView acceptance suite per rule 13a).
- Tests passing before: not captured pre-session → after (session end): DocsTabRealPathTests 15/15 (evidence: `xcodebuild ... -only-testing:SharpeeIDETests/DocsTabRealPathTests` → `** TEST SUCCEEDED **`, "Executed 15 tests, with 0 failures" in 4.1s); docs-tab vitest 43/43 across 3 files (evidence: `npx vitest run`, event-log `2026-08-07T20:13:04Z`, "43 passed" — fresh relative to the last edit at `20:12:59Z`); `@sharpee/devkit` 153 passed, 1 skipped (evidence: `pnpm --filter '@sharpee/devkit' test` → `Test Files 23 passed | 1 skipped (24)`, `Tests 153 passed | 1 skipped (154)`, 2026-08-07); website `next build` clean.
- Known untested areas: nothing carried from Phase 2 — the rendered UI now has real-path coverage. Deployment behavior (stale `search-index.json` under `ignore-scripts=true`) remains unverified in an actual deploy, since deployment is David's step.

---

**Progressive update**: Session completed 2026-08-07 (CDT) — Phase 1 update at 15:16 CDT, folded in Phase 2 completion, the docs/actions gate fix, and commit `85d54966` afterward.
