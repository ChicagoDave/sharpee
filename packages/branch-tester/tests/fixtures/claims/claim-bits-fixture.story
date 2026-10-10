## Fixture for the claims walk's identity: two rooms and one readable note
## that never moves. Reading the note changes nothing the necessary-set
## identity hashes (the readable trait's flag is not a stateful trait), so
## the only thing that keeps "read note / north" apart from "north" is the
## claim bit a satisfied claim folds into the state's identity. Compile with
##   ./sharpee compose tools/explorer-probe/fixtures/claim-bits-fixture/claim-bits-fixture.story -o tools/explorer-probe/fixtures/claim-bits-fixture/dist/claim-bits-fixture.ir.json
## before walking it; the test does this itself.

story
  title: Claim Bits Fixture
  authors:
    Fixture
  id: claim-bits-fixture
  ifid: 513E5B0C-472F-4599-AAAA-7F95FEEFFEAE
  description: A two-room fixture for the claims walk.

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
  in the Hall

  A square of paper pinned at eye height.

  on the player reading
    phrase note-text
      "Back by dawn."
  end on

create Nobody
  a person
  playable
  starts in the Hall

  You, in a hall.

before the game starts
  change the player to Nobody
end before
