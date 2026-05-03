# Plan: ADR-163 Phase 4 — Platform-Browser Migration and ADR-101 Cleanup

> **SUPERSEDED 2026-05-02** — ADR-163 was rewritten the same day to a
> closure-per-channel model. The four-phase decomposition below
> (4A audit / 4B browser wiring / 4C story renderer / 4D cleanup)
> assumed a rule-based channel-service consumer pattern that no longer
> applies. The audit findings (`audit-20260502-platform-browser.md`)
> remain relevant for the post-rewrite browser migration; the
> phase decomposition below does not.
>
> See the new master plan:
> `plan-20260502-adr-163-rewrite-master.md`

**Date**: 2026-05-02
**Branch**: main
**ADR**: ADR-163 (Channel-Service Platform)
**Master plan**: `plan-20260501-adr-163-platform.md` (Phase 4)
**Phase 4 overall tier**: Large (~400 tool calls — decomposed into 4 Medium sessions below)

---

## Goal

Migrate `packages/platform-browser/` from `text-service.renderToString` to `channel-service`
`produceTurnPacket`, prove story-renderer parity between CLI and browser (AC-15), remove all
ADR-101 direct-emission paths from `packages/` (AC-16), and document or retire `text-service`'s
remaining surface (AC-16 text-service audit).

This plan decomposes master-plan Phase 4 into four Medium-tier sessions, each with a clear entry
state, deliverable, integration-reality boundary, and test gate.

---

## Pre-Planning Audit Findings

Survey conducted 2026-05-02 against the current `main` branch.

### platform-browser current state

- **Entry point**: `packages/platform-browser/src/BrowserClient.ts`
- **Current text-service dependency**: One import — `import { renderToString } from '@sharpee/text-service'` — used in `setupEngineHandlers()`. The `text:output` listener filters prompt blocks, calls `renderToString(displayBlocks)`, and passes the string to `TextDisplay.displayText()`.
- **Status surface**: `StatusLine` class at `display/StatusLine.ts` — updated by `updateStatusLine()` on every `text:output` event. Reads location from `SaveManager.getCurrentLocation()` (a world-query), not from channel-service packets. Score and turn come from `BrowserClient`'s own integer fields.
- **Transcript surface**: `TextDisplay` class at `display/TextDisplay.ts` — renders plain text strings into `<p>` DOM nodes. No packet awareness.
- **Persistence mechanism**: `localStorage` throughout (not IndexedDB). `SaveManager` compresses save envelopes with `lz-string`. Transcript HTML is persisted inside the save envelope as compressed HTML (`transcriptHtml` field). There is no packet-level persistence — only engine-save-data and rendered HTML.
- **Repaint on page refresh**: Currently done by restoring the autosave envelope (which includes `transcriptHtml`) and calling `TextDisplay.setHTML()`. The `local-repaint` policy in master plan Phase 4 maps to this autosave-restore path; there is no IndexedDB layer and the plan need not add one — the save envelope already persists the session transcript.
- **Audio**: `AudioManager.ts` handles `audio.*` events (not `media.*`). Platform-browser does **not** emit ADR-101 events; it only receives and reacts to `audio.*` events already forwarded by the engine.
- **Test harness**: No existing test harness for platform-browser. No playwright, jest, vitest, or jsdom setup in `package.json`. AC-14 requires a real-path test — the test harness strategy is a critical planning decision (see Phase 4B below).
- **Build artifact**: `./build.sh -s dungeo -c browser` produces `dist/web/dungeo/game.js` (esbuild IIFE bundle, `--platform=browser`). The story's `browser-entry.ts` is the esbuild entry. The browser bundle is not a Node-loadable artifact — tests cannot `require()` or `import()` it.
- **`@sharpee/channel-service` not yet a dependency**: `platform-browser/package.json` lists `@sharpee/text-service` as a peer; `channel-service` is absent. Adding it is required in 4A.

### renderToString consumers summary

| File | Role | Phase to fix |
|------|------|--------------|
| `packages/platform-browser/src/BrowserClient.ts` | Browser wire production | 4B |
| `packages/transcript-tester/src/story-loader.ts` | Transcript test output | 4C |
| `packages/transcript-tester/src/fast-cli.ts` | Fast CLI bundle output | 4C |
| `packages/platforms/browser-en-us/src/browser-platform.ts` | Legacy browser platform (dead path) | 4D audit |
| `packages/platforms/cli-en-us/src/cli-platform.ts` | Legacy CLI platform (dead path, Phase 3 confirmed) | 4D audit |

