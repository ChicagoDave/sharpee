# Audio Enablement Guide

## Overview

Sharpee stories can emit audio events that clients render as sound effects, background music, and ambient soundscapes. Audio is optional — text clients ignore audio events, and stories without audio are unaffected.

The audio system follows the same separation as text: **stories emit intent, clients render output**. Stories never reference Web Audio APIs or browser globals. They describe *what* should be heard; the client decides *how* to play it.

## Prerequisites

Add `@sharpee/media` as a dependency:

```json
{
  "dependencies": {
    "@sharpee/media": "workspace:*"
  }
}
```

Import activates declaration merging for type-safe audio event creation — no casts needed.

## Audio Categories

| Category | Behavior | Example |
|----------|----------|---------|
| **SFX** | One-shot, fire-and-forget | Door opening, item pickup, weapon fire |
| **Music** | Single active track, crossfade transitions | Exploration theme, combat music |
| **Ambient** | Multiple named channels, layered loops | Wind, rain, machinery hum |

## Quick Start: Direct Events

The simplest way to add audio is emitting events directly from action handlers or event handlers:

```typescript
import { createTypedEvent } from '@sharpee/core';
import '@sharpee/media'; // Activates type-safe audio events

// Sound effect
createTypedEvent('audio.sfx', {
  src: 'sfx/door-open.mp3',
  volume: 0.8,
});

// Background music
createTypedEvent('audio.music.play', {
  src: 'music/exploration.mp3',
  volume: 0.5,
  fadeIn: 1000,
  loop: true,
});

// Ambient layer
createTypedEvent('audio.ambient.play', {
  src: 'ambient/wind.mp3',
  channel: 'weather',
  volume: 0.3,
  fadeIn: 2000,
});
```

All event data is compile-time checked. Missing required fields or typos produce TypeScript errors.

## AudioRegistry: Centralizing Sound Design

Direct events work, but they scatter sound design details (file paths, volumes, jitter) across your story code. The `AudioRegistry` centralizes all audio configuration in one place. Actions and handlers reference names only.

### Setting Up the Registry

Create an audio registration file and populate the registry during world initialization:

```typescript
// stories/my-story/src/audio/index.ts
import { createTypedEvent } from '@sharpee/core';
import { AudioRegistry } from '@sharpee/media';

export function createAudioRegistry(): AudioRegistry {
  const audio = new AudioRegistry();

  // ── Simple cues ─────────────────────────────────────────
  // Each cue is a factory that returns a fresh event

  audio.registerCue('door.open', () =>
    createTypedEvent('audio.sfx', { src: 'sfx/door-open.mp3', volume: 0.8 })
  );

  audio.registerCue('item.pickup', () =>
    createTypedEvent('audio.sfx', { src: 'sfx/pickup.mp3', volume: 0.6, duck: 1 })
  );

  audio.registerCue('puzzle.solved', () =>
    createTypedEvent('audio.sfx', { src: 'sfx/puzzle-chime.mp3', volume: 0.9, duck: 2 })
  );

  // ── Variation pools ─────────────────────────────────────
  // Multiple files for one logical sound — random selection + jitter
  // prevents repetition fatigue

  audio.registerPool('footstep.stone', {
    sources: [
      'sfx/step-stone-1.mp3',
      'sfx/step-stone-2.mp3',
      'sfx/step-stone-3.mp3',
    ],
    volume: 0.5,
    volumeJitter: 0.1,  // ±10% volume variation
    pitchJitter: 0.05,  // ±5% pitch variation
  });

  audio.registerPool('combat.hit', {
    sources: [
      'sfx/hit-1.mp3',
      'sfx/hit-2.mp3',
    ],
    volume: 0.9,
    volumeJitter: 0.05,
    pitchJitter: 0.03,
    duck: 3,  // Aggressive ducking for combat
  });

  return audio;
}
```

### Using Cues in Actions and Handlers

Once registered, fire cues by name. The registry resolves names to events:

```typescript
// In an event handler
world.registerEventHandler('if.event.opened', (event, world) => {
  const events = audio.cue('door.open');
  // Returns ISemanticEvent[] — add to action effects
});

// Resolution order:
// 1. Named cues (exact factory)
// 2. Variation pools (random selection + jitter)
// 3. Empty array (silent degradation if name not registered)
```

### Registering Room Atmospheres

Use the fluent `AtmosphereBuilder` to define what a room sounds like:

```typescript
// Cave with dripping water, low wind, and reverb
audio.atmosphere('my-story.room.cave')
  .ambient('ambient/dripping.mp3', 'water', 0.3)
  .ambient('ambient/wind-low.mp3', 'wind', 0.15)
  .effect('reverb', 'master', { decay: 3.0, mix: 0.4 })
  .build();

// Tavern with crowd noise and music
audio.atmosphere('my-story.room.tavern')
  .ambient('ambient/crowd-murmur.mp3', 'crowd', 0.4)
  .ambient('ambient/fireplace.mp3', 'fire', 0.2)
  .music('music/tavern-jig.mp3', 0.3)
  .build();

// Quiet forest — ambient only
audio.atmosphere('my-story.room.forest')
  .ambient('ambient/birds.mp3', 'wildlife', 0.25)
  .ambient('ambient/leaves.mp3', 'wind', 0.15)
  .build();
```

