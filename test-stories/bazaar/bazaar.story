## A test story: a claim whose set is padded with things that cannot bear on
## it. Three rooms and eight wares nobody needs. Written to be tested and
## nothing else; `bazaar.test-set.md` lists what it must let the tests prove.

story
  title: The Bazaar
  authors:
    Test Story
  id: bazaar
  story-version: 0.0.1

create the Arcade
  a room
  east to the Lamp Stall
  north to the Back Lane
  north is blocked while the gate is chained: gate-shut

  A covered arcade of stalls. An iron gate closes the north end.

create the Lamp Stall
  a room
  west to the Arcade

  Lamps of every size hang from the awning.

create the Back Lane
  a room
  south to the Arcade

  A lane behind the stalls, where the carts unload.

create the gate
  a thing, scenery
  in the Arcade
  states: chained, open

  An iron gate, chained shut for the day.

create the fig
  a thing
  in the Arcade

  A ripe fig.

create the plum
  a thing
  in the Arcade

  A dark plum.

create the ribbon
  a thing
  in the Arcade

  A red ribbon.

create the thimble
  a thing
  in the Arcade

  A tin thimble.

create the comb
  a thing
  in the Arcade

  A horn comb.

create the wick
  a thing
  in the Lamp Stall

  A length of lamp wick.

create the flint
  a thing
  in the Lamp Stall

  A flint.

create the snuffer
  a thing
  in the Lamp Stall

  A brass candle snuffer.

create Pell
  a person
  playable
  starts in the Arcade

  You.

define phrases en-US
  gate-shut:
    The gate is chained.

before the game starts
  change the player to Pell
end before
