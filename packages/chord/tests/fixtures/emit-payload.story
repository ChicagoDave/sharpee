story "Chimes" by "Test"
  id: emit-payload
  version: 0.0.1

  on every turn
    emit media-sound-play with src "chime.ogg" and channel "sfx"
    emit media-image-show with src "map.png" and layer "background" and hotspots [ { id "well", target the well } ]
    emit chord-debug-whereabouts with holder the player and room the player's location
  end on

create the Courtyard
  a room

  A cobbled courtyard.

create the well
  in the Courtyard

  A stone well.

create the player
  starts in the Courtyard

  You.
