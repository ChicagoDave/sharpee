## A dedicated fixture for GH #549 Phase 5 (GH #538): guards over a region.
## `the player is in the Grounds` is a membership test, not a containment
## one — the Grounds is a region, and a room joins it by its own `in` line.
## The whistling action's refusal needs the player INSIDE the Grounds: the
## runner writes `player.location = grounds`, which lands in the region's
## first room (the East Yard), and the refusal fires. Its through-line needs
## the player OUTSIDE, which the Hall already is. The gate stands in the
## East Yard, so examining it from outside the Grounds is a negation no room
## satisfies while the gate stays in sight: SKIPPED negation, never a false
## run. Not story content.

story
  title: Derived Region Guard
  authors:
    Sharpee
  id: derived-region-guard
  story-version: 0.0.1

create the Grounds
  a region

create the Hall
  a room
  east to the East Yard

  A hall.

create the East Yard
  a room
  in the Grounds
  north to the West Yard

  The east yard.

create the West Yard
  a room
  in the Grounds

  The west yard.

create the gate
  a thing, scenery
  in the East Yard

  A gate.

  on the player examining
    refuse when the player is in the Grounds: gate-from-inside
    phrase gate-from-outside
  end on

define action whistling
  grammar
    whistle
  refuse when the player is in the Grounds: hush
  phrase whistle-free

define phrase gate-from-inside
  Iron bars, seen from the wrong side.
end phrase
define phrase gate-from-outside
  Iron bars.
end phrase
define phrase hush
  The groundskeeper glares.
end phrase
define phrase whistle-free
  A cheerful tune.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before
