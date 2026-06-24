# Ch 29 — Transcript Testing & Walkthroughs: edit proposals

The prose is clean; this pass is em-dash removal. Each entry: location, reason,
OLD → NEW.

---

### 1. "Asserting more than text" (Text bullet) — emdash
OLD: - **Text** — `contains`, `not contains`, `contains_any "a" "b"`, `matches /regex/i`.
NEW: - **Text**: `contains`, `not contains`, `contains_any "a" "b"`, `matches /regex/i`.

### 2. "Asserting more than text" (Events bullet) — emdash
OLD: - **Events** — `[EVENT: true, type="if.event.taken"]` asserts the engine emitted a
NEW: - **Events**: `[EVENT: true, type="if.event.taken"]` asserts the engine emitted a

### 3. "Asserting more than text" (Events bullet) — emdash
OLD:   text varies but its event shouldn't — e.g. confirming `feed goats` emits your
NEW:   text varies but its event shouldn't, e.g. confirming `feed goats` emits your

### 4. "Asserting more than text" (State bullet) — emdash
OLD: - **State** — `[STATE: true, player.inventory contains feed]` checks the world model
NEW: - **State**: `[STATE: true, player.inventory contains feed]` checks the world model

### 5. "Asserting more than text" (State bullet) — emdash
OLD: After `feed goats`, assert the `fed-…` state flag is set and the score went
  up — the actual effects, not the message describing them.
NEW: After `feed goats`, assert the `fed-…` state flag is set and the score went
  up: the actual effects, not the message describing them.

### 6. "Handling variable outcomes" — emdash
OLD: Real playthroughs aren't perfectly deterministic — an NPC might wander, a daemon might
fire on a different turn.
NEW: Real playthroughs aren't perfectly deterministic; an NPC might wander, a daemon might
fire on a different turn.

### 7. "Handling variable outcomes" (GOAL bullet) — emdash
OLD:   `[REQUIRES: …]` preconditions and `[ENSURES: …]` postconditions — the goal fails if
  the world isn't in the expected state before or after.
NEW:   `[REQUIRES: …]` preconditions and `[ENSURES: …]` postconditions, so the goal fails if
  the world isn't in the expected state before or after.
