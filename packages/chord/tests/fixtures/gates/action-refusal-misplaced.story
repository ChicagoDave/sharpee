story
  title: Gate Action Refusal Placement
  authors:
    Nobody
  id: gate-action-refusal-placement
  story-version: 0.0.1

define action valuing
  grammar
    value the item
  refuse without item: what
  refuse when the player holds the item: held
  phrase valued
  refuse when the item is in the Hall: here
  the item must be in the Hall: elsewhere
  otherwise refuse cant
  refuse nope

  phrases en-US
    what:
      What?
    held:
      Put it down first.
    here:
      Not here.
    elsewhere:
      Not there.
    cant:
      You can't.
    nope:
      No.
    valued:
      Yes.

create the Hall
  a room

  A hall.

create the sword
  a thing
  in the Hall

  A sword.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before
