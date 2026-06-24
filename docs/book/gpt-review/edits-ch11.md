# Ch 11 — Scope & Visibility: edit proposals

Entirely em-dash removal; the prose is plain and well-paced, with nothing
genuinely terse or over-complex to rework. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: A key in the room is fair game; a key locked inside a closed box, or sitting in the next room, is not — even though both exist in the world.
NEW: A key in the room is fair game; a key locked inside a closed box, or sitting in the next room, is not, even though both exist in the world.

### 2. "What scope is" — emdash
OLD: When the parser resolves the word "key," it searches scope — not the whole world — which is why `examine sign` found the welcome sign in Chapter 2 but `examine sign` from a different room would not.
NEW: When the parser resolves the word "key," it searches scope, not the whole world, which is why `examine sign` found the welcome sign in Chapter 2 but `examine sign` from a different room would not.

### 3. "Degrees of access" list — emdash
OLD: - **In the room** — present in the player's location.
- **Visible** — can be *seen* (subject to light; see below).
- **Reachable** — can be physically *touched*.
- **Carried** / **worn** — already in the player's hands or on their body.
- **Audible** — can be *heard* even if not seen.
NEW: - **In the room**: present in the player's location.
- **Visible**: can be *seen* (subject to light; see below).
- **Reachable**: can be physically *touched*.
- **Carried** / **worn**: already in the player's hands or on their body.
- **Audible**: can be *heard* even if not seen.

### 4. After the list — emdash
OLD: Most of the time the standard actions pick the right degree for you — `examine` wants visibility, `take` wants reach — so you rarely think about it.
NEW: Most of the time the standard actions pick the right degree for you (`examine` wants visibility, `take` wants reach), so you rarely think about it.

### 5. "Sight and darkness" — emdash
OLD: In a dark room — the nocturnal exhibit from *Light & Dark* — the player can't see, so visual scope collapses to almost nothing.
NEW: In a dark room, such as the nocturnal exhibit from *Light & Dark*, the player can't see, so visual scope collapses to almost nothing.

### 6. "Permissive parser, strict action" — emdash
OLD: The action's `validate` phase then applies the *strict* rule — does this verb actually require sight? reach?
NEW: The action's `validate` phase then applies the *strict* rule: does this verb actually require sight? reach?

### 7. "Permissive parser, strict action" — emdash
OLD: Inside an action, the checks are simple helpers — `context.canSee(entity)` and `context.canReach(entity)` — so a custom action can be as strict or as lenient as its verb demands.
NEW: Inside an action, the checks are simple helpers, `context.canSee(entity)` and `context.canReach(entity)`, so a custom action can be as strict or as lenient as its verb demands.

### 8. Key takeaway — emdash (contains em dash, so fixed per instructions)
OLD: computed from the player's location and senses — the parser searches it, not the whole world, which is how `take key` finds the right key and ignores the one locked away.
NEW: computed from the player's location and senses. The parser searches it, not the whole world, which is how `take key` finds the right key and ignores the one locked away.
