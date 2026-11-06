story
  title: Eating Removal Test
  authors:
    Sharpee Team
  id: eating-removal-test
  story-version: 0.0.1
  description: A platform test story — a loaf with three servings, a ration with one, a plum that says it is gone, and two drinks in the cellar, to pin what a bite or a sip leaves behind.

create the Pantry
  a room
  down to the Cellar

  A bare pantry with one shelf.

create the Cellar
  a room
  up to the Pantry

  A cool cellar under the pantry.

create the cordial
  a thing, drinkable
  in the Cellar

  A small glass of cordial.

create the cider
  a thing, drinkable
  servings 2
  in the Cellar

  A mug of cider.

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
