story "The Lighthouse" by "ref"
  id: plugins-daemons
  version: 0.0.1

  on every turn
    phrase tide-works
  end on

create the Jetty
  a room
  north to the Lamp Room

  A stone jetty slick with spray.

create the Lamp Room
  a room
  south to the Jetty

  Glass on every side, the great lamp turning overhead.

create the Lighthouse
  a region
  containing the Lamp Room

  on every turn
    phrase lamp-hum
      The lamp's clockwork hums up through the floor.
  end on

create the brass clock
  aka clock
  scenery
  in the Lamp Room

  A ship's clock bolted beside the door.

  on every turn
    phrase clock-ticks
      The brass clock ticks once, heavily.
  end on

create the player
  starts in the Jetty

define phrase tide-works
  Out past the bar, the tide keeps working at the rocks.
end phrase
