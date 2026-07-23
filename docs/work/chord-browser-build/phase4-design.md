# Phase 4 (ADR-253) — Implementation Design

> Channel `return`/DOM-name rendering; retire fernhill's hand-written entry.
> Grounded this session (9a9ec9, 2026-07-23). David ruled: design D3 first, no
> code yet. D1/D2 are relatively settled; **D3 (the placement mechanism) is the
> real design decision** and carries the open questions below.

## Grounding (verified against source)

- **fernhill's only channel** (`fernhill.story:840`):
  ```
  define channel clock
    mode replace
    gated by sidebar
    from event estate-clock
    take hour
  end channel
  ```
  emitted by `emit estate-clock with hour "evening" when evening` / `"past midnight" when midnight` (`fernhill.story:776-777`). It is the **sole `define channel` in the repo**.
- **chord parser** `parseDefineChannel` (`parser.ts:2590`): body lines `mode`, `gated by`, `from event <key>` (`readLabelKey`, dotless — ADR-256), `take <field>,…`; unknown line → `parse.channel-body`.
- **AST** `DefineChannel` (`ast.ts:187`): `{ mode, gatedBy, fromEvent, take: string[] }`.
- **IR** `IRDataChannelDef` (`ir.ts`): `{ name, family:'data', mode, gatedBy, fromEvent, take: string[], span }`.
- **analyzer** `buildChannel` (`analyzer.ts:2649`): validates mode ∈ {replace,append,event}, `fromEvent` present, `take` non-empty, `gatedBy` is a capability flag. **Does NOT validate `take` fields against the event's payload** (the "unknown field" check is new — D1).
- **story-loader** `registerChannels` (`loader.ts:722`): each data channel lowers to an `IOChannel` whose `produce(ctx)` finds the turn's last event of `translateEventId(fromEvent)` and returns a **projected object** `{field: data[field]}` (append → `[projected]`).
- **platform-browser** renderer: `createGenericPanelRenderer(slot, channelId)` (`panel.ts`) creates `#channel-panel-<id>` (with `data-channel=<id>`) in the sidebar and renders `rowsFor(value)` (object → key/value rows; primitive → one row). Wired as the **match-all fallback** via `renderer.registerRendererFactory('', id => createGenericPanelRenderer(layout.sidebar, id))` (`channels/index.ts`).
- **layout** `mountDefaultLayout` (`layout.ts:55`) **adopts existing host elements by id** (`ensureChild` reuses `getElementById(id)`), else creates them. The page (`index.html`) has `<div id="status-line"><span id="location-name"><span id="score-turns">`; the build already injects at `<!-- THEME_LINKS -->` / `<!-- THEME_MENU_ITEMS -->` markers.
- **fernhill's hand-written entry** (`src/browser-entry.ts:123`): `registerRenderer('clock', { onValue(value){ reads value.hour, finds/creates #estate-clock in #status-line, sets "The clock: <hour>" } })`. This is the only story TypeScript ADR-253 removes.

## D1 — grammar: `return <construct> from <event>` replaces `take` + `from event`

