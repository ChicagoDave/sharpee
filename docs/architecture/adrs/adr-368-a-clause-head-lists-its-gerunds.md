# ADR-368: A clause head lists its gerunds

**Status**: **ACCEPTED** (David, 2026-10-13, session 92017b: "accept", after `adr-review` returned 21/21 with one fold applied, D3's evidence line). Drafted the same day on `chord-4-0`, at Phase 3 of `docs/work/archive/chord-4-0/plan-20261013-chord-4-0.md`. The recommendation is David's Claude Desktop syntax review of 2026-10-05 (`docs/work/chord-syntax-review.txt`, "Diffuseness, measured"); David confirmed on 2026-10-13 that it is wanted at 4.0 ("yes"). The rules below are Claude's drafting, with reasons, for his review. No open questions.

**Scope**: `packages/chord` (the parser's clause-head reader, `chord.ebnf`, the EBNF pin in `tests/language-version.test.ts` re-recorded without a version bump), `docs/architecture/chord-grammar-changes.md` (one row), the Chord guide on sharpee.net (`website/src/app/chord/guide/behavior/on-and-after/content.mdx` teaches the list) and the IDE's Docs tab regenerated from it by `tools/ide/build-docs-tab.sh`. No story is rewritten by this record: the Secret Letter is on hold and fernhill is David's; the corpus effect is measured below and reported, not applied.

## Date: 2026-10-13

**Kind**: technical

## Parent

- **ADR-327 D1/D3** (actor-explicit clause heads): a head is `on|after <actor> <gerund>`, split syntactically with the last head word as the gerund. This record keeps that split and lets the gerund position hold a list.
- **ADR-362 D3/D4** (blocks fold for density): "nothing else folds" was ruled for `create` blocks, where each fold is another spelling of the same block; D4's rule that a fold is parsing only and compiles to the same IR is the rule this record applies to clause heads. ADR-362 D3 is not amended: it governs the lines of a `create` block, and a clause head is not one of them.
- **ADR-257** (language versioning): additive, so MINOR; the number moves at publish, not at landing (David, 2026-08-29), so the pin is re-recorded under the unpublished 4.0 surface with a dated comment.
- **ADR-358** (completion; DRAFT, unbuilt): must offer the list form when it lands. Not changed here.
- **Related**: the duplicate-clause gate (`analysis.duplicate-clause`, analyzer Phase C P3), which this record relies on unchanged (D2).

## Context — measured, not assumed

**One gerund per head costs a block per refusal.** A scenery thing that refuses everything but looking writes the same two-line body once per verb. The farmland view in the Secret Letter (`branch-stories/secret-letter/market-scenery.chord:393`) carries ten `on the player <gerund>` clauses whose bodies are all `refuse view-too-far`; the guards checking invites (`journey.chord:211`) carry ten whose bodies are all `refuse pieter-holds-you-back`. The review called these the worst cases.

**Measured across the corpus (2026-10-13, `branch-stories` and `stories`; the script groups clauses in one top-level block by kind, actor words, head tail and body text):**

| | Count |
|---|---|
| `on`/`after` clauses in the corpus | 2009 |
| clauses in a group that differs only by gerund | 401 |
| groups (heads after folding) | 128 |
| lines a fold would remove | 914 |

Every foldable clause is in the Secret Letter (20 of its files); fernhill and UPPS have none today, because they are prose stories with few scenery refusals. The review's own count for the Secret Letter alone was 278 of 875 clauses and about 930 lines; the two counts agree on the lines and differ on the clauses because the review counted a clause against any sibling and this count requires the whole head tail to match. The largest groups are the two worst cases (10 each), then eight blocks of 8: the patrolling guards, three posts, the wires, the shoppers, the awnings, and the gatehouse.

**What the parser does today** (`packages/chord/src/parser.ts`, `parseOnClause`, read 2026-10-13): the head words run from the clause word up to `while`, `during`, `anything`, a comma, or the end of the line; the last head word is the gerund and the words before it the actor. A comma after the head introduces a modifier: `once`, or `before`/`after` followed by a trait name; any other word after a comma is `parse.on-modifier`. So `on the player taking, touching` is an error today, and the comma position is free to mean a list.

**What the analyzer keys on** (`analyzer.ts`, `checkDuplicateClauses`, `buildOnClause`): a clause's identity is (kind, action, binding, role, actor) plus the condition for event verbs; its routing (interceptor or capability) and its admissible slots are looked up by its action. Everything is per clause and per action; nothing reads the head line as a unit. The loader (`story-loader/src/runtime/on-clauses.ts`) groups clauses by action and registers one dispatching interceptor per action, so it already consumes a flat list of single-action clauses.

## Decision

**D1 — A clause head may list gerunds, separated by commas, and means one clause per gerund.** `on the player taking, touching, pushing` is exactly `on the player taking`, `on the player touching` and `on the player pushing`, each with the same actor, the same role tail, the same `while` or `during` condition, the same modifiers and the same body. The list is legal on `on` and `after` heads, on explicit-actor heads and on the bare own-block head (`on taking, dropping` in a person's block). `on every turn` takes no list.

The head reads as it does today up to the first comma, `while`, `during`, `anything` or the end of the line; the last word before that is the first gerund and the words before it the actor. Then each `, <word>` is one more gerund, until a comma item that is a modifier (`once`, or `before`/`after` followed by a trait name) ends the list, or `anything`, `while`, `during` or the end of the line does. A gerund is one word, as it is today; a comma item of more than one word that is not a modifier is `parse.head-gerund`, which quotes the item and shows the one-word form. `and` and `or` are not list separators: `taking, touching or pushing` is `parse.head-gerund` quoting `or pushing`, with the fix-it `taking, touching, pushing`. Commas are how every other list in Chord is written (`aka`, compositions, `exits:`, `needs`), and the existing modifier words are reserved on a head already, so no new word is reserved and no gerund can be mistaken for a modifier.

```ebnf
head         = actor gerund { "," gerund }          (* ADR-368 D1: one clause
                                                        per listed gerund; the
                                                        list ends at a modifier
                                                        comma, `anything`,
                                                        `while`, `during` or EOL *)
             | gerund { "," gerund } ;
```

**D2 — A gerund repeated on one head is a parse error; a gerund repeated across heads is the duplicate-clause gate, unchanged.** `on the player taking, taking` is `parse.head-gerund-repeated`, quoting the word. `on the player taking, touching` beside a separate `on the player touching` on the same owner is `analysis.duplicate-clause` on the second, naming the folded head's line, because the expanded `touching` clause is a clause like any other. No new analyzer gate is needed.

**D3 — A listed head compiles to the same IR as the clauses it stands for.** Expansion happens in the parser: a head with *n* gerunds yields *n* `OnClause` nodes in the order written, in the position the folded clause occupies among its siblings, so a story compiled folded and unfolded has identical IR apart from spans (the test, below). The expanded nodes share one body statement list; the analyzer reads the AST and does not write into statements (a grep of `analyzer.ts` and `analyzer/` for assignments into `body`, `statements` or a statement's fields on 2026-10-13 finds only the start block's own IR array being built), so sharing is safe. If implementation finds a writer the grep missed, the parser clones the body instead and the IR rule stands. Each expanded node's `span` is the whole folded clause, as a single clause's is today, and it gains an `actionSpan` for its own gerund token, so a diagnostic about one action — an unknown gerund, `leaving` off a region, a slot the action lacks — lands on that word in the list rather than on the head. The `OnClause` AST and `IROnClause` wire shapes gain nothing else; `IR_FORMAT` does not move.

**D4 — Every expanded clause is checked as itself.** Routing (`interceptor` or `capability`), admissible slots, the region-only `leaving` rule, the own-block gate and the dispatch-verb bare-head refusal all apply per gerund, exactly as to an unfolded clause. So a list may mix a standard action with a `define action` verb, and a body that names a slot only one of them has is an error on the others — the same error the unfolded form gives. A list on a region block may name both crossing events (`after the player entering, leaving`), each binding to its own event as today.

**D5 — Nothing else about the head changes.** The actor is still the words before the first gerund; the role tail, `while`/`during`, `once` and the trait-ordering modifiers follow the list and apply to every clause it expands to. `on <gerund> it` stays `parse.removed-head-it`. The highlighter gains no keyword (a gerund is not coloured today), the IDE's lexer serves the real tokens (commas are already tokens) and its golden is unaffected, and the editors need no code change. Completion is ADR-358's.

### Before and after

The farmland view (`market-scenery.chord:393`), today — ten clauses, forty lines of them:

```chord
create the farmland view
  aka view, road, keep, city, meadows, meadow, farmlands, farmland, farms, farm, lords road, lords keep, commerce street, street, Miradan, Miradania, rolling pastures, pastures, pasture
  a thing, scenery
  in the Top of the Post

  The view is spectacular, but you don't have time to waste gawking.

  on the player taking
    refuse view-too-far
  end on

  on the player touching
    refuse view-too-far
  end on

  on the player pushing
    refuse view-too-far
  end on

  on the player pulling
    refuse view-too-far
  end on

  on the player climbing
    refuse view-too-far
  end on

  on the player entering
    refuse view-too-far
  end on

  on the player searching
    refuse view-too-far
  end on

  on the player attacking
    refuse view-too-far
  end on

  on the player smelling
    refuse view-too-far
  end on

  on the player listening
    refuse view-too-far
  end on
```

With the list (not yet valid Chord):

```chord
create the farmland view
  aka view, road, keep, city, meadows, meadow, farmlands, farmland, farms, farm, lords road, lords keep, commerce street, street, Miradan, Miradania, rolling pastures, pastures, pasture
  a thing, scenery
  in the Top of the Post

  The view is spectacular, but you don't have time to waste gawking.

  on the player taking, touching, pushing, pulling, climbing, entering, searching, attacking, smelling, listening
    refuse view-too-far
  end on
```

The guards checking invites (`journey.chord:211`), where a trait already carries one of the refusals and the block carries ten more, with the list (not yet valid Chord):

```chord
create the guards checking invites
  aka guards, guard, lord's guards, lords guards, men, man, alert guards
  a person, plural
  scenery
  held-back-by-pieter
  in the Southern Gate

  The guards are wearing polished mail underneath tabards decorated with the
  Toresal coat of arms, and carrying long spears. They look alert and ready
  for trouble.

  on the player talking, attacking, touching, pushing, pulling, taking, searching, listening, showing, giving
    refuse pieter-holds-you-back
  end on
```

A list with a condition and a modifier, on a bare own-block head, and a region reacting to both crossings (not yet valid Chord):

```chord
create Marguerite
  a person
  starts in the Counting House

  The senior clerk, and she knows it.

  on taking, dropping while the Counting House is closed, once
    phrase she-waits-for-morning
  end on

create the Grounds
  a region

  after the player entering, leaving
    phrase gravel-underfoot
  end after
```

The errors (messages name no ADR):

```
on the player taking, touching or pushing
  → parse.head-gerund: "Expected one action word after the comma, not `or pushing`.
    List the actions with commas: `on the player taking, touching, pushing`."

on the player taking, taking
  → parse.head-gerund-repeated: "`taking` is listed twice on this head."
```

## Consequences

- **A refusal is written once.** The 401 corpus clauses that differ only by gerund sit in 128 groups, so they become 128 heads when their authors choose to fold them; 914 lines go. No story is rewritten by this record (Scope); when the Secret Letter port resumes, the fold is available to it.
- **One grammar surface, one IR.** The parser expands, so the analyzer, the loader, the world index, the claims cone (which matches `has been <participle>` against a thing's clause gerunds) and every IR consumer see single-action clauses as before. No consumer learns the list.
- **The duplicate gate keeps its meaning.** A folded head cannot hide a masking clause: each expanded clause is keyed as today, and a repeat inside one head is caught earlier, at parse.
- **Spans are the one visible difference.** A diagnostic about one action in a list points at that word (`actionSpan`); a diagnostic about the clause as a whole points at the folded clause. The IR-equality test strips spans, as ADR-362's corpus fold test does.
- **The language surface changes without a version bump.** The pin in `language-version.test.ts` is re-recorded with a dated comment under the unpublished 4.0 surface (ADR-257 as amended 2026-08-29); the grammar log gains one row.
- **A gerund that is not an action is still the error it is today**, found on the expanded clause by the analyzer or the loader (`isConsultedGerund`), now at the word's own span.

## Acceptance criteria

- **AC-1 (D1)**: `on the player taking, touching, pushing` with a body compiles to three `IROnClause` entries with `action` `taking`, `touching`, `pushing`, in that order, identical in every other field.
- **AC-2 (D1)**: the list works on `after`, on a bare own-block head in a person's block, with a role tail (`on the player giving, showing anything as the recipient`), with `while` and `during`, and with `, once` and `, before <trait>` after it — each parsed to the same clauses the unfolded forms give.
- **AC-3 (D1)**: `taking, touching or pushing` is `parse.head-gerund` with the comma fix-it; `taking, touching the key` (a two-word item) is `parse.head-gerund`; `on every turn, taking` is `parse.on-modifier` as today.
- **AC-4 (D2)**: `on the player taking, taking` is `parse.head-gerund-repeated`; a folded head and a separate clause sharing a gerund on one owner is `analysis.duplicate-clause` on the later one, citing the earlier line.
- **AC-5 (D3)**: a corpus test compiles every story in `branch-stories` and `stories` as written, then with every foldable group mechanically folded (the groups the Context measured), and asserts the IR is identical apart from spans. The folded sources are produced by the test, never written to the stories.
- **AC-6 (D3)**: an unknown gerund in the middle of a list reports at that word's span, not the head's.
- **AC-7 (D4)**: a list mixing a standard action and a `define action` verb compiles to one `interceptor` and one `capability` clause; a body naming the dispatch verb's slot is an error on the standard-action clause only, at the slot's span.
- **AC-8 (D4)**: `after the player entering, leaving` on a region binds both crossing events; the same head on a thing is the region-only error for `leaving` at its span.
- **AC-9 (Scope)**: `chord.ebnf` carries the `head` production above and the pin is re-recorded; `chord-grammar-changes.md` has the row; the guide's on-and-after page shows a list and the Docs tab is regenerated; UPPS compiles with one folded block and its tree passes under `sharpee test`; the chord and story-loader suites are green and the Dungeo chain is unchanged (no stdlib or world-model change is made, so one run of the chain is the confirmation).

## Session

Drafted in session 92017b (2026-10-13) on branch `chord-4-0`, Phase 3 of the Chord 4.0 plan. The measurement script is session-local (`measure-gerund-fold.py` in the session scratchpad); AC-5's corpus test replaces it as the durable record.
