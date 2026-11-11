story
  title: Owner Dispatch
  authors:
    Nobody
  id: owner-dispatch
  story-version: 0.0.1

define trait treasure
end trait

define trait polishable
end trait

define trait counterfeit
  phrases en-US
    paste:
      The pawnbroker taps it with a fingernail. Paste.

  on the player appraising
    refuse paste
  end on
end trait

create the Pawnshop
  a room

  A narrow pawnshop with a glass counter.

create the pawnbroker
  a person
  in the Pawnshop
  states: watchful, chatty

  A pawnbroker with a jeweller's loupe on a string.

create the brass lamp
  a thing
  treasure
  in the Pawnshop
  states: shelved, priced

  A dented brass lamp.

  after the player appraising
    change the brass lamp to priced
  end after

create the silver spoon
  a thing
  treasure
  in the Pawnshop
  states: shelved, priced

  A tarnished silver spoon.

  after the player appraising
    change the silver spoon to priced
  end after

create the glass eye
  a thing
  treasure, counterfeit
  in the Pawnshop

  A glass eye that stares at nothing.

create the tin cup
  a thing
  polishable
  in the Pawnshop
  states: dull, shiny

  A dented tin cup.

  after the player polishing
    change the tin cup to shiny
  end after

create the display case
  a thing, scenery
  in the Pawnshop

  A locked display case.

create Alex
  a person
  playable
  starts in the Pawnshop

  You.

define action appraising
  grammar
    appraise the item
  refuse when the item is scenery: fixed
  the item must be a treasure: worthless
  refuse when the player holds the item: put-it-down
  phrase appraised
  phrase first-appraisal when the pawnbroker is watchful
  change the pawnbroker to chatty

  phrases en-US
    fixed:
      That is part of the shop.
    worthless:
      The pawnbroker will not look at it.
    put-it-down:
      Put it on the counter first.
    appraised:
      The pawnbroker names a price.
    first-appraisal:
      The pawnbroker screws a loupe into one eye.

define action polishing
  grammar
    polish the item
  the item must be a polishable: cant-polish
  phrase polished

  phrases en-US
    cant-polish:
      That will not take a shine.
    polished:
      You rub until it shines.

before the game starts
  change the player to Alex
end before
