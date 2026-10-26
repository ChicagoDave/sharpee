story
  title: UPPS (United Planetary Postal Service)
  authors:
    David Cornelson
  id: upps
  ifid: 29E1F727-29D4-44A0-9E87-D2BDC6AC021F
  story-version: 0.1.0

  on every turn while the courier ship is at the Landing Pad, once
    phrase fold-ends-ceres
  end on

  on every turn while the courier ship is at the Collar Vestibule, once
    phrase fold-ends-titan
  end on

## The fold's end is narrated from the story: a clause on the ship would be
## sourced at the ship's own room, and the carrier aboard is in a room inside
## it.

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

  on the player jumping
    phrase depot-jump
  end on

  on the player saying_yes, saying_no
    phrase depot-answer
  end on

create Postman
  a person
  playable
  proper
  starts in the Sorting Room
  counter credits starts 5

  A carrier of the United Planetary Postal Service, in regulation grey.

create the sorting machine
  a thing, scenery
  in the Sorting Room
  aka machine, sorter

  A squat steel cabinet the size of a shuttle engine, chuckling to
  itself as it reads addresses. Its out tray is empty for now.

create the route placard
  a thing, attached to the sorting machine, detachable
  in the Sorting Room
  aka placard, tin placard

  A tin placard clipped to the machine's flank: ROUTES 4-9. The clip
  has been bent and rebent by every carrier who ever wanted it.

create the inspection plate
  a thing, attached to the sorting machine
  in the Sorting Room
  aka plate, brass plate

  A brass plate welded to the machine's base: INSPECTED, CERES
  AUTHORITY. The weld is older than the depot.

create the sample jar
  a container, transparent, breakable, fragile
  in the Sorting Room
  aka jar, customs jar
  states, reversible: sealed, spilled

  A customs sample jar of Titan sand, labelled HOLD FOR INSPECTION in
  three languages.

  after the player breaking
    change the sample jar to spilled
    phrase jar-spills
  end after

create the parcel twine
  a thing
  in the Sorting Room
  aka twine, string

  A hank of waxed UPPS parcel twine, regulation brown.

  on the player tying to the sorting machine
    phrase twine-on-machine
  end on

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

  on the player giving, dropping
    refuse card-is-yours
  end on

  on the player waving while the player is in the Landing Pad
    phrase quint-waved-at
  end on

  after the player showing while the player is in the Landing Pad, once
    change the pad master to waved-through
    phrase quint-waved
  end after

create the returns bin
  a container, scenery
  in the Sorting Room
  aka bin, returns, return bin

  A steel bin under the pigeonholes, stencilled RETURNS. Anything the
  sorter cannot place ends up here.

  after the player emptying
    phrase bin-emptied
  end after

  on the player throwing the dead letter
    move the dead letter to the returns bin
    phrase letter-returned
  end on

create the canteen kiosk
  a container, scenery, unlisted
  in the Sorting Room
  aka kiosk, canteen, vending kiosk

  A dented vending kiosk bolted beside the pigeonholes, its glass
  front scratched to frost. A card on the coin slot reads: CREW
  CREDITS ONLY. Behind the glass sit a ration bar and a flask of
  depot coffee.

create the ration bar
  a thing, costs 3 credits
  in the canteen kiosk
  aka bar, ration

  A foil-wrapped UPPS ration bar, flavour unstated.

  after the player buying
    phrase kiosk-vends
  end after

create the flask of coffee
  a thing, costs 4 credits
  in the canteen kiosk
  aka flask, coffee, depot coffee

  A dented steel flask of depot coffee, still warm through the glass.

create the dead letter
  a thing, flammable with the disposal torch
  in the returns bin
  aka letter, envelope

  A grey envelope addressed to no world anyone has heard of, stamped
  twice: UNKNOWN and RETURN TO SENDER.

  on the player burning
    remove the dead letter
    phrase letter-burned
  end on

  on the player throwing at the sorting machine
    phrase machine-spits-letter
  end on

