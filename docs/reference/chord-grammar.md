# Chord Grammar — Implementation Notation

A living EBNF-style notation of the Chord grammar **exactly as the parser
implements it** (`packages/chord/src/parser.ts`). It tracks the code, phase
by phase, so the accepted language is always reviewable at a glance.
Normative source: `docs/work/story-language/design.md` + ADR-210; grammar
*changes* (anything not in design.md) require David's approval via
`docs/architecture/chord-grammar-changes.md`.

**Current coverage: Phase A subset + Phase B declarations + Phase C
ownership package** (plan: docs/work/chord-phase-c/plan.md) as of
2026-07-12. Phase C lands the ownership ratchet entries D1–D13: owner-attached
`on`/`after` clauses with `while` and `, once`, `states[, reversible]:` at
story/entity/trait scope, `must` requirements, `refuse when` in body
position, the statement-final `when` suffix, owner-attached `score … worth N`
lines, `change … to <state>`, and the `when <owner> becomes <state>` sequence
anchor. The floating half of the language is gone: top-level `when`/`once`/
`every` rules, `define flag`, the `flag` field type, `if`/`else`/`end if`,
and top-level `define score` no longer parse (each has a fix-it diagnostic
naming its owner-attached replacement — error recovery, not grammar, so
they have no productions below). Analysis/loader: later phases.

## Notation conventions

- `UPPER` = token class, `"quoted"` = literal word, `[x]` = optional,
  `{x}` = zero or more, `x | y` = alternatives.
- Chord is **line-oriented**: `NL` ends every rule that is one source line.
  `>>>` means "an indented block follows" — see Layout below, which EBNF
  cannot express.

## Layout rules (the part EBNF can't say)

