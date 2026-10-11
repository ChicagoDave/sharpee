## A dedicated fixture for the derived runner's reach of every noun a
## command names (GH #549 Phase 2): a clerk who carries an apron and dough
## (wearing needs the apron held; touching needs the dough in the room), two
## clauses on the clerk as the viewer and recipient (the item slot is
## unnamed — the coin the player carries fills it for showing; for giving
## the coin has a clause of its own, so the button fills it), a locket whose viewer is
## unnamed with the clerk already present, a medal in a room with nobody in
## it (the first declared person is brought in), a guard in the Pantry
## receiving the coin, a plank whose inserting clause needs a container the
## clause never names (the closed crate in the Hall fills the `in` slot and
## is opened for it), and a
## ghost in no room at all (SKIPPED subject-offstage, as before). Not story
## content.

story
  title: Derived Reach Nouns
  authors:
    Sharpee
  id: derived-reach-nouns
  story-version: 0.0.1

create the Hall
  a room
  north to the Pantry
  east to the Attic

  A hall.

create the Pantry
  a room

  A pantry.

create the Attic
  a room

  An attic.

create the clerk
  a person
  in the Hall
  carries the apron
  carries the dough

  A clerk.

  on the player showing
    refuse clerk-shrug
  end on

  on the player giving
    refuse clerk-shrug
  end on

create the apron
  a thing, wearable

  An apron.

  on the player wearing
    refuse apron-no
  end on

create the dough
  a thing

  Dough.

  on the player touching
    refuse dough-no
  end on

create the locket
  a thing
  in the Hall

  A locket.

  on the player showing
    refuse locket-glint
  end on

create the medal
  a thing
  in the Attic

  A medal.

  on the player showing
    refuse medal-shine
  end on

create the guard
  a person
  in the Pantry

  A guard.

  on the player giving
    refuse guard-no
  end on

create the ghost
  a person

  A ghost.

  on the player showing
    refuse ghost-fade
  end on

create the coin
  a thing

  A coin.

  on the player giving
    refuse coin-keep
  end on

create the button
  a thing

  A button.

create the crate
  a container, openable
  in the Hall

  A crate.

create the plank
  a thing
  in the Hall

  A plank.

  on the player inserting
    refuse plank-no
  end on

define phrase clerk-shrug
  The clerk shrugs.
end phrase
define phrase apron-no
  Not that apron.
end phrase
define phrase dough-no
  Keep off the dough.
end phrase
define phrase locket-glint
  The locket glints.
end phrase
define phrase medal-shine
  The medal shines.
end phrase
define phrase guard-no
  The guard declines.
end phrase
define phrase ghost-fade
  The ghost fades.
end phrase
define phrase plank-no
  The plank will not fit.
end phrase
define phrase coin-keep
  You keep the coin.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall
  carries the coin
  carries the button

before the game starts
  change the player to Alex
end before
