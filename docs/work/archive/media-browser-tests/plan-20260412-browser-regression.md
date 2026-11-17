# Session Plan: Browser Regression Tests for @sharpee/media

**Created**: 2026-04-12
**Overall scope**: Wire the fully-designed but completely unwired @sharpee/media package into the platform stack, add audio event forwarding to the browser platform, and write vitest regression tests that prove an audio cue registered in a story fires and reaches the browser client.
**Bounded contexts touched**: N/A — infrastructure/platform wiring work
**Key domain language**: AudioRegistry, AudioCue, AudioEvent, isAudioEvent, browser platform event handler

---

## Background and Known Blockers

Several facts uncovered during investigation must be resolved or decided before coding begins:

1. **@sharpee/media is absent from pnpm-workspace.yaml.** `pnpm-workspace.yaml` includes `packages/*` but explicitly excludes `packages/platforms`. It does NOT exclude `packages/media`, so `packages/media` is covered by `packages/*`. The package is present in the workspace — but it is not listed as a dependency of `@sharpee/sharpee`. Adding it there is the correct wiring point.

2. **No ESM build exists.** `packages/media/package.json` declares `"module": "./dist-esm/index.js"` and the `exports` map points to `dist-esm/`. Only `dist/` (CJS) exists. The browser client and vitest browser mode both expect ESM. `tsconfig.json` only outputs to `dist/`. A second `tsconfig.esm.json` and a build script entry are needed, OR the exports map is simplified to CJS-only for now. This is a build-configuration decision the user must make.

3. **`@sharpee/platform-browser-en-us` is excluded from pnpm-workspace.yaml** (`!packages/platforms`). Adding audio event handling there requires either (a) adding it back to the workspace, or (b) doing the audio forwarding work in a different package. This needs a decision.

4. **Vitest browser mode vs. jsdom.** Vitest 3.x ships a `browser` test environment that runs in a real browser (Playwright/WebdriverIO). The simpler option is `environment: 'jsdom'`, which gives Web Audio API stubs without a real browser binary. The plan below uses `jsdom` for the regression tests unless the user specifically wants real-browser execution.

5. **`@sharpee/media` uses declaration merging.** Importing `@sharpee/media` (or any re-export of it) extends `@sharpee/core`'s `EventDataRegistry`. This side-effect import must happen before `createTypedEvent` is called with `audio.*` keys, or TypeScript will reject the call at compile time. The re-export from `@sharpee/sharpee` must include this module.

**The user must approve the answers to blockers 2, 3, and 4 before Phase 2 or Phase 3 can begin.**

---

## Phases

### Phase 1: Audit, decide, and unblock
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Pre-wiring audit — establish ground truth on the build system, workspace, and test infrastructure before touching production code.
- **Entry state**: Feature branch `feature/media-browser-tests` created off `main`. No code changes yet.
- **Deliverable**:
  - Answers to the five blockers above, documented in a short decision record appended to this file.
  - Confirmed that `@sharpee/media` builds cleanly (`pnpm --filter @sharpee/media run build`).
  - Confirmed that `dist/` output from media is importable from a test file (`import { isAudioEvent } from '@sharpee/media'` resolves).
  - Decision on ESM: add `tsconfig.esm.json` + build step, or drop the ESM export entry for now.
  - Decision on browser platform: add `packages/platforms` back to workspace scope for this branch, or find an alternative wiring point.
  - Decision on test environment: `jsdom` (fast, no binary) or `browser` mode (Playwright, real Web Audio).
- **Exit state**: All five blockers have written answers. No code is changed yet. The next phase can begin immediately.
- **Status**: COMPLETE

---

