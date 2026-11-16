story
  title: Probe
  id: probe
  ifid: 5B0C1F6E-2A4D-4E7B-9C31-7D2A8E4F6B13
  states: early, late
  authors:
    Example Author

define counter taps

define sequence the day
  at turn 3
    phrase light-turning
  2 turns later
    change the story to late
    phrase now-late
end sequence

extend action lighting
  grammar
    kindle the target

remove from action taking
  get the item

create the Hall, a room
  up to the Attic while the hatch is open
  east is deadly: fell

  A hall with a hatch overhead.

create the Attic, a room

  An attic.

create the hatch
  a thing, scenery, openable, starts closed
  in the Hall

  A hatch.

create the dial
  a thing, scenery
  in the Hall
  states, reversible: low, high
  counter clicks starts 0 between 0 and 5

  A dial.

  on the player pushing, touching
    raise the dial's clicks by 1
    set taps to 7
    change the dial to high
    phrase dial-up when the dial's clicks is at least 2
  end on

  on the player turning
    change the dial to low
    phrase turned-back
    phrase inline-one
      You hear it click.
  end on

create the lamp
  a thing, light-source, starts unlit
  in the Hall

  A lamp.

create the hat
  a thing, wearable
  in the Hall

  A hat.

  after the player examining
    make Sam wear the hat
    phrase hat-on when Sam wears the hat
  end after

create Sam
  a person, proper
  playable
  starts in the Hall

define phrases en-US
  light-turning:
    The light turns.
  now-late:
    It is late.
  fell:
    You fall.
  dial-up:
    The dial is well up.
  turned-back:
    You turn it back.
  hat-on:
    The hat is on your head.

before the game starts
  change the player to Sam
end before
