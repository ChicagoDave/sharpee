# ADR-253: Channel `return` and render-by-DOM-name convention

## Status: ACCEPTED (2026-07-22, session 74219a — design ruled by David directly. Pivot from the original "declarative renderers in Chord" stub: there is NO render construct. A channel `return`s any construct (a field, a text template, or a phrase); its value renders into a DOM element named for the channel, and an author customizes placement via a theme/layout package (ADR-188, extended from CSS-only to DOM-contributing) — no Chord render syntax, no TypeScript. `take` + `from event` collapse into one `return <construct> from <event>` line; `take` is removed. All prior open questions dissolved by the pivot. adr-review same session: found a seam (D3 leaned on an unspecified ADR-252 template capability); resolved by David to the theme/plugin placement path, and the D2 non-string rendering contract clarified — both folded before this flip. No Open Questions remain. Not implemented.)

## Date: 2026-07-22

## Parent: ADR-252 (`.story` as a first-class browser build input — retires its D4 hand-written-entry escape hatch). Extends ADR-188 (themes-as-plugins — custom placement is a theme/layout package contributing a named element the layout adopts; grows themes from CSS-only to DOM-contributing). Amends/supersedes the channel syntax of ADR-241 / ADR-216 (`take <field>` + `from event <key>` → `return <construct> from <event>`; `take` removed). Follows ADR-254 (single-token labels — channel/event labels are kebab, no dots). Honors ADR-210 (interpreter-primary, IR-centric) and ADR-250 (phrases — a valid `return` construct).

## Context

ADR-252 makes a bare `.story` a complete browser build input, generating the
`browser-entry.ts` from a template. One thing still forced authors to hand-write
TypeScript: **custom placement and formatting of a channel's value**. The
canonical example is fernhill's `clock` channel — the case clock's `estate-clock`
event emits `{ hour }`, and a hand-written renderer (`browser-entry.ts`, ~20
lines) paints `The clock: <hour>` into the status bar:

```ts
client.getChannelRenderer().registerRenderer('clock', {
  onValue(value) { /* reads { hour }, finds/creates #estate-clock, sets text */ },
});
```

Two things about the existing model made this necessary — and both are
addressable without a render language:

1. **The channel declares its data, not its text.** `define channel clock, from
   event estate-clock, take hour` (ADR-241) projects the raw `hour` field. To
   show `The clock: evening` rather than a bare `evening`, an author needed code
   to format it.
2. **Custom placement meant creating DOM.** The generic panel
   (`channels/panel.ts`, ADR-241 D4) *creates* a labelled box in the sidebar
   (`id="channel-panel-clock"`, `data-channel="clock"`). To place the value
   elsewhere (the status bar), an author needed code to find/create their own
   element.

Neither needs a Chord "renderer." Formatting is something the channel can
already carry if it `return`s formatted text; placement is something the
author's own HTML template can express by naming an element. This ADR closes the
gap with those two moves — completing the parity end state: **TypeScript-free
Chord browser games.**

## Decision

### D1 — A channel `return`s any construct; `return … from` replaces `take` + `from event`

`define channel` gains a `return <construct> from <event>` clause that replaces
both `take <field>` and `from event <key>`. `take` is removed from the channel
grammar. The `<construct>` is one of:

- **a field** — `return hour from estate-clock` (the channel carries the raw
  `hour` value, as `take hour` did);
- **a text template** — `return "The clock: (hour)" from estate-clock` (the
  channel carries already-formatted text; `(hour)` is a slot, the same slot
  spelling phrases use);
