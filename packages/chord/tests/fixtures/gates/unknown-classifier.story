story
  title: Gate Unknown Classifier
  authors:
    Nobody
  id: gate-unknown-classifier
  story-version: 0.0.1

define trait treasure
  phrases en-US
    gleams:
      It gleams.
end trait

define action appraising
  grammar
    appraise the item
  the item must be a treasur: worthless
  refuse when the item is a scenery: worthless
  refuse when the item is a treasure and the item is a container: worthless
  phrase priceless

  phrases en-US
    worthless:
      Worthless.
    priceless:
      Priceless.

create the Hall
  a room

  A hall.

create the guard
  a person
  in the Hall
  protects a ghost

  A guard.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before
