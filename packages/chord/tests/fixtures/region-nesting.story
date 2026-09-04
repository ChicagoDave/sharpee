story
  title: Region Nesting
  authors:
    Test
  id: region-nesting
  story-version: 0.0.1

create the Underground
  a region
  aka the deep places
  containing the Mines and the Round Room

  The sunless country beneath the hills.

create the Mines
  a region
  containing the Shaft Top, the Coal Seam

create the Round Room
  a room
  up to the Surface Camp
  north to the Shaft Top

  A perfectly circular chamber.

create the Shaft Top
  a room
  south to the Round Room
  down to the Coal Seam

  Timbers frame the mouth of the shaft.

create the Coal Seam
  a room
  up to the Shaft Top

  Black seams glitter wetly in the lamplight.

create the Surface Camp
  a room
  down to the Round Room

  Canvas tents around a fire pit.

create Alex
  a person
  playable
  starts in the Surface Camp

  You.

before the game starts
  change the player to Alex
end before
