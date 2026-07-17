story "Phrasebook: Taking and Dropping" by "Sharpee Docs"
  id: phrasebook-taking-dropping
  version: 0.0.1

create the Lamp Room
  a room

  Shelves of unlit lamps line every wall.

create the brass lantern
  aka lantern
  in the Lamp Room

  A dented brass lantern with a wire handle.

create the marble statue
  aka statue
  scenery
  in the Lamp Room

  A blank-eyed statue, far too heavy to move.

create the iron ring
  aka ring
  scenery
  in the Lamp Room

  A ring set into the floor slab.

  on taking it
    refuse if.action.taking.ring-fused
  end on

create the player
  starts in the Lamp Room

define phrase if.action.taking.ring-fused
  The ring is fused to the slab; your fingers just slip off it.
end phrase
