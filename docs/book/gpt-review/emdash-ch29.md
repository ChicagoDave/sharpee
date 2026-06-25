# Em-dash review — Chapter 29: Transcript Testing and Walkthroughs

### 1. Two kinds of test, "Unit transcripts" bullet (line 43) — list item

OLD:
- **Unit transcripts** (`tests/transcripts/*.transcript`) are short and isolated.
  Each gets a *fresh* game. Use them to pin down one feature or puzzle — "feeding the
  goats consumes the feed," "the camera is required to photograph."

NEW:
- **Unit transcripts** (`tests/transcripts/*.transcript`) are short and isolated.
  Each gets a *fresh* game. Use them to pin down one feature or puzzle: "feeding the
  goats consumes the feed," "the camera is required to photograph."

### 2. Bracket directives, "`[WHILE: …]`" bullet (line 84) — list item

OLD:
- **`[WHILE: …]` / `[END WHILE]`** loops (capped at 100 iterations), and
  `[NAVIGATE TO: "Room"]` walks the player somewhere by name — together they cope with
  a randomized exit or a roaming NPC without hard-coding one exact path.

NEW:
- **`[WHILE: …]` / `[END WHILE]`** loops (capped at 100 iterations), and
  `[NAVIGATE TO: "Room"]` walks the player somewhere by name; together they cope with
  a randomized exit or a roaming NPC without hard-coding one exact path.
