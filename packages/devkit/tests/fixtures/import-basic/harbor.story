story
  title: Harbor
  authors:
    Test
  id: harbor
  story-version: 0.0.1

create the Lighthouse
  a room

  A tall lighthouse by the sea.

import "regions/harbor"

create Alex
  a person
  playable
  starts in the Lighthouse

  You.

before the game starts
  change the player to Alex
end before
