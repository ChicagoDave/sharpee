# Plan: Retire the Legacy `engine.on('event', ...)` Listener in BrowserClient

**Date**: 2026-05-04
**Target file**: `packages/platform-browser/src/BrowserClient.ts`
**ADR foundation**: ADR-163 (Channel-Service Platform), ADR-165 (Renderer Scaffolding)
**Project memory**: `project_channels_universal_ui_surface.md` — "channels are the universal UI surface; transport sits below channels."

---

## Goal and Motivation

The `BrowserClient` currently registers three engine listeners:

1. `engine.on('channel:manifest', ...)` — applies the channel-service manifest to the renderer.
2. `engine.on('channel:packet', ...)` — drives the renderer and auto-save on every turn.
3. `engine.on('event', ...)` — a legacy raw-event listener at line 249 with four leftover responsibilities.

The project commitment in ADR-163 and the channel-IO post-R8 audit (2026-05-04) requires that the browser client's UI-side coupling to raw semantic events disappear entirely. After this plan executes, only listeners 1 and 2 remain. Listener 3 is deleted.

This is a **no-backwards-compatibility** plan (per project policy). Removed APIs are deleted outright; no deprecation stubs.

---

## Current-State Inventory

All references are in `packages/platform-browser/src/BrowserClient.ts` unless otherwise noted.

### Branch 1 — Audio routing (lines 257–261)

```typescript
if (event.type.startsWith('audio.')) {
  this.audioManager.handleAudioEvent(event as { type: string; data: any });
  return;
}
```

The story (`stories/dungeo/src/audio/audio-setup.ts`) emits these raw event types via an event-processor handler on `if.event.actor_moved`:
- `audio.ambient.play` (with `channel`, `src`, `volume`, `loop`, `fadeIn`)
- `audio.ambient.stop_all`
- `audio.music.play` (with `src`, `volume`, `loop`, `fadeIn`)
- `audio.effect` (with `target`, `effect`, `params`, `transition`)

The `AudioManager.handleAudioEvent()` (`packages/platform-browser/src/audio/AudioManager.ts:49`) handles `audio.ambient.play`, `audio.ambient.stop`, `audio.ambient.stop_all`, `audio.music.play`, `audio.music.stop`, and `audio.sfx`. **It does not handle `audio.effect`** — that event is silently dropped today.

The stdlib media-channel infrastructure (`packages/stdlib/src/channels/media.ts`) already defines `soundChannel` (→ `media.sound.play`), `musicChannel` (→ `media.music.play`/`stop`), and `createAmbientChannel(id)` (→ `media.ambient.play`/`stop`). Browser-side renderers for those channels exist in `packages/platform-browser/src/channels/audio.ts` and are registered by `registerDefaultBrowserRenderers`.

The gap: the dungeo story emits `audio.*` events (legacy vocabulary), but the stdlib channels listen for `media.*` events (canonical vocabulary). The event processor in `audio-setup.ts` is the translation site — it reads `if.event.actor_moved` and emits `audio.*`. Phase 3 must decide where the `audio.*` → `media.*` translation lives going forward.

### Branch 2 — Story event callback (lines 263–266)

```typescript
if (this.config.callbacks?.handleStoryEvent?.(event, this)) {
  return;
}
```

This is a public API hook: `BrowserClientCallbacks.handleStoryEvent` in `packages/platform-browser/src/types.ts:46`. One caller exists:

- `stories/dungeo/src/browser-entry.ts:113–152` — handles two custom events:
  - `dungeo.event.rname` — displays room name text.
  - `dungeo.event.objects` — displays formatted object list.

Both events are emitted by story-specific actions (`rname-action.ts`, `objects-action.ts`).

### Branch 3 — Error beep (lines 268–274)

```typescript
if (event.type === 'command.failed' || event.type === 'action.blocked' ||
    event.type.includes('.blocked') || event.type === 'game.player_death') {
  this.beep();
}
```

User direction: **delete entirely**. Not migrate.

Additional beep call-sites outside the event listener:
- `BrowserClient.ts:724` — manual restore dialog "no saved game found".
- `BrowserClient.ts:837` — manual save failure in `performSave()`.

