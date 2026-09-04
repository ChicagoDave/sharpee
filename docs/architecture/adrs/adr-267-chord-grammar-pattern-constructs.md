# ADR-267: Chord grammar pattern constructs

## Status: ACCEPTED (2026-07-25) — first language child of the ADR-266 umbrella. All six open questions (inherited Q-8 + five spelling rulings) resolved via interview same day; spellings D8–D12 ruled by owner; adr-review 14/14 after SMALL fix (acceptance 2 widened to the reserved-surface audit). **IMPLEMENTED same day (session 2d5bc7)**: four landing groups landed whole (Chord 2.0.0 → 2.3.0); acceptances 1–8 all green — audit PASS recorded, gap report EMPTY except ordering (generator built; `?` help alias ruled a platform-side exception), shadow warning live, ship-directions fixture 7/7 via ADR-275's runtime slice (entity-less dispatch + semantic word binding, its own interview + review). ADR-268 (ordering) is the next child.

## Parent: ADR-266 (umbrella — direction (iv), boundary D8, required set D12′, slot spelling D15). Sequenced after ADR-271 (landed 2026-07-25: pass-through, scope-constraint gating, `fullPattern()`). Sibling ADR-268 owns ordering (excluded here). Relates to ADR-257 (language version — each construct bumps it), `docs/architecture/chord-grammar-changes.md` (each construct needs a row), ADR-080 (raw-text slots — the greedy slot's reason to exist), ADR-082 (slot types), ADR-087 (action-centric grammar), ADR-235 D2 (no compiles-but-cannot-work — every construct here must reach the builder, not just the IR). Input analysis: `docs/work/grammar-parity/sharpee-chord-grammar-syntax.md` (sections A1–A6, C, D).

## Date: 2026-07-25

## Context

ADR-266 D12′ makes seven constructs **required** — Chord cannot host the standard grammar (option iv)
until it can express every construct the standard grammar's 422 rules use. This child owns six of the
seven; ordering (106 deviating rules) is ADR-268's. The set, sized in registered rules:

| construct | rules | analysis ref |
| --- | --- | --- |
| slot spelling `the <name>` | all 422 (spelling of everything else) | A1.2a — **RULED (D15)**, lands here |
| semantic defaults | 154 | A6 |
| direction map | 120 (subset of the 154; same cross-product) | A3.2 — designed **together** with A6 |
| alternation | 19 | A1.4 |
| typed slots | 15 — narrowed to `instrument` (10) + `topic` (5) | A4 |
| optional words | 3 | A1.5 |
| greedy slot | (ADR-080 raw-text slots) | A1.3 |

Verb-list shorthand is confirmed **dropped** (A3.1): Chord's one-line-per-verb longhand needs no
language change and reads better. The other nine `SlotType`s (0 uses) are not ported; the deprecated
`ADJECTIVE`/`NOUN` never will be. The three `withSemantic*` mapping methods (0 uses;
`SemanticMapping.compute` is a function, unportable to a declarative language) are not ported.

Today's EBNF carries **two** slot productions the D15 ruling collapses
(`docs/reference/chord.ebnf:372,408`):

```
pattern      = { WORD | "(" WORD ")" } ;                          (* define verb *)
pattern-line = ( WORD | ":" WORD )+ [ "→" token { token } ] NL ;  (* define action *)
```

ADR-271 established the wiring precedent this ADR relies on: a construct is not landed when it parses —
it is landed when the loader emits it onto the real `GrammarBuilder` surface and a test asserts the
emitted rule **shape** (ADR-235 D2, applied to grammar). Every construct below inherits that bar.

## Decision

### D1 — D15 lands: one slot production, `the <name>`, in both constructs

The two EBNF productions converge on one (a simplification — two rules become one):

```
pattern      = pattern-elem { pattern-elem } ;
pattern-elem = WORD | "the" WORD ;                (* "the" WORD = slot *)
pattern-line = pattern [ "→" token { token } ] NL ;
define-verb  = "define" "verb" WORD { "or" WORD } "means" pattern NL ;
```

- `define verb`'s `(something)` parens and `define action`'s `:slot` colon are both **removed**, not
  deprecated — ADR-257 bump, no back-compat (project policy).
