story "Compass" by "Test"
  id: compass
  version: 0.0.1

  on every turn
    emit chord-compass-updated with heading "north" and target the well and windspeed 12
    play sound roar when client has sound
    phrase roar-text when not client has sound
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

define channel compass
  mode replace
  gated by images
  return "(heading) toward (target)" from chord-compass-updated
end channel

define sound roar from "audio/roar.ogg"

define phrase roar-text
  A deafening roar shakes the room.
end phrase
