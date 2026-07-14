story "Each Iteration Fixture" by "Sharpee Platform"
  id: each-iteration
  version: 0.0.1
  blurb: E1/E2/E3 + must-be-any end-to-end through story-loader (each package P4).

define condition stray-crate: it is a container and it is not in the store room
define condition penned-crate: it is a container and it is in the pen
define condition dusty-thing: it is a supporter and it is in the pen
define condition keeper-present: it is a person

define action tidying
  grammar
    tidy :target
  refuse when no stray-crate: already-tidy

  phrases en-US
    already-tidy:
      Nothing is loose.

define action polishing
  grammar
    polish :target

define trait tidyable
  score tidied worth 3

  phrases en-US
    tucked:
      Tucked away.
    tidy-note:
      All tidy.
    spotted-red:
      The red one first.
    spotted-blue:
      Then the blue one.
    dust-spotted:
      A dust bunny lurks.
    dusted:
      Inspection complete.

  on tidying it
    each stray-crate
      phrase spotted-red when the match is the red crate
      phrase spotted-blue when the match is the blue crate
      move the match to the store room
      set the match's shine to 9
      award tidied
      phrase tucked when the match is in the store room
    end each
    phrase tidy-note
  end on

  on reading it
    each dusty-thing
      phrase dust-spotted when the match is in it
    end each
    phrase dusted
  end on
end trait

define trait polishable
  data
    shine: number, starts 1

  phrases en-US
    not-penned:
      Not in the pen.
    polished:
      Gleaming now.

  on polishing it
    it must be any penned-crate: not-penned
    change it to gleaming
    phrase polished
  end on
end trait

create the pen
  a room
  tidyable

  after entering it
    each penned-crate
      phrase both-note when the match is in it
      each dusty-thing
        move the match to the store room
        phrase inner-note when the match is in the store room
      end each
    end each
    each keeper-present
      phrase keeper-note
    end each
  end after

create the store room
  a room

  after entering it
    each penned-crate
      change the match to gleaming when one chance in 2
    end each
  end after

create the player
  starts in the pen

create the red crate
  a container
  polishable
  in the pen
  states: dull, gleaming

create the blue crate
  a container
  polishable
  in the pen
  states: dull, gleaming

create the green crate
  a container
  polishable
  in the store room
  states: dull, gleaming

create the dust bunny
  a supporter
  in the pen

  on reading it
    each stray-crate
      move the match to the store room
      phrase noted when the match is in the store room
    end each
    phrase ledger-note
  end on

define sequence sweep up
  at turn 2
    each dusty-thing
      move the match to the store room
    end each
end sequence

define phrases en-US
  both-note:
    Still in the pen.
  keeper-note:
    The keeper looks in.
  inner-note:
    One less dust bunny here.
  noted:
    Noted in the ledger.
  ledger-note:
    The ledger is up to date.
