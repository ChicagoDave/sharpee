# Appendix A. The grammar {.unnumbered}

The Chord grammar in EBNF, as the compiler implements it: 213 rules in 23 sections.
The grammar file's comments are left out, so this is the productions alone. Generated from
`chord.ebnf` (Sharpee 5.6.2 · Chord 4.0.3) by `scripts/generate-chord-appendices.cjs`.

```text
Notation:
  UPPER      = token class          "quoted" = literal word
  [ x ]      = optional             { x }    = zero or more
  x | y      = alternatives         ( * … * ) = comment (written without the spaces)
  NL         = end of source line (Chord is line-oriented)
  >>>        = an indented block follows (layout; EBNF cannot express
               indentation — the summary below is the rule)

Layout summary:
  - Indentation is spaces only; a tab is a lex error.
  - Blocks open with their header line and close at dedent or their
    explicit "end <kw>" terminator per the Layout table.
  - A blank line inside a prose block is a paragraph break; in create
    blocks a blank line ends the block, but later bare paragraphs
    append to the description.
```

## Tokens {.unnumbered .unlisted}

```ebnf
WORD    = letter { letter | digit | "'" | "-" | "_" } ;
NUMBER  = digit { digit } { "." digit { digit } } ;
STRING  = '"' any-except-'"' '"' ;
MARKER  = "{" content "}" ;
LOCALE  = WORD ;
rest-of-line    = any-except-NL ;
prose-line      = rest-of-line NL ;
prose-paragraph = prose-line { prose-line } ;
inline-prose    = >>> prose-paragraph ;
```

## Comments {.unnumbered .unlisted}

```ebnf
comment-line = "##" rest-of-line NL ;
comment-run  = comment-line { comment-line } ;
```

## Top level {.unnumbered .unlisted}

```ebnf
story-file   = [ comment-run ] [ story-header ] { declaration | comment-run } ;
grammar-file   = [ comment-run ] grammar-header
                 { define-action | "import" STRING NL | comment-run } ;
grammar-header = "grammar" STRING NL ;
claims-file  = [ comment-run ] claims-block { comment-run } ;
claims-block = "claims" NL
                 >>> { needs-line } claim-decl { claim-decl }
               "end" "claims" NL ;
needs-line   = "needs" ( "rooms" | "things" ) ":" name { "," [ "and" ] name } NL
             | "needs" "verbs" ":" verb-phrase { "," verb-phrase } NL ;
verb-phrase  = WORD { WORD } ;
claim-decl   = "claim" rest-of-line NL
                 >>> claim-predicate { needs-line } ;
claim-predicate = "the" "story" "ends" "in" WORD NL
                | "the" "story" "has" "ended" NL
                | name "was" "asked" "about" STRING NL
                | name "has" "been" WORD NL
                | condition NL ;
story-header = "story" NL
               >>> { states-line | score-line | story-on-clause | use-line
                   | use-phrasebook-line
                   | timer-clause
                   | meta-field } ;
meta-field   = "title" ":" rest-of-line NL
             | "id" ":" rest-of-line NL
             | "story-version" ":" rest-of-line NL
             | "ifid" ":" rest-of-line NL
             | name-list-field | prose-field
             | client-config-field ;
client-config-field
             = ( "client" | "theme" | "template"
               | "default-theme" | "storage-prefix" ) ":" rest-of-line NL
             | "themes" ":" rest-of-line NL ;
name-list-field = ( "authors" | "testers" ) ":" [ rest-of-line ] NL
                  { >>> rest-of-line NL } ;
prose-field  = ( "prologue" | "description" ) ":" [ rest-of-line ] NL
               { >>> rest-of-line NL } ;
use-line     = use-scoring-line | use-hunger-line | use-plain-line ;
use-plain-line = "use" WORD [ announce-suffix ] NL ;
use-scoring-line = "use" "scoring" [ announce-suffix ] NL
               >>> { rank-line } ;
announce-suffix = "," "announce"
                  ( "all" | "collapsed" | "combined" | "silent" ) ;
use-hunger-line = "use" "hunger" [ announce-suffix ] NL
               >>> { hunger-grows-line
                   | meter-rung-line
                   | hunger-fatal-line } ;
hunger-grows-line = "grows" NUMBER "each" "turn" NL ;
meter-rung-line = WORD "at" NUMBER [ "says" WORD ] NL ;
hunger-fatal-line = "fatal" "at" NUMBER NL ;
rank-line    = "rank" STRING "at" NUMBER [ "says" WORD ] NL ;
story-on-clause = on-clause ;
declaration  = create | start-block | define-condition | define-phrase | define-phrases
             | define-trait | define-action
             | define-sequence
             | define-counter
             | define-timer
             | define-chapters
             | define-machine
             | define-fact | define-profile
             | define-mood | define-personality
             | define-temperament | define-code
             | define-honor | define-topic
             | define-asset | define-channel
             | define-family-channel
             | define-topics
             | define-manner | define-greetings
             | define-exchange | define-initiative
             | define-conversation
             | define-pronouns
             | define-phrasebook | import-phrasebook
             | override-message | override-messages
             | extend-action | remove-from-action ;
```

