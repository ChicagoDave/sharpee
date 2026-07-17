story "Phrasebook: Attacking" by "Sharpee Docs"
  id: phrasebook-attacking
  version: 0.0.1

create the Training Yard
  a room

  Packed dirt and a straw dummy on a post.

create the training dummy
  aka dummy
  scenery
  in the Training Yard

  A straw man on a post, much abused.

  on attacking it
    phrase dummy-thud
  end on

create the player
  starts in the Training Yard

define phrases en-US
  dummy-thud:
    You catch the dummy square in the chest. It rocks back on its post,
    then swings around to face you again, unimproved.