| Block | Opens with | Closes with |
|---|---|---|
| story header fields | `story` line | dedent |
| `create` block | `create` line | dedent |
| `define phrases <locale>` / `phrases <locale>` | header line | dedent |
| `define trait` | header line | `end trait` |
| `define action` | header line | dedent |
| `define sequence` | header line | `end sequence` |
| sequence step | anchor line | dedent (next anchor or `end sequence`) |
| ordinal block (`first time`) | ordinal line | dedent (or `end` of enclosing) |
| prose block | first bare line | dedent (blank line = paragraph break; in `create` blocks a blank line ends the block, but later bare paragraphs append to the description) |
| `define phrase` | header line | `end phrase` |
| `on` / `after` clause | header line | `end on` / `end after` (must match the opener) |
| `select` | `select …` line | `end select` (`or` at the `select`'s indent) |

- Indentation is **spaces only** (tab → `lex.tab-indent` error).
- Recovery: after an error the parser resynchronizes at the next `end` line
  or top-level keyword — one mistake, one diagnostic. (The recovery set
  still includes `when`/`once`/`every` so the removal fix-its land cleanly.)

## Tokens

```
WORD    = letter { letter | digit | "'" | "-" | "_" }     (* cant-leave, you'd *)
NUMBER  = digit { digit } { "." digit { digit } }          (* 1, 20, 1.0.0 *)
STRING  = '"' any-except-'"' '"'                           (* no escapes *)
MARKER  = "{" content "}"                                  (* inside text only *)
```

## Top level

```
story-file   = [ story-header ] { declaration } ;
story-header = "story" STRING [ "by" STRING ] NL
               >>> { states-line | score-line | WORD ":" rest-of-line NL } ;
declaration  = create | define-condition | define-phrase | define-phrases
             | define-verb | define-text
             | define-trait | define-action | define-hatch
             | define-sequence ;
```

Removed from the top level (ownership package, ratchet 2026-07-11):
`when` rules, `once <condition>` rules, `every N turns` rules,
`define flag`, `define score`. Each removal is a parse error with a fix-it
naming the owner-attached replacement (`parse.removed-when`,
`parse.removed-once`, `parse.removed-every`, `parse.removed-flag`,
`parse.removed-score`).

## Ownership lines (Phase C; ratchet D2/D4/D8/D12)

Two line forms shared across owners:

```
states-line  = "states" [ "," "reversible" ] ":" WORD { "," WORD } NL ;
score-line   = "score" WORD "worth" NUMBER NL ;
```

- `states-line` is legal in the **story header** (D2), **create blocks**,
  and **define trait blocks** (D8). The owner starts in the first declared
  state; without `reversible`, backward `change` is a load error
  (`analysis.irreversible-state`, D4 — analyzer, not parser).
- `score-line` is legal in the **story header**, **create blocks**,
  **define trait blocks**, and **define action blocks** (D12). Score
  identities are owner-scoped.

## on / after clauses (ratchet D3/D5)

Owner-attached behavior, legal in `create` blocks and `define trait` blocks:

```
on-clause    = ( "on" | "after" ) clause-form
               [ "while" condition ]
               { "," clause-modifier } NL
               >>> { statement } "end" ( "on" | "after" ) NL ;
                                        (* terminator matches the opener *)
clause-form  = WORD "it"                          (* verb binding *)
             | WORD "anything" "as" "the" WORD    (* role binding, §2.2 *)
             | "every" "turn" ;                   (* `on` only *)
clause-modifier = "once"                          (* D5: one lifetime firing *)
             | ( "before" | "after" ) WORD ;      (* trait ordering, §2.2 *)
```

- `on <verb> it` intercepts (may `refuse`); `after <verb> it` reacts —
  `refuse`, `refuse when`, and `must` inside an `after` body are parse
  errors (`parse.react-refusal`, D3).
- `after every turn` is a parse error (`parse.after-every-turn`) —
  every-turn clauses are not reactions to an action.
- `while` is legal on every binding; comma modifiers repeat and follow it.
- Owner-scoped narration (D11) is semantics, not syntax: entity-owned
  every-turn clauses fire only in the owner's presence.

## create

```
create       = "create" name NL >>> { create-line } ;
create-line  = "aka" alias { "," alias } NL
             | states-line                                 (* ordered states, D2/D4 *)
             | score-line                                  (* owner-attached score, D12 *)
             | composition { "," composition } NL          (* pre-blank paragraph only *)
             | placement NL
             | "wears" name NL
             | DIRECTION "to" name NL                      (* exit *)
             | DIRECTION "is" "blocked" [ "while" condition ] ":" WORD NL
                                                           (* blocked exit, phrase key *)
             | "phrase" WORD ":" NL prose-paragraph        (* per-entity override, e.g.
                                                              `phrase presence:`; prose block only *)
             | on-clause                                   (* `on`/`after`, D3 *)
             | prose-paragraph ;                           (* post-blank: description; consecutive
                                                              bare paragraphs append (2026-07-10) *)

composition  = [ ARTICLE ] WORD                            (* article ⇒ kind noun; bare ⇒ trait *)
               [ "with" setting { "and" setting } ]
               [ "while" condition ] ;                     (* conditional trait, e.g. dark while … *)
setting      = WORD { WORD } ( NUMBER | STRING | WORD ) ;  (* last token is the value *)
placement    = ( "in" | "on" ) ARTICLE name                (* on + article = placement… *)
             | "starts" "in" name ;                        (* …on + bare word = on-clause *)
DIRECTION    = north | south | east | west | northeast | northwest
             | southeast | southwest | up | down ;
```

## define

```
define-condition = "define" "condition" WORD ":" condition NL ;
define-phrase    = "define" "phrase" WORD [ "," ( STRATEGY | "verbatim" ) ] NL
                   variant { "or" NL variant } "end" "phrase" NL ;
                   (* verbatim: single variant, line structure + relative
                      indentation preserved; no "or" variants *)
variant          = prose-paragraph ;
define-phrases   = "define" "phrases" LOCALE NL >>> { phrase-entry } ;
phrase-entry     = WORD ":" NL prose-paragraph ;           (* prose block only — the same-line
                                                              quoted/bare forms were removed
                                                              (grammar log 2026-07-10) *)
define-verb      = "define" "verb" WORD { "or" WORD } "means" pattern NL ;
pattern          = { WORD | "(" WORD ")" } ;               (* (something) = slot *)
define-text      = "define" "text" WORD "from" STRING NL ; (* TS hatch; name "br" reserved *)
STRATEGY         = "randomly" | "cycling" | "ordered" | "once" ;
```

`define flag` was removed (given 8, ratchet 2026-07-11): global booleans
are gone; facts are derived conditions or owner states (`parse.removed-flag`).

### Prose blocks and formatting (grammar log 2026-07-10)

- A blank line inside a prose block is a **paragraph break** (`\n\n` in the
  compiled text → a fresh text block downstream). In `create` blocks the
  block still ends at a blank line so keyword lines stay out of prose;
  consecutive bare paragraphs all append to the description.
- `{br}` is the **built-in hard-line-break marker** (flush line stacking,
  no paragraph gap). `br` is reserved: it needs no declaration and cannot
  be used as a phrase or hatch name (`analysis.reserved-marker`).
- `define phrase X, verbatim` preserves line structure, interior blank
  lines, and relative indentation (the common leading indent is stripped);
  mutually exclusive with strategies and `or` variants.

## Traits, actions, hatches, sequences (Phase B, extended by Phase C)

```
define-trait   = "define" "trait" WORD NL
                 { trait-line }
                 "end" "trait" NL ;
trait-line     = "data" NL >>> { trait-field }
               | states-line                               (* trait-declared states, D8 *)
               | score-line                                (* D12 *)
               | "phrases" LOCALE NL >>> { phrase-entry }
               | on-clause ;
trait-field    = field-words ":" [ "optional" ]
                 ( "entity" | "number" | "name"
                 | "one" "of" WORD { "," WORD } )
                 [ "," "starts" token ] NL ;
```

The `flag` field type was removed (given 8 / D8): a `flag`-typed field is a
parse error (`parse.removed-flag-field`) pointing at trait `states`.

```
define-action  = "define" "action" WORD NL action-line* ;  (* dedent-terminated *)
action-line    = "grammar" NL >>> { pattern-line }
               | "the" WORD "must" "be" WORD NL            (* scope constraint (no colon) *)
               | must-line                                 (* D6 requirement (has colon) *)
               | score-line                                (* D12 *)
               | "refuse" "without" WORD ":" WORD NL
               | "refuse" "when" condition ":" WORD NL
               | "otherwise" "refuse" WORD NL              (* dispatch miss *)
               | "phrases" LOCALE NL >>> { phrase-entry }
               | statement ;                               (* §2.3 body *)
pattern-line   = ( WORD | ":" WORD )+ [ "→" token { token } ] NL ;  (* → = cardinality *)

define-hatch   = "define" ("action"|"behavior") WORD "from" STRING NL ;

define-sequence= "define" "sequence" WORD { WORD } NL
                 { sequence-step } "end" "sequence" NL ;
sequence-step  = step-anchor NL >>> { statement } ;
step-anchor    = "at" "turn" NUMBER                        (* absolute from story start *)
               | NUMBER "turns" "later"                    (* relative to previous step *)
               | "when" name "becomes" WORD ;              (* state anchor, D10 *)
```

### must requirements (ratchet D6)

Legal as a `define action` line AND as a body statement (never inside an
`after` clause):

```
must-line    = must-subject "must" infinitive ":" WORD NL ;
must-subject = value-expr ;    (* line must OPEN with lowercase `the`/`it`/`its`
                                  so capitalized prose stays prose *)
infinitive   = "be" ( ("a"|"an") WORD { WORD }             (* is-a *)
                    | "in" name                            (* is-in *)
                    | value-expr )                         (* is *)
             | ( "have" | "hold" | "wear" ) name           (* has/holds/wears *)
             | ( "see" | "reach" ) name ;                  (* can see/reach *)
```

`must not …` is a parse error (`parse.must-negative`): requirements are
positive by design; prohibitions use `refuse when <condition>: <key>`
(companion analyzer gate: `analysis.negated-requirement` on
`refuse when not …`).

## Statements

```
statement    = "refuse" phrase-key { param } NL            (* not in `after` bodies *)
             | "refuse" "when" condition ":" WORD NL       (* prohibition, D6; not in `after` *)
             | must-line                                   (* D6; not in `after` *)
             | "phrase" phrase-key { param } [ stmt-when ] NL [ inline-prose ]
             | "emit" WORD { WORD } [ stmt-when ] NL
             | "set" value-expr "to" value-expr NL
             | "change" name "to" WORD [ stmt-when ] NL    (* state transition; name may be
                                                              `the story` (D2) or any entity *)
             | "move" name "to" name [ stmt-when ] NL
             | "award" { token } [ "," "once" ] [ stmt-when ] NL
             | "win" [ WORD ] [ stmt-when ] NL
             | "lose" [ WORD ] [ stmt-when ] NL
             | select-on | select-strategy | ordinal-block ;
stmt-when    = "when" condition ;                          (* statement-final suffix, D7 *)
phrase-key   = WORD { "." WORD } ;                         (* dotted keys: zoo.pa.closing-3 *)
param        = "with" WORD { WORD } "=" value-expr ;
select-on    = "select" "on" value-expr NL
               >>> { "when" WORD NL >>> { statement } } "end" "select" NL ;
select-strategy = "select" STRATEGY NL
               >>> { statement } { "or" NL >>> { statement } } "end" "select" NL ;
ordinal-block = ORDINAL "time" NL >>> { statement } ;
ORDINAL      = "first" | "second" | … | "tenth" ;
```

- **`if`/`else`/`end if` was removed** (ratchet 2026-07-11): `if` is a parse
  error (`parse.removed-if`) pointing at `must` guards, the statement `when`
  suffix, and `select`.
- The **statement `when` suffix** (D7) is legal on `phrase`, `emit`,
  `change`, `move`, `award`, `win`, `lose` — not on `set` or bare `refuse`.
  It is positionally distinct from the select-arm `when <value>` header
  (statement-final vs arm-header — homonym noted in the ratchet).
- **Declare-and-emit inline prose** (§2.6/§3.3): a deeper-indented bare
  prose block after `phrase <key>` registers the text under the key. A
  deeper line counts as a statement (not inline text) when it opens with a
  lowercase statement keyword, an ordinal, a `must`-shaped line, or
  `<n> turns` — prose sentences start capitalized.
- **Conditional blocked exits** (grammar log 2026-07-10):
  `DIRECTION "is" "blocked" [ "while" condition ] ":" WORD NL`.
- **Config name values**: `with <key> the <entity name>` — an article starts
  a multi-word entity-name value (`feedable with food the handful of feed`).
- **Lexing**: a lone `"` with no closer on the line is prose punctuation
  (multi-line dialogue); positions requiring strings diagnose at parse time.

## Conditions (closed selector grammar)

Precedence lowest→highest: `or`, `and`, `not`.

```
condition    = and-expr { "or" and-expr } ;
and-expr     = unary { "and" unary } ;
unary        = "not" unary
             | "(" condition ")"
             | "one" "chance" "in" NUMBER
             | WORD                                        (* bare ⇒ named-condition or
                                                              state ref, only when a
                                                              connective or end-of-condition
                                                              follows *)
             | value-expr predicate ;
predicate    = "is" [ "not" ] ( ( "a" | "an" ) WORD { WORD }   (* is-a *)
                              | "in" name                      (* is-in *)
                              | value-expr )                   (* is *)
             | ( "has" | "holds" | "wears" ) name
             | "can" ( "see" | "reach" ) name ;                (* Phase B *)

value-expr   = NUMBER | STRING
             | "its" field-words                           (* possessive on `it` *)
             | name [ "'s" field-words ]                   (* the player's location *)
             | WORD { WORD } ;                             (* bare words *)
name         = [ ARTICLE ] WORD { WORD } ;
ARTICLE      = "the" | "a" | "an" ;
```

Noun phrases stop at: `is has holds wears can and or then to while with`.

**State adjectives (D1) are not new syntax**: `the staff gate is closed`
parses as the plain `is <value>` predicate; `open`, `closed`, `locked`,
`unlocked`, `on`, `off`, `worn`, `lit` form a closed analyzer catalog
(`STATE_ADJECTIVES` in `catalog.ts`) resolved live from world trait state.
Likewise, a declared owner state (`after-hours`, `hungry`) is a valid
bare-word ref or `is <word>` object — analyzer resolution, not parser.

## Implementation readings (design.md ambiguities, resolved in code)

These are *readings* of design.md, not grammar additions — recorded here for
review; if any is wrong it becomes a grammar-changes entry:

1. **`define phrases <locale>` is dedent-terminated** (no `end phrases`) —
   normative §3.1 shows none; the "define keeps explicit end" meta-rule is
   read as applying to blocks with control flow.
2. **`on` disambiguation in create blocks**: `on` + article ⇒ placement
   (`on the table`); `on` + bare word ⇒ behavior clause (`on reading it`).
3. **Composition vs. prose**: non-keyword lines *before* the first blank
   line are composition; non-keyword paragraphs *after* a blank are the
   description (consecutive bare paragraphs append — grammar log 2026-07-10).
4. **`with` setting values**: the last token of each `and`-separated setting
   is the value; preceding words are the key (`max items 5`).
5. **Clause verbs are single raw words** (`on feeding it`,
   `after entering it`) — the parser is vocabulary-free; mapping a gerund
   to a dispatch action or event selector is the analyzer's job. (The old
   unsegmented `when`-header reading is obsolete with the when-rule removal.)
