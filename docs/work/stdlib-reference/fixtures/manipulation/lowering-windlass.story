define action lowering
  grammar
    lower :target
  the target must be reachable
  refuse without target: lower-what
  otherwise refuse cant-lower

  phrases en-US
    lower-what:
      Lower what?
    cant-lower:
      That isn't something you can lower.

define trait windlass-basket
  states, reversible: raised, lowered

  phrases en-US
    basket-lowered:
      The windlass creaks as the basket descends into the shaft.
    already-down:
      The basket is already at the bottom.

  on lowering it
    it must be raised: already-down
    change it to lowered
    phrase basket-lowered
  end on
end trait

create the Well Head
  a room

  A stone rim, a windlass, and a long drop.

create the wicker basket
  aka basket
  windlass-basket
  scenery
  in the Well Head

  A wicker basket on a rope, riding at the rim.

create the windlass crank
  aka crank
  scenery
  in the Well Head

  A worn oak crank, polished smooth by many hands.

create the player
  starts in the Well Head
