# ADR-242: Chord person identity — proper names, articles, and pronouns

## Status: ACCEPTED (2026-07-19, David, session b381db — both open questions ruled via interview: Q-1 block-with-named-rows definition spelling; Q-2 no injected default — by-number fallback stands, pronouns are declared. adr-review 13/13 post-interview; extendLanguage seam + second-table fixes folded.)

## Date: 2026-07-18

## Parent: ADR-237 (loader helpers boundary — whose D6 parity gate pinned the article quirk this ADR resolves); ADR-197 (phrase-algebra pronoun authority — whose named-set hook this ADR connects). Prior art: Inform 7, *Writing with Inform* §3.18 "Articles and proper names".

## Context

### The article quirk

Every Chord NPC renders as a common noun today: **"You can see a Tobias
here."** (verified live 2026-07-18 — fernhill via the bundle, Gravel
Drive). Two facts combine to produce it:

- The story-loader's person branch pins `article: undefined` on
  `IdentityTrait` and never sets `properName`. The pin is inherited
  byte-for-byte from the old helpers actor builder (`properName ? '' :
  undefined` clobbering the trait's `article = 'a'` default through
  `Object.assign`); ADR-237's D6 A/B parity gate deliberately preserved
  it during the unravel, flagging it for a ruling rather than fixing it
  mid-refactor (`loader.ts` person branch, comment dated that session).
- The phrase chain (`stdlib/src/utils/noun-phrase.ts`) maps an
  `undefined` article to **indefinite** — the same as the `'a'` default
  the clobber replaced. So the pin is cosmetically invisible in
  rendering, and the real gap is that no Chord person is ever
  proper-named at all.

The legacy `IdentityBehavior.getDisplayName` path — the only surface
where `undefined` and `'a'` differ — has no callers outside the identity
module; the phrase chain is the only rendering surface that matters.

Two resolutions were considered and rejected:

- **Create-line inference** (Inform 7's rule: no article in the defining
  sentence → proper-named; a written article never sticks). Chord's IR
  already captures the create-line article (`IREntity.article`), so the
  signal exists — but the rule is implicit magic riding on how the
  author happened to spell a `create` line. Rejected by David in favor
  of an explicit spelling (2026-07-18, session b381db).
- **Proper-naming all persons unconditionally** — wrong for common-noun
  NPCs (`create a gardener` must stay "a gardener").

**Ruling (David, 2026-07-18, session b381db): proper-naming is an
explicit, person-scoped trait adjective — `a person, proper`.**

### The pronoun gap (folded in — ruled by David, same session)

Raised while reviewing the article fix: person identity also includes
pronouns, including non-standard gender identity. Verified state of the
platform:

- The phrase layer (ADR-197) is ready: pronoun atoms agree in case ×
  number × gender, and `NounPhrase.pronounSet` is typed `string` with
  the recorded intent `'he' | 'she' | 'it' | 'they'`, **or a named
  set** — the designed neopronoun hook.
- Nothing connects to it. `IdentityTrait` has no pronoun field,
  `nounPhraseFor` never populates `pronounSet`, Chord has no spelling,
  and the lang-en-us assembler's `PRONOUNS` table plus `genderOf` are
  hardcoded to the four standard rows with a by-number fallback.
- Net effect: **every singular NPC renders as "it"** wherever a pronoun
  atom appears. Tobias is "it".

**Ruling (David, same session): fold the pronoun surface into this ADR**
— one person-identity gate, not a sibling.

## Decision

### D1 — `proper` is a person-only trait adjective

A person's kind list may include the trait adjective `proper`:

```
create Tobias
  a person, proper, patrol with route [the Gravel Drive, ...]
```

- Valid **only** composed with the `person` kind; `proper` on any other
  kind is an **analyzer diagnostic** (person-only message). Kinds are
  catalog knowledge (`KIND_NOUNS`), so the compiler can gate this
  without platform knowledge — but note this is the **first kind-scoped
  entry in `TRAIT_ADJECTIVES`** (the door `through` gates are exit-line
  checks, not trait-adjective checks); the analyzer gains a small
  kind-scope check for trait adjectives, keyed here to `proper` only.
- **Unconditional** — identity is not turn state. `proper while ...`
  gets an **analyzer diagnostic** with a legible message. (The loader's
  existing conditional-composition legality gate would already reject
  it generically; the analyzer diagnostic exists so the author reads
  "identity isn't conditional," not the generic composition error.)
- One ratchet row in `chord-grammar-changes.md`; `chord-grammar.md`
  People section documents the adjective.