The `beep()` method lives at:
- `BrowserClient.ts:777–779` — delegates to `AudioManager.beep()`.
- `AudioManager.ts:134–155` — Web Audio oscillator implementation.
- `types.ts:56` — `BrowserClientInterface.beep(frequency?, duration?)` — public API.

### Branch 4 — Save/restore lifecycle (lines 276–296)

```typescript
if (event.type === 'platform.save_failed') {
  this.appendSystemMessage(`[Save failed: ...]`);
  this.beep();
} else if (event.type === 'platform.restore_failed') {
  this.appendSystemMessage(`[Restore failed: ...]`);
  this.beep();
} else if (event.type === 'platform.restore_completed') {
  if (restoreData?.turnCount !== undefined) {
    this.currentTurn = restoreData.turnCount;
  }
  this.renderCombinedStatus();
}
```

The platform events are defined in `packages/core/src/events/platform-events.ts` and emitted by `packages/engine/src/platform-operations.ts` via `context.emitEvent()`. The engine fires these when the save/restore hook flow completes. There is **no channel currently**  that projects these events — they exist only in the raw event stream.

---

## Sequencing Rationale

Phases run small → large to keep each phase's diff and risk surface minimal:

- **Phase 1** (beep removal) touches only deletion — zero semantic risk, smallest possible diff.
- **Phase 2** (save/restore channel) introduces one new channel and one new renderer — bounded to platform-browser + stdlib, no story changes.
- **Phase 3** (audio Tier C) is larger: requires coordinating story-side event emission with channel vocabulary. Isolated to audio paths; no story text or save logic affected.
- **Phase 4** (handleStoryEvent retirement) is a public-API breaking change requiring a story-side migration. Depends on Phase 3 being complete (audio is not currently routed through handleStoryEvent, but the audit must confirm that before Phase 4 proceeds).

Each phase ships and walkthroughs pass before the next phase starts.

---

## Phase 1 — Delete Beep (Pure Deletion)

**Tier**: Small
**Estimated tool calls**: ~50

### Scope

Pure deletion. No new code, no new tests (no existing tests assert beep behavior).

### Files touched

| File | Change |
|------|--------|
| `packages/platform-browser/src/BrowserClient.ts` | Remove beep call at line 273, 283, 289, 724, 837; remove `beep()` method at lines 777–779; update the inline doc comment at lines 240–248 to remove the beep bullet |
| `packages/platform-browser/src/types.ts` | Remove `beep(frequency?: number, duration?: number): void` from `BrowserClientInterface` (line 56) and its JSDoc |
| `packages/platform-browser/src/audio/AudioManager.ts` | Remove `beep()` method (lines 134–155) and its JSDoc |

**Repo-wide grep confirms**: no other caller of `BrowserClientInterface.beep` exists outside the three files above (dist/ files are artifacts, not sources).

### Behavior statement

DOES: Removes the PC-speaker beep from all error paths and save/restore failure paths in the browser client.
WHEN: Always — the entire beep capability is deleted.
BECAUSE: The beep was acknowledged as a historical joke and is no longer wanted. Its retention as a public interface method `BrowserClientInterface.beep()` actively misleads story authors about available client capabilities.
REJECTS WHEN: N/A — this is a deletion, not a new behavior.

### Test strategy

No new tests needed — no beep behavior to assert. The passing walkthrough chain (wt-01 + wt-02, currently 49/49) serves as the regression gate: if beep removal breaks audio initialization it would surface as AudioManager errors at startup.

