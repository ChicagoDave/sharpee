story "Match Outside Each Gate" by "Sharpee Platform"
  id: match-outside-each
  version: 0.0.1

create the Barn
  a room

create the player
  starts in the Barn

create the goat
  in the Barn
  states: hungry, content

  on prodding it
    change the match to content
    phrase prod-note with animal = the match
  end on

define phrases en-US
  prod-note:
    Prodded.
