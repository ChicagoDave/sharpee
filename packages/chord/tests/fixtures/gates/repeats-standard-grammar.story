story
  title: Gate Repeats Standard Grammar
  authors:
    Nobody
  id: gate-repeats-standard-grammar
  story-version: 0.0.1

define action grabbing
  grammar
    take the thing
  phrase grabbed

  phrases en-US
    grabbed:
      Grabbed.

define action petting
  grammar
    pet or stroke the animal
  phrase petted

  phrases en-US
    petted:
      Petted.

define action snoozing
  grammar
    nap
  phrase snoozed

  phrases en-US
    snoozed:
      Snoozed.

remove from action sleeping
  nap

define action fetching
  grammar
    take me
    fetch the thing
  phrase fetched

  phrases en-US
    fetched:
      Fetched.

extend action taking
  grammar
    take the item
    snag the item

create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before
