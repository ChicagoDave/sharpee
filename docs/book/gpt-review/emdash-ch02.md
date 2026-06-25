# Em-dash review — part-1/02-your-first-room.md

Em-dash lines: 13, 14, 16, 20, 76, 105, 129, 132, 143, 180

---

### 1. "createPlayer(world)" required-method list item (line 13) — list
OLD:
2. **`createPlayer(world)`** — creates the player character. The engine calls this first. You create an entity, attach traits, and return it.

NEW:
2. The **`createPlayer(world)`** method creates the player character. The engine calls this first. You create an entity, attach traits, and return it.

---

### 2. "initializeWorld(world)" required-method list item (line 14) — list
OLD:
3. **`initializeWorld(world)`** — builds the world: rooms, objects, connections. The engine calls this after `createPlayer`.

NEW:
3. The **`initializeWorld(world)`** method builds the world, including: rooms, objects, connections. The engine calls this after `createPlayer`.

---

### 3. "There are optional methods too" paragraph (line 16) — prose
OLD:
There are optional methods too — `extendParser`, `extendLanguage`,
`onEngineReady`, and others — but a basic story needs none of them.

NEW:
There are optional methods too (`extendParser`, `extendLanguage`,
`onEngineReady`, and others), but a basic story needs none of them.

---

### 4. Under-the-Hood label — Story (line 20) — underhood
OLD:
**Under the Hood — `Story`** · `@sharpee/engine`

NEW:
**Under the Hood: `Story`** · `@sharpee/engine`

---

### 5. config `description` string (line 76) — in-world
OLD:
  description: 'A small family zoo — learn Sharpee one concept at a time.',

NEW:
  description: 'A small family zoo: Learn Sharpee one concept at a time.',


---

### 6. "Creating the player" intro paragraph (line 105) — prose
OLD:
The engine calls `createPlayer` first. Inside the class, you build the player like
any other entity — create it, add traits, return it.

NEW:
The engine calls `createPlayer` first. Inside the class, you build the player like
any other entity: create it, add traits, return it.

---

### 7. "The ContainerTrait is what makes take work" paragraph (line 129) — prose
OLD:
The `ContainerTrait` is what makes `take` and `inventory` work — without it, the player has nowhere to put anything.

NEW:
The `ContainerTrait` is what makes `take` and `inventory` work. Without it, the player has nowhere to put anything.

---

### 8. Under-the-Hood label — ContainerTrait (line 132) — underhood
OLD:
**Under the Hood — `ContainerTrait`** · `@sharpee/world-model`

NEW:
**Under the Hood: `ContainerTrait`** · `@sharpee/world-model`

---

### 9. "The constructor takes a Partial" paragraph (line 143) — prose
OLD:
The constructor takes a `Partial` of the trait's own fields, so you set only what you need — here, just `capacity`. The standard `take` action reads `capacity` to decide whether an item fits.

NEW:
The constructor takes a `Partial` of the trait's own fields, so you set only what you need (here, just `capacity`). The standard `take` action reads `capacity` to decide whether an item fits.

---

### 10. ticket booth window-sign string (line 180) — in-world
OLD:
      'window reads "Self-Guided Tours — No Ticket Needed Today!"',

NEW:
      'window reads "Self-Guided Tours / No Ticket Needed Today!"',
