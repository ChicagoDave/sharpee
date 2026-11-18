# Appendix D. Statements and conditions {.unnumbered}

Every statement a clause body may hold and every test a condition may make, one form to a line, in
the notation of Appendix A: 38 statements, 11 conditions and 24 predicates.
Generated from `chord.ebnf` (Sharpee 5.6.3 · Chord 4.0.3) by `scripts/generate-chord-appendices.cjs`.

## Statements {.unnumbered .unlisted}

```ebnf
"refuse" phrase-key { param } NL
"refuse" "when" condition ":" phrase-key NL
must-subject "must" infinitive ":" phrase-key NL
"phrase" phrase-key { param } [ stmt-when ] NL [ inline-prose ]
"emit" phrase-key [ "with" emit-field { "and" emit-field } ] [ stmt-when ] NL
"play" "sound" WORD [ stmt-when ] NL
"play" "music" WORD [ "looping" ] [ stmt-when ] NL
"play" "ambient" WORD [ "in" WORD ] [ stmt-when ] NL
"stop" "music" [ stmt-when ] NL
"stop" "ambient" [ "in" WORD ] [ stmt-when ] NL
"show" "image" WORD [ "in" WORD ] [ stmt-when ] NL
"hide" "image" [ stmt-when ] NL
"transition" WORD [ stmt-when ] NL
"clear" [ stmt-when ] NL
"set" value-expr "to" value-expr [ stmt-when ] NL
"change" "mood" "to" WORD [ stmt-when ] NL
"change" "feeling" "toward" name "to" disposition [ stmt-when ] NL
"change" "the" "player" "to" name [ stmt-when ] NL
"change" name "to" WORD [ stmt-when ] NL
"move" name ( "to" place | "here" | "offstage" ) [ stmt-when ] NL
"make" name ( "wear" | "take" "off" ) name [ stmt-when ] NL
timer-verb value-expr [ "heading" ( DIRECTION | NUMBER "degrees" ) ] [ stmt-when ] NL
"send" name "to" ( name | NUMBER "," NUMBER ) [ stmt-when ] NL
"kill" "the" "player" [ phrase-key ] [ stmt-when ] NL [ >>> prose-paragraph ]
name verb-words [ stmt-when ] NL
"remove" name [ stmt-when ] NL
"award" { token } [ "," "once" ] [ stmt-when ] NL
( "raise" | "lower" ) counter-ref "by" NUMBER [ stmt-when ] NL
"win" [ WORD ] [ stmt-when ] NL
"lose" [ WORD ] [ stmt-when ] NL
"then" ( "asks" | "invites" ) WORD NL
"deflect" "to" ( name | STRING ) NL
"leave" NL
"hold" "their" "tongue" NL
"select" "on" value-expr NL >>> { "when" WORD NL >>> { statement } } "end" "select" NL
"select" STRATEGY NL >>> { statement } { "or" NL >>> { statement } } "end" "select" NL
ORDINAL "time" NL >>> { statement }
"each" WORD NL >>> { statement } "end" "each" NL
```

## Conditions {.unnumbered .unlisted}

A condition joins tests with `and` and `or`; `not` binds tightest.

```ebnf
condition = and-expr { "or" and-expr } ;
and-expr = unary { "and" unary } ;
```

Each test is one of these.

```ebnf
"not" unary
"(" condition ")"
"one" "chance" "in" NUMBER
"client" "has" WORD
( "any" | "no" ) WORD
"the" "subject" "changes"
"asked" repetition-words
( "during" | "before" | "after" ) WORD
WORD
"the" "story" "is" [ "not" ] WORD
value-expr predicate
```

## Predicates {.unnumbered .unlisted}

What may follow the value a test starts with.

```ebnf
"is" [ "not" ] ( "a" | "an" ) WORD { WORD }
"is" [ "not" ] "in" name
"is" [ "not" ] "here"
"is" [ "not" ] recency-word
"is" [ "not" ] "concluded"
"is" [ "not" ] "under" "way"
"is" [ "not" ] "in" "sight"
"is" [ "not" ] "close" "by"
"is" [ "not" ] "in" "the" "distance"
"is" [ "not" ] "on" "the" "horizon"
"is" [ "not" ] "within" NUMBER "of" ( name | NUMBER "," NUMBER )
"is" [ "not" ] "at" name
"is" [ "not" ] "in" "irons"
"is" [ "not" ] "heading" ( DIRECTION | NUMBER "degrees" )
"is" [ "not" ] word-compare NUMBER
"is" [ "not" ] value-expr
"are" [ "not" ] WORD
"has" [ "not" ] ( "started" | "expired" )
( "has" | "holds" | "wears" ) name
"feels" disposition [ "toward" ] name
"knows" name
"was" "discussed"
"can" ( "see" | "reach" ) name
compare-op NUMBER
```

## The rules these lines name {.unnumbered .unlisted}

```ebnf
stmt-when = "when" condition ;
timer-verb = "start" | "stop" | "restart" | "reset" | "interrupt" ;
place = name | name "'s" "location" | "its" "location" | "a" "random" "adjacent" "room" ;
verb-words = WORD { WORD | name } ;
phrase-key = WORD ;
param = "with" WORD { WORD } "=" value-expr ;
must-subject = value-expr ;
infinitive = "be" ( ( "a" | "an" ) WORD { WORD } | "in" name | "any" WORD | value-expr ) | ( "have" | "hold" | "wear" ) name | ( "see" | "reach" ) name ;
emit-field = WORD { WORD } emit-value ;
emit-value = NUMBER | STRING | "[" [ emit-value { "," emit-value } ] "]" | "{" [ emit-field { "," emit-field } ] "}" | value-expr ;
disposition = WORD [ WORD ] ;
repetition-words = "once" | "again" | "many" "times" ;
recency-word = "fresh" | "recent" | "stale" ;
word-compare = "at" "least" | "more" "than" | "at" "most" | "less" "than" ;
compare-op = ">=" | ">" | "<=" | "<" ;
counter-ref = WORD | "its" WORD | name "'s" WORD ;
value-expr = NUMBER | STRING | "the" "match" | "its" field-words | name [ "'s" field-words ] | WORD { WORD } ;
name = [ ARTICLE ] WORD { WORD } [ NUMBER ] ;
inline-prose = >>> prose-paragraph ;
prose-paragraph = prose-line { prose-line } ;
STRATEGY = "randomly" | "cycling" | "stopping" | "sticky" | "first-time" ;
ORDINAL = "first" | "second" | "third" | "fourth" | "fifth" | "sixth" | "seventh" | "eighth" | "ninth" | "tenth" ;
DIRECTION = "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest" | "up" | "down" | "in" | "out" ;
```
