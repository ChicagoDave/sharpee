# Plan — Family Zoo v18 "Sights & Sounds" (Presentation demo)

**Date:** 2026-06-21
**Session:** 70b555
**Status:** COMPLETE (2026-06-21) — v18 built & validated; ch24/26/27 retrofitted; ch27 audio
vocabulary corrected to `media.*`; platform findings filed as issues #146 and #147
**Parent plan:** `docs/work/book/plan-20260620-sharpee-author-book.md` (Phase 6b)

## Goal

Build `tutorials/familyzoo/src/v18/` on top of v17, adding **only presentation
concerns**, so *The Sharpee Book*'s Volume VII (Presentation) chapters teach against
the running zoo instead of isolated snippets. Then retrofit ch24/26/27 to reference
v18 concretely.

## Proven models (copy these, don't invent)

- `stories/dungeo/src/channels.ts` — custom `IOChannel<string>` + `registerStoryEventChannels`.
- `stories/dungeo/src/audio/audio-setup.ts` — `AudioRegistry` atmospheres, `createAmbientChannel`,
  `registerAudioHandler` emitting `media.ambient.play`/`media.music.play`/`media.ambient.stop`
  on `if.event.actor_moved`.
- `stories/dungeo/src/browser-entry.ts` — story renderer registration + theme wiring.
- `stories/channel-service-test/tests/ac-15.test.ts` — how to unit-test a story channel.
- `packages/engine/tests/integration/channel-bootstrap.test.ts` — registerChannels bootstrap.

## v18 source scope (built on v17's 7 files)

