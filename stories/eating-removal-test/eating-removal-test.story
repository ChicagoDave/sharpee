story
  title: Eating Removal Test
  authors:
    Sharpee Team
  id: eating-removal-test
  story-version: 0.0.1
  description: A platform test story — a loaf with three servings, to pin what a bite leaves behind.

create the Pantry
  a room

  A bare pantry with one shelf.

create the loaf
  a thing, edible
  servings 3
  in the Pantry

  A round loaf of bread.

create Alex
  a person
  playable
  starts in the Pantry

  You.

before the game starts
  change the player to Alex
end before
