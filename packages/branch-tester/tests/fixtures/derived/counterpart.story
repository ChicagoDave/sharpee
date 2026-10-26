story
  title: Counterpart
  authors:
    T
  id: counterpart
  story-version: 0.0.1

before the game starts
  change the player to Courier
end before

create the Depot
  a room

  A depot.

create Courier
  a person
  playable
  starts in the Depot

  You.

create the returns bin
  a container, scenery
  in the Depot
  aka bin

  A bin.

  on the player throwing the dead letter
    move the dead letter to the returns bin
    phrase letter-returned
  end on

create the dead letter
  a thing
  in the Depot
  aka letter

  A letter.

create the dust ball
  a thing
  in the Depot
  aka ball

  A ball.

  on the player throwing at the brass gong
    change the brass gong to ringing
  end on

create the brass gong
  a thing, scenery
  in the Depot
  aka gong
  states, reversible: still, ringing

  A gong.

create the grocer
  a person
  in the Depot
  carries the ration bar
  states, reversible: sulking, cheerful

  A grocer.

  on the player asking_for the ration bar
    refuse when the grocer is sulking: grocer-sulks
    move the ration bar to the player
    phrase grocer-hands-bar
  end on

create the ration bar
  a thing
  aka bar

  A bar.

create the station directory
  a thing, readable with text "KEPLER STATION"
  in the Depot
  aka directory
  states, reversible: unread, consulted

  A directory.

define topics for the station directory
  about "vance":
    change the station directory to consulted
    phrase directory-vance
end topics

define phrase letter-returned
  The letter drops into the bin.
end phrase

define phrase grocer-sulks
  The grocer turns away.
end phrase

define phrase grocer-hands-bar
  The grocer hands you a bar.
end phrase

define phrase directory-vance
  VANCE SHIPPING: Company Lobby.
end phrase
