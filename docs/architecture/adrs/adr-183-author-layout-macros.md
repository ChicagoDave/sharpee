# ADR-183: Author layout macros (parameterized & block decorations)

## Status: PROPOSED

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

Authors need **layout macros** in any text — newline, indent, center (including *center at a
percentage of width*) — for letters, signs, programs, title screens, and the like. Today none
exist: a literal `\n` is the only formatting that survives, and it does so by accident. Two of
the three asks fit ADR-174 as discrete classes; **center-at-a-%** does not — an arbitrary
numeric width cannot be a fixed class. Supporting it reopens rule 1, so this is recorded as its
own ADR rather than a vocabulary patch.

Related: ADR-091 (text decorations), ADR-133 (structured text blocks), ADR-163 (channel
service), ADR-174 (decoration & prose pipeline). The channel model already holds that the wire
is data-only and the client (author-customizable) decides rendering — relevant to how a width
value should travel.

## Decision

Adopt **parameterized, block-aware decorations** (Option B) with **explicit-only line breaks**.
All additions are backward compatible with `[name:content]`; the whitespace rule is the one
behavior change (see Consequences).

### 0. Newlines are explicit; source whitespace is not significant

The **only** way to produce a line break is the `[br]` macro. Source whitespace — spaces, tabs,
and literal `\n` — is collapsed HTML-style: any run of whitespace becomes a single space, and
leading/trailing whitespace is trimmed per block. A literal `\n` therefore renders as a space,
never a break.

This means authors may wrap source however they like (across array fragments, a long string, or
a multi-line template) with identical output — the class of bug that produced The Alderman's
`.join(' ')` rooms and its mid-sentence letter break simply cannot occur. Line structure (poems,
letters, signs) is expressed with `[br]`, not source formatting.

### 1. Vocabulary entries carry metadata

Platform vocabulary changes from a flat name set to entries declaring `kind` and `param`:

```ts
interface VocabularyEntry {
  name: string;
  display: 'inline' | 'block';      // span vs block container
  void?: boolean;                   // takes no content (e.g. br)
  param?: 'none' | 'number' | 'token'; // accepts an optional value
}
```

New entries:

| Name     | display | void | param    | Meaning                                  |
|----------|---------|------|----------|------------------------------------------|
| `br`     | inline  | yes  | none     | hard line break                          |
| `p`      | block   | yes  | none     | paragraph break (blank-line gap)         |
| `indent` | block   | no   | number?  | indent one level, or N levels            |
| `center` | block   | no   | number?  | center; optional width as a % (e.g. 50)  |
| `right`  | block   | no   | none     | right-align (rounding out the set)       |

Existing inline entries gain `display:'inline', param:'none'`.

### 2. Syntax — two additive forms

- **Optional parameter** in the name segment: `[name=value:content]`. The `=value` is parsed
  only before the first `:`, so content may freely contain `:` and `=`. Examples:
  `[center=50:Notice]`, `[indent=2:…]`, `[center:Notice]` (no param → default).
- **Void macro** (no content, no colon): `[br]`. A `[name]` with no colon resolves to a void
  decoration when `name` is a registered void macro; otherwise it stays literal (ADR-174's
  existing "bracket without `:` is literal" rule, now with a void-macro exception).

Backward compatible: a plain `[name:content]` parses exactly as before; only `\n` semantics change.

### 3. Wire shape — value as data, never as inline style

`IDecoration` gains an optional `value?: string`. Rendering emits the value as a **data
attribute**, not a style — consistent with ADR-174's "no inline styles" and the data-only wire:

```
[center=50:Notice]  →  <div class="sharpee-center" data-sharpee-value="50">Notice</div>
[br]                →  <br class="sharpee-br">
[p]                 →  paragraph break (client maps `.sharpee-p` to a blank-line gap)
```

A poem — centered 60% column, italic, `[br]` per line, `[p]` between stanzas:

```
[center=60:[em:Roses are red,[br]Violets are blue,[p]Sugar is sweet,[br]And so are you.]]
```

Block entries render as block containers (`div`); inline entries stay `span` (unchanged). The
client's platform CSS reads `.sharpee-center` + `data-sharpee-value` to apply width — the
platform ships defaults; authors may override per ADR-174 / the author-customizable client.

### Forgiving rules (extending ADR-174 AC-10..12)

- Unknown name → literal (unchanged).
- A param on a `param:'none'` entry → param ignored, decoration still applies.
- A required-but-missing param → entry's default (e.g. `center` = full width, `indent` = 1).
- A non-numeric value where `param:'number'` is expected → ignored (fall back to default).

