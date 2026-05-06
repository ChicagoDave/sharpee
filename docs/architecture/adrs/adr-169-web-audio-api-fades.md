# ADR-169: Web Audio API for AudioManager — Fade-In/Out and Cross-Fade

## Status: ACCEPTED

## Date: 2026-05-06

## Builds on

- **ADR-138** (Audio System) — defines `AudioRegistry`, the room
  atmosphere model, and the `audio.*` event vocabulary.
- **ADR-163** (Channel-Service Platform) — §7 specifies the canonical
  `media.*` event vocabulary and the `sound`/`music`/`ambient:<id>`
  channels.
- **ADR-165** (Renderer Architecture) — §8 designates the platform's
  `AudioManager` as the audio renderer; channel renderers translate
  `media.*` into the manager's internal `audio.*` vocabulary.
- **ADR-167** (Audio Event Translation Boundary) — keeps the
  `AudioManagerLike.handleAudioEvent` surface stable as the
  integration point.

## Context

After Phase 3 of the channel-io-event-retirement plan, ambient and
music audio reach `AudioManager.handleAudioEvent` via the channel
renderer (`packages/platform-browser/src/channels/audio.ts`). The
manager itself plays audio with `HTMLAudioElement`:

```typescript
// AudioManager.ts (current)
const audio = new Audio(data.src);
audio.loop = data.loop !== false;
audio.volume = data.volume ?? 0.3;
audio.play();
// ...
case 'audio.ambient.stop':
  el.pause();
```

Volume changes are instantaneous. Stops are bare `pause()`. Human
smoke-testing the rebuilt browser bundle confirmed the symptom:
ambient and music transitions are perceived as harsh — they "kick in"
at full target volume and cut on stop.

Phase 1 of the same plan (commit `721268b9`) deleted the
`audioContext` field that previously powered `AudioManager.beep`, so
the manager currently has **no Web Audio infrastructure at all**. ADR-167
referred to it as "the Web Audio orchestrator" by intent — that
description has been aspirational since Phase 1. This ADR makes it
true.

Three implementation paths were considered:

- **A — JS-driven volume steps on `HTMLAudioElement.volume`.** Schedule
  `setInterval` ticks (~50ms) to walk `el.volume` from 0 → target. No
  new browser API surface. Lower fidelity (audible stair-stepping at
  short durations), poor scheduling under main-thread contention,
  forecloses future graph-based work (filters, ducking, spatial).
- **B — Web Audio API graph.** `AudioContext` + per-stream
  `MediaElementAudioSourceNode` + `GainNode`. Volume ramps use
  `gainNode.gain.linearRampToValueAtTime()` — sample-accurate, runs
  on the audio thread, immune to main-thread contention. Re-introduces
  `AudioContext` (managed singleton) that Phase 1 removed.
- **C — Decode to `AudioBuffer` and play with `BufferSourceNode`.** The
  full Web Audio path including in-memory decoding. Smoothest possible
  but loads entire files into memory, problematic for long ambient
  loops or music tracks.

Per-event author control: stories may want short, snappy transitions
in some scenes (combat sting) and long, atmospheric ones in others
(entering a vast underground hall). The platform should provide
sensible defaults but not lock authors out.

## Decision

### Adopt Web Audio API (Option B)

`AudioManager` becomes a real Web Audio orchestrator:

1. **`AudioContext` as a lazy, managed singleton.** Created on first
   `unlock()` invocation (a user gesture — keydown/click), not at
   construction. Resumed via `audioContext.resume()` if `suspended`.
   Disposed via `audioContext.close()` in `dispose()`.

2. **Per-stream graph: `MediaElementAudioSourceNode` → `GainNode` →
   `audioContext.destination`.** Each ambient channel and the music
   track gets its own graph node pair. Streamed from the existing
   `HTMLAudioElement` — no buffer decoding, file size irrelevant.

3. **Ramps via `gainNode.gain.linearRampToValueAtTime()`.** Sample-
   accurate, runs on the audio thread.

### Default fade durations (milliseconds)

| Direction | Ambient | Music |
|-----------|---------|-------|
| Fade in   | 1500    | 2000  |
| Fade out  | 800     | 1500  |

Defaults apply when the payload omits `fadeIn` / `fadeOut`. They
are not configurable at AudioManager construction time — a story
that wants different defaults overrides per event.

### Per-event author override

This ADR honors the `fadeIn` / `fadeOut` fields **already declared** in
`@sharpee/media`'s typed event interfaces but ignored by the current
`AudioManager`:

- `AudioMusicPlayEvent.fadeIn` / `fadeOut` — `events.ts` lines 94, 107
- `AudioAmbientPlayEvent.fadeIn` / `fadeOut` — lines 134, 150
- `AudioAmbientStopEvent.fadeOut` — line 160

Field semantics this ADR locks in:

- `fadeIn` — milliseconds, applies on play. `0` = instant.
- `fadeOut` — milliseconds, applies on stop or replacement. `0` =
  instant cut.