After Phase 1, run:
```
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

### Acceptance criteria

- `BrowserClientInterface` has no `beep` member.
- `AudioManager` has no `beep()` method.
- `BrowserClient` has no `this.beep()` call sites.
- Walkthrough chain passes 49/49.

### Risk

**Lowest risk of any phase.** The only risk is an AudioContext initialization that was triggered by `beep()` on first error. If AudioManager relied on the beep path to initialize its `AudioContext` before ambient audio plays, ambient audio in Dungeo could break. Mitigation: inspect the `AudioManager.unlock()` path — it initializes via the unlock gesture, not beep, so this risk is already mitigated.

### ADR candidate

None — pure deletion needs no ADR.

---

## Phase 2 — Save/Restore Lifecycle Channel

**Tier**: Medium
**Estimated tool calls**: ~200

### Scope

Introduce a new `lifecycle` channel (or `save.status` — see ADR decision below) that projects `platform.save_failed`, `platform.restore_failed`, and `platform.restore_completed` events from the engine's turn event stream. Register a browser-side renderer that replicates the existing three behaviors: append system message on failure, bump `currentTurn` + refresh status on restore_completed.

After this phase, lines 276–296 of the event listener come out. At end of Phase 2, the event listener contains only branches 1 and 2 (audio + handleStoryEvent).

### Design decision — ADR candidate A

**Where does the lifecycle channel live?**

Options:
- **stdlib** — consistent with all other channels; `ChannelProduceContext` gives access to `ctx.events`, which is where `platform.*` events appear. No new package dependencies.
- **platform-browser** — avoids adding lifecycle channel definitions to stdlib (stdlib doesn't own browser-only concepts like "system message"). But it creates a channel definition that lives outside the stdlib channel registry, which complicates the CMGT manifest.

**Recommendation**: stdlib, alongside the standard channels, as `lifecycleChannel` with id `'lifecycle'`. The channel is event-mode, `emit: 'sparse'`, payload type:

```typescript
interface LifecyclePayload {
  kind: 'save_failed' | 'restore_failed' | 'restore_completed';
  message?: string;    // present on save_failed / restore_failed
  turnCount?: number;  // present on restore_completed
}
```

The stdlib channel closure scans `ctx.events` for `platform.save_failed`, `platform.restore_failed`, and `platform.restore_completed` and projects the last one (if any) as the payload. This mirrors the existing event-mode channel pattern exactly.

**ADR question to raise with user**: should the lifecycle channel carry save_failed/restore_failed messages verbatim (matching current behavior) or should it carry structured `{kind, error?}` and let the renderer format the text? The latter is more flexible (lang-en-us could own the strings eventually); the former ships faster. Plan defers to user; default is structured payload with the renderer formatting the text string (same as today's `appendSystemMessage` call).

### Files touched

| File | Change |
|------|--------|
| `packages/stdlib/src/channels/standard.ts` | Add `lifecycleChannel` (`IOChannel`) listening for the three `platform.*` event types; add to `STANDARD_CHANNELS` array and `STANDARD_CHANNEL_IDS` |
| `packages/stdlib/src/channels/index.ts` | Export `lifecycleChannel`, `LifecyclePayload` |
| `packages/platform-browser/src/channels/` | Add `lifecycle.ts` — `createLifecycleChannelRenderer(appendSystemMessage, onRestoreCompleted)` |
| `packages/platform-browser/src/channels/index.ts` | Export the new renderer builder; add it to `registerDefaultBrowserRenderers` |
| `packages/platform-browser/src/BrowserClient.ts` | Remove lines 276–296 from the event listener; remove the second `this.beep()` call in the save_failed/restore_failed branches (already deleted in Phase 1, so this is just confirming the block is gone) |

### Behavior statement

**lifecycleChannel (stdlib)**
DOES: On a turn that contains a `platform.save_failed`, `platform.restore_failed`, or `platform.restore_completed` event, emits a `LifecyclePayload` carrying the event kind and (where applicable) the error message or turn count from the event's data. Emits `undefined` (sparse-suppress) on turns with no matching events.
WHEN: Called by the channel-service on every turn.
BECAUSE: The engine's save/restore hook flow emits these raw events after hook completion; the lifecycle channel lifts them into the channel surface so browser renderers don't need to inspect raw events.
REJECTS WHEN: N/A — never throws. Unrecognized events are ignored.

**createLifecycleChannelRenderer (platform-browser)**
DOES: On `'save_failed'` payload — calls `appendSystemMessage('[Save failed: {message}]')`. On `'restore_failed'` — calls `appendSystemMessage('[Restore failed: {message}]')`. On `'restore_completed'` — if `turnCount` is present, sets `currentTurn = turnCount`, then calls `renderCombinedStatus()`.
WHEN: `onValue(payload)` is called by the channel dispatcher.
BECAUSE: Reproduces the exact behavior currently in lines 276–296 of the raw event listener, now driven through the channel surface.
REJECTS WHEN: Silently skips unknown `kind` values (forward-compatible with future lifecycle events).

### Test strategy

1. **Unit test** (`packages/platform-browser/tests/channels/lifecycle.test.ts` or extend `notify-image-audio.test.ts`): create a mock `appendSystemMessage` and `onRestoreCompleted`, call `renderer.onValue()` with each kind, assert the correct callback fires with the correct argument.
2. **Channel-service integration test** (`packages/stdlib/tests/channels/lifecycle.test.ts`): create a `ChannelProduceContext` stub with each platform event in `ctx.events`, call `lifecycleChannel.produce(ctx)`, assert the payload shape.
3. **Regression**: walkthrough chain 49/49.

Both unit tests grade GREEN (state-assertion style — they assert `appendSystemMessage` was called with the exact expected string, not just that a renderer method ran).

### Acceptance criteria

- `lifecycleChannel` is in `STANDARD_CHANNELS` and exported from stdlib.
- The lifecycle renderer is registered by `registerDefaultBrowserRenderers`.
- Lines 276–296 in the raw event listener are deleted.
- System message text on save failure / restore failure is identical to pre-Phase-2 behavior.
- Turn counter bumps correctly on restore_completed.
- Walkthrough chain passes 49/49.
- AC-13, AC-14, AC-15, AC-16 pass (AC-16 grep gate must be updated if `platform.*` string literals appear in the new stdlib channel file — but those are not ADR-101 media events, so AC-16 is unaffected).

### Risk

**Medium.** The `platform.restore_completed` event carries `turnCount` which is used to update `currentTurn`. Verifying the data shape between `platform-operations.ts`'s emitted payload and what `lifecycleChannel.produce` reads is critical. Mitigation: write the channel unit test first and run it against the real event shape from `createRestoreCompletedEvent()` in core — don't assume the payload field name.

The `appendSystemMessage` DOM path writes directly to the main slot. After Phase 2, it still uses the same `appendSystemMessage` method — no DOM change. Risk of visual regression is low.

---

## Phase 3 — Audio Tier C: Raw `audio.*` Events → Media Channels

**Tier**: Large
**Estimated tool calls**: ~350

### Scope

Retire the `if (event.type.startsWith('audio.')) { ... }` branch (lines 257–261) by migrating the story's event-processor handler to emit `media.*` events (canonical stdlib vocabulary) instead of `audio.*` events (legacy vocabulary). The existing browser-side `AudioManager`-backed renderers for `sound`, `music`, and `ambient:<id>` channels then handle the audio automatically through `channel:packet`, with no raw event listener needed.

### Current event vocabulary vs. canonical channel vocabulary

| Current event (audio-setup.ts emits) | Canonical channel / event |
|---------------------------------------|---------------------------|
| `audio.ambient.play` (channel, src, volume, loop, fadeIn) | `media.ambient.play` → `ambient:<id>` channel via `createAmbientChannel(id)` |
| `audio.ambient.stop_all` | No direct channel equivalent — see design note |
| `audio.music.play` | `media.music.play` → `musicChannel` |
| `audio.effect` | No channel equivalent today — see design note |

**Design note — `audio.ambient.stop_all`**: The stdlib `createAmbientChannel(id)` handles stop per-channel (`media.ambient.stop` with matching `channel` id). There is no "stop all" channel. Options: (a) iterate all registered ambient channel ids and emit a stop per channel; (b) add a new `ambient:*` wildcard channel to stdlib that handles stop_all. Option (a) is simpler and avoids a new platform concept. The story must know which ambient channels it registered — it already does, since it calls `audioRegistry.atmosphere(roomId).ambient(src, channel, vol)` and knows the channel ids.

**Design note — `audio.effect`**: The `audio.effect` event is emitted by dungeo's audio-setup with `{ target, effect, params, transition }`. It is not handled anywhere today (AudioManager has no `audio.effect` case — silently dropped). This plan must decide: (a) map it to a new `media.animate` or `media.transition` channel if the semantic fits; (b) add it as a new `media.effect` channel to stdlib; (c) drop it as dead code. **Requires user decision**. Plan marks this as ADR candidate B. Until the decision is made, Phase 3 can ship with `audio.effect` remaining unhandled (same as today) and be addressed in a follow-on.

### Story-side migration in `audio-setup.ts`

The event-processor handler in `registerAudioHandler()` currently emits `audio.*` events. After Phase 3 it must emit `media.*` events instead. Additionally, the story must register the ambient channels it uses via `Story.registerChannels` (calling `createAmbientChannel(id)` for each atmosphere channel id in the `AudioRegistry`).

Because Dungeo uses a single ambient channel id (`'environment'` — from `audioRegistry.atmosphere(roomId).ambient(src, 'environment', vol)`), the registration is:

```typescript
// In DungeoStory.registerChannels():
import { createAmbientChannel } from '@sharpee/stdlib';
return [createAmbientChannel('environment')];
```

And the ambient renderer must be registered in `browser-entry.ts` after `registerDefaultBrowserRenderers`:

```typescript
renderer.registerRenderer('ambient:environment',
  createAmbientChannelRenderer(audioManager, 'environment'));
