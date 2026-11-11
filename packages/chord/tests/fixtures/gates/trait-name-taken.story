story
  title: Gate Trait Name Taken
  authors:
    Nobody
  id: gate-trait-name-taken
  story-version: 0.0.1

define trait container
end trait

define trait scenery
end trait

define trait heirloom
end trait

create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before