## Affected packages / contracts

- **`@sharpee/engine`** (prose-pipeline): `decorations/parser.ts` (parse `=value`, void `/`),
  `decorations/resolver.ts` (validate name + param against the entry), `platform-vocabulary.ts`
  (entries-with-metadata), `decorations/types.ts` (`IDecoration.value`, block flag),
  `assemble.ts`.
- **`@sharpee/channel-service`**: `render-to-string.ts` + `utils/flatten.ts` — emit block
  elements and the `data-sharpee-value` attribute.
- **`@sharpee/text-blocks`**: `types.ts` — `TextContent`/decoration shape gains `value` and the
  inline/block distinction if it surfaces in `ITextBlock`.
- **Platform CSS** (platform-browser): `.sharpee-br/indent/center/right` rules, with
  `.sharpee-center[data-sharpee-value]` width handling.
- **`@sharpee/sharpee`**: re-export any new public types.
- **lang-en-us / stories**: no code change; message + story text *may* use the new macros
  (e.g. The Alderman's letter/program).

## Test requirements

- **End-to-end:** `parseDecorations('[center=50:Notice]')` → a decoration `{name:'center',
  value:'50', display:'block', content:['Notice']}`; render → `<div class="sharpee-center"
  data-sharpee-value="50">Notice</div>`.
- **Void:** `[br]` produces a line-break node; `[p]` a paragraph-break node. A literal `\n` (and
  any whitespace run) collapses to a single space — it does **not** break. `[notamacro]` (no
  colon, unregistered) stays literal.
- **Whitespace:** `'a\n\n  b'` → `'a b'` (collapsed, single space); leading/trailing trimmed.
- **Param boundary:** `[indent=2:x]` → level 2; `[indent:x]` → level 1 (default).
- **Negative:** `[center=oops:x]` (non-numeric) → default width, decoration still applies;
  `[em=5:x]` (param on a no-param entry) → param ignored, `em` still applies; `[center=50 x]`
  (no colon) → literal text (existing forgiving rule).
- **Backward compat:** every existing ADR-174 markup test still passes unchanged.

## Acceptance criteria

- All four new names parse, validate, render to the documented wire output, and have platform
  CSS rules.
- `center` honors an arbitrary integer % via `data-sharpee-value`; no inline `style=` appears on
  the wire.
- Existing inline-decoration behavior and tests are unaffected.
- An author can write the macros in a description, a message, and a `ReadableTrait` text and see
  them render (the Alderman letter/program are natural fixtures).

## Alternatives

- **Option A — class-only presets (stay within ADR-174).** Express width as discrete classes
  (`center`, `center-narrow`, `center-wide`) plus `indent-1/2/3`; no `=value` syntax, no wire
  change. Cheapest and fully consistent with "everything is a class," but no arbitrary %, and
  every future parameterized need (column widths, table spans, rules) re-hits this wall. Void
  `br` still needs the self-closing syntax regardless.
- **Option C — inline styles on the wire.** Emit `style="width:50%"`. Rejected: violates
  ADR-174's no-inline-styles rule and removes the client's control over presentation.

**Why B over A:** a width value is *data*, which is exactly what the channel model says the wire
should carry; A pushes that data into an ever-growing class enum. B reopens ADR-174 rule 1
deliberately and narrowly — *optional* params, value-as-data — without weakening the
no-inline-styles rule.

## Consequences

- **Reopens ADR-174's "no parameterized decorations."** Future parameterized layout (columns,
  tables, rules) now has a sanctioned mechanism (`=value` + `data-sharpee-value`) instead of
  class explosion.
- **First block-level decorations.** The pipeline/`ITextBlock` must distinguish inline vs block;
  nesting a block inside an inline run is invalid and resolved by the forgiving rules.
- **Platform CSS is now part of the decoration contract for params** — a param-bearing name
  without a matching CSS rule renders unstyled. Adding a name still means: vocabulary entry +
  CSS rule (now also: data-attribute handling).
- **One behavior change: whitespace collapses.** Natural newlines (and tab/space runs) become a
  single space; `[br]` is the only break. Existing text that relied on literal `\n` for line
  breaks must convert to `[br]` — notably The Alderman's letter and theatre program (the rooms
  cleanup already conforms, since its descriptions are single-paragraph prose). All other markup
  is unaffected; no stored-format migration.

## Session

Proposed 2026-06-19 (session `ffb3f0`), prompted by AI-scaffolded multi-line text in
`stories/thealderman` and the absence of any author layout-macro definition. No implementation;
awaiting accept/modify (A vs B).
