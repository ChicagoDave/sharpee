story "Define Phrase" by "Sharpee Docs"
  id: chord-ref-def-phrase
  version: 0.0.1

create the Aviary
  a room

  Scarlet parrots chatter overhead{keeper-note}.

create the zookeeper
  aka sam, keeper
  a person
  in the Aviary

  Sam, up to the elbows in birdseed.

create the parrot
  scenery
  in the Aviary

  A macaw with strong opinions.

  on examining it
    phrase parrot-chatter
  end on

create the brass plaque
  aka plaque
  scenery
  in the Aviary

  A small engraved plaque.

  on reading it
    phrase plaque-text
  end on

create the player
  starts in the Aviary

define phrase parrot-chatter, randomly
  Polly wants a cracker!
or
  SQUAWK! Pretty bird! Pretty bird!
or
  Pieces of eight! Pieces of eight!
end phrase

define phrase keeper-note, cycling while the zookeeper is here
  where a keeper is refilling the feeders
or
  where a keeper is chalking today's talks on a board
end phrase

define phrase plaque-text, verbatim
  MACAWS OF THE AMERICAS
    donated by the Willowbrook Trust
  Please do not tap the glass
end phrase