### D2 — Loader mapping for `proper`

A `proper` person's `IdentityTrait` is constructed with
`properName: true, article: ''` — the same shape the loader already
gives the player (`yourself`). Rendering follows from the existing
phrase chain with no changes: proper → `articleType: 'none'` → bare
"Tobias" / "Mrs Kettle" in every context. The `article` **field** is
untouched — `''` is the established proper-name convention, and pronoun
selection never reads it (orthogonal axes).

### D3 — The `article: undefined` pin is removed

Non-`proper` persons get a plain `IdentityTrait` like every other
entity: the trait's `article = 'a'` default stands, and articles are
contextual — "a zookeeper" in listings, "the zookeeper" where a
template asks for definite. The load-bearing pin and its FLAG comment
in the person branch are deleted; ADR-237's D6 parity gate was a
one-time refactor gate, long since closed, and no longer constrains
this. After this ADR no code path constructs an `IdentityTrait` with
`article: undefined`.

### D4 — No create-line inference (recorded divergence from Inform 7)

`IREntity.article` (the article as the author wrote it on the `create`
line) remains **noise for identity** — for persons and for every other
kind. `create the zookeeper` and `create a zookeeper` load identically.
This diverges from Inform 7's inference rule deliberately: Chord's
never-guess convention prefers one explicit spelling over reading
intent out of incidental phrasing. The IR field itself is untouched
(regions consume it; ADR-236).

### D5 — `pronouns <word>` person body line

A person block may carry one `pronouns` line, parallel to `aka`:

```
create Mrs Kettle
  a person, proper, guard
  pronouns she
```

- Accepted words: the four standard sets (`he`, `she`, `it`, `they`)
  plus any story-defined set (D7). An unknown word is an analyzer
  diagnostic with a nearest-match suggestion (the never-guess rule,
  matching `analysis.unknown-channel`).
- Person blocks only in this gate (same scoping as `proper`); at most
  one per person (duplicate = diagnostic). One ratchet row.
- `IREntity` gains an additive optional `pronouns` field.

### D6 — Entity → phrase plumbing

- `IdentityTrait` gains `pronounSet?: string` (additive; absent on
  every existing entity).
- `nounPhraseFor` copies it onto `NounPhrase.pronounSet` — the field
  ADR-197 reserved, currently never populated from entities.
- The loader's person branch sets it from `IREntity.pronouns`.
- **No default is injected** (ruled Q-2, 2026-07-18): a person with no
  `pronouns` line gets no `pronounSet`, and the assembler's by-number
  fallback stands ("it" for singular) — uniform with every other
  entity, and consistent with the never-guess rule: pronouns are
  declared, not inferred. The tutorial's People chapter tells authors
  to declare `pronouns` on every person they gender.

### D7 — Neopronoun named sets

A story can define a pronoun set beyond the standard four as a
**block with named rows** (ruled Q-1, 2026-07-18 — the `define
channel` indented-body precedent; order-independent, and the analyzer
checks all five rows present):

```
define pronouns ze
  subject ze
  object zir
  possessive zir
  possessive-pronoun zirs
  reflexive zirself
```

- A defined set carries exactly the five case forms the assembler's
  `PRONOUNS` table already keys — subject, object, possessive,
  possessive-pronoun, reflexive. A missing or duplicate row is a
  diagnostic.
- Definitions flow IR-manifest-style (the ADR-241 channel precedent):
  analyzer collects them, the loader registers them, and lang-en-us
  gains a **pronoun-set registry** (`registerPronounSet(name, forms)`)
  that `genderOf`/`renderPronoun` consult before the standard rows and
  the by-number fallback.
- The pronoun *forms* are user-facing text and stay in the language
  layer: the registry lives in lang-en-us; chord and the IR carry only
  names and declared forms as data, per the language-layer rules.
- A defined set is referenced by its name in D5's `pronouns <word>`
  line; defining a set that shadows a standard word is a diagnostic.

### Scope note — future surface (recorded, not in-gate)

Inform 7 pairs its article rule with overrides (`improper-named`, a
custom indefinite-article property — "your local vicar"). Chord
analogues — custom articles, proper-naming on non-person kinds
(`create Excalibur`), pronoun sets on non-person entities (the ship
that renders "she") — arrive, if ever, as their own ratchet rows riding
this ADR's precedent; nothing here prejudges them.

### D8 — Acceptance criteria

