story "Define Condition" by "Sharpee Docs"
  id: chord-ref-def-condition
  version: 0.0.1

define condition trug-in-hand: the player holds the trug
define condition ripe-tomato: it is a tomato and it is not in the trug

create the Kitchen Garden
  a room

  Staked tomatoes in long, hopeful rows.

create the trug
  aka basket
  a container
  in the Kitchen Garden

  A shallow garden trug for the day's picking.

create the roma tomato
  a tomato
  in the Kitchen Garden

  A roma tomato, reddening on the vine.

  on examining it
    phrase go-ahead when trug-in-hand
    phrase still-out when any ripe-tomato
  end on

create the player
  starts in the Kitchen Garden

define phrases en-US
  go-ahead:
    Trug in hand, you may as well start picking.
  still-out:
    At least one tomato is still out on the vine.
