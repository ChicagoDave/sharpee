# Audit: platform-browser entry state for ADR-163 Phase 4

**Date**: 2026-05-02
**Phase**: 4A (Platform-Browser Audit and Entry-State Mapping)
**ADR**: ADR-163 — Channel-Service Platform
**Plan**: `plan-20260502-adr-163-phase-4-platform-browser.md`
**Author**: Claude (audit pass; no code changes)

---

## Purpose

Read-only audit of `packages/platform-browser/`, `packages/text-service/`, related
consumers, and the `stories/channel-service-test/` test fixture, producing the entry
checklist and key decisions Phase 4B–4D will execute against. No source files are
modified by this phase.

---

## 1. File-by-file 4B change list

`packages/platform-browser/src/` contents (13 files):

| File | 4B change | Rationale |
|------|-----------|-----------|
| `BrowserClient.ts` | **MODIFY** — replace `renderToString` import + `setupEngineHandlers()` body with channel-service bootstrap and `produceTurnPacket` consumer. | Primary migration site. |
| `package.json` | **MODIFY** — add `@sharpee/channel-service` peer dep; remove `@sharpee/text-service` peer dep. | text-service no longer used in BrowserClient post-4B. |
| `display/TextDisplay.ts` | **NO CHANGE** | Accepts string input; `flattenContent(payload.main entry)` produces a string. |
| `display/StatusLine.ts` | **NO CHANGE** | Reads from `currentScore`/`currentTurn`/`getCurrentLocation()` — see decision §3. |
| `display/index.ts` | **NO CHANGE** | Barrel export. |
| `managers/SaveManager.ts` | **NO CHANGE** | Persists `BrowserSaveEnvelope` (engine save + transcript HTML). See §4. |
| `managers/DialogManager.ts` | **NO CHANGE** | Save/restore UI; no wire dependency. |
| `managers/MenuManager.ts` | **NO CHANGE** | Menu wiring; no wire dependency. |
| `managers/InputManager.ts` | **NO CHANGE** | Receives prompt text via `setPrompt(string)`; same shape as today. |
| `managers/ThemeManager.ts` | **NO CHANGE** | DOM theme handling. |
| `managers/index.ts` | **NO CHANGE** | Barrel export. |
| `audio/AudioManager.ts` | **NO CHANGE** | Listens to `audio.*` events (separate namespace from ADR-101 `media.*`). See §8 carry-forward. |
| `types.ts` | **NO CHANGE** | Type exports unchanged. |
| `index.ts` | **NO CHANGE** | Barrel re-exports. |

**Net file delta for 4B**: 2 files modified (`BrowserClient.ts`, `package.json`).
The browser migration surface is even narrower than the CLI's — Phase 3 modified
`scripts/bundle-entry.js` and `build.sh` simultaneously; Phase 4B touches only the
package's own source.

**Build-system hook (out-of-package)**:

| File | 4B change |
|------|-----------|
| `build.sh` | **MODIFY** — add `--alias:@sharpee/channel-service=...` to the `build_browser_client()` esbuild invocation, mirroring the CLI alias added in Phase 3. |

---

## 2. BrowserClient migration path

### Hook choice: `text:output` (matches Phase 3)

`BrowserClient.setupEngineHandlers()` registers two listeners today:
- `engine.on('text:output', (blocks, turn) => …)` — wire production via `renderToString`.
- `engine.on('event', (event: ISemanticEvent) => …)` — UI side-effects (audio, beep,
  score tracking, save/restore reactions).

**Decision**: keep `text:output` as the wire-production hook. Same reasoning as Phase 3
(CLI):
- `text:output` fires for both normal and meta-command paths (VERSION, SCORE, HELP,
  RESTART). `turn:complete` does NOT fire for meta-commands — using it would silently
  drop meta-command output.
- By the time `text:output` fires, the engine has already emitted every event for the
  turn, so an accompanying `eventBuffer` (populated by the existing `engine.on('event',
  …)` listener) is complete.

### Bootstrap sequence (in `connectEngine` after `engine.start()` is called from `start()`)

`engine.start()` is called inside `BrowserClient.start()` (line 292), not in
`connectEngine()`. The channel-service bootstrap must run **after** `engine.start()`
because `produceCmgtManifest` freezes the channel registry at call time. The bootstrap
belongs in `start()` between `engine.start()` and the autosave-restore branch.