Retrieve and apply atmospheres when the player moves:

```typescript
world.registerEventHandler('if.event.actor_moved', (event, world) => {
  const roomId = event.data.destinationId;
  const atmo = audio.getAtmosphere(roomId);
  if (!atmo) return;

  const events: ISemanticEvent[] = [];

  // Stop all current ambient, then start the new room's layers
  events.push(createTypedEvent('audio.ambient.stop_all', { fadeOut: 1000 }));

  for (const layer of atmo.ambient) {
    events.push(createTypedEvent('audio.ambient.play', {
      src: layer.src,
      channel: layer.channel,
      volume: layer.volume,
      fadeIn: 2000,
    }));
  }

  if (atmo.music) {
    events.push(createTypedEvent('audio.music.play', {
      src: atmo.music.src,
      volume: atmo.music.volume,
      fadeIn: 1000,
    }));
  }

  if (atmo.effect) {
    events.push(createTypedEvent('audio.effect', {
      target: atmo.effect.target,
      effect: atmo.effect.effect,
      params: atmo.effect.params,
      transition: 2000,
    }));
  }

  return events;
});
```

## Ducking

When a high-priority sound fires (combat hit, critical alert), background audio temporarily ducks so the important sound cuts through the mix.

```typescript
// Configure ducking behavior (optional — sensible defaults exist)
audio.setDucking({
  duckVolume: 0.3,     // Duck to 30% volume
  attackMs: 80,        // Fade down in 80ms
  releaseMs: 400,      // Recover in 400ms
  targets: ['music', 'ambient'],  // What gets ducked
});
```

Ducking priority is set per-SFX via the `duck` field (0–3):

| Priority | Use case | Effect |
|----------|----------|--------|
| 0 | Background SFX | No ducking |
| 1 | Normal gameplay | Subtle duck |
| 2 | Important feedback | Moderate duck |
| 3 | Critical alerts, combat | Aggressive duck |

## Procedural Audio

Stories can request synthesized sounds without audio files. The client generates them using Web Audio oscillators and noise sources:

```typescript
createTypedEvent('audio.procedural', {
  recipe: 'beep',
  params: { frequency: 440, duration: 200 },
  volume: 0.7,
});

createTypedEvent('audio.procedural', {
  recipe: 'alert',
  params: { frequency: 800, interval: 300, count: 3 },
  volume: 0.8,
  duck: 2,
});
```

Built-in recipes clients should support: `beep`, `alert`, `sweep-up`, `sweep-down`, `static`, `hum`. Stories can use any string — unknown recipes are silently skipped.

## Audio Effects

Apply processing effects to parts of the audio mix. Clients may support these — stories request them as hints:

```typescript
// Cave reverb on all audio
createTypedEvent('audio.effect', {
  target: 'master',
  effect: 'reverb',
  params: { decay: 2.5, mix: 0.3 },
  transition: 2000,  // Fade in over 2 seconds
});

// Muffle ambient sounds (behind a wall)
createTypedEvent('audio.effect', {
  target: 'ambient:environment',
  effect: 'lowpass',
  params: { frequency: 800, q: 1 },
});

// Clear all effects
createTypedEvent('audio.effect.clear', {
  target: 'master',
  transition: 1000,
});
```

Available effects: `reverb`, `lowpass`, `highpass`, `distortion`, `delay`.

## Fade Defaults

Override the default fade durations used by atmosphere transitions:

```typescript
audio.setFadeDefaults({
  ambientIn: 3000,       // Ambient fade-in (default: 2000ms)
  ambientOut: 2000,      // Ambient fade-out (default: 2000ms)
  musicIn: 1500,         // Music fade-in (default: 1000ms)
  effectTransition: 2000, // Effect transition (default: 2000ms)
});
```

## Client Capabilities

Clients declare what they support at session start. Stories can check before emitting events:

```typescript
import type { AudioCapabilities } from '@sharpee/media';

// Client declares capabilities
const capabilities: AudioCapabilities = {
  sfx: true,
  music: true,
  ambient: true,
  procedural: false,   // Can't synthesize
  effects: false,      // No effect processing
  formats: ['mp3', 'ogg'],
};
```

## Player Preferences

Clients persist player audio settings to localStorage:

```typescript
import type { AudioPreferences } from '@sharpee/media';

const prefs: AudioPreferences = {
  enabled: true,
  masterVolume: 0.8,
  sfxVolume: 1.0,
  musicVolume: 0.5,
  ambientVolume: 0.7,
  sfxMuted: false,
  musicMuted: false,
  ambientMuted: false,
};
```

## Audio File Organization

Place audio assets under your story's assets directory:

```
stories/my-story/
  assets/
    audio/
      sfx/          # Sound effects
      music/        # Background tracks
      ambient/      # Ambient loops
```

All `src` paths in audio events are relative to `assets/audio/`.

## Summary

| Pattern | When to use |
|---------|-------------|
| Direct `createTypedEvent` | One-off sounds, prototyping |
| `AudioRegistry` cues | Reusable sounds referenced by name |
| Variation pools | Sounds that need variety (footsteps, impacts) |
| `AtmosphereBuilder` | Room-level ambient soundscapes |
| Procedural recipes | UI feedback, alerts without audio files |

See [ADR-138](../architecture/adrs/adr-138-audio-system.md) for the full design rationale.
