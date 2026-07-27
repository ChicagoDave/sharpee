## ADR-258 D7 lexer-golden corpus — author alterations (ADR-270) and counter
## comparisons (ADR-264): `extend action` / `remove from action`, symbolic
## and word comparisons, list brackets. Edit only alongside the golden file.

story "Alterations And Counters" by "Lexer Golden"
  id: lexer-golden-alterations
  version: 1.0.0
  use combat

  on every turn
    raise dread by 20
    kill the player when dread >= 100
  end on

define counter dread starts 0 between 0 and 100

create the Vault
  a room

  A vault. The counter reads: nothing yet.

  on entering it
    raise dread by 5 when dread < 40
    phrase vault-hum when dread <= 60
    phrase vault-roar when dread is at least 80
  end on

create the orc
  a person, combatant with skill 7 and hostile true
  in the Vault

  An orc with a ledger.

create the keeper
  a person, patrol with route [the Vault] and can-move true
  in the Vault

  The keeper walks the route.

create the player
  starts in the Vault

  You.

define phrases en-US
  vault-hum:
    The walls hum ({dread} and climbing).
  vault-roar:
    The vault roars.

extend action taking
  grammar
    snag the item
    yoink the item

remove from action taking
  take inventory

remove from action examining
  x the target
