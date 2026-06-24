# Ch 04 — Rooms & Navigation: edit proposals

Clean, well-paced prose. Almost entirely em-dash removal; nothing genuinely terse
or over-complex to rework. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: In this chapter the zoo grows to four locations — the Zoo Entrance, a Main Path, a Petting Zoo, and an Aviary — and the player can walk between them with compass directions: north, south, east, west.
NEW: In this chapter the zoo grows to four locations: the Zoo Entrance, a Main Path, a Petting Zoo, and an Aviary. The player can walk between them with compass directions: north, south, east, west.

### 2. "Exits live on the room" — emdash
OLD: The `Direction` enum gives you all the standard IF directions — `NORTH`, `SOUTH`, `EAST`, `WEST`, `UP`, `DOWN`, the four diagonals, and `IN` / `OUT`.
NEW: The `Direction` enum gives you all the standard IF directions: `NORTH`, `SOUTH`, `EAST`, `WEST`, `UP`, `DOWN`, the four diagonals, and `IN` / `OUT`.

### 3. "Two rules that trip up everyone" — emdash
OLD: If the entrance has a south exit to the main path, the player can walk south — but they *cannot* walk back unless the main path also has a north exit to the entrance.
NEW: If the entrance has a south exit to the main path, the player can walk south, but they *cannot* walk back unless the main path also has a north exit to the entrance.

### 4. "Getting a trait back with `.get()`" — emdash
OLD: The `!` is a non-null assertion — "I know this room has a `RoomTrait`."
NEW: The `!` is a non-null assertion: "I know this room has a `RoomTrait`."

### 5. Code comment (Main Path description) — emdash
OLD: `    'rises above the treetops — the aviary. The entrance gates are back ' +`
NEW: `    'rises above the treetops, the aviary. The entrance gates are back ' +`

### 6. After the complete method — emdash
OLD: That's the whole method — nothing is hidden behind an "as before" comment.
NEW: That's the whole method. Nothing is hidden behind an "as before" comment.
