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

A story emits an image by producing a value on an image channel; the browser's image
renderer swaps the corresponding element. Because these are ordinary channels, an
image hotspot can carry a `command` that the client routes back through
`engine.executeTurn` — a clickable region that plays exactly like a typed verb.

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

Audio is rich enough to have its own subsystem, `@sharpee/media`, but the principle
is unchanged: the story emits audio *events*, and a client that can play them does.
The event vocabulary is small and declarative:

- **`audio.sfx`** — play a sound effect once (`src`, optional `volume`, `pan`, and a
  `duck` priority that briefly lowers other audio so the effect cuts through).
- **`audio.music.play` / `audio.music.stop`** — start or crossfade a track, or fade
  it out. Music loops by default.
- **`audio.ambient.play` / `audio.ambient.stop`** — start or stop a named ambient
  loop. Reusing a channel name replaces its source; ambient layers stack.
- **`audio.procedural`** — ask for a *named recipe* (`beep`, `alert`, `sweep-up`, …)
  and let the client synthesize it. The story says what it wants; the client decides
  how to make the sound.

Every duration is in milliseconds and every volume runs 0.0–1.0, so the events read
like intent, not like a sound driver.

## Fades, not cuts

On the browser side, the `AudioManager` plays these events through the Web Audio API
with sample-accurate **fades** (ADR-169): music crossfades, ambient loops ramp in and
out, so the soundscape never snaps. Sound effects are the deliberate exception — they
fire instantly, because a door slam shouldn't fade in.

One browser rule shapes the wiring: audio can't start until the player interacts with
the page. The client unlocks the audio context on the first command and queues any
events that fired before then, so the opening turn's music waits for the player's
first keystroke rather than being silently dropped.

## Registering audio by name

Scattering raw file paths through your story code ages badly. The `AudioRegistry`
gives every sound a name, set up once when you build the world, and referenced
everywhere after:

```typescript
const audio = new AudioRegistry();

// A named cue — one sound, full control.
audio.registerCue('feed.dispense', () =>
  createTypedEvent('audio.sfx', { src: 'sfx/pellet-drop.mp3', volume: 0.7 }),
);

// A variation pool — several files, picked at random with jitter so
// repetition never grates.
audio.registerPool('footstep.gravel', {
  sources: ['sfx/step-1.mp3', 'sfx/step-2.mp3', 'sfx/step-3.mp3'],
  volume: 0.6,
  pitchJitter: 0.05,
});
```

An action or handler then fires by name — `audio.cue('feed.dispense')` — and gets
back the events to emit. If a name isn't registered, `cue` returns nothing and the
turn proceeds in silence; audio degrades quietly rather than crashing a turn.

You can go further and register a whole **room atmosphere** — its ambient layers,
its music, an optional effect like cave reverb — with a fluent builder, so entering a
room sets its entire soundscape in one declarative block. As with everything in this
volume, the story declares the intent; the client, gated by what it can do, decides
what the player actually perceives.

## Key takeaway

Media is not a special path — images and audio are channels (`image:*`, `sound`,
`music`, `ambient:*`) emitted like any other and **capability-gated**, so a text-only
client never receives them and you never branch on client support. Audio events are
small and declarative (`audio.sfx`, `audio.music.play`, `audio.ambient.play`,
`audio.procedural`), measured in milliseconds and 0.0–1.0 volumes; the browser's
`AudioManager` plays them with Web Audio fades (effects excepted) and unlocks on the
first keystroke. Name your sounds through the `AudioRegistry` — cues, variation pools,
room atmospheres — and reference them by name so file paths stay out of your logic.
With sight and sound in place, the presentation layer is complete: from a typed verb
to a rendered, scored, illustrated, scored-to-music turn, every signal you've met
rides the one universal surface — the channel.
