# ADR-190: Natural-language list rendering in the language layer

## Status: ACCEPTED (2026-06-24)

## Date: 2026-06-24

## Context

The whole point of Sharpee's ID → language separation is that a story emits a
message **ID** plus data, and the language layer renders grammatical English. The
single hardest, most visible test of that promise is **list rendering**: hand one
message ID an array of entities and get back a sentence an author would write by
hand. "You can see a goat, a rabbit, and a parrot here." Group identical things:
"two goats and a parrot." This is the bar Inform 7 set with `[a list of things in
the location]`, and it is the first thing an experienced IF author checks. If
`{list:items}` can't produce that, the separation reads as a toy.

Today it can't. The current formatters can't compose per-element articles with an
Oxford-and join, because formatters chain by each transforming the **whole** value
left to right:

- `listFormatter` joins **names only** (via `getName`) with commas and a final "and",
  so `{list:items}` renders "goat, rabbit, and parrot" — no articles.
- `aFormatter`/`theFormatter` map over an array but join with **commas, no "and"**
  ("a goat, a rabbit, a parrot").
- So "apply `a` to each, then `list` to join" is impossible: `a` already collapses
  the array to a comma string, and `list` can't re-article a joined string. The book's
  `{a:items:list}` → "a goat, a rabbit, and a parrot" example is unachievable, in any
  order.
