## A test story: what `sharpee test` prints around a tree. Four rooms, a
## ferry that docks when a lever is pulled, and a sack of biscuit with a hundred
## bites in it. Written to be tested and nothing else; `ferry.test-set.md` lists
## what it must let the tests prove.

story
  title: The Ferry
  authors:
    Test Story
  id: ferry
  story-version: 0.0.1

create the Landing
  a room
  north to the Ticket Hut
  east to the Deck
  east is blocked while the ferry is away: ramp-up

  A river landing. A timetable is posted on a pole, and an iron lever
  stands by the ramp.

create the Ticket Hut
  a room
  south to the Landing

  A hut with a ticket window.

create the Deck
  a room
  west to the Landing

  The deck of a flat ferry, riding low at the landing.

create the Far Bank
  a room

  The far bank of the river.

create the timetable
  a thing, scenery, readable
  in the Landing

  A timetable under cracked glass.

  on the player reading
    phrase timetable-text
  end on

create the ferry
  a thing, scenery
  in the Landing
  states: away, docked

  A flat ferry on a chain.

create the lever
  a thing, scenery, pullable
  in the Landing

  An iron lever, worn bright.

  on the player pulling
    change the ferry to docked
    phrase lever-pulled
  end on

create the biscuit
  aka biscuits, sack
  a thing, edible
  servings 100
  in the Ticket Hut

  A sack of ship's biscuit, enough to last a crossing or a hundred.

create the ticket
  a thing
  in the Ticket Hut

  A ferry ticket.

create the lantern
  a thing, openable
  in the Deck

  A storm lantern with a glass door.

create Marsh
  a person
  playable
  starts in the Landing

  You.

define phrases en-US
  ramp-up:
    The ramp is up and the ferry is out in the stream.
  timetable-text:
    "Ferry on the hour."
  lever-pulled:
    The chain rattles and the ferry noses in to the landing.

before the game starts
  change the player to Marsh
end before
