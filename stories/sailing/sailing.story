story
  title: Sailing
  authors:
    Sharpee Tests
  id: sailing
  story-version: 0.0.1
  use expanses
  use sailing

## Chord 4.0 Phase 13 fixture: the Sargasso of ADR-375, played through the
## assembled engine by the tree under sailing.tests/. The Marigold is a
## sailing vehicle with sails: she is turned by degrees, goes ahead on her
## bearing, makes the pace her sailing row gives for the angle off the wind,
## lies in irons dead into it until turned out, speeds up as sail is made,
## and answers the weather glass that shifts the wind. No RNG anywhere.

create the Sargasso
  an expanse
  size: 40 by 40
  wind: from northeast
  aka sea, weed

  Weed-choked water under a sky the colour of pewter.

  landmarks
    Port Royal: 3, 4
    the Reef: 12, 30
  end landmarks

create Port Royal
  a room
  seen from afar: a smudge of smoke over a low green shore

  The quay at Port Royal, the Marigold warped alongside.

create the Reef
  a room
  seen from afar: a line of white where the swell breaks

  Coral under a foot of water, and the wreck it made.

create the Marigold
  a vehicle
  in the Sargasso at 20, 20
  movement: open
  carries: in
  drive: player
  commands: naval, compass
  stride: 1 unit
  sight: 8
  seen from afar: three masts leaning to the wind
  sails: furled, reefed, full
  sails start: furled
  aka ship, barque

  A barque, three masts, a wheel aft.

  sailing
    0 to 44 degrees: furled stopped, reefed stopped, full stopped
    45 to 74 degrees: furled stopped, reefed 6 turns, full 4 turns
    75 to 119 degrees: furled stopped, reefed 3 turns, full 2 turns
    120 to 180 degrees: furled 6 turns, reefed 2 turns, full 1 turn
    calm: stopped
  end sailing

create the weather glass
  a thing, pushable
  in the Marigold
  aka glass

  A weather glass by the wheel. Tap it and the wind backs southwest.

  on the player pushing
    set the Sargasso's wind to southwest
    phrase glass-tapped
  end on

define phrase glass-tapped
  The glass falls; the wind backs into the southwest.
end phrase

create the capstan
  a thing, pushable
  in the Marigold

  The capstan. Turning it sets every stitch of canvas at once.

  on the player pushing
    set the Marigold's sails to full
    phrase all-sail
  end on

define phrase all-sail
  The capstan clanks round and every sail fills.
end phrase

create Alex
  a person
  playable
  starts in Port Royal

  You.

before the game starts
  change the player to Alex
  move Alex to the Marigold
end before
