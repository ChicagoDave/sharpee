story "Cookbook: Opening with a Tool" by "Sharpee Docs"
  id: cookbook-opening-tool
  version: 0.0.1

create the Cellar
  a room

  Brick arches, cold air, one bare bulb.

create the shipping crate
  aka crate
  openable
  scenery
  in the Cellar

  A pine crate. The lid sits loose on top.

create the letter opener
  aka opener

  Your grandfather's silver letter opener.

  on opening it
    refuse if.action.opening.opener-precious
  end on

create the player
  starts in the Cellar
  carries the letter opener

define phrase if.action.opening.opener-precious
  You are not prying anything with your grandfather's letter opener.
end phrase
