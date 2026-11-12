## A test story: the claims runner's real path. Five rooms, one person, and
## one of each thing a claim can be about. Written to be tested and nothing
## else; `lodge.test-set.md` lists what it must let the tests prove.

story
  title: The Lodge
  authors:
    Test Story
  id: lodge
  story-version: 0.0.1

create the Porch
  a room
  north to the Hall

  A porch under a tin roof. A notice is nailed beside the door.

  after the player entering while the player has the deed
    win lodge-kept
  end after

create the Hall
  a room
  south to the Porch
  east to the Pantry
  west to the Study
  west is blocked while the warden is watchful: warden-blocks
  north to the Vault
  north is blocked while the valve is shut: vault-flooded

  A long hall. The warden's desk stands before the study door, and stone
  steps go down to the vault at the north end.

create the Pantry
  a room
  west to the Hall

  Shelves of jars. A brass valve juts from the wall.

create the Study
  a room
  east to the Hall

  A small study. A ledger lies on the desk.

create the Vault
  a room
  south to the Hall

  A cold stone vault, its floor still wet.

create the notice
  a thing, scenery, readable
  in the Porch

  A notice of sale, gone soft in the rain.

  on the player reading
    phrase notice-text
  end on

create the warden
  a person
  in the Hall
  states: watchful, mellow

  A warden in a grey coat, between you and the study door.

  on the player giving
    change the warden to mellow when the warden has the brandy
    phrase warden-mellows when the warden is mellow
  end on

create the valve
  a thing, scenery
  in the Pantry
  states: shut, running

  A brass valve with a wheel handle.

  on the player turning
    change the valve to running
    phrase valve-turns
  end on

create the brandy
  aka bottle
  a thing
  in the Pantry

  A bottle of brandy, nearly full.

create the hand bell
  aka bell
  a thing
  in the Pantry

  A brass hand bell with a cracked lip.

create the ledger
  a thing, readable
  in the Study
  states: closed, studied

  A ledger of the lodge's accounts.

  on the player reading
    change the ledger to studied
    phrase ledger-text
  end on

create the strongbox
  aka box
  a container, openable
  in the Vault

  A strongbox bound in iron, light enough to lift.

create the deed
  a thing
  in the strongbox

  The deed to the lodge.

create Wren
  a person
  playable
  starts in the Porch

  You.

define topics for the warden
  about "the vault": phrase warden-vault
end topics

define phrases en-US
  lodge-kept:
    The deed is yours, and the lodge with it.
  warden-blocks:
    The warden does not move from the study door.
  vault-flooded:
    The steps go down into black water. Something upstream is shut.
  notice-text:
    "For sale by order of the bank."
  warden-mellows:
    The warden weighs the bottle, and steps aside.
  valve-turns:
    The wheel squeals round. Somewhere below, water starts to drain.
  ledger-text:
    "Vault: one strongbox, one deed."
  warden-vault:
    "North, down the steps," says the warden. "When it is dry."

before the game starts
  change the player to Wren
end before
