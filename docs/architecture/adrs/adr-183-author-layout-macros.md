# ADR-183: Author layout macros (parameterized decorations)

## Status: ACCEPTED

## Date: 2026-06-19

## Context

Authors can decorate any prose with inline markup (**ADR-174**): `[name:content]` →
`sharpee-{name}` CSS class, parsed by the engine prose-pipeline, emitted as data on the wire.
The closed platform vocabulary is **inline character styling only** (`em`, `strong`, `color-*`,
`size-*`, …). Two ADR-174 rules bound it:

1. **"Everything is a class"** — *no parameterized decorations*. Parameterized concerns are
   expressed as discrete classes (`color-red`, not `color:#f00`).
2. **No inline styles on the wire** — mirrors HTML+CSS; the wire carries semantics, the client
   maps them to presentation.

Authors need **layout macros** in any text — line break, paragraph gap, indent, center
(including *center at a percentage of width*) — for letters, signs, programs, title screens, and
the like. Today none exist: a literal `\n` is the only formatting that survives, and it does so
by accident. Centering-at-a-% can't be a fixed class (the width is arbitrary), which reopens
rule 1, so this is its own ADR rather than a vocabulary patch.

Related: ADR-091 (text decorations), ADR-133 (structured text blocks), ADR-163 (channel
service), ADR-174 (decoration & prose pipeline). The channel model already holds the wire is
data-only and the client (author-customizable) decides rendering.

## Decision

Adopt **parameterized decorations with class-driven rendering and explicit-only line breaks**.
Backward compatible with `[name:content]`; the whitespace rule is the one behavior change.

### 0. Newlines are explicit; source whitespace is not significant

The intended canonical model: the **only** way to produce a line break is the `[br]` macro;
source whitespace — spaces, tabs, literal `\n` — collapses HTML-style (any run becomes a single
space, leading/trailing trimmed). Authors wrap source however they like with identical output —
the class of bug behind The Alderman's `.join(' ')` rooms cannot occur. Line structure is `[br]`
/ `[p]`, not source formatting.

> **STATUS (revised 2026-06-19): the explicit macros (`[br]`/`[p]`) are implemented and additive;
> the *global whitespace-collapse* is DEFERRED — see "Whitespace-collapse rollout" below.** A
> Dungeo audit found ~27,000 multi-space runs plus many `\n`-formatted banners/signs/tables;
> flipping collapse globally today would wreck the reference story. Until the rollout completes,
> source `\n`/spaces still pass through unchanged (backward compatible) and `[br]`/`[p]` are the
> additive explicit breaks.

### 1. Vocabulary — flat names + a void subset

No per-name metadata. The platform vocabulary stays a flat set of names (the resolver prefixes
them with `sharpee-`); a small **void subset** lists the names that take no content:

```ts
PLATFORM_VOCABULARY  // existing set + new names: br, p, indent, center, right
VOID_MACROS = new Set(['br', 'p'])   // parser: [name] with no colon is valid void iff in here
```

| New name | void | typical CSS role (platform default, author-overridable) |
|----------|------|---------------------------------------------------------|
| `br`     | yes  | `display:block` on empty span → a line break            |
| `p`      | yes  | `display:block; height:1em` → a blank-line gap          |
| `indent` | no   | `display:block; margin-left:…` (`data-value` = levels)  |
| `center` | no   | `display:block; text-align:center; margin:0 auto` (`data-value` = width %) |
| `right`  | no   | `display:block; text-align:right`                       |

**`display`/inline-vs-block is not on the wire and not in the engine — it lives in the
stylesheet.** This is the key simplification (see §3).

### 2. Syntax — two additive forms

- **Optional parameter** in the name segment: `[name=value:content]`. The `=value` is parsed
  only before the first `:`, so content may freely contain `:` and `=`. Examples:
  `[center=50:Notice]`, `[indent=2:…]`, `[center:Notice]` (no param → default).
- **Void macro** (no content, no colon): `[br]`, `[p]`. A `[name]` with no colon resolves to a
  void decoration when `name ∈ VOID_MACROS`; otherwise it stays literal (ADR-174's existing
  "bracket without `:` is literal" rule, now with the void exception).

A plain `[name:content]` parses exactly as before; only `\n` semantics change.

### 3. Wire + render — one neutral element, presentation in CSS

`IDecoration` gains a single optional field, `value?: string`. The wire shape stays
`{ className, content, value? }` — **no `display` or `void` field.** The renderer emits the
**same element for every decoration** — a `<span>` carrying the class and (if present)
`data-value`, with void macros simply having empty content:

```
[em:Zork]          →  <span class="sharpee-em">Zork</span>
[center=50:Notice] →  <span class="sharpee-center" data-value="50">Notice</span>
[br]               →  <span class="sharpee-br"></span>
[p]                →  <span class="sharpee-p"></span>
```

