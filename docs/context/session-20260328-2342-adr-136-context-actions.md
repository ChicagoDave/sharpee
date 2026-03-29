# Session Summary: 2026-03-28 - adr-136-context-actions (CST)

## Goals
- Implement all 7 phases of ADR-136 (Context-Driven Action Menus)
- Ship a working authoring loop: compute → preview → edit visually → export YAML → rebuild

## Phase Context
- **Plan**: ADR-136 Context-Driven Action Menus (`docs/context/plan.md`)
- **Phase executed**: All 7 phases — "Build Flag + Core Types" through "Browser Action Editor"
- **Tool calls used**: 645 / 100 (budget was per-phase; total far exceeded single-phase budget due to running all phases in one session)
- **Phase outcome**: All phases completed; went well over per-phase budget but delivered full scope in one session

## Completed

### Phase 1 — Build Flag + Core Types
- Added `--include-context-actions` flag to `build.sh` with esbuild `--define:globalThis.INCLUDE_CONTEXT_ACTIONS=true/false` injected into CLI, test, and browser bundles
- Created `packages/if-domain/src/context-actions.ts` defining `ContextAction`, `ContextActionCategory`, and `ActionMenuConfig` types
- Added `ActionsMessage` and `ClientCapabilities` interfaces to `packages/bridge/src/protocol.ts`
- Extended `StartMessage` with `capabilities` field

### Phase 2 — ActionMenuComputer Module
- Created `packages/engine/src/action-menu-computer.ts` with `compute()` (player menu, baseline-only) and `computeAll()` (editor palette, all grammar x entity combinations) methods
- Grammar x scope x traits computation with deduplication, sorting, and capping
- 11 unit tests (refactored down from 13 after the baseline-only design pivot)

### Phase 3 — Engine Integration + Bridge Flush
- Added `'actions:computed'` and `'actions:palette'` engine events
- Added `actions?: ContextAction[]` to `TurnResult`
- Bridge flush order updated: blocks → events → status → actions
- `setActionMenuConfig()` and `setActionOverrides()` methods added to engine

### Phase 4 — CLI Preview Mode
- `--show-actions` flag displays the full grammar palette after each turn
- `formatActions()` with ANSI color formatting grouped by category
- Works in exec, play, and test modes
- Sets `globalThis.INCLUDE_CONTEXT_ACTIONS = true` at runtime when flag is present

### Phase 5 — actions.yaml Compiler
- Created `packages/engine/src/actions-yaml-compiler.ts` with `parseAndCompileActionsYaml()` parsing YAML into `ActionMenuConfig` + `CompiledActionOverrides`
- Full schema validation with `ActionsYamlError`
- `--generate-actions-yaml` CLI flag generates a starter YAML file
- 27 compiler unit tests
- Engine and CLI both auto-load `actions.yaml` from the story directory

### Phase 6 — Browser Action Sidebar
- Created `packages/platform-browser/src/managers/ActionSidebarManager.ts`
- Renders `ContextAction[]` as clickable buttons grouped by category
- Auto-shows on first palette update; theme-aware CSS via variables
- Wired into `BrowserClient` via `'actions:computed'` and `'actions:palette'` events
- `templates/browser/index.html` updated with `#content-area` flex wrapper and `#action-sidebar`
- Full CSS added to `templates/browser/infocom.css`

### Phase 7 — Browser Action Editor
- Editor mode toggled via Edit/Done button in the sidebar toolbar
- Add-oriented model: the full palette is shown dimmed; author clicks "+" to include specific actions
- Pick count displayed in toolbar; click-to-edit labels on included items
- Export copies `actions.yaml` content (only picked actions as hints) to clipboard
- Clear button resets all picks

### Design Pivot — Baseline-Only Player Menu
Late in the session, after struggling with filtering complexity (validation passes, trait requirements), David directed a fundamental redesign:
- `compute()` (player menu): shows only baseline — directions from room exits and intransitives (look, inventory, wait)
- `computeAll()` (editor palette): shows ALL grammar x entity combinations
- Entity-targeted actions appear in the player menu only when explicitly added by the author via `actions.yaml` hints
- The editor is "add what you want" not "remove what you don't want"
- Eliminated all complexity around auto-filtering nonsensical actions

## Key Decisions

### 1. Baseline-Only Player Menu
`compute()` returns only directions and intransitives. Entity-targeted verbs are author-curated through `actions.yaml`. This avoids surfacing invalid actions (e.g., OPEN a box that is already open) and keeps the player menu intentional rather than exhaustive.

### 2. Two-API Design: compute() vs computeAll()
`compute()` is what the game engine calls each turn for players. `computeAll()` is what the editor calls to populate the full palette for authoring decisions. Keeps runtime cost low while giving authors full visibility.