## Message overrides {.unnumbered .unlisted}

```ebnf
override-message    = "override" "message" ALIAS
                      [ "," ( STRATEGY | "verbatim" ) ] NL
                      >>> prose { "or" NL >>> prose }
                      "end" "override" NL ;
override-messages   = "override" "messages" LOCALE NL
                      >>> { ALIAS ":" NL >>> prose } ;
ALIAS               = WORD ;
```

## Phrasebooks {.unnumbered .unlisted}

```ebnf
define-phrasebook   = "define" "phrasebook" WORD [ "while" condition ] NL
                      >>> { phrasebook-entry }
                      "end" "phrasebook" NL ;
phrasebook-entry    = WORD [ "," STRATEGY | "," "verbatim" ] ":" NL
                      >>> prose { "or" NL >>> prose } ;
use-phrasebook-line = "use" "phrasebook" WORD [ "while" condition ] NL ;
import-phrasebook   = "import" "phrasebook" STRING NL ;
```

## Ownership lines {.unnumbered .unlisted}

```ebnf
states-line  = "states" [ "," "reversible" ] ":" WORD { "," WORD } NL ;
score-line   = "score" WORD "worth" NUMBER NL ;
holds-line   = "holds" NUMBER NL ;
opens-when-line = "opens" "when" "unlocked" NL ;
closes-when-line = "closes" "when" "switched" "off" NL ;
servings-line = "servings" NUMBER NL ;
vehicle-line = "movement" ":" ( "none" | "line" | "streets"
                              | "compass" | "flight"
                              | "open" ) NL
             | "carries" ":" ( "in" | "on" ) NL
             | "drive" ":" ( "state" | "control" | "player" ) NL
             | "commands" ":" WORD { "," WORD } NL
             | "stops" ":" name { "," name } NL
             | "direction" ":" ( "both" | "one-way" ) NL
             | "pace" ":" NUMBER ( "turn" | "turns" ) NL
             | "destinations" ":" name { "," name } NL
             | "aboard" ":" name { "," name } NL
             | "boarded" "through" ":" name NL
             | "stride" ":" NUMBER ( "unit" | "units" ) NL
             | sight-line
             | seen-from-afar-line
             | "sails" ":" WORD { "," WORD } NL
             | "sails" "start" ":" WORD NL
             | sailing-block ;
sailing-block = "sailing" NL
              >>> { NUMBER "to" NUMBER "degrees" ":" sailing-cells NL
                  | "calm" ":" sailing-pace NL }
                "end" "sailing" NL ;
sailing-cells = sailing-pace
              | WORD sailing-pace { "," WORD sailing-pace } ;
sailing-pace = NUMBER ( "turn" | "turns" ) | "stopped" ;
sight-line   = "sight" ":" NUMBER NL ;
seen-from-afar-line = "seen" "from" "afar" ":" rest-of-line NL ;
expanse-line = "size" ":" NUMBER "by" NUMBER NL
             | "visibility" ":" NUMBER NL
             | "wind" ":" ( "from" ( DIRECTION | NUMBER "degrees" )
                          | "calm" ) NL
             | "drift" ":" "1" "unit" "every" NUMBER ( "turn" | "turns" ) NL ;
landmarks-block = "landmarks" NL
                >>> { name ":" NUMBER "," NUMBER NL }
                  "end" "landmarks" NL ;
admits-line  = "admits" ":" admits-list NL ;
admits-list  = admits-word { "," admits-word } ;
admits-word  = name | "pushing" ;
pushing-block = "pushing" NL
               >>> { ( "between" name "and" name | "from" name "to" name ) NL }
                 "end" "pushing" NL ;
position-block = "position" NL
               >>> { "when" condition ":" name NL }
                   "otherwise" ":" name NL
                 "end" "position" NL ;
counter-line = "counter" WORD [ "starts" NUMBER ]
                         [ "between" NUMBER "and" NUMBER ] NL ;
```