### ADR-101 emission paths

`grep -r 'media\.image\.show\|media\.sound\.play\|media\.music\|media\.ambient\|media\.animation\.play\|media\.animate\|media\.transition\|media\.layout\.configure' packages/ --include='*.ts'` produces **4 files, all inside `packages/channel-service/`** — the mapping tables and tests. These are the *routing definitions*, not emission sites. No other package emits ADR-101 events directly.

Dungeo's `audio-setup.ts` emits `audio.*` events (e.g., `audio.ambient.play`), which are a
separate namespace from ADR-101 `media.*` events. These are NOT in scope for AC-16.

The `stories/channel-service-test/src/scenarios.ts` uses ADR-101 strings as test fixtures; these
are also not emission sites.

**AC-16 grep gate baseline**: current grep returns 4 matches, all in `channel-service` (routing
tables). The gate must be: `grep` returns **zero results outside `packages/channel-service/`**. The
channel-service mapping tables are the intended registration points — they must survive AC-16.

### text-service remaining surface

Post Phase 3, `packages/text-service/` still provides:
- `renderToString(blocks)` — used by transcript-tester (2 paths) and platform-browser (1 path)
- `renderStatusLine(...)` — exported but usage not found in active code paths (re-exported from
  bridge, runtime, sharpee packages)
- Terminal helpers (ANSI, cursor) — internal to text-service; no consumers identified outside
  legacy platform packages

Phase 3 already marked `renderToString` as deprecated-for-wire in the text-service header. The
text-service audit (4D) will document which functions are retired and which stay.

---

## Constraints (Carried Forward)

- **No backwards compat** — dependency additions and wire changes are one-shot cutovers.
- **Test-story isolation** — Dungeo is the regression baseline; never modified as a fixture.
  AC-15 uses `stories/channel-service-test/` (extend existing) or a second test story. The
  Phase 2 test story exists and has scenarios; it should be extended rather than duplicating.
- **Platform changes require discussion first** — each phase that touches `packages/` must note
  which packages are modified and flag any structural decisions before implementing.
- **Real-path tests required** (rule 12a) — AC-14 must run against the browser build artifact,
  not jsdom or in-process mocks. The test harness strategy is a key planning decision.
- **Web client is author-customizable** — platform ships UI defaults; channel-service packet
  shape is data-only; story renderers override at the story layer, not inside platform-browser.

---

## Phases

---

### Phase 4A: Platform-Browser Audit and Entry-State Mapping

- **Tier**: Medium
- **Budget**: ~250 tool calls (read-heavy; no code changes)
- **Domain focus**: Mapping the current `platform-browser` render pipeline and identifying every
  integration point that must change in 4B–4D. Producing a discovery document that Phase 4B uses
  as its entry checklist.
- **Entry state**: Phase 3 complete. `packages/channel-service/` built and exporting all public
  API symbols. `packages/platform-browser/` still uses `renderToString` from `text-service`.
  No test harness for platform-browser exists.
- **Deliverable**:
  - A discovery document at `docs/work/channel-io-unification/audit-20260502-platform-browser.md`
    covering:
    1. Complete list of every file in `packages/platform-browser/src/` that will change in 4B,
       with a per-file description of the change.
    2. Confirmed `BrowserClient.setupEngineHandlers()` migration path: which hook fires
       (`text:output` vs `turn:complete`), how `main`-channel content replaces `renderToString`
       output, how prompt blocks continue to be extracted (prompt channel vs block filter).
    3. `StatusLine` migration path: does the status surface read from channel-service `location` /
       `score` / `turn` packets, or continue reading from world-state queries? Decision required.
    4. Transcript HTML persistence: confirm `local-repaint` maps to the autosave-restore path
       (not a new IndexedDB layer). Document the trade-off: packets are not persisted individually;
       the save envelope carries rendered HTML.
    5. AC-14 test harness strategy: how to run a real-path test against the browser bundle.
       Three options evaluated:
       - Option A: Playwright headless Chromium test (spins up a real browser, drives the game)
       - Option B: Node.js `@jsdom/jsdom` with `vm.runInContext` (headless DOM, no real browser)
       - Option C: `@sharpee/channel-service` integration test using the browser build's
         channel-service path in Node — asserts on packets, not on DOM (like AC-13 but for the
         browser packaging)
       The document must recommend one option and justify it.
    6. `stories/channel-service-test/` extension plan: what additional scenario(s) are needed
       for AC-15 (custom `json` channel, story renderer, cross-surface parity). Identify whether
       the existing story scaffolding can register a custom channel and renderer, or whether a
       minimal second story is needed.
    7. Full list of `text-service` consumers that survive Phase 4 (expected: none in
       `packages/`), and the recommended disposition of the package (retire entirely, or keep
       as a terminal-formatting utility with `renderToString` deleted).
  - **No code changes in this phase.** Discovery only.
