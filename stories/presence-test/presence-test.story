story
  title: Presence Test
  authors:
    Sharpee Team
  id: presence-test
  story-version: 0.0.1
  description: A platform test story — an owl in the next room narrates every turn, whether or not anyone is there to hear it.

create the Hall
  a room
  east to the Barn

  A bare hall. The barn is to the east.

create the Barn
  a room
  west to the Hall

  A dim barn. The hall is back to the west.

create the owl
  aka bird
  in the Barn

  A barn owl on a rafter.

  on every turn
    phrase hoot
  end on

  on every turn, once
    phrase settle
  end on

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before

define phrase hoot
  The owl hoots.
end phrase

define phrase settle
  The owl settles onto its perch for the night.
end phrase
