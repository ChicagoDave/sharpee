# Chord Grammar — Implementation Notation

A living EBNF-style notation of the Chord grammar **exactly as the parser
implements it** (`packages/chord/src/parser.ts`). It tracks the code, phase
by phase, so the accepted language is always reviewable at a glance.
Normative source: `docs/work/story-language/design.md` + ADR-210; grammar
*changes* (anything not in design.md) require David's approval via
`docs/architecture/chord-grammar-changes.md`.

**Current coverage: Phase A subset + Phase B declarations** (plan:
docs/work/chord-phase-b/plan.md, phase 2). `define trait`/`define action`
(role binding, ordering, data blocks, grammar patterns, refusal forms),
scheduler constructs (`once`/`every`/`define sequence`), `define score`,
action/behavior hatches, conditional blocked exits, dotted phrase keys, and
declare-and-emit inline prose all parse as of 2026-07-11 (analysis/loader:
later phases).

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
| `define phrases <locale>` | header line | dedent |
| ordinal block (`first time`) | ordinal line | dedent (or `end` of enclosing) |
| prose block | first bare line | dedent (blank line = paragraph break; in `create` blocks a blank line ends the block, but later bare paragraphs append to the description) |
| `define phrase` | header line | `end phrase` |
| `when` rule | header line | `end when` |
| `on` clause | header line | `end on` |
| `if` | `if … then` line | `end if` (`else` at the `if`'s indent) |
| `select` | `select …` line | `end select` (`or` at the `select`'s indent) |

- Indentation is **spaces only** (tab → `lex.tab-indent` error).
- Recovery: after an error the parser resynchronizes at the next `end` line
  or top-level keyword — one mistake, one diagnostic.

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
story-header = "story" STRING "by" STRING NL >>> { WORD ":" rest-of-line NL } ;
declaration  = create | define-condition | define-phrase | define-phrases
             | define-verb | define-text | define-flag | when-rule
             | define-trait | define-action | define-hatch | define-score
             | once-rule | every-rule | define-sequence ;      (* Phase B, 2026-07-11 *)
```

## Phase B declarations (2026-07-11; design.md §2.2/§2.3/§2.5/§3.4)

```
define-trait   = "define" "trait" WORD NL
                 [ >>> "data" NL >>> { trait-field } ]
                 [ >>> "phrases" LOCALE NL >>> { phrase-entry } ]
                 { >>> on-clause }
                 "end" "trait" NL ;
trait-field    = field-words ":" [ "optional" ]
                 ( "flag" | "entity" | "number" | "name"
                 | "one" "of" WORD { "," WORD } )
                 [ "," "starts" token ] NL ;

on-clause      = "on" WORD "it" [ "," ("before"|"after") WORD ] NL body "end" "on"
               | "on" WORD "anything" "as" "the" WORD NL body "end" "on"   (* role *)
               | "on" "every" "turn" [ "while" condition ] NL body "end" "on" ;

define-action  = "define" "action" WORD NL action-line* ;   (* dedent-terminated *)
action-line    = "grammar" NL >>> { pattern-line }
               | "the" WORD "must" "be" WORD NL             (* scope constraint *)
               | "refuse" "without" WORD ":" WORD NL
               | "refuse" "when" condition ":" WORD NL
               | "otherwise" "refuse" WORD NL               (* dispatch miss *)
               | "phrases" LOCALE NL >>> { phrase-entry }
               | statement ;                                (* §2.3 body *)
pattern-line   = ( WORD | ":" WORD )+ [ "→" WORD { WORD } ] NL ;  (* → = cardinality *)

define-hatch   = "define" ("action"|"behavior") WORD "from" STRING NL ;
define-score   = "define" "score" WORD "worth" NUMBER NL ;

once-rule      = "once" condition NL >>> { statement } "end" "once" NL ;
every-rule     = "every" NUMBER "turns" [ "," NUMBER "times" ] NL
                 >>> { statement } "end" "every" NL ;
define-sequence= "define" "sequence" WORD { WORD } NL
                 { sequence-step } "end" "sequence" NL ;
sequence-step  = ( "at" "turn" NUMBER | NUMBER "turns" "later" ) NL >>> { statement } ;
```

- **Conditional blocked exits** (grammar log 2026-07-10):
  `DIRECTION "is" "blocked" [ "while" condition ] ":" WORD NL`.
- **Dotted phrase keys** (`zoo.pa.closing-3`) in `refuse`/`phrase` statements.
- **Declare-and-emit inline prose**: a deeper-indented bare prose block after
  `phrase <key>` registers the text under the key (§2.6/§3.3).
- **Config name values**: `with <key> the <entity name>` — an article starts
  a multi-word entity-name value (`feedable with food the handful of feed`).
- **`can see <thing>` / `can reach <thing>`** predicates join the condition
  kit; `has`/`holds`/`wears` objects stop at connective words.
- **Lexing**: a lone `"` with no closer on the line is prose punctuation
  (multi-line dialogue); positions requiring strings diagnose at parse time.

## create

```
create       = "create" name NL >>> { create-line } ;
create-line  = "aka" alias { "," alias } NL
             | composition { "," composition } NL          (* pre-blank paragraph only *)
             | placement NL
             | "wears" name NL
             | DIRECTION "to" name NL                      (* exit *)
             | DIRECTION "is" "blocked" ":" WORD NL        (* blocked exit, phrase key *)
             | "states" ":" WORD { "," WORD } NL           (* ordered states *)
             | "phrase" WORD ":" NL prose-paragraph        (* per-entity override; prose block only *)
             | on-clause
             | prose-paragraph ;                           (* post-blank: description; consecutive
                                                              bare paragraphs append (2026-07-10) *)

composition  = [ ARTICLE ] WORD                            (* article ⇒ kind noun; bare ⇒ trait *)
               [ "with" setting { "and" setting } ]
               [ "while" condition ] ;                     (* conditional trait, e.g. dark while … *)
setting      = WORD { WORD } ( NUMBER | STRING | WORD ) ;  (* last token is the value *)
placement    = ( "in" | "on" ) ARTICLE name                (* on + article = placement… *)
             | "starts" "in" name ;
on-clause    = "on" WORD "it" NL                           (* …on + gerund = behavior clause *)
               >>> { statement } "end" "on" NL ;
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
define-flag      = "define" "flag" WORD "starts" token NL ;
STRATEGY         = "randomly" | "cycling" | "ordered" | "once" ;
```

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

## when

```
when-rule    = "when" header-words [ "while" condition ] NL
               >>> { statement } "end" "when" NL ;
header-words = WORD { WORD } ;   (* unsegmented: actor/verb/target split is the
                                    analyzer's job, against the event-selector map *)
```

## Statements

```
statement    = "refuse" WORD { param } NL
             | "phrase" WORD { param } NL
             | "emit" WORD { WORD } NL
             | "set" value-expr "to" value-expr NL
             | "change" name "to" WORD NL                  (* explicit state transition *)
             | "move" name "to" name NL
             | "award" { token } [ "," "once" ] NL
             | "win" [ WORD ] NL
             | "lose" [ WORD ] NL
             | if-stmt | select-on | select-strategy | ordinal-block ;
param        = "with" WORD { WORD } "=" value-expr ;
if-stmt      = "if" condition "then" NL >>> { statement }
               [ "else" NL >>> { statement } ] "end" "if" NL ;
select-on    = "select" "on" value-expr NL
               >>> { "when" WORD NL >>> { statement } } "end" "select" NL ;
select-strategy = "select" STRATEGY NL
               >>> { statement } { "or" NL >>> { statement } } "end" "select" NL ;
ordinal-block = ORDINAL "time" NL >>> { statement } ;
ORDINAL      = "first" | "second" | … | "tenth" ;
```

## Conditions (closed selector grammar, Phase A subset)

Precedence lowest→highest: `or`, `and`, `not`.

```
condition    = and-expr { "or" and-expr } ;
and-expr     = unary { "and" unary } ;
unary        = "not" unary
             | "(" condition ")"
             | "one" "chance" "in" NUMBER
             | WORD                                        (* bare ⇒ named-condition ref,
                                                              only when a connective or
                                                              end-of-condition follows *)
             | value-expr predicate ;
predicate    = "is" [ "not" ] ( ( "a" | "an" ) WORD { WORD }   (* is-a *)
                              | "in" name                      (* is-in *)
                              | value-expr )                   (* is *)
             | ( "has" | "holds" | "wears" ) name ;
             (* Phase B: can see / can reach, comparisons, quantifiers, cardinality *)

value-expr   = NUMBER | STRING
             | "its" field-words                           (* possessive on `it` *)
             | name [ "'s" field-words ]                   (* the player's location *)
             | WORD { WORD } ;                             (* bare words *)
name         = [ ARTICLE ] WORD { WORD } ;
ARTICLE      = "the" | "a" | "an" ;
```

Noun phrases stop at: `is has holds wears can and or then to while with`.

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
5. **Event headers stay unsegmented word lists** — actor/verb/target
   segmentation needs the curated event-selector map, which is analyzer
   (Phase 3) territory; the parser stays vocabulary-free.
6. **Bare condition refs** (`while in-darkness`) are only taken when the
   word stands alone; otherwise a subject–predicate parse is attempted.
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
10. **Event-verb set (Phase A): `enters`.** The `when` header segments as
    words-before-verb = actor, words-after = target; a header with no known
    verb is a load error listing the known verbs. Growing this set is a
    grammar change (governance log).
11. **`is <word>` objects** must be a declared state of the subject entity,
    a v1 trait adjective, a literal, or an entity name — anything else is
    the unknown-value gate with a nearest-valid suggestion.
12. **Marker validation (Phase A slice):** bare lowercase single-word
    markers (`{garbled}`) must name a declared hatch or phrase key.
    Formatter-chain forms (`{You}`, `{verb:is item}`, `{the item}`) are not
    validated yet — that check lands with the full contract in Phase B/C.