```

The reference pattern for story-side channel registration is `stories/channel-service-test/` (R7): `playable-story.ts` + `channels.ts` + `renderer.ts`.

### Files touched

| File | Change |
|------|--------|
| `stories/dungeo/src/audio/audio-setup.ts` | `registerAudioHandler` emits `media.ambient.play`, `media.ambient.stop` (per channel), `media.music.play`, `media.music.stop`; drops `audio.ambient.stop_all` → per-channel stops; `audio.effect` handling deferred (ADR-B) |
| `stories/dungeo/src/playable-story.ts` (or equivalent) | Add `registerChannels()` returning `[createAmbientChannel('environment')]` |
| `stories/dungeo/src/browser-entry.ts` | After `registerDefaultBrowserRenderers`, register `ambient:environment` renderer with the shared `audioManager` instance |
| `packages/platform-browser/src/BrowserClient.ts` | Remove lines 257–261 (audio branch) from event listener |
| `packages/platform-browser/src/audio/AudioManager.ts` | `handleAudioEvent` is now only called by channel renderers — no change needed to the method itself; remove any documentation implying it also receives raw engine events |

### Behavior statement

**registerAudioHandler (after migration)**
DOES: On `if.event.actor_moved`, emits `media.ambient.play` events for each ambient track in the destination room's atmosphere, and `media.music.play` for the music track if present; emits `media.ambient.stop` (per active channel id) when moving to a room with no atmosphere.
WHEN: Every player movement event that has a `toRoom` field.
BECAUSE: The media channels (`ambient:environment`, `music`) carry this audio data to the browser renderer, which passes it to AudioManager for Web Audio playback — no raw engine event listener needed.
REJECTS WHEN: Event has no `toRoom` field (returns `[]`). Unknown room (no atmosphere entry) emits stops for each known ambient channel.

### Test strategy

1. **Unit test** for `registerAudioHandler` after migration: stub the event processor, fire `if.event.actor_moved` for a room with atmosphere, assert the returned effects contain `{ type: 'emit', event: { type: 'media.ambient.play', ... } }`.
2. **AC-16 grep gate** must not flag the new `media.ambient.play` references in `audio-setup.ts` since that file is not in the allow-list — **wait**: `audio-setup.ts` IS a story source file that now legitimately emits `media.*` events because it owns the translation from `if.event.actor_moved` to `media.*`. This is conceptually the same as any other story that emits media events. **AC-16's allow-list must be extended** to include `stories/dungeo/src/audio/` OR the event emission must be moved into a stdlib helper.

   This is **ADR candidate B's secondary concern**: the right long-term position is for stdlib's ambient channel infrastructure to include a builder that takes an `AudioRegistry` and registers channels + an event handler that emits the correct `media.*` events automatically — so the story doesn't emit `media.*` directly. That would keep stories in the "consumer" role and the channel system in the "producer" role.

   For this plan: Phase 3 will add `stories/dungeo/src/audio/audio-setup.ts` to AC-16's allow-list with a comment explaining the transitional nature, and file an issue for the stdlib AudioRegistry helper.

3. **Audio regression**: no automated audio test exists (Web Audio API is not available in Node/vitest). Regression is human-verified: launch the browser build and confirm ambient sound plays on room entry in Dungeo.
4. Walkthrough chain 49/49 (walkthroughs are CLI-only and don't exercise audio).

### Acceptance criteria

- No `engine.on('event')` listener processes `audio.*` events.
- `audio-setup.ts` emits `media.*` events; the old `audio.*` vocabulary is gone from that file.
- Ambient audio works in the browser build (human smoke-test).
- AC-16 passes (with updated allow-list as described above).
- Walkthrough chain passes 49/49.
- `audio.effect` behavior is documented as out-of-scope pending ADR-B resolution (filed as GitHub issue).

### Risk

**Largest risk of any phase.** Audio is not covered by automated tests. Regression requires a human test run of the browser build.

Specific risks:
1. The `ambient:environment` channel may not be registered before the first room-entry event fires. Mitigation: register channels in `registerChannels()` (called before engine start) not in `connectEngine`.
2. The `stop_all` → per-channel-stop translation requires knowing all active channel ids at the time of the stop. The story-side `AudioRegistry` has this knowledge, but the event handler currently just emits one `stop_all` and lets AudioManager loop internally. Post-migration, the handler must emit one `media.ambient.stop` per registered channel id. Mitigation: `audioRegistry` is in scope in `audio-setup.ts`; iterate `audioRegistry.getAtmospheres()` to collect all channel ids.
3. `audio.effect` silently drops today and will continue to silently drop after Phase 3. This is not a regression — document it.

### ADR candidate B

**Audio event vocabulary and the `audio.*` → `media.*` translation boundary.**
Decision: Where should the translation from `if.event.actor_moved` to `media.*` live — in the story, in a stdlib AudioRegistry helper, or as a capability on the channel-service? Consequences: if in story, AC-16 needs an extended allow-list; if in stdlib, the AudioRegistry must grow a channel-registration builder and the story shrinks. The plan recommends stdlib in the long run but ships Phase 3 as story-side for velocity.

---

## Phase 4 — Retire `handleStoryEvent` Story Callback

**Tier**: Medium
**Estimated tool calls**: ~200

### Scope

Delete the `BrowserClientCallbacks.handleStoryEvent` public API and migrate its one consumer (Dungeo's `browser-entry.ts`) to the channel-service pattern.

After this phase, the entire `engine.on('event', ...)` listener body has no remaining branches and the listener itself is deleted. The static "two listeners only" acceptance test (AC-17) is added and must pass.

### Dependency on Phase 3

The current `handleStoryEvent` callback in `browser-entry.ts` does NOT handle any audio events — it only handles `dungeo.event.rname` and `dungeo.event.objects`. Phase 4 does not depend on Phase 3's audio migration. However, Phase 4 must run after Phase 3 because the event listener's audio branch must be gone before the listener itself can be deleted.

Phases 3 and 4 could potentially be reordered (delete handleStoryEvent before audio), but the sequencing is: Phase 4 = last, because it deletes the listener shell itself.

### Migration pattern for `dungeo.event.rname` and `dungeo.event.objects`

These two custom events currently flow: story action emits event → engine event stream → `handleStoryEvent` callback → `client.displayText(text)`.

Post-migration they flow: story action emits event → **new story-defined channel** → channel:packet → browser-side channel renderer → DOM.

**Migration path:**

1. **New channel in Dungeo's `registerChannels()`**:

```typescript
// dungeo/src/channels.ts (new file, following channel-service-test pattern)
export const rnameChannel: IOChannel<string> = {
  id: 'dungeo.rname',
  contentType: 'text',
  mode: 'event',
  emit: 'sparse',
  produce: (ctx) => {
    for (const event of ctx.events) {
      if (event.type === 'dungeo.event.rname') {
        return (event.data as { roomName?: string })?.roomName;
      }
    }
    return undefined;
  },
};

