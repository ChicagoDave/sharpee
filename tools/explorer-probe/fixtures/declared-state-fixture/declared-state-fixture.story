## Fixture for the declared-state lens: one yard whose things exercise every
## surface the lens reads and writes state through, plus one deliberate case
## for each finding direction. Nothing here is meant to be played. Compile with
##   ./sharpee compose tools/explorer-probe/fixtures/declared-state-fixture/declared-state-fixture.story -o tools/explorer-probe/fixtures/declared-state-fixture/dist/declared-state-fixture.ir.json
## before running the lens on it.

story
  title: Declared State Fixture
  authors:
    Fixture
  id: declared-state-fixture
  ifid: 5D2C8B1E-3F4A-4C7D-9E0B-1A2B3C4D5E6F
  description: A one-room fixture for the declared-state lens.
  states: dawn, dusk
  use state-machines

create the Yard
  a room

  A yard.

  after the player entering while the tank is full
    phrase tank-full
  end after

  after the player entering while dusk
    phrase dusk-falls
  end after

## Its own clause reads and writes its own state. `broken` is never assigned.
## (A read or a write of an undeclared value is refused by the compiler —
## `analysis.unknown-value`, `analysis.undeclared-state` — so no fixture can
## carry one, and the lens has no such direction.)

create the lamp
  scenery, pushable
  in the Yard
  states: dim, bright, broken

  A lamp.

  on the player pushing while the lamp is dim
    change the lamp to bright
    phrase lamp-brightens
  end on

## Written only from a topic body; nothing reads it.

create the bell
  scenery
  in the Yard
  states: silent, rung

  A bell.

create Old Tom
  a person
  in the Yard

  An old man.

define topics for Old Tom
  about the bell:
    change the bell to rung
    phrase tom-bell
end topics

## A machine whose entered state writes a different entity than its role.
## Nothing reads the pump's own state.

create the pump
  scenery, pushable
  in the Yard
  states: still, going

  A pump.

create the tank
  scenery
  in the Yard
  states: empty, full

  A tank.

define machine the pump works
  role piston is the pump
  starts still

  state still
    when pushing the pump: going

  state going, terminal
    on enter
      change the pump to going
      change the tank to full
      phrase pump-going
    end on
end machine

## A trait with an `it`-bound select, composed by two things.

define trait ripenable
  on the player pushing
    select on its state
      when green
        change it to ripe
        phrase fruit-ripens
      when ripe
        phrase fruit-done
    end select
  end on
end trait

create the apple
  ripenable
  in the Yard
  states: green, ripe

  An apple.

create the pear
  ripenable
  in the Yard
  states: green, ripe

  A pear.

## A write inside a timer clause, the surface world-index's collectStateWriters
## does not walk. It pins the lens's platformGap.

define timer drip for the tap
end timer

create the tap
  scenery
  in the Yard
  states: dry, dripping

  A tap.

  on the player pushing
    start drip
    phrase tap-knocked
  end on

  when drip expires
    change the tap to dripping
    phrase tap-drips
  end when

  on the player examining while the tap is dripping
    phrase tap-wet
  end on

define sequence the day
  at turn 3
    change the story to dusk
end sequence

create Nobody
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Nobody
end before

define phrase tank-full
  The tank is full.
end phrase

define phrase dusk-falls
  Dusk falls.
end phrase

define phrase lamp-brightens
  The lamp brightens.
end phrase

define phrase tom-bell
  Tom nods at the bell.
end phrase

define phrase pump-going
  The pump goes.
end phrase

define phrase fruit-ripens
  It ripens.
end phrase

define phrase fruit-done
  It is ripe already.
end phrase

define phrase tap-drips
  The tap drips.
end phrase

define phrase tap-wet
  Wet.
end phrase

define phrase tap-knocked
  Something shifts inside the tap.
end phrase
