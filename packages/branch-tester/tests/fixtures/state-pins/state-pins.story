## A dedicated fixture for the tree-document runner's Chord-spelled state
## pins (`the brass bell is ringing`, `the story is alarmed`). Not story content:
## a bell on a two-turn fuse and a story that turns alarmed when it rings.

story
  title: State Pins Fixture
  authors:
    Sharpee
  id: state-pins
  story-version: 0.0.1
  states: calm, alarmed

define timer flicker for the brass bell
  turning
end timer

create the Hall
  a room

  A bare hall with a bell on the wall.

create the brass bell
  a thing, scenery
  aka bell
  states, reversible: still, ringing
  in the Hall

  A brass bell.

  when flicker expires
    change the brass bell to ringing
    change the story to alarmed
    phrase bell-rings
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
  start the brass bell's flicker
end before

define phrase bell-rings
  The bell rings.
end phrase
