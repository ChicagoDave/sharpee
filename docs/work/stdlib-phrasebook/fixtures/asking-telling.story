story "Phrasebook: Asking and Telling" by "Sharpee Docs"
  id: phrasebook-asking-telling
  version: 0.0.1

create the Hermitage
  a room

  A driftwood hut above the tide line.

create the hermit
  a person
  in the Hermitage

  A weathered hermit mending a net.

  on asking it
    phrase hermit-answers
  end on

create the gull
  aka seagull
  a person
  in the Hermitage

  A herring gull with an air of officialdom.

create the player
  starts in the Hermitage

define phrases en-US
  hermit-answers:
    The hermit squints seaward. "Weather's turning. It always is."