create the disposal torch
  a thing
  in the Sorting Room
  aka torch, burner, disposal

  A stubby hand torch for undeliverables, its trigger worn to the
  metal. Depot rules say every dead letter ends in it.

create the mail trolley
  a thing, pushable
  in the Sorting Room
  aka trolley, cart

  A flat-bed trolley on four hard wheels, for shifting sacks between
  the sorter and the dock.

  pushing
    between the Sorting Room and the Loading Dock
  end pushing

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
  down to the Cable Trench

  A hangar of cold air and sodium light. The courier ship squats on
  its skids in the middle of the bay, its boarding ramp drawn up
  tight. A loader robot waits beside the ramp, and empty mail crates
  are stacked along the west wall. The depot is back through the door
  to the west.

  after the player entering, once
    phrase dock-arrival
  end after

## The Sparrow is one vehicle. Its rooms are aboard it, the ramp and the
## hatch each lead outside to wherever the ship is, and the fold drive sends
## it where the guidance selector points. Boarding is the ramp into the Hold.

create the courier ship
  a vehicle, scenery
  in the Loading Dock
  aka ship, courier, sparrow, ramp, skids
  movement: flight
  drive: control
  destinations: the Loading Dock, the Landing Pad, the Collar Vestibule
  pace: 5 turns
  aboard: the Hold, the Cockpit, the Airlock
  boarded through: the Hold
  states: buttoned, boarding

  A snub-nosed UPPS courier, the Sparrow, dented along one flank where
  some asteroid got the last word. Its boarding ramp is drawn up, and
  the hull plating is cold to the touch.

  on the player entering
    refuse when the courier ship is buttoned: ramp-up
  end on

  on the player lowering, raising
    phrase ramp-is-the-robots
  end on

create the loader robot
  a person, listener, night-vision
  in the Loading Dock
  aka robot, loader, unit

  A squat loader on six rubber wheels, its cargo arms folded against
  its chest. A status light on its brow blinks amber, which means it
  is waiting for something.

  on the player kissing
    phrase robot-kissed
  end on

  after the player giving
    phrase robot-loads when the loader robot has the mail bundle and the courier ship is buttoned
    phrase robot-reloads when the loader robot has the mail bundle and the courier ship is boarding
    change the courier ship to boarding when the loader robot has the mail bundle and the courier ship is buttoned
    move the mail bundle to the Hold when the loader robot has the mail bundle
  end after

  after hearing the depot-klaxon
    move the loader robot to the Cable Trench
    move the mail sack to the Loading Dock when the loader robot can see the mail sack
    move the loader robot to the Loading Dock
    phrase robot-fetches-sack
  end after

create the sodium lights
  a thing, scenery
  in the Sorting Room and the Loading Dock
  aka lights, lamps, sodium lamps, girders

  Sodium lamps hang in rows from girders far overhead, buzzing, and
  turn everything under them the colour of weak tea.

create the call button
  a thing, scenery, pushable
  in the Loading Dock
  aka button, call, red button

  A red button the size of a palm, set in a yellow plate: CALL LOADER.

  after the player pushing
    play sound depot-klaxon
  end after

create the floor grating
  a thing, scenery
  in the Loading Dock
  aka grating, grate, trench

  A steel grating in the floor, propped open on a cable trench. It is
  black down there.

create the Cable Trench
  a room, dark
  up to the Loading Dock

  passage to the Sorting Room
    grammar
      follow the cables
      crawl along the cables
    while the Cable Trench is not dark
  end passage

  A trench under the dock floor, just deep enough to stand in, where
  power cables run in bundles along both walls. The grating is
  overhead. Lit, the cables can be seen running off under the depot
  floor toward the sorting machine.

create the mail sack
  a thing
  in the Cable Trench
  aka sack, dropped sack

  A canvas mail sack, dropped through the grating some shift ago and
  never missed.