Sequence (mirrors Phase 3 CLI, with `registerMediaChannels()` added):

```ts
import {
  resetSession, registerHello, registerStandardChannels,
  registerMediaChannels, registerPlatformRules, produceCmgtManifest,
  produceTurnPacket, flattenContent,
} from '@sharpee/channel-service';

resetSession();
registerHello(BROWSER_CAPABILITIES);   // see capability table below
registerStandardChannels();
registerMediaChannels();                // gated on capability flags inside the helper
registerPlatformRules();
produceCmgtManifest();
```

### Browser capabilities (proposed — conservative defaults)

`packages/platform-browser/` is Sharpee's **standard web client** — text + audio +
status bar. Richer capabilities (images, animations, video, etc.) belong to other
client packages that ship their own renderers (e.g., a future
`platform-browser-graphical`, `platform-electron`, or an author-built client). The
wire is identical across clients; capabilities are a per-client contract that filters
the CMGT manifest so stories see only the channels this client will actually honor.

A capability flag set to `true` is a **promise** that the client will do something
sensible with packets routed to channels gated by that flag. Setting flags optimistically
(true without a renderer) means stories' routed packets get silently dropped —
visible to no one, debuggable by no one. Setting flags honestly (true only when
platform-browser ships a renderer) means stories that need more capabilities target
a different client, which is the architecturally correct partition.

| Field | Value | Reason |
|-------|-------|-------|
| `text` | `true` | Required by type; every Sharpee surface renders text. |
| `images` | `false` | No `image:*` channel renderer in platform-browser. A graphical client would set this true. |
| `animations` | `false` | No animation renderer; same as images. |
| `video` | `false` | No video element handling. |
| `sound` | `true` | `AudioManager.handleAudioEvent` handles `audio.sfx`. |
| `music` | `true` | `AudioManager.musicTrack` handles music play/stop/fade. |
| `speech` | `false` | No TTS integration. |
| `splitPane` | `false` | Single transcript pane; `layout` channel has no consumer here. |
| `statusBar` | `true` | Real `<header>` with location/score/turns DOM elements. |
| `sidebar` | `false` | No sidebar UI. |
| `clickableText` | `false` | No link-decoration handler today. |
| `clickableImage` | `false` | Moot when `images` is false; would be true in a graphical client. |
| `dragDrop` | `false` | Not implemented. |
| `transitions` | `false` | No transition renderer; would be wired in a graphical client. |
| `layers` | `false` | No layered renderer surface today; one transcript pane only. |
| `customFonts` | `true` | Theme system already loads custom fonts via CSS. |

Net active capabilities for the standard browser client: `text`, `sound`, `music`,
`statusBar`, `customFonts`. Channels that survive the manifest filter: all 10
standard channels (ungated) + `sound` + `music` + `clear` (ungated). All `image:*`,
`animation`, `animate`, `transition`, and `layout` channels are filtered out.

Stories that route to filtered channels will see those channels missing from the
manifest at story init; they can degrade gracefully (skip the routing rule) or
declare a hard dependency on a richer client.

### Listener body (replaces lines 191–219 of current `BrowserClient.ts`)

```ts
// Accumulator for events emitted between text:output ticks
const eventBuffer: ISemanticEvent[] = [];

this.engine.on('event', (event: ISemanticEvent) => {
  eventBuffer.push(event);
  // …existing audio/beep/score-tracking logic stays here unchanged
});

this.engine.on('text:output', (blocks, turn) => {
  const packet = produceTurnPacket({
    textBlocks: blocks,
    events: eventBuffer.slice(),
  });
  eventBuffer.length = 0;

  // Prompt — packet provides the resolved string directly
  const promptText = packet.payload.prompt;
  if (typeof promptText === 'string' && promptText.length > 0) {
    this.inputManager.setPrompt(promptText);
  }

  // Main transcript — flatten each entry, join with \n\n (same as CLI Phase 3)
  const mainEntries = packet.payload.main;
  if (Array.isArray(mainEntries) && mainEntries.length > 0) {
    const flattened = mainEntries
      .map((entry) => flattenContent(entry))
      .filter((s) => s.trim().length > 0)
      .join('\n\n');
    if (flattened) {
      this.textDisplay.displayText(flattened);
    }
  }

  console.log('[text:output]', { turn, mainCount: Array.isArray(mainEntries) ? mainEntries.length : 0 });
  this.currentTurn = turn + this.turnOffset;
  this.updateStatusLine();

  if (this.config.autoSave && turn > 0) {
    const engineSave = this.engineCreateSave();
    this.saveManager.performAutoSave(engineSave, this.getSaveContext());
  }
});
```