Channel renderers in `packages/platform-browser/src/channels/audio.ts`
already spread the channel value into the `audio.*` payload via
`...(value as Record<string, unknown>)` (channels/audio.ts:94), so
fade fields flow through without renderer changes. The renderer
remains untouched by this ADR.

No wire-shape extension is needed — the schema is already there.
Existing stories (Dungeo) need no changes; the only consumer change
is in `AudioManager` itself.

### SFX is exempt — no graph, no fade

`audio.sfx` continues to use a bare `HTMLAudioElement` with
instantaneous volume. SFX are one-shots (door clicks, item pickups,
combat hits) where fade is wrong feel and the graph is overhead. The
exemption is **definitional**, not transitional: a future ADR that
introduces SFX-graph processing (e.g., reverb buses) will reverse it,
not this one.

### Cross-fade on channel switch is automatic

When `media.ambient.play` arrives for an ambient channel that is
already playing (e.g., walking from one ambient zone into another),
the existing GainNode ramps from current value to 0 over the active
`fadeOut` (the **outgoing** stream's fade-out, defaulting to ambient
800ms), and a new GainNode + source pair ramps from 0 to target over
the active `fadeIn` (the **incoming** stream's fade-in, defaulting to
1500ms). The two ramps execute concurrently on the audio thread —
cross-fade is a freebie.

When the outgoing ramp reaches 0, the source disconnects and the
underlying `HTMLAudioElement.pause()` fires.

### Stop semantics

`audio.ambient.stop` and `audio.music.stop` ramp gain to 0 over the
active `fadeOut`, then disconnect the node and pause the element. A
stop that arrives during a fade-in is honored — the in-progress ramp
is cancelled (`gainNode.gain.cancelScheduledValues()`) and replaced
with a ramp from current value to 0 over `fadeOut`.

`dispose()` is the only path that cuts audio without ramping — the
manager is being torn down, no audible artifact concern.

### Unlock flow becomes async

`AudioManager.unlock()` becomes `async`. It still must be called from
a user gesture and still replays queued `pendingEvents`, but now in
this order:

1. If `audioContext` is undefined, construct it.
2. If `audioContext.state === 'suspended'`, `await audioContext.resume()`.
3. Replay `pendingEvents` (after resume resolves, so events fire into
   a running context).

`BrowserClient`'s gesture handler must `await` the call. The first
queued event no longer plays in the same tick as the gesture — it
plays on the microtask after `resume()` resolves (typically <10ms).
This is a deliberate timing change for correctness; without the await,
events can fire into a still-suspended context and silently fail.

The pre-unlock event-queueing behavior is preserved exactly. The
`pendingEvents` array is the same; only the replay timing shifts.

### `AudioManagerLike.handleAudioEvent` surface unchanged

Tests using the mock `AudioManagerLike` continue to work — the
interface (`{ type: string; data: unknown }`) is unchanged. The fade
fields ride inside `data` and have always been declared in
`@sharpee/media`'s typed events; this ADR just begins honoring them.
ADR-167's translation boundary is intact.

## Consequences

### Constrains future sessions

- Any new audio enhancement (filter sweeps, ducking, spatial audio,
  EQ) inserts nodes between the per-stream `GainNode` and
  `audioContext.destination`. The graph topology is the extension
  point.
- Wire-payload extensions (e.g., `pan`, `lowpassFreq`, `loopStart`)
  go through ADR-163 §7's `media.*` vocabulary. The renderer
  forwards them; `AudioManager` consumes them inside
  `handleAudioEvent`.
- The `AudioContext` lifecycle is `AudioManager`-owned. No other
  code in `@sharpee/platform-browser` may `new AudioContext()` —
  contention between contexts wastes a scarce per-page resource and
  makes a single mute/unlock impossible.
- ADR-167's Option B helper (when it ships) generates `media.*`
  events that may carry fade fields. The helper's API needs to
  accept fade overrides per atmosphere or per room transition.

### Forecloses

- Switching back to `HTMLAudioElement.volume` for ambient/music
  ramps. Once the graph is in place, all volume control is
  GainNode-mediated.
- Multiple `AudioContext` instances per page.
- Per-event override of the fade-duration *defaults themselves* via
  `AudioManager` constructor options. The escape hatch for "I want
  different feel" is the per-event payload, not configuration.

### Doesn't touch

- `AudioManagerLike.handleAudioEvent` interface signature.
- The channel renderer factories' shape (`createAmbientChannelRenderer`
  etc.). Their forwarding logic — the existing
  `...(value as Record<string, unknown>)` spread already carries fade
  fields verbatim.
- ADR-167's `media.*` → `audio.*` boundary or its allow-listed
  story-side emissions.
- The `unlock()` gesture flow — still required, still queues
  pre-gesture events.
- SFX. Continues as a bare `HTMLAudioElement.play()` path.
- `AudioRegistry` data model. `RoomAtmosphere` may grow optional
  fade fields in a future ADR; this one does not extend it.

### Testing

