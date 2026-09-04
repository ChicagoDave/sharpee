## ===========================================================================
## W-10 DANCE PROTOTYPE — the Chapter 11 ballroom's ENGINE, not its content.
##
## Watch-list W-10 (docs/work/secret-letter-port/watch-list.md) and the change
## document's Chapter 11 gap 6: before the real ballroom is built, write the
## dance's engine as a minimal story with three placeholder partners and TODO
## beats — rotation, turn budget, hand-off, one cross-round memory — and record
## whether it needed anything Chord does not have.
##
## NOTHING HERE IS STORY CONTENT. Every line of prose is a bracketed marker.
## The partners are "the first/second/third partner", not the ball's nobles.
## This directory is a throwaway check beside the port, imported by nothing.
##
## The shape under test (change document, Chapter 11, all David's rulings):
##   * the guests move in circles and the player is passed hand to hand;
##   * one or two turns with each hand — here, two: a timer with one named
##     turn, restarted on every hand-off;
##   * rounds — the circle comes back to the same hands, and what was said
##     on the last pass carries (a thread parked at its cursor, `on resuming`,
##     a topic row keyed to the round);
##   * the music plays until she has had her say with everyone — every
##     partner's thread concluded — then stops.
## ===========================================================================

story
  title: W-10 Dance Prototype
  authors:
    David Cornelson
  id: w10-dance
  ifid: 70B6E3A2-8EBF-4D77-9E17-186BCA655716
  story-version: 0.0.1
  description: A three-hand dance with TODO beats, to test the rotation.
  states: dancing, ended

## The round counter: raised each time the circle comes back to the first hand.

define counter rounds starts 1

## Raised by each partner's conclusion row: three means every hand has had its say.

define counter spoken starts 0

import "dance"

create the Ballroom
  a room

  (W-10 placeholder — the ballroom. The music is playing and the circles are
  turning.)

create Jacqueline
  a person, proper
  playable
  starts in the Ballroom

before the game starts
  change the player to Jacqueline
  start the dance's hand
end before