- **Exit state**: `docs/work/channel-io-unification/audit-20260502-platform-browser.md` exists
  and covers all seven items. The AC-14 test harness strategy is decided and documented. Phase 4B
  can be started without additional upfront research.
- **AC coverage**: None (no ACs gated on this phase; it prepares the entry state for 4B).
- **Integration-reality boundary**: Read-only audit; no integration tests. The deliverable is
  documentation, not code.
- **Cross-package**: Read-access to `packages/platform-browser/`, `packages/text-service/`,
  `packages/channel-service/`, `packages/transcript-tester/`, `stories/channel-service-test/`.
  No files modified.
- **Prerequisite**: Phase 3 complete (AC-13 GREEN).
- **Platform-change flag**: No platform changes in this phase. The audit produces recommendations
  that will be discussed with the user before 4B begins.
- **Status**: CURRENT

---

### Phase 4B: Platform-Browser Channel-Service Wiring (AC-14 Test Gate)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Replacing `text-service.renderToString` in `BrowserClient` with
  `produceTurnPacket`; wiring browser capabilities into a `HelloPacket`; routing `main`,
  `location`, `score`, `turn` channels to the correct DOM surfaces; AC-14 real-path test.
- **Entry state**: Phase 4A complete. Discovery document committed. AC-14 test harness strategy
  decided. `packages/channel-service/` is NOT yet a dependency of `packages/platform-browser/`.
  `BrowserClient.setupEngineHandlers()` still calls `renderToString`. Dungeo walkthrough chain
  (regression baseline) passes per Phase 3 convention.
- **Deliverable**:
  - `packages/platform-browser/package.json` — `@sharpee/channel-service` added as a peer
    dependency. `@sharpee/text-service` peer dependency removed (or downgraded to optional if
    it still provides non-wire helpers).
  - `BrowserClient.ts` — `setupEngineHandlers()` rewritten:
    - `engine.start()` call followed by channel-service bootstrap: `resetSession()` →
      `registerHello(BROWSER_CAPABILITIES)` → `registerStandardChannels()` →
      `registerMediaChannels()` (gated on capability flags) → `registerPlatformRules()` →
      `produceCmgtManifest()`.
    - `text:output` listener (or `turn:complete` — see 4A decision): calls
      `produceTurnPacket({ textBlocks: blocks, events: ... })`, reads `payload.main`, renders
      to `TextDisplay`. Prompt channel extracted from packet (not filtered from raw blocks).
    - `StatusLine` updated per 4A decision (packet-driven or world-query — document which).
    - `renderToString` import removed from `BrowserClient.ts`.
  - `stories/dungeo/src/browser-entry.ts` — no changes (channel-service bootstrap is inside
    `BrowserClient`; entry file is unchanged).
  - `build.sh` — `channel-service` alias added to the `build_browser_client()` esbuild
    invocation (mirrors the CLI alias added in Phase 3).
  - Browser build succeeds: `./build.sh -s dungeo -c browser` produces `dist/web/dungeo/game.js`
    without errors.
  - AC-14 real-path test (location and test harness per 4A decision): asserts that a Dungeo
    session in the browser bundle produces the same `main`-channel content as the CLI bundle for
    an identical command sequence. Test file location: `packages/channel-service/tests/
    ac-14-browser-real-path.test.ts` (or appropriate location per harness type). The test runs
    against the production browser build artifact, not a stub.
  - Dungeo walkthrough chain passes before and after (regression gate; uses the Phase 3
    convention: GREEN = any of N runs passed).
- **Exit state**: AC-14 GREEN. `BrowserClient.ts` imports nothing from `text-service`. Browser
  build artifact updated. Dungeo walkthrough chain unbroken. Dungeo browser game playable in a
  real browser (smoke-tested manually, not automated).
