# ADR-199: Phrase Algebra — Verb Atom & Subject Agreement

## Status: ACCEPTED

> Accepted 2026-06-27 by David, resolving the ADR-192 §7.1 verb-agreement BLOCKER (option B).
> Gates ADR-192 Phase 3b+4 (`docs/work/dynamic-text/phase-3b-4-scope.md` §7.1). W4 re-authors
> templates in the final `{verb:…}` syntax; implementation lands as W3 on the `v2_phase34`
> cutover branch.

## Date: 2026-06-27

## Terminology

- **Verb atom** — a `Phrase` kind that defers a verb's surface realization and agrees its
  **number/person** with a referenced **subject** phrase. The replacement for the
  `{is:x}` / `{was:x}` / `{has:x}` formatter.
- **Agreement authority** — the Assembler component ADR-192 §4 already names as owning
  "verb number/person, pluralization." ADR-192 declared the authority but gave it **no
  phrase node to act on**; this ADR supplies that node.

This is a follow-on **atom** of the phrase algebra (ADR-192). It is *additive*: a new
member of the closed union plus a new Assembler case — no core rewrite.

## Context

ADR-192 replaced the formatter chain with a phrase tree, but the closed union it defined
(`Literal | NounPhrase | PhraseList | Sequence | Empty`, with later atoms reserved) has
**no verb kind**. Meanwhile **59 verb placeholders across 28 `lang-en-us` files** carry
subject-verb agreement through the legacy `formatters/verb.ts` (confirmed by grep:
**0** in stdlib, **0** in stories, **0** in any other package). Only `{is:}` and `{has:}`
have live usages; `{was:}` has **zero** current usages and is retained in the verb table
for completeness (as ADR-192 retains the zero-usage `{the-list:}`/`{count:}`):

```
"{the:cap:target} {is:target} dead."   →  "The troll is dead."  /  "The pygmy goats are dead."
```

Two facts make this a hard blocker for the Phase 3b+4 cutover:

1. **No construct.** `{is:target}` has no equivalent in the algebra — verb agreement is
   simply absent from the kind roster.
2. **It throws.** `{is:target}` contains a `:`, so `parsePhraseTemplate` (ADR-192 §5) reads
   `is` as a kind-prefix, finds it unknown, and **raises a parse-time error** (ADR-192
   AC-8/AC-11). All 59 usages hard-fail. They cannot be deleted (real usages) nor
   mechanically rewritten (no target construct).

ADR-192's Agreement authority was *meant* to own exactly this (`verb.ts` is in its
"Replaces" column, §4). The only thing missing is the tree node it agrees over. This ADR
adds it, in the algebra's own idiom, so agreement is computed **in the tree against the
realized subject** — not pre-resolved into a string before the tree exists.

## Decision

Add a **`Verb`** member to the closed `Phrase` union and a corresponding Assembler case.
The verb names its **subject** by param reference and agrees with that subject's resolved
`number` (and `person`) at realize time.

### 1. The `Verb` kind (language-neutral)

```ts
// @sharpee/if-domain — language-neutral; NO conjugation tables, NO surface strings
interface Verb extends PhraseBase {
  kind: 'verb';
  lemma: string;            // the 3rd-person-singular surface the author types: 'is','was','has','opens'
  subjectRef: string;       // param/producer name of the subject phrase to agree with
  person?: 'first' | 'second' | 'third';  // default 'third'; may be overridden by the subject's person
}
```

`lemma` is the **singular surface form the author would naturally write** — `is`, `was`,
`has`, `opens`. The plural/agreed form is the Assembler's to compute (parallel to ADR-192
D4: the `NounPhrase` carries `articleType`, never the a/an string). No conjugation strings
live in `if-domain`.

### 2. Authoring surface

Follows ADR-192 §5 parse rules verbatim — `kind:` head, leading bare token(s) are the
reserved hint (here, the lemma), last bare token is the producer/param name:

| Reference | Meaning |
|-----------|---------|
| `{verb:is target}` | be, agrees with `target` → "is" / "are" |
| `{verb:was target}` | be (past) → "was" / "were" |
| `{verb:has target}` | have → "has" / "have" |
| `{verb:opens door}` | regular verb → "opens" / "open" |

Migration is mechanical and one-to-one: `{is:x}` → `{verb:is x}`, `{was:x}` →
`{verb:was x}`, `{has:x}` → `{verb:has x}`. Legacy `{is:x}` (no `verb:` prefix) stays
**rejected at parse time** per ADR-192 AC-8/AC-11 — the clean break is preserved.

### 3. Agreement (the Assembler authority)

At realize time the Agreement authority:

