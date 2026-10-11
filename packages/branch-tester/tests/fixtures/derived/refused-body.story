## A dedicated fixture for GH #549 Phase 4's failure line: a mutating `on`
## body on scenery the standard action refuses. The body never runs — the
## derived test is right to be red — and its line names the standard
## refusal that stood in the way, not just the state that did not change.
## Not story content.

story
  title: Derived Refused Body
  authors:
    Sharpee
  id: derived-refused-body
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the dishes
  a thing, scenery, plural
  in the Hall
  states, reversible: dirty, clean

  Dishes.

  on the player taking
    phrase dishes-dried
    change the dishes to clean
  end on

define phrase dishes-dried
  You dry a plate.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before
