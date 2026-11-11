story
  title: Gate Noun Dispatch
  authors:
    Nobody
  id: gate-noun-dispatch
  story-version: 0.0.1

create the narrator
  a thing
  states, reversible: listening, finished

create the Pawnshop
  a room

  A narrow pawnshop with a glass counter.

create the brass lamp
  a thing
  in the Pawnshop
  states: shelved, priced

  A dented brass lamp.

create the silver spoon
  a thing
  in the Pawnshop
  states: shelved, priced

  A tarnished silver spoon.

create the glass eye
  a thing
  in the Pawnshop

  A glass eye that stares at nothing.

create the tin cup
  a thing
  in the Pawnshop
  states: dull, shiny

  A dented tin cup.

  on the player polishing
    phrase polished
  end on

create the display case
  a thing, scenery
  in the Pawnshop

  A locked display case.

create Alex
  a person
  playable
  starts in the Pawnshop

  You.

  after appraising
    phrase appraised
  end after

define action appraising
  grammar
    appraise the item
  refuse when the item is a scenery: fixed
  the item must be a treasure: worthless
  refuse when the item is the glass eye: paste
  change the brass lamp to priced when the item is the brass lamp
  select on the item
    when silver spoon
      change the silver spoon to priced
  end select
  refuse when the player holds the item: put-it-down
  phrase appraised
  phrase first-appraisal when the narrator is listening
  change the narrator to finished

  phrases en-US
    fixed:
      That is part of the shop.
    worthless:
      The pawnbroker will not look at it.
    paste:
      The pawnbroker taps it with a fingernail. Paste.
    put-it-down:
      Put it on the counter first.
    appraised:
      The pawnbroker names a price.
    first-appraisal:
      The pawnbroker screws a loupe into one eye.

define action polishing
  grammar
    polish the item
  the item must be the tin cup: cant-polish
  change the tin cup to shiny
  phrase polished
  refuse already-polished

  phrases en-US
    cant-polish:
      That will not take a shine.
    polished:
      You rub until it shines.
    already-polished:
      It shines already.

define action pocketing
  grammar
    take the item
  move the item to the player
  phrase pocketed

  phrases en-US
    pocketed:
      You pocket it.

before the game starts
  change the player to Alex
end before
