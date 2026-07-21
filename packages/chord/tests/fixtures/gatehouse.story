story "The Gatehouse" by "Test"
  id: gatehouse
  version: 0.0.1
  use combat
  use state-machines

  on every turn
    emit gatehouse.watch.report with post the player's location and alarm "quiet"
    play ambient wind when client has sound
  end on

create the Gate Yard
  a room
  north to the Keep

  A cobbled yard before the keep. A drawbridge spans the moat.

create the Keep
  a room
  south to the Gate Yard

  The cold stone keep.

create the ogre
  a person, combatant with health 24 and skill 45 and hostile true, guard
  in the Gate Yard

  A slab-shouldered ogre with a notched cleaver.

create the keeper
  a person, patrol with route [the Gate Yard, the Keep]
  in the Keep

  The watchful keeper on her rounds.

create the rusty winch
  aka winch
  in the Gate Yard

  A rusty winch wound with dripping chain.

create the long sword
  aka sword
  weapon with damage 6 and skill-bonus 2
  in the Gate Yard

  A long sword, recently oiled.

create the player
  starts in the Gate Yard

  You.

define machine drawbridge
  role winch is the rusty winch
  starts raised

  state raised
    when turning the winch: lowering

  state lowering
    on enter
      phrase chains-groan
      play sound clank when client has sound
    end on
    when event gatehouse.bridge.seated: lowered

  state lowered, terminal
    on enter
      phrase bridge-thuds
    end on
end machine

define channel watch
  mode replace
  from event gatehouse.watch.report
  take post, alarm
end channel

define sound clank from "audio/clank.ogg"
define sound wind from "audio/wind.ogg"

define phrase chains-groan
  The chains groan and pay out.
end phrase

define phrase bridge-thuds
  The great bridge thuds home across the moat.
end phrase
