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
  east is blocked while the dock door is sealed: dock-sealed

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
  a thing, readable with text "ROUTE 7: Ceres, Titan, Kepler Station. Return to depot when empty."
  in the Sorting Room
  aka card, route

  A laminated card printed with today's route.

create the dock door
  a thing, scenery
  in the Sorting Room
  aka door, loading door, dock
  states: sealed, cleared

  A wide steel door on the east wall, striped yellow and black. A
  panel beside it reads: NO CARRIER LEAVES WITHOUT ROUTE MAIL.

## Room 2 — the bundle in the tray, and the dock beyond the door.

create the mail bundle
  a thing
  in the Sorting Room
  aka bundle, mail, parcels, route mail

  Three parcels strapped together by the sorter, each one stamped for
  a different world: Ceres, Titan, Kepler Station. The strap carries
  the day's route number.

  after the player taking, once
    change the dock door to cleared
    phrase dock-clears
  end after

create the Loading Dock
  a room
  aka dock, loading bay, bay
  west to the Sorting Room
  up is blocked: ramp-up

  A hangar of cold air and sodium light. The courier ship squats on
  its skids in the middle of the bay, its boarding ramp drawn up
  tight. A loader robot waits beside the ramp, and empty mail crates
  are stacked along the west wall. The depot is back through the door
  to the west.

  after the player entering, once
    phrase dock-arrival
  end after

create the courier ship
  a thing, scenery
  in the Loading Dock
  aka ship, courier, sparrow, ramp, skids

  A snub-nosed UPPS courier, the Sparrow, dented along one flank where
  some asteroid got the last word. Its boarding ramp is drawn up, and
  the hull plating is cold to the touch.

create the loader robot
  a thing, scenery
  in the Loading Dock
  aka robot, loader, unit

  A squat loader on six rubber wheels, its cargo arms folded against
  its chest. A status light on its brow blinks amber, which means it
  is waiting for something.

create the mail crates
  a thing, scenery
  in the Loading Dock
  aka crates, crate, stack

  Empty mail crates stacked three high along the west wall, every one
  stencilled UPPS and scuffed grey from the holds of a hundred ships.

define phrase dock-sealed
  The loading dock door stays shut until your shift is cleared to
  launch.
end phrase

define phrase dock-clears
  The sorting machine gives a satisfied clunk. On the east wall, the
  panel beside the dock door flips from red to green, and the door
  rolls up into the ceiling.
end phrase

define phrase dock-arrival
  Your boots ring on the deck plates. Somewhere above, a fan the size
  of a house turns over once and stops.
end phrase

define phrase ramp-up
  The Sparrow's ramp stays up. The loader robot's amber light blinks
  at you, patient as a clock.
end phrase