## On / after clauses {.unnumbered .unlisted}

```ebnf
on-clause    = ( "on" | "after" ) clause-form
               [ "while" condition | "during" WORD ]
               { "," clause-modifier } NL
               >>> { statement } "end" ( "on" | "after" ) NL ;
clause-form  = head [ counterpart ]
               [ "to" WORD
               | "to" name ]
               [ "anything" "as" "the" WORD ]
             | "every" "turn" ;
head         = actor gerund { "," gerund }
             | gerund { "," gerund }
             | "hearing" ARTICLE WORD ;
actor        = "the" "player"
             | name ;
gerund       = WORD ;
counterpart  = [ "at" | "for" | "from" | "about" | "in" ] ARTICLE name
             | ( "at" | "for" | "from" ) name ;
clause-modifier = "once"
             | ( "before" | "after" ) WORD ;
```

## Start block {.unnumbered .unlisted}

```ebnf
start-block  = "before" "the" "game" "starts" NL >>> { statement } "end" "before" NL ;
```

## Create {.unnumbered .unlisted}

```ebnf
create       = "create" name [ "," composition { "," composition } ] NL
               >>> { create-line } ;
create-line  = "aka" alias { "," alias } NL
             | "pronouns" WORD NL
             | states-line
             | score-line
             | counter-line
             | holds-line
             | servings-line
             | opens-when-line | closes-when-line
             | vehicle-line
             | admits-line
             | position-block
             | pushing-block
             | expanse-line
             | sight-line | seen-from-afar-line
             | landmarks-block
             | composition { "," composition } NL
             | "playable" NL
             | placement NL
             | "wears" name NL
             | "carries" name NL
             | landing-line
             | room-group
             | exit-table
             | exit [ "," "one-way" ]
               [ "admits" admits-list ] [ "while" condition ] NL
             | exits-line
             | passage-block
             | DIRECTION "is" "blocked" [ "while" condition ] ":" phrase-key NL
             | DIRECTION "is" "deadly" ":" phrase-key NL
             | phrase-override
             | room-name-block
             | "first" "time" NL >>> prose-paragraph
             | on-clause
             | timer-clause | move-clause
             | mood-line | feels-line | knows-line | thinks-line
             | spreads-line
             | resists-line
             | influence-block
             | goal-block
             | temperament-line
             | "answers" "honestly" NL
             | honor-line
             | "burdened" "by" name NL
             | "code" WORD NL
             | prose-paragraph ;
```

## The character model {.unnumbered .unlisted}

