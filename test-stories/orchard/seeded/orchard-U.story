## A seeded copy of orchard.story with one authoring mistake, for the test
## that checks a failed card names its cause. The mistake: the bee smoker
## is not wearable.

## A test story: the author narrative's beats. Five rooms, a tree that is
## shaken for its fruit, a press that is cranked, a keeper who answers
## questions, and three endings, one of which no test line reaches. Written
## to be tested and nothing else; `orchard.test-set.md` lists what it must
## let the tests prove.

story
  title: The Orchard
  authors:
    Test Story
  id: orchard
  story-version: 0.0.1

define trait shakeable
  on the player shaking
    the player must hold the long pole: need-pole
    select on its state
      when budding
        phrase tree-too-early
      when laden
        change it to picked
        move the windfall to the Rows
        phrase tree-drops
      when picked
        phrase tree-done
    end select
  end on
end trait

define trait crankable
  on the player cranking
    the player must hold the crank handle: need-handle
    it must be idle: press-already-running
    change it to running
    phrase press-starts
  end on
end trait

define action shaking
  grammar
    shake the target
  the target must be reachable
  otherwise refuse cannot-shake

  phrases en-US
    cannot-shake:
      Shaking that gets you nowhere.

define action cranking
  grammar
    crank the target
  the target must be reachable
  otherwise refuse cannot-crank

  phrases en-US
    cannot-crank:
      That has nothing to crank.

create the Gate
  a room
  north to the Rows

  The orchard gate stands open on the lane. A painted sign hangs from
  the top bar.

  after the player entering while the player has the windfall
    win harvest-home
  end after

create the Rows
  a room
  south to the Gate
  east to the Press House
  west to the Hive Yard

  Rows of old apple trees run up the slope. One tree stands apart,
  taller than the rest.

create the Press House
  a room
  west to the Rows
  down to the Cellar

  A cider press fills the middle of the room. Steps go down to the
  cellar, and a water valve sits by the door.

create the Hive Yard
  a room
  east to the Rows

  Straw hives hum in the sun behind a low wall.

create the Cellar
  a room
  up to the Press House

  A cool cellar of barrels, stacked three high.

create the sign
  a thing, scenery, readable
  in the Gate

  A painted sign, the paint lifting in curls.

  on the player reading
    phrase sign-text
  end on

create the apple tree
  aka tree
  a thing, scenery, shakeable
  in the Rows
  states: budding, laden, picked

  The oldest tree in the orchard, its bark split with age.

  after the player shaking while the apple tree is picked, once
    phrase tree-rests
  end after

create the windfall
  a thing
  aka apple

  One perfect apple, red on the side the sun reached.

create the long pole
  aka pole
  a thing
  in the Press House

  A long ash pole with a hook at the end.

create the bee smoker
  aka smoker
  a thing
  in the Press House

  A bee smoker on a leather strap.

create the water valve
  aka valve
  a thing, scenery
  in the Press House
  states: shut, running

  A brass valve on the pipe that waters the rows.

  on the player turning
    change the water valve to running
    change the apple tree to laden
    phrase valve-turns
  end on

create the cider press
  aka press
  a thing, scenery, crankable
  in the Press House
  states: idle, running, seized

  A cider press with a screw as thick as your arm.

create the keeper
  a person
  in the Press House

  The orchard keeper, sleeves rolled, watching the press.

create the crank handle
  aka handle
  a thing
  in the Cellar

  An iron crank handle, cold from the cellar.

create the old hive
  aka hive
  a thing, scenery
  in the Hive Yard
  states: calm, stirring, angry

  The oldest hive, straw gone grey, with its cloud of bees.

  on every turn while the old hive is angry and the player is in the Hive Yard
    lose stung
  end on

  on every turn while the old hive is stirring and the player is in the Hive Yard
    change the old hive to angry
  end on

  on every turn while the old hive is calm and the player is in the Hive Yard
    change the old hive to stirring
  end on

create the green apple
  a thing, edible
  in the Cellar

  A small green apple, hard as a stone.

  after the player eating
    lose bellyache
  end after

create the honeycomb
  aka comb
  a thing
  in the Hive Yard

  A slab of honeycomb, left on the wall.

create Ash
  a person
  playable
  starts in the Gate

  You.

define topics for the keeper
  about the cider press: phrase keeper-press-reply
  about the windfall: phrase keeper-windfall-reply
end topics

define phrases en-US
  need-pole:
    The fruit is far out of reach of your hands.
  tree-too-early:
    You shake the tree. Hard little buds rattle and hold on.
  tree-drops:
    You hook a high branch and shake. One apple drops and rolls to a stop in the grass.
  tree-done:
    You shake the tree. Nothing is left to fall.
  tree-rests:
    The old tree settles, lighter by one apple.
  need-handle:
    The press has a square socket where a handle should be.
  press-already-running:
    The press is already turning.
  press-starts:
    You fit the handle and lean on it. The screw begins to turn.
  harvest-home:
    You carry the apple out through the gate.
  stung:
    You stand too long among the hives.
  bellyache:
    One bite is enough. You do not finish the day on your feet.
  sign-text:
    "Pick nothing before the frost."
  valve-turns:
    Water runs along the rows, and the old tree drinks.
  keeper-press-reply:
    "She wants a handle," says the keeper. "It's below."
  keeper-windfall-reply:
    The keeper turns the apple over. "First of the year," he says.

before the game starts
  change the player to Ash
end before
