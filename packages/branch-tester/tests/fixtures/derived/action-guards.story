## A dedicated fixture for GH #714 and GH #715. A `define action` carries a
## `must` line and a `refuse when` line of its own, and a trait's clause
## answers the action: the derived test for that clause must arrange the
## action's guards as well as the clause's. The clause body plays an ambient
## bed unconditionally, which the story spells `media-ambient-play` and the
## platform emits as `media.ambient.play`. Not story content.

story
  title: Derived Action Guards
  authors:
    Sharpee
  id: derived-action-guards
  story-version: 0.0.1

define sound lapping from "audio/lapping.mp3"

define action hushing
  grammar
    hush the target
  the hush page must be learned: no-such-word
  refuse when the wind is howling: too-loud
  otherwise refuse nothing-to-hush

define trait hushable
  on the player hushing
    refuse when it is not tolling: already-quiet
    change it to still
    play ambient lapping
    phrase bell-hushed
  end on
end trait

create the Hall
  a room

  A hall.

create the hush page
  a thing
  in the Hall
  states: legible, learned

  A page.

create the wind
  a thing, scenery
  in the Hall
  states, reversible: calm, howling

  The wind.

create the bell
  a thing, scenery, hushable
  in the Hall
  states: unrung, tolling, still

  A bell.

define phrase no-such-word
  You know no such word.
end phrase
define phrase too-loud
  The wind takes the word away.
end phrase
define phrase nothing-to-hush
  That makes no noise.
end phrase
define phrase already-quiet
  It is quiet already.
end phrase
define phrase bell-hushed
  The bell stills.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before
