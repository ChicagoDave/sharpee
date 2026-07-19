story "Extensions" by "ref"
  id: ext-ref
  version: 0.0.1
  use combat

create the Guardhouse
  a room

  A low stone guardhouse.

create the sentry
  a person, combatant with health 20 and skill 40
  in the Guardhouse

  Bored but armed.

create the player
  starts in the Guardhouse
