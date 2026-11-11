story
  title: Gate Slot Identity
  authors:
    Nobody
  id: gate-slot-identity
  story-version: 0.0.1

define trait treasure
end trait

define condition the-sword: it is the sword

define action valuing
  grammar
    value the item
  refuse when the item is the sword: nope
  the item must be the sword: nope
  refuse when the item is a treasure and the player holds the item: nope
  the item must be any the-sword: nope
  phrase valued when the item is not the sword
  phrase valued when the item is a treasure
  select on the item
    when sword
      phrase valued
  end select

  phrases en-US
    nope:
      No.
    valued:
      Yes.

define action pointing
  grammar
    point the direction
  directions
    north or n
    south or s
  phrase pointed when the direction is north

  phrases en-US
    pointed:
      You point.

create the Hall
  a room

  A hall.

create the sword
  a thing
  treasure
  in the Hall

  A sword.

  on the player valuing
    phrase gleams when the sword is the sword
  end on

define phrases en-US
  gleams:
    It gleams.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before