- `AudioContext` and `MediaElementAudioSourceNode` are not
  implemented in jsdom. `AudioManager` itself is exercised only via
  the human smoke-test path (browser bundle, walk between rooms).
  This was already the case post-Phase-1 — this ADR doesn't degrade
  test coverage.
- The `AudioManagerLike` mock pattern in
  `packages/platform-browser/tests/channels/audio.*.test.ts`
  continues to verify the channel renderer's translation logic
  including fade-field passthrough (which the spread always supported).

## Acceptance Criteria

### Graph & lifecycle

- `AudioManager` owns a lazy `AudioContext` singleton; created on
  first `unlock()`, resumed if suspended, disposed in `dispose()`.
- `unlock()` is `async`; it `await`s `audioContext.resume()` before
  replaying `pendingEvents`. `BrowserClient`'s gesture handler awaits
  the call.
- `dispose()` is safe before `unlock()` — `audioContext` close is
  null-guarded.
- Each ambient channel and the music track plays through a
  `MediaElementAudioSourceNode` → `GainNode` → `destination` graph.
  A fresh `HTMLAudioElement` (`new Audio(src)`) is constructed per
  play to satisfy the one-element-one-context binding rule for
  `MediaElementAudioSourceNode`.

### Fades

- Default fades applied when payload omits `fadeIn`/`fadeOut`:
  ambient 1500ms in / 800ms out, music 2000ms in / 1500ms out.
- Per-event override honored: payload `fadeIn` / `fadeOut` fields
  (number, milliseconds; `0` = instant) override defaults.
- **Invalid fade values fall back to defaults**: negative, `NaN`, or
  non-finite values use the default for that direction. `Infinity`
  is treated as invalid (not "infinite fade"). `0` is honored.
- Implementation detail: ramp-mid-fade pattern — read
  `gainNode.gain.value` at cancellation time, call
  `setValueAtTime(currentValue, now)`, then
  `linearRampToValueAtTime(target, now + durationSec)`. Avoids
  reliance on `cancelAndHoldAtTime()` browser-support cliff.

### Cross-fade & stop

- Cross-fade on ambient/music replacement: outgoing ramps to 0,
  incoming ramps from 0, concurrently.
- Stops ramp to 0 over the active `fadeOut`, then disconnect and
  pause. Stop-during-fade-in cancels the in-flight ramp via the
  ramp-mid-fade pattern above.

### Boundaries (unchanged)

- `audio.sfx` path unchanged — bare `HTMLAudioElement`, no graph,
  no fade.
- `AudioManagerLike.handleAudioEvent` signature unchanged.
- Channel renderer in `packages/platform-browser/src/channels/audio.ts`
  unchanged — fade fields flow through the existing spread operator.

### Failure modes

- `AudioContext` construction failure (older Safari, headless test
  envs): logs to `console.debug`, manager falls back to **instant
  gain mode** — audio still plays via `HTMLAudioElement.play()` with
  `el.volume = target` directly, no graph. Fade ramps are skipped,
  not the audio itself. The manager does not throw to the caller.
- `audioContext.resume()` rejection: same fallback as construction
  failure.

### Smoke test

- Browser human smoke-test: in Dungeo, take the first transition
  that triggers `media.ambient.play` (entering the underground area
  from above ground via the trap door, where `AudioRegistry` first
  attaches an atmosphere). Ambient fades in over ~1.5s with no
  perceptible cliff. Walking back out, ambient fades out over ~0.8s.
  Walking between two ambient-bearing rooms produces concurrent
  cross-fade with no audible gap.

## Session

Produced in session `2026-05-06 08:02` (branch `main`). Implementation
follow-up to the channel-io-event-retirement plan completed in the
prior session (`docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md`).

## References

- ADR-138 — Audio System
- ADR-163 — Channel-Service Platform — §7
- ADR-165 — Renderer Architecture — §8
- ADR-167 — Audio Event Translation Boundary
- `packages/platform-browser/src/audio/AudioManager.ts` — current
  HTMLAudioElement-only implementation; the ADR-169 implementation
  target
- `packages/platform-browser/src/channels/audio.ts` — channel
  renderer translation layer; spreads channel value into `audio.*`
  payload (no change required for ADR-169)
- `packages/media/src/audio/events.ts` — typed `AudioMusicPlayEvent`
  / `AudioAmbientPlayEvent` / `AudioMusicStopEvent` /
  `AudioAmbientStopEvent` interfaces with pre-existing
  `fadeIn`/`fadeOut` declarations (lines 94, 107, 134, 150, 160)
- `packages/stdlib/src/channels/media.ts` — `createAmbientChannel`,
  `createMusicChannel`, `MEDIA_EVENT_TYPES`; channel `produce()`
  returns `event.data` verbatim, so fade fields flow through
- MDN — [Web Audio API: Cross-fade](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth)
- MDN — [`AudioParam.linearRampToValueAtTime`](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime)
- MDN — [`MediaElementAudioSourceNode`](https://developer.mozilla.org/en-US/docs/Web/API/MediaElementAudioSourceNode)
