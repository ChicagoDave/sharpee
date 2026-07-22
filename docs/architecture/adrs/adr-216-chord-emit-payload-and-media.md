# ADR-216: Chord Emit Payload & Media Channels

## Status: ACCEPTED (2026-07-14 — direction fixed by ADR-214 §6/OQ3; designed via interview the same session; all six open questions resolved)

> **`define channel` syntax superseded in part by ADR-253 (2026-07-22).** The
> `from event <key>` + `take <field>` lines are replaced by one `return
> <construct> from <event>` clause (`take` removed; the return construct may be
> a field, a text template, or a phrase). See ADR-253.

> Child of ADR-214 (parity). ADR-214 §6 audited the browser channel/emit system
> (ADR-163/165) and OQ3 resolved **(1) give `emit` a data payload and (2) add
> typed media sugar** (`play sound`/`play music`/`show image` …). This ADR
> designs both. Custom-channel *registration* rides the extension surface
> (ADR-215). Reserved by name in ADR-214 §8.

## Date: 2026-07-14

## Context

The browser render path is the channel system: each `IOChannel.produce` scans a
turn's semantic events and projects `event.data`. Grounding (2026-07-14):

- **`IOChannel { id, contentType, mode, emit, gatedBy?, produce }`**
  (`if-domain/src/channels/types.ts:238-250`); registered via `IChannelRegistry.
  add`; standard channels (`main`, `prompt`, `location`, `score`, `turn`, `info`,
  `ifid`, `death`, `endgame`, `score_notify`, `lifecycle`) are ungated text/status
  (`stdlib/src/channels/standard.ts`).
- **Media channels** (`stdlib/src/channels/media.ts`) consume `media.*` events and
  are capability-gated: `image:background|main|overlay` + `image:preload`
  (`media.image.show/hide/preload`, need `src`, optional `alt`/`layer`/`hotspots`),
  `sound` (`media.sound.play`, needs `src`, `channel`→`bus`), `music`
  (`media.music.play/stop`, `src`/`volume`/`fadeIn`/`loop`), `ambient:<id>`,
  `animation`/`animate`/`transition`/`layout`/`clear`. Required `data` fields are
  enforced by the browser renderers (`platform-browser/src/channels/image.ts:78`).
  A legacy `@sharpee/media` `audio.*` vocabulary is bridged to the `sound`/`music`/
  `ambient` channels by the browser audio renderer.
- **Capability gating** — `channel.gatedBy` checked in `ChannelService.
  isGatedOut`; gated-out channels vanish from manifest + packets. Standard
  channels never gated; media channels gated except `clear`.
- **Chord's `emit`** — `emit <event-words> [when <cond>]` (`ast.ts:533-539`);
  runtime hard-codes the payload: `events.push(this.rawEvent(stmt.event, {}))`
  (`story-loader/runtime.ts:916-917`). **`data` is always `{}`; there is no
  payload syntax, and Chord cannot register a channel or renderer** (zero
  `registerChannel`/`renderer` hits in chord/story-loader). So even
  `emit media.sound.play` cannot supply the required `src`.

ADR-214 committed to the payload + typed sugar.

## Decision

*Direction fixed by ADR-214 §6/OQ3; syntax being designed here.* This ADR
specifies:

### Payloaded `emit` — full nested payload (resolved 2026-07-14)

`emit <type> with <field> <value>, …` attaches a data payload to the emitted
event. The `with <field> <value>` form **matches the trait/`create` data
grammar** (no `=`) for one consistent grammar across the language. Values are
**full nested structures** — literals, value-expressions (world-state reads),
**arrays** `[ … ]`, and **nested objects** `{ <field> <value>, … }` — so `emit`
can express any channel payload directly, including complex ones like image
hotspot arrays. This generically unblocks every media channel and any custom
channel. (The typed sugar below is then convenience over this, not the only way
to reach rich payloads.) *This supersedes ADR-214 OQ3's `with <field> = <value>`
sketch — the `=` is dropped so emit's `with`-data matches the `create`/trait data
grammar (one grammar across the language).*
### Typed media sugar — full media surface (resolved 2026-07-14)

Ergonomic statements cover **every common media channel**, sugar over the
payloaded `emit`: `play sound <asset>`, `play music <asset> [looping]` /
`stop music`, `show image <asset> [in <layer>]` / `hide image`, `play ambient
<asset>` / `stop ambient`, `transition <…>`, and `clear`. Raw `emit` remains for
anything exotic or custom. Each sugar statement lowers to the corresponding
`media.*` event with the right `data` fields.

### Custom channels — declaration here, renderer caveat (resolved 2026-07-14)

ADR-216 designs **custom-channel declaration** in Chord: a channel is a
**declarative projection** over the turn's events — a named channel with its
`contentType`, `mode` (`replace`/`append`/`event`), optional `gatedBy` capability,
and a **produce rule** projecting data from named event types. That projection is
data-shaped, so declaring a channel is Chord-expressible and **pure-IR-safe**.

