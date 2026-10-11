## A dedicated fixture for the occurrence ordinals arrange shape: a rule's
## later firings. Three clause families carry `first time` ... `third time`
## bodies. The voices' every-turn clause is the Secret Letter shape (the
## rooftop eavesdrop): the runner arranges the clause's counter at N-1 on a
## fresh world and types one turn, so the Nth body runs without the earlier
## bodies ever having run — the voices are still onstage when the third
## body sends them off. The voices' examining clause is the same shape on
## a verb interceptor. The Lane's entering clause has an ordinal body too,
## but a room's `entering` fires on movement, not a typed verb, so both its
## leaves stay SKIPPED on that shape whatever the counter says. Not story
## content.

story
  title: Derived Occurrence Ordinals
  authors:
    Sharpee
  id: derived-occurrence-ordinals
  story-version: 0.0.1

create the Roof
  a room
  south to the Lane

  The roof.

create the Lane
  a room

  The lane.

  after the player entering
    first time
      phrase arrived
    second time
      phrase returned
  end after

create the voices
  a thing, scenery
  in the Roof

  Voices from below.

  on every turn
    first time
      phrase heard-one
    second time
      phrase heard-two
    third time
      phrase heard-three
      move the voices offstage
  end on

  on the player examining
    first time
      phrase looked-once
    second time
      phrase looked-twice
  end on

define phrase heard-one
  Someone below says one thing.
end phrase
define phrase heard-two
  Someone below says a second thing.
end phrase
define phrase heard-three
  Someone below says a third thing, and the voices fade.
end phrase
define phrase looked-once
  You cannot see them, only hear them.
end phrase
define phrase looked-twice
  Still only voices.
end phrase
define phrase arrived
  You step into the lane.
end phrase
define phrase returned
  The lane again.
end phrase

create Alex
  a person, proper
  playable
  starts in the Roof

before the game starts
  change the player to Alex
end before