### Differences from current BrowserClient

| Concern | Today | After 4B |
|---------|-------|----------|
| Prompt extraction | `blocks.find(b => b.key === 'prompt')`, then `[0]` from content | `packet.payload.prompt` (already flattened to string by `extract: 'string'`) |
| Display blocks | `blocks.filter(b => b.key !== 'prompt')`, then `renderToString(displayBlocks)` | `packet.payload.main`, flattened per-entry then joined |
| Imports | `renderToString` from `@sharpee/text-service` | `produceTurnPacket`, `flattenContent`, bootstrap fns from `@sharpee/channel-service` |
| Hook signatures | `(blocks, turn)` | unchanged |
| Event listener | unchanged | unchanged (still tracks score/audio/beep/restore_completed) |

`engine.on('event', …)` continues to do double duty: side effects (audio, beep, score
tracking, save/restore reactions) AND populating `eventBuffer` for the `produceTurnPacket`
call. This matches the pattern in `scripts/bundle-entry.js` (Phase 3 CLI).

### Boundary Statement (rule 7a)

- **OWNER**: `BrowserClient` instance (per-tab, per-session).
- **SHARED?**: No — each tab has its own `BrowserClient`, its own engine, its own
  channel-service session (via `resetSession`).
- **PROMISE**: BrowserClient header says "Wires together all managers" — adding the
  channel-service bootstrap is consistent (it's another initialization step).
- **ALTERNATIVES**: Bootstrap could live in `browser-entry.ts` (story-side), but that
  would force every story to repeat the bootstrap. Keeping it inside BrowserClient
  matches the CLI pattern (bundle-entry.js owns the bootstrap centrally).

---

## 3. StatusLine migration decision

### Current data flow

`StatusLine.update(location, score, turns)` is called from `BrowserClient.updateStatusLine()`,
which reads:
- `location` ← `saveManager.getCurrentLocation()` (a world query — `world.getEntity(world.getLocation(player.id))?.name`)
- `score` ← `this.currentScore` (instance field, updated by `event.type === 'game.score_changed'` and `syncScoreFromWorld`)
- `turns` ← `this.currentTurn` (instance field, updated from `(turn + turnOffset)` and `restore_completed`)

`updateStatusLine()` is called from 6 sites: `text:output` listener, `score_changed`
event, `restore_completed` event, `runRestoreDialog()`, save callbacks via
`onStateChange`, and the autosave-restore branch in `start()`.

### Available channel-service alternative

`payload.location` (string), `payload.score` (`{current, max}`), and `payload.turn`
(number) are all populated by the platform default rules from `status.room`,
`status.score`, `status.turns` blocks. These blocks are emitted by the engine via
text-service's `cli-renderer` status-line plumbing — confirmed present at
`packages/text-service/src/cli-renderer.ts:229-245`.

### Decision: PACKET-DRIVEN steady-state; world-read seam on restore-only

- **Steady-state (every normal turn)**: `StatusLine` reads from `payload.location`,
  `payload.score`, `payload.turn`. `getCurrentLocation()` and the `turnOffset` math
  are removed from the `text:output` path. `currentScore` and `currentTurn` instance
  fields stay (required for `BrowserSaveEnvelope` slot-index display) but are
  **populated from packets**, not from `game.score_changed` events or
  `(turn + turnOffset)` math.
- **Restore-time bootstrap**: on autosave-restore (and `runRestoreDialog`), no packet
  has yet arrived. The existing world-read path (`saveManager.getCurrentLocation()`
  + reading `currentScore`/`currentTurn` from the envelope) is **retained as a named
  transitional seam** for restore-only. The `text:output` listener takes over once
  the user enters their first command post-restore.
- **Why this split**:
  1. ADR-163's whole point is the wire is the protocol — the status surface should
     read the same packets multi-user surfaces do. Hardwiring world reads in
     `updateStatusLine()` makes platform-browser a privileged peer, which contradicts
     the architecture.
  2. The packet payload already carries everything the status line needs; routing
     rules in `platform-rules.ts` populate `location/score/turn` on every turn that
     produces narrative output.
  3. The restore seam is a separable problem. Closing it requires either (a) the
     engine emitting a status packet on `restore_completed`, or (b) packet-level
     persistence (§4) so the last packet can be replayed. Neither is in 4B's scope.
- **Listener body addition** (in 4B):

```ts
// In the text:output listener, after produceTurnPacket:
if (typeof packet.payload.location === 'string') {
  this.statusLine.setLocation(packet.payload.location);
}
const score = packet.payload.score as { current: number; max: number | null } | undefined;
if (score) this.currentScore = score.current;
if (typeof packet.payload.turn === 'number') this.currentTurn = packet.payload.turn;
this.statusLine.setScoreTurns(this.currentScore, this.currentTurn);
```

- **Listener body removals** (in 4B):
  - `(turn + this.turnOffset)` math — `payload.turn` is the source of truth.
  - `this.updateStatusLine()` call replaced by the explicit packet-driven calls
    above. `updateStatusLine()` itself stays (used by the restore path).
  - `saveManager.getCurrentLocation()` is no longer called from the `text:output`
    path. It remains used by the restore path and by save-envelope slot metadata.
- **Future**: closing the restore seam is a candidate for a post-Phase-4 ADR. The
  cleanest path is engine-emits-status-on-restore; second cleanest is packet-replay
  via packet-level persistence.

---

## 4. local-repaint persistence path

### Current persistence

`SaveManager.performAutoSave(engineSave, context)` writes a `BrowserSaveEnvelope` (v4.0.0)
to `localStorage` after every turn (gated on `config.autoSave`). The envelope contains:
- `engineSave: ISaveData` — full world snapshot (gzipped by the engine)
- `score: number`
- `transcriptHtml: string` — `lz-string`-compressed `#text-content.innerHTML`

Whole envelope is `lz-string`-compressed before write. There is no IndexedDB; no
packet-level persistence; no session log of `TurnPacket`s.

On page refresh, `BrowserClient.start()` calls `saveManager.loadAutosaveEnvelope()`,
applies `engineSave` via `engineApplySave` (rebuilding the world), restores
`currentTurn`/`currentScore` from envelope metadata, and `textDisplay.setHTML(html)`
sets the rendered transcript directly.

### Master plan's `local-repaint` requirement

Master plan §4: *"`local-repaint` policy wired (page refresh replays from persisted
packets via IndexedDB or equivalent)."*