1. resolves `subjectRef` to the bound subject phrase and reads its **realized** `number`
   (`singular` | `plural` | `mass`) and `person` (ADR-192 §1 agreement surface);
2. maps `lemma` → agreed surface by:
   - an **irregular table** for the closed set of suppletive verbs (`be`: is/are, was/were;
     `have`: has/have; `do`: does/do; `go`: goes/go) — this is the table lifted out of the
     deleted `formatters/verb.ts`;
   - else the **regular rule**: the singular `lemma` ends in the 3rd-singular `-s`; the
     plural form strips it (`opens` → `open`).
     > **Amended by ADR-204 (2026-06-30):** the `-es` strip applies only to genuine `-es`
     > inflections — a doubled sibilant (`ss`/`zz`) or `x`/`ch`/`sh` — not to a single
     > `-se`/`-ze` stem (use→uses→"use", refuse→refuses→"refuse"). The `-ie` closed set
     > (die/lie/tie/vie) and rare single-`s` stems (focus/bus/gas) live in `IRREGULAR_VERBS`.
3. `mass` agrees as **singular** ("the water is murky"); `plural` takes the plural form;
   `person` defaults to `'third'` and is the seam by which 2nd-person ("you are", via the
   ADR-089 perspective subject) is handled when needed.

Because agreement reads the **realized subject**, it falls out for free that a `PhraseList`
subject ("the troll and the goats") has `number: 'plural'` and yields "are" — an
expressiveness the rejected string pre-pass (Options, A) structurally cannot reach.

### 4. Subject resolution & the agreement surface (what `subjectRef` points at)

`subjectRef` names a **bound param**; the Verb reads `number` and `person` off the param's
**realized phrase** (ADR-192 §1 agreement surface). It never renders the subject — the
subject noun is realized by its own placeholder elsewhere in the template; `subjectRef` is
an agreement pointer only. The Verb stays dumb; the burden of stamping the surface lives on
the **subject producer** (`nounPhraseFor` / the perspective resolver). Three cases:

- **(A) 3rd-person entity param — the 59 live usages.** `subjectRef` resolves to a
  `NounPhrase` (or `PhraseList`) carrying `number`. The common path.
  ```
  "{the:cap:target} {verb:is target} dead."
    target = troll        → NounPhrase{number:'singular'} → "The troll is dead."
    target = pygmy goats  → number:'plural'               → "The pygmy goats are dead."
  ```

- **(B) Player subject in 2nd-person narrative.** `{is:actor}` exists today. When `actor`
  is the player and the story narrates 2nd person (ADR-089), English forces the plural form
  ("you **are**"). `nounPhraseFor(player, ctx)` stamps `person: 'second'`; the Agreement
  authority treats **`person: 'first' | 'second'` ⇒ the plural verb form** (the one
  exception, 1st-singular "I am", is handled by the irregular `be` table). No special-casing
  in the Verb node.
  ```
  "{verb:is actor} carrying too much."
    actor = player (2nd person) → NounPhrase{person:'second'}     → "...you are carrying too much."
    actor = the dwarf           → NounPhrase{person:'third',number:'singular'} → "...the dwarf is carrying too much."
  ```

- **(C) Subject lacking an agreement surface.** If `subjectRef` resolves to a phrase with no
  `number` (a bare `Literal`, an `Empty`), the Verb **defaults to `person: 'third',
  number: 'singular'`** — the unmarked "is" form — rather than throwing; verbs degrade
  gracefully. (An **unbound** `subjectRef` is a different failure: an authoring error that
  **fails at parse time** per ADR-192 AC-11, not a realize-time default.)
  ```
  "{verb:is thing} ready."
    thing bound to Literal "everything" (no number) → default singular → "everything is ready."
  ```

Contract, in one line: **`subjectRef` names a bound param; the Verb reads `number`+`person`
off the realized subject; `person: 'first' | 'second'` ⇒ plural form; a subject with no
`number` ⇒ unmarked `person: 'third', number: 'singular'`; an unbound `subjectRef` ⇒
parse-time error.**

## Options considered

- **(A) Transitional string pre-pass** — a sibling of the perspective resolver rewrites
  `{is:x}` → "is"/"are" from `params[x].number` *before* `parsePhraseTemplate`. **Rejected.**
  It reintroduces the formatter-chain string pass ADR-192 exists to delete; it is a second
  resolver seam in a pipeline whose ADR forbids dual paths; and its only advantage — leaving
  the 59 usages untouched — is **illusory**, because W4 re-authors every template anyway,
  so A saves no edits while *guaranteeing* a later second migration when verbs join the tree.
  With v1 frozen in the sibling repo, the "low-disruption" value A traded on is worth
  nothing here — nothing downstream depends on the old syntax.
