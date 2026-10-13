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

  after the player showing while the player is in the Landing Pad, once
    change the pad master to waved-through
    phrase quint-waved
  end after

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
  states: buttoned, boarding, underway, landed

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

  after the player giving
    phrase robot-loads when the loader robot has the mail bundle and the courier ship is buttoned
    phrase robot-reloads when the loader robot has the mail bundle and the courier ship is boarding
    change the courier ship to boarding when the loader robot has the mail bundle and the courier ship is buttoned
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
  down is blocked while the courier ship is underway: ramp-sealed
  down is blocked while the courier ship is landed: ramp-sealed
  north to the Cockpit
  north is blocked while the cockpit hatch is dogged: hatch-latched

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

  after the player wearing, once
    change the cockpit hatch to free
    phrase preflight-complete
  end after

create the cockpit hatch
  a thing, scenery
  in the Hold
  aka hatch, ladder
  states: dogged, free

  A round hatch at the top of the ladder, dogged shut with four
  latches. A placard beneath it reads: PRE-FLIGHT INCOMPLETE.

## Room 4 — pre-flight, and the cockpit beyond the hatch.

create the Cockpit
  a room
  aka flight deck, bridge, nose
  south to the Hold

  The Sparrow's nose, two steps across. A flight couch faces a
  console of switches and a single dark viewport, and the ladder
  drops back through the hatch to the hold. Everything in here is
  worn to bare metal by somebody's gloves.

  after the player entering, once
    phrase cockpit-arrival
  end after

create the flight couch
  a thing, enterable, scenery
  in the Cockpit
  aka couch, seat, pilot seat, chair, harness

  A pilot's couch with a five-point harness, the padding cracked
  along one arm where a hundred shifts have rested the same elbow.

create the console
  a thing, scenery
  in the Cockpit
  aka controls, switches, panel, instruments

  Rows of guarded switches, most of them taped over with a crew's
  handwriting. One sits apart under a red cover, labelled FOLD.

create the fold drive
  a thing, switchable, scenery
  in the Cockpit
  aka drive, fold, fold switch, red switch, switch

  The red-covered switch that wakes the Sparrow's fold drive. Route 7
  runs on it: Ceres is a long way to go the slow way.

  on the player switching_on
    the player must be in the flight couch: not-strapped-in
  end on

  after the player switching_on, once
    change the courier ship to underway
    phrase fold-begins
  end after

  on the player switching_off
    refuse fold-no-abort
  end on

create the viewport
  a thing, scenery
  in the Cockpit
  aka port, window, glass

  A single pane of layered glass, dark with the hangar's shadow and
  scored by a decade of dust at speed.

## Room 5 — the fold, and the airlock at the end of it.

create the Airlock
  a room
  aka lock, port lock, port airlock
  east to the Hold
  west to the Landing Pad
  west is blocked while the outer hatch is closed: hatch-shut

  A closet of a room in the Sparrow's port side, big enough for one
  carrier in a suit and not much else. The inner door stands open to
  the hold. The outer hatch is a slab of grey steel with a wheel at
  chest height, a pressure gauge beside it, and a placard: CHECK THE
  GAUGE. THEN THE WINDOW. THEN THE WHEEL.

  first time
    The deck plates here are scored where a thousand parcels have been
    dragged across them. Your boots fit the grooves.

create the outer hatch
  a thing, openable, scenery
  in the Airlock
  aka hatch, outer door, wheel, slab, window

  Grey steel a hand's width thick, with the wheel at chest height and
  one small window. What the window shows is whatever the Sparrow is
  passing through.

  on the player opening
    refuse when the courier ship is buttoned: hatch-in-dock
    refuse when the courier ship is boarding: hatch-in-dock
  end on

  after the player opening, once
    kill the player hatch-into-the-fold when the courier ship is underway
    phrase ceres-outside when the courier ship is landed
  end after

create the pressure gauge
  a thing, scenery
  in the Airlock
  aka gauge, dial

  A brass-rimmed dial under scratched glass. In a fold it reads nothing
  at all, which is the point: there is nothing out there to press.

define sequence the fold
  when the courier ship becomes underway
  5 turns later
    change the courier ship to landed
    phrase fold-ends
end sequence

## Room 6 — Ceres, and the first of Vance's hands.

create the Landing Pad
  a room
  aka pad, pad 14, pad fourteen, ceres, cement
  east to the Airlock
  north is blocked while the pad master is unconvinced: quint-blocks

  Pad 14 is a circle of old cement under a black sky, its number
  touched up by hand. Ceres curves away in every direction, close and
  grey, and a tram line runs north toward the lit dome of Piazzi
  Town. The Sparrow's hatch is behind you to the east.

  after the player entering, once
    phrase pad-arrival
  end after

