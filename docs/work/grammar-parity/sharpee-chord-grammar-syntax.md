# Sharpee ↔ Chord: grammar and action definition syntax

> Input document for **ADR-266** (umbrella) and its children **ADR-267** (pattern constructs) and
> **ADR-268** (rule ordering). Complete detailing of Sharpee's grammar/action definition surface and the
> Chord equivalent — current where one exists, proposed where one does not.
>
> **Proposed Chord syntax in this document is a proposal, not a decision.** Every row marked *proposed*
> is for ADR-267/268 to rule on, and each would require a `docs/architecture/chord-grammar-changes.md`
> entry plus an ADR-257 version bump. Written 2026-07-25, session 75452d.

## 0. The boundary

ADR-266 D8 fixes the line this document is organized around:

> **grammar defs (Chord or Sharpee) ↔ Traits/Behaviors (Sharpee)**

- **Part A — grammar definition** is **dual-surface**. Every construct below should be expressible in
  both languages. Where Chord cannot express one, that is a gap to close, not a boundary.
- **Part B — action definition** is **not** dual-surface in the same way. Traits, behaviors, capability
  dispatch, and the four-phase lifecycle are Sharpee-only. Chord's `define action` declares a *new*
  action's grammar and refusal surface; it does not and will not define trait or behavior code.
- **Reference is not definition.** A grammar def may name a trait as a scope filter
  (`ScopeBuilder.hasTrait`, `.matching({portable: true})`) without declaring one. Filtering on a trait is
  grammar-side; declaring a trait is not.

Source of truth for this document: `packages/if-domain/src/grammar/grammar-builder.ts`,
`packages/parser-en-us/src/english-pattern-compiler.ts`, `packages/parser-en-us/src/grammar.ts`,
`packages/chord/src/ast.ts`, `docs/reference/chord.ebnf`.

### 0.1 Counting note — read this before using any number here

Earlier drafts of ADR-266 counted **call sites in `grammar.ts`** and reported them as rule counts. That
is wrong in both directions: several call sites sit inside loops (one `.withDefaultSemantics()` line
generates 120 rules), and `.forAction()` registers a verbs × patterns cross-product.

All counts below are **registered rules**, obtained by running `defineGrammar` against a real
`EnglishGrammarEngine` and reading `getRules()`:

```
TOTAL REGISTERED RULES: 422        distinct actions: 56
rules with semantics:   154        rules with a typed slot: 15
rules with alternation:  19        rules with optional:      3
priority histogram: {90:37, 95:12, 96:1, 100:316, 101:1, 105:41, 110:14}
```

Two corrections follow from this and are carried through the document:

- **Semantic defaults are the second-largest construct, not the smallest.** 154 rules, not 2. They are
  how `direction` and `position` reach the going and hiding actions. **Required.**
- **Priority is smaller than it looked.** 316 of 422 rules sit at the default 100; only **106 rules
  deviate**. The specificity experiment (A7) has a much better chance than a "150 rules" framing
  suggested.

---

## Part A — Grammar definition

### A1. Pattern string syntax

Sharpee patterns are strings compiled by `EnglishPatternCompiler`
(`english-pattern-compiler.ts:22-140`). Five constructs:

| # | construct | Sharpee | meaning | Chord today | Chord proposed |
| --- | --- | --- | --- | --- | --- |
| A1.1 | literal word | `take` | must match exactly | `take` | — (parity) |
| A1.2 | slot | `:target` | entity slot, vocabulary-resolved | `:target` / `(target)` — two spellings | **`the target`** — RULED, A1.2a |
| A1.3 | greedy slot | `:message...` | consume until next element or end | **none** | *proposed* |
| A1.4 | alternation | `in\|inside` | any one alternate matches | **none** | *proposed* |
| A1.5 | optional | `[carefully]` | element may be absent (confidence penalty) | **none** | *proposed* |

Combinations are legal: `[optional] :slot...` (optional greedy slot), `[in|inside]` (optional
alternation).

**Live usage in the standard grammar:** alternation 19 rules, optional 3 rules, greedy slot — used by
raw-text slots (ADR-080).

