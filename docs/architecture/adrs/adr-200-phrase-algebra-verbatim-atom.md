# ADR-200: Phrase Algebra — Verbatim Atom

## Status: ACCEPTED

> Accepted 2026-06-27 by David, continuing the ADR-192 phrase-algebra cutover
> (`docs/work/dynamic-text/phase-3b-4-scope.md`). Implemented as part of the W3/W4
> bulk on branch `v2_phase34`. The reserved `Verbatim` kind (ADR-192 §2, "→ ADR-E
> verbatim") is the atom this ADR supplies fields and realization for.

## Date: 2026-06-27

## Terminology

- **Verbatim atom** — a `Phrase` kind that renders a bound value as opaque
  pass-through text, exempt from the Assembler's whitespace collapse. The phrase
  home for non-entity scalars (names, directions, free text, ASCII banners) — the
  values the old formatter chain substituted with a bare `String(value)`.

A follow-on **atom** of the phrase algebra (ADR-192), like ADR-199's `Verb`:
*additive* — fields on a reserved union member plus one Assembler case, no core
rewrite.

## Context

ADR-192 §5 makes the bare reference `{x}` a **`NounPhrase`** — the entity case.
That is correct for entity params (`nounPhraseFor` → `NounPhrase`), but the corpus
also threads **non-entity scalars** through placeholders: names (`{npcName}` ×48,
`{saveName}`, `{title}`, `{author}`, `{speakerName}`), `{direction}` ×18, free text
(`{description}` ×17, `{text}`, `{topic}`), and `{kind}`/`{actionId}`. The old
`formatters/registry.ts` rendered these with a plain `String(value)`
substitution; the new parser would wrap a bare string as an indefinite
`NounPhrase` → "a north", "a Aragorn".

Redefining the bare-`{x}` default to "no article" was considered and **rejected**
— it fights ADR-192 §5 and turns a clean algebra into a special-case parser. The
algebra already reserves the right construct: `Verbatim` (ADR-192 §2/§5
`{verbatim:banner}`; design doc S36–S37, "opaque text, exempt from whitespace
collapse"). It was a stub that threw; this ADR implements it.

## Decision

Give the reserved **`Verbatim`** kind a `text` field and an Assembler case, and
bind `{verbatim:x}` to a bound param at parse time.

### 1. The `Verbatim` kind (language-neutral)

```ts
// @sharpee/if-domain — language-neutral; no locale logic
interface Verbatim extends PhraseBase {
  kind: 'verbatim';
  text: string;   // the opaque value, rendered untouched
}
```

### 2. Authoring surface

Follows ADR-192 §5 parse rules: a `kind:` head with the last bare token the
producer/param name.

| Reference | Meaning |
|-----------|---------|
| `{verbatim:npcName}` | render `params.npcName` as opaque text |
| `{verbatim:direction}` | render `params.direction` untouched |

Migration: a non-entity scalar placeholder `{name}` → `{verbatim:name}`. An
**unbound** `verbatim` param fails at parse time per ADR-192 AC-11 (consistent
with `NounPhrase` and `Verb`).

### 3. Realization (the Whitespace authority)

The Assembler emits the `text` as a **verbatim run** — passed through untouched and
**exempt from whitespace collapse** (the same exemption `Literal.whitespace:
'verbatim'` already carries, ADR-192 §1 / ADR-183). The value is bound to a string
at parse time (`String(params[x])`), so realization is a pure pass-through.

## Options considered

- **(A) Redefine bare `{x}` as no-article** — rejected. Fights ADR-192 §5; makes
  the parser carry special cases the algebra is meant to avoid; an unnecessary ADR
  amendment.
- **(B) Producers bind `Literal`s for every scalar** — rejected as the primary
  path. Spreads the change across many stdlib/npc producer call sites; the template
  re-author (W4) is the localized, single-pass place to express intent. (A producer
  *may* still bind a `Literal`/`Verbatim` directly where it owns the value.)
- **(C) Implement the reserved `Verbatim` atom (this ADR)** — chosen. Uses the
  construct the algebra already reserved; additive; templates state intent
  explicitly (`{verbatim:x}`), keeping bare `{x}` the entity default.

## Scope

**In:** the `Verbatim.text` field in `@sharpee/if-domain`; the `{verbatim:x}` bind
in `parsePhraseTemplate`; the Assembler verbatim case (whitespace-exempt run);
migration of non-entity scalar placeholders to `{verbatim:x}` as part of W4.

**Out:** structured/preformatted block handling beyond a whitespace-exempt run;
numeric formatting (→ `Numeral`, ADR-198 — bare numbers still lift to `Literal`).

## Consequences

- **Unblocks W4** — non-entity scalars have a phrase home; bare `{x}` keeps its
  ADR-192 §5 entity-noun-phrase meaning unchanged.
- **Boundary held** — no locale logic in `if-domain`; `Verbatim` is pure text.
- **Whitespace authority extended** — `Verbatim` joins `Literal.verbatim` as
  collapse-exempt, so multi-line opaque text (banners) survives.
- **Additive** — one field + one Assembler case + one parser branch, the ADR-192
  extension model.

## Acceptance Criteria

1. `{verbatim:x}` renders `params.x` as text, byte-for-byte (`"Aragorn"` →
   "Aragorn", `"north"` → "north").
2. The realized verbatim text is **exempt from whitespace collapse** (internal runs
   of spaces / newlines survive), unlike a normal `Literal`.
3. An **unbound** `verbatim` param raises `PhraseParseError` at parse time
   (ADR-192 AC-11).
4. Composition: `{verbatim:x}` inside a `Sequence` joins its literal neighbours
   without disturbing their normal whitespace collapse.
5. Boundary: the `Verbatim` kind in `if-domain` carries no locale logic; only the
   `lang-en-us` Assembler realizes it.
6. Determinism (inherits ADR-192 AC-9): identical `(tree, ctx)` → identical output.

## Relationships

- **Follow-on atom of** ADR-192 — supplies the reserved `Verbatim` kind (§2,
  "→ ADR-E verbatim"). Sibling of ADR-199 (`Verb`).
- **Unblocks** ADR-192 Phase 3b+4 W4 (non-entity scalar migration).
- **Builds on** ADR-183 (whitespace collapse → Assembler whitespace authority).

## Session

- Produced in session 491b9c (2026-06-27), during the ADR-192 Phase 3b+4 cutover,
  after the W4 bare-placeholder analysis
  (`docs/work/dynamic-text/w4-bare-placeholder-analysis.md`) surfaced the
  non-entity-scalar gap.
