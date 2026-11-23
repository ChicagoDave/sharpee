## A dedicated fixture for the examinable lens's ended room: the only way
## into the Garden ends the game, so the lens first sees the Garden in a
## state no player ever gets a turn in, and must examine nothing there.
## Not story content.

story
  title: Lens Ended
  authors:
    Sharpee
  id: lens-ended
  story-version: 0.0.1

create the Porch
  a room
  north to the Garden

  A porch. A rusty gate leads north.

create the Garden
  a room
  south to the Porch

  A walled garden. A sundial stands among the roses.

  after the player entering
    win garden-reached
  end after

create Alex
  a person, proper
  playable
  starts in the Porch

define phrase garden-reached
  You reach the garden. You win.
end phrase

before the game starts
  change the player to Alex
end before