**AST** (`ast.ts`): `DefineChannel` drops `fromEvent`/`take`, gains:
```ts
type ChannelReturn =
  | { kind: 'field';  field: string }                 // return hour from …
  | { kind: 'text';   template: <text-with-slots> }   // return "The clock: (hour)" from …
  | { kind: 'phrase'; phrase: string }                // return phrase clock-line from …
interface DefineChannel { …, mode, gatedBy, returns: ChannelReturn | null, fromEvent: string | null }
```
(`fromEvent` stays — the return clause's `from <event>` tail fills it; keeping the field name minimizes IR churn.)

**Parser** `parseDefineChannel`:
- New clause `return <construct> from <event>` on one line:
  - `return <word> from <event>` → `{kind:'field'}`.
  - `return "<text>" from <event>` → `{kind:'text'}`, reusing the phrase text/slot reader (the `(slot)` spelling phrases already use — ADR-250).
  - `return phrase <key> from <event>` → `{kind:'phrase'}`.
- The standalone `from event <key>` line is **removed** (the event now rides the return clause).
- A `take` line → `parse.channel-take-removed` error whose message points at `return` (ADR-253 AC).
- A `return` missing `from <event>` → `parse.channel-return` parse error.

**IR** `IRDataChannelDef`: `take: string[]` → `returns: IRChannelReturn` (same discriminated shape). `fromEvent` unchanged.

**analyzer** `buildChannel`: require `returns` present; drop the `take` non-empty check. **Unknown-field check (new, ADR-253 AC):** the analyzer must know the fields an event carries. Collect an **emit-field map** (`event-id → Set<field>`) by scanning every `emit <event> with <field> …` in pass 1; then for a `field` return or a `(slot)` in a `text` return, error (`analysis.channel-return-field`) when the named field is absent from the event's emit-field set. *(Scoping note: this requires the emit-field map — a small pass-1 addition. If it proves entangled, the fallback is to validate only that `returns` is well-formed and defer the field cross-check; flagged as the one analyzer risk.)*

## D2 — render into a DOM element named for the channel

**story-loader** `produce(ctx)` returns the **evaluated construct**, not a projected object:
- `field` → `data[field]` (raw value, usually a string).
- `text` → the template with each `(slot)` replaced by `String(data[slot])` → a finished string.
- `phrase` → the phrase's rendered text (locale-aware). *Seam TBD — locate the loader's phrase-render entry; fernhill uses a `text` return, so `phrase` return can land in the same change or a fast follow.*
- `append` mode → `[value]`; `null`/absent unchanged.

**platform-browser** `createGenericPanelRenderer` → **lookup-then-fallback** (D2):
- `onValue(value)`: resolve a host element named for the channel — `doc.getElementById(channelId)` (fernhill's `<span id="clock">`), excluding the panel's own box.
  - element present **and** value is string/number → `el.textContent = String(value)`; `null` → clear it.
  - value is an object (structured return, no text) → generic panel key/value rows (D4), **regardless** of a named element.
  - no named element, primitive value → generic panel single row (today's behavior).
- The panel box keeps `id="channel-panel-<id>"` (distinct from the host `id="<id>"`), so it never matches itself.

No channel-service dispatch change — the fallback factory still owns unrenamed channels; only what it *does* changes.

## D3 — placement: the author owns a full custom page (David, 2026-07-23)

**Injection is rejected.** An author who wants custom placement owns the *whole*
page, not a fragment spliced into our default at markers. D3 is therefore a
**layout escape hatch**, exactly parallel to Phase 3's `browser-entry.ts`:

- **Default (no custom page)** — the build's default `index.html` + the generated
  entry + the generic-panel fallback. Zero author effort. Most stories.
- **Custom page** — a story-provided, complete `index.html` (its own layout) that
  **replaces** the default. Detected the same way as the entry escape hatch:
  `stories/<story>/browser/index.html` present → the build uses it; absent → the
  default. The author's channel elements (`<span id="clock">`) are just part of
  their page; the D2 renderer finds them by id. No injection, no manifest, no
  region markers — the build swaps the author's page in and validates the contract
  below. (`template:` — a *named, shared* template *package* — stays the later
  general form; the story-local file is the escape hatch, same split as
  browser-entry.)

### The contract (what a custom page must / may honor) — RULED 2026-07-23
- **REQUIRED — the ENTIRE `sharpee-*` theme named-style set** (+ the `[data-theme]`
  wiring). A custom page must honor the whole named-style vocabulary (not a curated
  subset) so the engine CSS + themes apply — the non-negotiable contract the build
  validates.
- **REQUIRED — theme CSS injection.** The build still injects the theme
  stylesheets at the `<!-- THEME_LINKS -->` marker (themes must load). This is
  distinct from the theme *menu* (below) — CSS loads regardless of whether a
  switcher UI exists.
- **OPTIONAL — the menu** (and everything it drives): the menu bar, the
  save/restore/startup **dialogs**, AND the theme-**menu** switcher UI. An author
  may omit all of it for a **standalone themed view**. `BrowserClient` already
  wires these null-tolerantly (optional chaining; `getElementById('menu-title')`
  unasserted); to be confirmed/hardened so omission is genuinely safe.
- **Core play slots** (`text-content`, `command-input`, `location-name`,
  `score-turns`, `main-window`) — wired if present; a normal playable view keeps
  them. The client adopts what exists and skips what does not.

### Build validation (ADR-252 D3, reframed)
- Validate the **full `sharpee-*` named-style contract** is honored. Error if broken.
- Still inject theme CSS at `THEME_LINKS`.
- **Warn** on a story data-channel with no matching `#<channel>` element in the
  custom page (it falls to the generic panel — if the page has a sidebar; a
  bespoke standalone view without one simply doesn't render that channel).
- Do **not** require the menu/dialog/theme-switcher ids.

### No double-render suppression needed (Q4 — RULED)
There is exactly ONE fallback renderer per data channel (the match-all factory).
Under D2 it picks a single destination — the named `#<channel>` element **xor** the
generic panel box — so a placed channel structurally cannot also render in the
panel. The old ADR-241 AC-5 "no double-render" check existed only because
fernhill's *separate* hand-written `registerRenderer('clock')` could coexist with
the fallback panel; deleting that hand-written renderer removes the possibility
entirely. No suppression logic, no test for it.

### fernhill this phase
fernhill ships `stories/fernhill/browser/index.html` — its own page with
`<span id="clock">` in the status bar, honoring the `sharpee-*` theme styles —
and **deletes `src/browser-entry.ts`**. Its channel becomes
`return "The clock: (hour)" from estate-clock`. The clock renders into `#clock`
with zero story TypeScript. **The default `index.html` ships as the documented
copy-and-edit base** for a custom page (David, 2026-07-23).

D3 is fully ruled — no open questions remain.

## fernhill migration
- `fernhill.story` channel → `return "The clock: (hour)" from estate-clock` (drop `take hour` + `from event`); keep `mode replace` + `gated by sidebar`.
- **Delete `stories/fernhill/src/browser-entry.ts`** → the Phase 3 **generated** entry builds it (no story TypeScript). Confirm the generated entry needs no clock-specific wiring.
- D3-min: add `stories/fernhill/browser/layout.html` with `<span id="clock">` in the status region.
- Update `scripts/g3-fernhill-browser-proof.mjs`: the clock now lands in the injected `#clock` (status bar) via zero story TS — assert `#clock` textContent (was `#estate-clock`); drop the AC-5 "no double-render" check's dependence on the hand-written renderer (the named-element path is the render; the panel is the fallback it suppresses).

## Testing
- **chord**: `return` field/text/phrase parse into the IR shape; `take` line → `parse.channel-take-removed` (message names `return`); `return` without `from` → parse error; unknown-field/slot → `analysis.channel-return-field`; golden-IR snapshots re-recorded for the `returns` field.
- **story-loader**: `produce` returns the raw field / the substituted text / the phrase text; append wraps; `null` passes through. Conformance against a fixture channel.
- **platform-browser**: named element present → `textContent` set (string), cleared on null; object value → panel rows even with a named element; no named element → panel (unchanged). A DOM-adoption test that `#clock` receives "The clock: evening".
- **REAL-PATH**: fernhill builds with **no `src/browser-entry.ts`** (generated entry) and the g3 proof shows `#clock` = "The clock: <hour>" in real Chromium with zero story TS; fernhill transcripts stay green.

## Risks / gotchas
- **Analyzer unknown-field check** needs the emit-field map (pass-1). The one genuinely new analyzer capability; the fallback is to defer the cross-check.
- **`phrase` return** needs the loader's phrase-render seam located; fernhill doesn't need it (text return), so it can be a fast-follow if the seam is non-trivial.
- **Value shape change** (object → string) breaks fernhill's hand-written renderer — it MUST be deleted in the same change (already planned).
- **g3 proof + any transcript** asserting the old `#estate-clock`/`{hour}` object shape must move to `#clock`/text.
- **IR churn**: `take → returns` changes every channel golden snapshot in chord (only fernhill + chord fixtures use `define channel`).

## Suggested implementation order (once D3 is ruled)
1. chord D1 (AST/parser/IR/analyzer) + tests + snapshots — the `.story` grammar, `take` removed.
2. story-loader `produce` → evaluated construct + tests.
3. platform-browser lookup-then-fallback renderer + tests.
4. D3 injection (min or pkg per the ruling) in `browser-core` + region markers + ADR-252-D3 validation, un-stubbed.
5. fernhill: channel → `return`, delete `browser-entry.ts`, add the layout partial; g3 proof + transcripts.
6. Full regression: chord, story-loader, platform-browser, devkit/repokit, fernhill (transcripts + real browser build).
