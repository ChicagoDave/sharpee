story
  title: Traps
  id: traps
  ifid: 5B0C1F6E-2A4D-4E7B-9C31-7D2A8E4F6B11
  authors:
    Example Author

define action waking-up
  grammar
    wake the target
  otherwise refuse nothing-wakes

define trait sleepy
  on the player waking-up
    change it to lit
    change it to open
    phrase woke
  end on
end trait

create the Hall, a room

  A hall.

create the lamp
  a thing, light-source, starts unlit, sleepy
  in the Hall

  A lamp.

  phrase detail while the lamp is lit:
    It is burning.

create the chest
  a container, openable, starts closed, sleepy
  in the Hall

  A chest.

create the coin
  a thing
  in the chest

  A coin.

create the rope
  a thing, scenery, pullable
  in the Hall

  A rope.

  on the player pulling
    phrase tug
  end on

create Sam
  a person, proper
  playable
  starts in the Hall

define phrases en-US
  nothing-wakes:
    Nothing wakes.
  woke:
    You say wake.
  tug:
    You tug the rope.

before the game starts
  change the player to Sam
end before
