story "Death Constructs" by "ADR-227 parity fixture"
  id: death-constructs
  version: 1.0.0
  blurb: Exercises kill the player, the deadly exit, and the deadly room.

create the Meadow
  a room
  south to the Cliff Top
  east to the Tomb

  A sunny meadow above the gorge.

create the Cliff Top
  a room
  north to the Meadow
  south is deadly: over-the-falls

  A narrow ledge above a roaring waterfall. The only path is back north.

create the Vault
  a room
  deadly: no-escape

  A sealed vault. The walls are already moving.

create the Tomb
  a room
  west to the Meadow

  A dusty tomb, thick with curse.

  after entering it
    kill the player tomb-curse
  end after

define phrases en-US
  over-the-falls:
    You step off the ledge and plunge into the roaring water below.
  no-escape:
    The walls meet in the middle, and you are in the way.
  tomb-curse:
    The curse of the tomb strikes you down where you stand.
