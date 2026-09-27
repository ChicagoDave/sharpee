## A dedicated fixture for the derived runner's SKIPPED outcome (ADR-356
## AC-4): one clause guarded by a timer's named turn (`is turning`), which
## the arrange floor does not write, beside one guarded by a timer phase,
## which the floor writes since 2026-09-27, and one with no guard at all.
## Not story content.

story
  title: Derived Skip
  authors:
    Sharpee
  id: derived-skip
  story-version: 0.0.1

define timer flicker for the brass lamp
  turning
end timer

create the Hall
  a room

  A hall.

create the brass lamp
  scenery
  aka lamp
  states, reversible: dark, lit
  in the Hall

  A lamp.

  on the player examining while flicker has expired
    phrase lamp-after
  end on

  on the player smelling while flicker is turning
    phrase lamp-mid
  end on

  on the player touching
    change the brass lamp to lit
  end on

create Alex
  a person, proper
  playable
  starts in the Hall

define phrase lamp-after
  After the flicker.
end phrase

define phrase lamp-mid
  Mid-flicker.
end phrase

before the game starts
  change the player to Alex
end before
