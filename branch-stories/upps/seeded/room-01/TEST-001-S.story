story
  title: UPPS (United Planetary Postal Service)
  authors:
    David Cornelson
  id: upps
  ifid: 29E1F727-29D4-44A0-9E87-D2BDC6AC021F
  story-version: 0.1.0

before the game starts
  change the player to Postman
end before

## Room 1 — the depot, where the shift begins.

create the Sorting Room
  a room
  aka depot, sorting
  east is blocked: dock-sealed

  Pigeonholes climb every wall of the depot, each one stencilled with
  the name of a world: Ceres, Titan, Kepler Station, places you have
  only seen as postmarks. The sorting machine hums in the middle of the
  floor. East, the loading dock door is shut.

create Postman
  a person
  playable
  proper
  starts in the Sorting Room

  A carrier of the United Planetary Postal Service, in regulation grey.

create the sorting machine
  a thing, scenery
  in the Sorting Room
  aka machine, sorter

  A squat steel cabinet the size of a shuttle engine, chuckling to
  itself as it reads addresses. Its out tray is empty for now.

create the mail satchel
  a container, wearable
  in the Sorting Room
  aka satchel, bag

  A canvas satchel with the UPPS wing-and-planet badge stitched on the
  flap, worn soft at the strap.

create the route card
  a thing, readable with text ROUTE 7
  in the Sorting Room
  aka card, route

  A laminated card printed with today's route.

define phrase dock-sealed
  The loading dock door stays shut until your shift is cleared to
  launch.
end phrase
