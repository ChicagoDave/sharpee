story "Phrasebook: Turning" by "Sharpee Docs"
  id: phrasebook-turning
  version: 0.0.1

define action turning
  grammar
    turn :target
    rotate :target
    twist :target
  the target must be reachable
  refuse without target: turn-what
  otherwise refuse cant-turn

  phrases en-US
    turn-what:
      Turn what?
    cant-turn:
      That isn't something you can turn.

define trait stiff-valve
  states, reversible: shut, wide-open

  phrases en-US
    valve-opened:
      The wheel gives with a squeal of rust, and water hammers through the
      pipes below.
    valve-already-open:
      It's already open as far as it goes.

  on turning it
    it must be shut: valve-already-open
    change it to wide-open
    phrase valve-opened
  end on
end trait

create the Pump Room
  a room

  Pipes crowd every wall, all of them leading to one bronze valve.

create the bronze valve
  aka valve, wheel
  stiff-valve
  scenery
  in the Pump Room

  A wheel-valve the size of a dinner plate, painted bronze.

create the workbench
  aka bench
  scenery
  in the Pump Room

  A workbench bolted to the floor.

create the player
  starts in the Pump Room