```ebnf
mood-line    = "mood" WORD NL ;
feels-line   = "feels" disposition [ "toward" ] name NL ;
disposition  = WORD [ WORD ] ;
knows-line   = "knows" name { "," WORD } NL ;
thinks-line  = "thinks" name "is" name { "," WORD } NL ;
spreads-line = "spreads" "nothing" NL
             | "spreads" [ topic-list ] [ "chatty" ] "to" WORD
               [ "," "except" name-ref-list ] NL ;
topic-list   = name { ( "," | "and" ) name } ;
name-ref-list = name { "," [ "and" ] name | "and" name } ;
resists-line = "resists" WORD [ "," "except" "from" name ] NL ;
influence-block = "influence" WORD { "," WORD } NL
               >>> { influence-line }
               "end" "influence" NL ;
influence-line = "clouds" "focus" NL
             | "makes" WORD WORD NL
             | "phrase" phrase-key "on"
               ( "witnessed" | "resisted" | "expired" ) NL ;
define-fact  = "define" "fact" name NL
               >>> { name-ref-list NL }
               "end" "fact" NL ;
define-profile = "define" "profile" WORD NL
               >>> { WORD WORD NL }
               "end" "profile" NL ;
define-mood  = "define" "mood" WORD "like" WORD
               [ "," "but" WORD ] NL ;
define-personality = "define" "personality" WORD NL ;
```

## The normative layer {.unnumbered .unlisted}

```ebnf
temperament-line = "temperament" WORD [ "with" force-pair { "and" force-pair } ]
                   [ "while" WORD ] NL
             | "temperament" force-pair { "and" force-pair }
               [ "while" WORD ] NL ;
force-pair   = WORD "over" WORD ;
never-line   = "never" WORD { WORD }
               [ "," "except" [ "to" "protect" ] scope-ref ] NL ;
protects-line = "protects" scope-ref NL ;
honor-line   = "honor" [ WORD ] "before" scope-ref
               [ "," "except" name-ref-list ] NL ;
scope-ref    = "anyone" | name ;
define-temperament = "define" "temperament" WORD NL
               >>> { force-pair NL }
               "end" "temperament" NL ;
define-code  = "define" "code" WORD NL
               >>> { never-line | protects-line | "answers" "honestly" NL }
               "end" "code" NL ;
define-honor = "define" "honor" WORD NL
               >>> { WORD { WORD } NL }
               "end" "honor" NL ;
define-topic = "define" "topic" WORD WORD { WORD } "as" WORD NL ;
goal-block   = "goal" WORD "," WORD NL
               >>> { goal-line }
               "end" "goal" NL ;
goal-line    = "active" "when" condition NL
             | "seek" name [ "in" name ] NL
             | "acquire" name NL
             | "wait" "for" condition NL
             | "move" "to" name NL
             | "act" phrase-key NL
             | "say" phrase-key [ "to" name ] NL
             | "give" name "to" name NL
             | "drop" name [ "in" name ] NL
             | verb-words NL ;
```

## Chapters, a `use chapters` extension {.unnumbered .unlisted}

```ebnf
define-chapters = "define" "chapters" NL
                  >>> { chapter-row }
                  "end" "chapters" NL ;
chapter-row  = WORD "-" rest-of-line NL
               >>> [ prose-paragraph ]
               "begins" "when" chapter-trigger NL ;
chapter-trigger = "the" "game" "starts"
             | "the" "player" "visits" name
               "for" "the" "first" "time"
             | value-expr "expires"
             | name "becomes" WORD ;
```

## Timers, places, landings {.unnumbered .unlisted}

