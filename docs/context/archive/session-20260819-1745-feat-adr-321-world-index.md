# Session Summary: 2026-08-19 - feat/adr-321-world-index

## Goals
- Execute Phase 6 of `docs/work/world-index/plan.md` — the IDE World tab (ADR-321 D8).
- Extended by David mid-session into a platform change (devkit `world-index` command) and into starting Phase 8 (ADR-321 Amendment 1).

## Phase Context
- **Plan**: ADR-321 — The World Index (Map, Reach, Incomplete) — `docs/work/world-index/plan.md`.
- **Phase executed**: Phase 6 — "IDE World tab (D8) — Map / Reach / Incomplete views in SharpeeIDE" (Medium, 250 tool calls), then Phase 8 begun — "Amendment 1 — response prose, POS re-heading, and mention roles" (Large, 400 tool calls).
- **Tool calls used**: not tracked (session state file is empty — hook did not populate it this session).
- **Phase outcome**: Phase 6 code and tests complete; ran over budget scope (blocker fix + platform change were not in the original Phase 6 deliverable) but stayed within a plausible tool-call range for a Medium+Large combined session. Phase 6 does not close — exit state requires David's own confirmation the tab renders, not just a green suite. Phase 8 partially completed: D10 and D14 done, D12/D11/D13 remain.

## Completed

### Blocker cleared first — IDE build had been failing for days
`tools/ide/web/docs-tab/build.mjs` evaluated `website/src/lib/nav.ts` from a `data:` URL; `nav.ts` had gained `import versions from './versions.json'`, a relative specifier a `data:` URL cannot resolve (Node v25.8.1, `ERR_UNSUPPORTED_RESOLVE_REQUEST`). Fixed by bundling with esbuild instead of transforming, so the data URL never has to resolve anything the website adds later. A second website-drift defect surfaced behind it: `<StatusBarExample>` appeared in the corpus with no handler in `mdx.mjs`; taught `mdx.mjs` to render it from the same `website/src/lib/versions.json` the website component reads, so the two surfaces can't name different releases. Docs bundle rebuilds clean: 159 pages, `chord-writer.html` carries "Chord Writer 1.3.1 · Sharpee 5.1.1 / Chord 3.3.0".

### Phase 6 — IDE World tab
Seven new files under `tools/ide/SharpeeIDE/World/`: `WorldIndexDocument.swift` (Swift half of the wire contract, schema-guarded), `WorldIndexRunner.swift` (subprocess, resolution, failure-as-result), `WorldFindingTable.swift` (shared sectioned list), `WorldMapView.swift` (compass grid, one band per z-level, collision/skew/unplaced notes), `WorldReachView.swift`, `WorldIncompleteView.swift`, `WorldView.swift` (the tab + AC-9 explanatory states), plus `tools/ide/SharpeeIDETests/WorldIndexTests.swift`. Wired into `RightPanelViewController` (World appended at index 7, so persisted tab indices keep meaning), `Theme.swift` (9 new `dynamic(light:dark:)` pairs per ADR-297), `BuildController` (derives after a successful build), `MainWindow` (forwarding, source-line jump on double-click, clears on project switch).

### Platform change (David-approved) — analyzer reached via devkit, not a checkout-only script path
`sharpee world-index <story>.ir.json` added to `packages/devkit` (one dep line, `src/commands/world-index.ts` + its test). The analysis moved to `packages/world-index/src/analyze.ts` (`analyzeStoryIR`) so the package's own `cli.js` and the devkit command cannot disagree about what a failure is called. The IDE resolves it via `ComposeRunner.resolveSharpee` — the same three tiers as build/compose/test/play, riding the sealed bundled toolchain. This replaced a checkout-only script path that would have left a permanently empty World tab for any author outside the monorepo.

### D15 (David's ruling) — derivation off the main actor, behind a loading state
`WorldIndexRunner.interpret` is `nonisolated` and decodes in the child's termination handler; `WorldView` gains `showLoading()`, cleared by an analysis AND by a failure.

