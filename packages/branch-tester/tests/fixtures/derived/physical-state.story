story
  title: Physical State
  authors:
    T
  id: physical-state
  story-version: 0.0.1

before the game starts
  change the player to Courier
end before

create the Specimen Room
  a room

  A room.

create Courier
  a person
  playable
  starts in the Specimen Room

  You.

create the sorting machine
  a thing, scenery
  in the Specimen Room
  aka machine

  A machine.

create the specimen jar
  a thing, breakable, fragile
  in the Specimen Room
  aka jar
  states, reversible: shelved, swept

  A jar.

  after the player breaking
    change the specimen jar to swept
    phrase shards
  end after

create the mooring line
  a thing
  in the Specimen Room
  aka line
  states, reversible: slack, fast

  A line.

  on the player tying to the sorting machine
    change the mooring line to fast
    phrase line-made-fast
  end on

define phrase shards
  Shards.
end phrase

define phrase line-made-fast
  Fast.
end phrase