- The slot *name* stays bare where it is already bare (`refuse without animal:`, phrase
  interpolation, `the animal must be reachable`); `the <name>` is the spelling **in a pattern**, not a
  rename.
- A literal `the` in a pattern becomes unwriteable. **Acceptance requires the audit**, not the
  assumption: confirmed against all 422 standard rules (and every shipped story + docs example) that no
  pattern needs one before the parser change merges.
- The Chord→Sharpee translation is mechanical: `the animal` in a pattern compiles to `:animal` in the
  emitted pattern string. Nothing downstream of the loader changes.

### D2 — The silent slot-shadow gains a warning diagnostic

Inside a block that declares a slot, a single-word entity reference matching the slot name silently
resolves to the slot (verified: `analyzer.ts:3149-3193`; slots are per-action-scoped, single-word
only). Slot-first resolution is correct and does not change; the **silence** does. The analyzer emits a
warning — `analysis.slot-shadows-entity`, naming both the slot and the shadowed entity — when a
declared slot name collides with a single-word entity name referenced in the same block. Same
fail-loud lineage as ADR-273 D3 / ADR-274 D2, at warning severity because existing correct blocks
depend on the behavior.

(Publishing the 17 standard slot names is ADR-272's page obligation, restated there — not owed here.)

### D3 — Each construct lands whole: EBNF → parser → analyzer → IR → loader emission → builder

Per construct, "landed" means all of: the EBNF production, parse + analyzer validation (bad forms get
named diagnostics, never silence), IR carriage, loader emission onto the real builder call
(`|`-alternation and `[optional]` compile into the emitted pattern string; greedy → `:slot...`;
typed slots → `.slotType()`; semantic defaults → `.withDefaultSemantics()`; direction map →
`.directions()` or its equivalent emission), and a test asserting the emitted rule shape against a real
`EnglishGrammarEngine`. A construct that parses but does not reach the builder is a defect, not a
phase boundary.

### D4 — One `chord-grammar-changes.md` row per construct; one ADR-257 bump per landing group

Every construct carries its own approved `chord-grammar-changes.md` row before its implementation
begins (per-construct paper trail, umbrella acceptance 8). ADR-257 bumps batch by **landing group**
(Q-1 resolved 2026-07-25): four bumps, one per group in D7's order — each version an author-nameable
capability, without per-construct churn. D15's row is owed immediately with this ADR's acceptance —
its ruling is already made.

### D5 — Semantic defaults and the direction map are one design

120 of the 154 semantic-default rules are the going × direction cross-product. The two constructs are
specified, ruled, and implemented as a unit (umbrella D12′ design note): whatever spelling Q-6 picks
must let one block carry the direction aliases *and* their semantic direction, collapsing ~120 rules
into ~12 readable lines. Landing either half separately is out of order.

### D6 — Landing order (Q-1 / umbrella Q-8 resolved 2026-07-25)

Four landing groups, in order:

1. **D15 spelling** — EBNF convergence, literal-`the` audit, shadow warning (D1, D2)
2. **Alternation + optional words + greedy slot** — small, independent, pure pattern-line structure
3. **Typed slots** (`instrument`, `topic`) — introduces the declarative-line idiom
4. **Semantic defaults + direction map** — largest, one unit (D5), lands last with every spelling
   settled

Each group is one ADR-257 bump (D4); a group may not start before its constructs' rows are approved.

### D7 — The gap report is this ADR's completion instrument

ADR-266 D5's gap report, run against the 422-rule baseline, is the per-construct completion test:
each landed construct zeroes its rows. This ADR is done when the report is empty **except the ordering
rows** (ADR-268's). Parity is counted, not asserted.

### D8 — Alternation is written `or` (Q-2 resolved 2026-07-25)

`look in or inside the target`. The word Chord already uses for alternation in
`define verb hang or hook means …`, now meaning the same thing inside a pattern line: adjacent
literals joined by `or` are alternates of **one rule** (loader emission: one pattern string with `|`,
one registered rule — never N split rules, which would break rule identity under ADR-268's ordering).
`or` binds between single elements; the D15-marked slots keep the line's structure unambiguous. A
literal word `or` in a pattern becomes unwriteable — the acceptance-2 audit extends to it, same
treatment as literal `the`. Rejected: the pipe (imports punctuation Chord avoids; inconsistent with
`define verb`'s existing `or`) and no-construct longhand (multiplies 19 rules into ~45 lines and
makes alternates orderable against each other).

### D9 — Optional words are written `[word]` (Q-3 resolved 2026-07-25)

`look [carefully] at the target`. Square brackets are the one notation with a universally understood
meaning of exactly "optional", and they keep the optionality at its position in the pattern — the
modifier-line alternative (`optionally carefully`) was rejected because it detaches the word from its
position, an ambiguity brackets cannot have. Bracketed elements compose with the other constructs as
in Sharpee (`[in or inside]`, `[the target]`). Loader emission: the element is marked optional in the
emitted pattern string (`[word]`), one registered rule.

### D10 — The greedy slot is a declarative line: `the <slot> takes the rest of the line` (Q-4 resolved 2026-07-25)

```chord
define action writing
  grammar
    write the message
  the message takes the rest of the line
```

In Sharpee, greediness is a slot **type** (`TEXT_GREEDY`), not pattern structure — so Chord states it
where slot properties are stated, in the `the <slot> …` line family beside `must be` constraints,
keeping the pattern line reading exactly like the command a player types. Loader emission: the slot
compiles to `:slot...` in the emitted pattern string (a `TEXT_GREEDY` rule). Analyzer: the named slot
must exist in at least one of the action's patterns (`analysis.unknown-slot` otherwise, as for
constraints). Rejected: in-pattern phrasings (`write the rest as the message`, trailing keyword) —
both misclassify a slot property as pattern structure, and neither reads as the typed command.

### D11 — Typed slots are declarative lines: `the <slot> is an instrument` / `is a topic` (Q-5 resolved 2026-07-25)

```chord
define action unlocking
  grammar
    unlock the target with the key
  the key is an instrument
  the target must be reachable
```

With D10, every statement about a slot is now one idiom — `is an instrument`, `is a topic`,
`takes the rest of the line`, `must be reachable` — grouped under the grammar block, and pattern
lines carry only what the player types. Only these two types exist in Chord (the narrowed set); an
unknown type word is a named analyzer error listing the supported ones (the ADR-271 D11 precedent for
closed sets). Loader emission: `.slotType(slot, INSTRUMENT | TOPIC)` on the emitted rule. Rejected:
inline `as instrument` in the pattern (mixes slot metadata into the command shape).

### D12 — Semantic defaults: per-pattern `means` line; direction map: a `directions` block bound to the `direction` slot (Q-6 resolved 2026-07-25)

```chord
define action going
  grammar
    go the direction
    walk the direction
    the direction
  directions
    north or n
    south or s
    northeast or ne

define action hiding
  grammar
    hide under the target
      means position under
    hide behind the target
      means position behind
```

- **`the direction` is a slot, not a keyword** (owner ruling): plain D15 spelling in the pattern; the
  `directions` block is what gives it expansion semantics. The block binds to the slot named
  `direction`, declares the canonical set with `or`-joined aliases (D8's word, in exactly its ruled
  meaning), and each pattern using the slot expands across the set with `direction: <canonical>` as
  that rule's semantic default. A bare `the direction` pattern line registers the standalone forms
  (`north`, `n`). Five verbs × the block reproduces today's 120 going rules from ~15 lines.
- **`means <key> <value>`** is the general static-defaults form (hiding's `position`, 10 rules) — an
  indented line under its pattern. Only static key/value defaults exist; the `withSemantic*` mapping
  methods stay unported (functions cannot cross into a declarative language).
- **The construct is not compass-hardcoded** (owner ruling: must hold for ship directions). A
  `directions` block is per-action vocabulary: a sailing action declaring `port or p` / `starboard or
  sb` / `fore` / `aft` gets the same expansion, defaults, and standalone forms. Alias collisions
  *across* actions (two blocks both claiming `n`) are two competing rules, resolved by ordering
  (ADR-268) like any other collision — not an error.
- Loader emission: the cross-product rules with `.withDefaultSemantics({direction})` (or the `means`
  key/value), standalone-direction rules for the bare pattern; a `means` or `directions` line naming a
  slot absent from every pattern is `analysis.unknown-slot`.

## Acceptance

1. One pattern production: `define verb` and `define action` patterns parse through the same EBNF rule;
   parens and colon forms are gone (a colon or paren slot is a parse error, not a legacy spelling).
   *(D1; umbrella acceptance 7)*
2. The reserved-surface audit is run and recorded: no rule among the 422, no shipped story, and no
   docs example needs a literal `the` or `or` in a pattern, a pattern beginning with `means`, or a
   pattern line consisting of `directions` — every word this ADR makes structurally significant.
   Any future collision is a named parse diagnostic, never a silent misparse. *(D1, D8, D12)*
3. `analysis.slot-shadows-entity` fires on the collision case with both names in the message; a test
   asserts the warning and that resolution behavior is unchanged. *(D2)*
4. For each construct: a Chord fixture compiles and the emitted rule shape is asserted against a real
   grammar engine — alternation emits one rule (not N split rules), optional marks the element
   optional, greedy produces a `TEXT_GREEDY`-consuming rule, `instrument`/`topic` slots carry their
   `SlotType`, semantic defaults reach `rule.defaultSemantics`, and the direction-map block registers
   the full alias × direction set. Unsupported or malformed forms produce named diagnostics. *(D3)*
5. `chord-grammar-changes.md` carries one approved row per construct; ADR-257 is bumped per construct
   landed. *(D4; umbrella acceptance 8)*
6. The gap report against the 422-rule baseline is empty except ordering. *(D7; umbrella acceptance 6,
   jointly with ADR-268)*
7. Existing suites stay green: chord package tests, story-loader tests, and the shipped stories'
   transcript suites (fernhill, friendly-zoo, dungeo unaffected; cloak's `define verb` migrates to the
   new spelling in the same change).
8. **The ship-directions test** (D12, owner condition): a fixture story defines a sailing action with
   a nautical `directions` block (`port or p`, `starboard or sb`, `fore`, `aft`) — expansion,
   per-rule `direction` defaults, and standalone bare-direction commands all hold exactly as for the
   compass block, and a transcript proves `sail port` and bare `starboard` reach the action with the
   right direction. Runs with landing group 4.

## Consequences

**Gained.** Chord can express the standard grammar minus ordering — the (iv) migration's language
prerequisite, measured empty rather than asserted. One slot spelling everywhere; `define verb` and
`define action` stop carrying different notations for the same concept. The slot-shadow behavior
becomes observable instead of silent.

**Cost.** Up to six ADR-257 bumps (or fewer, batched per Q-1's ruling on landing order); every shipped
`.story` and docs example using `:slot` or `(something)` is migrated in the same pass — no
deprecation period (project policy: no backward compatibility). The EBNF's pattern surface grows real
structure (alternation/optional/greedy) where it was previously a flat word list, which the analyzer
and any future IDE tooling (ADR-258) must understand.

**Rejected.** Verb-list shorthand (longhand is better Chord). Porting the nine unused slot types and
the three `withSemantic*` mapping methods (zero uses; `compute` is a function and cannot cross into a
declarative language). Reopening ADR-231 D2a (whether standard grammar should *use* scope constraints
at parse time — explicitly not this ADR's question).

## Session

Session of 2026-07-25 (4900be). Written directly after ADR-274 closed, as the next child in ADR-266's
sequencing (ADR-271 landed the previous session). Grounded in the umbrella's D12′/D15 and the measured
analysis (`sharpee-chord-grammar-syntax.md`); the construct set here is the *corrected* seven (semantic
defaults 154 not 2; verb-list shorthand dropped; greedy slot added), not D14's original table. The
EBNF productions quoted were re-verified against `docs/reference/chord.ebnf:372,408` before writing.

## Amendment 1 — rule-level applicability: `only while <condition>` (2026-09-03)

**Status**: DRAFT — awaiting David's acceptance (one open question below, rule 11a). Gates `docs/proposals/publish-readiness-defects.md` P-21 (GH #317). Amends ADR-087 (the builder surface gains one method) and ADR-231 D2a (a second parse-time gate) by reference; leaves ADR-268 D2 and ADR-270 untouched.

### Context

- A `define action` grammar line is a global story-tier claim: story beats standard unconditionally at equal confidence (ADR-268 D2). Secret Letter's `drop` — the mid-slide synonym for `let go`, meaningful in On the Wire only — shadows stdlib's `drop` everywhere; outside the room, bare `drop` can only print the story's refusal, never reach the parser's own MISSING_OBJECT prompt (`packages/parser-en-us/src/english-parser.ts` ~1497). The interim in `branch-stories/secret-letter/aerial-runway.chord:359-371` is a second action, `releasing`, whose elsewhere-refusal prints a static "What do you want to drop?" with no follow-up.
- `refuse when` is the action's *refusal voice*, evaluated after the parse has chosen the action; it cannot hand the input back. GH #317's two shapes converge: "fall through when the only failing gate is a `refuse when`" would swallow every authored refusal (the kick verb's "Not so hard really, was it?"), so fall-through needs a marker that distinguishes *does not apply here* from *applies and refuses* — and a marker evaluated before the action is chosen is a scoped grammar line.
- ADR-270's `extend action` / `remove from action` narrow the *standard* grammar; nothing scopes a story rule. ADR-231 D2a names slot `.where()` as the one parse-time gate; it gates a slot's candidates, not a rule's applicability. Neither existing mechanism covers this.

### Decision

- **A1 — The construct.** A `define action` body line, in the same declarative family as `the <slot> must be reachable`:

  ```
  only while <condition>
  ```

  At most one per action. The condition grammar is the clause `while` guard's, minus `it` (an action has no owner). Legal in `extend action` too, where it scopes the extension's added lines only (ADR-270 D2's grammar-surface list grows by this line).
- **A2 — Semantics.** While the condition is false, the action's grammar rules are **not candidates**: the parse proceeds exactly as if the action were not defined — the standard tier's own rules apply, including their clarification errors. ADR-268 D2 is untouched: tier is compared *among candidates*, and an inapplicable rule is not one, the same status a slot-scope miss has under ADR-271 D2. The line covers every pattern of the action, bare-verb prefixes included.
- **A3 — Landing whole (D3).** EBNF → parser (body line) → analyzer (condition resolved like a `while` guard; a second line is `analysis.duplicate-only-while`) → IR `IRActionDef.onlyWhile?: IRCondition` and `IRGrammarExtension.onlyWhile?` (absent keeps IR byte-identical) → loader emits a rule-level predicate closing over its condition evaluator → if-domain `GrammarRule.applies?: (context: ScopeContext) => boolean`, set by `.onlyWhen(fn)` on the pattern builder (ADR-087's surface gains one method; a TypeScript story gets the same gate) → parser-en-us `findMatches` evaluates `applies` before slot resolution and skips the rule when false. ADR-231 D2a reads, after this: two parse-time gates — slot scope (`.where()`) and rule applicability (`.onlyWhen()`), both world-evaluated, neither producing a diagnostic.
- **A4 — Refusal fall-through is rejected** as a separate mechanism: it needs the same marker and adds a re-parse on the validate path.
- **A5 — Paper trail.** Chord MINOR bump and a `chord-grammar-changes.md` row (D4). The change is one of the publish-readiness proposal's own items, so it lands inside Phases 2–8, before Phase 9 declares the freeze.

**The corpus block, as it will read** (unshipped syntax; `aerial-runway.chord`, replacing the `releasing` interim):

```
define action letting-go
  grammar
    let go
    drop
  only while the player is in On the Wire
  phrase let-go-drop
  move the old gray cloak to Behind Fruit Stall
  move the player to Behind Fruit Stall
  reset the cables' sliding
  start the player's lingering
```

Off the wire, `drop` is not this action's; bare `drop` reaches stdlib's dropping and its "What do you want to drop?" prompt, which P-20 (ADR-225's held command, plan Phase 9) then completes from the next input.

### Consequences

- The loader's `LoadError` for a `must`-less condition referencing `it` inside `only while` names the rule ("an action has no owner").
- The parser evaluates one predicate per applicable story rule per parse; the cost is a condition evaluation, the same as a `while` guard.
- `define action releasing` and `define phrase drop-what` leave Secret Letter (plan Phase 8's acceptance check).

### Open Questions

1. **Spelling.** Recommended: `only while <condition>` — `while` is Chord's standing-condition word (`dark while`, `blocked while`, the clause `while` guard), and `only` says the rule is *otherwise absent*, not refused. Alternatives: `applies while <condition>`, `available while <condition>`.

### Session

effb6f, 2026-09-03 — drafted in publish-readiness plan Phase 1 (`docs/work/publish-readiness/plan.md`).