- `countFormatter` hardcodes the noun for count > 1 ("3 items", GH #166).
- Placeholder syntax is documented backwards (`{items:list}` where `{list:items}` is
  required, GH #167).

The metadata needed already exists. `EntityInfo` (what formatters receive) carries
`name`, `article` (`a`/`an`/`the`/`some`/empty), `properName`, `nounType`
(`common`/`proper`/`mass`/`unique`/`plural`), and `grammaticalNumber`; `IdentityTrait`
is the source of those; and `language-provider.ts` already exposes a `pluralize(noun)`
helper. What's missing is a renderer that uses them.

## Decision

Make the **`list` formatter a natural-language list renderer** over an array of
`EntityInfo`, instead of a name-only joiner. It owns articles, count-grouping, and the
conjunction join, because those cannot be composed from separate chained formatters.

### Grammar contract

Given an array of entities, `{list:items}` renders, by default, an **indefinite**
list:

| Input | Output |
|---|---|
| `[]` | `nothing` |
| `[goat]` | `a goat` |
| `[apple]` | `an apple` (article chosen by the entity's `article`/initial sound) |
| `[goat, parrot]` | `a goat and a parrot` (two items: no comma) |
| `[goat, rabbit, parrot]` | `a goat, a rabbit, and a parrot` (3+: Oxford comma) |
| `[goat, goat, parrot]` | `two goats and a parrot` (identical items grouped + pluralized) |
| `[Alice, Bob]` | `Alice and Bob` (proper names take no article) |
| `[sand(mass), lamp, coin, coin]` | `some sand, a lamp, and two coins` |

Rules:

1. **Article per element** from `EntityInfo`: indefinite `a`/`an` for common nouns
   (vowel-sound aware), `some` for mass nouns, none for proper/unique names. A
   **definite** variant, `{the-list:items}`, renders "the goat, the rabbit, and the
   parrot".
2. **Grouping by rendered name**: identical entities (same rendered name) collapse to
   a count + pluralized noun ("two goats"); the count is **spelled out for 2–10,
   numeric for 11+**. Proper names and mass nouns never count-group.
3. **Pluralization**: the grouped noun uses the entity's optional
   `IdentityTrait.plural` override when set, else the `pluralize()` heuristic (regular
   `+s`/`+es`).
4. **Join**: commas between elements, "and" before the last. The **serial (Oxford)
   comma is author-configurable** via a story setting, **default on** (so 3+ →
   "a, b, and c"; off → "a, b and c"). Empty list → "nothing".
5. **Order**: placeholder is the last colon segment (the existing `parsePlaceholder`
   rule). The working forms are `{list:items}` and `{the-list:items}`; this corrects
   the backwards `{items:list}` examples (GH #167).

### Data contract (input) — ADR-158

Producers pass an array of **`EntityInfo`** (via `entityInfoFrom(entity)`, ADR-158),
**not** names. Bare name strings strip the `article`/`nounType`/`properName` the
renderer needs, so today's `looking`/`going`/`switching_on` (which pass
`items.map(e => e.name)`) are an ADR-158 violation and must change to pass
`EntityInfo[]`. The `list` formatter consumes `EntityInfo[]` directly; no context
lookup is required. The producer change, the formatter change, and the
`IdentityTrait.plural` field land **together** — a partial change renders bare names
or breaks.

### What this absorbs

- **GH #167** stops being "patch a broken example" and becomes "document the real,
  working `{list:items}`."
- **GH #166 is fixed here** (not deferred): the `count` formatter's broken `> 1` branch
  is corrected to render the real noun via the shared pluralization helper, and `list`
  count-grouping reuses that helper. `{count:coins}` with three → "three coins".
- The chain model is **not** extended to compose per-element formatters; `list` does
  the per-element work internally. `aFormatter`/`theFormatter` keep their current
  single-value/array behavior for non-list uses.

### Layer placement

All of this is English grammar and lives in `@sharpee/lang-en-us`
(`src/formatters/list.ts` + `pluralize`). No prose or English leaks into engine,
stdlib, or world-model; stdlib actions keep passing **entity arrays** (not pre-joined
strings) under a placeholder, exactly as `looking`, `going`, and `switching_on`
already do.

## Consequences

- **Existing standard-action messages change — code and output.** `looking`, `going`,
  `switching_on` (and any list producer) change from passing `e.name` to passing
  `entityInfoFrom(e)` arrays, and now render with articles and grouping ("you can see a
  lamp, a sword, and two coins" instead of "lamp, sword, and coins"). This is the
  desired improvement and an ADR-158 correction, but it is a behavior change: their
  golden tests and any walkthroughs asserting the old name-only output must be updated.
- **A name-only joiner may still be wanted** (e.g. lists of proper IDs or non-entity
  strings). Provide `{names:items}` (or keep the old behavior under a new name) so the
  articled `list` is not the only option.
- **Pluralization: heuristic + override.** Default rendering uses the `pluralize()`
  heuristic (regular `+s`/`+es`); an **optional `plural` field on `IdentityTrait`**
  (a world-model change) overrides it for irregulars (goose→geese) or special forms.
- **The serial-comma setting is new story configuration** — a small, save-irrelevant
  story-level flag (default on) the language layer reads at render time.
- **Docs and the book become accurate showcases.** The Formatter Chain chapter's list
  example renders the real thing; `genai-api` regenerates from the corrected source.
- **No save/wire impact** — this is text rendering only.
- No backward-compatibility shim: output strings change by design; tests are updated in
  the same change.

## Acceptance Criteria

- **AC-1** Empty array → `"nothing"`.
- **AC-2** One common noun → `"a goat"`; vowel-sound → `"an apple"`.
- **AC-3** Two items → `"a goat and a parrot"` (no serial comma for two).
- **AC-4** Three items → `"a goat, a rabbit, and a parrot"` (Oxford comma on).
- **AC-5** Repeated items group + pluralize → `[goat, goat, parrot]` = `"two goats and a parrot"`.
- **AC-6** Proper names take no article → `[Alice, Bob]` = `"Alice and Bob"`.
- **AC-7** Mass noun uses `some` → includes `"some sand"`; mixed example
  `"some sand, a lamp, and two coins"`.
- **AC-8** Definite variant `{the-list:items}` → `"the goat, the rabbit, and the parrot"`.
- **AC-9** Showcase end-to-end: a room-contents message ID rendered through the real
  pipeline yields `"You can see a goat, a rabbit, and a parrot here."`
- **AC-10** Placeholder order: `{list:items}` works; the backwards `{items:list}` forms
  are gone from source and book (GH #167).
- **AC-11** Serial-comma setting on (default) → "a goat, a rabbit, and a parrot"; off →
  "a goat, a rabbit and a parrot".
- **AC-12** Count threshold: ten identical items → "ten goats"; eleven → "11 goats".
- **AC-13** Plural override: an entity with `IdentityTrait.plural = "geese"`, ×2 →
  "two geese" (override beats the heuristic's "gooses").
- **AC-14** Standalone `count` formatter renders the real pluralized noun
  (`{count:coins}` with three → "three coins"), closing GH #166.

## Resolved decisions (2026-06-24, David)

- **Data contract**: producers pass `EntityInfo[]` via `entityInfoFrom` (ADR-158); the
  list formatter consumes it directly. Closes the review's contract gap.
- **Serial (Oxford) comma**: author-configurable story setting, default on.
- **Count threshold**: spell out 2–10, numeric for 11+.
- **`count` formatter**: fixed (closes GH #166); shares the pluralization helper with
  list grouping.
- **Pluralization**: `pluralize()` heuristic by default, optional `IdentityTrait.plural`
  override for irregulars.
- **Grouping key**: by rendered name.

## Notes

Raised while fixing the formatter-docs issue (#167) during the book copy-edit pass.
David flagged that list rendering is the core proof of ID → language for an experienced
IF author (the Inform 7 `[a list of things]` bar). The doc-only Phase 2 of the
ADR-189 plan is paused in favor of this; #166 and #167 fold into the work here.