export const objectsChannel: IOChannel<string> = {
  id: 'dungeo.objects',
  contentType: 'text',
  mode: 'event',
  emit: 'sparse',
  produce: (ctx) => {
    for (const event of ctx.events) {
      if (event.type === 'dungeo.event.objects') {
        return formatObjects(event.data as Record<string, unknown>);
      }
    }
    return undefined;
  },
};
```

2. **Renderer in `browser-entry.ts`**:

```typescript
renderer.registerRenderer('dungeo.rname', {
  onValue: (value) => {
    if (typeof value === 'string') client.displayText(value);
  },
});
renderer.registerRenderer('dungeo.objects', {
  onValue: (value) => {
    if (typeof value === 'string') client.displayText(value);
  },
});
```

3. **`DungeoStory.registerChannels()`** returns the two new channels (alongside the audio channels from Phase 3).

4. **Delete from `browser-entry.ts`**: remove the `handleStoryEvent` function and its reference in `callbacks`.

5. **Delete from platform-browser**:
   - `BrowserClientCallbacks.handleStoryEvent` field in `types.ts:46`.
   - The callback branch in `BrowserClient.ts:263–266`.
   - After both branches (audio in Phase 3, callback here) are gone, delete the entire `engine.on('event', ...)` listener including the debug-log block.
   - Update the `setupEngineHandlers()` JSDoc at lines 227–248 to remove the legacy-listener description.

### Files touched

| File | Change |
|------|--------|
| `stories/dungeo/src/channels.ts` | New file: `rnameChannel`, `objectsChannel` (and `formatObjects` helper moved here from `browser-entry.ts`) |
| `stories/dungeo/src/browser-entry.ts` | Remove `handleStoryEvent` function; register channel renderers for `dungeo.rname` and `dungeo.objects`; remove `callbacks` key from `BrowserClient` config |
| `stories/dungeo/src/playable-story.ts` | `registerChannels()` returns `[rnameChannel, objectsChannel, ...audioChannels]` |
| `packages/platform-browser/src/types.ts` | Remove `handleStoryEvent?` from `BrowserClientCallbacks`; remove `BrowserClientCallbacks` entirely if no other fields remain (check at implementation time) |
| `packages/platform-browser/src/BrowserClient.ts` | Remove lines 263–266; then remove entire `engine.on('event', ...)` listener; update `setupEngineHandlers()` JSDoc |

### Behavior statement

**dungeo.rname channel**
DOES: On a turn that contains a `dungeo.event.rname` event, emits the `roomName` string from the event data. Emits `undefined` on turns without the event.
WHEN: Called by the channel-service on every turn.
BECAUSE: Replaces the `handleStoryEvent` bypass that previously short-circuited the channel surface for this story-specific event.

**dungeo.objects channel**
DOES: On a turn that contains a `dungeo.event.objects` event, formats and emits the object inventory string. Emits `undefined` on turns without the event.

### Test strategy

1. **AC-17 static listener gate** — new test in `packages/channel-service/tests/ac-17-two-listeners-only.test.ts` (or extend `ac-16`):

```typescript
// AC-17: BrowserClient must not register engine.on('event', ...) listener.
// Grep BrowserClient.ts (and its compiled output) for:
//   engine.on('event',
// Fail if found outside dist/ comments.
```

The test is a grep gate over source (`.ts`), not dist. It asserts that the string `engine.on('event'` does not appear in `packages/platform-browser/src/`.

2. **Channel unit tests** for `rnameChannel` and `objectsChannel`: create a `ChannelProduceContext` stub with the relevant event, call `produce()`, assert the returned string.

3. **Regression**: walkthrough chain 49/49. The `rname` and `objects` commands appear in Dungeo's GDT command set; verify they continue to produce output in the browser build (or add a transcript unit test if they aren't in the walkthrough chain).

### Acceptance criteria

- `BrowserClientInterface` has no `beep` member (already from Phase 1).
- `BrowserClientCallbacks.handleStoryEvent` is deleted.
- `engine.on('event', ...)` listener does not exist in `BrowserClient.ts`.
- AC-17 grep gate is GREEN.
- AC-13, AC-14, AC-15, AC-16 remain GREEN.
- Walkthrough chain passes 49/49.
- `dungeo.event.rname` and `dungeo.event.objects` produce correct output via channels.

### Risk

**Medium.** The primary risk is the `formatObjects` helper currently in `browser-entry.ts` (lines 40–108) — it reads `event.data` and formats a multi-line string. Moving it to `channels.ts` is a file-move, not a logic change, but it must be imported correctly.

The `handleStoryEvent` callback is currently the only extension point for story-defined event handling. Removing it without providing an equivalent channel-based pattern could surprise authors of other stories (if any). The project currently has only one browser story (Dungeo), so the blast radius is contained. Document in an ADR that `Story.registerChannels` + per-channel renderers is the sanctioned replacement.

### ADR candidate C

**Replacement for `handleStoryEvent` — story-defined channels as the sanctioned story event extension point.**
Context: `BrowserClientCallbacks.handleStoryEvent` was a pre-channel bypass that let stories intercept raw events. Decision: delete; replace with `Story.registerChannels()` + per-channel renderers in the browser entry. Consequences: stories cannot intercept arbitrary raw events from the browser client; they must define channels. This is consistent with "channels are the universal UI surface." Stories that need out-of-band signals (rare) should add channels, not bypass the channel surface.

---

## Final-State Acceptance Test (AC-17)

**File**: `packages/channel-service/tests/ac-17-two-listeners-only.test.ts`

```typescript
// AC-17 — BrowserClient registers exactly two engine listeners.
//
// After Phase 4 retires the legacy engine.on('event', ...) listener,
// the only engine subscriptions in BrowserClient must be:
//  1. engine.on('channel:manifest', ...)
//  2. engine.on('channel:packet', ...)
//
// This grep gate catches any re-introduction of raw event listeners.
```

The test greps `packages/platform-browser/src/BrowserClient.ts` for `engine.on(`:
- Expect exactly two occurrences: `'channel:manifest'` and `'channel:packet'`.
- The debug-mode duplicate `channel:manifest` listener in the `debugChannels` branch counts as a third — it must either be folded into one listener or the test must allow two `channel:manifest` lines. **Design call at implementation time**: fold the debug log into the single manifest listener (pass `debug` flag to the listener). The plan recommends folding.
- Fail if `engine.on('event'` appears anywhere.

---

## Risk Register

| Phase | Biggest risk | Detection method |
|-------|-------------|-----------------|
| 1 (beep) | AudioContext init breaks ambient audio if beep was the first AudioContext user | Run browser build; confirm ambient sound plays in Dungeo |
| 2 (lifecycle channel) | `platform.restore_completed` payload shape differs from what the channel reads | Write channel unit test against real `createRestoreCompletedEvent()` output before implementation |
| 3 (audio Tier C) | Ambient audio stops working; `stop_all` → per-channel-stop translation incomplete | Human smoke-test in browser; enumerate all channel ids from AudioRegistry |
| 3 (audio Tier C) | `audio.effect` (already silently dropped) causes confusion if assumed to work | Document as known-unhandled; file GitHub issue |
| 3 (audio Tier C) | AC-16 grep gate breaks due to `media.*` strings in `audio-setup.ts` | Extend AC-16 allow-list with `stories/dungeo/src/audio/` |
| 4 (handleStoryEvent) | `formatObjects` move introduces a bug in the objects formatter | Existing unit test for the formatter (or write one during Phase 4) |
| 4 (handleStoryEvent) | AC-17 counts the debug-mode duplicate `channel:manifest` listener | Fold debug log into single listener during Phase 4 implementation |

---

## ADR Candidates Summary

After implementation of each phase, raise the following ADR candidates with the user:

| ID | Phase | Question |
|----|-------|----------|
| ADR-A | 2 | Where does the lifecycle channel live — stdlib or platform-browser? (Plan recommends stdlib.) |
| ADR-B | 3 | Where should the `audio.*` → `media.*` translation live — story, stdlib AudioRegistry builder, or channel-service capability? Should `audio.effect` become a new media channel type? |
| ADR-C | 4 | Replace `handleStoryEvent` with `Story.registerChannels()` + per-channel renderers as the sanctioned story-defined event extension point. |

---

## Phase Dependencies

```
Phase 1 (beep)
    → Phase 2 (lifecycle channel)       [beep calls in save/restore branches must be gone first]
        → Phase 3 (audio Tier C)        [event listener must still exist to host audio branch]
            → Phase 4 (handleStoryEvent) [audio branch must be gone before listener is deleted]
```

Phase 4 depends on Phase 3 structurally (the listener is deleted in Phase 4 only when all branches are gone). It does not depend on Phase 3 semantically (handleStoryEvent handles only `rname` and `objects`, not audio).

---

## Per-Phase Stop Points

Per CLAUDE.md: platform changes require discussion before implementation. Each phase requires explicit user approval before starting. After each phase ships and walkthroughs pass, stop and wait.