```ebnf
define-timer = "define" "timer" WORD [ "for" name ] NL
               >>> { timer-line }
               "end" "timer" NL ;
timer-line   = WORD NL [ >>> prose-paragraph ]
             | "meanwhile" [ "," "one" "chance" "in" NUMBER ] NL
               >>> { statement }
             | "interrupted" "one" "chance" "in" NUMBER NL ;
timer-clause = "when" value-expr "expires"
               [ [ "," ] "while" condition ] NL
               >>> { statement } "end" "when" NL ;
move-clause  = "when" value-expr "moves"
               [ [ "," ] "while" condition ] NL
               >>> { statement } "end" "when" NL ;
landing-line = "landing" name NL
             | "landing" "," LANDING-STRATEGY ":" name-ref-list NL ;
LANDING-STRATEGY = "randomly" | "cycling" | "stopping" ;
phrase-override = "phrase" phrase-key
                  [ "," STRATEGY ] [ "while" condition ] ":" NL
                  variant { "or" NL variant } ;
room-name-block = "room" "name" [ "while" condition ] ":" NL
                  >>> prose-paragraph ;
room-group   = "rooms" stem NUMBER "to" NUMBER NL >>> { group-line } ;
stem         = WORD { WORD | NUMBER } ;
group-line   = composition { "," composition } NL
             | "aka" alias { "," alias } NL
             | admits-line
             | room-name-block
             | "first" "time" NL >>> prose-paragraph
             | prose-paragraph ;
exit-table   = "exits" [ "," "one-way" ] NL >>> exit-row { exit-row } ;
exit-row     = name ":" exit { "," exit } NL ;
exits-line   = "exits" [ "," "one-way" ] ":" exit { "," exit } NL ;
passage-block = "passage" "to" ( name | "outside" ) [ "through" name ] NL
              >>> "grammar" NL
                  >>> passage-pattern NL { passage-pattern NL }
                  { passage-line }
                "end" "passage" NL ;
passage-pattern = passage-elem { passage-elem } ;
passage-elem = WORD { "or" WORD } | "[" WORD { "or" WORD } "]" ;
passage-line = "while" condition NL
             | "blocked" [ "while" condition ] ":" phrase-key NL
             | "deadly" ":" phrase-key NL ;
exit         = DIRECTION "to" ( name | "outside" )
               [ "through" name ] ;
composition  = ( ARTICLE KIND-NOUN | WORD )
               [ "with" setting { "and" setting } ]
               [ "while" condition ]
             | "costs" NUMBER WORD
             | "powered" "by" ARTICLE name
               { "and" ARTICLE name }
             | "attached" "to" ARTICLE name
             | "wearable" "on" ARTICLE WORD { WORD }
             | "starts" STATE-INIT ;
STATE-INIT   = "locked" | "unlocked" | "closed" | "open"
             | "off" | "on" | "broken"
             | "lit" | "unlit" ;
KIND-NOUN    = "thing" | "room" | "door" | "person"
             | "container" | "supporter" | "region"
             | "vehicle"
             | "expanse" ;
setting      = ARTICLE name
             | WORD { WORD }
               ( NUMBER | STRING | WORD | name-list-value
               | ARTICLE name ) ;
name-list-value = "[" name { "," name } "]" ;
placement    = ( "in" | "on" ) ARTICLE name
               [ "at" NUMBER "," NUMBER ]
             | "in" ARTICLE name { "," ARTICLE name }
               "and" ARTICLE name
             | "starts" "in" name ;
DIRECTION    = "north" | "south" | "east" | "west"
             | "northeast" | "northwest" | "southeast" | "southwest"
             | "up" | "down"
             | "in" | "out" ;
```

## Define {.unnumbered .unlisted}

```ebnf
define-condition = "define" "condition" WORD ":" condition NL ;
define-phrase    = "define" "phrase" phrase-key [ "," ( STRATEGY | "verbatim" ) ]
                   [ "while" condition ] NL
                   variant { "or" NL variant } "end" "phrase" NL ;
variant          = prose-paragraph ;
define-phrases   = "define" "phrases" LOCALE NL >>> { phrase-entry } ;
phrase-entry     = phrase-key ":" NL prose-paragraph ;
pattern          = pattern-elem { pattern-elem } ;
pattern-elem     = plain-elem | "[" plain-elem "]"
                 | "[" "the" "]" ;
plain-elem       = WORD { "or" WORD } | "the" WORD ;
STRATEGY        = "randomly" | "cycling" | "stopping" | "sticky" | "first-time" ;
```

## Traits, actions, sequences {.unnumbered .unlisted}

```ebnf
define-trait   = "define" "trait" WORD NL
                 { trait-line }
                 "end" "trait" NL ;
trait-line     = "data" NL >>> { trait-field }
               | states-line
               | score-line
               | "phrases" LOCALE NL >>> { phrase-entry }
               | on-clause ;
trait-field    = field-words ":" [ "optional" ]
                 ( "entity" | "number" | "name"
                 | "one" "of" WORD { "," WORD } )
                 [ "," "starts" token ] NL ;
define-action  = "define" "action" WORD [ "while" condition ] NL action-line* ;
action-line    = "grammar" NL >>> { pattern-line }
               | "the" WORD "must" "be" WORD NL
               | "the" WORD "takes" "the" "rest" "of" "the" "line" NL
               | "the" WORD "is" ( "an" | "a" ) WORD NL
               | "directions" NL >>> { WORD { "or" WORD } NL }
               | must-line
               | score-line
               | "refuse" "without" WORD ":" phrase-key NL
               | "refuse" "when" condition ":" phrase-key NL
               | "otherwise" "refuse" phrase-key NL
               | topic-row
               | "phrases" LOCALE NL >>> { phrase-entry }
               | statement ;
pattern-line   = pattern [ "→" token { token } ] NL
                 { "means" WORD WORD NL } ;
```