### 3. Add-Oriented Editor
Authors pick what to show rather than suppressing what they do not want. The palette displays everything dimmed; authors click "+" on each action they want to surface. Exported YAML contains only the picked actions as hints. This is simpler to reason about than a suppression model.

### 4. actions.yaml as Hints, Not Suppressions
The primary YAML mechanism is `hints:` (actions to include), not `suppress:`. Since the baseline is already minimal, there is nothing to suppress by default. This aligns with the add-oriented editor model.

### 5. Budget Overrun Was Acceptable
All 7 phases were planned at separate budgets (100+250+100+100+250+250+250 = 1300 total). Delivering them in one session exceeded any single-phase budget but was the right tradeoff given the highly related work and momentum.

## Next Phase
Plan complete — all phases done. Future refinement could include per-room action sets, condition-based hints, and more granular palette filtering, but those are not scoped in the current ADR.

## Open Items

### Short Term
- Test the browser action editor end-to-end with a real dungeo build
- Verify `--generate-actions-yaml` produces useful output for the dungeo story
- Confirm the `if-domain` peer dependency in `platform-browser/package.json` resolves correctly in all build modes

### Long Term
- Per-room action overrides (different hint sets for specific rooms)
- Condition-based hint visibility using trait state (ADR-124 style)
- Compass-rose direction rendering in the browser sidebar
- Zifmia client support for `ActionsMessage`

## Files Modified

**New files** (6 files):
- `packages/if-domain/src/context-actions.ts` — ContextAction, ContextActionCategory, ActionMenuConfig types
- `packages/engine/src/action-menu-computer.ts` — compute() and computeAll() module
- `packages/engine/src/actions-yaml-compiler.ts` — YAML parser and compiler
- `packages/engine/tests/action-menu-computer.test.ts` — 11 unit tests
- `packages/engine/tests/actions-yaml-compiler.test.ts` — 27 unit tests
- `packages/platform-browser/src/managers/ActionSidebarManager.ts` — Browser sidebar manager

**Modified files** (15 files):
- `build.sh` — `--include-context-actions` flag and esbuild defines
- `packages/if-domain/src/index.ts` — re-exports context-actions
- `packages/bridge/src/protocol.ts` — ActionsMessage, ClientCapabilities
- `packages/bridge/src/bridge.ts` — actions accumulation and flush order
- `packages/engine/src/index.ts` — exports for new modules
- `packages/engine/src/types.ts` — TurnResult.actions field
- `packages/engine/src/game-engine.ts` — ActionMenuComputer integration and events
- `packages/platform-browser/src/types.ts` — DOMElements.actionSidebar
- `packages/platform-browser/src/BrowserClient.ts` — sidebar wiring
- `packages/platform-browser/src/managers/index.ts` — ActionSidebarManager export
- `packages/platform-browser/package.json` — if-domain peer dependency
- `templates/browser/index.html` — sidebar HTML and flex wrapper
- `templates/browser/infocom.css` — sidebar and editor CSS
- `stories/dungeo/src/browser-entry.ts` — actionSidebar element reference
- `scripts/bundle-entry.js` — --show-actions, --generate-actions-yaml, computeActionPalette

## Notes

**Session duration**: ~8 hours (all 7 phases in one run)

**Approach**: Vertical delivery — each phase built on and integrated with the previous. The design pivot in Phase 7 propagated backwards into the computer module API (adding `computeAll()`, narrowing `compute()` to baseline) rather than requiring a full rewrite.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-136 written; branch created; grammar engine exposes `getRules()`; bridge protocol extensible; browser client has manager pattern
- **Prerequisites discovered**: None

## Architectural Decisions

- Add-oriented authoring model — player menu is opt-in (author adds hints), not opt-out (author suppresses)
- Two-tier API: `compute()` for runtime (minimal, fast), `computeAll()` for editor (exhaustive, authoring only)
- Build-flag tree-shaking via `globalThis.INCLUDE_CONTEXT_ACTIONS` esbuild define — zero overhead for builds without the flag

## Mutation Audit

- Files with state-changing logic modified: `game-engine.ts` (attaches actions to TurnResult), `bridge.ts` (accumulates and flushes ActionsMessage), `ActionSidebarManager.ts` (DOM mutation for picks and labels)
- Tests verify actual state mutations (not just events): YES — action-menu-computer tests assert on returned ContextAction arrays; compiler tests assert on parsed ActionMenuConfig shape
- DOM mutations in ActionSidebarManager have no automated browser tests (N/A for that layer)

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: 38 (11 action-menu-computer + 27 actions-yaml-compiler)
- Tests passing before: baseline walkthrough chain + unit transcripts
- Tests passing after: 38 new passing; walkthrough regression unaffected
- Known untested areas: ActionSidebarManager DOM behavior; browser editor export flow; end-to-end actions.yaml → rebuild → runtime round-trip

---

**Progressive update**: Session completed 2026-03-29 02:11 CST
