story "Topic Basic" by "T"
  id: topic-basic
  version: 0.0.1

create the Lodge
  a room

  A snug gatehouse lodge.

create the porter
  a person
  in the Lodge
  states: calm, nervous

  A stooped porter in a moth-eaten coat.

  on asking it
    phrase shrug-reply
  end on

  on telling it
    phrase nod-reply
  end on

create the sword
  in the Lodge

  Notched and old.

define phrase sword-reply
  "They brought that blade back from the folly."
end phrase

define phrase treasure-reply
  "Heaps of it, all cursed."
end phrase

define phrase folly-reply
  The porter's eyes dart to the window. "We don't speak of the folly."
end phrase

define phrase shrug-reply
  The porter shrugs. "Couldn't say."
end phrase

define phrase nod-reply
  The porter nods along politely.
end phrase

define topics for the porter
  about the sword: phrase sword-reply
  about "treasure", "the hoard": phrase treasure-reply
  about "the folly":
    phrase folly-reply
    change it to nervous
end topics

create the player
  starts in the Lodge

  You.