## Author alteration model {.unnumbered .unlisted}

```ebnf
extend-action  = "extend" "action" WORD NL action-line* ;
remove-from-action
               = "remove" "from" "action" WORD NL
                 >>> { pattern NL } ;
define-sequence= "define" "sequence" WORD { WORD } NL
                 { sequence-step } "end" "sequence" NL ;
```

## Numeric counters {.unnumbered .unlisted}

```ebnf
define-counter = "define" "counter" WORD [ "starts" NUMBER ]
                          [ "between" NUMBER "and" NUMBER ] NL ;
```

## State-machine depth {.unnumbered .unlisted}

```ebnf
define-machine = "define" "machine" WORD { WORD } NL
                 >>> { "role" WORD "is" name NL
                     | "starts" WORD NL
                     | machine-state }
                 "end" "machine" NL ;
machine-state  = "state" WORD [ "," "terminal" ] NL
                 >>> { machine-when | machine-on } ;
machine-when   = "when" machine-trigger [ "while" condition ] ":" WORD NL ;
machine-trigger= "event" phrase-key
               | WORD name
               | WORD
               | condition ;
machine-on     = ( "on" "enter" | "on" "exit" ) NL
                 >>> { statement } "end" "on" NL ;
```

## Declared assets + custom channels {.unnumbered .unlisted}

```ebnf
define-asset   = "define" ( "sound" | "image" | "music" )
                 WORD "from" STRING NL
               | "define" "sound" WORD NL
               | "define" "sound" WORD [ "from" STRING ] NL
                 >>> { sound-line } "end" "sound" NL ;
sound-line     = "heard" ":" rest-of-line NL
               | "heard" "from" "afar" ":" rest-of-line NL ;
define-family-channel
             = "define" ( "ambient" | "layer" ) WORD NL ;
define-channel = "define" "channel" WORD NL
                 >>> { "mode" ( "replace" | "append" | "event" ) NL
                     | "gated" "by" WORD NL
                     | "return" channel-return "from" WORD NL
                       [ channel-record-body ] }
                 "end" "channel" NL ;
channel-return = WORD | STRING | "phrase" WORD
               | "record" ;
channel-record-body
             = >>> { channel-record-member }
               "end" "record" NL ;
channel-record-member
             = WORD [ "list" "of" ] channel-return NL ;
define-topics  = "define" "topics" "for" name NL
                 >>> { topic-row }
                 "end" "topics" NL ;
topic-row      = "about" topic-key ":" ( statement
                                       | NL >>> { statement } ) ;
topic-key      = name
               | STRING { "," STRING } ;
define-manner  = "define" "manner" "for" name NL
                 >>> { manner-row }
                 "end" "manner" NL ;
manner-row     = "when" condition ":" NL
                 >>> { "beat" STRING NL
                     | "voice" WORD NL } ;
define-greetings = "define" "greetings" "for" name NL
                   >>> { greeting-row }
                   "end" "greetings" NL ;
greeting-row   = greeting-head ":" ( statement
                                   | NL >>> { statement } ) ;
greeting-head  = "first" "time"
               | "on" "return" [ "," absence-words ]
               | "asked" repetition-words
               | "on" "leaving" ;
absence-words  = "again" "so" "soon"
               | "after" "a" "while"
               | "after" "days" ;
repetition-words = "once" | "again" | "many" "times" ;
define-exchange = "define" "exchange" WORD "for" name
                  [ "," strength-word ] NL
                  >>> { exchange-row }
                  "end" "exchange" NL ;
exchange-row   = exchange-head ":" ( statement
                                   | NL >>> { statement } ) ;
exchange-head  = "answer" topic-key
               | "on" "silence"
               | "on" WORD ;
strength-word  = "passive" | "assertive" | "blocking" ;
define-initiative = "define" "initiative" "for" name NL
                    >>> { initiative-row }
                    "end" "initiative" NL ;
initiative-row = occasion-head [ "," "when" condition ]
                 ":" ( statement | NL >>> { statement } ) ;
occasion-head  = "on" "an" "open" "floor"
               | "on" "silence"
               | "when" "the" "subject" "changes"
               | "on" WORD ;
define-conversation = "define" "conversation" WORD "for" name
                      [ "," strength-word ] NL
                      >>> { conversation-row }
                      "end" "conversation" NL ;
conversation-row = "about" topic-key NL
                 | "opens" "when" condition NL
                 | "beat" [ "," "when" condition ] ":"
                   ( statement | NL >>> { statement } )
                 | "on" transition-word ":"
                   ( statement | NL >>> { statement } )
                 | "conclusion" ":"
                   ( statement | NL >>> { statement } ) ;
transition-word = "parting" | "resuming" | "refusing" ;
define-pronouns = "define" "pronouns" WORD NL
                  >>> { PRONOUN-CASE WORD NL }
                  "end" "pronouns" NL ;
PRONOUN-CASE    = "subject" | "object" | "possessive"
                | "possessive-pronoun" | "reflexive" ;
sequence-step  = step-anchor NL >>> { statement } ;
step-anchor    = "at" "turn" NUMBER
               | NUMBER "turns" "later"
               | "when" name "becomes" ( WORD | "under" "way" )
               | "when" name "comes" "into" "sight" ;
```

