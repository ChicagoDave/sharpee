# Em-dash review — Chapter 10: Standard Actions & the Four-Phase Model

Five em-dash occurrences across five lines. Lines 55, 62, 70, and 78 are `###` section headings (recast the gloss-introducing dash to a colon). Line 64 is a prose paragraph whose dash sets off an appositive list; recast to a colon there too.

### 1. Line 55 — `validate` section heading — heading
OLD:
### validate — can this happen?

NEW:
### validate: can this happen?

### 2. Line 62 — `execute` section heading — heading
OLD:
### execute — change the world

NEW:
### execute: change the world

### 3. Line 64 — `execute` phase paragraph — prose
OLD:
If validation passed, `execute` runs and performs the actual mutation — moving the
item into the player's inventory, flipping `isOpen` to `true`. This is the *only*
phase that changes game state, and it's meant to be small. The real work usually
lives in a **behavior** (more on those in Volume IV), with `execute` just
coordinating it.

NEW:
If validation passed, `execute` runs and performs the actual mutation: moving the
item into the player's inventory, flipping `isOpen` to `true`. This is the *only*
phase that changes game state, and it's meant to be small. The real work usually
lives in a **behavior** (more on those in Volume IV), with `execute` just
coordinating it.

### 4. Line 70 — `report` section heading — heading
OLD:
### report — record what happened

NEW:
### report: record what happened

### 5. Line 78 — `blocked` section heading — heading
OLD:
### blocked — explain the refusal

NEW:
### blocked: explain the refusal
