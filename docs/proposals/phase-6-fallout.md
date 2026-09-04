# Proposal: Phase 6 fallout — theming and transcript authoring

**Status**: PLANNED — `proposal-review` ran 2026-08-08 (2 blocking, 2 advisory). P-1's blocker dissolved by David's reframe (author-picked corral = ADR-188's own model given a UI); P-5's blocker resolved by ADR-304 (testing workspace layout). All seven items ACCEPTED, then PLANNED (2026-08-08). David's ruling: this is part of go-live — the phases are tracked as the go-live plan's **Phase 6 remediation track (6a–6f)** in `docs/work/ide-go-live/plan-20260806-go-live.md` (detail reference: `docs/work/phase-6-fallout/plan-20260808-phase-6-fallout.md`, MERGED).
**Origin**: issue set — GitHub issues 248–254, filed 2026-08-08 during the go-live Phase 6 acceptance pass (content summarized below; David: "this will be iterative")
**Date**: 2026-08-08
**Session**: c29681

Seven work items that fell out of writing Fernhill's transcripts through the
editor (phase-6 acceptance log, F5–F9 and the theming thread). Two clusters:
theming/publish (P-1..P-4) and transcript-authoring UX (P-5..P-7). Context
already landed this session and NOT in scope here: theme lists restored to
Fernhill + both scaffolds (issue 249's Fix A), the D1/D2 create-and-first-
command fixes, the F2 [NEW]/orange markers, the F3 selection fix, and F1's
skipped-transcript semantics.

## Items

### P-1: IDE theme corral — the author picks which built-in themes their story ships
- **Done when**: the IDE offers the full corral of built-in themes with per-story include/exclude; the choice is written into the story's `themes:` header line by the editor (the author never types the field, same ownership pattern as `continues:`); build and publish continue to honor the list unchanged. Pinned by a real-path test: toggle a theme in the corral → the `.story` header changes → the next build's `dist/web/themes/` matches. (Issue 249 Fix B, reframed by David 2026-08-08: "up to the author — a corral of themes in the IDE and the author can pick which ones to include in the publish." Keeps ADR-188's select-by-id model intact — this is its UI.)
- **Status**: PLANNED

### P-2: Chord Writer play-surface theme picker
- **Done when**: a picker (Play header or View menu) lists Classic + all built-ins regardless of what the story ships, applies live and at boot with no theme flash, persists per-user in UserDefaults, and writes nothing into the story; the CSS supply is IDE-side — the vendored platform-browser theme CSS injected into the play page as IDE chrome (playSurfaceScript precedent; the built bundle stays untouched); a real-path test drives the pick and asserts `data-theme` on the play page. (Issue 250; the black-on-white author preference is `paper`. No longer depends on P-1.)
- **Status**: PLANNED

### P-3: Web-client Reset menu item
- **Done when**: the published client's menu offers Reset; confirming it deletes every storage key under the story's storage prefix (saves, autosave, theme preference) and restarts the story; a real-path test verifies the keys are gone. (Issue 248. Open UX points: which menu, confirmation shape, restart-after-wipe.)
- **Status**: DONE — built 2026-08-08 under `docs/work/ide-go-live/plan-20260806-go-live.md` Phase 6a (session c29681): `wipeStoryStorage` + `handleReset` + `#menu-reset`, confirmation, reboot to classic, real-path build test and Playwright live-client spec. Issue 248 closed 2026-09-03. (The 2026-09-03 session b6d0a8 stamp "superseded by publish-readiness-defects P-34 — no plan file exists for this item" was wrong and is withdrawn; P-34 is recorded DONE as already built, session 639650.)

### P-4: ThemeManager renders its own theme menu
- **Done when**: the build-time `#theme-menu` regex rewrite in `injectThemes` is gone (link injection stays); the menu renders at runtime from the wired theme list; existing switching/persistence behavior stays green; ADR-253 custom pages that keep `#theme-menu` get it populated the same way. (Issue 251 — do alongside P-3, same code.)
- **Status**: PLANNED

### P-5: Testing workspace — Play and Testing side by side
- **Done when**: selecting the Testing tab puts the Play surface in the left pane with an unmissable Exit Testing action; entering/exiting preserves the running story (no web-view reload) and restores the editor's open document and scroll position. (Issue 252 — David's modal-workspace shape, deliberately not Inform's any-tab-in-any-pane. Decided in ADR-304.)
- **Status**: PLANNED

### P-6: Auto-assertion policy for new commands
- **Done when**: a Testing setting offers room description / room name + room description / all emitted text / let me decide (default unchanged, the current [SKIP]-placeholder flow); on a new command's first run the chosen assertion is written automatically; covered at runner + editor level. (Issue 253. Mechanics: the policy fires on first RUN — room name/location from the world capture, all-emitted-text is the golden per-command shape. Open: where the setting lives, per-story vs per-user.)
- **Status**: PLANNED

### P-7: Create Transcript from played commands
- **Done when**: the Play pane offers a left-margin selection over played turns and a Create Transcript action; the created file holds exactly the selected commands with the play session's seed pinned; P-6's policy applies at creation; a real-path test plays, selects, creates, and the resulting transcript passes a run. (Issue 254. Open design points: mid-session selections' ancestry prefix, meta commands in the selection. Depends on P-6; composes with P-5.)
- **Status**: PLANNED
