story "The Gamekeeper" by "Test"
  id: gamekeeper
  version: 0.0.1

create the Gate
  a room

  Wrought iron, hanging open on one hinge.

create the gamekeeper
  a person
  in the Gate
  states: guarded, unsettled

  Weathered, watchful, in no hurry to help.

  on asking it
    phrase keeper-shrug
  end on

create the locket
  in the Gate

  A tarnished silver locket, the clasp long broken.

define phrase locket-reply
  "Found that by the boathouse, the morning after."
end phrase

define phrase fire-reply
  "The fire? Before my time. Ask her ladyship — or better, don't."
end phrase

define phrase ladyship-reply
  The gamekeeper looks away. "She doesn't take visitors. Not since."
end phrase

define phrase keeper-shrug
  "Couldn't say," the gamekeeper mutters, and spits.
end phrase

define topics for the gamekeeper
  about the locket: phrase locket-reply
  about "the fire", "the old fire": phrase fire-reply
  about "her ladyship":
    phrase ladyship-reply
    change it to unsettled
end topics

create the player
  starts in the Gate

  You.
