# Ch 07 — Openable Things, Locked Doors & Keys: edit proposals

Clear, well-structured prose; entirely em-dash removal. Each entry: location,
reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: This chapter adds the *closed* state — first to containers, then to doors — and along the way wires up the zoo's first real puzzle: find a key, unlock a gate, walk through.
NEW: This chapter adds the *closed* state, first to containers and then to doors, and along the way wires up the zoo's first real puzzle: find a key, unlock a gate, walk through.

### 2. Properties table (`isOpen` row) — emdash
OLD: | `isOpen` | `false` | Current state — open or closed |
NEW: | `isOpen` | `false` | Current state: open or closed |

### 3. "Openable + Container" — emdash
OLD: This is how you make the player *discover* things — they open something and find items they couldn't see before.
NEW: This is how you make the player *discover* things: they open something and find items they couldn't see before.

### 4. "The mistake everyone makes once" box — emdash
OLD: The engine plays by its own rules during `initializeWorld()` — open the container, stock it, then close it.
NEW: The engine plays by its own rules during `initializeWorld()`, so open the container, stock it, then close it.

### 5. "Keys are just items" — emdash
OLD: It's an ordinary `EntityType.ITEM` with an `IdentityTrait` — nothing more.
NEW: It's an ordinary `EntityType.ITEM` with an `IdentityTrait`, nothing more.

### 6. "The unlock sequence" list — emdash (x3)
OLD: 1. **Find the key** — `take keycard`
2. **Unlock the lock** — `unlock gate with keycard`
3. **Open the door** — `open gate`
NEW: 1. **Find the key**: `take keycard`
2. **Unlock the lock**: `unlock gate with keycard`
3. **Open the door**: `open gate`

### 7. "DoorTrait and the exit `via` property" — emdash
OLD: Second — and this is the part that's easy to forget — the rooms' exits must route *through* the door using the `via` property:
NEW: Second, and this is the part that's easy to forget, the rooms' exits must route *through* the door using the `via` property:

### 8. "The mistake everyone makes once" box (via) — emdash
OLD: Without `via`, the going action never consults the door — the exit is unconditional and the player strolls through a "locked" gate as if it weren't there.
NEW: Without `via`, the going action never consults the door; the exit is unconditional and the player strolls through a "locked" gate as if it weren't there.

### 9. "Wiring it all together" — emdash
OLD: Plus a **key** — any portable item whose `id` you put in `LockableTrait.keyId` — and **exits with `via`** pointing at the door from both sides.
NEW: Plus a **key** (any portable item whose `id` you put in `LockableTrait.keyId`) and **exits with `via`** pointing at the door from both sides.

### 10. Code comment (metal shelves) — emdash
OLD: `// The metal shelves — scenery, so "examine shelves" has something to find.`
NEW: `// The metal shelves: scenery, so "examine shelves" has something to find.`

### 11. Code comment (keycard) — emdash
OLD: `// The key — an ordinary item, placed at the entrance for the player to find.`
NEW: `// The key: an ordinary item, placed at the entrance for the player to find.`

### 12. Code comment (gate) — emdash
OLD: `// The gate — type DOOR, wearing all five traits, placed on the Main Path.`
NEW: `// The gate: type DOOR, wearing all five traits, placed on the Main Path.`

### 13. Key takeaway — emdash (still contains an em dash; not handled by the locked pass)
OLD: `LockableTrait` adds a lock on top, with `keyId` wiring one key to one lock — and keys are just ordinary items.
NEW: `LockableTrait` adds a lock on top, with `keyId` wiring one key to one lock, and keys are just ordinary items.
