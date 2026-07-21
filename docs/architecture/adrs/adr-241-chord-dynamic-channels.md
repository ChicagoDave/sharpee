# ADR-241: Chord dynamic channels — story-registered channels of any content, from pure IR

## Status: ACCEPTED (2026-07-18 — all five open questions ruled by David via interview, session 1e7652: `main` default bed; bare `stop ambient` = default bed only; channel words declared beyond the implied defaults; `define ambient`/`define layer` one-liners; platform generic panel for unrendered channels. adr-review 14/14 post-interview; custom-UI scope note recorded.)

## Date: 2026-07-18

## Parent: ADR-216 (Chord extension surface — media sugar, declared assets, `define channel`); siblings ADR-163 (channel-service platform, §6–7 channel vocabulary) and ADR-165 (renderer architecture, §3 fallback).

## Context

**Dynamic channels are the platform's story-registered channels — ADR-163
§7's term for every IOChannel a story adds beyond the static platform set.
They are not media-specific: the author can throw _anything_ into a
dynamic channel** (ruled by David, 2026-07-18, session 1e7652, correcting
an earlier media-scoped draft of this ADR). A dynamic channel is an id, a
mode, an optional capability gate, and whatever JSON the story chooses to
project onto it — a discoveries panel, a clock, an ambient audio bed, a
map layer, a score ticker.

Fernhill Phase 8 (ADR-233 G3, browser presentation) exposed how little of
that Chord can reach:

- `define channel` (ADR-216) registers a data-projection channel — but
  only plain-word ids, and nothing else.
- The platform's parameterized channel families are unreachable from pure
  IR. `play ambient <asset>` lowers to a `media.ambient.play` emit
  carrying only `src`; stdlib's `createAmbientChannel(id)` channels filter
  on a `channel` payload field chord never emits, and the loader registers
  no ambient channel at all — **`play ambient` compiles, degrades
  correctly in text, and is silently inaudible in the browser.** The same
  class covers image layers beyond the pre-registered three: `show image X
  in <custom-layer>` routes to an `image:<layer>` channel nothing
  registered.
- Client-side, a dynamic channel with no registered renderer falls back to
  the console JSON tree (ADR-165 §3) — Fernhill's `clock` panel needed a
  hand-written renderer in the project's `src/browser-entry.ts` (the
  designed story-side seam).

Chord reaching only a narrow, hard-coded slice of the dynamic-channel
surface is the elegance-parity gap. A hard-wired default ambient bed
(pre-registering one channel-less ambient channel platform-side) was
considered and rejected by David: it papers over one instance and leaves
the general surface TS-only. The ruling: **"chord has to support dynamic
channels"** — the general mechanism, with media as one rider.

## Decision

### D1 — `define channel` is Chord's dynamic-channel surface, general by contract

A chord story can register a dynamic channel with any id, carrying any
JSON the story projects onto it (payloaded `emit` → `from event` → `take`
fields, per ADR-216). This ADR pins the contract: the surface is
content-agnostic — nothing in the compiler, IR, loader, or client may
assume a dynamic channel carries media, text, or any particular shape.

### D2 — Family channels are declared as what they are (ruled Q-4)

Named family channels get dedicated one-line declarations beside the
asset declarations they resemble: **`define ambient <word>`** (an ambient
bed) and **`define layer <word>`** (an image layer). The registered ids
(`ambient:<word>`, `image:<word>`) are an implementation detail — the
colon form is never author-facing, and `define channel` stays a
plain-word, full-bodied data projection (mode/from/take), one construct
with one meaning. Client-side, a manifest channel id in a platform
renderer family (`ambient:*` → the AudioManager ambient renderer,
`image:*` → the image-layer renderer) gets that family's renderer
automatically; every other dynamic channel renders through the story's
own renderer (`browser-entry.ts` `registerRenderer`, exact-id wins) or,
absent one, the platform's generic panel (D4).

### D3 — Media sugar rides the general mechanism

`play ambient <asset> [in <channel-word>]` / `stop ambient
[in <channel-word>]` gain the optional channel word (mirroring the
shipped `show image <asset> [in <layer>]` spelling; one ratchet row).
Lowering always stamps `channel` onto the `media.ambient.play` /
`media.ambient.stop` payload, so the emits match what the family channels
filter on. **The default bed is `main`** (`ambient:main`, mirroring
`image:main` — ruled Q-1, 2026-07-18): a bare `play ambient <asset>`
plays into it, and `in main` is simply the explicit spelling of the same
bed. **Bare `stop ambient` stops the default bed only** (ruled Q-2, same
session) — fully symmetric with the bare play form; named beds stop by
name (`stop ambient in wind`), and a stop-all, if ever wanted, gets its
own future spelling rather than overloading the bare form.

**Family channels beyond `main` must be declared before use** (ruled Q-3,
same session — the never-guess rule, matching the declared-asset
precedent): the default `main` bed/layer is implied and needs no
declaration, but `play ambient X in wind` or `show image X in map`
without a matching channel declaration is a load error with a
nearest-match suggestion (`analysis.unknown-channel`). **The
pre-registered image layers `background`, `main`, and `overlay` are
implied exactly like the `main` bed** — `define layer` is required only
for layers the platform does not pre-register. A declared-or-implied
family channel is auto-registered exactly as if the author had written
the registration — sugar rides the mechanism; it does not bypass it.

### D4 — IR manifest + loader registration + client family binding