create the pad master
  a person
  in the Landing Pad
  aka quint, dolores, master, dolores quint, pad master quint
  states: unconvinced, waved-through

  Dolores Quint, pad master of 14, in a suit with more patches than
  suit. She carries a clipboard, which on Ceres means she has a job,
  and she is standing between you and the tram.

  after the player giving
    lose parcel-signed-away when the pad master has the mail bundle
  end after

define topics for the pad master
  about "the parcel", "the bundle", "the mail": phrase quint-parcel
  about "vance", "mr vance", "aurelio vance": phrase quint-vance
  about "the dome", "piazzi town", "the tram": phrase quint-dome
end topics

create the tram line
  a thing, scenery
  in the Airlock
  aka tram, line, rails, track, rail

  Two rails in a bed of grey dust, running north to the dome. A
  single open car sits at the pad end with its brake set.

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

define phrase preflight-complete
  The suit seals at the neck with a click you feel in your teeth. Up
  the ladder, four latches knock back one after another, and the
  placard flips over: PRE-FLIGHT COMPLETE.
end phrase

define phrase cockpit-arrival
  Your helmet brushes the overhead. Somebody has taped a photograph
  of a dog to the edge of the console.
end phrase

define phrase not-strapped-in
  The Sparrow will not fold with its pilot standing up. Get in the
  couch.
end phrase

define phrase fold-begins
  You flip up the red cover and throw the switch. The console lights
  from left to right, the hull hums up through the couch into your
  spine, and outside the viewport the hangar folds away like a
  letter.
end phrase

define phrase fold-no-abort
  Once the fold drive is lit there is no switching it off. The
  Sparrow goes where the mail goes.
end phrase

define phrase hatch-in-dock
  The outer hatch stays shut while the Sparrow sits in the dock. Mail
  goes out by the ramp here, not the lock.
end phrase

define phrase hatch-into-the-fold
  You spin the wheel. The gauge was right: there is nothing out there,
  not even vacuum, and the fold takes the hatch, the airlock and the
  carrier in it as neatly as a letter slid into a slot. Route 7 will
  be reassigned.
end phrase

define phrase fold-ends
  The hum drops out of the hull all at once. Through the nearest port,
  grey rock swings up and stops: Ceres, close enough to read the
  painted numbers on its landing pads. The Sparrow settles with a
  thump you feel in your boots.
end phrase

define phrase ceres-outside
  The hatch swings out onto a landing pad the colour of old cement,
  numbered 14 in paint that has been touched up by hand. A tram line
  runs away toward a dome, and the sky is black at noon.
end phrase

define phrase hatch-shut
  The outer hatch is shut. Nobody walks through a hatch on Ceres
  without opening it first.
end phrase

define phrase pad-arrival
  Your boots come down in a sixth of the weight they left the depot
  with, and the dust takes a long time to settle. A woman in a patched
  suit is already walking toward you from the tram.
end phrase

define phrase quint-blocks
  The pad master steps into the gap between you and the tram car.
  "Nobody rides north off my pad until I've signed for what's come
  in." She holds out a gloved hand.
end phrase

define phrase quint-parcel
  "Everything that lands on 14 gets signed for by me. That's the
  rule." She taps the clipboard. "Hand it over, and you can be gone
  before the dust settles."
end phrase

define phrase quint-vance
  She goes very still. "Mr Vance owns the pads, the tram and the air
  you're breathing, carrier, and he doesn't take mail. I don't know
  any Vance." The clipboard goes behind her back.
end phrase

define phrase quint-dome
  "Piazzi Town. Four thousand people under one roof, and a tram that
  runs when I say." She looks at the tram car. "It isn't saying."
end phrase

define phrase quint-waved
  She reads the route card twice, and her mouth gets smaller each
  time. "Route 7. Addressee delivery, no proxy signature." She hands
  it back and steps out of the gap. "Tram's that way. Mind the
  brake."
end phrase

define phrase parcel-signed-away
  Quint signs the clipboard with a flourish, "D. Quint for the
  addressee", tucks the bundle under one arm and climbs into the
  tram car. The brake comes off. By the time the dust settles she
  is a dot under the dome, and Route 7 has nothing left to deliver.
end phrase

define phrase robot-reloads
  The loader robot takes the bundle without ceremony this time and
  trundles it up the ramp again. Its brow light stays green.
end phrase

define phrase ramp-sealed
  The ramp has been sealed since the fold. Whatever is on the other
  side of it now, it is not the depot.
end phrase

