# Media & Audio

Every chapter so far has reached the player through words and the chrome around them.
This last chapter of the volume adds the other senses: a picture behind the prose, a
sound when a door slams, music that swells at the climax. They arrive the same way
everything else does — over channels, capability-gated — so a text-only client never
even hears about them.

## Media is just more channels

There is no separate media engine. Images and audio are channels like `main` and
`score`, registered among the platform defaults and rendered by the browser client.
The standard media channels are:

| Channel | Carries |
|---|---|
| `image:background` | a full-bleed image behind the prose |
| `image:main` | a primary illustration in the content flow |
| `image:overlay` | an image layered above the scene |
| `image:preload` | assets to fetch ahead of time |
| `sound` | one-off sound effects |
| `music` | the background track |
| `ambient:*` | layered environmental loops (wind, machinery, …) |

A story drives these channels by firing **`media.*` events** — `media.image.show`,
`media.sound.play`, `media.music.play`, `media.ambient.play` (and their `.hide` /
`.stop` partners). The standard channels listen for those events on the turn's event
stream and project them; the browser renderers do the rest. That's the through-line of
this chapter: *you emit a `media.*` event, and the channel surface turns it into
something the player sees or hears.* Because these are ordinary channels, an image's
hotspot can carry a `command` that the client routes back through `engine.executeTurn`
— a clickable region that plays exactly like a typed verb.

## Capability gating

The reason a terminal never mis-renders an image is **capability gating**, the
mechanism from the Channels chapter. At startup the client declares what it can do.
The browser declares a full graphical profile — `images`, `sound`, `music`,
`animations`, and more all `true` — so every media channel appears in its manifest. A
text-only client declares them `false`, and the engine simply leaves the media
channels out of *that* client's manifest. The story emits the same signals
regardless; the gate decides who receives them. You never write "if the client
supports images" — the manifest already did.

## The audio model

Audio is just more `media.*` events, each projected onto a standard channel:

- **`media.sound.play`** — a one-off sound effect (`src`, optional `volume`, `pan`).
  Read by the `sound` channel.
- **`media.music.play` / `media.music.stop`** — start or crossfade the `music`
  channel's track, or stop it. Music loops by default.
- **`media.ambient.play` / `media.ambient.stop`** — start or stop a loop on an
  `ambient:<id>` channel. Reusing the same `channel` id replaces its source, so a
  soundscape swaps as the player moves room to room.
- **`media.image.show` / `media.image.hide`** — show or hide an image on an
  `image:<layer>` channel (`background`, `main`, `overlay`).

Every duration is in milliseconds and every volume runs 0.0–1.0, so the events read
like intent, not like a sound driver.

> **A note on `@sharpee/media`.** Sharpee also ships a `@sharpee/media` package
> (ADR-138) with an older `audio.*` event vocabulary and an `AudioRegistry`. That
> vocabulary predates the channel surface; the events the channels actually consume
> today are the `media.*` set above. The `AudioRegistry` is still useful — not as an
> emitter, but as a *data store* for room atmospheres, which we use below.

## Fades, not cuts

On the browser side, the `AudioManager` plays these events through the Web Audio API
with sample-accurate **fades** (ADR-169): music crossfades, ambient loops ramp in and
out, so the soundscape never snaps. Sound effects are the deliberate exception — they
fire instantly, because a door slam shouldn't fade in.

One browser rule shapes the wiring: audio can't start until the player interacts with
the page. The client unlocks the audio context on the first command and queues any
events that fired before then, so the opening turn's music waits for the player's
first keystroke rather than being silently dropped.

## Room atmospheres in practice

Scattering raw file paths through your story ages badly. The `AudioRegistry` lets you
declare each room's **atmosphere** once — its ambient layers, an optional music track —
with a fluent builder, and look it up by room later. Family Zoo v18 does exactly this:

```typescript
const audio = new AudioRegistry();

audio.atmosphere(aviaryId)
  .ambient('audio/aviary-birdsong.mp3', 'environment', 0.4)
  .build();
audio.atmosphere(nocturnalId)
  .ambient('audio/night-crickets.mp3', 'environment', 0.3)
  .build();
```

Then a single room-entry handler turns the data into channel signals. On
`if.event.actor_moved` it looks up the destination's atmosphere and emits the
`media.*` events — and stops the loop for rooms that have none:

```typescript
const atmosphere = audio.getAtmosphere(toRoom);
if (atmosphere) {
  for (const a of atmosphere.ambient) {
    effects.push(emit('media.ambient.play', {
      src: a.src, channel: a.channel, volume: a.volume, loop: true,
    }));
  }
} else {
  effects.push(emit('media.ambient.stop', { channel: 'environment' }));
}
```

Sound effects are simpler still — a one-off `media.sound.play` straight from the
action that causes them. In v18 the feed action emits a crunch and the photograph
action a shutter click, right alongside their prose. When the zoo closes, the
after-hours daemon emits one `media.music.play` and a theme fades in. Throughout, the
story only ever declares intent as a `media.*` event; the client, gated by what it can
do, decides what the player actually perceives.

## Key takeaway

Media is not a special path — images and audio are channels (`image:*`, `sound`,
`music`, `ambient:*`) and **capability-gated**, so a text-only client never receives
them and you never branch on client support. You drive them by firing **`media.*`
events** — `media.image.show`, `media.sound.play`, `media.music.play`,
`media.ambient.play` — measured in milliseconds and 0.0–1.0 volumes; the standard
channels project them, and the browser's `AudioManager` plays sound and music with Web
Audio fades (effects excepted), unlocking on the first keystroke. Declare each room's
atmosphere once with the `AudioRegistry` (a data store) and emit it on room entry, as
Family Zoo v18 does. With sight and sound in place, the presentation layer is
complete: from a typed verb to a rendered, scored, illustrated, scored-to-music turn,
every signal you've met rides the one universal surface — the channel.
