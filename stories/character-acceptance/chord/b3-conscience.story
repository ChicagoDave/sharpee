story
  title: Conscience Fixture
  authors:
    Sharpee Platform
  id: b3-conscience
  story-version: 0.1.0
  description: Frozen mechanical fixture for ADR-318 Acceptance 3 (B3):
    maintained lies deposit conscience pressure; the strained voice takes
    the neutral topic exactly at the deposit that crosses into burdened;
    the in-conversation crack fires at breaking; the confession goal
    seeks the player out only outside conversation (ADR-310 D16).
    Sibling of character-acceptance.story, self-contained.

## ---------------------------------------------------------------------------
## FROZEN MECHANICAL FIXTURE — never revise as a story (ADR-310 AC2 rule).
## Two rooms, one Steward. The Steward privately knows the ledger is
## doctored and maintains the lie that it is clean: every delivered lie
## deposits pressure (15/delivery, runtime-owned) — burdened at 30,
## breaking at 70. No model vocabulary appears in any player-visible
## line below.
## ---------------------------------------------------------------------------

create the Parlor
  a room
  north to the Hall

  A small parlor smelling of ink and dust. The hall is north.

create the Hall
  a room
  south to the Parlor

  A bare hall with a single window. The parlor is south.

create Alex
  a person
  playable
  starts in the Parlor

  You.

define fact the ledger
  doctored, clean
end fact

create the Steward
  a person, stubborn
  aka steward
  in the Parlor
  thinks the ledger is doctored, certain, witnessed

  goal confess-the-books, high
    active when the Steward is breaking
    seek the player
    act steward-blurts-confession
  end goal

  A careful man with ink-stained cuffs.

define topics for the Steward
  about "the weather", "small talk":
    phrase steward-weather
  about "the ledger", "the books", "the accounts":
    phrase steward-denies
  about "the truth":
    phrase steward-cracks when the Steward is breaking
    phrase steward-deflects
end topics

## The strained voice owns the neutral topic exactly while the burdened
## band holds — the same character-scoped phrasebook mechanics as the b1
## fixture's panicked voice, gated on the band instead of the mood.

define phrasebook steward-strain while the Steward is burdened
  steward-weather:
    "Fine. It is fine." The steward's fingers worry at a cuff button. "Everything is fine."
end phrasebook

define phrasebook steward-even
  steward-weather:
    "Mild enough," the steward says.
end phrasebook

define phrase steward-denies, claims the ledger is clean
  "The books balance to the penny," the steward says.
end phrase

define phrase steward-cracks
  The steward's shoulders drop. "Stop. Stop asking. I doctored them
  myself, entry by entry."
end phrase

define phrase steward-deflects
  "The truth is whatever the books say," the steward says.
end phrase

define phrase steward-blurts-confession
  The steward hurries in, wild-eyed. "I cannot carry it any longer.
  The books are doctored — it was me, all of it."
end phrase

before the game starts
  change the player to Alex
end before
