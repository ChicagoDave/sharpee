story
  title: Treasure Hunt
  authors:
    Sharpee Platform
  id: trait-classification
  story-version: 0.0.1

define condition loose-treasure: it is a treasure and it is not in the vault
define condition plain-thing: it is a thing and it is not a treasure and it is in the hall

define trait treasure
  phrases en-US
    already-safe:
      That is already in the vault.
    polished:
      It shines.

  on the player polishing
    it must be any loose-treasure: already-safe
    phrase polished
  end on
end trait

define trait cursed
  on every turn
    phrase whisper when one chance in 1000
  end on

  phrases en-US
    whisper:
      Something whispers.
end trait

define trait sweepable
  phrases en-US
    swept:
      Swept clean.

  on the player sweeping
    each loose-treasure
      move the match to the vault
    end each
    phrase swept
  end on
end trait

define action appraising
  grammar
    appraise the item
  the item must be a treasure: worthless
  phrase priceless

  phrases en-US
    worthless:
      Worthless.
    priceless:
      Priceless.

define action sweeping
  grammar
    sweep the place
  refuse when no loose-treasure: nothing-loose

  phrases en-US
    nothing-loose:
      Every treasure is already in the vault.

define action polishing
  grammar
    polish the item

create the hall
  a room
  sweepable

  A long hall.

create the vault
  a room

  A vault.

create Alex
  a person
  playable
  in the hall

  You.

create the gold coin
  a thing
  treasure
  in the hall

  A gold coin.

create the clay pot
  a thing
  in the hall

  A clay pot.

create the jewel box
  a container
  treasure
  in the hall

  A jewel box.

create the idol
  a thing
  treasure
  cursed while the idol is in the vault
  in the hall

  An idol.

before the game starts
  change the player to Alex
end before
