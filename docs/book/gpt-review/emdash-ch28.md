# Em-dash review — Chapter 28: The Multi-File Story

### 1. `characters.ts` bullet (line 119) — list item

OLD:
- **`characters.ts`** exports two NPC behaviors for the parrot — `parrotBehavior`
  (daytime squawking) and `parrotAfterHoursBehavior` (articulate). A small daemon in
  `index.ts` watches the flag and performs a **runtime behavior swap**: when
  `zoo.after_hours` flips, it calls `npcService.removeBehavior('zoo-parrot')` and
  registers the after-hours behavior in its place. Swapping a behavior at runtime is
  the canonical way to change how an NPC acts mid-game.

NEW:
- **`characters.ts`** exports two NPC behaviors for the parrot: `parrotBehavior`
  (daytime squawking) and `parrotAfterHoursBehavior` (articulate). A small daemon in
  `index.ts` watches the flag and performs a **runtime behavior swap**: when
  `zoo.after_hours` flips, it calls `npcService.removeBehavior('zoo-parrot')` and
  registers the after-hours behavior in its place. Swapping a behavior at runtime is
  the canonical way to change how an NPC acts mid-game.