### A1.2a Chord already has two slot spellings — and the colon is the imported one

Chord marks a slot **two different ways** depending on which construct you are in:

| construct | EBNF | slot spelling |
| --- | --- | --- |
| `define verb` | `pattern = { WORD \| "(" WORD ")" }` — `chord.ebnf:372` | `put (something) on (something)` |
| `define action` grammar block | `pattern-line = ( WORD \| ":" WORD )+` — `chord.ebnf:408` | `pet :animal` |

Same concept, two notations, in the same language. The colon form is the **imported** one — it is
Sharpee's pattern-string syntax carried into `define action`, and it is the only place in Chord where a
leading colon means anything. Everywhere else in the very same block the slot is referred to in plain
English:

```chord
define action petting
  grammar
    pet :animal              # ← colon here
  the animal must be reachable      # ← but "the animal" here
  refuse without animal: pet-what   # ← and bare "animal" here
```

Three spellings of one slot inside eight lines.

#### RULED (owner, 2026-07-25): the definite article — `the animal`

Chord slots are written **`the <name>`**. The colon is dropped, the `define verb` parens are dropped,
and both constructs use the same spelling:

```chord
define action petting
  grammar
    pet the animal
    pat the animal
  the animal must be reachable
  refuse without animal: pet-what

define verb hang or hook means put the something on the something
```

The block now reads as one English sentence set: `pet the animal` / `the animal must be reachable`.
Three spellings collapse to one — the "reduce to two" outcome that parens would have given was rejected.

**Consequences for ADR-267:**

- The slot *name* remains bare where it is already bare (`refuse without animal:`, phrase interpolation).
  `the animal` is the spelling **in a pattern**, not a rename of the slot.
- `define verb`'s `(something)` is removed. Its EBNF `pattern` rule and `define action`'s `pattern-line`
  rule converge on one production — a simplification of the grammar, not an addition.
- **Ambiguity check required before implementation:** a pattern needing a *literal* `the` becomes
  unwriteable. IF parsers strip articles before matching, so this is expected to be a non-issue, but
  ADR-267 must confirm it against all 422 rules rather than assume.
- Every example below uses the ruled spelling.

### A1.2b The slot-name namespace — what `the <name>` makes reserved

Slot names and entity names already share the `the <name>` referring syntax — `the animal must be
reachable` is today's Chord, not something D15 introduced. D15 changes only how a slot is written **in a
pattern line**; resolution is untouched. What it changes is *visibility*: an author reading
`pet the animal` can now see that `animal` is claimed. The list below is therefore documentation of an
existing behavior, not mitigation of a new one.

**The complete list — 17 distinct slot names across all 422 rules:**

| slot | rules | actions |
| --- | --- | --- |
| `target` | 112 | attacking, climbing, cutting, digging, drinking, examining, +15 |
| `item` | 62 | drinking, dropping, eating, giving, inserting, putting, +6 |
| `recipient` | 17 | asking, giving, showing, telling, throwing |
| `device` | 14 | switching_off, switching_on |
| `container` | 10 | exiting, inserting, opening, putting, removing |
| `door` | 8 | closing, opening, unlocking |
| `portal` | 7 | entering |
| `topic` | 5 | asking, telling |
| `tool` | 4 | cutting, digging, opening, removing |
| `weapon` | 4 | attacking |
| `vehicle` | 4 | entering, exiting |
| `key` | 2 | locking, unlocking |
| `supporter` | 2 | putting |
| `hook` | 1 | putting |
| `object` | 1 | cutting |
| `location` | 1 | digging |
| `destination` | 1 | putting |

Nine are names a story would plausibly give a real object: `door`, `key`, `container`, `tool`, `weapon`,
`vehicle`, `device`, `supporter`, `hook`. A story with a door called "door" is the default case, not an
edge case. (`target`, at 112 rules the most-used slot, is among the *safest* — few stories name an
object "target".)

#### Verified resolution behavior (`analyzer.ts:3149-3193`)

`resolveRefValue` resolves a `the <name>` reference in this order:

```
it → match → player → true/false → its <field>
   → resolveScopedWords   (scope.fields, then scope.slots)      ← slots resolve here
   → resolveEntityId                                            ← entities resolve here
   → symbol
```

Three properties follow, all confirmed in code rather than assumed:

1. **Slots are scoped — there is no external naming conflict.** `scope.slots` is populated per-action in
   `buildAction` (`analyzer.ts:1239`) and is `null` outside an action or trait clause. Story-level code —
   descriptions, `on opening it`, timelines — never consults slot names. An entity named `door` is safe
   everywhere except inside a block that declares a `door` slot.
2. **Slots shadow entities, single-word only.** Inside a scope with slots, the slot wins
   (`analyzer.ts:3156`, before `resolveEntityId`). But `resolveScopedWords` checks slots only when
   `rawWords.length === 1` (`:3155`), so a multi-word entity name — `the brass key` — never reaches the
   slot path. Collisions require a *single-word* entity name matching a slot name in the same block.
3. **The shadow is silent.** The analyzer has `analysis.unknown-slot` for a constraint naming a
   non-existent slot, but emits nothing when a slot shadows an entity. The entity simply becomes
   unreferenceable inside that block.

**Open — for ADR-267:**

1. **Does the silent shadow deserve a diagnostic?** Property 3 is the only genuine defect here. A
   warning naming both the slot and the shadowed entity would make the behavior predictable at
   negligible cost. Slot-first resolution itself should not change — it is correct and existing blocks
   depend on it.
2. **Publish the 17 names.** They belong on the `define action` page so an author can see what the
   standard grammar has claimed. This is a documentation obligation regardless of (1).
3. **Not needed:** an author-facing escape hatch. Renaming an entity to `target-thing` was considered
   and is unnecessary given properties 1 and 2 — the exposure is single-word names inside one action
   block, and the author controls the slot name in any action they write.
4. **Under option (iv)** the list becomes *changeable* — an author editing the standard grammar can
   rename `target` in their copy. Whether that is a feature or a footgun depends on ADR-270's override
   model.

**A1.3 greedy slot — proposed Chord.** Sharpee's `:message...` suffix is punctuation-heavy for Chord's
idiom. Two candidates:

```chord
grammar
  write the rest as the message   # (a) English-shaped, consistent with the A1.2a ruling
  write the message, greedily     # (b) modifier form
```

Sharpee's `...` suffix is not available under the ruled spelling — `the message...` reads poorly and
reintroduces punctuation the ruling removed. Both candidates above are English-shaped.

**A1.4 alternation — proposed Chord.** Chord already uses `or` for verb alternation in `define verb`
(`define verb hang or hook means …`), so `or` is the idiomatic word — but bare `or` inside a pattern
line is ambiguous with a literal word `or`. Candidates:

```chord
grammar
  look in or inside the target   # (a) English word — now unambiguous, see below
  look in|inside the target      # (b) Sharpee-identical; pipe is new punctuation for Chord
  look in the target             # (c) no construct — one pattern line per alternate
  look inside the target
```

**The A1.2a ruling improves (a)'s odds.** Bare `or` inside a pattern was previously ambiguous with a
literal word `or`; with slots now written `the <name>`, a pattern line's structure is clearer and `or`
between literals has a good chance of parsing unambiguously. It also matches `define verb hang or hook`,
where `or` already means alternation. ADR-267 should test (a) first.

(c) needs no language change and is what a generator would emit today, but it multiplies 19 rules into
~45 lines and loses the fact that they are one rule — which matters once ordering (A7) is explicit,
because the alternates must not be orderable relative to each other.

**A1.5 optional — proposed Chord.** Sharpee's `[word]` has no Chord counterpart and brackets are unused
in Chord patterns:

```chord
grammar
  look [carefully] at the target  # (a) Sharpee-identical bracket
  look at the target              # (b) English-shaped modifier line
    optionally carefully
```

**Recommendation for ADR-267:** (a) in all three cases. Sharpee's pattern syntax is already terse and
readable, these are the constructs an IF author most likely recognizes from other systems, and keeping
one pattern-string dialect across both surfaces means the migration is mechanical and the docs are
shared. The cost is importing three pieces of punctuation into a language that has deliberately
avoided it.

