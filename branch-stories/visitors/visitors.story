## ============================================================
## SKELETON — THIS FILE DOES NOT COMPILE YET, BY DESIGN.
##
## ADR-310 D14: the demonstration story is written FIRST, in Chord
## that does not compile, as the specification for the grammar D2-D13
## describes. Phases 4-8 of docs/work/character-in-chord/plan.md make
## it compile incrementally; Phase 9 is where it must fully play.
##
## Constructs below that do not exist in Chord today:
##   define profile / cognitive-profile        (D4, D5)
##   personality adjectives on the create line (D2)
##   mood / feels / knows                      (D3, D15)
##   goal ... end goal                         (D8)
##   influence ... end influence / resists     (D9)
##   spreads ...                               (D10)
##   define fact ... end fact                  (D16)
##   ResponseAction on the Chord surface       (D17)
##   phrasebook gating on interior state       (D13)
##
## STATUS: cast complete (4 visitors, 6 townspeople, the sheriff).
## Pending: the setting/rooms, the real fact graph, goals (D8),
## influence pairs (D9), and the per-state phrasebooks (D13).
## ============================================================

story
  title: [TBD]
  authors: [TBD]
  id: visitors
  story-version: 0.1.0
  description: [TBD]

## ============================================================
## The visitors' cognitive profile (D4)
##
## Five dimensions, David's ruling 2026-08-11. Named for behavior,
## not diagnosis, per D5. All five stated, so the profile is complete
## at compile time and inherits nothing.
##
## What the sheriff actually sees, dimension by dimension:
##   augmented   - they know things nobody told them (FactSource
##                 'hallucinated'); they answer questions not asked
##   resistant   - corrections do not take; the error comes back later
##   fragmented  - they answer the question from three exchanges ago
##   episodic    - they go absent mid-conversation and return without
##                 noticing the gap. Decay is the runtime's (D6)
##   uncertain   - pronoun trouble; "we" where a person says "I";
##                 their own action credited to whoever is nearby
## ============================================================

define profile manifold
  perception augmented
  belief-formation resistant
  coherence fragmented
  lucidity episodic
  self-model uncertain
end profile

## ============================================================
## The four visitors
##
## They took the top four names from a baby naming book, two from
## each list. Their genders do not align with human physiology and
## this is never explained — so the declared pronoun is a label they
## assumed came with the name. Nothing in the story confirms or
## denies it; the mismatch stays evidence rather than becoming a
## puzzle with an answer (D12).
##
## VOCABULARY GAP (ADR-310 Consequences, confirmed on the first
## character written): the personality list is twelve words and does
## not contain `persistent` or `inquisitive`. `very curious, stubborn`
## is the closest honest rendering of David's "curious, inquisitive,
## and persistent but in an odd way". D5 rules the vocabulary open —
## `defineCustomPersonality` already exists in vocabulary-extension.ts
## and Chord must expose it. Phase 4 should define `persistent`
## properly rather than ship the approximation.
##
## PENDING: what differentiates these four from each other is David's
## to supply. The mood/disposition/truthiness variation below is
## STRUCTURAL PLACEHOLDER — chosen so that each of D17's five stages
## and a spread of dispositions get exercised, not because the
## characters are known to be like this.
## ============================================================

create Liam
  a person, very curious, stubborn
  pronouns he
  cognitive-profile manifold
  mood calm
  feels neutral toward the sheriff

create Noah
  a person, very curious, stubborn, slightly paranoid
  pronouns he
  cognitive-profile manifold
  mood suspicious
  feels wary of the sheriff

create Olivia
  a person, extremely curious, stubborn
  pronouns she
  cognitive-profile manifold
  mood calm
  feels likes the sheriff

create Emma
  a person, very curious, stubborn, cowardly
  pronouns she
  cognitive-profile manifold
  mood nervous
  feels wary of the sheriff

## ============================================================
## The six townspeople
##
## Roles are David's; names delegated. The role decides the
## propagation profile (D10) — that is the whole point of drawing
## the network from a town rather than inventing one:
##
##   hairdresser    - the hub. Everyone sits in her chair and talks.
##   mail carrier   - crosses the whole town daily. Witnesses rather
##                    than converses: sees who is home, what arrives.
##   florist        - funerals and weddings. Knows who is grieving.
##   retired attorney - professionally discreet. Knows and holds.
##   antique dealer - appraises objects; knows what a thing IS, which
##                    matters if the visitors carry anything.
##   teenager       - sees what adults do not, and is not believed.
##
## PENDING: the `spreads` lines below reference `the odd ones`, the
## gossip fact — deliberately NOT the story's real secret. It gives
## the network traffic that is nobody's lie, so the sheriff's job is
## hard for a reason other than people withholding. The real fact
## graph is still David's to supply.
## ============================================================

create Sherri Lenz
  a person, very curious, generous
  pronouns she
  spreads the odd ones chatty to anyone

create Dale Vollmer
  a person, honest, stubborn
  pronouns he
  knows the odd ones, witnessed
  spreads the odd ones to trusted

create Bonnie Ellis
  a person, generous, devout
  pronouns she
  spreads the odd ones to trusted, except Cody Brandt

create Ray Pike
  a person, very honest, cunning
  pronouns he
  spreads nothing

create Walter Nagy
  a person, curious, stubborn
  pronouns he

create Cody Brandt
  a person, very curious, impulsive
  pronouns he
  knows the odd ones, witnessed
  spreads the odd ones chatty to anyone

## ============================================================
## The player
##
## Nosey, intelligent, persistent. Same vocabulary gap as the
## visitors — `nosey` and `persistent` are not in the twelve words;
## `very curious, stubborn` is the closest honest rendering.
##
## No character model on the player (D7 — opt-in). But ADR-146
## influence runs AT the player (`pc-influence.ts`), so resistance
## is declared here: a sheriff being leaned on is the player-side
## half of D9, and it is the reason `resists` is not NPC-only.
## ============================================================

create the player
  the sheriff
  very curious, stubborn
  resists intimidation

## ============================================================
## PENDING — the fact graph (D16).
##
## `define fact` blocks for what actually happened, plus the parallel
## gossip fact ("something is off about the new ones") that spreads
## through the town network with different colorings and is nobody's
## lie. That second layer is what makes the sheriff's job hard for a
## reason other than people withholding.
##
## PENDING — goals (D8), influence/resistance (D9), and one
## phrasebook per psychological state for at least one character
## (D13) — the test of whether "write the voice once per state" is
## the economy D13 claims.
## ============================================================