create the blackout lantern
  a thing, light-source with the flint striker, starts unlit
  in the Loading Dock
  aka lantern, blackout lamp

  A paraffin lantern kept for power cuts, the glass sooted at the top.

create the flint striker
  a thing
  in the Loading Dock
  aka striker, flint

  A steel striker on a loop of string.

create the work lamp
  a container, light-source, switchable, powered by the power cell
  in the Loading Dock
  aka lamp, work light

  A heavy yellow work lamp with a battery bay in its handle.

create the power cell
  a thing
  in the Loading Dock
  aka cell, battery

  A fat UPPS power cell, charge light green.

create the mail crates
  a thing, scenery
  in the Loading Dock
  aka crates, crate, stack

  Empty mail crates stacked three high along the west wall, every one
  stencilled UPPS and scuffed grey from the holds of a hundred ships.

  on the player looking_under
    phrase crates-underneath
  end on

## Room 3 — the robot loads the mail, and the ramp comes down.

create the Hold
  a room
  aka cargo hold, sparrow's hold, cargo bay
  down to outside
  down is blocked while the courier ship is not at the Loading Dock: ramp-sealed
  north to the Cockpit
  north is blocked while the cockpit hatch is dogged: hatch-latched

  The Sparrow's hold, a steel room no wider than a corridor, ribbed
  with cargo netting. A suit locker stands bolted to the aft bulkhead,
  and a ladder climbs to the cockpit hatch at the forward end. The
  ramp is aft.

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

create the specimen jar
  a container, openable, transparent
  holds 2
  in the Hold
  aka jar, sample jar, glass jar

  A squat glass jar with a screw lid and a UPPS biohazard sticker half
  peeled off the side. Whatever is inside is on show whether the lid
  is on or off.

create the beetle
  a thing
  in the specimen jar
  aka bug, insect, specimen

  A beetle the size of a thumbnail, iridescent green, very dead, and
  addressed to a laboratory on Titan.

create the coil of strapping
  a thing, unlisted
  in the Hold
  aka strap, straps, strapping, coil

  A coil of cargo strapping, the kind the robot cuts to length.

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

create the guidance selector
  a thing, scenery, settable
  in the Cockpit
  aka selector, guidance, destination selector, dial
  states, reversible: ceres, titan, kepler

  A three-position selector under the viewport, its pointer worn
  bright at every stop.

  after the player examining
    select on the guidance selector
      when ceres
        phrase selector-reads-ceres
      when titan
        phrase selector-reads-titan
      when kepler
        phrase selector-reads-kepler
    end select
  end after

  on the player setting to kepler
    refuse selector-kepler-last
  end on

  after the player setting
    phrase selector-clicks
  end after

create the card slot
  a container, scenery
  holds 1
  in the Cockpit
  aka slot, reader, card reader

  A slot in the console the width of a route card, and no wider. The
  Sparrow reads one route at a time.

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
    refuse when the outer hatch is open: fold-hatch-open
  end on

  after the player switching_on
    send the courier ship to the Landing Pad when the guidance selector is ceres
    send the courier ship to the Collar Vestibule when the guidance selector is titan
    phrase fold-begins
  end after

  on the player switching_off
    refuse when the courier ship is under way: fold-no-abort
  end on

create the flight manual
  a thing, readable with text "UPPS COURIER, SPARROW CLASS: PILOT'S HANDBOOK. Consult the index for the system you need."
  in the Cockpit
  aka manual, handbook, pilot's handbook

  A ring-bound handbook, its corners soft from a decade of gloves.
  The index runs to six pages.

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
  west to outside
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
    refuse when the courier ship is at the Loading Dock: hatch-in-dock
  end on

  after the player opening
    kill the player hatch-into-the-fold when the courier ship is under way
    phrase ceres-outside when the courier ship is at the Landing Pad
    phrase titan-outside when the courier ship is at the Collar Vestibule
  end after