The master plan's intent is functional — the user lands back where they were after
refresh — not strictly that packets are the persistence unit. The current path
satisfies "land back where you were" by restoring the engine state + the rendered
HTML.

### Decision: KEEP autosave-restore as the local-repaint path in 4B

- **Not adding** packet-level persistence (no IndexedDB, no `TurnPacket` log).
- **Trade-off accepted**: the rendered HTML is restored, not the packets. If a story
  switches themes or renderers between sessions, the visible transcript reflects the
  rendering at write time, not the new theme. (Theme switching today triggers
  `data-theme` attribute changes; existing `<p>` elements are styled by the new theme
  via CSS, so this is a non-issue for current themes. Custom story renderers post-4C
  would surface this trade-off.)
- **Why not packet persistence in 4B**:
  1. Adding an IndexedDB layer + packet log + replay mechanism is its own design
     problem (packet schema versioning, log truncation, partial-packet recovery on
     mid-write crash). Out of scope for AC-14.
  2. Existing autosave path is correct for the user-visible behavior; AC-14 does not
     gate on packet-level persistence.
  3. `BrowserSaveEnvelope` is already at v4.0.0 (post the v3 in-house-serializer
     bug fix); bumping it again so soon would burn another save-format cutover.
- **Future**: a packet-replay restore is a candidate for a future ADR if/when
  story-renderer theming changes mid-game become a requirement, or when
  multi-user replay-from-log lands (ADR-164 territory). Per memory
  `feedback_save_format_versioning`, the next save-format change should add a
  version reader rather than another hard-break + auto-delete.

---

## 5. AC-14 test harness recommendation

### Constraint

Per CLAUDE.md rule 12a (Integration Reality), AC-14 names a platform integration —
the bar is a REAL-PATH test against the OWNED dependency `dist/web/dungeo/game.js`.
The system under test cannot be the thing written to stand in for it.

### Options