### Phase 8 started — ADR-321 Amendment 1 (D10–D15, D11a contracts)
Arose from David's question about how nouns in room descriptions and NPC/action messages get identified. Every figure below was measured on Fernhill, not estimated.
- **`/adr-review`**: first pass scored 6/13 BLOCKED — the resolution boundary was undischargeable (the IDE was asked to chunk phrases it had nothing to resolve against). Fixed to 13/13 by publishing a 2.3KB vocabulary surface on the wire, bumping the schema, writing real TypeScript signatures into a new D11a, and adding AC-16.
- **D10 (done)**: new `packages/world-index/src/prose.ts` (`collectProse` → `ProseSite[]`); `incomplete.ts` iterates passages, not entities; findings carry `site: ProseSite`. Wire bumped to `world-index/2` in `document.ts` and `WorldIndexDocument.swift` together. Description-half corpus pins are unchanged (Fernhill 20/9/58, The Alderman 4/0/36, Ides of March 7/0/30), proving the walk is a strict superset; response prose adds Fernhill +3/+5/+78, The Alderman +1/+0/+89, Ides of March +10/+1/+184 (94 of its 113 passages are response prose).
- **D14 (done)**: `obstacleOn` returns a verdict carrying `requires`; `ReachResult` gains `lifted[]` and `progression[]`; `machineDrivers` reads `ir.machines` and resolves roles to entities. Fernhill's chain is boiler, stopcock, primer-plunger, mrs-kettle, cellar-door, tarnished-key — the static-scan alternative produces the same count and a different set (invents `folly-door`/`pantry-door`, which never lock; misses both machine triggers). Two latent bugs fixed along the way: an exit with both a gate and a locked door had its door unexamined; an obstacle overcome on first sight was never recorded, making the chain walk-order dependent.
- **Remaining**: D12 (roles), D11 (POS re-heading + dropping the article gate), D13 (unnamed-tool finding).

## Key Decisions

### 1. Docs-tab pre-build bundles instead of transforms
Bundling `nav.ts` with esbuild (rather than evaluating it from a `data:` URL) makes the pre-build immune to future relative imports the website adds — a structural fix, not a one-off patch for `versions.json`.

### 2. World-index analysis reached through the author CLI, not a checkout-relative script path
The original Phase 6 deliverable assumed `packages/world-index/dist/cli.js` would be resolved directly from `BuildController`; that only works inside a monorepo checkout. David approved moving the entry point to `@sharpee/devkit` (`sharpee world-index`) so the IDE uses the same `ComposeRunner.resolveSharpee` tiering as every other subprocess it spawns, working for any author regardless of install shape.

### 3. Analysis logic centralized in `analyze.ts`
Extracting `analyzeStoryIR` out of the package CLI and calling it from both `world-index`'s own `cli.js` and devkit's new command prevents the two entry points from diverging on what counts as a failure.

### 4. Derivation runs off the main actor, behind a loading state (D15)
David's ruling: `WorldIndexRunner.interpret` is `nonisolated`, decoding happens in the child process termination handler, and `WorldView` shows an explicit loading state cleared by either a completed analysis or a failure. This is what makes Amendment 1's deeper prose scan affordable without blocking the UI.

### 5. ADR-321 Amendment 1 — response prose read as its own section, not merged into description findings
Merging would make Ides of March's description findings unfindable inside a candidate list seven times as large (94 of 113 passages are response prose). Kept as two pins per story rather than one.

## Next Phase
- **Phase 6 remains CURRENT** (not closed) — the only remaining exit-state item is David's own confirmation the World tab renders, driven by a real build; Phase 7 (retiring `tools/vscode-ext/src/world-explorer.ts`) is gated on that confirmation.
- **Phase 8 remains CURRENT** — D12 (roles: tool / progression-info / atmosphere-info split), D11 (IDE-side `NLTagger` re-heading, dropping the article gate), and D13 (unnamed-tool finding) are next, in that order per the plan's dependency chain (D14 before D12 before D11 before D13).
- **Tier**: Phase 8 is Large (400 tool calls); no phase advanced to CURRENT beyond what plan.md already records — both phases were already CURRENT going into this session and remain so.
- **Entry state for the remaining work**: Phase 6's code and Phase 8's D10/D14 groundwork are in place; D12 needs the `lifted`/`progression` data D14 just added; D11 needs D12's role ranking to make the +445 raw candidate expansion shippable.

## Open Items

### Short Term
- David needs to run a real build and confirm the World tab renders (Map/Reach/Incomplete) for at least Fernhill, including the three AC-9 failure states (missing IR, malformed IR, `node` unavailable).
- Phase 8: implement D12 (roles.ts), D11 (POS re-heading in `tools/ide/SharpeeIDE/World/` via `NLTagger`), D13 (unnamed-tool finding).

### Long Term
- Phase 7 (delete `tools/vscode-ext/src/world-explorer.ts`) blocked on Phase 6 confirmation and David's explicit delete confirmation (CLAUDE.md confirm-before-delete).
- Map view's collision resolution and direction-skew detection remain uncovered by any real corpus story beyond Fernhill's single Study/Folly Hill displacement (carried forward from Phase 5).
- After D11 ships, IDE and CLI will report different Incomplete counts for the same story by design (bounded to the recall direction) — plan notes a future test should assert the headless list stays a subset.