create the pressure gauge
  a thing, scenery
  in the Airlock
  aka gauge, dial

  A brass-rimmed dial under scratched glass. In a fold it reads nothing
  at all, which is the point: there is nothing out there to press.

define topics for the flight manual
  about "the fold", "the fold drive", "folding": phrase manual-fold
  about "the airlock", "the outer hatch", "the hatch": phrase manual-airlock
  about "the selector", "guidance": phrase manual-selector
end topics

## Room 6 — Ceres, and the first of Vance's hands.

create the Landing Pad
  a room
  aka pad, pad 14, pad fourteen, ceres, cement
  north is blocked while the pad master is unconvinced: quint-blocks

  Pad 14 is a circle of old cement under a black sky, its number
  touched up by hand. Ceres curves away in every direction, close and
  grey, and a tram line runs north toward the lit dome of Piazzi
  Town. The Sparrow's open hatch is behind you.

  after the player entering, once
    phrase pad-arrival
  end after

  on the player saying_yes while the pad master is unconvinced
    phrase quint-takes-yes-as-the-card
  end on

  on the player saying_no, saying_sorry while the pad master is unconvinced
    phrase quint-shrugs
  end on

## Quint has no conversation block yet, so an answer on the pad is an answer
## to nobody and the room hears it (the two clauses above). When her thread
## lands, they move into her block and fire only while the talk is live.

create the pad master
  a person
  in the Landing Pad
  aka quint, dolores, master, dolores quint, pad master quint
  states: unconvinced, waved-through
  carries the tram token

  Dolores Quint, pad master of 14, in a suit with more patches than
  suit. She carries a clipboard, which on Ceres means she has a job,
  and she is standing between you and the tram.

  after the player giving
    lose parcel-signed-away when the pad master has the mail bundle
  end after

  on the player asking_for the tram token
    refuse when the pad master is unconvinced: quint-no-token
    move the tram token to the player
    phrase quint-hands-token
  end on

create the tram token
  a thing
  aka token, brass token, fare token

  A brass disc stamped PIAZZI TRANSIT, ONE FARE, worn smooth on the
  side that goes into the turnstile.

define topics for the pad master
  about "the parcel", "the bundle", "the mail": phrase quint-parcel
  about "vance", "mr vance", "aurelio vance": phrase quint-vance
  about "the dome", "piazzi town", "the tram": phrase quint-dome
end topics

create the tram line
  a thing, scenery
  in the Landing Pad
  aka tram, line, rails, track, rail

  Two rails in a bed of grey dust, running north to the dome. A
  single open car sits at the pad end with its brake set.

## The tram car is a line vehicle under control: its brake lever starts it,
## and the line's machine carries it to the dome and halts it there. Quint
## keeps the carrier out of it until the route card has been shown.

create the tram car
  a vehicle
  in the Landing Pad
  aka car, open car, tram's car
  movement: line
  carries: in
  drive: control
  stops: the Landing Pad, the Piazzi Platform
  direction: both
  pace: 2 turns

  An open car on the tram line, a bench along each side and a brake
  lever at the front.

  on the player entering
    refuse when the pad master is unconvinced: quint-blocks
  end on

create the brake lever
  a thing, pushable
  in the tram car
  aka brake, lever

  A brake lever, set hard.

  on the player pushing
    start the tram car when the tram car is not under way
    phrase brake-released
  end on

define phrase brake-released
  The brake comes off with a clank and the car takes up the slack.
end phrase

create the Piazzi Platform
  a room
  aka platform, piazzi, dome

  The tram stops under the lip of the dome at a turnstile that takes
  one brass token and gives nothing back. Beyond it the lit streets of
  Piazzi Town climb away under the glass.

## Titan — the Sparrow's second destination, a docking collar on Huygens
## Orbital, and the drop shuttle down to Kraken Shore. These rooms are the
## conveyance's exercisers; customs, the robot and Rask come with their rows.