- **a phrase** — `return phrase clock-line from estate-clock` (the channel
  carries the phrase's rendered text; ADR-250, locale-aware).

```
define channel clock
  return "The clock: (hour)" from estate-clock
end channel
```

The channel's value is whatever it returns — a raw field for a consumer that
formats downstream, or finished text for direct display. This supersedes the
ADR-241 / ADR-216 `take`/`from event` channel syntax.

### D2 — A channel's value renders into a DOM element named for the channel

The client renderer **looks up an element named for the channel id** — `id` or
`data-channel` equal to the channel name (`clock`) — and renders the returned
value into it. This flips `panel.ts` from *create-in-sidebar* to
*lookup-then-fallback*: if a named element exists, the value lands there; if not,
the generic panel (D4) is created as today. `panel.ts` already stamps
`id="channel-panel-clock"` / `data-channel="clock"` on its box, so the naming
convention is the same idiom, now honored on author-provided elements too.

**Rendering contract.** A named element receives the returned value as **text**
(`textContent`) — a returned field is stringified, a returned text template or
phrase is already text. A structured/object return with no text template has no
sensible single-element rendering; it falls back to the generic panel's
key/value rows (D4). So a bespoke element is for text returns; raw structured
data uses the panel.

### D3 — Custom placement is a theme/layout plugin package (ADR-188); this ADR owns the naming convention

Placement rides the **rebuilt theme/plugin system** (ADR-188). An author who
wants a channel's value in a specific spot uses a theme/layout **package** that
contributes a named element (`<span id="clock"></span>` in the status bar),
which `mountDefaultLayout` adopts (`layout.ts:17` — the helper adopts existing
elements the host page provides). This **extends the theme system from CSS-only
to DOM-contributing**: a theme package may now supply named elements, not just
`[data-theme]` token blocks. No Chord render syntax and no story TypeScript.
ADR-188's plugin system owns *how* an element is contributed; **this ADR owns
the channel-id ↔ element-name convention** (D2) that makes the contributed
element receive the value. A `.story`-only project with no such package keeps
the default slots + generic panel (D4).

The story names its template/layout package in the `.story` via ADR-252's
`template:` header field (the Chord-native, package.json-free declaration), and
the build **validates** the declared template against this ADR's channels — it
errors when the template requires a channel the story lacks and warns when a
story channel goes unplaced (ADR-252 D3, template validation). So a
template/story mismatch is caught at build time, not discovered as a blank at
play time.

### D4 — The generic sidebar panel remains the fallback; gating is unchanged

A channel whose value has no named element to land in still renders as the
ADR-241 D4 labelled box in the sidebar — visibility with zero author effort is
preserved. Degradation is the existing behavior: an absent named element falls
back to the panel; `gated by <capability>` still gates whether the channel
renders on a given client at all. No new degradation mechanism.

## Acceptance

**Worked example.** fernhill's clock, TypeScript-free:

```
# in fernhill.story
define channel clock
  return "The clock: (hour)" from estate-clock
end channel
```
```html
<!-- contributed by fernhill's theme/layout package (ADR-188), status bar -->
<span id="clock"></span>
```

→ each time `estate-clock` emits, `The clock: <hour>` renders into the status
bar's `#clock` (adopted by `mountDefaultLayout`). fernhill's
`src/browser-entry.ts` clock renderer is **deleted**; its browser build needs no
hand-written entry (ADR-252 D4 escape hatch retires).

**Rejection / edge cases** (each a test):
- **No named element** — a channel with a value but no `#<channel>` element in
  the template renders as the generic sidebar panel (D4), not an error.
- **`return` of an unknown field** — `return nope from estate-clock` where the
  event carries no `nope` is a compile-time analyzer error.
- **Malformed `return`** — a `return` line missing `from <event>` is a parse
  error; `take` is no longer accepted (its removal is a parse error with a
  message pointing at `return`).

**Done when:**
- `define channel … return <field|template|phrase> from <event>` parses; `take`
  is removed.
- A channel's returned value renders into an author-named element when present,
  and into the generic panel otherwise.
- fernhill's clock renders `The clock: <hour>` in the status bar with **no
  story TypeScript**; its `browser-entry.ts` renderer is gone.
- ADR-252 D4's hand-written-entry escape hatch is retired for the renderer case.

## Consequences

- **ADR-252 D4's escape hatch retires.** The only reason to hand-write
  `browser-entry.ts` was story-specific renderers; with `return` + the DOM-name
  convention, a pure-`.story` project needs no TypeScript at all.
- **The channel language loses `take` and gains `return`.** One clause
  (`return <construct> from <event>`) replaces two; the channel can now carry
  formatted text or a phrase, not just a raw field. Supersedes the ADR-241 /
  ADR-216 channel syntax.
- **Phrases reach the channel layer** (ADR-250) — a channel can `return` a
  phrase, so channel text is locale-aware and shares the phrase system; no
  parallel templating language is introduced (the inline `"…(slot)…"` form
  reuses the phrase slot spelling).
- **Placement is a theme/layout package, not language.** Authors express *where*
  a value goes by contributing a named element through the theme/plugin system
  (ADR-188), which the layout adopts — keeping the IR runtime-free (ADR-210), no
  DOM ids or platform types in Chord. This extends themes from CSS-only to
  DOM-contributing (a small ADR-188 capability growth).
- **`panel.ts` flips to lookup-then-fallback** (D2); the generic panel stays as
  the zero-effort default (D4), so nothing regresses for channels the author
  does not place.
- **Migration is one channel.** fernhill's `clock` is the only `define channel`
  in the repo; its `take hour`/`from event` line becomes `return … from
  estate-clock`, and its `browser-entry.ts` renderer is deleted.

## Session

Session 74219a (2026-07-22, branch chord-foundations). Designed directly with
David, pivoting from the original stub when he ruled that a render construct is
unnecessary (placement via a DOM element named for the channel), that `take`
reads wrong (`return <construct> from <event>`), and that `return` accepts any
construct including a text template or a phrase. Grounded against
`packages/platform-browser/src/channels/panel.ts` (the create-in-sidebar box and
its `data-channel` id), `packages/chord/src/parser.ts:2582-2588` (`from
event`/`take`), and all `.story` sources (fernhill is the sole `define channel`
user). 253 owns the channel-id ↔ element-name convention; ADR-252 owns the
author-supplied template.
