story
  title: Trait Classification Test
  authors:
    Sharpee Team
  id: trait-classification-test
  story-version: 0.0.1
  description: A platform test story. Some things in the gallery are treasure and one is not. Appraising asks whether a thing is treasure, rattling the magic sack draws every loose treasure into it and leaves the rest, and tapping a thing tells whether it is fixed in place.
  ifid: E65CA728-9737-4747-A9E7-4E1AF9D5C471

define condition loose-treasure: it is a treasure and it is not in the magic sack

define trait treasure
  phrases en-US
    gleams:
      It gleams.
end trait

define trait gathering
  phrases en-US
    gathered:
      The sack shivers, and every loose treasure in sight flies into it.

  on the player rattling
    each loose-treasure
      move the match to the magic sack
    end each
    phrase gathered
  end on
end trait

define action appraising
  grammar
    appraise the item
  the item must be a treasure: worthless
  phrase priceless

  phrases en-US
    worthless:
      Worthless, I'm afraid.
    priceless:
      Priceless!

define action tapping
  grammar
    tap the item
  phrase solid when the item is scenery
  phrase hollow when the item is not scenery

  phrases en-US
    solid:
      It doesn't budge. It is part of the gallery.
    hollow:
      It rings hollow.

define action rattling
  grammar
    rattle the item
  refuse when no loose-treasure: nothing-loose

  phrases en-US
    nothing-loose:
      The sack stays still. Nothing loose is treasure any more.

create the Gallery
  a room

  A long gallery of odds and ends.

create Alex
  a person
  playable
  starts in the Gallery

  You.

create the magic sack
  a container
  gathering
  in the Gallery

  A sack with a will of its own.

create the gold coin
  a thing
  treasure
  in the Gallery

  A gold coin.

create the clay pot
  a thing
  in the Gallery

  A clay pot.

create the jewel box
  a container
  treasure
  in the Gallery

  A jewel box.

create the marble plinth
  a thing, scenery
  in the Gallery

  A marble plinth, set into the floor.

before the game starts
  change the player to Alex
end before