| | A: Playwright headless | B: jsdom in Node | C: Packet-level in Node |
|---|---|---|---|
| Real-path against built bundle? | **Yes** — loads `dist/web/dungeo/game.js` in Chromium | Partial — loads bundle but in jsdom, not a real browser | **No** — does not load bundle; tests channel-service path only |
| Audio APIs | Native | Need stubs (AudioContext, Audio) | N/A |
| `localStorage`/`lz-string` | Native | Native (jsdom supplies localStorage) | N/A |
| Drives DOM input | `page.fill` / `page.press` | Synthetic event dispatch | N/A |
| Asserts on DOM transcript | Yes — read `#text-content` | Yes — same | No — asserts on packets |
| Rule 12a satisfied? | **Yes** | Marginal (jsdom is a substitute environment) | **No** (stub of OWNED dependency) |
| Dependency cost | `@playwright/test` + browser install (~150 MB) | `jsdom` (~5 MB) | None new |
| CI cost | Slow startup (~2-3s); parallelizable | Fast | Trivial |
| Maintenance cost | Low (mature tool) | Medium (polyfills drift) | Lowest, but doesn't test the thing |

### Recommendation: Option A (Playwright headless Chromium)

- Rule 12a is the deciding factor. AC-14's purpose is to prove the production browser
  bundle produces the expected `main`-channel content — same as AC-13 proved for the
  production CLI bundle. Option C does not run the browser bundle at all. Option B
  loads the bundle but in an artificial environment (no real Web Audio, no real
  browser-level event semantics).
- Playwright's startup cost is acceptable for a single AC-14 gate test. The CLI's
  AC-13 spawns a child process per run; Playwright spawns a browser per run. The
  pattern is the same.
- Playwright install is one-shot (`npx playwright install chromium`). It can be made
  optional — the test gates skip if Playwright is not installed locally, mirroring
  how some integration tests behave today.

### Concrete shape of the AC-14 test

