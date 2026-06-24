# Ch 13 — Event Handlers: edit proposals (CALIBRATION SAMPLE)

This chapter's prose is already plain and well-paced, so this is almost entirely
em-dash removal. I found nothing genuinely terse or over-complex to rework, and
I left the working prose alone rather than manufacture changes. Each entry: location,
reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: So far every object in the zoo has *been* something — scenery, a container, a readable sign.
NEW: So far every object in the zoo has *been* something: scenery, a container, a readable sign.

### 2. Opening paragraph — emdash
OLD: Neither of those is a new verb — the player is using ordinary `drop` and `put in`.
NEW: Neither of those is a new verb. The player is using ordinary `drop` and `put in`.

### 3. "The mistake everyone makes once" box — emdash
OLD: The event processor treats a `game.message` returned from a handler as an *override* of the original action's text — so instead of adding your reaction, it replaces the "You drop the feed." line.
NEW: The event processor treats a `game.message` returned from a handler as an *override* of the original action's text, so instead of adding your reaction it replaces the "You drop the feed." line.

### 4. "Reading the event data" — emdash
OLD: Compare against `itemId` — names aren't unique, IDs are.
NEW: Compare against `itemId`. Names aren't unique; IDs are.

### 5. "Reaction pattern: the goats eat the feed" — emdash
OLD: Putting it together — when the player drops the feed in the petting zoo, the goats react, but only once:
NEW: Putting it together: when the player drops the feed in the petting zoo, the goats react, but only once:

### 6. After the transformation code — emdash
OLD: The `{ key: '...' }` option gives each handler a unique identifier — important so the engine can manage handlers across saves and reloads.
NEW: The `{ key: '...' }` option gives each handler a unique identifier, which the engine needs to manage handlers across saves and reloads.

### 7. Key takeaway — emdash
OLD: …guard one-time reactions with a state flag, and never return `game.message` from a chain handler — use a custom event type so your reaction adds to the action's text instead of replacing it.
NEW: …guard one-time reactions with a state flag, and never return `game.message` from a chain handler. Use a custom event type so your reaction adds to the action's text instead of replacing it.

### 8. Code comment (in the silent-vs-chain example) — emdash
OLD: `    if (data.itemId !== feedId) return null;   // not our item — ignore`
NEW: `    if (data.itemId !== feedId) return null;   // not our item, ignore`
