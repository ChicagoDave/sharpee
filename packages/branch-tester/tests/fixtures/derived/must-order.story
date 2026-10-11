## A dedicated fixture for GH #549 Phase 4: a `define action` whose `must`
## line is written before its `refuse when` line. The loader runs the
## refusal ladder first, so the `must` refusal fires only once `the stove
## is cold` fails — a two-valued declared state, written as `hot`. Not
## story content.

story
  title: Derived Must Order
  authors:
    Sharpee
  id: derived-must-order
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the Bath
  a room

  A bath.

create the stove
  a thing, scenery
  in the Bath
  states, reversible: cold, hot

  A stove.

define action bathing
  grammar
    bathe
  the player must be in the Bath: nowhere-to-bathe
  refuse when the stove is cold: water-cold
  phrase the-bath

define phrase nowhere-to-bathe
  Not here.
end phrase
define phrase water-cold
  Freezing.
end phrase
define phrase the-bath
  Lovely.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before