## Must requirements {.unnumbered .unlisted}

```ebnf
must-line    = must-subject "must" infinitive ":" phrase-key NL ;
must-subject = value-expr ;
infinitive   = "be" ( ( "a" | "an" ) WORD { WORD }
                    | "in" name
                    | "any" WORD
                    | value-expr )
             | ( "have" | "hold" | "wear" ) name
             | ( "see" | "reach" ) name ;
```

## Statements {.unnumbered .unlisted}

```ebnf
statement    = "refuse" phrase-key { param } NL
             | "refuse" "when" condition ":" phrase-key NL
             | must-line
             | "phrase" phrase-key { param } [ stmt-when ] NL [ inline-prose ]
             | "emit" phrase-key
               [ "with" emit-field { "and" emit-field } ]
               [ stmt-when ] NL
             | media-statement
             | "set" value-expr "to" value-expr [ stmt-when ] NL
             | "change" "mood" "to" WORD [ stmt-when ] NL
             | "change" "feeling" "toward" name "to" disposition
               [ stmt-when ] NL
             | "change" "the" "player" "to" name [ stmt-when ] NL
             | "change" name "to" WORD [ stmt-when ] NL
             | "move" name ( "to" place | "here" | "offstage" )
               [ stmt-when ] NL
             | "make" name ( "wear" | "take" "off" ) name
               [ stmt-when ] NL
             | timer-verb value-expr
               [ "heading" ( DIRECTION | NUMBER "degrees" ) ]
               [ stmt-when ] NL
             | "send" name "to" ( name | NUMBER "," NUMBER )
               [ stmt-when ] NL
             | "kill" "the" "player" [ phrase-key ] [ stmt-when ] NL
               [ >>> prose-paragraph ]
             | name verb-words [ stmt-when ] NL
             | "remove" name [ stmt-when ] NL
             | "award" { token } [ "," "once" ] [ stmt-when ] NL
             | ( "raise" | "lower" ) counter-ref "by" NUMBER
               [ stmt-when ] NL
             | "win" [ WORD ] [ stmt-when ] NL
             | "lose" [ WORD ] [ stmt-when ] NL
             | "then" ( "asks" | "invites" ) WORD NL
             | "deflect" "to" ( name | STRING ) NL
             | "leave" NL
             | "hold" "their" "tongue" NL
             | select-on | select-strategy | ordinal-block | each-block ;
stmt-when    = "when" condition ;
timer-verb   = "start" | "stop" | "restart" | "reset" | "interrupt" ;
place        = name
             | name "'s" "location" | "its" "location"
             | "a" "random" "adjacent" "room" ;
verb-words   = WORD { WORD | name } ;
phrase-key   = WORD ;
param        = "with" WORD { WORD } "=" value-expr ;
```