- **AC coverage**: AC-14
- **Integration-reality boundary**: AC-14 is a real-path test against `dist/web/dungeo/game.js`
  (or equivalent browser build artifact). Per rule 12a, a phase named after a platform
  integration must have at least one REAL-PATH TEST. The test harness type (Playwright, jsdom, or
  packet-level) is determined in 4A; whatever is chosen must exercise the production build path,
  not an in-process substitute.
  - **OWNED**: `dist/web/dungeo/game.js` (browser build); `packages/platform-browser/dist/`
    (consumed by the build); `packages/channel-service/dist/` (consumed by the build).
  - **EXTERNAL**: Browser DOM APIs (exercised via test harness).
  - **REAL-PATH TEST**: AC-14 asserts on packet content or rendered output produced by the
    browser build artifact. No injection of a stub channel-service.
  - **STUB JUSTIFICATION**: None. AC-14 is the gate.
- **Cross-package**: `packages/platform-browser/` (primary); `packages/channel-service/`
  (added as dependency); `build.sh` (browser alias). `packages/text-service/` (import removed
  from BrowserClient; no changes to text-service itself). This phase is the primary cross-cutting
  change for the browser surface.
- **Platform-change flag**: Modifies `packages/platform-browser/` — a platform package. Per
  CLAUDE.md major directions, this requires discussion with the user before implementation.
  Discuss the Phase 4A findings (especially the AC-14 test harness decision) before starting.
- **Prerequisite**: Phase 4A complete; AC-14 harness decision documented and approved by user.
- **Status**: PENDING

---

### Phase 4C: Story-Renderer Parity (AC-15 Test Gate)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Custom `json` channel registered by a story; a story-supplied renderer
  consuming the channel; identical packets and rendered output on CLI and browser for the same
  command sequence. Transcript-tester migration from `renderToString` to `produceTurnPacket`.
- **Entry state**: Phase 4B complete. `BrowserClient.ts` uses channel-service. `dist/web/dungeo/
  game.js` built. AC-14 GREEN. `packages/transcript-tester/` still uses `renderToString` in both
  `story-loader.ts` and `fast-cli.ts`.
- **Deliverable**:
  - `stories/channel-service-test/` extended with:
    - A custom `json` channel registration (e.g., `debug-stats` channel, `emit: 'always'`,
      content-type `json`) and a platform rule mapping a story-specific block key to it.
    - A story-supplied renderer function that accepts the `debug-stats` channel payload and
      produces a deterministic string (e.g., JSON-serialized). The renderer is framework-agnostic
      (pure function, importable by both the CLI test harness and a browser test).
    - A playable turn sequence (deterministic, no RNG) that exercises the custom channel.
  - AC-15 test: runs the test story through the CLI bundle and through the browser bundle
    (or the channel-service equivalent per 4A harness strategy) for the same command sequence.
    Asserts:
    - The `debug-stats` channel appears in both packets (CLI and browser).
    - The channel payload is identical (wire equivalence).
    - The story renderer produces identical output on both sides (renderer parity).
  - `packages/transcript-tester/src/story-loader.ts` — `renderToString` replaced with
    `produceTurnPacket` (Pattern B: wrap text-service output with channel-service, mirroring the
    CLI migration from Phase 3). `@sharpee/channel-service` added as a dependency.
  - `packages/transcript-tester/src/fast-cli.ts` — same migration; `renderToString` from the
    platform bundle replaced with channel-service routing.
  - All existing transcript tests still pass after the transcript-tester migration. (This is the
    regression gate for the transcript-tester migration.)
  - `packages/text-service/src/index.ts` — `renderToString`'s deprecation comment updated to
    reflect that all active consumers have migrated (it now exists only for legacy
    `platforms/cli-en-us/` and `platforms/browser-en-us/` dead paths).
- **Exit state**: AC-15 GREEN. `packages/transcript-tester/` uses channel-service for wire
  production. `stories/channel-service-test/` has a custom channel and renderer. All existing
  transcript tests pass.
