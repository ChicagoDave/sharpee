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

create the player

  You.
