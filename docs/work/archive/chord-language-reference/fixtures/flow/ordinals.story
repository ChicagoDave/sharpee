story "Ordinal Blocks" by "Sharpee Docs"
  id: chord-ref-ordinals
  version: 0.0.1

create the Garden Door
  a room

  A green door in the south wall, knocker at eye height.

create the brass knocker
  aka knocker
  scenery
  in the Garden Door
  states: polished, smudged

  A brass knocker shaped like a hedgehog.

  on knocking it
    phrase knock-echo
    first time
      phrase knock-first
    second time
      change it to smudged
      phrase knock-second
    fifth time
      phrase knock-fifth
  end on

create the player
  starts in the Garden Door

define phrases en-US
  knock-echo:
    The knock echoes away somewhere beyond the wall.
  knock-first:
    Distantly, a dog begins to bark.
  knock-second:
    Your thumb leaves a smudge on the hedgehog's polished back.
  knock-fifth:
    The dog has given up on you entirely.
