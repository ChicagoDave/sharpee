# The Chord Grammar

The complete grammar of the Chord story language (ADR-210) as implemented,
including the 2026-07-10 grammar-log changes (prose-block-only phrase text,
paragraph breaks, `{br}`, `verbatim`).

Provenance: this is the full grammar as of 2026-07-10 (Phase A complete).
The **living** copy that tracks the parser commit-by-commit is
`docs/reference/chord-grammar.md`; grammar *changes* (anything beyond
`docs/work/story-language/design.md`) require David's approval, logged in
`docs/architecture/chord-grammar-changes.md` (a one-way ratchet).

**Coverage: Phase A subset** (Cloak-complete). Constructs design.md defines
but Phase A excludes are marked *Phase B* and are parse errors today.

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

Quoted strings appear only in non-prose positions: the story header
(`story "…" by "…"`) and hatch module paths (`define text X from "./…"`).
All prose is bare text in indented prose blocks.

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
             | "phrase" WORD ":" NL prose-block            (* per-entity override *)
             | on-clause
             | prose-block ;                               (* post-blank: description; consecutive
                                                              bare paragraphs append *)

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

Kind nouns (v1, prereqs §5): `a room`, `a door` *(Phase B — needs `between`)*,
`a person`, `a container`, `a supporter`; no kind noun = plain thing.
Trait adjectives (v1): `scenery`, `wearable`, `readable`, `openable`,
`lockable`, `switchable`, `edible`, `pushable`, `pullable`, `light-source`,
`plural`, `dark`.

## define

```
define-condition = "define" "condition" WORD ":" condition NL ;
define-phrase    = "define" "phrase" WORD [ "," ( STRATEGY | "verbatim" ) ] NL
                   variant { "or" NL variant } "end" "phrase" NL ;
                   (* verbatim: single variant, line structure + relative
                      indentation preserved; no "or" variants *)
variant          = prose-block ;
define-phrases   = "define" "phrases" LOCALE NL >>> { phrase-entry } ;
phrase-entry     = WORD ":" NL prose-block ;               (* prose block only — same-line
                                                              quoted/bare forms removed *)
define-verb      = "define" "verb" WORD { "or" WORD } "means" pattern NL ;
pattern          = { WORD | "(" WORD ")" } ;               (* (something) = slot *)
define-text      = "define" "text" WORD "from" STRING NL ; (* TS hatch; name "br" reserved *)
define-flag      = "define" "flag" WORD "starts" token NL ;
STRATEGY         = "randomly" | "cycling" | "ordered" | "once" ;
```

## Prose blocks and formatting

- A prose block is consecutive bare indented lines; lines join with single
  spaces (inter-line whitespace collapses).
- A **blank line inside a prose block is a paragraph break** (`\n\n` in the
  compiled text → a fresh text block downstream). In `create` blocks the
  block still ends at a blank line so keyword lines stay out of prose;
  consecutive bare paragraphs all append to the description.
- **`{br}` is the built-in hard-line-break marker** (flush line stacking,
  no paragraph gap). `br` is reserved: it needs no declaration and cannot
  be used as a phrase or hatch name (`analysis.reserved-marker`).
- **`define phrase X, verbatim`** preserves line structure, interior blank
  lines, and relative indentation (the common leading indent is stripped);
  mutually exclusive with strategies and `or` variants. Only a column-1
  line ends a verbatim block, so its content may contain any words.
- `{…}` markers otherwise name a declared hatch or phrase key (validated,
  AC-3); formatter-chain forms (`{You}`, `{verb:is item}`) pass through.

Example — every formatting construct together:

```
create the Hall
  a room

  The first paragraph of the description.

  The second paragraph.

define phrase engraving
  Here lies the mighty grue.{br}
  It could not see in daylight.
end phrase

define phrase treasure-map, verbatim
      N
    W + E
      S

  X marks the spot.
end phrase
```

## when

```
when-rule    = "when" header-words [ "while" condition ] NL
               >>> { statement } "end" "when" NL ;
header-words = WORD { WORD } ;   (* unsegmented: actor/verb/target split is the
                                    analyzer's job, against the event-selector map *)
```

Event-verb set (Phase A): `enters`. Growing this set is a grammar change
(governance log).

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

Phase-order rule (load-time gate): in an `on` clause, `refuse` statements
must precede the first mutation (`analysis.refusal-after-mutation`).
`refuse` is not legal in `when` rules.

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
`randomly` and `one chance in <n>` route through the platform's seeded RNG
(cursor persisted in world state) — repeated runs with a fixed seed are
byte-identical (AC-5).

## Resolution and gates (analyzer)

- **Entity IDs** are the lowercased name words joined with `-`
  (`the Foyer of the Opera House` → `foyer-of-the-opera-house`); the
  article is stripped and kept separately. Resolution order: exact name →
  exact alias → unique in-order word-subset. Ambiguity/misses are errors
  with rename/nearest suggestions — never a guess.
- **Descriptions and per-entity overrides become derived phrase keys**
  (`<entity-id>.description`, `<entity-id>.<key>`) in the story's default
  locale (Phase A: `en-US`).
- **Load-time gate classes** (AC-3, each with `.story` line numbers):
  missing phrase key · unknown predicate value (with nearest-valid
  suggestion) · undeclared state · ambiguous reference (with rename
  suggestion) · refusal after mutation · unbound `{…}` marker · reserved
  marker name (`br`) · duplicate phrase.
- **`is <word>` objects** must be a declared state of the subject entity,
  a v1 trait adjective, a literal, or an entity name.

## Full readings log

Design-ambiguity readings resolved in code (parser readings 1–7, analyzer
readings 8–12) are recorded in `docs/reference/chord-grammar.md` — the
living copy of this notation.
