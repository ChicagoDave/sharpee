# ADR-198: Phrase Algebra — Numeral Atom

## Status: ACCEPTED

> Accepted 2026-06-27 by David. Continues the ADR-192 phrase-algebra atom roadmap;
> the reserved `Numeral` kind (ADR-192 §2, "→ ADR-198 (minor)") gets fields and
> realization here. Lands on `main` via branch `v2_adr198_numeral`. Sibling of the
> already-realized `Verb` (ADR-199) and `Verbatim` (ADR-200) atoms.

## Date: 2026-06-27

## Terminology

- **Numeral atom** — a `Phrase` kind that renders a bound numeric value as digits,
  spelled-out words, or an ordinal. The Sharpee equivalent of Inform 7's
  `[the number … in words]` / `[N]` number substitutions.

A follow-on **atom** of ADR-192: *additive* — fields on a reserved union member
plus one Assembler case, no core rewrite.

## Context

The phrase algebra already spells small counts inside lists ("two goats") via the
Assembler's `countWord` (1–10). But there is no way for a template to render an
arbitrary number — "You have [the number of coins in words] coins" → "seven coins",
"You are on the [N]th floor" → "the 3rd floor". The reserved `Numeral` kind
(ADR-192 §2/§5 `{number:coins words}`) is the home for this; it was a stub that
threw. This ADR supplies its fields and realization, and a full number-to-words
speller (the existing `countWord` caps at ten).

## Decision

Give the reserved **`Numeral`** kind a `value` + `format`, an Assembler case, and a
`{number:param format?}` parse rule.

### 1. The `Numeral` kind (language-neutral)

```ts
// @sharpee/if-domain — language-neutral; NO spelled-out surface strings
interface Numeral extends PhraseBase {
  kind: 'number';
  value: number;                            // the numeric value to render
  format: 'digits' | 'words' | 'ordinal';   // default 'digits'
}
```

`value` is the language-neutral number; the spelled surface ("seven", "3rd") is the
Assembler's to compute — no English number words live in `if-domain` (parallel to
`NounPhrase.articleType` vs the a/an string, `Verb.lemma` vs is/are).

### 2. Authoring surface

Follows ADR-192 §5: a `kind:` head, the **first** bare token is the producer/param
name, an optional trailing token is the format hint.

| Reference | Meaning |
|-----------|---------|
| `{number:coins}` | `params.coins` as digits → "7" |
| `{number:coins words}` | spelled cardinal → "seven" |
| `{number:floor ordinal}` | ordinal → "3rd" |

Migration / use: a template binds a numeric param and references it via `number:`.
An **unbound** param fails at parse time (ADR-192 AC-11). A bound non-numeric value
is coerced with `Number(...)`; `NaN` renders as the empty string (it is an authoring
error, surfaced by the graceful render-error path, not a crash).

### 3. Realization (the Assembler)

- **digits** → `String(value)` (integer; no locale grouping in this ADR).
- **words** → full cardinal spelling: `numberToWords(value)` — ones/teens/tens,
  hundreds with British-style "and" ("one hundred and five"), thousands/millions,
  negatives ("minus …"). Non-integers fall back to digits.
- **ordinal** → `${value}` + ordinal suffix (`st`/`nd`/`rd`/`th`, with the 11–13
  exception): "1st", "2nd", "3rd", "11th".

`countWord` (1–10 → word, else numeral) stays as the **list-grouping** speller; the
new `numberToWords` is the general one. Both live in `lang-en-us/number-words.ts`.

## Options considered

- **Reuse `countWord` for `words`** — rejected: it caps at ten and falls back to a
  numeral, so "seven coins" works but "twenty-one" would print "21". The atom needs a
  full speller.
- **Spell ordinals as words ("first", "twenty-first")** — deferred: numeric ordinals
  ("3rd") cover the common IF case ("the 3rd floor"); word-ordinals are an additive
  format later if needed.
- **Locale digit grouping ("1,000")** — out of scope; a `LocaleSettings` knob later.

## Scope

**In:** the `Numeral.value`/`format` fields in `@sharpee/if-domain`; the
`{number:param format?}` parse rule; the Assembler numeral case; `numberToWords` +
`ordinalString` in `lang-en-us/number-words.ts`.

**Out:** word-ordinals, digit grouping/locale number formatting, decimals/fractions,
currency. Each additive later.

## Consequences

- Closes the I7 "[number in words]" gap surfaced by the I7↔Sharpee experiment.
- **Boundary held** — no number-word surface strings in `if-domain`; all spelling in
  the `lang-en-us` Assembler.
- **Additive** — one kind's fields + one Assembler case + one parser branch.

## Acceptance Criteria

1. `{number:n}` → digits ("7"); `{number:n words}` → "seven"; `{number:n ordinal}` → "7th".
2. `numberToWords` spells beyond ten: 21 → "twenty-one", 105 → "one hundred and five",
   1000 → "one thousand", 0 → "zero", -4 → "minus four".
3. Ordinal suffix handles the 11–13 exception: 11 → "11th", 12 → "12th", 13 → "13th",
   21 → "21st", 22 → "22nd", 23 → "23rd".
4. An **unbound** `number:` param raises `PhraseParseError` at parse time (AC-11).
5. Boundary: the `Numeral` kind in `if-domain` carries no number-word strings.
6. Determinism (inherits ADR-192 AC-9): identical `(tree, ctx)` → identical output.

## Relationships

- **Follow-on atom of** ADR-192 (supplies the reserved `Numeral` kind). Sibling of
  ADR-199 (`Verb`) and ADR-200 (`Verbatim`).
- **Builds on** ADR-190 (`countWord` list-count spelling, kept for grouping).

## Session

- Produced in session 491b9c (2026-06-27), the next atom after the ADR-192 platform
  cutover, chosen via the I7↔Sharpee comparison experiment
  (`docs/work/experiments/i7-v10-text-comparison.md`).
