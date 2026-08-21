## Jack Toresal and The Secret Letter — Chord port
##
## SCAFFOLD ONLY. This file holds the story's structure and metadata and no
## chapter content. Chapter 1 lands here at plan Phase 5, and not before: the
## port's content authority is David's change document (P-4 in
## docs/proposals/secret-letter-port.md), and a chapter that document does not
## cover is not ported.
##
## What the port is checked against:
##   docs/references/textfyre/secretletter/           the 2009 I7 source and design archive
##   docs/references/textfyre/secretletter/INVENTORY.md   84 rooms, 47 NPCs, 23 quip trees, the chapter spine
##   docs/work/secret-letter-port/plan.md             the eight-phase plan
##
## This is a RETARGET, not a faithful port. The original's non-IF middle-school
## audience constraint is gone, so the 2009 game is the reference, not the spec.

story
  title: Jack Toresal and The Secret Letter
  authors:
    David Cornelson
    Michael Gentry
  id: secret-letter
  ifid: B4647034-34D8-40E3-B2F3-B590573387CB
  story-version: 0.0.1
  description: Scaffold — the Chord port of the 2009 Textfyre game. No chapter content yet.

## ---------------------------------------------------------------------------
## Placeholder world
##
## One room so the story loads, plays, and can carry a boot test. It is NOT the
## game's opening — Book 1 opens in The Alley, off Grubber's Market. Phase 5
## replaces everything below this line.
## ---------------------------------------------------------------------------

create the Staging Room
  a room

  Nothing has been built here yet. The Chord port of Jack Toresal and The Secret
  Letter is scaffolded but empty: its eighty-four rooms, forty-seven characters
  and twenty-three conversations are measured and waiting, and Chapter 1 begins
  once the change document opens the gate.

create the player
  starts in the Staging Room

  You.
