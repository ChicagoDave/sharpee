## A dedicated fixture for the derived runner's condition compositions: a
## named open condition read with `it` bound to the subject, a named closed
## condition that is an `or`, an `and` that must fail (proved by whichever
## operand already fails, never by a chosen witness), an `or` that must hold
## (the leftmost mappable operand is the witness — here the second, since
## `chance` maps to nothing), a guard pair whose preconditions contradict
## (proves checks run after every write), and an `and` whose every operand
## already holds (SKIPPED as a negation, naming the `and`), and a guard on
## a thing being `here` whose subject stands in another room than the
## player (proves `here` is arranged after the player is placed). Not story
## content: the lamp's second guard is unreachable on purpose.

story
  title: Derived Compose
  authors:
    Sharpee
  id: derived-compose
  story-version: 0.0.1

create the Hall
  a room
  east to the Yard

  A hall.

create the Yard
  a room

  A yard.

create the lamp
  a thing, switchable
  in the Hall
  states: cold, warm

  A lamp.

  on the player switching_on
    refuse when the bell is rung: lamp-bell-first
    refuse when the bell is rung and the lamp is cold: lamp-contradiction
    refuse when one chance in 2 or the bell is still: lamp-flickers
    change the lamp to warm
  end on

create the bell
  a thing, ringable
  in the Hall
  states: still, rung

  A bell.

  on the player examining
    refuse when the bell is still and the lamp is cold: too-dark
    change the bell to rung
  end on

define trait ringable
  on the player ringing
    refuse when in-the-yard: bell-outside
    refuse when the lamp is warm and the bell is rung: ring-done
    refuse when lit-or-rung: ring-quiet
    change it to rung
    phrase bell-rings
  end on
end trait

create the gong
  a thing
  in the Yard

  A gong.

  on the player examining
    refuse when the cat is here: cat-startled
    phrase gong-shines
  end on

create the cat
  a thing
  in the Hall

  A cat.

define condition in-the-yard: it is in the Yard
define condition lit-or-rung: the lamp is warm or the bell is rung

create Alex
  a person, proper
  playable
  starts in the Hall

define action ringing
  grammar
    ring the target
  the target must be reachable
  otherwise refuse cannot-ring

  phrases en-US
    cannot-ring:
      No.

define phrase lamp-bell-first
  The bell first.
end phrase
define phrase lamp-contradiction
  Never.
end phrase
define phrase lamp-flickers
  It flickers.
end phrase
define phrase bell-outside
  The bell is outside.
end phrase
define phrase ring-done
  Done.
end phrase
define phrase ring-quiet
  Quiet.
end phrase
define phrase too-dark
  Too dark.
end phrase
define phrase bell-rings
  It rings.
end phrase
define phrase cat-startled
  The cat bolts.
end phrase
define phrase gong-shines
  It shines.
end phrase

before the game starts
  change the player to Alex
end before
