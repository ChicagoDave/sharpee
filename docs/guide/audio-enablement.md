# Audio Enablement Guide

How to add audio to a Sharpee story running in the browser.

## Architecture Overview

Audio flows through three layers:

```
Story (AudioRegistry)
  → Engine event pipeline (ISemanticEvent with type 'audio.*')
    → Browser client (AudioManager plays via HTML5 Audio)
```

The story registers audio cues and atmospheres. When the player moves or triggers an action, the story's event handler emits audio events as `EmitEffect`s. These flow through the engine's event pipeline unchanged. The browser client's `BrowserClient` detects events with `type.startsWith('audio.')` and forwards them to `AudioManager`, which manages HTML5 `<audio>` elements.

## Packages Involved

| Package | Role |
|---------|------|
| `@sharpee/media` | `AudioRegistry`, `AtmosphereBuilder`, audio event types, `isAudioEvent()` type guard |
| `@sharpee/sharpee` | Re-exports everything from `@sharpee/media` for convenience |
| `@sharpee/event-processor` | `registerHandler()` for `if.event.actor_moved`, `EmitEffect` to emit audio events |
| `@sharpee/platform-browser` | `BrowserClient` forwards audio events; `AudioManager` renders them |

## The Browser Platform Build

`@sharpee/platform-browser` is the **active** browser client infrastructure package. It lives at `packages/platform-browser/` and is included in the pnpm workspace.

There is also an older `packages/platforms/browser-en-us/` which is **excluded from the workspace** (`pnpm-workspace.yaml` has `!packages/platforms`). That package is not used by the browser build. Do not confuse the two.

The browser build chain works as follows:

1. **`build.sh -s {story} -c browser`** triggers `build_browser_client()`
2. The entry point is `stories/{story}/src/browser-entry.ts`
3. `browser-entry.ts` imports `BrowserClient` from `@sharpee/platform-browser`
4. **esbuild** bundles everything into a single `game.js` IIFE:
   ```
   npx esbuild stories/{story}/src/browser-entry.ts \
     --bundle --platform=browser --format=iife \
     --outfile=dist/web/{story}/game.js \
     --alias:@sharpee/platform-browser=packages/platform-browser/dist/index.js
   ```
5. The `--alias` flag is critical: it resolves `@sharpee/platform-browser` to the **compiled dist output**, not the workspace link. This means changes to `platform-browser` source require a full build (not `--skip`) to appear in the browser bundle.
6. Static `index.html` and CSS are copied from `templates/browser/`
7. Story assets from `stories/{story}/assets/` are copied into the output directory

**Output**: `dist/web/{story}/` containing `game.js`, `index.html`, `styles.css`, and any assets (audio, images, etc.)

## Audio Event Flow in the Browser Client

`BrowserClient.setupEngineHandlers()` listens on `engine.on('event', ...)`. When an event's type starts with `audio.`, it is forwarded to `AudioManager.handleAudioEvent()` and **not** passed to other handlers.

### Autoplay Unlock

Browsers (especially Safari) block `Audio.play()` until a user gesture. `AudioManager` handles this:

1. Audio events received before the first user command are **queued** in `pendingEvents`
2. `BrowserClient.executeCommand()` calls `audioManager.unlock()` on every command
3. `unlock()` replays all queued events, then all subsequent events play immediately

This means audio won't start until the player types their first command — which is the natural flow for IF.

### Supported Event Types

| Event Type | AudioManager Behavior |
|------------|----------------------|
| `audio.ambient.play` | Creates/replaces an `<audio>` element on a named channel. Loops by default. |
| `audio.ambient.stop` | Pauses and removes a specific channel |
| `audio.ambient.stop_all` | Pauses and removes all ambient channels |
| `audio.music.play` | Creates/replaces the single music track. Loops by default. |
| `audio.music.stop` | Pauses and removes the music track |
| `audio.sfx` | Creates a one-shot `<audio>` element (fire-and-forget) |

Events for `audio.procedural`, `audio.effect`, and `audio.effect.clear` are defined in `@sharpee/media` but not yet handled by `AudioManager`.

## Step-by-Step: Adding Audio to a Story

### 1. Add `@sharpee/media` as a dependency

In your story's `package.json`:
```json
"dependencies": {
  "@sharpee/media": "workspace:*"
}
```

And in `tsconfig.json` paths:
```json
"@sharpee/media": ["./node_modules/@sharpee/media"]
```

### 2. Create an audio setup file

Create `stories/{story}/src/audio/audio-setup.ts`:

