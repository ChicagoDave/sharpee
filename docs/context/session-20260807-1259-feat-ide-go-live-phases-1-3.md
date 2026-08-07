# Session Summary: 2026-08-07 - feat/ide-go-live-phases-1-3 (CDT)

## Goals
- Diagnose and fix a workflow regression David noticed (Claude declining subagent use it hadn't declined before).
- Verify the premise of GH #238 (Docs tab nav mismatch) and decide its scope with David.
- Write the first author-facing Chord Writer documentation (none existed anywhere).
- Fix a stale-comment bug in devkit left behind by last session's ADR-284 work.
- Execute Phase 1 of the new `ide-docs-tab` plan: make the Docs tab bundler read `nav.ts` as the source of truth.

## Phase Context
- **Plan**: `docs/work/ide-docs-tab/plan.md` — "Restructure the Chord Writer Documentation tab to mirror sharpee.net's real nav (GH #238)"
- **Phase executed**: Phase 1 — "Navigation-as-data in the bundler" (Medium)
- **Tool calls used**: 203 / 250
- **Phase outcome**: Completed under budget

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

## Next Phase
- **Phase 2**: "Tab UI mirrors the site — nav tree, breadcrumbs, and a section-scoped pager" — nested rail rendering from `index.nav`, section-scoped prev/next pager, forced default landing page `/chord-writer`, `docs.css` indentation/pager styles, and Swift real-path `DocsTabRealPathTests.swift` assertions (rule 13a: this phase touches the rendered surface, so the acceptance gate is a real WKWebView test, not a JS-only unit test standing in for it).
- **Tier**: Medium (250 tool-call budget)
- **Entry state**: `docs-index.json` carries a `nav` field (filtered, exclusion-applied tree) and `pages[]` in NAV order with NAV-derived `title`/`section`/`crumb`, 144 pages, first href `/chord-writer`. Marked CURRENT in the plan; approved by David to start next session.

## Open Items

### Short Term
- Phase 2 implementation (nav tree UI, pager, Swift real-path tests).
- Deployment to sharpee.net is David's, explicitly.
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

**Planning**:
- `docs/work/ide-docs-tab/plan.md` (new, 2 phases, amended twice same day)
- `docs/context/.current-plan` - pointer updated to the new plan

**Generated build output** (produced by `build.mjs` / `next build`, not hand-edited): `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json`, `docs.js`, 4 new `pages/chord-writer*.html`, 3 removed `pages/chord__getting-started__*.html`; `website/public/search-index.json`.

## Notes

**Session duration**: ~2h15m (17:59–20:13 UTC / ~13:00–15:13 CDT)

**Approach**: Verification-first (measured GH #238's hypothesis before scoping rather than trusting it), new docs grounded in cited source files rather than assumption, and test derivation via Behavior Statement for `nav-bridge.mjs` before writing its suite.

---

## Session Metadata

- **Status**: IN PROGRESS — Phase 1 COMPLETE, Phase 2 CURRENT and starting immediately after this commit
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — feature branch, nothing merged to main; changes are additive docs/tooling plus two comment fixes

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

## Test Coverage Delta

- Tests added: 18 (`tools/ide/web/docs-tab/tests/nav-bridge.test.mjs`).
- Tests passing before: not captured pre-session → after: 43 across 3 files (evidence: `npx vitest run`, event-log `2026-08-07T20:13:04Z`, "43 passed" — fresh relative to the last edit at `20:12:59Z`).
- Known untested areas: Phase 2's rendered UI (nav tree, pager, forced landing page) has no test yet — deferred to Phase 2's Swift real-path suite per the plan. The devkit suite count was re-run at commit time rather than carried forward as a claim: `pnpm --filter '@sharpee/devkit' test` → `Test Files 23 passed | 1 skipped (24)`, `Tests 153 passed | 1 skipped (154)` (2026-08-07).

---

**Progressive update**: Session completed 2026-08-07 15:16 CDT
