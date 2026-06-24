# Ch 23 — Scoring & Endgame: edit proposals

Em-dash removal in prose and code comments. The prose is clean; left it alone where
it worked. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash (two in one sentence)
OLD: The zoo gives points for
seeing the sights and doing the activities — visiting each exhibit, feeding the
animals, pressing a souvenir penny, reading the brochure — and when the player has
done it all, the game declares victory.
NEW: The zoo gives points for
seeing the sights and doing the activities (visiting each exhibit, feeding the
animals, pressing a souvenir penny, reading the brochure), and when the player has
done it all, the game declares victory.

### 2. Code comment "Award points — idempotent" — emdash
OLD: `// Award points — idempotent: the same ID never scores twice`
NEW: `// Award points (idempotent): the same ID never scores twice`

### 3. "The mistake everyone makes once" (score ID) — emdash
OLD: the second achievement
silently never scores — the ledger thinks it's already been counted.
NEW: the second achievement
silently never scores; the ledger thinks it's already been counted.

### 4. "Two more tables finish the setup" — emdash
OLD: Two more tables finish the setup — one maps room names to their visit-score id (the
room-visit handler reads it), and one holds the endgame message id:
NEW: Two more tables finish the setup: one maps room names to their visit-score id (the
room-visit handler reads it), and one holds the endgame message id.

### 5. "Awarding points as the player plays" prose — emdash
OLD: Some awards live inside a
custom action or capability behavior — petting an animal awards its points right
in the behavior's `execute()`:
NEW: Some awards live inside a
custom action or capability behavior; petting an animal awards its points right
in the behavior's `execute()`:

### 6. Code comment "scoring is silent — no custom event" — emdash
OLD: `  return null;   // scoring is silent — no custom event`
NEW: `  return null;   // scoring is silent; no custom event`

### 7. "With all twelve awards in place" — emdash
OLD: Leave any of these four out and
the game caps at 40 (or wherever you stopped) and the win never fires — a useful
reminder that the max score and the awarding code have to agree.
NEW: Leave any of these four out and
the game caps at 40 (or wherever you stopped) and the win never fires, a useful
reminder that the max score and the awarding code have to agree.

### 8. "The victory daemon" — emdash
OLD: The win condition is checked by a daemon — exactly the scheduler pattern from the
last chapter.
NEW: The win condition is checked by a daemon, exactly the scheduler pattern from the
last chapter.

### 9. Victory message text — emdash (player-facing prose in addMessage)
OLD: "Congratulations! You've earned your JUNIOR ZOOKEEPER badge — you visited " +
NEW: "Congratulations! You've earned your JUNIOR ZOOKEEPER badge. You visited " +

### 10. "Try it" block comments — emdash (three lines)
OLD: `> score                     Check the score — 0 out of 75`
`> south; east               Visit the petting zoo — +5`
`> score                     75 out of 75 — victory!`
NEW: `> score                     Check the score: 0 out of 75`
`> south; east               Visit the petting zoo, +5`
`> score                     75 out of 75, victory!`
