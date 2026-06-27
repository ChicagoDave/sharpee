# ADR-192: Phrase Algebra — Phrase Model & Assembler Core

## Status: ACCEPTED

> Accepted 2026-06-26 by David. Phase 1 (`@sharpee/if-domain` Phrase contracts)
> authorized; implementation proceeds on `v2_phase1` per `docs/context/plan.md`.
>
> Amended 2026-06-27: (1) the §2 kind roster and "Foundation for" list gained the `Verb`
> atom (→ ADR-199), which the original roster omitted; (2) the §1 agreement-surface `person`
> field changed encoding from `1 | 2 | 3` to the spelled-out string union
> `'first' | 'second' | 'third'`, matching the other surface fields (no magic numbers). The
> field has no implemented consumer yet (ADR-199's Verb is the first), so the re-encoding is
> a documentation-level refinement. The foundational union is otherwise unchanged.

## Date: 2026-06-26

## Terminology

- **Phrase** — an immutable, composable value that defers realization and carries the
  grammatical metadata its neighbors need to agree with it. The unit that replaces "a
  template string with embedded formatters."
- **Producer** — `(RenderContext) => Phrase`. Code (an entity, trait, action, behavior)
  that emits a phrase from world state.
- **Assembler** — the single per-locale component that realizes a phrase tree to text and
  owns every cross-cutting correctness concern (article, agreement, punctuation,
  whitespace, reference, case).

This ADR is the **foundation** of the phrase algebra. It establishes the model and the
core machinery; the feature-bearing atoms each land in their own follow-on ADR (see
*Relationships*). Full design and the D1–D5 decision record live in
`docs/work/dynamic-text/phrase-algebra-design.md`.

## Context

Today a placeholder renders through a **formatter chain** whose signature is
`(string | number | EntityInfo | EntityInfo[]) => string`
(`lang-en-us/formatters/registry.ts`, `applyFormatters`). The chain splits a placeholder
on `:` (`parsePlaceholder`), applies formatters left-to-right, and **collapses to a bare
`string` after the first formatter.**

That early collapse is the root cause behind every dynamic-text gap catalogued in
`docs/work/dynamic-text/dynamic-text-scenarios.md`. The moment `{the:item}` becomes
`"the cabinet"`, the rendered fragment has lost the metadata any enclosing construct
needs:

- it can no longer **agree an article** over a state-derived adjective (S5–S8),
- it can no longer be **counted or grouped** with siblings (S16–S21),
- it can no longer be **pronoun-referenced** later in the turn (S24–S25),
- it can no longer be **composed** with a second contributor's clause (S-append),
- and a **conditional/variation** has nowhere to live but inside the prose string (S9–S14).

The earlier remedy — six bolt-on formatter ADRs (A–F in
`dynamic-text-proposed-solutions.md`) — patched the symptoms with six mini-languages
contorted around the `:`-split parser, and two of them (conditionals, cycling) smuggled
control flow *into prose strings*, contradicting Sharpee's standing rule that logic lives
in code and templates stay near-dumb.

ADR-190 already took the first step toward the right model without naming it: `EntityInfo`
is a value that defers realization and carries `name`, `plural`, `nounType`, `article`,
`grammaticalNumber`. **It is a proto-phrase.** This ADR completes the model.

## Decision

Replace `messageId → formatter-chain → string` with `messageId → **phrase tree** →
**Assembler** → `ITextBlock[]``. Text becomes a tree of phrases that defer realization;
exactly one Assembler per locale realizes the tree at end of turn.

### 1. The `Phrase` type (language-neutral)

A `Phrase` is a discriminated union keyed by `kind`, extended additively by later ADRs.
Every phrase may carry the **agreement surface** — the metadata neighbors agree against:

| Field | For |
|-------|-----|
| `number` (`singular`\|`plural`\|`mass`) | verb agreement, pluralization |
| `person` (`first`\|`second`\|`third`) | pronouns, verb conjugation |
| `pronounSet` | gendered/neopronoun reference |
| `properName` | article suppression |
| `articleType` (`indefinite`\|`definite`\|`some`\|`none`) | a/an/the/some/∅ |
| `referableId` | last-mentioned tracking → later `Pronoun` |
| `whitespace` (`normal`\|`verbatim`) | collapse exemption |
| `decorations` | emphasis/code carried *through* composition |

The **literal article string is deliberately absent** — `articleType` is language-neutral;
the a/an/the surface is computed by the Assembler (see §4, and D4).

`Phrase` is a **closed discriminated union keyed by `kind`**, extended *additively* by
later ADRs (a new member + a new Assembler case — never a rewrite of the base). The
foundational members are concrete contracts:

```ts
// @sharpee/if-domain — language-neutral; NO locale logic, NO article strings
type Phrase = Literal | NounPhrase | PhraseList | Sequence | Empty; // extended per ADR

interface PhraseBase { decorations?: Decoration[]; }   // carried through composition

interface Literal extends PhraseBase {
  kind: 'literal';
  text: string;
  whitespace?: 'normal' | 'verbatim';                  // default 'normal'
}

interface NounPhrase extends PhraseBase {
  kind: 'noun';
  name: string;                                        // base noun (computed name → ADR-193)
  adjectives?: string[];                               // static (ADR-192); state-derived → ADR-193
  number: 'singular' | 'plural' | 'mass';
  properName?: boolean;
  articleType: 'indefinite' | 'definite' | 'some' | 'none';
  pluralForm?: string;                                 // author override (irregular)
  referableId?: EntityId;                              // last-mentioned tracking → ADR-197
  pronounSet?: string;                                 // for later pronoun reference
}

interface PhraseList extends PhraseBase {
  kind: 'list';
  items: Phrase[];
  conj: 'and' | 'or';
}

interface Sequence extends PhraseBase {
  kind: 'seq';
  parts: Phrase[];
}

interface Empty { kind: 'empty'; }                     // realizes to ""; absorbed by combinators

type PhraseProducer = (ctx: RenderContext) => Phrase;  // may return Empty

interface Assembler {                                  // per-locale; English impl in lang-en-us
  realize(tree: Phrase, ctx: RenderContext): ITextBlock[];
}
```

### 2. The phrase kinds (the closed algebra)

This ADR **defines all kinds** as the algebra's surface but **implements only the
foundational subset**; the rest are stubs reserved for their follow-on ADRs.

| Kind | Group | This ADR? |
|------|-------|-----------|
| `Literal` | atom — raw author text | ✅ |
| `NounPhrase` | atom — article + adjectives + noun, agreed whole | ✅ (static adjectives only) |
| `List` | combinator — group/pluralize/serial-comma | ✅ (ports ADR-190) |
| `Sequence` | combinator — ordered join under one punctuation authority | ✅ |
| `Empty` | atom — renders to nothing; absorbed by combinators | ✅ |
| `Pronoun` | atom | → ADR-197 |
| `Numeral` | atom | → ADR-198 (minor) |
| `Verb` | atom — subject-agreed verb | → ADR-199 |
| `Verbatim` | atom | → ADR (E) verbatim |
| `Contents` | combinator | → ADR-194 |
| `Slot` | combinator | → ADR-195 |
| `Optional` / `Choice` | modifier | → ADR-196 |

`NounPhrase` in this ADR renders name + article-agreement + number/plural + **static
adjectives from `IdentityTrait.adjectives`**. This makes `IdentityTrait.adjectives` *live
data* and closes the "dead adjectives" bug noted in the scenarios doc. The
**state-derived** adjective contributor hook (`OpenableTrait → 'open'`, etc.) is ADR-193.

### 3. Producers and `RenderContext`

```
type PhraseProducer = (ctx: RenderContext) => Phrase   // may return Empty
```

`RenderContext` exposes a read-only world, the bound params, locale `settings` (serial
comma, …), and **declares the seams** later ADRs implement:

- `reference` — last-mentioned context (consumed by `Pronoun`, ADR-197),
- `textState` — per-`(entityId, messageKey)` store (consumed by `Choice`/`Optional`,
  ADR-196),
- `contribute(slotKey, phrase, opts)` — slot contribution channel (ADR-195).

These seams are part of the contract now so the core is stable; their *implementations*
land with the atoms that use them.

`EntityInfo` is **replaced** by `NounPhrase` (D4): ADR-190's grammatical fields are
absorbed as `NounPhrase` data, and `entityInfoFrom` (`stdlib/utils/entity-info.ts`)
becomes the `NounPhrase` producer (`nounPhraseFor(entity, ctx)`). The field mapping is the
producer's contract — every step is named so none is silently dropped:

| Source (`IdentityTrait` / entity) | → `NounPhrase` field |
|-----------------------------------|----------------------|
| `name` | `name` |
| `adjectives` | `adjectives` (static; AC-4) |
| `plural` | `pluralForm` |
| `grammaticalNumber` | `number` (`mass` from `nounType: 'mass'`) |
| `properName` / `nounType: 'proper'` | `properName: true` |
| `nounType` | `articleType` default (`proper`→`none`, `mass`→`some`, else caller hint or `indefinite`) |
| `entity.id` | `referableId` |
| `pronouns` (if present) | `pronounSet` |

The leading article hint from the template (`{the item}` → `definite`) overrides the
`nounType`-derived default. The `article: 'a'|'an'` literal that `EntityInfo` carried is
**not** mapped — it is the Assembler's to compute (D4, §4).

### 4. The Assembler — the keystone

One per-locale `Assembler` walks the tree at end of turn and is the **sole authority** for:

| Authority | Owns | Replaces |
|-----------|------|----------|
| Article | a/an/the/some/∅ agreed over the realized head | `article.ts`, half of `list.ts` |
| Agreement | verb number/person, pluralization | `verb.ts`, `pluralize()` |
| Punctuation | serial commas, final and/or, no dangling comma for `Empty`, terminators | every formatter, ad hoc |
| Whitespace | collapse + paragraph breaks, `Verbatim`-exempt | `assemble.ts` collapse (ADR-183) |
| Reference | last-mentioned tracking → `Pronoun` resolution | (did not exist) |
| Case | sentence-start capitalization | `cap` formatter |

This is the central win over six ADRs: punctuation, article, and whitespace are correct
for *any* composition because exactly one component owns each, instead of N formatters
each half-owning a slice and failing at the seams. The Assembler emits into
`@sharpee/text-blocks` (`ITextBlock`/`IDecoration`) — the downstream contract is unchanged.

### 5. Authoring surface (D1, D2)

Templates stay **strings that parse to a phrase tree** (`parsePhraseTemplate` replaces
`parsePlaceholder`). Placeholders are *producer references*, never formatter chains.
`NounPhrase` is the **unprefixed default**; non-noun kinds are **explicitly prefixed**,
spelled in full:

| Reference | Kind |
|-----------|------|
| `{item}` / `{the item}` / `{capitalize the item}` | NounPhrase (hints `a`/`an`/`the`/`some`/`capitalize`) |
| `{pronoun:it}` | Pronoun (ADR-197) |
| `{number:coins words}` | Numeral (ADR-198) |
| `{contents:box}` | Contents (ADR-194) |
| `{slot:detail}` | Slot (ADR-195) |
| `{verbatim:banner}` | Verbatim |

Parse rules: last bare token = producer/param name; leading bare tokens = reserved hints;
a `kind:` head selects a non-noun kind. **No** `:`-chain, `?`, `|`, or `#` — branching and
variation are *named producers* (`Optional`/`Choice`) the template references, never
in-string control flow.

### 6. Layer placement (D5)

| Layer | Owns |
|-------|------|
| `@sharpee/if-domain` | `Phrase` kinds, `PhraseProducer`, `RenderContext` — language-neutral contracts, beside `language-provider.ts` / `contracts.ts` |
| `@sharpee/world-model` | `IdentityTrait.adjectives` flows into `NounPhrase`; trait contributor hooks land in ADR-193 |
| `@sharpee/lang-en-us` | the **English Assembler** — article/pluralization/verb/case realization; ADR-190's formatters move in here |
| `@sharpee/text-blocks` | unchanged — the `ITextBlock` output the Assembler emits |
| engine / report | builds phrase trees from events; owns `reference` + `textState` across the turn; runs the Assembler |
| stdlib / story | author phrase templates; bind producers |

The algebra is **language-neutral**; realization is **per-locale**. A second locale is a
second Assembler over unchanged trees — i18n falls out for free.

### 7. Determinism

Realization is a pure function of `(tree, world, ctx)`: same inputs → identical output, so
saves and transcript tests reproduce exactly. The seeded selectors and persistent
`textState` store that make this hold for `Choice`/`Optional` are specified in ADR-196;
this ADR only fixes the **purity contract** the Assembler must satisfy.

## Options considered

- **Six bolt-on formatter ADRs (A–F)** — rejected: six mini-languages on the `:`-split
  parser; two leak control flow into prose; punctuation/whitespace never compose.
- **Programmatic phrase composition only** (no string surface) — rejected: a large
  authoring regression for the common literal-plus-reference line (D1).
- **Keep the `:`-chain, reinterpret it** — rejected: identical glyphs, new semantics → a
  silent old/new confusion trap (D2).
- **Incremental migration on `main`** — rejected for a long-lived `v2` branch (D3): keeps
  `main` shippable and avoids a dispatch seam / dual pipeline.

## Scope

**In:** the `Phrase` type + agreement surface; the foundational kinds (`Literal`,
`NounPhrase` with static adjectives, `List`, `Sequence`, `Empty`); `PhraseProducer` /
`RenderContext` (with declared-but-unimplemented seams); the Assembler and its six
authorities; `parsePhraseTemplate`; the new report pipeline; `NounPhrase` replacing
`EntityInfo`; layer placement in `if-domain` / `lang-en-us` / `text-blocks`.

**Out (own ADRs):** state-derived adjectives & computed names (193); Contents & relational
placement (194); Slots (195); Optional/Choice & text-state store (196); Pronoun &
last-mentioned context (197); Numeral (198); Verbatim. All land on the **`v2` branch**;
this ADR ships nothing to `main`.

## Consequences

- **Breaking, by design.** The formatter chain, `parsePlaceholder`, and `EntityInfo` are
  deleted on `v2`; every `lang-en-us` message and story template re-authors to the new
  grammar. This is a `2.0` major (D3).
- **One assembler, one place to be correct.** Punctuation/article/whitespace bugs become
  single-locus, not per-formatter.
- **i18n boundary established** — locale logic leaves the template format.
- **ADR-190 preserved, not discarded** — its List/EntityInfo work is ported in as the
  first phrases; its acceptance criteria must still pass through the new path.
- **Closes the dead-`IdentityTrait.adjectives` bug** as a side effect.
- Every later atom is *additive* — a new `kind` + Assembler case, no core rewrite.

## Acceptance Criteria

1. A literal-only template renders byte-identical through the tree path.
2. `{the item}` renders "the cabinet" via `NounPhrase` + Assembler article authority.
3. `{a item}` agrees a/an over the **rendered head** ("an owl", "a goat", "an hour").
4. A `NounPhrase` with static `IdentityTrait.adjectives` renders them ("a small iron
   chest"), with the article agreeing over the leading adjective.
5. A `List` of `NounPhrase`s groups, pluralizes, and applies the serial-comma setting —
   **ADR-190 parity**, now through the phrase path.
6. An `Empty` phrase inside a `Sequence`/`List` leaves **no** dangling comma or whitespace.
7. The Assembler emits `ITextBlock[]`; the `@sharpee/text-blocks` consumer is unchanged.
8. The new parser **rejects** legacy `:`-chain syntax (`{cap:the:item}`) — the clean break.
9. Determinism: identical `(tree, world, ctx)` → identical output across repeated runs.
10. Boundary: `if-domain` `Phrase` types contain **no** locale logic (no a/an/article
    strings); all realization lives in the `lang-en-us` Assembler.
11. Rejection: a template that names an **unknown kind-prefix** or references an
    **unbound param** raises a defined error **at parse time** (`parsePhraseTemplate`), not
    a silent `Empty` at realize time. The error names the offending token and template.

## Resolved (decided in this ADR)

- **Kind extensibility:** the `Phrase` type is a **closed discriminated union** keyed by
  `kind`, extended additively per later ADR (a new member + a new Assembler case). A kind
  *registry* was rejected as unnecessary ceremony for the clean `v2` break. (§1)
- **Producer binding (basic):** binding a bare reference (`{item}`, `{the item}`) to a
  param/producer is **in scope for ADR-192** — the foundational subset cannot render
  without it. Only the *advanced* binding of `Optional`/`Choice` (ADR-196) and `Slot`
  (ADR-195) producers defers to those ADRs.
- **Error handling:** unknown kind-prefix or unbound param **fails at parse time**
  (`parsePhraseTemplate`) with an error naming the offending token and template — never a
  silent `Empty` at realize time. (AC-11)

## Open questions (non-blocking)

- **Decoration carry-through:** exact interplay of `[em:]`/`[code:]` decorations with
  phrase composition (carried on `decorations`, realized by the Assembler) — confirm the
  model survives nesting. Non-blocking: the `decorations` field exists; nesting semantics
  can be pinned during ADR-192 implementation without changing the contract.

## Relationships

- **Supersedes the framing of** `dynamic-text-proposed-solutions.md` (ADRs A–F become
  atoms of this algebra).
- **Builds on** ADR-190 (list rendering / `EntityInfo`, ported in), ADR-158 (entity→data
  contract), ADR-163 (channels → `text-blocks`), ADR-183 (whitespace collapse → Assembler
  whitespace authority).
- **Foundation for** ADR-193 (state-derived adjectives & computed names), ADR-194
  (Contents & placement), ADR-195 (Slots), ADR-196 (Optional/Choice & text-state store),
  ADR-197 (Pronoun & last-mentioned context), ADR-198 (Numeral), ADR-199 (Verb atom &
  subject agreement), and the Verbatim atom.
- **Workflow:** lands on the `v2` worktree per D3 (`repos/sharpee_v2`); `main`/1.x stays
  maintenance-only.

## Session

- Produced in session 816292 (2026-06-26), continuing the dynamic-text design thread.
- Decision record: `docs/work/dynamic-text/phrase-algebra-design.md` (D1–D5).
