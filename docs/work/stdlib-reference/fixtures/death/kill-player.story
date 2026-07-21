create the Generator Room
  a room

  Pipes and cables hum along every wall.

create the bare wire
  aka wire
  scenery
  in the Generator Room
  states: live, dead

  A stripped cable sags from the ceiling conduit.

  on touching it
    kill the player shock-death when it is live
    phrase wire-cold when it is dead
  end on

create the breaker lever
  aka lever, breaker
  scenery
  pullable
  in the Generator Room

  A heavy knife-switch bolted beside the door.

  on pulling it
    change the bare wire to dead
    phrase breaker-thrown
  end on

create the player
  starts in the Generator Room

define phrases en-US
  shock-death:
    The current takes you before you can let go.
  wire-cold:
    Cold and inert. The breaker did its job.
  breaker-thrown:
    The breaker slams over and the hum dies with it.
