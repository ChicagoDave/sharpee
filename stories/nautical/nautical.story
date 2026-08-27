story
  title: Nautical
  authors:
    Sharpee Tests
  id: nautical
  story-version: 0.0.1

## ADR-267 acceptance 8 / ADR-275 D3 fixture: a sailing action with a
## nautical directions block — expansion, per-rule direction defaults, and
## standalone bare-direction commands must hold exactly as for a compass
## block, and the body must observe the direction (word binding, word
## equality). No RNG anywhere.

define action sailing
  grammar
    sail the direction
    the direction
  directions
    port or p
    starboard or sb
    fore
    aft
  refuse without direction: sail-where
  refuse when the direction is aft: no-aft
  phrase sailed

  phrases en-US
    sail-where:
      Sail which way?
    no-aft:
      The boom slams across — never aft, not in this wind.
    sailed:
      You lean on the tiller and the sloop swings {the direction}.

create the Cockpit
  a room

  Teak decking, a worn tiller, and open water on every side.

create the tiller
  scenery
  in the Cockpit

  Worn smooth by three generations of hands.

create Alex
  a person
  playable
  starts in the Cockpit

  Salt-streaked and squinting.

before the game starts
  change the player to Alex
end before
