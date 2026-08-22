## Jack Toresal and The Secret Letter — Chord port
##
## Chapter 1: the Prologue and Grubber's Market, as one extent.
##
## AUTHORITY. Every line of prose in this file and in the files it imports is
## either Michael Gentry's 2009 text carried over, or a marked placeholder for
## a line David has still to write. Nothing here is drafted by an assistant.
## Where the change document calls for new prose, this file carries a
## `## DAVID:` marker and a phrase whose body says so, so the gap is loud at
## run time instead of quiet.
##
## WHERE THIS FILE DEVIATES FROM GENTRY'S WORDS — the complete list, so the
## authority question never has to be re-audited:
##
##   1. The nine stall lines in `peering.chord` drop the source's trailing
##      "to the [quick best route]" clause. Chord cannot interpolate the
##      direction back as a compass word, so the route cannot be filled; see
##      the ruling flagged in that file. The three variants of each line are
##      otherwise verbatim.
##   2. `distant-silk-tent-outside` reads "…is that way" where the source reads
##      "…is [quick best route] from here". The two words "that way" are the
##      substitution.
##   3. `distant-silk-tent-inside` drops the source's closing "You can enter to
##      the [north/south]", route-dependent in the same way. What remains is
##      verbatim.
##   4. Teisha's five repeat prefixes are Gentry's five, but fixed one per quip
##      instead of drawn at random, because Chord does not interpolate a phrase
##      inside another phrase's body (GH #286).
##   5. `st-patience-third` in `stallkeepers.chord` expands Gentry's `[one of]
##      beat it[or]scram[or]get out of here[at random]` into three whole-phrase
##      variants, because Chord randomises phrase arms rather than words inside
##      one. Same three words, same odds. (Two quips are also FOLDED in that
##      file — `ST2`+`ST5` and `ST4`+`ST5` become one phrase each — but the
##      source always plays them in that order, so no word changes.)
##
## Everything else is carried verbatim from the 2009 source or is a marked
## `(PLACEHOLDER — David's line …)`.
##
## What the port is checked against:
##   docs/references/textfyre/secretletter/           the 2009 I7 source and design archive
##   docs/references/textfyre/secretletter/INVENTORY.md   84 rooms, 47 NPCs, 23 quip trees
##   docs/work/secret-letter-port/change-document.md  Chapter 1's decisions (the content authority)
##   docs/work/secret-letter-port/vision.md           the whole-remake premises
##   docs/work/secret-letter-port/plan.md             the eleven-phase plan
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
  story-version: 0.1.0
  description: Grubber's Market, a stolen apple, and a girl the whole city is about to start looking for.
  states: calm, chase

## ---------------------------------------------------------------------------
## THE IMPORTS
##
## One place, one file. Grubber's Market arrives whole — rooms, stalls, the
## apple, the stallkeepers — because none of those is meaningful without the
## others. Major NPCs are cut out of the place and imported on their own, since
## their trees outlive the room they stand in.
##
## Imports nest (ADR-251 D5 as amended 2026-08-22): a place imports the people
## who stand in it, so `grubbers-market` pulls in `npc-teisha` itself and this
## file lists only the places and mechanism layers.
##
## ORDER IS SEMANTIC. An import is a paste at its own line (ADR-251 D4), pasted
## depth-first, so the sequence below is arbitration order: the mechanism layer
## first, then the place (with its people). Reordering these lines changes
## behaviour.
## ---------------------------------------------------------------------------

## The P-8 "seen from elsewhere" layer: the peering action and its phrases.

import "peering"

## Grubber's Market, atomic: seventeen rooms, the stalls, the apple and the
## alley that ends the walk, the ten stallkeepers sharing the `ST` tree, and
## Teisha, imported from inside the market (`npc-teisha`).

import "grubbers-market"

## ---------------------------------------------------------------------------
## THE PLAYER
##
## Jack begins the walk in the market rather than holding the apple in the alley
## (change document, "The opening"): the 2009 game opened with a ~350-word
## narrated block (`story.ni:1469`) and started Jack already holding the apple
## (`story.ni:2415`). Both are gone. She walks in from the north road, at the
## junction the alley also opens onto.
##
## STRUCTURAL CHOICE, not a content one: the change document fixes that the walk
## is played and that the apple ends it, but not which square it starts on. The
## junction is the market's own entrance and the alley's doorstep, so the walk
## can end where the source's narration ended.
## ---------------------------------------------------------------------------

create the player
  starts in the Northwest Junction
  wears the old gray cloak

  Jack Toresal, who has been a boy in this market for as long as anyone here has
  bothered to look.

create the old gray cloak
  aka gray cloak, grey cloak, cloak, old cloak
  wearable

  Your cloak is made of undyed wool, stained and patched in several places. You
  wear it in the masculine style, fastened on the side and thrown back over your
  right shoulder.

