story
  title: The Alderman
  authors: David Cornelson
  id: thealderman
  story-version: 0.1.0
  description: Six suspects, one hotel, one dead alderman.

## ADR-310 D18 — the incremental Chord port of stories/thealderman.
## This file grows with the implementation the way Fernhill grew alongside
## Chord: Phase 3 lands the DESCRIPTIVE layer below (translated from
## src/npcs/index.ts, the ConversationBuilder reference implementation);
## Phase 4 adds the normative layer (ADR-318, translated from the docs/
## design.md psychology sections); Phase 6 completes the port (topics,
## response chains, scenes, phrases) and retires the TS builder.
##
## Translation rules (Phase 4 — source: docs/design.md Psychology lines):
## - A secret entrusted by Stephanie -> `confided` on the knows line
##   (John's business arrangement; Catherine's knowledge of Viola, as
##   executor and closest friend) + `never betrays a confidence`.
## - "The family secret eats at her" (Viola) -> `burdened by half-sister`.
## - "Cold, calculating, professional" (John) -> named temperament
##   `professional` (duty over fear and desire).
## - "Fiercely protective" (Catherine) -> inline `duty over fear`;
##   protects Chelsea (maternal + the locket suspicion).
## - "Loud, brash, dominates every room / underneath the bluster,
##   genuinely terrified" (Jack) -> `honor before anyone` + inline
##   `honor over fear` (D7's brazen-it-out shape).
## - "Practiced liar... charm and wit as armor" (Viola) -> inline
##   `desire over fear`.
## - "Omits information out of fear, not malice" + honest (Chelsea) ->
##   `never lies` WITHOUT `answers honestly` (evasion satisfies the
##   principle — exactly ADR-318 D4's distinction).
## - Ross carries no normative line: hot temper and fear rule him — the
##   D2 intensity default IS his characterization.
## - `claims` tags and `witnessed as` aliases wait for Phase 6: claims
##   ride the response-chain phrases (`.lie()` lines) Phase 6 authors,
##   and the randomized-killer structure needs David's call on which
##   assertions are static.
##
## Translation rules (Phase 3):
## - `witnessed: true` knowledge -> `witnessed`; non-witnessed -> `told`
##   (suspicions from the retired believes() map -> `inferred, suspects`).
## - `cognitiveProfile('stable')` -> `clear-headed` (ADR-310 D5 rename).
## - loyalTo -> devoted to; distrusts -> wary of.
## - Non-platform personality/mood words become `define` custom vocabulary
##   (Option 2, David 2026-08-15) rather than being silently re-mapped.
## - `selective` propagation -> listing (D10: listing IS selectivity);
##   `withholds` blacklists restate as whitelists of the remaining topics.
##
## NOT yet expressible in Chord (flagged for Phase 4/6 or ADR follow-up):
## - propagation pace/coloring/withholds words (ADR-310 D10 gave them no
##   surface); goal turn-count waits (`3 turns elapsed` — ADR-316 deferred);
##   opportunistic/prepared pursuit modes, interruptedBy, per-step witnessed
##   phrases; influence schedules, lingering durations, disposition and
##   propagation effects (Jack's hush-money influence is omitted entirely);
##   resist-excepts that are not `from <someone>` (Chelsea's `alone with
##   jack`); mood/threat trigger chains (`.on('player accuses')`) pending
##   Phase 6 event wiring; conversation topics and response chains (Phase 6).

## ---------------------------------------------------------------- vocabulary

define personality defensive
define personality deceptive
define personality charming
define personality bitter
define personality guarded
define personality cold
define personality intelligent
define personality observant
define personality protective
define personality warm
define personality aggressive
define personality dishonest
define personality nervous

define mood composed like calm
define mood concerned like anxious, but stiller
define mood agitated like anxious, but restless
define mood fearful like anxious, but darker

define temperament professional
  duty over fear
  duty over desire
end temperament

## --------------------------------------------------------------------- rooms

create the Foyer
  a room

  The hotel foyer.

create the Bar
  a room

  The hotel bar.

create the Ballroom
  a room

  The ballroom.

create the Restaurant
  a room

  The restaurant.

create the Kitchen
  a room

  The kitchen.

create the Staircase
  a room

  The grand staircase.

create Room Three-Oh-Two
  a room

  A guest room.

create Room Three-Oh-Eight
  a room

  Jack Margolin's suite.

create the player
  in the Foyer

  A house detective with a notebook.

create Stephanie Bordeau
  a person, proper
  starts in Room Three-Oh-Two

  The late owner of the Alderman Hotel.

## ------------------------------------------------------------- Ross Bielack

create Ross Bielack
  a person, proper, very impulsive, defensive, slightly honest
  aka ross, ballplayer
  in the Bar
  mood anxious
  feels devoted to Stephanie Bordeau
  feels dislikes toward Jack Margolin
  feels wary of John Barber
  knows stephanie-death, told, certain
  knows gambling-debts, witnessed, certain
  knows stephanie-lover, witnessed, certain
  knows jack-shady, inferred, suspects
  cognitive-profile clear-headed
  spreads stephanie-death to anyone

  influence intimidation, active, proximity
    makes mood nervous
    makes threat wary
    phrase ross-intimidates on witnessed
    phrase ross-intimidation-resisted on resisted
  end influence

  A broad-shouldered man in his late twenties with calloused hands and an uneasy smile. He smells faintly of whiskey.

