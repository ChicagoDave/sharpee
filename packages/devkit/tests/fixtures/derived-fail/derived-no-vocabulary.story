## A dedicated project fixture for `sharpee test`'s derived tier (ADR-356
## D5a): a derived parse failure — exit 1. Copied from branch-tester's
## AC-7 fixture: a clause on an action the language has no vocabulary for. Not
## story content.

story
  title: Derived No Vocabulary
  authors:
    Sharpee
  id: derived-no-vocabulary
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the mat
  in the Hall

  A mat.

  on the player entering_room
    phrase mat-seen
  end on

create Alex
  a person, proper
  playable
  starts in the Hall

define phrase mat-seen
  Mat seen.
end phrase

before the game starts
  change the player to Alex
end before
