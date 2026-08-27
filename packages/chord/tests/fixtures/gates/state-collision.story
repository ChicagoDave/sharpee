story
  title: Gate: state collision
  authors:
    Nobody
  id: gate-state-collision
  story-version: 0.0.1

define trait feedable
  states, reversible: hungry, content
end trait

define trait moody
  states, reversible: content, grumpy
end trait

create the llama
  scenery
  feedable
  moody

create Alex
  a person
  playable

  You.

before the game starts
  change the player to Alex
end before
