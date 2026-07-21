story "Bridge" by "Test"
  id: drawbridge
  version: 0.0.1
  states: calm, stormy
  use state-machines

create the Gatehouse
  a room

  A cold stone gatehouse.

create the rusty winch
  aka winch
  in the Gatehouse

  A rusty winch wound with chain.

create the player
  starts in the Gatehouse

  You.

define machine drawbridge
  role winch is the rusty winch
  starts raised

  state raised
    when turning the winch: lowering

  state lowering
    on enter
      phrase chains-groan
    end on
    when stormy: lowered

  state lowered, terminal
    on enter
      phrase bridge-thuds
    end on
end machine

define phrase chains-groan
  The chains groan and pay out.
end phrase

define phrase bridge-thuds
  The bridge thuds home.
end phrase
