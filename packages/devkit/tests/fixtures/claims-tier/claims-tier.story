## A dedicated project fixture for `sharpee test`'s claims tier: two rooms, a
## readable note that never moves, and a bench that nothing can do anything
## with. The manifest names `claims-tier.claims.chord`; the tests also write
## variants of that fragment into scratch copies of this project (a set that
## leaves the note out, a `never` the first command violates, a name the
## story does not have, a file that is not there). Copied from
## branch-tester's claim-bits fixture. Not story content.

story
  title: Claims Tier
  authors:
    Fixture
  id: claims-tier
  story-version: 0.0.1

create the Hall
  a room
  north to the Landing

  A bare hall. A note is pinned to the wall.

create the Landing
  a room
  south to the Hall

  A landing at the top of a short stair.

create the note
  aka paper
  a thing, scenery, readable
  states, reversible: pinned, loose
  in the Hall

  A square of paper pinned at eye height.

  on the player reading
    phrase note-text
      "Back by dawn."
  end on

create the bench
  a thing, scenery
  in the Landing

  A plain wooden bench.

create Nobody
  a person
  playable
  starts in the Hall

  You, in a hall.

before the game starts
  change the player to Nobody
end before
