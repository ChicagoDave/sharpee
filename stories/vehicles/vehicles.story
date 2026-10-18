story
  title: Vehicles
  authors:
    Sharpee Tests
  id: vehicles
  story-version: 0.0.1

## Chord 4.0 Phase 11 fixture: one vehicle of each shipped movement model,
## played through the assembled engine by the transcripts under tests/.
## The bucket is a line driven by its position block (fill, rise, empty,
## fall); the tram car is a line under control with a pace and a brake,
## run out and back; the funicular is the same line one way; the Marigold
## is steered by compass across water that admits it and stops where the
## water does not. No RNG anywhere.

## The well: a state-driven line.

create the Well Bottom
  a room
  up to the Top of the Well
  north to the Depot

  The bottom of a dry well. A bucket hangs here on a rope.

create the Top of the Well
  a room
  down to the Well Bottom

  The top of the well, open to the sky.

create the water
  a thing
  in the Well Bottom

  A pool of clear water.

create the bucket
  a vehicle
  in the Well Bottom
  movement: line
  carries: in
  drive: state
  stops: the Well Bottom, the Top of the Well
  direction: both
  holds 3

  A wooden bucket on a rope, big enough to stand in.

  position
    when the bucket holds the water: the Top of the Well
    otherwise: the Well Bottom
  end position

## The tram: a controlled line out and back, and a one-way funicular.

create the Depot
  a room
  south to the Well Bottom
  north to the Garage
  east to the Harbour
  west to the Lower Station

  A tram depot. The rails run north.

create the Midway Halt
  a room

  A halt halfway along the tram line.

create the Terminus
  a room

  The end of the tram line.

create the tram car
  a vehicle
  in the Depot
  movement: line
  carries: in
  drive: control
  stops: the Depot, the Midway Halt, the Terminus
  direction: both
  pace: 2 turns

  An open tram car with a brake lever.

create the brake
  a thing, pushable
  in the tram car
  aka lever, brake lever

  A brake lever.

  on the player pushing
    start the tram car when the tram car is not under way
    phrase brake-off
  end on

define phrase brake-off
  The brake comes off.
end phrase

define phrase tram-lurch
  The tram car lurches into motion.
end phrase

define sequence the tram ride
  when the tram car becomes under way
    phrase tram-lurch
end sequence

create the Lower Station
  a room
  east to the Depot

  The lower station of a funicular.

create the Upper Station
  a room

  The upper station of the funicular.

create the funicular
  a vehicle
  in the Lower Station
  movement: line
  carries: in
  drive: control
  stops: the Lower Station, the Upper Station
  direction: one-way
  pace: 1 turn

  A funicular car.

create the cable switch
  a thing, pushable
  in the funicular
  aka switch

  A switch marked UP.

  on the player pushing
    start the funicular
    phrase switch-thrown
  end on

define phrase switch-thrown
  You throw the switch.
end phrase

## The water: a compass vehicle on a region that admits it.

create the Open Water
  a region
  admits: the Marigold

create the Harbour
  a room
  in the Open Water
  west to the Depot
  north to the Sound
  east to the Pad

  A sheltered harbour.

create the Sound
  a room
  in the Open Water
  south to the Harbour
  north to the Strait

  A wide sound.

create the Strait
  a room
  in the Open Water
  south to the Sound
  north to the Shoal

  A narrow strait.

create the Shoal
  a room
  south to the Strait

  A shoal, too shallow for a keel.

create the Marigold
  a vehicle
  in the Harbour
  movement: compass
  carries: in
  drive: player
  commands: compass
  pace: 2 turns

  A barque with a tiller and an anchor.

create the anchor
  a thing, pullable
  in the Marigold

  A heavy anchor on a chain.

  on the player pulling
    stop the Marigold
    phrase anchor-dropped
  end on

define phrase anchor-dropped
  The anchor goes over the side and the chain runs out.
end phrase

## The streets: a car steered by GO along ways that admit it (D5b, D6).
## The High Street region admits it, the Alley admits it by itself, the
## Footpath does not.

create the High Street
  a region
  admits: the car

create the Garage
  a room
  in the High Street
  south to the Depot
  north to the Market
  east to the Alley
  west to the Footpath

  A garage opening onto the High Street.

create the Market
  a room
  in the High Street
  south to the Garage

  The market square at the top of the High Street.

create the Alley
  a room
  admits: the car
  west to the Garage

  A narrow alley, just wide enough for a car.

create the Footpath
  a room
  east to the Garage

  A footpath between hedges.

create the car
  a vehicle
  in the Garage
  movement: streets
  carries: in
  drive: player
  commands: compass

  A small car.

## Free flight: a ship with rooms aboard, sent by the destinations set (D5d, D7).

create the Pad
  a room
  west to the Harbour

  A launch pad beside the harbour.

create the Orbit Station
  a room

  A station in orbit.

create the Sparrow
  a vehicle
  in the Pad
  movement: flight
  drive: player
  commands: destinations
  destinations: the Pad, the Orbit Station
  passage: 2 turns
  aboard: the Airlock, the Cabin
  boarded through: the Airlock

  A courier ship.

create the Airlock
  a room
  east to the Cabin
  west to outside

  The Sparrow's airlock.

create the Cabin
  a room
  west to the Airlock

  The Sparrow's cabin.

create Alex
  a person
  playable
  starts in the Well Bottom

  You.

before the game starts
  change the player to Alex
end before
