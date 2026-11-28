## A test story: things a player names in the other number. One room,
## candles declared plural with a plural alias, and a mouse whose plural
## is written out. Written to be tested and nothing else;
## `refectory.test-set.md` lists what it must let the tests prove.

story
  title: The Refectory
  authors:
    Test Story
  id: refectory
  story-version: 0.0.1

create the Refectory
  a room

  A long table runs the length of the room under a row of candles. A
  mouse watches from the corner by the hearth.

create the candles
  aka prickets
  a thing, scenery, plural
  in the Refectory

  Tallow candles, each one pressed onto an iron pricket.

create the mouse
  a thing, singular of mice
  in the Refectory

  A small grey mouse with one torn ear.

create Wren
  a person
  playable
  starts in the Refectory

  You.

before the game starts
  change the player to Wren
end before
