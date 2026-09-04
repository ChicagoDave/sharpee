story
  title: Bad Action
  authors:
    Nobody
  id: bad-action
  story-version: 0.0.1

define action waving
  grammar
    wave the thing
  refuse without thing no-thing

  phrases en-US
    no-thing:
      Wave what?

create Alex
  a person
  playable

before the game starts
  change the player to Alex
end before