## Files Modified

**Blocker fix / docs-tab** (4 files):
- `tools/ide/web/docs-tab/build.mjs` - bundle `nav.ts` with esbuild instead of data-URL transform
- `tools/ide/web/docs-tab/src/mdx.mjs` - render `<StatusBarExample>` from `website/src/lib/versions.json`
- `tools/ide/SharpeeIDE/Resources/docs-tab/docs-index.json` - regenerated (159 pages)
- `tools/ide/SharpeeIDE/Resources/docs-tab/pages/chord-writer.html` - regenerated, version string updated

**Phase 6 — IDE World tab** (new directory + 4 modified):
- `tools/ide/SharpeeIDE/World/` (new) - `WorldIndexDocument.swift`, `WorldIndexRunner.swift`, `WorldFindingTable.swift`, `WorldMapView.swift`, `WorldReachView.swift`, `WorldIncompleteView.swift`, `WorldView.swift`
- `tools/ide/SharpeeIDETests/WorldIndexTests.swift` (new)
- `tools/ide/SharpeeIDE/Play/RightPanelViewController.swift` - World tab appended at index 7
- `tools/ide/SharpeeIDE/Theme.swift` - 9 new `dynamic(light:dark:)` pairs
- `tools/ide/SharpeeIDE/Build/BuildController.swift` - derives World index after successful build
- `tools/ide/SharpeeIDE/MainWindow.swift` - forwarding, source-line jump, clears on project switch

**Platform change — devkit `world-index` command** (5 files, 2 new):
- `packages/devkit/package.json`, `packages/devkit/src/cli.ts` - registers `sharpee world-index`
- `packages/devkit/src/commands/world-index.ts` (new), `packages/devkit/src/commands/world-index.test.ts` (new)
- `packages/world-index/src/analyze.ts` (new) - `analyzeStoryIR`, shared by package CLI and devkit command
- `packages/world-index/src/cli.ts` - delegates to `analyze.ts`
- `pnpm-lock.yaml` - dependency update

**Phase 8 — Amendment 1 (D10, D14)** (5 files, 1 new):
- `packages/world-index/src/prose.ts` (new) - `collectProse` → `ProseSite[]`
- `packages/world-index/src/incomplete.ts` - iterates passages, findings carry `site: ProseSite`
- `packages/world-index/src/reach.ts` - `obstacleOn` returns a verdict; `ReachResult` gains `lifted[]`/`progression[]`; `machineDrivers` reads `ir.machines`
- `packages/world-index/src/document.ts` - schema bumps to `world-index/2`
- `packages/world-index/src/index.ts` - re-exports for the above
- `packages/world-index/tests/cli.test.ts`, `packages/world-index/tests/incomplete.test.ts`, `packages/world-index/tests/reach.test.ts` - updated for the above

**Documentation** (2 files):
- `docs/architecture/adrs/adr-321-world-index.md` - Amendment 1 (D10–D15, D11a), stale prototype figure corrected (17 → 20 missing-word)
- `docs/work/world-index/plan.md` - Phase 6 outcome recorded (CURRENT, awaiting confirmation); Phase 8 added and its D10/D14 steps recorded DONE

## Notes

**Session duration**: not tracked (session state file empty this session).

**Approach**: Cleared a multi-day build blocker first, then completed Phase 6's Swift/wire work, then followed David's platform-change and D15 rulings mid-session, then continued straight into Phase 8 on David's direction rather than stopping at Phase 6.

