story "Each Package Compile Fixture" by "Sharpee Platform"
  id: each-package-compile
  version: 0.0.1
  blurb: E1 any / E2 no / E3 each + the match + must-be-any compiling to IR (each package P3).

define condition stray-treasure: it is a treasure and it is not in the Trophy Barn
define condition alarm-trigger: it is a treasure and the player holds it
define condition barn-occupant: it is in the Trophy Barn

define trait skittish
  states: calm, spooked

  phrases en-US
    all-clear:
      Nothing stirs.
    scatter:
      Everything scatters.

  on prodding it while any alarm-trigger
    it must be any barn-occupant: all-clear
    refuse when no stray-treasure: all-clear
    each barn-occupant
      change the match to spooked
    end each
    phrase scatter
  end on
end trait

define action tallying
  grammar
    tally
  the player must be any barn-occupant: not-here

  phrases en-US
    not-here:
      You are not in the barn.
    tally-note:
      One more for the ledger.

  each stray-treasure
    move the match to the Trophy Barn
  end each
  phrase tally-note when any stray-treasure

create the Trophy Barn
  a room
  north is blocked while any alarm-trigger: sealed-up

  A barn with a ledger and strong opinions.

create the player
  starts in the Trophy Barn

create the no smoking sign
  skittish
  in the Trophy Barn

create the pygmy goat
  in the Trophy Barn
  states: hungry, content

  after feeding it while no alarm-trigger
    each barn-occupant
      phrase fed-note with animal = the match
      phrase hungry-note when the match is hungry
      each stray-treasure
        move the match to the Trophy Barn
      end each
    end each
  end after

define sequence closing sweep
  at turn 3
    phrase sweep-note when no smoking sign is spooked
    each barn-occupant
      change the match to spooked
    end each
end sequence

define phrases en-US
  sealed-up:
    The doors are sealed while treasure walks.
  fed-note:
    Chewing sounds nearby.
  hungry-note:
    Still peckish.
  sweep-note:
    The keeper sweeps the yard.
