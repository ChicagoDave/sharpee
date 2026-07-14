story "Define Trait" by "Sharpee Docs"
  id: chord-ref-def-trait
  version: 0.0.1

define trait feedable
  data
    food: entity
    ration: optional number
    diet: one of hay, seed, fish
  states, reversible: hungry, content
  score fed worth 10

  phrases en-US
    no-food:
      You have nothing {the item} would want.
    already-fed:
      {capitalize the item} has had quite enough already.
    fed:
      The feed vanishes in seconds.

  on feeding it
    the player must have its food: no-food
    it must be hungry: already-fed
    change it to content
    award fed
    phrase fed
  end on
end trait

create the Petting Zoo
  a room

  A straw-floored yard of amiable animals.

create the handful of feed
  aka feed
  in the Petting Zoo

  A paper cone of mixed grain.

create the pygmy goats
  aka goats
  feedable with food the handful of feed and diet hay
  in the Petting Zoo

  Three goats of enormous confidence.

create the player
  starts in the Petting Zoo
