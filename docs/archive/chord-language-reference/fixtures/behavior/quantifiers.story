story "Quantifiers" by "Sharpee Docs"
  id: chord-ref-quantifiers
  version: 0.0.1

define condition gathered-tomato: it is a tomato and it is in the harvest basket
define condition vine-tomato: it is a tomato and it is not in the harvest basket

create the Tomato House
  a room
  south is blocked while no gathered-tomato: harvest-first

  Vines climb their canes in rows.

create the roma tomato
  a tomato
  in the Tomato House

  A roma tomato, still hard.

create the cherry tomato
  a tomato
  in the Tomato House

  A cherry tomato the size of a marble.

  on picking it
    it must be any vine-tomato: already-picked
    move it to the harvest basket
    phrase tomato-picked
  end on

create the harvest basket
  aka basket
  a container
  in the Tomato House

  A woven harvest basket.

  on examining it
    phrase basket-empty when no gathered-tomato
    phrase basket-laden when any gathered-tomato
  end on

create the player
  starts in the Tomato House

define phrases en-US
  harvest-first:
    Not before you have picked at least one tomato.
  already-picked:
    That one is already in the basket.
  tomato-picked:
    The vine gives it up with a snap.
  basket-empty:
    Nothing but the smell of the vine so far.
  basket-laden:
    Red weight settles the basket into the straw.