### A2. Pattern-centric builder — `PatternBuilder`

Entered via `grammar.define(pattern)`. Every method (`grammar-builder.ts:126-288`):

| method | purpose | Chord today | Chord proposed |
| --- | --- | --- | --- |
| `.define(pattern)` | start a pattern rule | `grammar` block line | parity |
| `.mapsTo(actionId)` | target action | *implicit* — the enclosing `define action` | see note |
| `.where(slot, constraint)` | scope constraint | `the <slot> must be <req>` | parity (but see A5) |
| `.withPriority(n)` | resolution priority | **none** | A7 |
| `.text(slot)` | mark slot TEXT | **none** | A4 |
| `.instrument(slot)` | mark slot INSTRUMENT | **none** | A4 |
| `.number(slot)` | mark slot NUMBER | **none** | A4 |
| `.ordinal(slot)` | mark slot ORDINAL | **none** | A4 |
| `.time(slot)` | mark slot TIME | **none** | A4 |
| `.direction(slot)` | mark slot DIRECTION | **none** | A4 |
| `.manner(slot)` | mark slot MANNER | **none** | A4 |
| `.adjective(slot)` | *deprecated* → `fromVocabulary` | **none** | not proposed |
| `.noun(slot)` | *deprecated* → `fromVocabulary` | **none** | not proposed |
| `.quotedText(slot)` | mark slot QUOTED_TEXT | **none** | A4 |
| `.topic(slot)` | mark slot TOPIC | **none** | A4 |
| `.fromVocabulary(slot, category)` | mark slot VOCABULARY + category | **none** | A4 |
| `.withSemanticVerbs(map)` | verb → semantic props | **none** | A6 |
| `.withSemanticPrepositions(map)` | preposition → spatial relation | **none** | A6 |
| `.withSemanticDirections(map)` | direction → normalized direction | **none** | A6 |
| `.withDefaultSemantics(defaults)` | default semantic props | **none** | A6 |
| `.build()` | register | dedent | parity |

**Note on `.mapsTo`.** This is the one place the two surfaces differ *structurally* rather than by
capability. Sharpee's pattern-centric form states its target explicitly per rule; Chord's grammar block
is always inside a `define action`, so the target is the enclosing action. For the standard grammar
migration this matters: 154 `.define().mapsTo()` rules must group by target action to become Chord.
That grouping is mechanical (the action id is on every rule) but it means the migrated Chord source is
organized action-first, which is the shape A3 already has — and arguably better than `grammar.ts`.

**Consequence for ADR-269:** if a Chord grammar file must ever map a pattern to an action *without*
declaring that action (e.g. adding `snag the item` to standard `if.action.taking`), a target-naming form
is needed. That is the same requirement Gap 3(b) and `define verb` were reaching for.

### A3. Action-centric builder — `ActionGrammarBuilder` (ADR-087)

Entered via `grammar.forAction(actionId)`. This is the shape Chord's `define action` already matches
conceptually — *an action owns its patterns*.

| method | purpose | Chord today | Chord proposed |
| --- | --- | --- | --- |
| `.forAction(id)` | start an action's grammar | `define action <name>` | parity |
| `.verbs([...])` | verb aliases; each generates a pattern | one pattern line per verb | A3.1 |
| `.pattern(tpl)` | one pattern template, combined with each verb | pattern line | parity |
| `.patterns([tpl,...])` | N templates × M verbs | N pattern lines | parity |
| `.directions(map)` | standalone direction patterns, no verb prefix | **none** | A3.2 |
| `.where(slot, c)` | constraint applied to all generated patterns | `the <slot> must be <req>` | parity |
| `.withPriority(n)` | priority for all generated patterns | **none** | A7 |
| `.withDefaultSemantics(d)` | defaults for all generated patterns | **none** | A6 |
| `.slotType(slot, type)` | slot type for all generated patterns | **none** | A4 |
| `.build()` | register the verbs × patterns cross-product | dedent | parity |

