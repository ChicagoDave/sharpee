story
  title: Eating Removal Test
  authors:
    Sharpee Team
  id: eating-removal-test
  story-version: 0.0.1
  description: A platform test story — a loaf with three servings, a ration with one, and a plum that says it is gone, to pin what a bite leaves behind.

create the Pantry
  a room

  A bare pantry with one shelf.

create the loaf
  a thing, edible
  servings 3
  in the Pantry

  A round loaf of bread.

create the ration
  a thing, edible
  in the Pantry

  A dry ration bar.

create the plum
  a thing, edible
  in the Pantry

  A ripe plum.

  phrase disappeared:
    Not a scrap of the plum is left.

create Alex
  a person
  playable
  starts in the Pantry

  You.

before the game starts
  change the player to Alex
end before
