# Chord Grammar — Implementation Notation

A living EBNF-style notation of the Chord grammar **exactly as the parser
implements it** (`packages/chord/src/parser.ts`). It tracks the code, phase
by phase, so the accepted language is always reviewable at a glance.
Normative source: `docs/work/story-language/design.md` + ADR-210; grammar
*changes* (anything not in design.md) require David's approval via
`docs/architecture/chord-grammar-changes.md`.

**Current coverage: Phase A subset** (Cloak-complete). Constructs design.md
defines but Phase A excludes are marked *Phase B* and are parse errors today
(`parse.phase-b-construct`).

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
| prose paragraph | first bare line | blank line or dedent |
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
             | define-verb | define-text | define-flag | when-rule ;
             (* Phase B: define-action, define-trait, define-sequence, once, every *)
```

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
             | "phrase" WORD ":" text-value                (* per-entity override *)
             | on-clause
             | prose-paragraph ;                           (* post-blank: description, max one *)

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
define-phrase    = "define" "phrase" WORD [ "," STRATEGY ] NL
                   variant { "or" NL variant } "end" "phrase" NL ;
variant          = prose-paragraph ;
define-phrases   = "define" "phrases" LOCALE NL >>> { phrase-entry } ;
phrase-entry     = WORD ":" ( STRING NL | rest-of-line NL | NL prose-paragraph ) ;
define-verb      = "define" "verb" WORD { "or" WORD } "means" pattern NL ;
pattern          = { WORD | "(" WORD ")" } ;               (* (something) = slot *)
define-text      = "define" "text" WORD "from" STRING NL ; (* TS hatch *)
define-flag      = "define" "flag" WORD "starts" token NL ;
STRATEGY         = "randomly" | "cycling" | "ordered" | "once" ;
```

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
   line are composition; the first non-keyword paragraph *after* a blank is
   the description (a second one is an error).
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