create the Collar Vestibule
  a room
  aka vestibule, collar, docking collar
  east to the Shuttle Gate

  A ribbed steel throat where the station's collar has clamped onto
  the Sparrow's port side. The deck plates are warm, the lights are
  the white of a clinic, and a sign points inward: CUSTOMS. ALL
  ARRIVALS. The shuttle gate is east.

  after the player entering, once
    phrase collar-arrival
  end after

create the Shuttle Gate
  a room
  aka gate, shuttle gate, departure gate
  west to the Collar Vestibule

  A departure gate at the station's rim, one wall all window: Titan
  below, orange from edge to edge, with the shuttle track dropping
  away into it like a wire into soup. A board over the gate reads
  KRAKEN SHORE, and under it the shuttle's bay.

create the drop shuttle
  a vehicle, scenery
  in the Shuttle Gate
  aka shuttle, drop shuttle, capsule
  movement: line
  carries: in
  drive: control
  stops: the Shuttle Gate, the Kraken Landing
  direction: both
  pace: 4 turns

  A blunt capsule on a cradle, six seats and a window, scorched
  along its underside by a thousand drops through Titan's air. A
  lever by the hatch is painted DROP.

  after the player exiting
    phrase kraken-arrival when the drop shuttle is at the Kraken Landing
  end after

create the drop lever
  a thing, pushable, scenery
  in the drop shuttle
  aka lever, drop, handle

  A lever painted DROP in letters that have been touched up more
  than once.

  on the player pushing
    refuse when the drop shuttle is under way: shuttle-already-dropping
    phrase shuttle-drops when the drop shuttle is at the Shuttle Gate
    phrase shuttle-rises when the drop shuttle is at the Kraken Landing
    start the drop shuttle
  end on

define sequence the drop
  when the drop shuttle becomes under way
  2 turns later
    phrase shuttle-window
end sequence

create the Kraken Landing
  a room
  aka landing, kraken landing, pad

  A landing stage on struts above a shore of black sand and orange
  haze, the shuttle cradle at one end and a boardwalk running off
  into the murk. The air is thick enough to lean on, and the cold
  gets in through the suit at the wrists.

define phrase collar-arrival
  The collar's inner door rolls aside on an airlock bigger than the
  Sparrow's whole hold, and a voice from nowhere says ARRIVAL LOGGED.
end phrase

define phrase shuttle-drops
  The lever goes over with a thunk you feel in your spine. The cradle
  lets go, the window fills with orange, and the station is gone.
end phrase

define phrase shuttle-rises
  The lever goes over, the cradle lets go, and the shore drops away
  under the window into its own orange weather.
end phrase

define phrase shuttle-already-dropping
  The lever is already over. The shuttle goes where the track goes.
end phrase

define phrase shuttle-window
  Through the window the haze thins for a moment: a black sea with a
  slow swell on it, a line of boardwalk, a single light turning at
  the end of it. Then the orange closes over again.
end phrase

define phrase kraken-arrival
  Your boots come down on the landing stage. Out on the shore, a
  lighthouse turns its beam through the murk, once, and goes on
  turning.
end phrase

define phrase depot-jump
  The sorting machine pauses mid-chuckle, then goes on without you.
end phrase

define phrase depot-answer
  The sorting machine takes that as addressed to it, and files it.
end phrase

define phrase crates-underneath
  Dust, a bent staple, and the floor.
end phrase

define phrase robot-kissed
  The loader's status light goes red, then amber again. It has filed
  a report.
end phrase

define phrase letter-burned
  The dead letter goes up in a flat orange sheet and is gone before
  the smell reaches you. Nobody will miss it.
end phrase

define phrase ramp-is-the-robots
  The ramp is the loader's to work, and the loader does not take
  requests from carriers.
end phrase

define phrase selector-kepler-last
  Kepler Station is the last stop on Route 7. The card says Ceres
  first.
