story
  title: The Cellar
  id: cellar
  use combat
  authors:
    Nobody

create the Cellar, a room

  A low brick cellar that smells of coal and damp.

create the rat
  a person, combatant with health 3 and skill 20 and base-damage 1
  in the Cellar

  A rat the size of a boot.

create the poker
  a thing, weapon with damage 3
  in the Cellar

  An iron poker.

create Ansel
  a person
  playable
  starts in the Cellar

  You came down for coal.

before the game starts
  change the player to Ansel
end before
