story "Phrasebook: Digging" by "Sharpee Docs"
  id: phrasebook-digging
  version: 0.0.1

create the Strand
  a room

  Wet sand, low tide, and gulls arguing over the wrack line.

create the sandy patch
  aka sand, patch
  diggable with tool the spade
  scenery
  in the Strand

  A patch of sand a shade darker than the rest.

  on digging it, once
    move the scarab to the Strand
    phrase sand-yields
  end on

create the spade
  in the Strand

  A short garden spade.

create the scarab
  aka beetle

  A faience scarab, blue as a kingfisher.

create the seashell
  aka shell

  A scallop shell, pretty and useless.

create the player
  starts in the Strand
  carries the seashell

define phrases en-US
  sand-yields:
    Two spadefuls down, the blade rings against something small and hard.
    You lift out a faience scarab.
