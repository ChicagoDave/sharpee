# Ch 27 — Media & Audio: edit proposals

Entirely em-dash removal, in prose and in the channel/audio bullet lists. The prose
is clear and concrete; I left it alone except for the dashes. Each entry: location,
reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: They arrive the same way everything else does — over channels, capability-gated — so a text-only client never even hears about them.
NEW: They arrive the same way everything else does, over channels and capability-gated, so a text-only client never even hears about them.

### 2. "Media is just more channels" — emdash
OLD: That's the through-line of this chapter: *you emit a `media.*` event, and the channel surface turns it into something the player sees or hears.* Because these are ordinary channels, an image's hotspot can carry a `command` that the client routes back through `engine.executeTurn` — a clickable region that plays exactly like a typed verb.
NEW: That's the through-line of this chapter: *you emit a `media.*` event, and the channel surface turns it into something the player sees or hears.* Because these are ordinary channels, an image's hotspot can carry a `command` that the client routes back through `engine.executeTurn`, a clickable region that plays exactly like a typed verb.

### 3. "Capability gating" — emdash
OLD: The browser declares a full graphical profile — `images`, `sound`, `music`, `animations`, and more all `true` — so every media channel appears in its manifest.
NEW: The browser declares a full graphical profile, with `images`, `sound`, `music`, `animations`, and more all `true`, so every media channel appears in its manifest.

### 4. "Capability gating" — emdash
OLD: You never write "if the client supports images" — the manifest already did.
NEW: You never write "if the client supports images." The manifest already did.

### 5. "The audio model" bullet — emdash
OLD: - **`media.sound.play`** — a one-off sound effect (`src`, optional `volume`, `pan`). Read by the `sound` channel.
NEW: - **`media.sound.play`**: a one-off sound effect (`src`, optional `volume`, `pan`). Read by the `sound` channel.

### 6. "The audio model" bullet — emdash
OLD: - **`media.music.play` / `media.music.stop`** — start or crossfade the `music` channel's track, or stop it. Music loops by default.
NEW: - **`media.music.play` / `media.music.stop`**: start or crossfade the `music` channel's track, or stop it. Music loops by default.

### 7. "The audio model" bullet — emdash
OLD: - **`media.ambient.play` / `media.ambient.stop`** — start or stop a loop on an `ambient:<id>` channel. Reusing the same `channel` id replaces its source, so a soundscape swaps as the player moves room to room.
NEW: - **`media.ambient.play` / `media.ambient.stop`**: start or stop a loop on an `ambient:<id>` channel. Reusing the same `channel` id replaces its source, so a soundscape swaps as the player moves room to room.

### 8. "The audio model" bullet — emdash
OLD: - **`media.image.show` / `media.image.hide`** — show or hide an image on an `image:<layer>` channel (`background`, `main`, `overlay`).
NEW: - **`media.image.show` / `media.image.hide`**: show or hide an image on an `image:<layer>` channel (`background`, `main`, `overlay`).

### 9. "@sharpee/media" callout — emdash
OLD: The `AudioRegistry` is still useful — not as an emitter, but as a *data store* for room atmospheres, which we use below.
NEW: The `AudioRegistry` is still useful, not as an emitter but as a *data store* for room atmospheres, which we use below.

### 10. "Supplying your own assets" — emdash
OLD: Sharpee ships no audio or images — the `src` of every `media.*` event is a path **you provide**.
NEW: Sharpee ships no audio or images. The `src` of every `media.*` event is a path **you provide**.

### 11. After the assets-copy paragraph — emdash
OLD: so a `src` like `audio/aviary-birdsong.mp3` resolves at the page root — `dist/web/audio/aviary-birdsong.mp3`.
NEW: so a `src` like `audio/aviary-birdsong.mp3` resolves at the page root, `dist/web/audio/aviary-birdsong.mp3`.

### 12. "Sourcing the files" paragraph — emdash
OLD: Public-domain (CC0) material is the least friction — nothing to attribute inside a bundled game — and there are well-known CC0 sound and image collections to draw from.
NEW: Public-domain (CC0) material is the least friction, with nothing to attribute inside a bundled game, and there are well-known CC0 sound and image collections to draw from.

### 13. "A src with no file" paragraph — emdash
OLD: So a story that *declares* a soundscape but ships no audio is silent, not broken — wire the channels first and drop the real assets in later.
NEW: So a story that *declares* a soundscape but ships no audio is silent, not broken. Wire the channels first and drop the real assets in later.

### 14. "Fades, not cuts" — emdash
OLD: with sample-accurate **fades** (ADR-169): music crossfades, ambient loops ramp in and out, so the soundscape never snaps. Sound effects are the deliberate exception — they fire instantly, because a door slam shouldn't fade in.
NEW: with sample-accurate **fades** (ADR-169): music crossfades, ambient loops ramp in and out, so the soundscape never snaps. Sound effects are the deliberate exception: they fire instantly, because a door slam shouldn't fade in.

### 15. "Room atmospheres in practice" — emdash
OLD: The `AudioRegistry` lets you declare each room's **atmosphere** once — its ambient layers, an optional music track — with a fluent builder, and look it up by room later.
NEW: The `AudioRegistry` lets you declare each room's **atmosphere** once, its ambient layers and an optional music track, with a fluent builder, and look it up by room later.

### 16. After the registry code — emdash (two dashes around the aside)
OLD: Two small helpers keep the body readable — `mediaEvent` builds a `media.*` semantic event, and `emit` wraps it in the `Effect` shape the processor expects:
NEW: Two small helpers keep the body readable: `mediaEvent` builds a `media.*` semantic event, and `emit` wraps it in the `Effect` shape the processor expects:

### 17. "Sound effects are simpler still" — emdash
OLD: Sound effects are simpler still — a one-off `media.sound.play` straight from the action that causes them.
NEW: Sound effects are simpler still: a one-off `media.sound.play` straight from the action that causes them.