- **(C) Shim / defer the 59 usages** — **Rejected.** Leaves a known hole and forces a
  second cutover; contradicts ADR-192's atomic-break mandate.
- **(B) Add the `Verb` kind now (this ADR)** — **Chosen.** Agreement lives where ADR-192
  already placed the authority; the 59 usages are authored in final form once; the legacy
  formatter is deleted in the same branch.

## Scope

**In:** the `Verb` kind in `@sharpee/if-domain`; the `{verb:lemma subject}` parse rule in
`parsePhraseTemplate`; the Assembler Agreement-authority case (irregular table + regular
`-s` rule + number/person/mass handling); the subject-resolution contract (§4, cases A/B/C);
migration of the 59 `{is:}`/`{has:}` usages to `{verb:…}`; deletion of `formatters/verb.ts`.

**Out:** tense/aspect beyond the present/past surfaces the live templates use (no future,
progressive, or perfect construction — authors still type the surface form); negation and
auxiliary chains; full 2nd-person conjugation beyond the `person` seam. Each is additive
later if a real usage appears.

## Consequences

- **Unblocks ADR-192 Phase 3b+4** — closes the §7.1 BLOCKER; W3 implements this ADR.
- **59 usages re-authored** to `{verb:…}` as part of W4's bulk pass — no separate churn.
- **`formatters/verb.ts` deleted** in W7; its irregular table relocates into the Assembler
  Agreement authority.
- **Additive, no core rewrite** — a new union member + one Assembler case, exactly the
  ADR-192 extension model (§Resolved, "Kind extensibility").
- **Coordinated-subject and 2nd-person agreement** fall out of subject-number resolution,
  for free, when those subjects occur.
- **Boundary held** — no verb surface strings in `if-domain`; all conjugation in
  `lang-en-us`.

## Acceptance Criteria

1. `{verb:is target}` renders **"is"** for a singular subject and **"are"** for a plural one.
2. `{verb:was target}` → "was"/"were"; `{verb:has target}` → "has"/"have".
3. A regular verb `{verb:opens door}` → "opens" (singular) / "open" (plural).
4. Agreement reads the **realized subject** resolved from `subjectRef` at realize time: a
   `PhraseList` subject ("the troll and the goats") yields the plural form.
5. A `mass` subject agrees singular ("the water is murky").
6. **Person (§4 case B):** a subject `NounPhrase` with `person: 'second'` (the player in
   2nd-person narrative) takes the plural form — `{verb:is actor}` → "are" — while
   `person: 'third'` with a singular subject yields "is".
7. **Graceful default (§4 case C):** `subjectRef` resolving to a phrase **without** `number`
   (a `Literal`) renders the unmarked `person: 'third', number: 'singular'` form ("is"), and does
   **not** throw; an **unbound** `subjectRef` instead **fails at parse time** (ADR-192 AC-11).
8. Legacy `{is:target}` (no `verb:` prefix) is **rejected at parse time** — ADR-192 clean
   break preserved (AC-8/AC-11).
9. Boundary: the `Verb` kind in `if-domain` carries **no** conjugated surface strings; the
   is/are, was/were, has/have mapping exists **only** in the `lang-en-us` Assembler.
10. After migration, `grep` finds **no** `{is:`/`{was:`/`{has:` placeholders and **no**
    reference to `formatters/verb.ts`; the suppletive table lives in the Assembler.
11. Determinism (inherits ADR-192 AC-9): identical `(tree, world, ctx)` → identical verb
    surface across repeated runs.

## Relationships

- **Follow-on atom of** ADR-192 — supplies the `Verb` kind the §2 roster omitted; slots into
  that roadmap as the previously-unnumbered verb atom. ADR-192's §2 kind table and its
  "Foundation for" list have been amended with the `Verb → ADR-199` entry (2026-06-27).
- **Gates** ADR-192 Phase 3b+4 (`docs/work/dynamic-text/phase-3b-4-scope.md` §7.1, W3).
- **Replaces** `lang-en-us/formatters/verb.ts` (deleted in W7).
- **Lands on** the `v2` line (`main` per the corrected branch model); cut on `v2_phase34`.

## Session

- Produced in session 0192cc (2026-06-27), continuing the dynamic-text / phrase-algebra
  thread from session 816292 (ADR-192).
- Decision basis: `docs/work/dynamic-text/phase-3b-4-scope.md` §7.1 (options A/B/C); David
  selected **B** — no backward-compat constraint (v1 frozen in sibling repo) removes A's
  only rationale.
