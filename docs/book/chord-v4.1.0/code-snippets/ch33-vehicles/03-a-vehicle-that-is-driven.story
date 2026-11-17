create the tram
  a vehicle
  in the Yard
  movement: line
  carries: in
  drive: control
  stops: the Yard, the Shed, the Mill
  direction: both
  pace: 2 turns

  A tram.

create the lever
  a thing, scenery, pullable
  in the tram

  A lever.

  after the player pulling
    start the tram
  end after

create the brake
  a thing, scenery, pushable
  in the tram

  A brake.

  after the player pushing
    stop the tram
  end after