### Phase 2: Wire @sharpee/media into the package exports
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Package wiring — make `AudioRegistry`, `isAudioEvent`, and all audio event types importable from `@sharpee/sharpee` and from `@sharpee/media` directly.
- **Entry state**: Phase 1 decisions are recorded. `@sharpee/media` builds cleanly.
- **Deliverable**:
  - `packages/sharpee/package.json` — adds `@sharpee/media` as a dependency.
  - `packages/sharpee/src/index.ts` — re-exports `AudioRegistry`, `AtmosphereBuilder`, `isAudioEvent`, and the nine `Audio*Event` interfaces from `@sharpee/media`.
  - `packages/sharpee/tsconfig.json` — adds media to `references` array.
  - If ESM build is required: `packages/media/tsconfig.esm.json` created, `package.json` build script updated, `dist-esm/` added to `"files"`.
  - `build.sh` or turbo pipeline updated if media needs a build step in the ordered chain (check against `ts-forge.config.json` and `build.sh` for the 6-point new-package checklist from the project memory).
  - Verification: `import { AudioRegistry, isAudioEvent } from '@sharpee/sharpee'` compiles without error.
- **Exit state**: A story can `import { AudioRegistry } from '@sharpee/sharpee'` and use it. TypeScript is happy. The declaration merging for `EventDataRegistry` is active when `@sharpee/sharpee` is imported. `@sharpee/media` builds and is linked in the workspace.
- **Status**: PENDING

---

### Phase 3: Add audio event forwarding to the browser platform
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Browser platform event pipeline — detect audio events flowing out of the engine and forward them to a new `onAudioEvent` callback on `BrowserClient`.
- **Entry state**: Phase 2 complete. `isAudioEvent` is importable. The browser platform package is accessible in the workspace (per Phase 1 decision on blocker 3).
- **Deliverable**:
  - `packages/platforms/browser-en-us/src/browser-platform.ts` — in `setupEventHandlers()`, add a branch that calls `isAudioEvent(event)` and, when true, calls `this.client.handleAudioEvent(event as AudioEvent)`.
  - `packages/platforms/browser-en-us/src/browser-client.ts` — adds `handleAudioEvent(event: AudioEvent): void` method. Implementation is a logging stub: `console.log('[audio]', event.type, event)`. This is intentional — real Web Audio rendering is out of scope for the regression tests.
  - `packages/platforms/browser-en-us/package.json` — adds `@sharpee/media` as a dependency (or `@sharpee/sharpee` already pulls it transitively — confirm).
  - `packages/platforms/browser-en-us/tsconfig.json` — adds media reference if needed.
  - Behavior statement written in the conversation before tests are written (rule 10).
- **Exit state**: `BrowserPlatform` compiles. When the engine emits an `audio.sfx` event, `BrowserClient.handleAudioEvent` is called. The platform does not crash on audio events.
- **Status**: PENDING

---

