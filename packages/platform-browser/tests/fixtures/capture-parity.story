## Capture-parity fixture — ADR-282 Acceptance 5.
##
## Every response this story can produce is shaped to stress an axis where
## a DOM-read capture and the headless channel flattening are known to
## disagree, so `capture-parity.test.ts` compares two REAL runs of it:
##
##  - the room description is TWO paragraphs — the exact axis the
##    2026-07-28 bug fell on (the bridge joined with '\n', the harness with
##    '\n\n', and `normalizeOutput` preserves blank lines, so every blessed
##    multi-paragraph assertion failed on its first headless run);
##  - `read notice` answers with bracket-shaped lines standing alone as
##    their own paragraphs (what ADR-287's fences exist for) and a line
##    carrying `"` quotes (what fails the parser's inline-payload rule);
##  - `read notice` also emits an implicit-take report BEFORE the notice
##    text, so the compared response spans several packets in one turn,
##    not one.
##
## A Chord `.story` rather than a compiled story package on purpose: the
## headless side runs the shipped CLI against this exact file with no build
## step, and the browser side compiles the exact same bytes the way
## devkit's `chord-browser-entry.ts.template` does at boot.

story "Capture Parity" by "Sharpee Tests"
  id: capture-parity
  version: 1.0.0

create the Proving Room
  a room
  aka room

  A bare room with a lectern in the middle of it. The plaster is the
  colour of a rained-on envelope.

  Someone has chalked a line across the floor and stopped.

create the player
  starts in the Proving Room

  You.

create the lectern
  a supporter
  scenery
  in the Proving Room

  An oak lectern, scarred where a hundred readers rested a thumb.

create the notice
  aka card
  readable
  on the lectern

  A stiff card, printed on one side.

  on reading it
    phrase notice-text
      [posted by order of the proving board]

      She said "take it" and would not look at you.

      [the lamp gutters]
  end on