**A3.1 verb-list shorthand.** Sharpee generates the cross-product; Chord writes it out:

```typescript
grammar.forAction('if.action.examining')
  .verbs(['examine', 'x', 'inspect', 'check', 'view', 'observe'])
  .pattern(':target').build();          // → 6 patterns
```

```chord
define action examining
  grammar
    examine the target
    x the target
    inspect the target
    check the target
    view the target
    observe the target
```

**Recommendation: no language change.** Chord's explicitness is a feature, the expansion is trivial,
and a shorthand would need its own cross-product semantics. 28 actions expand to ~90 pattern lines
across the whole standard grammar — acceptable. *This removes one of D12′'s seven required constructs.*

**A3.2 direction map.** One use (`if.action.going`), but it is 12+ directions × aliases with no verb
prefix — ~30 bare pattern lines if written longhand, and they are conceptually one rule.

```typescript
.directions({ north: ['north','n'], south: ['south','s'], … })
```

Longhand Chord works today (`north`, `n`, `south`, … as pattern lines). Whether it deserves a construct
is an ergonomics call for ADR-267; the migration does not require one.

### A4. Slot types — `SlotType` (ADR-082)

Thirteen values (`grammar-builder.ts:11-58`). Chord has exactly one: the untyped `the <name>` slot, which is
`ENTITY`.

| SlotType | matches | builder method | live uses | needed for migration? |
| --- | --- | --- | --- | --- |
| `ENTITY` | entity via vocabulary (default) | — | ~all | already parity |
| `INSTRUMENT` | entity, marked as instrument | `.instrument()` | 10 | **yes** |
| `TOPIC` | conversation topic, 1+ words | `.topic()` | 5 | **yes** |
| `TEXT` | raw text, single token | `.text()` | 0 | no |
| `TEXT_GREEDY` | raw text until delimiter | `:slot...` | (ADR-080) | see A1.3 |
| `DIRECTION` | cardinal/ordinal direction | `.direction()` | 0 | no |
| `NUMBER` | integer, digits or words | `.number()` | 0 | no |
| `ORDINAL` | 1st, first, … | `.ordinal()` | 0 | no |
| `TIME` | 10:40, 6:00 | `.time()` | 0 | no |
| `MANNER` | manner adverb → `intention.manner` | `.manner()` | 0 | no |
| `QUOTED_TEXT` | text in double quotes | `.quotedText()` | 0 | no |
| `VOCABULARY` | word from a story category | `.fromVocabulary()` | 0 | no |
| `ADJECTIVE` / `NOUN` | *deprecated* | — | 0 | no — do not port |

**Only two are load-bearing for the migration** (`INSTRUMENT` ×10, `TOPIC` ×5). The other nine are
capability Chord could gain later without blocking ADR-269.

**Proposed Chord — slot typing.** Chord's idiom is a declarative line under the grammar block, matching
`the <slot> must be <requirement>`:

```chord
define action unlocking
  grammar
    unlock the target with the key
  the key is an instrument           # (a) English-shaped, matches `must be` idiom
  the target must be reachable

# or (b) inline in the pattern:
    unlock the target with the key as instrument
```

(a) keeps pattern lines clean and groups slot metadata with scope metadata, which is where it belongs
conceptually — both are statements *about a slot*. Recommended.

### A5. Scope constraints — `ScopeBuilder`

Nine methods (`grammar-builder.ts:77-92`), reached via `.where(slot, scope => …)`, chainable.

| method | meaning | Chord equivalent |
| --- | --- | --- |
| `.visible()` | entity is visible | `must be visible` |
| `.touchable()` | entity is reachable | `must be reachable` |
| `.carried()` | entity is held by actor | `must be held` |
| `.nearby()` | entity is in scope nearby | `must be nearby` |
| `.kind(kind)` | entity is of a kind | *proposed* |
| `.hasTrait(traitType)` | entity has a trait | *proposed — reference, not definition* |
| `.matching(constraint)` | property or predicate match | *proposed, partially* |
| `.orExplicitly(ids)` | union with explicit entity ids | *not proposed* |
| `.orRule(ruleId)` | union with another rule's scope | *not proposed* |

