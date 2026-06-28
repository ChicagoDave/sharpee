# ADR-197: Phrase Algebra — Pronoun Atom & Last-Mentioned Reference

## Status: ACCEPTED

> Accepted 2026-06-27 by David. Continues the ADR-192 atom roadmap; realizes the
> reserved `Pronoun` kind (ADR-192 §2) and the `reference` seam ADR-192 §6 declared
> but left as a placeholder. Lands on `main` via `v2_adr197_pronoun`. Sibling of
> `Verb` (199), `Verbatim` (200), `Numeral` (198).

## Date: 2026-06-27

## Terminology

- **Pronoun atom** — a `Phrase` kind that renders a pronoun ("it"/"them"/"his"/…)
  agreeing in **case, number, and gender** with a **referent**. The Sharpee
  equivalent of Inform 7's `[regarding the noun][They]` / `[them]` / `[Possessive]`.
- **Reference seam** — the per-turn `ReferenceContext` that tracks the
  last-mentioned referent so a following `Pronoun` can resolve to it. Declared in
  ADR-192 §6; given real behavior here.

A follow-on **atom** of ADR-192: *additive* — a realized kind + one Assembler case,
plus the (previously stubbed) reference-seam implementation.

## Context

ADR-192 wired half of pronoun support: the Assembler already calls
`ctx.reference.note(...)` when it realizes a `NounPhrase` with a `referableId`, and
`NounPhrase` carries `pronounSet`. But `ReferenceContext.note(referableId)` stored
only the **id**, the engine's implementation was a **no-op**, and the `Pronoun` kind
was a stub that threw. A pronoun needs the referent's **number and gender**, not just
its id, to choose "it" vs "they" vs "she".

## Decision

Realize the `Pronoun` kind, and refine the `reference` seam (ADR-197 owns its final
shape) to carry the agreement surface of the last-mentioned referent.

### 1. The reference seam (language-neutral)

```ts
// @sharpee/if-domain
interface Mentioned {
  referableId: EntityId;
  number: 'singular' | 'plural' | 'mass';
  pronounSet?: string;   // 'he' | 'she' | 'it' | 'they' (or a named set); optional
}
interface ReferenceContext {
  lastMentioned(): Mentioned | undefined;
  note(mentioned: Mentioned): void;
}
```

The Assembler notes `{ referableId, number, pronounSet }` from each realized
`NounPhrase`; the engine keeps the most recent per turn (deterministic — realization
order is fixed).

### 2. The `Pronoun` kind (language-neutral)

```ts
interface Pronoun extends PhraseBase {
  kind: 'pronoun';
  case: 'subject' | 'object' | 'possessive' | 'possessive-pronoun' | 'reflexive';
}
```

No surface pronoun strings in `if-domain` — the he/she/it/they tables live in the
`lang-en-us` Assembler (parallel to articles/verbs).

### 3. Authoring surface

`{pronoun:case}` — the referent is the **last-mentioned** entity (the reference seam):

| Reference | English (neuter sing. / plural) |
|-----------|---------------------------------|
| `{pronoun:subject}` | it / they |
| `{pronoun:object}` | it / them |
| `{pronoun:possessive}` | its / their (adjective: "its lid") |
| `{pronoun:possessive-pronoun}` | its / theirs (standalone: "the key is its") |
| `{pronoun:reflexive}` | itself / themselves |

An unknown case fails at parse time (ADR-192 AC-11). (An explicit-referent form
`{pronoun:subject target}` is a straightforward additive extension; deferred.)

### 4. Realization (the Assembler)

Resolve the **last-mentioned** `Mentioned`, then index a pronoun table by **gender**
(`pronounSet` → he/she/it/they; absent ⇒ by number: singular/mass → neuter "it",
plural → "they") and **case**:

| gender | subj | obj | poss-adj | poss-pron | reflexive |
|--------|------|-----|----------|-----------|-----------|
| he | he | him | his | his | himself |
| she | she | her | her | hers | herself |
| it | it | it | its | its | itself |
| they | they | them | their | theirs | themselves |

**Graceful default**: with no last-mentioned referent the pronoun renders the
neuter-singular form for its case ("it"/"its"/"itself") rather than throwing — a
pronoun with no antecedent is an authoring slip, surfaced by the graceful
render-error path, not a turn-killer. (Sentence-start capitalization is the existing
`{capitalize …}` Case authority composed over the pronoun.)

## Options considered

- **Keep the seam id-only; have the Pronoun look the entity up in the world** —
  rejected: couples the Pronoun to trait shape and re-reads the world for data the
  `NounPhrase` already computed. Carrying `number`+`pronounSet` on `Mentioned` keeps
  realization a pure function of the tree + seam.
- **Explicit referent param only (`{pronoun:subject target}`)** — deferred as an
  additive form. Last-mentioned is the common case and reuses the wired seam.

## Scope

**In:** the `Mentioned` refinement of `ReferenceContext` (if-domain) + its real
engine implementation; the `Pronoun.case` field; the `{pronoun:case}` parse rule;
the Assembler pronoun table + last-mentioned resolution.

**Out:** explicit-referent syntax; full neopronoun registry beyond he/she/it/they;
"singular they" reflexive "themself"; possessive over computed names. Each additive.

## Consequences

- Closes the I7 "[regarding …][They]/[them]" gap (experiment row #19).
- **The reference seam is now live** — also the foundation for any future
  last-mentioned-sensitive rendering.
- **Boundary held** — no pronoun surface strings in `if-domain`.
- **Seam signature change** — `note`/`lastMentioned` now carry `Mentioned`; the
  Assembler's existing `note(referableId)` call updates to pass the surface. Test
  `RenderContext` stubs that returned `undefined` are unaffected.

## Acceptance Criteria

1. After a singular neuter `NounPhrase` is realized, `{pronoun:subject}` → "it",
   `{pronoun:object}` → "it", `{pronoun:possessive}` → "its", `{pronoun:reflexive}`
   → "itself".
2. After a plural referent, `{pronoun:subject}` → "they", `{pronoun:object}` →
   "them", `{pronoun:possessive}` → "their".
3. Gendered: a referent with `pronounSet:'she'` → "she"/"her"/"her"/"hers"/"herself";
   `'he'` → "he"/"him"/"his"/"his"/"himself".
4. Last-mentioned tracking: in `"{the a} … {pronoun:subject} …"` the pronoun agrees
   with the **most recently realized** noun phrase.
5. Graceful: with no antecedent, `{pronoun:subject}` → "it" (no throw); an unknown
   case raises `PhraseParseError` at parse time (AC-11).
6. Boundary + determinism (ADR-192 AC-9/AC-10): no pronoun strings in `if-domain`;
   identical `(tree, ctx)` → identical output.

## Relationships

- **Follow-on atom of** ADR-192; gives the `reference` seam (ADR-192 §6) real
  behavior. Sibling of ADR-198/199/200.
- **Pairs with** `Verb` (ADR-199) for agreement and `NounPhrase.pronounSet`.

## Session

- Produced in session 491b9c (2026-06-27), the atom after `Numeral` (ADR-198) in the
  post-cutover roadmap.