Block-ness, line breaks, gaps, indent, and width are **entirely CSS**, in the platform
stylesheet — which the author overrides *en masse* (ship their own `.sharpee-*` rules):

```css
.sharpee-em     { font-style: italic; }                 /* stays inline (span default) */
.sharpee-center { display: block; text-align: center; margin: 0 auto; }
.sharpee-center[data-value] { width: attr(data-value '%'); }  /* or equivalent */
.sharpee-br     { display: block; }                     /* empty block = line break */
.sharpee-p      { display: block; height: 1em; }        /* blank-line gap */
```

So the renderer never decides span-vs-div-vs-br — `display:block` on an empty span *is* a line
break. `render-to-string` needs **no** access to the (engine-internal) vocabulary; it just emits
`<span class=… [data-value=…]>…</span>` and recurses. `data-value` is generic (no `sharpee-`
prefix) so it works for platform and author classes alike.

The poem, end to end:

```
[center=60:[em:Roses are red,[br]Violets are blue,[p]Sugar is sweet,[br]And so are you.]]
  →  <span class="sharpee-center" data-value="60"><span class="sharpee-em">Roses are red,<span
     class="sharpee-br"></span>Violets are blue,<span class="sharpee-p"></span>Sugar is
     sweet,<span class="sharpee-br"></span>And so are you.</span></span>
```

**Non-web clients** (terminal) have no CSS; each client maps `class → behavior` in its own layer
(`sharpee-br` → emit `\n`, `sharpee-center` → center the run). That is already the channel model:
the wire carries the class, the client decides rendering. "CSS" generalizes to "the client's
class→presentation layer."

### 4. Author-defined names

`resolveClassName` already passes any non-platform name through verbatim as a class. That
composes cleanly with §3:

- **Author param:** `[mybox=3:x]` → `<span class="mybox" data-value="3">x</span>`. Same generic
  `data-value`; the author's own CSS reads it.
- **Author block:** authors get block layout for free — `[mybanner:x]` → `<span class="mybanner">`
  plus the author's `.mybanner { display:block }`. Block is not platform-only.
- **Author void:** **not supported.** Void macros are platform-only (`VOID_MACROS`); `[mybreak]`
  (no colon, not a platform void name) stays literal, as today. Authors who want a break use
  `[br]`/`[p]`.

### Forgiving rules (extending ADR-174 AC-10..12)

- Unknown name → literal (unchanged).
- `[name]` (no colon): void decoration iff `name ∈ VOID_MACROS`, else literal.
- `[name=value:…]` where the name has no CSS use for a value → `data-value` still emitted, CSS
  ignores it. No engine-side validation or coercion; value is an opaque string.

## Affected packages / contracts

- **`@sharpee/engine`** (prose-pipeline): `decorations/parser.ts` (parse optional `=value`;
  treat `[name]` as void iff in `VOID_MACROS`; collapse whitespace), `platform-vocabulary.ts`
  (add `br/p/indent/center/right`; export `VOID_MACROS`), `decorations/resolver.ts` (unchanged
  prefix logic), `assemble.ts` (whitespace collapse).
- **`@sharpee/text-blocks`**: `types.ts` — `IDecoration` gains `value?: string`. No `display`/void
  field.
- **`@sharpee/channel-service`**: `render-to-string.ts` — emit `<span class …>` uniformly + a
  `data-value` attribute when present. Does **not** import the vocabulary; no block/inline logic.
- **Platform CSS** (platform-browser): `.sharpee-br/p/indent/center/right` rules, with
  `.sharpee-center[data-value]` / `.sharpee-indent[data-value]` handling.
- **`@sharpee/sharpee`**: re-export `IDecoration` if its public shape changed.
- **lang-en-us / stories**: no code change; text may use the macros (Alderman letter/program).

## Test requirements

- **End-to-end:** `parseDecorations('[center=50:Notice]')` → `{ className:'sharpee-center',
  value:'50', content:['Notice'] }`; render → `<span class="sharpee-center"
  data-value="50">Notice</span>`.
- **Void:** `[br]`/`[p]` → `<span class="sharpee-br"></span>` / `sharpee-p` (empty content).
  `[notamacro]` (no colon, not void) stays literal.
- **Whitespace (gated on the collapse rollout):** once enabled, `'a\n\n  b'` → `'a b'`;
  leading/trailing trimmed. Not asserted until collapse ships.
- **Param passthrough:** `[indent=2:x]` → `data-value="2"`; `[indent:x]` → no `data-value`.
- **Author names (boundary):** `[mybox=3:x]` → `<span class="mybox" data-value="3">` (verbatim
  class, generic data attr); `[mybreak]` → literal text (void is platform-only).
- **Uniform element:** an inline (`em`) and a block (`center`) both render as `<span>` — the
  element does not differ; only the class (and CSS) does.
- **Backward compat:** every existing ADR-174 markup test passes unchanged.

## Acceptance criteria

