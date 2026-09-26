## A dedicated fixture for END STATE cards (ADR-356 D4, AC-6): one clause
## that wins by name and one that kills by name, so a tree line can end on
## either and the walker's ending claim can be checked against the real
## Ending record. Not story content.

story
  title: End State
  authors:
    Sharpee
  id: end-state
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the strongbox
  scenery
  aka box
  in the Hall

  A strongbox.

  on the player examining
    win box-opened
  end on

create the loose beam
  scenery
  aka beam
  in the Hall

  A loose beam.

  on the player touching
    kill the player cave-in
  end on

create Alex
  a person, proper
  playable
  starts in the Hall

define phrase box-opened
  The box opens. You win.
end phrase

define phrase cave-in
  The beam gives way.
end phrase

before the game starts
  change the player to Alex
end before
