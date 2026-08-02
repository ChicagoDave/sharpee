story "Each Blocks" by "Sharpee Docs"
  id: chord-ref-each
  version: 0.0.1

define condition frame-seedling: it is a seedling and it is in the cold frame
define condition labeled-pot: it is a pot and it is in the potting shed

create the Nursery Bed
  a room

  Freshly turned earth in tidy rows, waiting.

create the cold frame
  aka frame
  a container
  in the Nursery Bed

  A low glass box for hardening things off.

create the potting shed
  aka shed
  a container
  in the Nursery Bed

  Strictly speaking a shed, currently a cupboard for pots.

create the leggy seedling
  a seedling
  in the cold frame

  A tomato seedling grown long and hopeful.

create the stout seedling
  a seedling
  in the cold frame

  A squat, confident little courgette.

create the terracotta pot
  a pot
  in the potting shed

  A classic terracotta pot, rim chipped.

create the plastic pot
  a pot
  in the potting shed

  A black plastic pot that has seen some seasons.

create the dibber
  in the Nursery Bed

  A worn wooden dibber for making planting holes.

  on planting it
    each frame-seedling
      move the match to the Nursery Bed
      phrase planted-out with plant = the match
    end each
    phrase planting-done
  end on

  on auditing it
    each frame-seedling
      each labeled-pot
        phrase audit-pair with pot = the match
      end each
    end each
  end on

create the player
  starts in the Nursery Bed

define phrases en-US
  planted-out:
    In goes {the plant}, firmed with a knuckle.
  planting-done:
    You water everything in and stand back, muddy and satisfied.
  audit-pair:
    You could pot that one on into {the pot}.
