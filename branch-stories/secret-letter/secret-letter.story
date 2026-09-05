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
##   6. `alley-still-talking` in `eavesdrop.chord` expands Gentry's nested
##      `[one of]` word alternations (men/voices; still talking/continue
##      talking/continue their conversation; outside/just outside/at the
##      entrance to) into four whole-sentence variants, one draw per shape,
##      for the same reason as 5. Every word in each variant is his.
##   7. `jar-keeps-weed` in `wares.chord` reads "You can't put that in the
##      jar" where the source reads "You can't put [the noun] in the jar" —
##      a container's clause cannot name the item being inserted, so "that"
##      is the substitution.
##   8. `fruit-theft-again` in `grubbers-market.chord` reads "picking up
##      another piece of fruit" where the source reads "picking up another
##      [noun]" — a marker cannot render a bare name (`{item}` is rejected
##      as unbound; the binder's hints are all articles), so "piece of
##      fruit" is the substitution.
##
## Everything else is carried verbatim from the 2009 source or is a marked
## `(TODO during play-testing — …)`.
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
  states: calm, hunted, chase
  use chapters

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

## THE CHAPTERS (ADR-330, David 2026-08-29: "Chapter I - Grubber's Market begins
## when the game starts. Chapter II - Commerce Street begins when the player
## visits Commerce Street for the first time."). Titles are his words verbatim;
## each row may carry an indented description paragraph — a line for the
## title card's second line — which is his to add. A chapter ends when the
## next begins; the client is told on the `story.chapter` channel.

define chapters
  market - Chapter I - Grubber's Market
    begins when the game starts
  commerce - Chapter II - Commerce Street
    begins when the player visits Commerce Street for the first time
end chapters

## The P-8 "seen from elsewhere" layer: the peering action and its phrases.

import "peering"

## Grubber's Market, atomic: seventeen rooms, the stalls, the apple and the
## alley that ends the walk, the ten stallkeepers sharing the `ST` tree, and
## Teisha, imported from inside the market (`npc-teisha`).

import "grubbers-market"

## Chapter 2 — Commerce Street (Book 3) and Lord's Market (Book 4): the rooms,
## scenery and refusals, the Fossville collision, the Back Alley the chapter
## ends in. Keepers and their conversation stubs follow.

import "commerce-street"
import "lords-market"

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

## The look is a state (`disguise.chord`): `urchin` is the opening dress,
## `dressed` the escape disguise, `identified` the disguise after the boots
## give her away. Her own description follows it — the detail line is
## David's. The sweep reads her in every state except `dressed` (change
## document, "The recognition rule, sharpened"), so the disguise window is
## the one time a move does not restart the arrival clock.

create Jack
  a person, proper
  playable
  starts in the Northwest Junction
  kick-yourself
  states, reversible: urchin, dressed, identified
  wears the old gray cloak
  wears the woolen cap
  wears the boots
  carries the cloth satchel

  Jack Toresal, who has been a boy in this market for as long as anyone here has
  bothered to look.

  phrase detail while Jack is dressed:
    (TODO during play-testing — Jack in the dress and the fashionable hat,
    boots underneath.)

  on going while the wandering mercenaries is aggressive
    refuse merc-held
  end on

  after going
    restart the player's waiting when (hunted and Jack is not dressed) or (chase and Jack is identified)
    phrase escape-sprint when the player's market-escape has started
  end after

create the old gray cloak
  aka gray cloak, grey cloak, cloak, old cloak
  wearable

  Your cloak is made of undyed wool, stained and patched in several places. You
  wear it in the masculine style, fastened on the side and thrown back over your
  right shoulder.

  on the player taking_off
    refuse clothing-stays
  end on

  on the player taking while the player has the old gray cloak
    refuse clothing-stays
  end on

## The take-refusal is gated on `has`, not `wears`: after the slide's
## authorial `move` puts the cloak on the ground, `the player wears the old
## gray cloak` STILL holds — the wearable's worn flag survives the move (GH
## #334) — while `has` reads its location. The source retrieves the cloak
## after a landing (`story.ni:4270`), so it must be takeable there.

## The urchin's other garment (`story.ni:1393`), worn from the first turn — the
## change document's escape-disguise ruling brought it back: the parchment's
## "hat and a gray cloak" must describe what the player actually wears.
##
## Clothing is the look, not objects (change document, 2026-08-24): no garment
## is directly removable — outfit-level actions (CHANGE OUTFIT, SWITCH HATS,
## WEAR DRESS, arriving with the escape build) are what change Jack's look.
## The `clothing-stays` refusal below carries that on cap, cloak, and boots;
## the source's wear/take-off lines (`story.ni:1402`/`:1414`) are kept aside
## as candidate SWITCH HATS texture, no longer wired to direct actions.

create the woolen cap
  aka cap, hat, woolen hat, wool cap
  wearable

  Your woolen cap is patchy and stained, like the rest of you. You usually
  keep your hair stuffed up under it.

  on the player taking_off
    refuse clothing-stays
  end on

  on the player taking
    refuse clothing-stays
  end on

## Kept aside for SWITCH HATS (`story.ni:1402`/`:1414`, Gentry's) — not wired:
##   "You pull the cap down over your head and stuff your hair up into it."
##   "You take the cap off and shake your hair out."

## The one refusal for fiddling with any worn garment directly — David's line
## (2026-08-24); the outfit changes only through its own actions.

define phrase clothing-stays
  You're always fiddling with your clothes, but outfit changes are rare.
end phrase

define phrase kick-self
  Not so hard really, was it?
end phrase

## The boots (change document, escape-disguise: "the boots as a worn object on
## the player from the start") — the remake's addition, no source text exists
## (the 2009 game has no footwear object). They are the detail the parchment
## never mentioned: an urchin's boots under a lady's dress, the thread the
## mercenaries pick up at the Fruit Stall and Dame Sandler later closes.

create the boots
  aka boot, urchin's boots, worn boots
  wearable, plural

  Leather, floppy, from a pile in Maiden House.

  on the player taking_off
    refuse clothing-stays
  end on

  on the player taking
    refuse clothing-stays
  end on

## The trusty satchel (`story.ni:1367-1389`) — the holdall the escape's dress
## and hat ride in. Deliberately a plain open container: the source's
## openable-with-auto-open conveniences amount to never being in the way, so
## the port skips the lid outright. The source's "You stuff [the noun] into
## your satchel." insert-line is held — no known marker surface names the
## inserted item from an entity clause phrase.

create the cloth satchel
  aka satchel, bag, sack, purse
  a container

  Your trusty cloth satchel: big enough to hold the things you nick, small
  enough to not hamper your getaway.

before the game starts
  change the player to Jack
end before
