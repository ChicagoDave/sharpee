# Ch 10 — The Standard Actions: edit proposals

Almost entirely em-dash removal; the prose is otherwise clear and well-paced.
Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: Everything the player could do already worked — `take`, `drop`, `open`, `go`, `examine` — and you never wrote a line of code to make it so.
NEW: Everything the player could do already worked: `take`, `drop`, `open`, `go`, `examine`. You never wrote a line of code to make it so.

### 2. "One shape for every action" — emdash
OLD: Every action — the standard ones above, and the custom ones you'll write in Volume IV — has the same four-part structure.
NEW: Every action, the standard ones above and the custom ones you'll write in Volume IV, has the same four-part structure.

### 3. "execute — change the world" — emdash
OLD: This is the *only* phase that changes game state, and it's meant to be small: the real work usually lives in a **behavior** (more on those in Volume IV), with `execute` just coordinating it.
NEW: This is the *only* phase that changes game state, and it's meant to be small. The real work usually lives in a **behavior** (more on those in Volume IV), with `execute` just coordinating it.

### 4. "report — record what happened" — emdash
OLD: `report` produces the **events** for the turn — the `if.event.taken`, `if.event.opened` records you met in Chapter 3, each carrying a message id rather than text.
NEW: `report` produces the **events** for the turn: the `if.event.taken` and `if.event.opened` records you met in Chapter 3, each carrying a message id rather than text.

### 5. "blocked — explain the refusal" — emdash
OLD: Its job is to turn the validation error into an event the player can understand — "You can't take that."
NEW: Its job is to turn the validation error into an event the player can understand, such as "You can't take that."

### 6. "Why the discipline matters" — emdash
OLD: Splitting an action into four phases with strict rules — *mutations only in execute, events only in report* — is not bureaucracy.
NEW: Splitting an action into four phases with strict rules (*mutations only in execute, events only in report*) is not bureaucracy.

### 7. "Validation can be trusted" bullet — emdash
OLD: the engine can ask "would this work?" without side effects — which is how the parser can disambiguate and how a command can be checked before it commits.
NEW: the engine can ask "would this work?" without side effects, which is how the parser can disambiguate and how a command can be checked before it commits.

### 8. Closing paragraph — emdash
OLD: You won't write an action in this chapter — the standard library already covers the zoo.
NEW: You won't write an action in this chapter, because the standard library already covers the zoo.

### 9. Key takeaway — emdash (contains em dash, so fixed per instructions)
OLD: each wired to the traits you add to entities — no registration required.
NEW: each wired to the traits you add to entities, with no registration required.
