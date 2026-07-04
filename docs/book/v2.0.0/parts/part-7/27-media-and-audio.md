# Media & Audio: Sight and Sound as Channels

Every chapter so far has reached the player through words and the chrome around them.
This last chapter of the volume adds the other senses: a picture behind the prose, a
sound when a door slams, music that swells at the climax. They arrive the same way
everything else does, over channels and capability-gated, so a text-only client never
even hears about them.

## Media is just more channels

There is no separate media engine. Images and audio are channels like `main` and
`score`, rendered by the browser client. Most are registered among the platform
defaults; the `ambient:*` channels are the exception, and the story registers them
on both the engine and browser sides, as shown later in this chapter. The standard
media channels are:

| Channel | Carries |
|---|---|
| `image:background` | a full-bleed image behind the prose |
| `image:main` | a primary illustration in the content flow |
| `image:overlay` | an image layered above the scene |
| `image:preload` | assets to fetch ahead of time |
| `sound` | one-off sound effects |
| `music` | the background track |
| `ambient:*` | layered environmental loops (wind, machinery, …); story-registered, see below |

A story drives these channels by firing **`media.*` events**: `media.image.show`,
`media.sound.play`, `media.music.play`, `media.ambient.play` (and their `.hide` /
`.stop` partners). The standard channels listen for those events on the turn's event
stream and project them; the browser renderers do the rest. That's the through-line of
this chapter: *you emit a `media.*` event, and the channel surface turns it into
something the player sees or hears.* Because these are ordinary channels, an image's
hotspot can carry a `command` that the client routes back through `engine.executeTurn`,
a clickable region that plays exactly like a typed verb.

## Capability gating

The reason a terminal never mis-renders an image is **capability gating**, the
mechanism from the Channels chapter. At startup the client declares what it can do.
The browser declares a full graphical profile, with `images`, `sound`, `music`,
`animations`, and more all `true`, so every media channel appears in its manifest. A
text-only client declares them `false`, and the engine simply leaves the media
channels out of *that* client's manifest. The story emits the same signals
regardless; the gate decides who receives them. You never write "if the client
supports images." The manifest already did.

## The audio model

Audio is just more `media.*` events, each projected onto a standard channel:

- **`media.sound.play`**: a one-off sound effect (`src`, optional `volume`, `pan`).
  Read by the `sound` channel.
- **`media.music.play` / `media.music.stop`**: start or crossfade the `music`
  channel's track, or stop it. Music loops by default.
- **`media.ambient.play` / `media.ambient.stop`**: start or stop a loop on an
  `ambient:<id>` channel. Reusing the same `channel` id replaces its source, so a
  soundscape swaps as the player moves room to room.
- **`media.image.show` / `media.image.hide`**: show or hide an image on an
  `image:<layer>` channel (`background`, `main`, `overlay`).

Every duration is in milliseconds and every volume runs 0.0–1.0.

> **A note on `@sharpee/media`.** Sharpee also ships a `@sharpee/media` package
> (ADR-138) with an older `audio.*` event vocabulary and an `AudioRegistry`. That
> vocabulary predates the channel surface; the events the channels actually consume
> today are the `media.*` set above. The `AudioRegistry` is still useful, not as an
> emitter but as a *data store* for room atmospheres, which we use below.

## Supplying your own assets

Sharpee ships no audio or images. The `src` of every `media.*` event is a path **you
provide**. You source the files, drop them in one place, and the build bundles them.

Put assets under an **`assets/`** directory at your project root, in whatever subfolders
your `src` paths use:

```
my-zoo/
  assets/
    audio/aviary-birdsong.mp3
    images/aviary.jpg
  src/
  browser/
```

`sharpee build --browser` copies the contents of `assets/` into the web bundle, so a
`src` like `audio/aviary-birdsong.mp3` resolves at the page root,
`dist/web/audio/aviary-birdsong.mp3`. There's no magic mapping: the folder layout you
choose under `assets/` *is* the layout your `src` paths reference, copied across as-is.

**Sourcing the files is your job, and so is their licensing.** Use audio and images you
have the right to ship. Public-domain (CC0) material is the least friction, with nothing to
attribute inside a bundled game, and there are well-known CC0 sound and image
collections to draw from. Whatever you choose, keep a note of each file's source and
license; if a license asks for credit, surface it in your About text or an on-page
credit.

A `src` with no file behind it simply fails to load: the channel still fires and the
renderer still runs, the browser just 404s the missing file. So a story that *declares*
a soundscape but ships no audio is silent, not broken. Wire the channels first and drop
the real assets in later.

## Fades, not cuts

On the browser side, the `AudioManager` plays these events through the Web Audio API
with sample-accurate **fades** (ADR-169): music crossfades, ambient loops ramp in and
out, so the soundscape never snaps. Sound effects are the deliberate exception: they
fire instantly, because a door slam shouldn't fade in.

