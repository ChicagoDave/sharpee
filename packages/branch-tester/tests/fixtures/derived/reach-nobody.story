## A dedicated fixture for the derived runner's named gap (GH #549 Phase 2):
## a medal with a showing clause in a story that declares no other person
## and a player who carries nothing — neither the item nor the viewer slot
## can be filled, so the branch is SKIPPED object-unreachable before any
## command is typed. Not story content.

story
  title: Derived Reach Nobody
  authors:
    Sharpee
  id: derived-reach-nobody
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the medal
  a thing
  in the Hall

  A medal.

  on the player showing
    refuse medal-shine
  end on

define phrase medal-shine
  The medal shines.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before
