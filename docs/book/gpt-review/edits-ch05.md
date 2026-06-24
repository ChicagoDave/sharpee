# Ch 05 — Scenery & Portable Objects: edit proposals

Strong prose. Mostly em-dash removal, plus one description-string recast. Each
entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: the zoo gains two kinds of things: **scenery** you can examine but never carry off — fences, benches, animals — and **portable items** the player can take, pocket, and drop — a zoo map, a souvenir penny, a bag of feed.
NEW: the zoo gains two kinds of things: **scenery** you can examine but never carry off (fences, benches, animals) and **portable items** the player can take, pocket, and drop (a zoo map, a souvenir penny, a bag of feed).

### 2. "Everything is portable by default" — emdash
OLD: There is no `PortableTrait`, because portability isn't a feature you add — it's the starting state.
NEW: There is no `PortableTrait`, because portability isn't a feature you add. It's the starting state.

### 3. After the penny code — emdash
OLD: the `IdentityTrait` gives it a name, description, and aliases. No trait is needed to make it carryable — that's the default.
NEW: the `IdentityTrait` gives it a name, description, and aliases. No trait is needed to make it carryable; that's the default.

### 4. "SceneryTrait takes portability away" — emdash
OLD: Now `take fence` gives the player *"iron fence is fixed in place."* But `examine fence` still works — scenery blocks *taking*, not *looking*.
NEW: Now `take fence` gives the player *"iron fence is fixed in place."* But `examine fence` still works: scenery blocks *taking*, not *looking*.

### 5. "Aliases make objects findable" — emdash
OLD: the player might type `examine fence`, `examine railing`, or `examine wrought-iron fence` — and all of them should land:
NEW: the player might type `examine fence`, `examine railing`, or `examine wrought-iron fence`, and all of them should land:

### 6. "The other easy miss" box — emdash
OLD: Be generous — every noun in your prose is a word the player may type.
NEW: Be generous: every noun in your prose is a word the player may type.

### 7. "Putting it together" code comment (rabbits description) — emdash
OLD: A pair of Holland Lop rabbits with floppy ears and twitching noses — one pure white, the other brown and cream.
NEW: A pair of Holland Lop rabbits with floppy ears and twitching noses, one pure white and the other brown and cream.

### 8. "Putting it together" closing paragraph — emdash
OLD: the **pygmy goats** you placed in the Petting Zoo back in Chapter 4 are scenery — so every object the "Try it" walkthrough touches is now in the world:
NEW: the **pygmy goats** you placed in the Petting Zoo back in Chapter 4 are scenery, so every object the "Try it" walkthrough touches is now in the world:

### 9. "Plural-named scenery" box — emdash
OLD: Set it on anything with a plural name — *pygmy goats*, *direction signs*, *flower beds* — and the generated prose stays grammatical.
NEW: Set it on anything with a plural name (*pygmy goats*, *direction signs*, *flower beds*) and the generated prose stays grammatical.

### 10. Key takeaway — emdash (still contains em dashes; not handled by the locked pass)
OLD: Items are portable by default — `EntityType.ITEM` plus an `IdentityTrait` is a complete takeable object, no special trait required. `SceneryTrait` *removes* portability; it's what makes fences, benches, and animals fixed in place while still examinable.
NEW: Items are portable by default: `EntityType.ITEM` plus an `IdentityTrait` is a complete takeable object, no special trait required. `SceneryTrait` *removes* portability; it's what makes fences, benches, and animals fixed in place while still examinable.
