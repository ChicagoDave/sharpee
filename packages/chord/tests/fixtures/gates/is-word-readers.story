story
  title: Gate Is Word Readers
  authors:
    Nobody
  id: gate-is-word-readers
  story-version: 0.0.1

define condition loose-thing: it is a thing and it is in the Hall

define action counting
  grammar
    count
  each loose-thing
    phrase fixed when the match is scenery
    phrase polished when the match is gleaming
    phrase polished when the match is gleamng
  end each

  phrases en-US
    fixed:
      Fixed in place.
    polished:
      Polished.

create the Hall
  a room

  A hall.

create the statue
  a thing, scenery
  in the Hall
  states: dull, gleaming

  A statue.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before
