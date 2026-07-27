## ADR-258 D7 lexer-golden corpus — the grammar surface: `grammar` header,
## slot spellings, or-alternation, [optional] words, typed slots, `means`,
## compass and non-compass `directions` blocks. Excerpted from
## packages/parser-en-us/grammar/standard-en-us.story (ADR-269) and the
## nautical fixture (ADR-267/275). Edit only alongside the golden file.

grammar "lexer-golden-surface"

define action examining
  grammar
    examine the target
    x the target
    look at the target
    look [carefully] at the target

define action searching
  grammar
    search [carefully]
    look in or inside the target
    rummage in or through the target

define action opening
  grammar
    open the container with or using the tool
  the tool is an instrument

define action telling
  grammar
    tell the recipient about the topic
    inform the recipient about the topic
  the topic is a topic

define action going
  grammar
    go the direction
    the direction
  directions
    north or n
    south or s
    northeast or ne
    up or u
    in or inside

define action sailing
  grammar
    sail the direction
  directions
    port or p
    starboard or sb
    fore
    aft

define action hiding
  grammar
    hide behind the target
      means position behind
    duck under the target
      means position under
    hide inside the target
      means position inside
