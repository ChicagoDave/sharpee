# Ch 09 — The Map & Regions: edit proposals

Clean prose; entirely em-dash removal. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash (x2)
OLD: together the zoo's six rooms — entrance, main path, petting zoo, aviary, and the supply room and nocturnal exhibit behind the staff gate — form a small but complete map.
NEW: together the zoo's six rooms (entrance, main path, petting zoo, aviary, and the supply room and nocturnal exhibit behind the staff gate) form a small but complete map.

### 2. "The map is the exits" — emdash
OLD: The map *is* the set of exits you declared on each room — a graph of rooms joined by directions.
NEW: The map *is* the set of exits you declared on each room: a graph of rooms joined by directions.

### 3. "The map is the exits" bullet (doored connections) — emdash
OLD: The staff gate connection uses `via` so the door is actually checked (Chapter 7) — the map and the barrier on it are the same link.
NEW: The staff gate connection uses `via` so the door is actually checked (Chapter 7); the map and the barrier on it are the same link.

### 4. "Region-wide properties" — emdash (x2)
OLD: The reason to group rooms — beyond tidiness — is that a region can carry properties its rooms inherit.
NEW: The reason to group rooms, beyond tidiness, is that a region can carry properties its rooms inherit.

### 5. "Region-wide properties" — emdash
OLD: Setting `defaultDark: true` on, say, a cave region saves you marking every room `isDark` by hand — a property that belongs to the *area* lives on the area.
NEW: Setting `defaultDark: true` on, say, a cave region saves you marking every room `isDark` by hand: a property that belongs to the *area* lives on the area.

### 6. "Crossing the boundary" event list — emdash (x2)
OLD: - `if.event.region_exited` — once for each region being left,
- `if.event.region_entered` — once for each region being entered.
NEW: - `if.event.region_exited`, fired once for each region being left,
- `if.event.region_entered`, fired once for each region being entered.

### 7. "Crossing the boundary" — emdash
OLD: You react to them exactly the way you'll react to any event in Volume IV — by registering a handler:
NEW: You react to them exactly the way you'll react to any event in Volume IV, by registering a handler:

### 8. Code comment (region_entered handler) — emdash
OLD: `    // The visitor just slipped into the staff area — flavor, a warning,`
NEW: `    // The visitor just slipped into the staff area: flavor, a warning,`

### 9. "Crossing the boundary" closing paragraph — emdash
OLD: This is the natural home for "as you enter the old town, the noise of the market swells" — atmosphere keyed to an area instead of bolted onto every room's description.
NEW: This is the natural home for "as you enter the old town, the noise of the market swells": atmosphere keyed to an area instead of bolted onto every room's description.

### 10. "Nesting and querying" — emdash
OLD: And you can ask the world about membership at any time — `world.isInRegion(roomId, 'reg-staff')` for a yes/no, or, if you add the optional `@sharpee/queries` package, its entity-query API to list every room in an area:
NEW: And you can ask the world about membership at any time: `world.isInRegion(roomId, 'reg-staff')` gives a yes/no, or, if you add the optional `@sharpee/queries` package, its entity-query API lists every room in an area:

### 11. Key takeaway — emdash (still contains em dashes; not handled by the locked pass)
OLD: The map is nothing more than the exits you declare on each room — keep them reciprocal and consistent and the graph stays trustworthy.
NEW: The map is nothing more than the exits you declare on each room: keep them reciprocal and consistent and the graph stays trustworthy.

### 12. Key takeaway — emdash
OLD: fire `if.event.region_entered` / `region_exited` as the player crosses between them — the hook for area-wide atmosphere and events.
NEW: fire `if.event.region_entered` / `region_exited` as the player crosses between them, the hook for area-wide atmosphere and events.
