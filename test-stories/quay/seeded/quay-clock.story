## A test story: how a story opens. Two rooms, a prologue in the header, two
## chapters, and nothing that keeps time. Written to be tested and nothing
## else; `quay.test-set.md` lists what it must let the tests prove.

story
  title: The Quay
  authors:
    Test Story
  id: quay
  story-version: 0.0.1
  prologue:
    The last ferry left an hour ago, and someone has to light the lamp.
  use chapters
  use hunger
    grows 3 each turn
    peckish at 3 says feeling-peckish
    hungry at 9
    fatal at 300

define phrases en-US
  feeling-peckish:
    You have not eaten since the morning boat.
  lamp-overdue:
    Out past the bar, a ship's bell asks where the light is.

define timer tide
  slack
    The water under the quay stops moving.
  turning
    The water under the quay begins to draw out.
  ebbing
    The tide is going, and taking the last of the light with it.
end timer

define sequence the evening
  at turn 3
    phrase lamp-overdue
end sequence

define chapters
  dusk - Chapter I: Dusk
    The light is going, and the lamp is cold.
    begins when the game starts
  lamp - Chapter II: The Lamp
    begins when the player visits the Lamp Room for the first time
end chapters

create the Quay
  a room
  north to the Lamp Room

  A stone quay under a squat lighthouse. The door of the lighthouse is
  north.

  first time
    You have not stood here since you were a child, and the quay is
    shorter than you remember.

create the Lamp Room
  a room
  south to the Quay

  A round room around a cold lamp.

create the locker
  a container, openable
  in the Quay

  A tin locker bolted to the quay wall.

create the brass key
  a thing
  in the Quay

  A brass key on a loop of tarred string.

create the keeper
  a person
  playable
  starts in the Quay

  You.

before the game starts
  change the player to the keeper
  start tide
end before