Analysis collects the story's full dynamic-channel set — explicit
`define channel` declarations, `define ambient`/`define layer`
declarations, and the implied defaults when used — into the existing
`ir.channels: IRChannelDef[]` list: **`IRChannelDef` gains a
`family: 'data' | 'ambient' | 'layer'` discriminator** (additive;
existing entries read as `data`). `ChordStoryRuntime.registerChannels`
registers them all producer-side (family channels via stdlib's
`createAmbientChannel`/`createImageChannel` builders, inheriting their
capability gates; `data` channels as today). Client-side,
`registerDefaultBrowserRenderers` binds family renderers for any
manifest channel id in a known family that has no exact-id renderer
registered.

**Unrendered non-family channels get a platform generic panel renderer**
(ruled Q-5, 2026-07-18), so a pure-IR story can throw anything into a
dynamic channel and see it — no story TS required for visibility. The
panel ships in platform-browser beside the other channel renderers
(`src/channels/`), with this contract: one labelled box per channel id,
hidden until its first value; `replace` mode overwrites the box's
key/value rows, `append` mode appends rows, `event` mode shows the
latest value. Exact-id story renderers override the generic panel; the
console JSON tree remains as the debugging view, not the player-facing
default.

### Scope note — custom UI implementations (recorded, not in-gate)

Dynamic channels are also the natural vehicle for **custom UI
implementations** — a story shipping its own panels, layouts, and
presentation beyond the generic box. Sharpee's platform implementation
already supports custom templates on the browser side; Chord does not
express that today, and this ADR deliberately does not go down that road
(David, 2026-07-18, session 1e7652). It will need to be expressed
eventually — when it is, it arrives as its own ADR riding this
mechanism (channels carrying whatever the custom UI consumes), not as a
stretch of D2's family list or D4's generic panel. Recorded here so the
future work knows its seam; nothing in this gate blocks or prejudges it.

### D5 — Acceptance criteria for the implementation plan

- **AC-1 (the raising case, closed)**: the Fernhill browser proof
  (`scripts/g3-fernhill-browser-proof.mjs`) gains its deferred ambient
  assertion — the manifest carries `ambient:main` and entering the
  Grounds fetches `audio/night-wind.wav` in real Chromium, with the
  story source unchanged.
- **AC-2**: an undeclared channel word (`play ambient X in wnd`) is a
  load error with a nearest-match suggestion
  (`analysis.unknown-channel`); the pre-registered defaults (`main`
  bed; `background`/`main`/`overlay` layers) need no declaration.
- **AC-3**: a declared bed (`define ambient wind`; `play ambient X in
  wind`; `stop ambient in wind`) round-trips REAL-PATH: the loader
  registers `ambient:wind` on the real registry with the `sound` gate,
  its `produce` projects the play/stop emits, and bare `stop ambient`
  does NOT stop it.
- **AC-4**: an undeclared-renderer data channel (`define channel` with
  no story renderer) renders in the generic panel in a real browser —
  visible key/value content, no story TS.
- **AC-5**: an exact-id story renderer still wins — Fernhill's `clock`
  renderer keeps producing `#estate-clock`, and the generic panel does
  not double-render the channel.
- **AC-6**: full regression — chord suite (goldens churn additively:
  every existing golden gains only the `family` discriminator),
  story-loader/stdlib suites, `./repokit build`, cloak + zoo gates, all
  Fernhill transcripts + walkthrough, and the Phase 8 browser proof
  rerun green.

## Implementation

- `packages/chord`: `parser.ts` (ambient `in <word>` on play/stop;
  `define ambient` / `define layer` one-liners), `analyzer.ts`
  (channel-word resolution + `analysis.unknown-channel`; implied
  defaults; family collection into `ir.channels`), `catalog.ts` (any
  new reserved words), `ir.ts` (`IRChannelDef.family`).
- `packages/ide-protocol`: re-export of the extended `IRChannelDef`.
- `packages/story-loader`: `loader.ts` `registerChannels` — family
  branches through stdlib's `createAmbientChannel` /
  `createImageChannel`.
- `packages/platform-browser`: `registerDefaultBrowserRenderers`
  (family binding from the manifest) + new generic-panel renderer
  module under `src/channels/`.
- `packages/stdlib`: no change expected (the builders exist); touched
  only if a builder gap surfaces.
- Docs: `chord-grammar.md` (Extension surface + define sections),
  `chord-grammar-changes.md` ratchet rows (ambient channel word on both
  play and stop forms; the two declaration one-liners), `chord.ebnf`.

## Consequences

- The dynamic-channel surface is Chord-expressible in full: any id, any
  content, producer-side registration from pure IR.
- `play ambient` becomes real in the browser for every chord story;
  layered beds and custom image layers need no TS.
- The renderer boundary is explicit: platform families render
  platform-side; every other dynamic channel is visible by default
  through the generic panel, with the story's own renderer as the
  upgrade path — Fernhill's hand-written clock renderer becomes optional
  polish, not a requirement.
- The chord grammar ratchet gains the ambient channel-word row (D3) and
  the `define ambient` / `define layer` declaration one-liners (D2); IR
  gains one additive field (D4); goldens churn additively.
- Fernhill Phase 8's deferred ambient assertion joins the browser proof
  once this ships (the story source is already correct as written).

## Session

Raised and drafted in session 1e7652 (2026-07-18), from the Fernhill
Phase 8 browser proof; general-surface ruling by David same session.