**Critical state of play.** `.where()` has **0 live uses in the standard grammar**. Rule-level
`.hasTrait()` was deleted as a parse-time no-op (ADR-231 D2a) and trait refusal moved into each action's
`validate()`. Meanwhile Chord's `the <slot> must be <requirement>` **parses, analyzes, reaches the IR,
and is read by nothing** (ADR-266 D11).

So this row is the strangest in the document: **both surfaces have the construct and neither uses it.**
Sharpee's is live but unexercised; Chord's is exercised but dead. ADR-271 fixes the Chord half. Whether
the migrated standard grammar should *start* using scope constraints — pushing trait-based refusal back
from `validate()` to parse time — is a separate question and explicitly **not** proposed here; ADR-231
D2a decided the opposite and this document does not reopen it.

**Requirement vocabulary is currently unvalidated.** `analyzer.ts:1242` checks only that the slot name
exists; `the animal must be levitating` compiles clean. ADR-271 must close that set. Proposed initial
set: `visible`, `reachable`, `held`, `nearby` — the four with direct `ScopeBuilder` counterparts.

**`.matching()` and the boundary.** `.matching({portable: true})` and `.hasTrait(TraitType.PORTABLE)`
name trait data from grammar. Per §0 this is *reference*, legal on the grammar side. Any Chord form must
preserve the asymmetry — filter on a trait, never declare one. A candidate spelling that reads as
filtering rather than declaring:

```chord
  the item must be portable          # reads as a scope filter, not a trait declaration
```

### A6. Semantics — `SemanticProperties` / `SemanticMapping`

Four builder methods, ~2 live uses. `SemanticProperties` carries `manner`, `spatialRelation`,
`direction`, `implicitPreposition`, `implicitDirection`, plus open custom properties.
`SemanticMapping` maps verb/preposition/direction variants onto them, or computes them from a match.

| method | call sites | **rules generated** | needed for migration? |
| --- | --- | --- | --- |
| `.withDefaultSemantics(d)` | 2 | **154** | **yes — required** |
| `.withSemanticVerbs(map)` | 0 | 0 | no |
| `.withSemanticPrepositions(map)` | 0 | 0 | no |
| `.withSemanticDirections(map)` | 0 | 0 | no |

**Correction — this is required, not marginal.** The two call sites are loop bodies:

```typescript
// going: 5 verbs × 12 directions × 2 aliases = 120 rules   (grammar.ts:764-773)
.withDefaultSemantics({ direction: canonical })

// hiding (ADR-148 concealment): 10 verb phrases = 10 rules  (grammar.ts:1106-1114)
.withDefaultSemantics({ position })
```

Semantic defaults are **how data reaches the action** — `direction` for going, `position` for hiding,
delivered via `extras`. Without them `go north` cannot tell the going action which way. There is no
re-expression that does not invent an equivalent mechanism.

**Revised recommendation: port `withDefaultSemantics`; do not port the three `withSemantic*` mapping
methods** (0 uses, and `SemanticMapping.compute` is a function — unportable to a declarative language by
construction). A Chord form need only attach static key/value defaults to a pattern:

```chord
define action going
  grammar
    go north
      means direction north          # (a) English-shaped
    walk north
      means direction north
```

This is verbose across 120 rules, which argues for pairing it with the direction-map construct (A3.2)
after all — one `directions` block could carry both the aliases and their semantic direction, collapsing
120 rules into ~12 readable lines. **A3.2's "dropped" recommendation is reversed on this evidence.**

### A7. Priority and ordering

**Smaller than it first appeared: 316 of 422 rules sit at the default priority 100; only 106 deviate.**
Full histogram: `{90:37, 95:12, 96:1, 100:316, 101:1, 105:41, 110:14}`. Chord has no notation.
Sharpee's convention (`grammar.ts:5-9`):

| band | meaning |
| --- | --- |
| 100+ | specific/phrasal patterns that must outrank broader ones |
| 100 | standard patterns |
| 95 | synonyms/alternatives |
| 90 | abbreviations |
| 150 / 140 | story grammar / Chord `define action`, bare-verb forms (`loader.ts:1122,1134`) |

