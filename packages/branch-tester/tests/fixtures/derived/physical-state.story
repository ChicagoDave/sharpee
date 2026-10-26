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

create the call button
  a thing, scenery, pushable
  in the Specimen Room
  aka button

  A button.

  after the player pushing
    play sound bell
  end after

create the Back Room
  a room
  west to the Specimen Room

  A back room.

create the porter
  a person, listener
  in the Specimen Room
  aka porter

  A porter.

  after hearing the bell
    move the porter to the Back Room
    move the porter to the Specimen Room
    phrase porter-answers
  end after

define sound bell

define phrase porter-answers
  The porter looks in and out again.
end phrase

define phrase shards
  Shards.
end phrase

define phrase line-made-fast
  Fast.
end phrase
