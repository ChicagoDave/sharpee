story
  title: Family Zoo (v07 — Locked Doors & Keys)
  authors:
    John Googol
  id: familyzoo-v07
  ifid: 18E80760-1792-47ED-83EB-2CE5BA8AC983
  story-version: 0.0.2
  description: Sharpee tutorial step 7 — `lockable with`, and exits blocked while a state holds.

create the Zoo Entrance
  a room
  aka entrance, gates, gate
  south to the Main Path

  first time
    Your family piles out of the car, buzzing with excitement — a
    whole day at the zoo! You straighten the strap of your backpack
    and take it all in. You stand before the wrought-iron gates of
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
  south to the Supply Room
  south is blocked while the staff gate is closed: staff-gate-blocked

  A wide gravel path winds through the heart of the zoo. Colorful
  direction signs point every which way. A park bench sits beside the
  path. To the east, the petting zoo. To the west, the aviary. A staff
  gate blocks the path to the south. The entrance is back to the north.

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

create the Supply Room
  a room
  aka storage room, storeroom
  north is blocked while the staff gate is closed: staff-gate-blocked

  A cluttered storage room behind the staff gate. Metal shelves line the
  walls. A cork board on the wall is covered with staff schedules. The
  staff gate leads back north.
  north.

create the Staff Parking Lot
  a room

  A small staff parking lot beyond the zoo fence. Off limits to
  visitors.

create Alex
  a person
  playable
  starts in the Zoo Entrance

  Just an ordinary visitor to the zoo.

create the staff keycard
  a thing
  aka keycard, key card, card, key
  in the Zoo Entrance

  A white plastic keycard with "WILLOWBROOK ZOO — STAFF ONLY" printed in
  blue.

create the staff gate
  a thing
  aka gate, metal gate, staff door
  scenery, openable, lockable with the staff keycard
  in the Main Path

  A sturdy metal gate with a "STAFF ONLY" sign.

  on the player examining
    phrase gate-look
      A sturdy metal gate with a "STAFF ONLY" sign.
    phrase gate-status-closed when the staff gate is closed
      The staff gate is set into the fence.
    phrase gate-status-open when the staff gate is open
      The staff gate is set into the fence, standing wide open.
  end on

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

create the metal shelves
  a thing
  aka shelves, shelf
  scenery, plural
  in the Supply Room

  Industrial metal shelving units stacked with supplies.

create the cork board
  a thing
  aka board, notices
  scenery
  in the Supply Room

  A cork board with staff schedules. A note in red marker: "DON'T
  FORGET: nocturnal exhibit lights need new batteries!"

create the zoo brochure
  a thing
  aka brochure, pamphlet, leaflet
  readable
  in the Zoo Entrance

  A glossy tri-fold brochure with "WILLOWBROOK FAMILY ZOO" on the cover.

  on the player reading
    phrase brochure-text
  end on

create the zoo map
  a thing
  aka map, folding map
  in the Zoo Entrance

  A colorful folding map of the Willowbrook Family Zoo.

create the backpack
  a container
  aka rucksack, pack
  in the Zoo Entrance

  A small red canvas backpack.

create the souvenir penny
  a thing
  aka penny, coin
  in the Main Path

  A shiny copper penny.

create the park bench
  a supporter
  aka bench, benches, seat
  scenery
  holds 3
  in the Main Path

  A sturdy park bench painted forest green.

create the lunchbox
  a container
  aka lunch box, box
  openable
  in the Main Path

  A dented metal lunchbox decorated with cartoon zoo animals.

create the juice box
  a thing
  aka juice, drink
  in the lunchbox

  A small juice box with a picture of a happy elephant.

define phrase brochure-text, verbatim
  WILLOWBROOK FAMILY ZOO — Your Guide

  EXHIBITS:
    Petting Zoo — East from Main Path
    Aviary — West from Main Path
    Gift Shop — West from Aviary
    Nocturnal Animals — Staff Area

  "Where every visit is a wild adventure!"
end phrase

define phrases en-US
  staff-gate-blocked:
    The staff gate is closed.
  victory:
    Congratulations! You've earned your MASTER ZOOKEEPER badge! You've
    visited every exhibit, befriended the animals, collected souvenirs,
    and even stayed after hours to hear what the animals really think.
    The Willowbrook Family Zoo will never forget you!

    *** You have won ***

before the game starts
  change the player to Alex
end before
