# ADR-256: story-loader translates Chord event ids to platform event ids

> Filename note: created as `adr-256-event-type-acl.md`; there is no ACL — the design is a Chord-id → platform-id translation added to story-loader.

## Status: ACCEPTED (2026-07-22, session 818d28) — adds the Chord-event-id → platform-event-id translation that lets Chord be dotless (ADR-254) while the Sharpee/TS platform keeps its dotted event ids. Greenfield: verified no such translation exists today (emit/channel/machine events pass through verbatim). Lives in `@sharpee/story-loader` to keep the Chord compiler platform-free. `adr-review` clean (254+256) after three fixes: ADR-254 §D2 event-type amendment, this ADR's Acceptance section, emit-seam marked TBD. **IMPLEMENTED** (2026-07-23, session 341218 confirmation): the translation ships as `packages/story-loader/src/event-id-map.ts`, wired into `loader.ts`.

## Date: 2026-07-22

## Parent: ADR-254 (Chord single-token labels). Phase 1 banned dots at author-label sites but left the three event-type sites (`emit`, channel `from event`, machine `when event`) `allowDotted`, because a Chord event id today *is* the platform event id, written verbatim. This ADR adds the translation that lets Chord write a dotless id instead. Relates to ADR-216 (`emit`/media), ADR-163 (`media.*`), ADR-210 (compiled IR; Interface Contract split — Chord names vs. loader platform bindings).

## Context — verified, not assumed

There is **no runtime event-name translation today**. Confirmed by tracing the code:

- **`emit` / channel `from event` / machine `when event`** are **verbatim**. A
  channel matches on `event.type !== fromEvent` (`loader.ts:741`); a machine
  trigger is `eventId: t.trigger.event` (`loader.ts:1563`). The Chord string is
  compared directly against the runtime event type. So `emit media.sound.play`
  works only because the author literally wrote the platform id.
- **`if.action.*`** is **string concatenation** (`if.action.${gerund}`,
  `loader.ts:1557`) — a prefix convention, not a lookup.
- **`event-contract.ts`** is a **compile-time drift guard** (AC-9), not a runtime
  map: nothing consumes `EVENT_TRIGGERS`/`REGION_EVENT_TRIGGERS`; the type-only
  stdlib import exists to fail the build if stdlib renames an event payload field.

So to make Chord dotless without touching the platform, the loader must translate
a Chord event id into the platform's (unchanged) dotted id at the event seam.
That translation is what this ADR creates.

## Decision

### D1 — The translation lives in `@sharpee/story-loader`, not `@sharpee/chord`

Chord stays platform-free — it never names a dotted platform id. `story-loader`,
which already owns the Chord-IR → platform bindings, gains a Chord-event-id →
platform-event-id map. This is the same layering as the rest of the seam
(`catalog.ts` "names only"; loader holds `if.action.*`, channel wiring, etc.).

### D2 — A Chord-id → platform-id map, applied at the three event seams

`story-loader` gains a translation map and applies it where Chord event ids reach
the runtime:
- **`emit`** — the emitted runtime event `type` is the translated id. *Seam
  location TBD at implementation*: the `emit` executor was not located during
  drafting (channel/machine seams are verified at `loader.ts:741`/`1563`; the
  emit lowering is not), so implementation must find and pin it — all three
  seams must translate consistently or emit/subscribe won't match.
- **channel `from event`** binding (`loader.ts:741`) — matches on the translated id.
- **machine `when event`** trigger (`loader.ts:1563`) — fires on the translated id.

A platform event carries a map entry; the platform id it maps to is **unchanged**
(still dotted). The initial entries are the `media.*` set:

| Chord id (dotless) | → platform id (unchanged) |
|---|---|
| `media-sound-play` | `media.sound.play` |
| `media-image-show` | `media.image.show` |
| `media-image-hide` | `media.image.hide` |
| `media-image-preload` | `media.image.preload` |
| `media-music-play` | `media.music.play` |
| `media-music-stop` | `media.music.stop` |
| `media-ambient-play` | `media.ambient.play` |
| `media-ambient-stop` | `media.ambient.stop` |
| `media-animation-play` | `media.animation.play` |
| `media-animate` | `media.animate` |
| `media-transition` | `media.transition` |
| `media-layout-configure` | `media.layout.configure` |
| `media-clear` | `media.clear` |

(Full `media.*` registry from `stdlib/src/channels/media.ts`; only
`media-sound-play` / `media-image-show` are used by Chord today.)

### D3 — Story-internal author events need no entry

A story's own events (`gatehouse-watch-report`, `estate-clock`, `chord-compass-updated`,
`chord-debug-whereabouts`) are emitted *and* consumed within Chord; the runtime
event type is just the kebab string, matched verbatim on both sides. They are
**not** in the map — only Chord↔platform events (the `media.*` set, and any
`if.event.*` an author subscribes to) translate.

### D4 — `allowDotted` removed; the ban is uniform

With the translation in place, Phase 1's `readLabelKey(…, { allowDotted: true })`
is dropped from the three event-type sites; every Chord label/key site rejects a
dot (`parse.dotted-key`). ADR-254's ban holds with no exceptions.

## Acceptance

**Worked example.** A story plays a sound; the Chord surface is dotless, the
platform is not:

```story
  on entering it
    emit media-sound-play with src "chime.ogg" and bus "sfx"
  end on
```

The Chord IR carries `media-sound-play`; the story-loader map translates it to
`media.sound.play` at the emit seam; `stdlib/channels/media.ts` (unchanged)
consumes `media.sound.play` and the sound plays. `from event media-sound-play`
in a channel resolves through the same map and matches.

**Done when:**
- The story-loader translation turns a dotless Chord event id into the platform
  id at all three seams (`emit`, channel `from event`, machine `when event`); a
  platform event resolves to its unchanged dotted id, an author event passes
  through as its kebab string (no entry).
- The `media.*` map (D2 table) is present and **pinned by a conformance test**
  against the live `stdlib/channels/media.ts` registry — a platform-media rename
  fails the build.
- `allowDotted` is removed from the three event-type parser sites; a dotted event
  id raises `parse.dotted-key` (ADR-254 uniform).
- `.story` sources + chord fixtures are dotless (`media.*` → kebab id, author
  events → kebab); the chord tests asserting the dotted IR form (`emit-payload`,
  `channel-capability`, `dynamic-channels`, `state-machine`) assert the dotless id.
- chord, story-loader, fernhill, and friendly-zoo suites green.

## Consequences

- **Chord is fully dotless** (ADR-254 complete) while the **platform is
  untouched** — no rename in `stdlib`/`platform-browser`/`engine`.
- **A new translation map in story-loader**, pinned against the live `media.ts`
  registry (a conformance test, in the spirit of `event-contract.ts`'s drift
  guard) so a platform-media rename fails the build.
- **Migration** (Chord side only): the `media.*` fixtures use the dotless Chord
  id; author-event fixtures kebab; the chord tests asserting the dotted IR form
  update to the dotless id.

## Session

Session 818d28 (2026-07-22, branch main). Surfaced during ADR-254 Phase 1. I
mis-framed this repeatedly (a curated ACL; a mechanical dot-swap; a platform
rename; "event-contract.ts already translates") before verifying the actual
pipeline: there is no event-name translation today, and event-contract.ts is a
build-time drift guard. David set the intent — add a Chord-id → platform-id
translation in story-loader. Grounded against `loader.ts` (741/1557/1563),
`event-contract.ts`, and `stdlib/src/channels/media.ts`.