### Phase 4: Write vitest regression tests
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Audio event pipeline — tests that exercise the full path from `AudioRegistry.cue()` through the engine's event bus to the browser client handler.
- **Entry state**: Phases 2 and 3 complete. `isAudioEvent` works. `handleAudioEvent` exists on `BrowserClient`. Phase 1 decision on test environment (jsdom vs. browser mode) is recorded.
- **Deliverable**: A new test package or test directory. Two viable locations:
  - `packages/media/tests/` — unit-level tests for the media package itself (no browser platform needed).
  - `packages/platforms/browser-en-us/tests/` — integration tests for the full pipeline.
  The plan recommends splitting: unit tests in `packages/media/tests/`, integration tests in `packages/platforms/browser-en-us/tests/`.

  **Unit tests in `packages/media/tests/`** (`vitest.config.ts` with `environment: 'node'`):
  - `audio-registry.test.ts`:
    - DOES: `registerCue` + `cue(name)` returns array containing one `ISemanticEvent` with `type === 'audio.sfx'` and the correct `data.src`.
    - DOES: `cue` on an unregistered name returns `[]` (silent degradation).
    - DOES: `registerPool` + `cue(name)` returns an event whose `data.src` is one of the pool's sources.
    - DOES: pool resolution applies volume and rate jitter within bounds (`volume` stays in `[0, 1]`).
    - DOES: `atmosphere()...build()` → `getAtmosphere(roomId)` returns the registered atmosphere.
    - REJECTS: none (registry is permissive by design).
  - `events.test.ts`:
    - DOES: `isAudioEvent({ type: 'audio.sfx' })` returns `true`.
    - DOES: `isAudioEvent({ type: 'audio.music.play' })` returns `true`.
    - DOES: `isAudioEvent({ type: 'if.action.taking' })` returns `false`.
    - DOES: All nine `audio.*` type strings pass the guard.
  - `registry-merge.test.ts`:
    - DOES: `createTypedEvent('audio.sfx', { src: 'test.mp3' })` compiles and returns an event with `type === 'audio.sfx'` (proves declaration merging is active).

  **Integration tests in `packages/platforms/browser-en-us/tests/`** (`vitest.config.ts` with `environment: 'jsdom'`):
  - `audio-forwarding.test.ts`:
    - Setup: construct a `BrowserPlatform` with a stub `GameEngine` whose `on(event, cb)` stores the callback. Spy on `BrowserClient.handleAudioEvent`.
    - DOES: when the engine emits `{ type: 'audio.sfx', data: { src: 'test.mp3' } }`, `handleAudioEvent` is called with that event.
    - DOES: when the engine emits `{ type: 'audio.music.play', data: { src: 'theme.mp3' } }`, `handleAudioEvent` is called with that event.
    - DOES: when the engine emits a non-audio event (`{ type: 'if.action.taking' }`), `handleAudioEvent` is NOT called.
    - DOES: `handleAudioEvent` receives the exact event object emitted (no mutation, no data loss).

  Each test is graded GREEN before the phase closes (rule 11).

  **vitest.config.ts files** created for both `packages/media` and `packages/platforms/browser-en-us`. Both follow the pattern from `packages/core/vitest.config.ts`.
  **`package.json` scripts** updated: add `"test": "vitest run"` and `"test:ci": "vitest run"`.
  **Behavior statements** written in the conversation (not in files) before any test is written.

- **Exit state**: `pnpm --filter @sharpee/media test` passes all unit tests. `pnpm --filter @sharpee/platform-browser-en-us test` passes all integration tests. All tests grade GREEN. No test grades RED or YELLOW.
- **Status**: PENDING

---

## Decision Record (to be filled in during Phase 1)

| # | Question | Decision | Date |
|---|----------|----------|------|
| 1 | ESM build for @sharpee/media: add tsconfig.esm.json or drop dist-esm entry? | Skip — match existing convention; build.sh handles ESM for all packages | 2026-04-12 |
| 2 | Browser platform workspace inclusion: re-add to pnpm-workspace.yaml or find alternative? | Don't touch workspace exclusion. Test media package standalone. Browser platform wiring is a separate PR. | 2026-04-12 |
| 3 | Test environment: jsdom or real browser (Playwright)? | `node` — AudioRegistry is pure logic, no DOM needed | 2026-04-12 |
| 4 | Audio renderer: logging stub only, or minimal Web Audio API integration? | Out of scope — test registry and event shapes only | 2026-04-12 |
| 5 | Is the browser platform the right place for audio forwarding, or is there a different integration boundary (e.g., the engine's event processor)? | Browser platform is correct (engine.on('event') already receives all ISemanticEvents), but wiring is deferred to a follow-up PR | 2026-04-12 |

---

## Notes on Out-of-Scope Items

The following are explicitly deferred and not part of this plan:

- Real Web Audio API rendering (oscillators, gain nodes, buffer loading).
- Atmosphere transitions triggered by room changes.
- Audio capability negotiation (`AudioCapabilities`, `AudioPreferences`).
- Adding audio support to the CLI or Zifmia platforms.
- Adding `AudioRegistry` usage to the Dungeo story.