6. **Bare condition refs** (`while in-darkness`, `while after-hours`) are
   only taken when the word stands alone; otherwise a subject–predicate
   parse is attempted.
7. **Prose paragraphs join lines with single spaces**; markers keep precise
   per-line spans for AC-3 diagnostics.

## Analyzer readings (Phase 3 — resolution and gate policy)

8. **Entity IDs** are the lowercased name words joined with `-`
   (`the Foyer of the Opera House` → `foyer-of-the-opera-house`); the
   article is stripped and kept separately. Resolution order: exact name →
   exact alias → unique in-order word-subset (`the Foyer Bar` matches
   nothing else). Ambiguity/misses are errors with rename/nearest
   suggestions — never a guess.
9. **Descriptions and per-entity overrides become derived phrase keys**
   (`<entity-id>.description`, `<entity-id>.<key>`) registered in the
   story's default locale (Phase A: `en-US`), per given 3.
10. **Event-verb set: `entering`** (`EVENT_VERBS` in `catalog.ts`, gerund
    register since the ownership package). An `on`/`after` clause verb is
    either a known event verb or a dispatch-action gerund; growing the set
    is a grammar change (governance log).
11. **`is <word>` objects** must be a declared state of the subject entity,
    a v1 trait adjective, a state adjective (D1), a literal, or an entity
    name — anything else is the unknown-value gate with a nearest-valid
    suggestion.
12. **Marker validation (Phase A slice):** bare lowercase single-word
    markers (`{garbled}`) must name a declared hatch or phrase key.
    Formatter-chain forms (`{You}`, `{verb:is item}`, `{the item}`) are not
    validated yet — that check lands with the full contract in Phase B/C.
13. **State-set gates are analyzer territory**: the three-ring boolean-state
    gate (D9: `analysis.boolean-state` / `analysis.shadow-state` /
    `analysis.negated-state`), state collisions across composed traits
    (D8: `analysis.state-collision`), irreversible-transition checking
    (D4: `analysis.irreversible-state`), and the negated-requirement gate
    (D6: `analysis.negated-requirement`) all fire after parse — the parser
    accepts any word list in a `states-line`.
