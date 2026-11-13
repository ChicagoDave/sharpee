## Fixture for the claims walk's identity: one room to start in, one below
## it, and a plaque that counts its readings. The third reading drops the
## player into the Crypt. Between the first reading and the third, nothing
## in the world changes but the counter, so a walk that cannot tell two
## counts apart stops after one reading and never finds the Crypt.

story
  title: Counter Fixture
  authors:
    Fixture
  id: counter-fixture
  ifid: 0B7D2C0E-58C1-4F0B-8C0A-6E2B8E0F5D11
  description: A two-room fixture for a walk whose only moving part is a counter.

define counter readings starts 0 between 0 and 3

create the Belfry
  a room

  A belfry. A brass plaque is screwed to the wall.

create the Crypt
  a room

  A crypt under the belfry.

create the plaque
  a thing, scenery, readable
  in the Belfry

  A brass plaque, worn smooth.

  on the player reading
    raise readings by 1
    phrase plaque-text
      "Read me thrice."
    move the player to the Crypt when readings >= 3
  end on

create Nobody
  a person
  playable
  starts in the Belfry

  You, in a belfry.

before the game starts
  change the player to Nobody
end before
