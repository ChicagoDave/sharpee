# Ch 20 — Non-Player Characters: edit proposals

Mostly em-dash removal. The prose is clear; I left it alone where it read well.
Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: machines wait to be used — nothing moves unless the player moves it.
NEW: machines wait to be used. Nothing moves unless the player moves it.

### 2. "Sharpee's NPC system has three parts" list — emdash
OLD: 1. **`NpcTrait`** — the trait that marks an entity as an NPC.
2. **`NpcBehavior`** — an object that decides what the NPC does each turn.
3. **`NpcPlugin`** — an engine plugin that gives NPCs their own phase in the turn.
NEW: 1. **`NpcTrait`**: the trait that marks an entity as an NPC.
2. **`NpcBehavior`**: an object that decides what the NPC does each turn.
3. **`NpcPlugin`**: an engine plugin that gives NPCs their own phase in the turn.

### 3. "These span four packages" — emdash
OLD: These span four packages — the engine, the world-model, the NPC plugin, and the
stdlib:
NEW: These span four packages: the engine, the world-model, the NPC plugin, and the
stdlib.

### 4. "canMove decides…" paragraph — emdash
OLD: `canMove` decides whether this NPC is allowed to walk
between rooms — the parrot, which stays put, sets it to `false`.
NEW: `canMove` decides whether this NPC is allowed to walk
between rooms. The parrot, which stays put, sets it to `false`.

### 5. "The parrot becomes an NPC" intro — emdash
OLD: The parrot already exists — you created it in Chapter 15 as a pettable actor in the
Aviary.
NEW: The parrot already exists; you created it in Chapter 15 as a pettable actor in the
Aviary.

### 6. "So the zookeeper is a brand-new NPC" — emdash
OLD: So the zookeeper is a brand-new NPC while the parrot is an existing actor promoted
to one — both routes end at the same place: an actor with an `NpcTrait` whose
`behaviorId` names a behavior.
NEW: So the zookeeper is a brand-new NPC while the parrot is an existing actor promoted
to one. Both routes end at the same place: an actor with an `NpcTrait` whose
`behaviorId` names a behavior.

### 7. "The zookeeper uses createPatrolBehavior" — emdash
OLD: The zookeeper uses `createPatrolBehavior` — give it a route of room IDs and it
walks them in order, finding the exits on its own.
NEW: The zookeeper uses `createPatrolBehavior`: give it a route of room IDs and it
walks them in order, finding the exits on its own.

### 8. Code comment in parrotBehavior — emdash
OLD: `    if (!context.playerVisible) return [];        // no audience — stay quiet`
NEW: `    if (!context.playerVisible) return [];        // no audience, stay quiet`

### 9. "The npc.speech and npc.emote message ids" — emdash
OLD: platform's language layer (`@sharpee/lang-en-us`) — you don't register them in
`extendLanguage`.
NEW: platform's language layer (`@sharpee/lang-en-us`). You don't register them in
`extendLanguage`.

### 10. "That happens in onEngineReady()" — emdash (two in one paragraph)
OLD: That happens in `onEngineReady()` — the story hook called after the engine is
fully built, which is where any plugin needing the engine reference is set up. The
patrol route references `this.roomIds` — the field you started in Chapter 13; make
sure `initializeWorld` records `mainPath`, `pettingZoo`, and `aviary` there so the
route can name them:
NEW: That happens in `onEngineReady()`, the story hook called after the engine is
fully built, which is where any plugin needing the engine reference is set up. The
patrol route references `this.roomIds`, the field you started in Chapter 13; make
sure `initializeWorld` records `mainPath`, `pettingZoo`, and `aviary` there so the
route can name them:

### 11. Code comment "gives NPCs a turn phase" — emdash
OLD: `  // 1. Create and register the plugin — gives NPCs a turn phase`
NEW: `  // 1. Create and register the plugin: gives NPCs a turn phase`

### 12. Code comment "The factory's default id is 'patrol'" — emdash
OLD: `  // The factory's default id is 'patrol' — override it to match NpcTrait.behaviorId`
NEW: `  // The factory's default id is 'patrol'; override it to match NpcTrait.behaviorId`

### 13. "Note the patrol factory" paragraph — emdash
OLD: The parrot needs no override — `parrotBehavior` was
defined with `id: 'zoo-parrot'` to begin with.
NEW: The parrot needs no override; `parrotBehavior` was
defined with `id: 'zoo-parrot'` to begin with.

### 14. "Try it" block comments — emdash
OLD: `> wait                      …and on toward the aviary`
`> west                      Aviary — meet the parrot`
`> wait                      …or not — it's a coin flip each turn`
NEW: `> wait                      …and on toward the aviary`
`> west                      Aviary, meet the parrot`
`> wait                      …or not; it's a coin flip each turn`
(Only the second and third lines change; the first has no em dash.)