## ---------------------------------------------------------- Viola Wainright

create Viola Wainright
  a person, proper, very deceptive, charming, bitter
  aka viola, actress
  in the Ballroom
  mood composed
  feels devoted to Viola Wainright
  feels dislikes toward Stephanie Bordeau
  feels wary of Catherine Shelby
  knows stephanie-death, told, certain
  knows half-sister, witnessed, certain
  knows inheritance-cut-out, witnessed, certain
  knows catherine-knows-secret, inferred, suspects
  cognitive-profile clear-headed
  spreads stephanie-death and hotel-gossip to trusted
  temperament desire over fear
  burdened by half-sister

  A striking woman in her mid-thirties with dark eyes and an actress's poise. Every gesture seems rehearsed.

## -------------------------------------------------------------- John Barber

create John Barber
  a person, proper, very guarded, cold, intelligent
  aka john, enforcer
  in the Bar
  mood calm
  feels wary of the player
  feels dislikes toward Jack Margolin
  feels devoted to Stephanie Bordeau
  knows stephanie-death, told, certain
  knows business-arrangement, witnessed, certain, confided
  knows enforcement-work, witnessed, certain
  cognitive-profile clear-headed
  spreads nothing
  never betrays a confidence
  temperament professional

  goal destroy-evidence, high
    active when it is not calm
    move to Room Three-Oh-Two
    act john-searches-room
  end goal

  influence menace, passive, room
    makes mood nervous
    makes threat wary
    phrase john-menace-noticed on witnessed
  end influence

  A lean man in a perfectly tailored suit. He watches everything with flat, appraising eyes.

## --------------------------------------------------------- Catherine Shelby

create Catherine Shelby
  a person, proper, very observant, honest, protective, warm
  aka catherine, hostess
  in the Restaurant
  mood concerned
  feels devoted to Stephanie Bordeau
  feels likes toward Chelsea Sumner
  feels likes toward the player
  feels wary of Jack Margolin
  feels wary of John Barber
  knows stephanie-death, told, certain
  knows executor-of-will, witnessed, certain
  knows viola-half-sister, witnessed, certain, confided
  knows ross-at-bar, witnessed, certain
  knows jack-debts, told, suspects
  knows chelsea-locket, witnessed, suspects
  knows john-business, told, suspects
  cognitive-profile clear-headed
  spreads stephanie-death and ross-at-bar and jack-debts and chelsea-locket and john-business to anyone
  never betrays a confidence
  protects Chelsea Sumner
  temperament duty over fear

  A handsome woman in her fifties with sharp eyes behind wire-rimmed spectacles. She moves through the restaurant like she owns it.

## ------------------------------------------------------------ Jack Margolin

create Jack Margolin
  a person, proper, very aggressive, dishonest, cowardly
  aka jack, mogul
  starts in Room Three-Oh-Eight
  mood agitated
  feels dislikes toward the player
  feels dislikes toward John Barber
  feels wary of Stephanie Bordeau
  knows stephanie-death, told, certain
  knows property-debt, witnessed, certain
  knows hotel-deed, witnessed, certain
  cognitive-profile clear-headed
  spreads stephanie-death to anyone
  honor before anyone
  temperament honor over fear

  influence bullying, active, targeted
    makes mood nervous
    phrase jack-bullies on witnessed
    phrase jack-bullying-resisted on resisted
  end influence

  A heavyset man with a red face and a diamond stickpin. He fills every room he enters with sheer volume.

## ----------------------------------------------------------- Chelsea Sumner

create Chelsea Sumner
  a person, proper, honest, very nervous, curious
  aka chelsea, cigarette girl
  in the Foyer
  mood fearful
  feels likes toward Catherine Shelby
  feels wary of John Barber
  feels wary of Jack Margolin
  knows stephanie-death, told, certain
  knows locket-photo, witnessed, certain
  knows possible-daughter, told, suspects
  knows catherine-knows-truth, inferred, suspects
  cognitive-profile clear-headed
  spreads stephanie-death to trusted
  never lies

  goal seek-truth, high
    seek Catherine Shelby in the Restaurant
    say chelsea-asks-catherine to Catherine Shelby
  end goal

  resists bullying

  A young woman in her early twenties with auburn hair and anxious green eyes. She carries a tray of cigarettes and matches.

## -------------------------------------------------- phrase keys (Phase 3 stubs)
## Prose is placeholder — David authors the real lines with the Phase 6 port.

define phrase ross-intimidates
  Ross squares his shoulders.
end phrase

define phrase ross-intimidation-resisted
  The look slides right off.
end phrase

define phrase john-searches-room
  Papers rustle somewhere above.
end phrase

define phrase john-menace-noticed
  The room gets quieter around John Barber.
end phrase

define phrase jack-bullies
  Jack leans in, too close.
end phrase

define phrase jack-bullying-resisted
  The bluster breaks like a wave.
end phrase

define phrase chelsea-asks-catherine
  Chelsea leans toward Catherine, voice low.
end phrase