```typescript
import { AudioRegistry } from '@sharpee/media';
import type { EventProcessor } from '@sharpee/event-processor';
import type { ISemanticEvent } from '@sharpee/core';
import { createTypedEvent } from '@sharpee/core';
import type { Effect } from '@sharpee/event-processor';

export const audioRegistry = new AudioRegistry();

export function initializeAudio(roomIds: {
  caveRooms: Record<string, string>;
  forestRooms: Record<string, string>;
}): void {
  // Register ambient atmosphere for cave rooms
  for (const roomId of Object.values(roomIds.caveRooms)) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/cave-drip.ogg', 'environment', 0.3)
      .build();
  }

  // Register ambient atmosphere for forest rooms
  for (const roomId of Object.values(roomIds.forestRooms)) {
    audioRegistry
      .atmosphere(roomId)
      .ambient('audio/forest.ogg', 'environment', 0.4)
      .build();
  }
}

export function registerAudioHandler(eventProcessor: EventProcessor): void {
  eventProcessor.registerHandler(
    'if.event.actor_moved',
    (event: ISemanticEvent): Effect[] => {
      const data = event.data as { toRoom?: string } | undefined;
      if (!data?.toRoom) return [];

      const atmosphere = audioRegistry.getAtmosphere(data.toRoom);
      if (!atmosphere) {
        // No atmosphere — fade out ambient audio
        return [{
          type: 'emit',
          event: createTypedEvent('audio.ambient.stop_all', { fadeOut: 2000 }),
        }];
      }

      // Emit ambient play events
      const effects: Effect[] = [];
      for (const ambient of atmosphere.ambient) {
        effects.push({
          type: 'emit',
          event: createTypedEvent('audio.ambient.play', {
            src: ambient.src,
            channel: ambient.channel,
            volume: ambient.volume,
            fadeIn: audioRegistry.getFadeDefaults().ambientIn,
            loop: true,
          }),
        });
      }
      return effects;
    },
  );
}
```

### 3. Wire into the story

In your story's `index.ts`:

```typescript
import { initializeAudio, registerAudioHandler } from './audio/audio-setup';

// In initializeWorld(), after all regions are created:
initializeAudio({
  caveRooms: this.caveRegionIds as unknown as Record<string, string>,
  forestRooms: this.forestRegionIds as unknown as Record<string, string>,
});

// In onEngineReady():
registerAudioHandler(engine.getEventProcessor());
```

### 4. Add audio files

Place audio files in `stories/{story}/assets/audio/`. The build copies this entire directory to the browser output.

**File format**: OGG (Opus or Vorbis) is recommended for web. Keep files small — 30-second loops at 64 kbps are typically under 200 KB.

**Trimming with ffmpeg** (if you have a longer source file):
```bash
ffmpeg -i source.mp3 -ss 10 -t 30 -c:a libopus -b:a 64k \
  -af "afade=t=in:st=0:d=2,afade=t=out:st=28:d=2" \
  stories/{story}/assets/audio/output.ogg
```

Add a `CREDITS.md` in the audio directory documenting the source, author, and license of each file.

### 5. Build and test

```bash
./build.sh -s {story} -c browser
npx serve dist/web/{story}
```

Navigate to rooms with registered atmospheres. Audio plays after the first typed command (autoplay unlock). Moving to a room without a registered atmosphere fades out the ambient audio.

## Advanced: Multiple Ambient Channels

The `AtmosphereBuilder` supports multiple ambient channels per room:

```typescript
audioRegistry
  .atmosphere('room.cave')
  .ambient('audio/cave-drip.ogg', 'dripping', 0.3)
  .ambient('audio/wind.ogg', 'wind', 0.15)
  .music('audio/cave-theme.ogg', 0.4)
  .effect('reverb', 'ambient:dripping', { decay: 3, mix: 0.5 })
  .build();
```

Each `.ambient()` call adds a separate named channel. All channels play simultaneously.

## Advanced: One-Shot Sound Effects

For action-triggered sounds (door opening, item pickup), register cues:

```typescript
import { createTypedEvent } from '@sharpee/core';

audioRegistry.registerCue('door.open', () =>
  createTypedEvent('audio.sfx', { src: 'audio/door-open.ogg', volume: 0.7 })
);

// In an action or event handler:
const events = audioRegistry.cue('door.open');
// Return as EmitEffects
```

## Advanced: Variation Pools

For sounds that should vary (footsteps, combat hits):

```typescript
audioRegistry.registerPool('footstep.stone', {
  sources: ['audio/step1.ogg', 'audio/step2.ogg', 'audio/step3.ogg'],
  volume: 0.6,
  volumeJitter: 0.1,  // +/- 10% volume variation
  pitchJitter: 0.05,  // +/- 5% pitch variation
});

// Each call picks a random source with jitter applied
const events = audioRegistry.cue('footstep.stone');
```

## Reference: Dungeo Implementation

The Dungeo story (`stories/dungeo/`) is the reference implementation:

- **Audio setup**: `stories/dungeo/src/audio/audio-setup.ts`
- **Story wiring**: `stories/dungeo/src/index.ts` (search for `initializeAudio` and `registerAudioHandler`)
- **Audio files**: `stories/dungeo/assets/audio/`
- **Three atmospheres**: dungeon underground, forest daytime, frigid river
- **Extra room overrides**: Dam Base gets river sound via `riverSoundRoomIds`
