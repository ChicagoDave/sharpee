## ADR-270 acceptance 15 — the I7 bar made assertable: this story removes a
## standard verb, adds a synonym to a standard action, and flips which of two
## competing rules wins, each observably changing what parses.

story
  title: Grammar Alterations
  authors:
    Sharpee
  id: grammar-alterations
  story-version: 0.0.1

create the Study
  a room

  A quiet study.

create the lamp
  in the Study

  A brass lamp.

create the book
  in the Study

  A dusty book.

create Alex
  a person
  playable
  starts in the Study

  You.

## (i) extend — a new synonym onto stdlib taking (if.action.taking).

extend action taking
  grammar
    snag the item

## (ii) remove — `get` stops reaching taking; `take` and the rest stay.

remove from action taking
  get the item

## (iii) reorder — restate `read the target` under examining: the story-tier
## rule now beats reading's standard rule for the same command.

extend action examining
  grammar
    read the target

before the game starts
  change the player to Alex
end before
