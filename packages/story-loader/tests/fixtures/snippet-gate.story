story "Snippet Gate Fixture" by "Sharpee Tests"
  id: snippet-gate
  version: 0.0.1
  blurb: Z2 end-to-end fixture - gated {key} markers through the full platform.

create the Lab
  a room

  Shelves line the walls{note}{hum}. A door leads north.

  north to the Annex

create the Annex
  a room

  A cramped annex. The lab is back south.

  south to the Lab

create the brass bell
  aka bell
  in the Annex

  A small brass bell.

create the machine
  in the Lab
  scenery
  states: quiet, humming

  A squat machine.

  on examining it
    change it to humming
    phrase machine-hums
      The machine shudders into a low hum.
  end on

create the player
  in the Lab

  You.

define phrase note, cycling while the brass bell is here
  and a brass bell gleams on a shelf
end phrase

define phrase hum, cycling while the machine is humming
  and the air vibrates faintly
end phrase