**The I7 bar is relational, not numeric** — "order definitions," rules *listed before* other rules.
Transcribing bare integers into Chord imports an engine detail as author syntax and would make the
migrated source read like a config file. Three candidate models for ADR-268:

```chord
# (a) numeric — minimal delta, worst readability
  look at the target
    priority 95

# (b) relational — I7-shaped
  look at the target
    wins over look the target

# (c) implicit specificity + explicit override only where needed
  look at the target                   # more literal words ⇒ wins automatically
  look the target
```

**Recommendation: (c) with (b) as the escape hatch.** The 90/95/100 bands correlate strongly with
specificity — phrasal beats standard beats synonym beats abbreviation is *already* roughly "more
literal tokens wins." With only 106 of 422 rules deviating from the default, the experiment is
well-posed: if specificity ordering reproduces current resolution, priority disappears from the author
surface entirely and only genuine ties need (b). The 37 rules at 90 are abbreviations (`n`, `x`, `i`) —
*shorter* than what they compete with, so pure token-count specificity would rank them wrong. That is
the one band needing explicit treatment, and it may be expressible as a general rule (an abbreviation
loses to its expansion) rather than per-rule ordering.

**This is ADR-268's central experiment and should be run before its design is fixed:** compute
specificity-only ordering over the current rule set and diff the resolution against today's priorities.
If the diff is small, (c) wins decisively; if not, (b).

---

## Part B — Action definition

### B1. Chord `define action` — the full current surface

From `chord.ebnf:399-408` and `ast.ts:780-802`:

```
define-action  = "define" "action" WORD NL action-line* ;   (* dedent-terminated *)
action-line    = "grammar" NL >>> { pattern-line }
               | "the" WORD "must" "be" WORD NL             (* scope constraint, no colon *)
               | must-line                                  (* `<subj> must <pred>: <key>` *)
               | score-line                                 (* `score <name> worth N` *)
               | "refuse" "without" WORD ":" phrase-key NL
               | "refuse" "when" condition ":" phrase-key NL
               | "otherwise" "refuse" phrase-key NL
               | "phrases" LOCALE NL >>> { phrase-entry }
               | statement ;
pattern-line   = ( WORD | ":" WORD )+ [ "→" token { token } ] NL ;
```

AST fields (`DefineAction`): `patterns`, `constraints`, `musts`, `refusals`, `otherwise`, `scores`,
`phrases`, `body`.

Chord constructs with **no Sharpee grammar counterpart** — these are action-definition surface, not
grammar, and correctly live outside Part A:

| Chord | what it is | Sharpee equivalent |
| --- | --- | --- |
| `→ each <cardinality>` | pattern cardinality expansion | multi-object handling (ADR-080), engine-side |
| `refuse without <slot>: <key>` | refusal on unfilled slot | action `validate()` |
| `refuse when <cond>: <key>` | conditional refusal | action `validate()` |
| `otherwise refuse <key>` | dispatch-miss phrase | capability-dispatch fallback (ADR-090) |
| `<subj> must <pred>: <key>` | positive requirement | action `validate()` |
| `score <name> worth N` | action-owned score | `awardScore` (ADR-129) |
| `phrases <locale>` | action's message block | `*-messages.ts` + lang-en-us |
| `body` statements | what the action does | action `execute()`/`report()` |

### B2. Sharpee action definition — and why it is not dual-surface

A standard action is a directory (`stdlib/src/actions/standard/<name>/`) with `<name>.ts`,
`-data.ts`, `-events.ts`, `-messages.ts`, `-types.ts`, implementing the four phases
(validate/execute/report/blocked, ADR-051) and exporting an `ActionLifecycleDescriptor`
(ADR-228):

```typescript
interface ActionLifecycleDescriptor {
  actionId: string;              // e.g. IFActions.TAKING
  slots: EntitySlotSpec[];       // consultation order: direct → indirect/instrument → implicit
  contracts?: LifecycleContracts;
}
```