- **AC-1 (the raising case, closed)**: with `a person, proper` on
  Tobias, the fernhill Gravel Drive listing renders "You can see
  Tobias here." REAL-PATH through the bundle; the IR carries the
  composition and the loader sets `properName: true, article: ''` on
  the real trait.
- **AC-2**: `proper` on a non-person kind, and `proper while <cond>`,
  are each compile diagnostics with legible messages and rejection
  tests.
- **AC-3**: a non-`proper` person loads with the default article
  (`article === 'a'`, `properName` false) — asserted on the real
  loaded world; no `IdentityTrait` in the loaded world carries
  `article: undefined`.
- **AC-4**: `pronouns she` round-trips REAL-PATH — IR → loader →
  `IdentityTrait.pronounSet` → a rendered pronoun atom produces
  "her"/"she" for that person in real output.
- **AC-5**: a story-defined neopronoun set round-trips the same path —
  defined forms registered in lang-en-us, `pronouns <name>` on a
  person, rendered atom produces the declared forms in real output.
- **AC-6**: an unknown `pronouns` word is a compile diagnostic with a
  nearest-match suggestion; a duplicate `pronouns` line and a
  standard-shadowing set definition are each diagnostics; all with
  rejection tests.
- **AC-7**: story migration — fernhill's Tobias and Mrs Kettle gain
  `, proper` and `pronouns` lines; transcript expectations touching
  the old renderings are updated; the full fernhill suite and
  walkthrough rerun green. Zoo's zookeeper is untouched (already
  correct as a common noun).
- **AC-8**: full regression — chord suite (goldens churn additively),
  story-loader, lang-en-us, world-model, cloak + zoo gates,
  `./repokit build`.

## Implementation

- `packages/chord`: `catalog.ts` (trait adjective `proper`,
  person-scoped), `parser.ts` (`pronouns` person line; set-definition
  construct per Q-1), `analyzer.ts` (kind-scope + unconditional gates
  for `proper`; pronoun-word resolution with nearest-match; duplicate
  and shadowing diagnostics; set collection into the IR manifest),
  docs (`chord-grammar.md`, ratchet rows; `chord.ebnf`).
- `packages/ide-protocol`: re-export of the extended IR types.
- `packages/world-model`: `IdentityTrait.pronounSet?: string`
  (additive).
- `packages/stdlib`: `nounPhraseFor` copies `pronounSet` onto the
  `NounPhrase`.
- `packages/lang-en-us`: pronoun-set registry
  (`registerPronounSet(name, forms)`); `genderOf`/`renderPronoun`
  consult it before the standard rows.
- `packages/story-loader`: `loader.ts` person branch — `proper`
  consumed inline like the room branch's `dark` (it is identity
  configuration, not a world-model trait); pin + comment deleted;
  `pronouns` mapped to `IdentityTrait.pronounSet`; defined sets
  registered through the existing `extendLanguage(language)` seam — the
  same structural probe `addMessage` uses today, keeping the loader
  locale-neutral. `applyTraitAdjectives` gains an explicit
  `case 'proper': break` — without it the adjective would fall through
  to the authored-trait default and mint a spurious `ChordDataTrait`.
- `stories/fernhill`: `, proper` + `pronouns` lines on Tobias and Mrs
  Kettle + transcript updates.

## Consequences

- Proper-named NPCs render bare everywhere; the three-session
  `article: undefined` open flag closes with no residue in the loader.
- Persons stop rendering as "it": the ADR-197 pronoun seam is finally
  fed from entities, and non-standard gender identity is expressible in
  pure IR — declared forms, never guessed.
- The author-facing rules are explicit one-word/one-line spellings with
  compile-gated scope — no spelling-dependent inference to explain in
  the tutorial; a forgotten `proper` shows up immediately as "a Mrs
  Kettle" in play.
- The grammar ratchet gains three rows (`proper`, `pronouns`, the set
  definition); `IdentityTrait` and `IREntity` each gain one additive
  field; lang-en-us gains a second author-extensible table beside the
  message table (`addMessage`), reached through the same
  `extendLanguage` seam.
- Goldens churn additively only: every AST golden gains `pronouns: []`
  on create nodes and every IR golden gains `pronounSets: []`; beyond
  those empty keys, only stories using the new spellings change.

## Session

Raised by the pre-session audit (session b381db, 2026-07-18) as a
three-session stale flag from ADR-237 Phase 1 (session d02586);
diagnosed to "a Tobias" live; Inform 7 prior art reviewed; `proper`
ruled by David; pronoun gap raised by David and verified to the "it"
fallback; fold-in ruled by David — all same session.
