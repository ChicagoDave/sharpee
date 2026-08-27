story
  title: The Vigil
  authors:
    DevArch
  id: counter-demo
  story-version: 1.0.0

  on every turn
    raise dread by 20
    kill the player when dread is at least 100
  end on

define counter dread starts 0 between 0 and 100

create the Chapel
  a room

  A cold stone chapel. The dark presses in from every corner, and the single
  candle does nothing against it.

create Alex
  a person
  playable
  starts in the Chapel

  You.

before the game starts
  change the player to Alex
end before