end phrase

define phrase selector-reads-ceres
  The pointer rests on CERES.
end phrase

define phrase selector-reads-titan
  The pointer rests on TITAN.
end phrase

define phrase selector-reads-kepler
  The pointer rests on KEPLER.
end phrase

define phrase selector-clicks
  The selector clicks home and the console takes a moment to agree.
end phrase

define phrase bin-emptied
  The sorting machine stops chuckling for a moment, as if it had
  been counting on that one.
end phrase

define phrase quint-takes-yes-as-the-card
  "Yes what? Yes you have a route card?" She holds out her hand.
end phrase

define phrase quint-shrugs
  Quint shrugs. "Nobody asked you anything."
end phrase

define phrase quint-waved-at
  Quint does not wave back. The clipboard stays where it is.
end phrase

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

define phrase fold-ends-ceres
  The hum drops out of the hull all at once. Through the nearest port,
  grey rock swings up and stops: Ceres, close enough to read the
  painted numbers on its landing pads. The Sparrow settles with a
  thump you feel in your boots.
end phrase

define phrase fold-ends-titan
  The hum drops out of the hull all at once. Through the nearest port,
  orange haze fills the glass from edge to edge, and a ring of lights
  slides across it: Huygens Orbital, with Titan underneath it like a
  lamp under a cloth. Something clamps onto the hull with a clang.
end phrase

define phrase fold-hatch-open
  The fold drive will not light with the outer hatch standing open.
  The console is quite firm about it.
end phrase

define phrase titan-outside
  The hatch swings out into a docking collar, a ribbed steel throat
  with CUSTOMS stencilled around it in four languages. The air that
  comes in smells of cold rubber.
end phrase

define phrase ceres-outside
  The hatch swings out onto a landing pad the colour of old cement,
  numbered 14 in paint that has been touched up by hand. A tram line
  runs away toward a dome, and the sky is black at noon.
end phrase

define phrase hatch-shut
  The outer hatch is shut. Nobody walks through a shut hatch without
  opening it first.
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

define phrase letter-returned
  The dead letter skims across the floor and drops into the returns
  bin as if it knew the way. Undeliverables always find their way
  back.
end phrase

define phrase machine-spits-letter
  The sorting machine snatches the letter out of the air, reads the
  address, finds no world by that name, and spits it back onto the
  floor.
end phrase

define phrase kiosk-vends
  The kiosk counts your credits twice, grudgingly, and lets go of
  what you paid for.
end phrase

define phrase manual-fold
  FOLD DRIVE, p. 41: "The drive will not engage without a seated,
  harnessed pilot. Once engaged, the fold cannot be aborted. Do not
  open any hatch while folding."
end phrase

define phrase manual-airlock
  PORT AIRLOCK, p. 58: "Check the gauge. Then the window. Then the
  wheel. A gauge reading of nothing means you are still in the fold."
end phrase

define phrase manual-selector
  GUIDANCE SELECTOR, p. 12: "The selector holds one destination. Set
  it to the first stop on the route card before engaging the drive."
end phrase

define phrase quint-no-token
  "Tokens are for people I've signed off." Quint taps the clipboard.
  "You're not signed off."
end phrase

define phrase quint-hands-token
  Quint fishes a brass token out of a patch pocket and flicks it to
  you. "One fare. Don't make me regret it."
end phrase


define phrase jar-spills
  Titan sand hisses out across the depot floor, orange and finer than
  flour. Somebody in customs is going to want a form.
end phrase

define phrase twine-on-machine
  The sorting machine stops chuckling long enough to register that it
  has been tied to something, then decides it has not.
end phrase

define sound depot-klaxon

define phrase robot-fetches-sack
  The loader robot rolls to the grating, drops into the trench without
  slowing, and comes back up a moment later with a mail sack hooked on
  one arm. It sets the sack down beside you and resumes waiting.
end phrase
