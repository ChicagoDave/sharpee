story
  title: Expanses
  authors:
    Sharpee Tests
  id: expanses
  story-version: 0.0.1
  use expanses

## Chord 4.0 Phase 13 fixture: the Belt of ADR-376, played through the
## assembled engine by the tree under expanses.tests/. The skiff is an open
## vehicle steered by compass heading and sent by coordinates across a
## two-axis expanse; it arrives at a landmark by crossing its cell, comes
## alongside a floating cask and hauls it aboard, sees the Derelict in bands
## and examines it from afar, stops at the ice and will not steer into it.
## The cask drifts on the manifest's pinned seed.

create the Belt
  an expanse
  size: 20 by 8
  drift: 1 unit every 50 turns
  north is blocked: ice-fields
  aka belt, void

  Black, and the slow tumble of rock against it.

  landmarks
    the Mining Platform: 3, 3
    the Derelict: 14, 6
  end landmarks

define phrase ice-fields
  Ice closes the way north; the skiff will not answer that heading.
end phrase

create the Mining Platform
  a room
  seen from afar: a cluster of lights on a lopsided rock
  sight: 4

  A platform bolted to a rock, its lights the only warm thing for miles.

create the Derelict
  a room
  seen from afar: a long dead hull, turning slowly end over end

  The inside of a hull that has not held air in a hundred years.

create the skiff
  a vehicle
  in the Belt at 3, 3
  movement: open
  carries: in
  drive: player
  commands: compass, coordinates
  pace: 1 turn
  stride: 1 unit
  sight: 6
  seen from afar: a glint of hull against the dark
  aka craft

  A skiff: one seat, one console, a hull you can see through.

create the telescope
  a thing
  in the skiff
  sight: 12
  aka scope

  A brass telescope, older than the skiff.

create the cask
  a thing, floats
  in the Belt at 5, 3
  aka barrel

  A tarred cask, riding low.

define phrase land-ho
  The lookout cries: the Derelict is in sight.
end phrase

define sequence landfall
  when the Derelict comes into sight
    phrase land-ho
end sequence

create Alex
  a person
  playable
  starts in the Mining Platform

  You.

before the game starts
  change the player to Alex
end before
