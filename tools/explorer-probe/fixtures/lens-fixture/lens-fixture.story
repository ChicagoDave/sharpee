## Fixture for the examinable lens: one room whose prose names a described
## object (the bucket), a descriptionless object (the pebble) and a thing
## with no entity behind it (the crack). Compile with
##   ./sharpee compose tools/explorer-probe/fixtures/lens-fixture/lens-fixture.story -o tools/explorer-probe/fixtures/lens-fixture/dist/lens-fixture.ir.json
## before running the lens on it.

story
  title: Lens Fixture
  authors:
    Fixture
  id: lens-fixture
  ifid: 0B1E7F2A-6C1D-4E0A-9B3F-2D5A7C9E1F00
  description: A one-room fixture for the examinable lens.

create the Shed
  a room

  A bare shed. A pebble lies on the floor beside a bucket, and a crack
  runs across the ceiling.

create the pebble
  in the Shed

create the bucket
  in the Shed

  A dented tin bucket.

create Nobody
  a person
  playable
  starts in the Shed

  You, in a shed.

before the game starts
  change the player to Nobody
end before