- **AC coverage**: AC-15
- **Integration-reality boundary**: AC-15 requires the CLI bundle and the browser bundle (or
  channel-service packet-level equivalent) to produce identical packets. The CLI half runs against
  `dist/cli/sharpee.js` (same as AC-13). The browser half uses the harness from Phase 4A.
  - **OWNED**: `dist/cli/sharpee.js`; `dist/web/dungeo/game.js`; `stories/channel-service-test/`
    (this repo's test story, a fixture).
  - **EXTERNAL**: None.
  - **REAL-PATH TEST**: AC-15 runs both sides using production artifacts. The "identical packets"
    assertion is the parity proof.
  - **STUB JUSTIFICATION**: None.
- **Cross-package**: `packages/transcript-tester/` (wire path migration); `stories/channel-service-
  test/` (extended); `packages/channel-service/` (test added). `packages/text-service/` (comment
  only). `packages/platform-browser/` is not modified in this phase.
- **Platform-change flag**: Modifies `packages/transcript-tester/` — a platform package. Discuss
  the scope of the transcript-tester migration (are there side-effects on the walkthrough chain?)
  before implementing.
- **Prerequisite**: Phase 4B complete; AC-14 GREEN.
- **Status**: PENDING

---

### Phase 4D: ADR-101 Cleanup and text-service Final Disposition (AC-16 Grep Gate)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Removing any remaining ADR-101 direct-emission paths from `packages/`;
  auditing `text-service`'s remaining surface and executing the one-shot disposition decision
  (retire or keep as terminal-only utility); retiring the dead legacy platform packages
  (`platforms/cli-en-us/`, `platforms/browser-en-us/`) or documenting their status.
- **Entry state**: Phase 4C complete. AC-14 and AC-15 GREEN. `packages/transcript-tester/` on
  channel-service. The only `renderToString` consumers remaining are the dead-path legacy
  platforms (`packages/platforms/cli-en-us/` and `packages/platforms/browser-en-us/`).
  AC-16 grep currently returns 4 matches — all inside `packages/channel-service/` (routing
  tables, not emission sites). Baseline: grep already passes at the "outside channel-service"
  level. The gate is to confirm this holds and document the result.
- **Deliverable**:
  - **AC-16 grep gate**: run `grep -r 'media\.image\.show|media\.sound\.play|...' packages/
    --include='*.ts' | grep -v 'packages/channel-service'`. Result must be zero lines.
    If any emission sites are found outside channel-service, remove them. Document any found
    and removed.
  - **text-service audit document** at `docs/work/channel-io-unification/
    text-service-disposition-20260502.md`:
    - List every exported symbol from `packages/text-service/src/index.ts`.
    - For each symbol: is it used by any active code path? (post Phase 4B+4C migrations)
    - Disposition recommendation: retire package (delete from workspace + remove from build.sh
      and sharpee re-exports), OR keep as a terminal-formatting utility with `renderToString`
      deleted.
    - One-shot decision; no two-phase rollout. Document which option is chosen.
  - Execute the text-service disposition (retire or trim) per the decision in the audit document.
    If retiring, remove from `ts-forge.config.json`, `packages/sharpee/package.json`,
    `packages/sharpee/src/index.ts`, `packages/sharpee/tsconfig.json`, `build.sh`,
    and `root package.json` (the six-point new-package checklist in reverse).
  - **Legacy platform audit**: document the status of `packages/platforms/cli-en-us/` and
    `packages/platforms/browser-en-us/`. Both are confirmed dead paths (Phase 3 for CLI,
    Phase 4B for browser). Execute one of:
    - Delete (preferred if no downstream consumer exists outside the workspace)
    - Archive (move to `docs/work/retired/`)
    - Retain with a header comment marking them as retired dead paths
    Decision must be made and executed; deferred status is not acceptable.
  - Dungeo walkthrough chain passes after all changes (final regression gate for the entire
    Phase 4 sequence).
  - `packages/sharpee/docs/genai-api/` re-generated if text-service retire affects the public
    API surface.
- **Exit state**: AC-16 passes (grep gate zero outside channel-service). text-service fate
  decided and executed. Legacy platform packages resolved. Dungeo walkthroughs pass. Phase 4
  of the master plan is fully complete.
- **AC coverage**: AC-16
- **Integration-reality boundary**: AC-16 is a static grep scan — no runtime test required.
  The walkthrough chain (Phase 3 convention) is the runtime regression gate.
  - **OWNED**: `packages/` tree (scanned statically).
  - **REAL-PATH TEST**: Dungeo walkthrough chain (real CLI bundle, real story, real engine).
  - **STUB JUSTIFICATION**: None.
- **Cross-package**: `packages/text-service/` (disposition); `packages/platforms/cli-en-us/`
  and `packages/platforms/browser-en-us/` (legacy platform resolution); `packages/sharpee/`
  (re-exports updated if text-service retired); `build.sh`; workspace config files.
- **Platform-change flag**: Potentially removes `packages/text-service/` and/or
  `packages/platforms/*` — structural platform changes. The decision from the text-service audit
  document must be reviewed by the user before deletion is executed.
- **Prerequisite**: Phase 4C complete; AC-15 GREEN.
- **Status**: PENDING

---

## Phase Dependencies

```
Phase 3 (CLI migration — AC-13)
    └── Phase 4A (audit — discovery only, no AC gate)
            └── Phase 4B (platform-browser wiring — AC-14)
                    └── Phase 4C (story-renderer parity — AC-15)
                            └── Phase 4D (ADR-101 cleanup + text-service — AC-16)
```

4A→4B is a hard dependency (the audit produces the test harness decision that 4B requires).
4B→4C is a hard dependency (AC-15 requires the browser surface to be on channel-service).
4C→4D is a hard dependency (text-service disposition requires all consumers migrated).

---

## Integration-Reality Boundary Summary (Phase 4)

| AC | Phase | Test type | Artifact under test |
|----|-------|-----------|---------------------|
| AC-14 | 4B | **Real-path** — production browser build | `dist/web/dungeo/game.js` |
| AC-15 | 4C | **Real-path** — CLI + browser builds | `dist/cli/sharpee.js` + browser build |
| AC-16 | 4D | **Static** — grep scan of `packages/` | `packages/**/*.ts` |

---

## Test-Story Isolation Summary (Phase 4)

| Phase | Story touched | Why |
|-------|--------------|-----|
| 4A | None (read-only audit) | — |
| 4B | Dungeo (regression baseline, read-only) | Walkthrough chain gate |
| 4C | `stories/channel-service-test/` (extended) | AC-15 custom channel fixture |
| 4D | None (no story changes) | — |

Dungeo is never modified as a test fixture in any Phase 4 session.

---

## Key Risks and Decisions Deferred to 4A

1. **AC-14 test harness** — This is the highest-risk open question. The browser bundle is an
   IIFE that targets real DOM APIs; no in-process Node substitute is equivalent. Options A
   (Playwright), B (jsdom), and C (packet-level in Node) each have trade-offs on CI friction,
   realism, and maintenance cost. Phase 4A must resolve this before any implementation starts.

2. **`StatusLine` migration** — Currently the status surface reads world state directly, not from
   channel packets. Migrating it to `location` / `score` / `turn` channel payloads would be the
   architecturally correct path (packets are the single source of truth per ADR-163), but it adds
   scope to 4B. Phase 4A must document whether the status surface stays world-query-driven for
   now or migrates in 4B.

3. **`local-repaint` scope** — The master plan mentions `local-repaint` policy (page refresh
   replays from persisted packets). Current `platform-browser` persists rendered HTML (not
   packets) in the save envelope. Implementing true packet-level persistence would require
   IndexedDB or a packet store in `localStorage`. Phase 4A must confirm whether the current
   autosave-restore path satisfies the repaint requirement or whether packet persistence is
   required.

4. **text-service retire vs. keep** — `renderStatusLine` is still exported from `sharpee`,
   `bridge`, and `runtime` packages. If any downstream user (author-created story or external
   package) depends on it, retiring text-service would be a breaking change that deserves an ADR.
   Phase 4D must inventory actual downstream usage before executing the disposition.

---

## Open Items from Phase 3

The following items from the Phase 3 session summary are relevant to Phase 4:

- **Block-separator parity** (`\n\n` vs smart-joining) — CLI Phase 3 uses `flattenContent()`
  which joins all entries with `\n\n`. If the browser surface adopts the same flattening, the
  same parity issue exists. Document in 4A whether the `TextDisplay` renderer should accept
  `TextContent[][]` (packet-native) instead of a flat string, avoiding the flattening loss.
- **Interactive `--play` RESTART** — channel-service `resetSession()` is not called on RESTART in
  the CLI path. The same gap will exist in the browser unless 4B explicitly handles it. Flag in
  4A's migration path analysis.
- **`packages/platforms/cli-en-us/src/cli-platform.ts`** — confirmed dead path. Phase 4D resolves
  it together with the browser-en-us legacy platform.

---

## Status

- **Status**: PLANNING COMPLETE — Phase 4A is CURRENT
- **Prerequisites met**: Phase 3 complete (AC-13 GREEN, 111 tests passing, Dungeo walkthroughs
  meeting the "any of N passes" convention)
- **Prerequisites not yet met**: Phase 4A audit must be completed and reviewed with user before
  Phase 4B implementation begins (see platform-change flag on 4B)
