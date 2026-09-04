## A dedicated fixture for the tree-document runner's Chord-spelled state
## pins (`the brass lamp is lit`, `the story is alarmed`). Not story content:
## a lamp on a two-turn fuse and a story that turns alarmed when it lights.

story
  title: State Pins Fixture
  authors:
    Sharpee
  id: state-pins
  story-version: 0.0.1
  states: calm, alarmed

define timer flicker for the brass lamp
  turning
end timer

create the Hall
  a room

  A bare hall with a lamp on the wall.

create the brass lamp
  scenery
  aka lamp
  states, reversible: dark, lit
  in the Hall

  A brass lamp.

  when flicker expires
    change the brass lamp to lit
    change the story to alarmed
    phrase lit-up
  end when

create the first partner
  a person
  states, reversible: waiting, dancing
  in the Hall

  Someone waiting.

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
  start the brass lamp's flicker
end before

define phrase lit-up
  The lamp flares.
end phrase