1. **Copy** v17's `zoo-map`, `zoo-items`, `characters`, `events`, `scoring`, `language`, `index`.
2. **New `presentation.ts`:**
   - `zoo.ambience` `IOChannel` (replace/sparse) — a per-area mood line from the player's room,
     varying by `zoo.after_hours`. (Makes ch24's example real.)
   - `AudioRegistry`: per-area atmospheres (aviary birdsong, nocturnal crickets), after-hours
     music; `registerStoryAmbientChannels(registry)` via `createAmbientChannel`.
   - `registerAudioHandler(eventProcessor)` on `if.event.actor_moved` → `media.*` (model dungeo).
   - SFX cues via `audioRegistry.registerCue(... createTypedEvent('audio.sfx', …))` for
     feed-crunch, camera-shutter, penny-press — emitted from the existing feed/photo actions and
     penny chain.
3. **`index.ts` edits:** add `registerChannels` hook; `initializeWorld` → `initializeAudio`;
   `onEngineReady` → `registerAudioHandler` + SFX emission; fold after-hours music into the
   existing behavior-swap daemon.
4. **`browser-entry.ts` (v18):** register a `zoo.ambience` renderer; add `zoo-sunny` to the themes.
5. **Story theme CSS `zoo-sunny`** — `[data-theme="zoo-sunny"]` over the component vocabulary.
6. **Repoint** `src/index.ts` and `src/browser-entry.ts` at v18.

Placeholder asset paths under `assets/` (no real binaries) — teach the wiring; note authors
supply their own audio/image files. CLI play won't exercise media; browser 404s gracefully.

## Unknowns — RESOLVED (verified 2026-06-21)

1. **`image:background`** — a story drives it by emitting a **`media.image.show`** event with
   `{ layer: 'background', src }`. The standard `image:background` channel (stdlib `media.ts`,
   `createImageChannel('background')`, `gatedBy: 'images'`) reads `media.image.show`/`media.image.hide`
   from the turn events; the default browser renderer paints it. No custom channel needed. Emit it
   from the same `if.event.actor_moved` handler that drives ambient (model: dungeo `audio-setup.ts`).
2. **Story theme CSS** — the author override surface is **`browser/<story-id>.css`**: devkit copies it
   to `dist/web/<story-id>.css` and `index.html` links it **last**, so it wins the cascade. Platform
   themes (`base.css`/`decorations.css`/`styles.css` + `themes/`) come from devkit
   (`packages/devkit/templates/browser/`). A custom `zoo-sunny` theme = a `[data-theme="zoo-sunny"]`
   block in `browser/familyzoo.css` + listing it in `BrowserClient.themes`.
   - **Wrinkle:** this is the devkit *standalone* author flow. The in-repo `./sharpee build familyzoo
     --browser` path may assemble differently (tutorials/familyzoo has no `browser/` dir today).
     Confirm the in-repo browser build picks up an override before relying on it for validation.
3. **Audio path** — ALL media is **`media.*`** events, projected by stdlib's pre-registered channels:
   `media.sound.play`→`sound` (gated `sound`), `media.music.play`/`stop`→`music`,
   `media.ambient.play`/`stop` (matched by `channel` field)→`ambient:<id>` (story-registered via
   `createAmbientChannel`). The `audio.*` vocabulary + `AudioRegistry.cue()` (which emits `audio.sfx`)
   is the **legacy ADR-138 path** and is NOT wired into the post-Phase-4 browser client.
   - **Design change:** v18 emits `media.sound.play` for SFX (not `audio.sfx`/`cue()`). `AudioRegistry`
     is still useful as the **atmosphere data store** (`.atmosphere().build()` + `getAtmosphere()`),
     exactly as dungeo uses it — but emitted events are `media.*` throughout.
   - **ch27 CORRECTION REQUIRED (independent of v18):** ch27 currently teaches `audio.sfx` /
     `audio.music.play` / `AudioRegistry.cue()` as the emission path. The canonical wired path is
     `media.*`. Fix ch27 in the retrofit (or sooner).

## Validation

- Typecheck/build the story (`./sharpee build familyzoo`, slow — rebuilds platform; or `tsc` the
  story alone first).
- CLI play regression: `node dist/cli/sharpee.js --story tutorials/familyzoo --play`.
- Channel unit test for `zoo.ambience` (model `ac-15.test.ts`).
- Browser: `./sharpee build familyzoo --browser` — manual smoke (can't fully automate audio/image).

## Retrofit — DONE (2026-06-21)

- **ch24**: `zoo.ambience` example now noted as shipped in v18 (with a browser renderer).
- **ch26**: `zoo-sunny` theme now noted as shipped in `browser/familyzoo.css` (loaded last).
- **ch27**: audio model rewritten to the canonical **`media.*`** vocabulary (`media.sound.play`,
  `media.music.play`, `media.ambient.play`, `media.image.show`); `AudioRegistry` reframed as the
  atmosphere *data store* + room-entry handler; a `@sharpee/media` note explains the legacy
  `audio.*` path; grounded in v18 (aviary/nocturnal atmospheres, feed/shutter SFX, after-hours
  music). Book renders clean to HTML/EPUB/PDF.

## Implementation result (2026-06-21)

**Built:** `src/v18/` (copied v17's 7 files + new `presentation.ts`), edited `v18/index.ts`
(registerChannels hook, `initializeZooAudio`, `registerZooAudioHandler`, SFX in feed/photo
actions, after-hours music in the behavior-swap daemon), repointed `src/index.ts` →`v18` and
`src/browser-entry.ts` →`v18` (custom-channel renderer + `ambient:environment` renderer +
`zoo-sunny` theme), added `browser/familyzoo.css` (zoo-sunny theme + `#zoo-ambience`), added
`@sharpee/media` to `package.json` deps. All audio/media via `media.*` events (matching dungeo).

**Validated 3 ways:**
1. `tsc --noEmit` on the familyzoo project — exit 0 (all versions incl. v18).
2. `./sharpee build familyzoo --browser` — exit 0; `game.js` bundles v18 + presentation.
3. Headless runtime in the story's own module graph (like browser-entry): 5 turns, no
   exceptions, and the per-turn packets emit `zoo.ambience`, `ambient:environment`, and
   `image:background` alongside the standard channels.

## Platform findings (surfaced, NOT fixed — platform changes need discussion)

1. **CLI `--story <ext>` + `@sharpee/helpers` boundary:** `node dist/cli/sharpee.js --story
   tutorials/familyzoo` throws `world.helpers is not a function`. The bundle creates the world
   from its *bundled* `@sharpee/world-model`, but the external story's `import '@sharpee/helpers'`
   patches the *story's* copy of the prototype — different class across the bundle/story boundary.
   Affects every familyzoo version (createZooMap is unchanged from v17), not v18. familyzoo's real
   target is the browser build (one module graph). Candidate GitHub issue.
2. **In-repo `--browser` build doesn't copy `browser/<story-id>.css`:** the devkit *standalone*
   author flow copies the override to `dist/web/<id>.css` (linked last); the monorepo
   `./sharpee build familyzoo --browser` does not, so `zoo-sunny` + the `#zoo-ambience` element
   aren't wired in the in-repo web output (the JS still runs). The book teaches the standalone
   flow, which is correct; this is a monorepo-build gap. Candidate GitHub issue.

## Risks / notes

- This is platform-adjacent story code; the `media.*` vs `audio.*` split and the image/theme
  mechanisms are the real unknowns. Keeping images optional de-risks the bulk.
- Per project policy, `tutorials/` is story-level — in-scope to implement autonomously once
  approved; no `packages/` changes are planned.
