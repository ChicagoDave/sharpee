story "Determinism Fixture" by "Sharpee Platform"
  id: ac5-random
  version: 1.0.0
  blurb: AC-5 gate fixture - both random forms, no other nondeterminism.

create the East Room
  a room
  west to the West Room

  A bare eastern room.

  after entering it
    phrase crossing-mutter
  end after

create the West Room
  a room
  east to the East Room

  A bare western room.

  after entering it
    phrase crossing-mutter
  end after

  after entering it while one chance in 3
    phrase lucky-draught
  end after

create the player
  starts in the East Room

  Determined-looking.

define phrase crossing-mutter, randomly
  You mutter about the weather.
or
  You hum a scrap of tune.
or
  Your footsteps echo oddly.
end phrase

define phrases en-US
  lucky-draught:
    A lucky draught of air sweeps past you.
