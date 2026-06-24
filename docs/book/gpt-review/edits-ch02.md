# Ch 02 — Your First Room: edit proposals

Em-dash removal in prose, plus one over-compressed sentence restored. The chapter
reads well; I left the working prose alone. String literals inside code blocks
(e.g. the config `description`) were not touched, since they are story data, not
prose or comments. Each entry: location, reason, OLD → NEW.

---

### 1. "The Story interface" list item 1 — emdash
OLD: 1. **`config`** — metadata: the story's title, author, version, and ID. The engine shows this as a banner when the game starts.
NEW: 1. **`config`**: metadata such as the story's title, author, version, and ID. The engine shows this as a banner when the game starts.

### 2. "Entities and traits" — emdash
OLD: Everything in a Sharpee game is an **entity** — rooms, objects, characters, doors, even the player.
NEW: Everything in a Sharpee game is an **entity**: rooms, objects, characters, doors, even the player.

### 3. "Entities and traits" — emdash
OLD: You create entities with `world.createEntity(name, type)`. The type is a hint to the engine — `EntityType.ROOM`, `EntityType.ITEM`, `EntityType.ACTOR`, `EntityType.SCENERY`, and so on.
NEW: You create entities with `world.createEntity(name, type)`. The type is a hint to the engine: `EntityType.ROOM`, `EntityType.ITEM`, `EntityType.ACTOR`, `EntityType.SCENERY`, and so on.

### 4. "Entities and traits" bullet (IdentityTrait) — emdash
OLD: - **`IdentityTrait`** — a name, description, and aliases. Almost every entity has one.
NEW: - **`IdentityTrait`**: a name, description, and aliases. Almost every entity has one.

### 5. "Entities and traits" bullet (ActorTrait) — emdash
OLD: - **`ActorTrait`** — marks an entity as a character. `isPlayer: true` tells the engine this is *the* player.
NEW: - **`ActorTrait`**: marks an entity as a character. `isPlayer: true` tells the engine this is *the* player.

### 6. "Entities and traits" bullet (ContainerTrait) — emdash
OLD: - **`ContainerTrait`** — lets an entity hold other entities. The player needs it to carry an inventory.
NEW: - **`ContainerTrait`**: lets an entity hold other entities. The player needs it to carry an inventory.

### 7. "Entities and traits" bullet (SceneryTrait) — emdash
OLD: - **`SceneryTrait`** — marks an entity as fixed. The player can examine it but not take it.
NEW: - **`SceneryTrait`**: marks an entity as fixed. The player can examine it but not take it.

### 8. "Entities and traits" bullet (RoomTrait) — emdash
OLD: - **`RoomTrait`** — marks an entity as a room, with exits and a darkness flag.
NEW: - **`RoomTrait`**: marks an entity as a room, with exits and a darkness flag.

### 9. "The shape of the file" — emdash
OLD: Before the methods, the top of the file: the **imports**, the **config**, and the **class** that holds everything. Every symbol the story uses comes from one of two packages — `@sharpee/engine` (the `Story` contract and `StoryConfig`) and `@sharpee/world-model` (the world, entity types, and traits).
NEW: Before the methods, the top of the file: the **imports**, the **config**, and the **class** that holds everything. Every symbol the story uses comes from one of two packages: `@sharpee/engine` (the `Story` contract and `StoryConfig`) and `@sharpee/world-model` (the world, entity types, and traits).

### 10. Code comment in the file-shape block — emdash
OLD: `  // createPlayer(world)     — fills in next`
NEW: `  // createPlayer(world)     - fills in next`

### 11. Code comment in the file-shape block — emdash
OLD: `  // initializeWorld(world)  — and after that`
NEW: `  // initializeWorld(world)  - and after that`

### 12. After the file-shape block — emdash
OLD: The two methods below are members of this `FamilyZooStory` class — they go where the comments are.
NEW: The two methods below are members of this `FamilyZooStory` class; they go where the comments are.

### 13. "The shape of the file" callout — vague/redundant (was emdash)
The bold lead just hand-waves ("looks a little different, and that's fine") and
restates the sentence right after it. Cut the hand-wave; promote the concrete
sentence to the bold lead. This spans the bold line and the sentence that follows it.
OLD: **The scaffolded stub looks a little different — and that's fine.** The `src/index.ts` that `sharpee init` generated isn't written exactly like the file we build here, but both are valid.
NEW: **The scaffolded `src/index.ts` isn't written exactly like the file we build here, but both are valid.**

### 14. "The shape of the file" callout — emdash
OLD: An object literal and a class instance satisfy the `Story` interface identically — we use the class form throughout the book because it gives the two methods a natural home and reads well as the story grows.
NEW: An object literal and a class instance satisfy the `Story` interface identically. We use the class form throughout the book because it gives the two methods a natural home and reads well as the story grows.

### 15. "Building the world" — emdash
OLD: Both are placed in the entrance — and now `examine booth` in the "Try it" list has something to find.
NEW: Both are placed in the entrance, and now `examine booth` in the "Try it" list has something to find.

### 16. "Placing things" — emdash
OLD: You place it with `world.moveEntity(entityId, locationId)` — that puts the entity *inside* the location, whether that's an object in a room, an item in a container, or the player in a room.
NEW: You place it with `world.moveEntity(entityId, locationId)`, which puts the entity *inside* the location, whether that's an object in a room, an item in a container, or the player in a room.

### 17. "Exposing the story" — emdash
OLD: the engine loads your story from the module's exports, so provide both a named `story` and a default — it then works however the module is loaded.
NEW: the engine loads your story from the module's exports, so provide both a named `story` and a default. It then works however the module is loaded.

### 18. "Exposing the story" — emdash
OLD: The `: Story` annotation matters: it types `story` as the full `Story` interface — including the *optional* hooks like `extendParser` and `extendLanguage` you'll add in later chapters.
NEW: The `: Story` annotation matters: it types `story` as the full `Story` interface, including the *optional* hooks like `extendParser` and `extendLanguage` you'll add in later chapters.

### 19. "Try it" block code comment — emdash
OLD: `> take sign             Can't — it's scenery ("fixed in place")`
NEW: `> take sign             Can't, it's scenery ("fixed in place")`
