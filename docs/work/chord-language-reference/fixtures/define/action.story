story "Define Action" by "Sharpee Docs"
  id: chord-ref-def-action
  version: 0.0.1
  use scoring

define action petting
  grammar
    pet :animal
    pat :animal
    stroke :animal → each nearby creature
  the animal must be reachable
  score gentle-hands worth 5
  refuse without animal: pet-what
  refuse when the animal is a snake: glass-way
  otherwise refuse cant-pet
  award gentle-hands
  phrase petted

  phrases en-US
    pet-what:
      Pet what?
    glass-way:
      You settle for pressing a hand to the cool glass.
    cant-pet:
      {capitalize the animal} really is not the sort of thing you can pet.
    petted:
      You give a good long scritch.

create the Petting Zoo
  a room

  Straw, fur, and cheerful chaos.

create the pygmy goats
  aka goats, animal
  in the Petting Zoo

  Three goats, all elbows.

create the player
  starts in the Petting Zoo