One browser rule shapes the wiring: audio can't start until the player interacts with
the page. The client unlocks the audio context on the first command and queues any
events that fired before then, so the opening turn's music waits for the player's
first keystroke rather than being silently dropped.

## Room atmospheres in practice

Scattering raw file paths through your story ages badly. The `AudioRegistry` (from
the `@sharpee/media` package mentioned above) lets you
declare each room's **atmosphere** once, its ambient layers and an optional music track,
with a fluent builder, and look it up by room later. Declare the registry as a
top-level `const`, then fill it in `initializeWorld`, after the rooms exist, using
the same `aviary` and `nocturnalExhibit` room entities you created back in
Volume II:

```typescript
import { AudioRegistry } from '@sharpee/media';

const audio = new AudioRegistry();
```

```typescript
// in initializeWorld, after the rooms are created:
audio.atmosphere(aviary.id)
  .ambient('audio/aviary-birdsong.mp3', 'environment', 0.4)
  .build();
audio.atmosphere(nocturnalExhibit.id)
  .ambient('audio/night-crickets.mp3', 'environment', 0.3)
  .build();
```

A room-entry handler turns that data into channel signals. This is a new
registration surface, the last one the book introduces: the **event processor**
accepts handlers that return `Effect[]` — unlike `chainEvent` (which returns a
single event) or `registerEventHandler` (which returns nothing), an
effect-returning handler can emit several signals from one event. You reach it
from `onEngineReady` via `engine.getEventProcessor()`. Two small
helpers keep the body readable: `mediaEvent` builds a `media.*` semantic event, and
`emit` wraps it in the `Effect` shape the processor expects:

```typescript
import type { Effect } from '@sharpee/event-processor';

let mediaCounter = 0;
function mediaEvent(
  type: string,
  data: Record<string, unknown>,
): ISemanticEvent {
  return {
    id: `zoo-media-${++mediaCounter}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data,
  };
}
function emit(
  type: string,
  data: Record<string, unknown>,
): Effect {
  return { type: 'emit', event: mediaEvent(type, data) };
}
```

(`ISemanticEvent` has been imported since Chapter 13.) Here is the whole handler,
registered in `onEngineReady`: on `if.event.actor_moved` it looks up the
destination's atmosphere, emits the `media.*` events, and stops the loop for rooms
that have none:

```typescript
// in onEngineReady, alongside the plugin registrations:
engine.getEventProcessor().registerHandler(
  'if.event.actor_moved',
  (event: ISemanticEvent): Effect[] => {
    const data = event.data as
      { toRoom?: string; destination?: string } | undefined;
    const toRoom = data?.toRoom ?? data?.destination;
    if (!toRoom) return [];

    const effects: Effect[] = [];
    const atmosphere = audio.getAtmosphere(toRoom);
    if (atmosphere) {
      for (const a of atmosphere.ambient) {
        effects.push(emit('media.ambient.play', {
          src: a.src,
          channel: a.channel,
          volume: a.volume,
          loop: true,
        }));
      }
    } else {
      effects.push(emit('media.ambient.stop', {
        channel: 'environment',
      }));
    }
    return effects;
  },
);
```

None of this makes a sound until the `ambient:*` channel exists on both sides, and
both registrations belong to the story, not the platform defaults. The engine side
registers the channel in `Story.registerChannels` (where the Channels chapter
registered `zoo.ambience`); the browser side registers its renderer in the browser
entry:

```typescript
// Engine side, in Story.registerChannels:
import { createAmbientChannel } from '@sharpee/stdlib';

registry.add(createAmbientChannel('environment'));

// Browser side, in the browser entry:
import {
  createAmbientChannelRenderer,
} from '@sharpee/platform-browser';

client.getChannelRenderer().registerRenderer(
  'ambient:environment',
  createAmbientChannelRenderer(
    client.getAudioManager(),
    'environment',
  ),
);
```

Skip the engine line and the `media.ambient.*` events are never projected into a
turn packet; skip the browser line and the packet's channel arrives with no
renderer. Either way the walkthrough above plays silence.

Sound effects are simpler still: a one-off `media.sound.play` straight from the
action that causes them. In the `ch24-27-presentation/` snapshot the feed action
emits a crunch and the photograph
action a shutter click, right alongside their prose. When the zoo closes, the
after-hours daemon emits one `media.music.play` and a theme fades in. Throughout, the
story only ever declares intent as a `media.*` event; the client, gated by what it can
do, decides what the player actually perceives.

## Key takeaway

Media are expressed as channels: images and audio ride `image:*`, `sound`, `music`,
and `ambient:*`. Media channels are **capability-gated**, so a text-only client
never receives them, and you never branch on client support. You drive them by
firing `media.*` events, and declare each room's atmosphere once with the
`AudioRegistry`, emitting it on entry. With sight and sound in place, every signal
rides the one universal surface: the channel system.
