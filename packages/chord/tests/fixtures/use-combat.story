story
  title: Arena
  authors:
    Test
  id: use-combat
  story-version: 0.0.1
  use combat

create the Arena
  a room

  A sandy fighting pit.

create the troll
  a person, combatant with health 20 and skill 40 and hostile true
  in the Arena

  A burly troll blocking the far gate.

create the elvish sword
  aka sword
  weapon with damage 5 and skill-bonus 2
  in the Arena

  A sharp elvish blade.

create Alex
  a person
  playable
  starts in the Arena

  You.

before the game starts
  change the player to Alex
end before
