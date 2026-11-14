## The Relighting, as it stands at the end of Part I: a header, a prologue,
## one room, and the person the player will be.

story
  title: The Relighting
  id: relighting
  story-version: 0.1.0
  authors:
    The Sharpee Project
  description: Thirty years after the magic went out of the world, a lamp burns blue.
  prologue:
    You were here for one term, thirty years ago, and you would have said
    you remembered none of it. Then last week a candle leaned toward your
    hand, and you started walking.

create the Lodge, a room

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame.

create Ansel
  a person
  playable
  starts in the Lodge

  You were a student here once, for a term. You have the same hands and
  not much else.

before the game starts
  change the player to Ansel
end before
