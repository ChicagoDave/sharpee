## Fixture for the runner's inert count: two rooms, a readable note that never
## moves, and a pebble nothing in the story reads. A claim about where the
## note is can never depend on the pebble, so a set that lists the pebble
## carries one inert thing, and the walk still hashes it — the pebble in hand
## or on the floor doubles the states, exactly as the set was written.

story
  title: Inert Line Fixture
  authors:
    Fixture
  id: inert-line-fixture
  ifid: 2B0C7D4E-9F11-4B3A-8E52-6C1D0A7F3E90
  description: A two-room fixture with one thing the claim cannot depend on.

create the Hall
  a room
  north to the Landing

  A bare hall. A note is pinned to the wall; a pebble lies on the floor.

create the Landing
  a room
  south to the Hall

  A landing at the top of a short stair.

create the note
  aka paper
  a thing, scenery, readable
  in the Hall

  A square of paper pinned at eye height.

  on the player reading
    phrase note-text
      "Back by dawn."
  end on

create the pebble
  a thing
  in the Hall

  A grey pebble.

create Nobody
  a person
  playable
  starts in the Hall

  You, in a hall.

before the game starts
  change the player to Nobody
end before
