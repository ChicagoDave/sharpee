## A dedicated fixture for a later firing of a clause whose head is not
## unique. The clock carries two `on every turn` clauses that differ only by
## a guard, so the compiler numbers them 1 and 2 in source order and the
## runner has to say which one's counter it wrote. The clock's examining
## clause is the control: a head that is unique on its owner carries no
## number. The lamp composes a trait whose clause has a later firing too,
## which the runner names by the lamp and the trait together. Not story
## content.

story
  title: Derived Identical Heads
  authors:
    Sharpee
  id: derived-identical-heads
  story-version: 0.0.1

define trait glowing
  on the player examining
    first time
      phrase glow-once
    second time
      phrase glow-twice
  end on
end trait

create the Hall
  a room

  The hall.

create the clock
  a thing, scenery
  in the Hall
  states: stopped, wound

  A tall clock.

  on every turn
    first time
      phrase tick-one
    second time
      phrase tick-two
  end on

  on every turn while the clock is wound
    first time
      phrase chime-one
    second time
      phrase chime-two
  end on

  on the player examining
    first time
      phrase face-once
    second time
      phrase face-twice
  end on

create the lamp
  a thing, glowing
  in the Hall

  A small lamp.

define phrase tick-one
  The clock ticks.
end phrase
define phrase tick-two
  The clock ticks again.
end phrase
define phrase chime-one
  The clock chimes.
end phrase
define phrase chime-two
  The clock chimes again.
end phrase
define phrase face-once
  The face is blank.
end phrase
define phrase face-twice
  Still blank.
end phrase
define phrase glow-once
  It glows faintly.
end phrase
define phrase glow-twice
  It glows a little brighter.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before
