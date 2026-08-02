story "Death" by "Sharpee Docs"
  id: chord-ref-death
  version: 0.0.1

create the Rocky Ledge
  a room
  east to Aragain Falls

  A narrow shelf of wet rock above the gorge.

create Aragain Falls
  a room
  west to the Rocky Ledge
  south is deadly: falls-death

  The roar of the water is everything.

create Over the Falls
  a room
  deadly: over-falls-death

  You are over the falls. This was a mistake.

create the rope bridge
  aka bridge
  scenery
  in the Rocky Ledge
  states: whole, frayed

  A rope bridge sways over the gorge.

  on crossing it
    kill the player bridge-death when it is frayed
    phrase bridge-holds
  end on

create the player
  starts in the Rocky Ledge

define phrases en-US
  falls-death:
    You step out over the lip of the falls. The river takes you.
  over-falls-death:
    The water has you now.
  bridge-death:
    The frayed ropes part beneath you, and the gorge does the rest.
  bridge-holds:
    The bridge holds. Barely.