`EntitySlotSpec.resolve(context)` and `.seedData(context, entity, multiObjectItem?)` are **functions
consulting world state**. That is the wall: the descriptor is not declarative data, and porting it would
drag the lifecycle engine, interceptor ordering, and trait consultation into the author language —
exactly ADR-265's rejected option B.

**So B2 is Sharpee-only, permanently.** Chord's `define action` creates new `chord.action.*` actions with
declarative refusal ladders and bodies; it does not and will not express a standard action's
implementation. The parity claim of ADR-266 is confined to Part A.

---

## Part C — Required-construct summary

Consolidating the recommendations above against ADR-266 D12′'s seven:

| construct | D12′ said | this document recommends | **rules affected** |
| --- | --- | --- | --- |
| semantic defaults (A6) | required (2 rules) | **required** — carries `direction`/`position` to the action | **154** |
| ordering (A7) | required (150 rules) | **required**, but likely *implicit* (c) | **106** deviating |
| alternation (A1.4) | required | **required** | 19 |
| typed slots (A4) | required | **required, narrowed to 2 types** — `instrument`, `topic` | 15 |
| direction map (A3.2) | required | **required** — pairs with A6 to collapse 120 going rules | 120 (with A6) |
| optional words (A1.5) | required | **required** | 3 |
| verb-list shorthand (A3.1) | required | **dropped** — longhand is fine and arguably better | — |
| greedy slot (A1.3) | *not listed* | **required** — ADR-080 raw-text slots | (ADR-080) |

**Net: still seven required constructs, but a different seven.** D12′'s list was built on call-site
counts and got the two largest items backwards — semantic defaults were listed as the smallest (2) when
they are the second-largest (154), and verb-list shorthand was listed as required (28) when it needs no
language change at all. The greedy slot was missing entirely.

The two biggest levers are unchanged in importance but changed in shape:

- **A6 + A3.2 together** are the single largest win. 120 of the 154 semantic-default rules are the
  going/direction cross-product; one `directions` block carrying aliases *and* their semantic direction
  collapses all of them into ~12 readable lines. Designing these two separately would miss it.
- **A7 is more tractable than feared** — 316 of 422 rules are at the default. The 37 abbreviation rules
  at priority 90 are the genuine problem for specificity ordering, since they are *shorter* than what
  they compete with.

Additional required work not in D12′'s list:

| item | why | owner |
| --- | --- | --- |
| greedy slot (A1.3) | ADR-080 raw-text slots exist in the standard grammar | ADR-267 |
| target-naming form (A2 note) | mapping a pattern to an action without declaring it — Gap 3(b) | ADR-269/270 |
| scope requirement vocabulary (A5) | currently unvalidated; `must be levitating` compiles | ADR-271 |

---

## Part D — Open items for the children

0. **ADR-267, first** — **slot spelling (A1.2a).** `define verb` uses `(something)`,
   `define action` uses `:slot`. **RULED (owner, 2026-07-25): `the <name>`.** ADR-267 lands the EBNF
   change, removes `define verb`'s parens, and must confirm no rule needs a literal `the`.
1. **ADR-267** — rule on A1.3/A1.4/A1.5 spellings; confirm typed slots narrow to `instrument` +
   `topic`. **Design A6 (semantic defaults) and A3.2 (direction map) together, not separately** — they
   collapse the same 120 rules.
2. **ADR-268** — run the specificity experiment (A7) before fixing a design. Diff specificity-only
   ordering against current priorities across the transcript corpus, and handle the 37 abbreviation
   rules explicitly (they are shorter than their competitors, so token-count specificity ranks them
   backwards).
3. **ADR-269** — the `.mapsTo` grouping (A2) makes the migrated source action-first; confirm that shape
   is wanted. Resolve the target-naming form.
4. **ADR-270** — Gap 3(b)/(c) and the target-naming form converge here.
5. **ADR-271** — close the scope requirement vocabulary (A5); the four-word initial set is proposed
   above.
6. **ADR-272** — Part A of this document is close to the capability-page content ADR-266 D3a/D3b
   describe, minus the Sharpee columns (D3b: the page is Chord-only).
