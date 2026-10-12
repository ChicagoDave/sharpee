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
  east to the Loading Dock
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

  on the player giving
    refuse satchel-is-yours
  end on

create the route card
  a thing, readable with text "ROUTE 7: Ceres, Titan, Kepler Station. Return to depot when empty."
  in the Sorting Room
  aka card, route

  A laminated card printed with today's route.

  on the player giving
    refuse card-is-yours
  end on

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
  up to the Hold
  up is blocked while the courier ship is buttoned: ramp-up

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
  a person
  in the Loading Dock
  aka robot, loader, unit

  A squat loader on six rubber wheels, its cargo arms folded against
  its chest. A status light on its brow blinks amber, which means it
  is waiting for something.

  after the player giving, once
    change the courier ship to boarding when the loader robot has the mail bundle
    phrase robot-loads when the loader robot has the mail bundle
    move the mail bundle to the Hold when the loader robot has the mail bundle
  end after

create the mail crates
  a thing, scenery
  in the Loading Dock
  aka crates, crate, stack

  Empty mail crates stacked three high along the west wall, every one
  stencilled UPPS and scuffed grey from the holds of a hundred ships.

## Room 3 — the robot loads the mail, and the ramp comes down.

create the Hold
  a room
  aka cargo hold, sparrow's hold, cargo bay
  down to the Loading Dock
  north is blocked: hatch-latched

  The Sparrow's hold, a steel room no wider than a corridor, ribbed
  with cargo netting. A suit locker stands bolted to the aft bulkhead,
  and a ladder climbs to the cockpit hatch at the forward end. The
  ramp slopes down to the dock.

  after the player entering, once
    phrase hold-arrival
  end after

create the cargo netting
  a thing, scenery
  in the Hold
  aka netting, net, nets, webbing

  Orange webbing strung from rib to rib, with a buckle every arm's
  length. Whatever the robot straps in here will stay put through a
  fold.

create the suit locker
  a container, openable
  in the Hold
  aka locker

  A tall steel locker stencilled EVA, its latch worn bright. The
  Sparrow carries one suit, and this is where it lives.

create the space suit
  a thing, wearable
  in the suit locker
  aka suit, eva suit, pressure suit

  A pressure suit in UPPS grey, the wing-and-planet badge on the
  shoulder. The helmet ring is scuffed from a hundred dockings.

create the cockpit hatch
  a thing, scenery
  in the Hold
  aka hatch, ladder, cockpit

  A round hatch at the top of the ladder, dogged shut with four
  latches. A placard beneath it reads: PRE-FLIGHT INCOMPLETE.

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

define phrase satchel-is-yours
  The satchel stays on your shoulder. A carrier without a satchel is
  just somebody in grey.
end phrase

define phrase card-is-yours
  The route card is the one thing on this dock that is yours to keep.
end phrase

define phrase robot-loads
  The loader robot unfolds its arms, takes the bundle as gently as an
  egg, and rolls to the Sparrow. The ramp comes down with a hiss of
  hydraulics, and the robot trundles up it and back out, empty. Its
  brow light turns green.
end phrase

define phrase hold-arrival
  The air in here smells of hot plastic and old coffee. Somewhere
  forward, a system you cannot name ticks over.
end phrase

define phrase hatch-latched
  The cockpit hatch is dogged shut, and the placard says why.
end phrase
