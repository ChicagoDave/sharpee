story "Each Package Parse Fixture" by "Sharpee Platform"
  id: each-package-parse
  version: 0.0.1
  blurb: E1 any / E2 no / E3 each + the match binder (ratchet 2026-07-12) in every approved host position.

define condition hungry-neighbor: it is hungry
define condition stray-treasure: it is a treasure and it is not in the Trophy Barn
define condition alarm-trigger: it is a treasure and the player holds it

define trait skittish
  states: calm, spooked

  phrases en-US
    all-clear:
      Nothing stirs.
    scatter:
      Everything scatters.

  on prodding it while any alarm-trigger
    refuse when no stray-treasure: all-clear
    each hungry-neighbor
      change the match to spooked
    end each
    phrase scatter
  end on
end trait

define action tallying
  grammar
    tally
  refuse when no stray-treasure: nothing-stray

  phrases en-US
    nothing-stray:
      Every treasure is home.
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

create the pygmy goat
  in the Trophy Barn
  states: hungry, content

  after feeding it while no alarm-trigger
    each hungry-neighbor
      change the match to content
      phrase fed-note with animal = the match
      phrase hungry-note when the match is hungry
      each stray-treasure
        move the match to the Trophy Barn
      end each
    end each
  end after

define sequence closing sweep
  at turn 3
    phrase sweep-note when any alarm-trigger
    phrase guard-note when no smoking sign is spooked
    each hungry-neighbor
      change the match to content
    end each
end sequence

define phrases en-US
  sealed-up:
    The doors are sealed while treasure walks.
  fed-note:
    Chewing sounds from {animal}.
  hungry-note:
    Still peckish.
  sweep-note:
    The keeper sweeps the yard.
  guard-note:
    The sign hangs steady.