**Corrections made to my own ADR text**, each found by implementing against the real IR rather than reading it: `ProseSite.owner` and `firedBy` are independently optional (a response usually DOES have an owner; 22 of Fernhill's passages are story-level with neither); the passage field is `text`, not `sentence`; D14's mechanism is a top-level `define machine` construct (`ir.machines`) whose transitions trigger on turning the stopcock — not the `switchable` trait alone as first written. Also corrected ADR-321's stale prototype figure (17 → 20 missing-word), closing an open item Phase 3 had been carrying.

**Session state gap**: `docs/context/.session-state-4db9d0.json` is empty — the file list and phase/tool-call accounting above are derived from `git status` and the session narrative rather than hook-tracked state.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Architecture — Phase 6 exit state requires David's hands-on confirmation the World tab renders (not code review), which also gates Phase 7's deletion of `tools/vscode-ext/src/world-explorer.ts`; Phase 8 steps D12, D11, D13 remain undone.
- **Blocker Category**: Other: Awaiting user confirmation (not a technical blocker — code and tests are complete for Phase 6; Phase 8 is genuinely mid-implementation)
- **Estimated Remaining**: Phase 6 needs David's confirmation only (no engineering work). Phase 8's remaining D12/D11/D13 are estimated at ~2-3 sessions given D11's `NLTagger` integration and the +445 raw candidate volume it introduces.
- **Rollback Safety**: safe to revert — all changes are on `feat/adr-321-world-index`, not merged to main.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 4's JSON contract (stable, schema-guarded), Phase 5's timing decision (full analysis kept), David's approval for the `tools/ide` changes and the devkit platform change, ADR-321 Amendment 1 accepted with `/adr-review` at 13/13 before Phase 8 work began.
- **Prerequisites discovered**: the checkout-only script path assumed by Phase 6's original deliverable was not viable for non-monorepo authors — surfaced only once the wiring was attempted, prompting the devkit platform change.

## Architectural Decisions

- ADR-321 Amendment 1 (D10-D15, D11a contracts) — response prose read as its own finding section, progression chain preserved through `lifted`/`progression`, three-way role split (tool/progression-info/atmosphere-info), IDE-side POS re-heading via `NLTagger`, wire schema bumped to `world-index/2` — rationale: the resolution boundary needed a published vocabulary surface (2.3KB, Fernhill) rather than asking the IDE to derive resolution it has no data for; full rationale in `docs/architecture/adrs/adr-321-world-index.md`.
- Pattern applied: subprocess resolution via `ComposeRunner.resolveSharpee` (the same three-tier resolution used by build/compose/test/play), extended to the new `world-index` devkit command.
- Pattern applied: AC-9 failure-state rendering (missing IR / malformed IR / process dies silently) follows the Testing tab's existing build-first placeholder pattern rather than inventing a new one.

## Mutation Audit

- Files with state-changing logic modified: `packages/world-index/src/reach.ts` (obstacle-lifting/progression tracking), `packages/world-index/src/incomplete.ts` (finding derivation), `packages/world-index/src/prose.ts` (new — prose collection), `packages/world-index/src/analyze.ts` (new — analysis entry point), `tools/ide/SharpeeIDE/World/WorldIndexRunner.swift` (subprocess + decode).
- Tests verify actual state mutations (not just events): YES (evidence: mutation checks performed and reported by the session — renaming the devkit subcommand fails the real-CLI test with "unknown command: world-index-oops"; emitting the Reach unreached-header unconditionally fails the clean-story assertion; blinding the walk to `ir.machines` drops stopcock/primer-plunger and fails three D14 tests) [reported by session, unverified — no event-log corroboration available this session; state file was empty].
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — website-drift breaking the docs-tab pre-build (relative import from a `data:` URL context, and an undocumented `<StatusBarExample>` component) is the same class of issue as prior sessions where `website/` changes silently broke IDE-embedded docs tooling without a corresponding IDE-side update. No specific prior session filename identified this session; a recurrence audit of `tools/ide/web/docs-tab/` against `website/src/lib/` for other unhandled component/import drift would be a reasonable systemic check.
- If YES: Consider a one-time audit of `tools/ide/web/docs-tab/src/mdx.mjs` against every component the website corpus currently uses, to find any other unhandled cases before they cause the next multi-day build failure.

## Test Coverage Delta

- Tests added: Phase 6 — 20 new IDE tests (`WorldIndexTests.swift`); devkit — 4 new tests (`world-index.test.ts`); world-index — additional D10/D14 test coverage in `incomplete.test.ts` and `reach.test.ts` (exact new-test count not separately reported; see totals below).
- Tests passing before: not established at session start (state file empty) → after: world-index 127 passing / 1 skipped; devkit 167 passing / 1 skipped; IDE suite 517 passing, 0 failures (evidence: `xcodebuild test -only-testing:SharpeeIDETests -derivedDataPath ./DerivedData`, reported by session) [reported by session, unverified — no event-log row available to corroborate timestamp-after-last-edit freshness]. Root `npx tsc --noEmit` reported clean [reported by session, unverified].
- Known untested areas: Map view's collision resolution and direction-skew detection (no real-story corpus exercises the skew path beyond Fernhill's single displacement); Phase 8's D12/D11/D13 have no tests yet since the code doesn't exist.

---

**Progressive update**: Session completed 2026-08-19 17:45