- All five new names parse and render to the documented uniform-`<span>` output; `br`/`p`/`indent`
  /`center`/`right` have platform CSS rules.
- `center`/`indent` carry an arbitrary value via `data-value`; **no `style=` and no `display`/void
  field appears on the wire** — block/inline is CSS only.
- `render-to-string` contains no reference to the platform vocabulary and no span-vs-div branch.
- Author names pass through with `data-value`; void remains platform-only.
- Existing inline-decoration behavior and tests are unaffected.
- An author can write the macros in a description, a message, and a `ReadableTrait` text and see
  them render (Alderman letter/program are natural fixtures).

## Alternatives

- **Option A — class-only presets (stay within ADR-174).** Width as discrete classes
  (`center`, `center-narrow`, `center-wide`) + `indent-1/2/3`; no `=value`. Cheapest and fully
  "everything is a class," but no arbitrary %, and every future parameterized need (column
  widths, table spans) re-hits the wall. Void `br`/`p` still need the colon-less syntax anyway.
- **Option C — inline styles on the wire** (`style="width:50%"`). Rejected: violates ADR-174's
  no-inline-styles rule and removes client control over presentation.
- **Superseded draft — `display`/`void` fields on the wire.** An earlier revision put block/inline
  and void markers on `IDecoration` so the renderer could choose `<div>`/`<span>`/`<br>`. Dropped
  in favor of §3's uniform `<span>` + class-driven CSS: simpler wire, dumber renderer, no
  engine-internal vocabulary leak into channel-service, and authors gain block layout for free.

**Why this over A:** a width value is *data* — what the channel model says the wire should
carry — and class-driven CSS keeps the renderer trivial while still honoring no-inline-styles.

## Consequences

- **Reopens ADR-174's "no parameterized decorations,"** narrowly: an *optional* `=value` carried
  as `data-value`. Future parameterized layout (columns, table spans, rules) now has a sanctioned
  mechanism instead of class explosion. The no-inline-styles rule is untouched.
- **Everything renders as `<span>`.** No semantic `<p>`/`<br>`/headings on the wire — but ADR-174
  already chose "no semantic HTML," so this is consistent, not a new regression. Accessibility
  remains a client concern (a client may map classes to semantic elements if it wishes).
- **Presentation is fully in the (overridable) stylesheet.** Adding a name = vocabulary entry +
  a platform CSS rule. Authors restyle *en masse* by shipping `.sharpee-*` overrides — there is
  no per-instance styling (consistent with no-inline-styles); fine-grained control means an
  author class.
- **Whitespace-collapse is the one behavior change — and it is DEFERRED** (see the rollout
  below). When enabled, natural newlines and tab/space runs become a single space and `[br]`/`[p]`
  are the only breaks. Not yet active globally.

## Whitespace-collapse rollout (added 2026-06-19)

A Dungeo audit (session `ffb3f0`) showed global collapse cannot be flipped today: ~27,000
multi-space runs plus many `\n`-formatted death banners, signs, and GDT/score tables. The
content buckets into:

- **banners / indented blocks** (centered via space-padding) → migrate to `[center:…]` /
  `[indent:…]` (semantic, *better* than the space hack);
- **tabular / columnar** (GDT help, score lines) → need a **structure construct** (`[table]` /
  columns) so the *renderer* aligns — not author-counted spaces;
- **pictorial ASCII art / maps** → route through the **media channel** (image/SVG for rich
  clients, text fallback for terminal) — it isn't prose.

Decision: **no `[pre]` / whitespace-significant escape hatch** (an HTML artifact that just
blesses the space-hack). Instead the model stays fully semantic via the table construct + media,
and collapse becomes safe with *no* exception. Sequenced rollout: (1) add the table/columns
construct; (2) route art to media; (3) migrate Dungeo to the canonical forms; (4) enable
collapse globally. Tracked in **GitHub #132**. Until then, `\n`/spaces pass through unchanged.

**Markdown considered and declined.** Markdown overlaps on generic prose (em/strong/code, tables,
breaks) but (a) is whitespace-*significant* — the opposite of this ADR's collapse-by-default
choice; (b) targets the semantic HTML the wire deliberately avoids (ADR-174); (c) has no
vocabulary for IF semantics (`[item]`/`[npc]`/…) or layout (center/color/indent); and (d)
asterisk markup was already removed in favor of brackets (ADR-174). Useful as a *concept
inventory* (it validates tables-as-structure and code/verbatim), not as a syntax to adopt.
Explicit bracket macros remain the canonical path.

## Session

Proposed 2026-06-19 (session `ffb3f0`), prompted by AI-scaffolded multi-line text in
`stories/thealderman`. Iterated through a `/adr-review` that flagged (1) block/inline + value not
represented on the wire and (2) undefined author-name interaction; both resolved by the
uniform-span / class-driven-CSS model in §3–4. Accepted at 12/12 on re-review; implementation
pending.
