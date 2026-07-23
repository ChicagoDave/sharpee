story "Message Override" by "Sharpee Docs"
  id: chord-ref-override
  version: 0.0.1

create the Crypt
  a room

  A low stone room, all slabs and echoes.

create the iron ring
  aka ring
  scenery
  in the Crypt

  A ring set into the floor slab.

create the player
  starts in the Crypt

override message taking-fixed-in-place
  It will not budge, and neither will anything else bolted to this place.
end override
