## Chapter 34, a thing adrift. It needs an expanse with a drift line and the
## header line that admits the chapter's words, so this harness is a whole
## story.

story
  title: Snippet
  authors:
    The Chord Manual
  id: snippet
  story-version: 0.0.1
  use expanses

create the Shore, a room

  A shore.

create the Lake
  an expanse
  size: 8 by 6
  drift: 1 unit every 2 turns

  A lake.

create Ansel, a person
  playable
  starts in the Shore

  You.

<<fence>>

before the game starts
  change the player to Ansel
end before
