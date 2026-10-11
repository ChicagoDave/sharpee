## A dedicated fixture for GH #549 Phase 4: `after` clauses behind their
## `on` clause's refusals. The banana's `on taking` refuses while the story
## is calm — a three-valued state the floor cannot negate, so the `after`
## is SKIPPED negation (not arranged INTO the refusal, as it once was). The
## crate's `on opening` refuses while locked — a flag, so the `after` writes
## `unlocked` and runs. The lamp's `on examining` refuses while dark — a
## two-valued declared state, so the `after` writes `bright` and runs
## (`dark` and `lit` are reserved for the platform's own light, so the
## states are `dim` and `bright`). The
## relic's `on taking` refuses unconditionally, so its `after` can never
## fire: SKIPPED intercepted. Not story content.

story
  title: Derived Intercepting
  authors:
    Sharpee
  id: derived-intercepting
  story-version: 0.0.1
  states: calm, hunted, chase

create the Hall
  a room

  A hall.

create the banana
  a thing
  in the Hall
  states: shelved, nicked

  A banana.

  on the player taking while the banana is shelved
    refuse when calm: banana-blocked
    phrase banana-lifted
  end on

  after the player taking while the banana is shelved
    change the banana to nicked
  end after

create the crate
  a container, openable, lockable with the brass key, starts locked
  in the Hall
  states: sealed, breached

  A crate.

  on the player opening
    refuse when the crate is locked: crate-stuck
  end on

  after the player opening
    change the crate to breached
  end after

create the brass key
  a thing
  in the Hall

  A key.

create the lamp
  a thing
  in the Hall
  states, reversible: dim, bright

  A lamp.

  on the player examining
    refuse when the lamp is dim: too-dark
  end on

  after the player examining
    change the lamp to dim
  end after

create the relic
  a thing
  in the Hall
  states: resting, taken

  A relic.

  on the player taking
    refuse relic-cursed
  end on

  after the player taking
    change the relic to taken
  end after

define phrase banana-blocked
  Too close to the keeper.
end phrase
define phrase banana-lifted
  Palmed.
end phrase
define phrase crate-stuck
  The crate is locked.
end phrase
define phrase too-dark
  Too dark to see it.
end phrase
define phrase relic-cursed
  The relic burns.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before