- File: `packages/channel-service/tests/ac-14-browser-real-path.test.ts` (mirrors
  AC-13's location and naming).
- Build pre-step: `./build.sh -s dungeo -c browser` to ensure
  `dist/web/dungeo/game.js` and the surrounding HTML are current.
- Test body:
  1. Launch Chromium via Playwright; navigate to `file://.../dist/web/dungeo/index.html`.
  2. Drive the same command sequence used in AC-13 (a Dungeo command list known to
     produce stable `main`-channel content).
  3. Read `#text-content.innerText` after each command.
  4. Assert the cumulative transcript contains the same strings as AC-13's CLI run
     (e.g., "West of House", room descriptions, action results).
  5. Compare CLI run vs browser run — both come from `produceTurnPacket` so they
     should be packet-identical for the same blocks.

### Concession: a Node-level smoke test for fast iteration

In addition to the Playwright AC-14 gate, a Node-level test
(`ac-14-browser-channel-pipeline.test.ts`) can drive the same fixture blocks through
`produceTurnPacket` and assert on packet content directly. This is fast (no browser
needed) and useful for development feedback. It is **not** the AC-14 gate — AC-14
remains the Playwright test. The Node test is a developer convenience.

### CI notes

- Playwright requires browsers to be installed via `npx playwright install` once.
  Add this to the CI setup script (or pre-built CI image) before the Playwright test
  runs.
- For local dev, the test should `skip` (not `fail`) if Playwright is not installed,
  with a clear message pointing at the install command. Phase 4B can implement this
  conditional skip when wiring the test.

---

## 6. AC-15 test-story extension plan

### Current state of `stories/channel-service-test/`

Today the package is a **pure data fixture**: `index.ts` re-exports `scenarios.ts`,
which provides `block(...)` / `event(...)` builders, `SCENARIO_BASIC_TURN`,
`MEDIA_SCENARIOS`, `SCENARIO_CLEAR_TRUNCATION`, `SCENARIO_TEN_TURN_WALK`, and
`TEN_TURN_STORY_CHANNELS` constants.

It is **not** a runnable Sharpee story:
- No `Story` export with `id`, `title`, `version`, `initializeWorld`, etc.
- No `extendParser` / `extendLanguage`.
- No bundled output that `dist/cli/sharpee.js --test` could load.

### AC-15's requirements

- A custom `json` channel registered by a story (e.g., `debug-stats`).
- A platform rule mapping a story-specific block key to that channel.
- A story-supplied renderer that consumes the channel payload deterministically.
- The same story runs through both CLI bundle (`dist/cli/sharpee.js`) and the browser
  surface (Phase 4A harness) for the same command sequence; resulting packets and
  rendered output must be identical.

### Decision: extend `stories/channel-service-test/` to ALSO be a playable story

- **Why extend, not create a second story**:
  - Per memory `feedback_new_package_config`, every new package adds 6 registration
    points. A second test story is expensive scaffolding.
  - Adding `Story` plumbing to an existing test fixture is cheap.
  - Both purposes (Phase 2 data fixtures + Phase 4C playable AC-15 fixture) coexist
    cleanly: the data exports stay; the new file `playable-story.ts` adds the
    `Story` shape and registers the custom channel + renderer.
- **Why not modify Dungeo**: explicit project rule — Dungeo is the regression
  baseline, never a fixture.

### Proposed structure

```
stories/channel-service-test/
├── package.json                 # add dependencies for playable mode (engine, world-model, etc.)
├── src/
│   ├── index.ts                 # re-exports both scenarios and playable story
│   ├── scenarios.ts             # UNCHANGED — Phase 2 data fixtures
│   └── playable-story.ts        # NEW — Story implementation for AC-15
```

`playable-story.ts` shape (sketch):

```ts
import { registerChannel, addRule } from '@sharpee/channel-service';
import type { Story } from '@sharpee/engine';
import { CORE_BLOCK_KEYS } from '@sharpee/text-blocks';

export const STORY_BLOCK_KEYS = {
  DEBUG_STATS: 'story.debug_stats',
} as const;

export const STORY_CHANNEL_IDS = {
  DEBUG_STATS: 'debug-stats',
} as const;

export const story: Story = {
  id: 'channel-service-test',
  title: 'Channel-Service Test Story',
  version: '0.1.0',

  initializeWorld(world) {
    // Single room, player, one item — enough to drive a deterministic
    // command sequence (LOOK, TAKE …, STAT). No NPCs, no RNG.
  },

  extendParser(parser) {
    // Add `stat` verb that emits the story.debug_stats block.
  },

  // After channel-service bootstrap, before produceCmgtManifest, the
  // story registers its custom channel + rule.
  registerChannels() {
    registerChannel({ id: STORY_CHANNEL_IDS.DEBUG_STATS, contentType: 'json',
                      mode: 'replace', emit: 'sparse' });
    addRule({
      when: { key: STORY_BLOCK_KEYS.DEBUG_STATS },
      emit: { channel: STORY_CHANNEL_IDS.DEBUG_STATS,
              extract: (block) => JSON.parse(flattenContent(block.content)) },
    });
  },
};

// Pure renderer — importable by both CLI test and browser test
export function renderDebugStats(payload: unknown): string {
  return `STATS: ${JSON.stringify(payload)}`;
}
```

### Walkthrough transcript for AC-15

- File: `stories/channel-service-test/walkthroughs/wt-stat.transcript`
- Sequence: `look` → `take widget` → `stat` (custom verb produces `story.debug_stats`
  block) → `stat` (re-emit, prove sparse-emit suppression on unchanged value).
- Assertions: `payload.debug-stats` present after first `stat`; absent after second
  (sparse + unchanged); `renderDebugStats(payload['debug-stats'])` produces identical
  string in both CLI and browser runs.

### Dependencies to add to `stories/channel-service-test/package.json`

- `@sharpee/engine`, `@sharpee/world-model`, `@sharpee/parser-en-us`,
  `@sharpee/lang-en-us`, `@sharpee/stdlib`, `@sharpee/channel-service` (for the
  channel + rule registration), `@sharpee/text-blocks` (already present).

### Open question

The story's `registerChannels()` hook needs to fire at the right point in the
bootstrap sequence — specifically after `registerStandardChannels()` and
`registerPlatformRules()` but **before** `produceCmgtManifest()` (channel registry
freezes on manifest production). Today the engine has no `Story.registerChannels`
hook. Phase 4C must either:

- Add a `registerChannels` hook to the `Story` interface and call it from the
  CLI bundle's bootstrap and from `BrowserClient.start()`, OR
- Have the consumer (CLI bundle / BrowserClient) accept a callback parameter for
  story-side registration, OR
- Defer story-channel registration into a story-specific entry that wraps the
  consumer's bootstrap.

Recommendation: add the `Story.registerChannels` hook. It's the cleanest extension
point and keeps the consumer bootstrap stable. Phase 4C should propose this as an
ADR-163 amendment or as a new ADR.

---

## 7. text-service post-Phase-4 disposition

### Two distinct roles in text-service today

text-service exposes two role surfaces; they have different futures:

**Role A — Block production (`processTurn`)**
- Used by the **engine** at `packages/engine/src/game-engine.ts:881, 1102, 1440`.
- Consumes `ISemanticEvent[]` and produces `ITextBlock[]`.
- This is the canonical event-to-blocks transformer. **Channel-service depends on it**
  — `produceTurnPacket(input)` accepts `textBlocks: ITextBlock[]` as input. Without
  text-service producing those blocks, channel-service has nothing to route.
- **Disposition: PERMANENT.** Not deprecated.

**Role B — Wire production (`renderToString`, `renderStatusLine`)**
- Pre-Phase-3: consumed by the CLI bundle, transcript-tester, platform-browser,
  Zifmia, legacy platforms.
- Phase 3 retired: CLI bundle (now uses channel-service).
- Phase 4B will retire: platform-browser.
- Phase 4C will retire: transcript-tester (story-loader.ts, fast-cli.ts).
- Phase 4D will resolve: legacy platforms (`packages/platforms/cli-en-us/`,
  `packages/platforms/browser-en-us/`) — both confirmed dead paths.
- **Surviving consumers post-Phase-4D**:
  - `packages/interpreter/` (`ChatOverlay.tsx:141,171`, `GameContext.tsx:218`) —
    Zifmia migration is **out of scope** per master plan. Zifmia retains
    `renderToString` until a separate Zifmia-channel-service migration ADR.
  - `packages/sharpee/templates/browser/browser-entry.ts.template` — story
    scaffolding template; ships to downstream story authors.
  - `stories/armoured/src/browser-entry.ts` — story-specific browser entry.
  - `stories/cloak-of-darkness/run-platform.js`, `test-runner.ts`, `test-parser-events.js`
    — CoD legacy scripts (predate platform-browser).
  - Re-export chain: `packages/sharpee/src/index.ts:64-65`,
    `packages/runtime/src/index.ts:106-107`, `packages/bridge/src/index.ts:104-105`
    — `renderToString` and `renderStatusLine` re-exported for downstream consumers.

### Disposition: KEEP package; expand the deprecation header

- **Cannot retire** the package — Role A (block production) is permanent.
- **Cannot delete** `renderToString`/`renderStatusLine` — Zifmia and downstream
  story templates depend on them.
- **4D action**:
  1. Update `packages/text-service/src/index.ts` header to reflect post-Phase-4
     state: Role A is permanent; Role B is retained for Zifmia + downstream story
     authors but no longer used by any first-party platform consumer.
  2. `renderStatusLine` is not used anywhere in the workspace today (re-export
     chain only). It can stay exported for downstream use.
  3. No file deletions in 4D.
  4. Re-export chains in `sharpee`, `runtime`, `bridge` stay — they are part of
     the public API that downstream packages and templates import.

### What 4D's "text-service audit document" should say

The audit document at `docs/work/channel-io-unification/text-service-disposition-20260502.md`
(per the plan) should:
- List every export from `packages/text-service/src/index.ts`.
- For each export: which packages import it, which roles use it.
- Conclude: package retained; Role A permanent; Role B retained for
  Zifmia + downstream consumers; deprecation header updated.

---

## 8. Carry-forwards from Phase 3

### (a) Block-separator parity (`\n\n` flat join vs `renderToString` smart joining)

Phase 3 noted: CLI's `flattenContent(entry).join('\n\n')` produces double-newline
separators between every entry, whereas `renderToString` did smart-joining (single
`\n` between consecutive same-key blocks, `\n\n` between different-key blocks).

**Browser context**: `TextDisplay.displayText(text)` already splits on `\n\n+` and
creates `<p>` elements per paragraph — see `display/TextDisplay.ts:24-35`. This means
`flattenContent` + `\n\n`-join in the browser **happens to match TextDisplay's
paragraph model** more cleanly than it matches the CLI's terminal stream. The browser
may not exhibit the same regression the CLI did.

**Recommendation for 4B**: use the same flatten + join pattern as Phase 3. If the
visible transcript looks subtly different from pre-migration, it's a paragraph-break
question, not a content-loss question. Document the trade-off; do not invent a
smart-joiner unless AC-14 surfaces a real problem.

**Decoration loss**: same as CLI — `flattenContent` strips decoration wrappers, so
`<em>`/`<strong>`/etc. cannot reach the DOM via the current `displayText(string)` API.
A future enhancement could change `TextDisplay` to accept `TextContent[][]` and render
decoration nodes as DOM. **Not in 4B scope.** This is a candidate for a post-Phase-4
enhancement once author-supplied renderers (4C work) demonstrate the need.

### (b) Interactive RESTART

Phase 3 noted: in CLI `--play` mode, RESTART would not call `resetSession()`, so
channel-service singletons could carry stale state across a restart.

**Browser context**: `BrowserClient.getSaveRestoreHooks().onRestartRequested` does
`window.location.reload()` (line 403). Page reload starts a fresh JavaScript context
— all module-level state, including channel-service's session singleton, gets fresh
state. **No additional handling needed for browser RESTART.** This is cleaner than
the CLI gap.

The only edge case: a browser story that wires `onRestartRequested` to a
non-page-reload path (e.g., calling `world.clear()` and replaying init). Stories that
do that would need to call `resetSession()` themselves. Not a default-path concern;
not in 4B scope.

### (c) Legacy platform packages (`packages/platforms/cli-en-us/`, `packages/platforms/browser-en-us/`)

Both are dead paths — Phase 3 confirmed CLI legacy is unused; Phase 4 confirms
browser legacy is unused (the browser bundle uses `BrowserClient` from
`platform-browser/`, not `BrowserPlatform` from `platforms/browser-en-us/`).

**Phase 4D decision required**: delete, archive to `docs/work/retired/`, or keep with
a header marking them retired. Per project no-backcompat principle, delete is the
defensible default if no downstream package outside the workspace consumes them.
Phase 4D must verify the latter (search for `platforms/browser-en-us` and
`platforms/cli-en-us` references in any downstream story or template) before
executing the delete.

---

## 9. ADR-101 grep-gate baseline (for AC-16)

`grep -r 'media\.image\.show|media\.sound\.play|media\.music|media\.ambient|media\.animation|media\.animate|media\.transition|media\.layout\.configure' packages/ --include='*.ts'` produces matches in:

- `packages/channel-service/` — routing tables (intended; survives AC-16).
- `stories/channel-service-test/src/scenarios.ts` — fixture scenarios (test-only; not
  an emission site; survives AC-16).

There are **no ADR-101 emission sites** in any first-party platform package as of the
audit date. AC-16's grep gate (`grep ... | grep -v 'packages/channel-service'`) is
already satisfied for `packages/`. Phase 4D's AC-16 work is primarily:

- Confirm the gate holds at the end of Phase 4 (no new emissions introduced).
- Resolve legacy platforms (carry-forward c).
- Update text-service header (item 7).

---

## 10. Decisions (confirmed 2026-05-02)

All five Phase 4A open questions resolved with user.

1. **Browser capability values** — Conservative defaults adopted. Active flags:
   `text`, `sound`, `music`, `statusBar`, `customFonts`. All others `false`.
   Rationale: platform-browser is the standard web client; richer capabilities
   belong to separate client packages with their own renderers.
2. **StatusLine** — **Packet-driven steady-state** (`payload.location`, `payload.score`,
   `payload.turn`). World-read retained as a named transitional seam on
   restore-only. `currentScore`/`currentTurn` instance fields stay (for save
   envelope slot metadata) but are populated from packets, not from
   `game.score_changed` events.
3. **local-repaint** — Keep autosave-restore. No IndexedDB, no packet-level
   persistence in 4B. Save format stays at `BrowserSaveEnvelope` v4.0.0.
4. **AC-14 test harness** — Playwright headless Chromium. Drives the production
   browser bundle in a real browser; satisfies rule 12a (Integration Reality).
   Concrete test path: `packages/channel-service/tests/ac-14-browser-real-path.test.ts`.
5. **`Story.registerChannels` hook** — Add to the `Story` interface in 4C as an
   ADR-163 amendment. Fires after `registerPlatformRules()` and before
   `produceCmgtManifest()`. Required for AC-15 (story-supplied custom channels).

---

## Status

- **Phase 4A**: Audit complete. All seven discovery items + three carry-forwards
  documented.
- **Next**: Phase 4B (Platform-Browser Channel-Service Wiring — AC-14 gate). Requires
  user review of §10 questions before implementation begins.
- **Files modified by 4A**: this audit document only. No source files touched.
