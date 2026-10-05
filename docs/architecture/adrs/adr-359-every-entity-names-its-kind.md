# ADR-359: Chord says what absence would otherwise decide

**Status**: DRAFT, a proposal to assess (David, 2026-10-04, session 4d81b6). Widened the same day at David's direction from "every entity names its kind" to every implied default of the same class, so that one migration and one major version cover them all. Every decision here is a grammar change: it goes through `docs/architecture/chord-grammar-changes.md`, each is ruled on separately by David before any code, and no log entry is written until he rules. D1 approved and logged 2026-10-04 (session 0ebc5d; former Q-2), and the IR records `thing` (former Q-1, same day). **D1 is implemented** (2026-10-05, commits `158cc2858` and `1d842b3f5`; see "D1 as built" below); it is not yet published, since 4.0.0 waits on the rest of this ADR. D5 to D11 are not built, and Q-3 to Q-6 remain open.
**Scope**: `packages/chord` (catalog, parser where a decision adds a form, analyzer, `chord.ebnf`, the language version), `packages/story-loader` where a default lives there today (D9), and a one-time migration of every Chord source in the repository and the manual.

**The criterion** (from David's review of the grammar with Claude Desktop, 2026-10-04): *make it explicit when leaving it out changes what the story does and the author cannot see why from the text.* Where a default stays, ADR-358's balloons state it, since the grammar does not.

## Date: 2026-10-04

## Parent

- **ADR-358** (three starts, and completion that teaches): its completion design exposed the cost of a kind line that may be absent. D4 below lists what this removes from it.
- **ADR-257 D2** (language versioning): a syntax an existing story relied on that no longer parses is a **major** bump (`packages/chord/src/version.ts` header).
- **ADR-276 census 17 and 18**: the analyzer's existing gates on kind nouns (`analysis.unknown-kind-noun`, `analysis.multiple-kind-nouns`, `analyzer.ts` `checkCompositionLegality`).
- **ADR-327** (explicit references), which already uses "object" for an action's object in clause bindings, the reason the kind is named `thing`.

## Context

Today a plain thing has no kind line. `packages/chord/src/catalog.ts` says so: "Plain thing = no kind noun." The kind nouns are `room`, `door`, `person`, `container`, `supporter` and `region`, each taking an article; trait adjectives such as `scenery` are bare and can stand alone. `a thing` is not accepted: `thing` is not in `KIND_NOUNS`, so it fails `analysis.unknown-kind-noun` (the census-17 comment notes that phrasebook fixtures once "compiled `a thing` clean").

ADR-358's completion design showed the cost. After a `create` line the dropdown needs an entry that inserts nothing, "(plain object — no kind line)", and a stateless completion service cannot tell afterwards that the author chose it rather than not having answered yet. More generally, a reader cannot tell a plain thing from an entity whose kind line was forgotten.

**How much is written without a kind line**, counted through the real parser (`parse()` from `packages/chord/dist/index.js`, every `.story` and `.chord` outside `node_modules`, `dist` and `_archive`, plus every ```` ```chord ```` block in the manual's `website/src/app/**/*.mdx`; script run 2026-10-04):

| Where | `create` blocks | No kind line | of which `scenery` | of which no composition line at all |
|---|---:|---:|---:|---:|
| branch-stories/secret-letter (26 files) | 486 | 289 | 221 | 18 |
| branch-stories/fernhill | 65 | 35 | 20 | 6 |
| branch-stories/ides-of-march | 20 | 8 | 4 | 4 |
| stories/ (9 Chord stories) | 116 | 45 | 30 | 11 |
| fixtures: packages/chord | 238 | 72 | 40 | 22 |
| fixtures: other packages and tools | 153 | 73 | 34 | 24 |
| docs/work fixtures (live and archived) | 584 | 350 | 138 | 169 |
| the manual (219 code blocks) | 319 | 121 | 49 | 48 |
| website/public (a copy of fernhill) | 65 | 35 | 20 | 6 |
| **Total** | **2,046** | **1,028** | **556** | **308** |

About half of all `create` blocks carry no kind line, and over half of those are scenery.

**The other implied defaults**, counted the same way (same corpus, same parser, script run 2026-10-04). Placement counts entities that are not rooms, regions or doors; "unplaced" means no `in`, `on` or `starts in` line and not named by any `carries`, `wears` or `containing` line. secret-letter is counted across its 24 top-level files together, so cross-file placement counts:

| Default | Where it lives today | Corpus count |
|---|---|---|
| No placement: created out of play | the loader places nothing | 123 of 1,480 placeable entities unplaced (47 persons); in secret-letter 58 of 374, of which a `move` statement brings 48 into play later and 10 are never moved by a `move` |
| No strategy on a phrase with several variants: cycling | the loader | 1 of 108 multi-variant phrases has no strategy (in `docs/work` fixtures); every story already writes it |
| No starting state: the first state listed | the loader | 207 entities declare `states:`, all with two or more, and all rely on list order |
| `lockable` with no `starts locked`/`unlocked`: locked on a door, unlocked otherwise | `story-loader/src/loader.ts:1946`, `new LockableTrait(kind === 'door' ? { isLocked: true } : {})` | 24 of 34 lockable entities say neither (18 doors, so locked; 6 others, so unlocked) |

The 10 secret-letter entities that are unplaced and never moved by a `move` are the ambiguity at its sharpest: from the text alone, a reader cannot tell a deliberate offstage prop from a forgotten placement.

## Decision (proposed)

### D1: Every `create` block names its kind (approved, 2026-10-04)

Every `create` block carries exactly one kind noun, as the analyzer already requires. A plain thing is written `a thing`. The kind noun comes first on its line, and traits follow it in the same comma list:

```chord
create the cracked bell
  a thing, scenery

  A bronze bell, cracked down one side, hangs from a beam.

create the leather satchel
  a thing, wearable
  aka bag

create the sorting machine
  a container
```

A block with no kind noun is a compile error, `analysis.missing-kind-noun`, with a help-catalog entry (ADR-358 D3): what a kind is, the list of kinds, and "`a thing` for anything that is not a room, door, person, container, supporter or region".

Trait defaults do not change. A thing is portable unless it says `scenery`.

Ruled with D1 (David, 2026-10-04, logged in `chord-grammar-changes.md`):
- `scenery, a thing` is an error: the kind comes first, so every block has the same shape and completion has one place to look.
- `a thing, scenery` and `a thing, plural` are accepted as written. `some` as an article is a separate grammar change; UPPS will show whether `a thing, plural` grates.
- `a thing, container` is an error whose message names the fix: "a container is already a kind of thing; write `a container`."
- A conditional kind (`a thing while …`) is refused, since a kind cannot come and go, on the same reasoning that refuses a conditional `proper`.

**D1 as built** (2026-10-05, plan `docs/work/adr-359-kind-line/plan-20261005-d1.md`, Phases 2 to 4):
- The analyzer raises `analysis.missing-kind-noun` at the block name and `analysis.kind-not-first` at the kind (`packages/chord/src/analyzer/entity/compositions.ts`, `checkKindLine`). `kind-not-first` was named during implementation and kept by David (2026-10-05). The rulings above are `analysis.thing-with-kind`, `analysis.kind-noun-needs-article` (a kind noun written bare) and `analysis.conditional-kind`.
- `thing` is the parent kind: `is a thing` and `must be a thing` hold for every entity except rooms and regions, while the IR records the specific kind (`packages/story-loader/src/kind-classification.ts`). The loader refuses an entity with no kind as a `LoadError`.
- `IR_FORMAT` is `story language 5`. `chord.ebnf` states the rule and adds a `KIND-NOUN` production. Both copies are now identical, and the stale `chord.ebnf:378` comment noted below is corrected. The hash is re-recorded under `3.6.0`; `CHORD_LANGUAGE_VERSION` becomes `4.0.0` at the publish.
- The codemod (`tools/migrate-kind-line/`, deleted after the cutover with the IR baselines, David 2026-10-05; it is in history at `1d842b3f5`) migrated 1,101 blocks in 292 files, including Chord embedded in TS, JS and Swift strings. `docs/work` fixtures were left as written, like ADR examples (David, 2026-10-05). Every story's test-tree report matched its baseline line for line.
- **Owed**: the help-catalog entry for `analysis.missing-kind-noun` (and for the other new codes) does not exist yet, because `packages/chord/src/help-catalog.ts` is not built (ADR-358 D3). ADR-358 AC-7, its catalog-coverage test, must include these codes when it is.

### D2: The kind is `thing`, not `object`

"Object" already means the action's object in clause bindings (ADR-327), and `catalog.ts` already calls the plain case a "plain thing".

### D3: What the change touches

- **`catalog.ts`**: `thing` joins `KIND_NOUNS`.
- **The parser**: no change. `composition = [ ARTICLE ] WORD` already reads `a thing` as a kind composition (`chord.ebnf`, the `composition` production).
- **The analyzer**: the new `analysis.missing-kind-noun` error; `analysis.unknown-kind-noun` stops firing for `thing`; `analysis.multiple-kind-nouns` already forbids `a thing, a container`.
- **The IR records `thing`** (ruled 2026-10-04, former Q-1). An empty `kinds` list would bring back what D1 removes from the source, absence deciding what an entity is, one layer down. The wire carries what the author wrote, and every consumer that asks "what kind is this?" (world-index, the lenses, the IDE's story index, completion's value dropdowns) reads one field instead of knowing that empty means thing.
  - **The loader** gains `case 'thing'`, building exactly what it builds today for an empty `kinds` (`story-loader/src/loader.ts`, `const kind = irEntity.kinds[0]?.name ?? null`). An entity with no kind becomes a load error, so a compiler bug can no longer pass as a plain thing. The baseline comparison below verifies the mapping.
  - **`IR_FORMAT`** moves from `story language 4` to `story language 5` (`packages/chord/src/ir.ts:24`). A new kind name is not a shape change, but a loader that predates it would fail inside its kind switch; the format gate (`loader.ts:305`) refuses it cleanly up front instead. It ships with 4.0.0.
  - **The IR's shape stays.** With exactly one kind and no conditional kinds, `kinds` could become a single field. That is a later tidy-up and does not ride with this change.
- **`chord.ebnf`**: the `create` production requires a kind composition; the `composition` comment ("article => kind noun; bare => trait") stays; `KIND-NOUN` gains `thing`. Both copies (`packages/chord/chord.ebnf`, and `website/public/chord.ebnf`, which already differs from it today).
- **The language version**: `3.6.0` → **`4.0.0`**, a major bump under ADR-257 D2, since every story with a plain thing stops compiling. Per standing practice, the version moves at publish, not at landing. D1 is approved now so the codemod and UPPS can be written in the new form, but 4.0.0 is not published until the rest of this ADR is ruled, so outside authors migrate once.
- **The migration**: all 1,028 blocks in one cutover (no back-compatibility). Mechanical: prepend `a thing, ` to the first composition line, or add an `a thing` line where a block has none. A codemod over the parser's spans, never a regex pass. The manual's 121 blocks move with it. ADR examples are records and are left as written.
- **Verifying the cutover**: the way the segment cutover was verified. Every story's `sharpee test` report matches its baseline line for line, before and after the codemod.

### D4: What this removes from ADR-358

- D2's "(plain object — no kind line)" entry, and the bullet "A choice that inserts nothing". The dropdown offers `a thing` like any other kind.
- In the protocol, `CompletionEntry.insert`'s "empty for a choice that inserts nothing". Every entry inserts text.
- AC-4's empty-`insert` clause, which becomes "`a thing`".
- David's original list "a person, a room, (object), scenery" reads "a person, a room, a thing, …". `scenery` stays in the dropdown only on the trait position after the kind (`a thing, ` → `scenery`).

The stateless service also gets simpler: after the kind line exists, every later position has an unambiguous context.

### D5: Doors

David's question assumed a door can exist only because an exit names it with `through`. It cannot today. The grammar already requires the door to be declared (`chord.ebnf`, the exit line's comment: "the door must be declared"), fernhill's folly door has its own block (`fernhill.story:202`, `create the folly door` / `a door`), and the analyzer refuses a `through` name that is not a door. So doors already carry an explicit kind, and this ADR changes nothing for them.

### D6: An entity created out of play says so (proposed)

An entity with no placement and no holder is created out of play, and today that is silent. The proposal: such an entity carries an explicit line saying it starts offstage, and a block with neither a placement, a holder nor that line is an error. The form is a grammar addition, Q-3; the working form is `starts offstage`, beside `starts in`. Migration: the 123 unplaced entities each gain the line, after a look at the 10 secret-letter cases (and their kin elsewhere) that no `move` brings in, since some may be bugs.

Finding for the Q-3 ruling (2026-10-05): the secret-letter entities that no `move` brings in are neither props nor bugs. They hold story state, like `Toresal` (day/night) and `the hanging` (pending → over), and they were never meant to be in the world. `starts offstage` would say the wrong thing about them. The form has to tell a state holder apart from an offstage prop. Cleaning up Secret Letter itself waits until the language and the IDE are working.

### D7: A phrase with several variants names its strategy (proposed)

Cycling is the silent default for a multi-variant phrase, while `select` and `landing` lists already require their strategy word. The proposal: a phrase with two or more variants must name its strategy, and omitting it is an error. Migration: 1 phrase, in a `docs/work` fixture; every story already writes the word.

### D8: A states line says which state it starts in (proposed)

Entity `states:` start in whichever is listed first, while state machines say `starts`. The proposal: a `states:` line on an entity names its starting state. The form is Q-4; `starts <state>` today accepts only the platform pairs (`locked`, `unlocked`, `closed`, `open`, `off`, `on`; `chord.ebnf`, `STATE-INIT`), so extending it to declared states is the obvious candidate. Migration: 207 entities, each gaining a `starts` naming its current first state, so no story changes behaviour.

### D9: `lockable` has one default, or none (proposed)

The same word starts locked on a door and unlocked on anything else (`story-loader/src/loader.ts:1946`), the one default Desktop's review questioned most. Two candidates, Q-5: require `starts locked` or `starts unlocked` on every `lockable` (24 entities migrate), or keep a default but one default for every kind (which changes 18 doors or 6 other things unless they migrate).

### D10: Block endings follow one rule (proposed, not counted)

Desktop's survey of `chord.ebnf` found the endings inconsistent rather than implied: `create`, `define action`, `select` arms and `sequence` steps close by dedent; most `define` blocks and every clause close with `end <word>`; `define phrase` needs `end phrase` but a phrase override inside a `create` block does not. This is not an absent default, so it falls outside the criterion strictly, but it is the same kind of rule an author cannot see. Whether to unify it, and which way, is Q-6. It has not been counted.

### D11: Defaults that stay, stated by the balloons

These stay as they are, and ADR-358's balloons state each where the author writes the word:
- `openable` starts closed and `switchable` starts off. `starts open` and `starts on` exist for the other case.
- `states:` without `, reversible` is forward-only, the safe default that keeps state analyzable.
- A counter starts at 0. (Desktop flagged unbounded counters as the case that breaks finite-state analysis; whether counters must declare bounds is left for a later ruling.)
- Exits are two-way, with `one-way` to opt out: the IF convention, ruled in ADR-234.
- Pronouns and `announce` are already "never an injected default".

Two silent rules are kept because they are the feel of the language: description is prose by position, a blank line being the only divider, and an article decides kind or trait (`a person` against `scenery`), which D1 makes uniform.

**To verify before any ruling** (named by Desktop's review, not yet checked against the code here): a header prose field that is exactly one word is read as a phrase reference; entity-owned clauses narrate only when the player is present while story-owned ones broadcast; a bare word in a condition resolves to a named condition or state before an action.

**A stale comment, not a decision**: `chord.ebnf:378` still describes `after entering it` on a region. The parser rejects it as `parse.removed-head-it`, pinned by `packages/chord/tests/adr-327-phase1.test.ts:218`. The comment should be corrected with the next grammar edit.

## Consequences

- Every Chord story and fixture in the repository changes in one commit, and every author's existing story stops compiling until migrated. `4.0.0` says so, once, for every decision approved here.
- The most common plain block, scenery, gets longer: 556 blocks go from `scenery` to `a thing, scenery`.
- A reader can tell every entity's kind from its block, and a forgotten kind line is an error, not a silent plain thing.
- The kind list in the dropdown and the guide is the whole `KIND_NOUNS` set, with nothing special-cased.

## Awkward cases (ruled with D1, 2026-10-04; see D1)

- **Scenery is most of the cost.** Over half the migrated blocks are scenery. `a thing, scenery` is the explicit form; the alternative of making `scenery` a kind noun of its own would contradict "traits stay in the same comma list" and make scenery containers or supporters impossible to say.
- **`a thing, plural`.** Plural things ("some coins") read oddly behind the singular article. `ARTICLE` already allows `a`, `an` and `the` (`chord.ebnf`); allowing `some` would be a further grammar change.
- **Is a container a thing?** In Chord's flat kind list it is not: a container is `a container`. An author who reasons "a box is a thing, and it holds things" will write `a thing, container`, which fails because `container` is a kind noun, not a trait. The diagnostic and the help entry need to say so.
- **Conditional kinds.** The grammar lets any composition carry `while <condition>`, kinds included; the analyzer's conditional gate is written for traits. `a thing while …` should be refused outright, since a kind cannot come and go.
- **Language version churn.** A major bump for one keyword is honest under ADR-257 D2, but it lands on outside authors as "your story no longer compiles". Pairing it with other breaking changes queued for 4.0.0, if any, would cost them one migration, not two.

## Session

2026-10-04, session 4d81b6, from David's proposal: "make every entity's kind explicit in Chord … Use `thing`, not `object` … This is a grammar change, so it goes through docs/architecture/chord-grammar-changes.md and needs my ruling before any code." Widened the same session after David shared Claude Desktop's survey of other implied syntax in `chord.ebnf` and the chord and story-loader packages ("yes, widen ADR-359 and run the counts"); the file keeps its first name so links to it hold.

## Open Questions

### Q-3: Is explicit offstage (D6) approved, and in what form?
- **Why it matters**: 123 entities migrate, and the form (`starts offstage`, or another) is new syntax. The 10 secret-letter entities no `move` brings in should be looked at either way.
- **Blocks**: D6.

### Q-4: Is an explicit starting state (D8) approved, and in what form?
- **Why it matters**: 207 entities migrate. Extending `starts <state>` to declared states reuses an existing form; another form would be new syntax.
- **Blocks**: D8.

### Q-5: Which way does `lockable` go (D9)?
- **Why it matters**: requiring `starts locked`/`unlocked` migrates 24 entities and removes the default; a single default for every kind changes behaviour for whichever side it disagrees with.
- **Blocks**: D9, and the loader line that holds the kind-dependent default.

### Q-6: Are block endings unified (D10), and which way?
- **Why it matters**: dedent everywhere or `end <word>` everywhere touches every block of one family across the corpus. It falls outside the strict criterion, so it may be ruled out of this ADR.
- **Blocks**: D10.

D7 (phrase strategy) has no question of its own beyond approval: it migrates one fixture phrase and needs no new form.