The **renderer caveat**: a channel's *browser renderer* is display code, not data.
A custom channel is useful only when its display is covered — either it **reuses a
built-in renderer** by matching an existing channel's data shape (pure-IR OK), or a
**novel renderer ships via a platform extension** (ADR-215's trusted registry, so
still pure IR). An author-supplied renderer would be a `define … from "./x.ts"`
hatch (impure, per ADR-210 AC-4). So channel *declaration* lives here; novel
*renderer code* stays platform/extension territory — ADR-216 is a consumer of
ADR-215's registration mechanism, not a duplicate of it.

### Declared assets (resolved 2026-07-14)

Media assets are **declared once and referenced by name**: `define sound chime
from "audio/chime.ogg"`, `define image map from "img/map.png"` (and `define music
…`), then `play sound chime` / `show image map in background`. Benefits: a central
asset manifest, typo-checked names (analyzer validates references), preload
support (`media.image.preload`), and one place to change a path.

**Critically, an asset `define … from "<file>"` is a DATA reference (a static file
path), not a code hatch.** The pure-IR/`hasHatches` check therefore **discriminates
by the `define` subject**: `define sound|image|music … from "<file>"` is a data
asset (pure IR); `define action|behavior|text … from "./x.ts"` is author code (a
hatch). It does **not** set `hasHatches` and does **not**
disqualify the pure-IR profile — unlike `define action|behavior … from "./x.ts"`,
which imports author TypeScript. This mirrors the ADR-215/ADR-210 AC-4 distinction
(trusted/data enablement vs author code). Asset declaration lives here in ADR-216
(part of the media surface); custom-channel *registration* still rides ADR-215.

### Author-checkable client capability (resolved 2026-07-14)

Chord gains a **`client has <capability>`** predicate usable in `when`/conditions,
so a story can branch on the client's rendering capability and provide a text
fallback when media is unavailable — e.g. `when client has sound: play sound
"roar" / otherwise: "A deafening roar shakes the room."`. Capability names are the
platform's `ClientCapabilities` flags (`images`, `sound`, `music`, `animations`,
`transitions`, `layers`, `speech`, `splitPane`, …). The predicate reads the live
client capability at evaluation time; it does not change the platform's silent
gating (an ungraceful story still degrades safely), it lets authors degrade
*deliberately*.

### Media + legacy audio both reachable (resolved 2026-07-14)

The typed sugar lowers to the **ADR-163 `media.*`** channel events (the
forward-looking vocabulary the browser renderer already bridges to `audio.*`).
Raw `emit` reaches **any event type**, so the legacy `@sharpee/media` `audio.*`
vocabulary that `media.*` does not cover — `audio.procedural`, `audio.effect`,
`audio.sfx` — is authorable directly (`emit audio.procedural with recipe "wind",
…`) with no extra work, thanks to the full-payload emit. Sugar stays decoupled
from the legacy layer; `emit` provides full reach. Cost: two overlapping audio
vocabularies coexist, which the payloaded `emit` already permits.

## Consequences

- Chord reaches the **entire** browser presentation surface, closing ADR-214 §6's
  gap: payloaded `emit` (full nested data) unblocks every channel generically;
  full media sugar makes the common cases ergonomic; declared assets, custom
  channels, and `client has` degradation round it out. Chord goes from text-only
  to full multimedia authoring.
- The payloaded `emit` is the load-bearing primitive; all sugar lowers onto it.
  `with <field> <value>` matches the trait/create data grammar for one consistent
  syntax.
- Pure IR is preserved: asset `define … from "<file>"` is a data reference (not a
  hatch), and custom-channel *declaration* is a data projection; only a novel
  *renderer* needs a platform extension (ADR-215) or it is an author hatch.
- Two audio vocabularies (`media.*` sugar + raw `audio.*`) coexist — accepted cost
  of full reach.

## Acceptance criteria

Inherits ADR-214 AC-1..AC-4. Concretely:

- **AC-1 — payloaded emit.** A fixture `emit media.sound.play with src "chime.ogg",
  bus "sfx"` produces a semantic event whose `data` carries those fields (asserted
  against the channel), flipping the audit's media rows to reachable.
- **AC-2 — media sugar + assets.** A `define sound`/`define image` fixture with
  `play sound <name>` / `show image <name> in <layer>` drives the `sound`/`image`
  channels; a typo'd asset name is a load error.
- **AC-3 — capability degradation.** A `when client has sound: … / otherwise: …`
  fixture emits sound for a capable client and the text fallback for a text-only
  client (asserted against both capability sets).
- **AC-4 — pure IR + custom channel.** A story using emit/sugar/assets/a declared
  custom channel (reusing a built-in renderer) is `hasHatches: false` and browser-
  loadable; cloak/zoo compile unchanged.

## Session

Session ae2a61 (2026-07-14) — created as a grounded stub for the ADR-214 §8
roadmap, then designed via interview the same session (6 open questions resolved).
Parent: ADR-214 §6/OQ3. Related: ADR-210 (grammar ratchet), ADR-163/165 (channel
system), ADR-215 (extension surface — novel renderer registration for custom
channels).
