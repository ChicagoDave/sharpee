story
  title: Determinism Fixture
  authors:
    Sharpee Platform
  id: ac5-random
  story-version: 1.0.0
  description: AC-5 gate fixture - both random forms, no other nondeterminism.

create the East Room
  a room
  west to the West Room

  A bare eastern room.

  after the player entering
    phrase crossing-mutter
  end after

create the West Room
  a room
  east to the East Room

  A bare western room.

  after the player entering
    phrase crossing-mutter
  end after

  after the player entering while one chance in 3
    phrase lucky-draught
  end after

create Alex
  a person
  playable
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

before the game starts
  change the player to Alex
end before
