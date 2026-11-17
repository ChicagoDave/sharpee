story
  title: The Yard
  id: yard
  use hunger
    grows 1 each turn
    peckish at 2 says hunger-peckish
    hungry at 4 says hunger-hungry
    fatal at 9
  authors:
    Nobody

create the Yard, a room

  A cobbled yard with a pump in the middle of it.

create Ansel
  a person
  playable
  starts in the Yard

  You have not eaten since yesterday.

before the game starts
  change the player to Ansel
end before

define phrases en-US
  hunger-peckish:
    You could eat.
  hunger-hungry:
    You are hungry now, and thinking about the loaf.
