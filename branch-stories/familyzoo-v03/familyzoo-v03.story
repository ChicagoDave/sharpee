story
  title: Family Zoo (v03 — Scenery)
  authors:
    John Googol
  id: familyzoo-v03
  ifid: B995D457-CC6C-4063-A106-4DA8B878CEFF
  story-version: 0.0.2
  description: Sharpee tutorial step 3 — things that are part of the room and cannot be taken.

create the Zoo Entrance
  a room
  aka entrance, gates, gate
  south to the Main Path

  first time
    Your family piles out of the car, buzzing with excitement — a
    whole day at the zoo! You stand before the wrought-iron gates of
    the Willowbrook Family Zoo. A cheerful welcome sign arches over
    the entrance, and a small ticket booth sits to one side. A
    sturdy iron fence runs along either side of the gates. The main
    path leads south into the zoo grounds.

  You stand before the wrought-iron gates of the Willowbrook Family Zoo.
  A cheerful welcome sign arches over the entrance, and a small ticket
  booth sits to one side. A sturdy iron fence runs along either side of
  the gates. The main path leads south into the zoo grounds.

create the Main Path
  a room
  aka path, gravel path
  east to the Petting Zoo
  west to the Aviary

  A wide gravel path winds through the heart of the zoo. Colorful
  direction signs point every which way. To the east, the petting zoo.
  To the west, the aviary. The entrance is back to the north.

create the Petting Zoo
  a room
  aka petting area, pen

  A cheerful open-air enclosure that smells of warm hay and fur. The
  main path is back to the west.

create the Aviary
  a room
  aka bird house, dome

  You step inside a soaring mesh dome. A toucan eyes you curiously from a
  branch overhead, and rope perches crisscross the space. A small
  waterfall splashes into a stone basin. The main path is back to the east.

create Alex
  a person
  playable
  starts in the Zoo Entrance

  Just an ordinary visitor to the zoo.

create the welcome sign
  a thing
  aka sign
  scenery
  in the Zoo Entrance

  A brightly painted wooden sign reads: "WELCOME TO WILLOWBROOK FAMILY
  ZOO."

create the ticket booth
  a thing
  aka booth
  scenery
  in the Zoo Entrance

  A small wooden booth with a "Self-Guided Tours" sign.

create the iron fence
  a thing
  aka fence, railing
  scenery
  in the Zoo Entrance

  A tall wrought-iron fence with animal silhouettes.

create the direction signs
  a thing
  aka signs, arrow signs
  scenery, plural
  in the Main Path

  Arrow signs: PETTING ZOO (east), AVIARY (west), EXIT (north).

create the flower beds
  a thing
  aka flowers
  scenery, plural
  in the Main Path

  Tidy beds of marigolds and petunias.

create the hay bale
  a thing
  aka hay, bale
  scenery
  in the Petting Zoo

  A large round bale of golden hay.

create the toucan
  a thing
  aka toco toucan
  scenery
  in the Aviary

  A Toco toucan with an enormous orange-and-black bill.

create the waterfall
  a thing
  aka water, basin
  scenery
  in the Aviary

  A gentle artificial waterfall cascading into a stone basin.

create the rope perches
  a thing
  aka perches, ropes
  scenery, plural
  in the Aviary

  Thick sisal ropes strung between wooden posts.

before the game starts
  change the player to Alex
end before
