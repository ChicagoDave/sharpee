# @sharpee/media

Audio and media type definitions for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/media
```

## Overview

- **Types only** - audio type definitions with no runtime dependencies beyond `@sharpee/core` (ADR-138).
- **Audio events** - typed event interfaces for sound effects, music, ambient loops, and procedural/effect signals.
- **Capabilities & preferences** - `AudioCapabilities` (what a client supports) and `AudioPreferences` (volume/mute state).
- **`AudioRegistry`** - registry for audio assets and recipes.
- Importing this package activates TypeScript declaration merging that adds audio event keys to `@sharpee/core`'s `EventDataRegistry`.

## Usage

```typescript
import type {
  AudioEvent,
  AudioSfxEvent,
  AudioMusicPlayEvent,
  AudioCapabilities,
  AudioPreferences,
  Volume,
  AudioAssetPath,
} from '@sharpee/media';
import { isAudioEvent } from '@sharpee/media';

// Narrow an incoming event to an audio event
function handle(event: AudioEvent) {
  if (isAudioEvent(event)) {
    // dispatch to the client's audio subsystem
  }
}

// Describe what a client supports and how the player prefers to hear it
const capabilities: AudioCapabilities = { /* client audio support flags */ };
const preferences: AudioPreferences = { /* volumes, mute state */ };
```

Stories emit audio events through the engine; clients (such as the browser
`AudioManager`) consume them, filtered by the client's `AudioCapabilities`
and the player's `AudioPreferences`. This package only defines the shapes —
playback behavior lives in the client.

## Key Exports

| Export | Description |
|--------|-------------|
| `AudioEvent` and variants | Sfx, music play/stop, ambient play/stop, procedural, effect, effect-clear event interfaces |
| `isAudioEvent` | Type guard for audio events |
| `AudioCapabilities`, `AudioPreferences` | Client support flags and player preferences |
| `Volume`, `DurationMs`, `StereoPan`, `PlaybackRate`, `AudioAssetPath`, `AudioFormat`, `AudioTarget` | Audio scalar/branded types |
| `AudioRegistry` | Registry of audio assets and recipes |

## Related Packages

- [@sharpee/core](https://www.npmjs.com/package/@sharpee/core) - Core types and event registry
- [@sharpee/platform-browser](https://www.npmjs.com/package/@sharpee/platform-browser) - Browser client with `AudioManager`
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