## Emit payload + media sugar {.unnumbered .unlisted}

```ebnf
emit-field   = WORD { WORD } emit-value ;
emit-value   = NUMBER | STRING
             | "[" [ emit-value { "," emit-value } ] "]"
             | "{" [ emit-field { "," emit-field } ] "}"
             | value-expr ;
media-statement
             = "play" "sound" WORD [ stmt-when ] NL
             | "play" "music" WORD [ "looping" ] [ stmt-when ] NL
             | "play" "ambient" WORD [ "in" WORD ]
               [ stmt-when ] NL
             | "stop" "music" [ stmt-when ] NL
             | "stop" "ambient" [ "in" WORD ]
               [ stmt-when ] NL
             | "show" "image" WORD [ "in" WORD ] [ stmt-when ] NL
             | "hide" "image" [ stmt-when ] NL
             | "transition" WORD [ stmt-when ] NL
             | "clear" [ stmt-when ] NL ;
select-on    = "select" "on" value-expr NL
               >>> { "when" WORD NL >>> { statement } } "end" "select" NL ;
select-strategy = "select" STRATEGY NL
               >>> { statement } { "or" NL >>> { statement } } "end" "select" NL ;
ordinal-block = ORDINAL "time" NL >>> { statement } ;
ORDINAL      = "first" | "second" | "third" | "fourth" | "fifth"
             | "sixth" | "seventh" | "eighth" | "ninth" | "tenth" ;
each-block   = "each" WORD NL
               >>> { statement } "end" "each" NL ;
```

## Conditions {.unnumbered .unlisted}

```ebnf
condition    = and-expr { "or" and-expr } ;
and-expr     = unary { "and" unary } ;
unary        = "not" unary
             | "(" condition ")"
             | "one" "chance" "in" NUMBER
             | "client" "has" WORD
             | ( "any" | "no" ) WORD
             | "the" "subject" "changes"
             | "asked" repetition-words
             | ( "during" | "before" | "after" ) WORD
             | WORD
             | "the" "story" "is" [ "not" ] WORD
             | value-expr predicate ;
predicate    = "is" [ "not" ] ( ( "a" | "an" ) WORD { WORD }
                              | "in" name
                              | "here"
                              | recency-word
                              | "concluded"
                              | "under" "way"
                              | "in" "sight"
                              | "close" "by"
                              | "in" "the" "distance"
                              | "on" "the" "horizon"
                              | "within" NUMBER "of"
                                ( name | NUMBER "," NUMBER )
                              | "at" name
                              | "in" "irons"
                              | "heading" ( DIRECTION
                                          | NUMBER "degrees" )
                              | word-compare NUMBER
                              | value-expr )
             | "are" [ "not" ] WORD
             | "has" [ "not" ] ( "started" | "expired" )
             | ( "has" | "holds" | "wears" ) name
             | "feels" disposition [ "toward" ] name
             | "knows" name
             | "was" "discussed"
             | "can" ( "see" | "reach" ) name
             | compare-op NUMBER ;
recency-word = "fresh" | "recent" | "stale" ;
word-compare = "at" "least" | "more" "than" | "at" "most" | "less" "than" ;
compare-op   = ">=" | ">" | "<=" | "<" ;
counter-ref  = WORD | "its" WORD | name "'s" WORD ;
value-expr   = NUMBER | STRING
             | "the" "match"
             | "its" field-words
             | name [ "'s" field-words ]
             | WORD { WORD } ;
name         = [ ARTICLE ] WORD { WORD } [ NUMBER ] ;
ARTICLE      = "the" | "a" | "an" ;
```
