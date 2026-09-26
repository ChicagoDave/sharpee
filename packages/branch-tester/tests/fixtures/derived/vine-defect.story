## A dedicated fixture for the derived rule-test runner (ADR-356 D3): a
## copy of fernhill's vine example — a trait clause guarded by `must`, a
## three-arm `select on its state`, an `after … , once` award, and a locket
## whose taking removes it and wins — with the `move` line of the flowering
## arm deleted (AC-2's planted defect). Not story content.

story
  title: Derived Vine Defect
  authors:
    Sharpee
  id: derived-vine-defect
  story-version: 0.0.1
  states: calm, alarmed
  use scoring

create the Greenhouse
  a room

  A greenhouse.

create the Shed
  a room

  A shed.

create the vine
  scenery, prunable
  states: seedling, flowering, fruiting
  in the Greenhouse
  score fruited worth 5

  A vine.

  after the player pruning while the vine is fruiting, once
    award fruited
  end after

create the garden shears
  aka shears
  in the Shed

  Shears.

create the silver locket
  aka locket
  in the Shed

  A locket.

  on the player taking
    remove the silver locket
    win locket-found
  end on

create Alex
  a person, proper
  playable
  starts in the Greenhouse

define trait prunable
  on the player pruning
    the player must hold the garden shears: need-shears
    select on its state
      when seedling
        phrase vine-too-young
      when flowering
        change it to fruiting
        phrase vine-fruits
      when fruiting
        phrase vine-done
    end select
  end on
end trait

define action pruning
  grammar
    prune the target
    trim the target
  the target must be reachable
  otherwise refuse cannot-prune

  phrases en-US
    cannot-prune:
      Nothing to prune.

define phrase need-shears
  You need shears.
end phrase
define phrase vine-too-young
  Too young.
end phrase
define phrase vine-fruits
  Fruit!
end phrase
define phrase vine-done
  Done.
end phrase
define phrase locket-found
  The locket is yours.
end phrase

before the game starts
  change the player to Alex
end before
