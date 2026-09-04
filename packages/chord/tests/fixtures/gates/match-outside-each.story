story
  title: Match Outside Each Gate
  authors:
    Sharpee Platform
  id: match-outside-each
  story-version: 0.0.1

create the Barn
  a room

create Alex
  a person
  playable
  starts in the Barn

create the goat
  in the Barn
  states: hungry, content

  on the player prodding
    change the match to content
    phrase prod-note with animal = the match
  end on

define phrases en-US
  prod-note:
    Prodded.

before the game starts
  change the player to Alex
end before
