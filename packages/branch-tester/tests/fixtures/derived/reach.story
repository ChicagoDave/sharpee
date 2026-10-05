## A dedicated fixture for the derived runner's implicit arrangement: a
## scroll inside a locked chest (the runner unlocks and opens the chest to
## reach it), a door the player must unlock and open (its `after opening`
## needs the door closed and unlocked, the key held), a rope that needs its
## tool held to cut, a cook in another room with a text topic (the runner
## walks the player to her) and an entity topic about the rope in the Hall
## (the runner brings the rope to her too), and a room whose `after entering`
## fires on movement, not on a typed verb. Not story content.

story
  title: Derived Reach
  authors:
    Sharpee
  id: derived-reach
  story-version: 0.0.1

create the Hall
  a room
  north to the Pantry through the cellar door

  A hall.

  after the player entering
    phrase hall-entered
  end after

create the Pantry
  a room

  A pantry.

create the chest
  a container, openable, lockable with the brass key, starts locked
  in the Hall

  A chest.

create the brass key
  a thing
  in the Pantry

  A key.

create the scroll
  a thing, readable
  in the chest

  A scroll.

  on the player reading
    phrase scroll-text
  end on

create the cellar door
  a door, lockable with the iron key
  states: shut, swung

  A cellar door.

  after the player opening
    change the cellar door to swung
  end after

create the iron key
  a thing
  in the Pantry

  An iron key.

create the rope
  a thing, cuttable with the knife
  in the Hall
  states: whole, cut

  A rope.

  on the player cutting
    change the rope to cut
  end on

create the knife
  a thing
  in the Pantry

  A knife.

create the cook
  a person
  in the Pantry

  The cook.

define topics for the cook
  about "the weather": phrase weather-talk
  about the rope: phrase rope-talk
end topics

create Alex
  a person, proper
  playable
  starts in the Hall

define phrase hall-entered
  You enter the hall.
end phrase
define phrase scroll-text
  The scroll reads.
end phrase
define phrase weather-talk
  Fine weather.
end phrase
define phrase rope-talk
  Mind that rope.
end phrase

before the game starts
  change the player to Alex
end before
