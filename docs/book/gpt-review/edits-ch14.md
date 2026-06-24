# Ch 14 — Custom Actions: edit proposals

The prose is clean and well-paced, so this pass is almost entirely em-dash
removal, with one terseness restore. I left the working prose alone rather than
manufacture changes. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: When you need a brand-new verb, you write a **custom action** — and wiring one up means touching every layer of Sharpee at once: the action logic, the grammar that recognizes the words, and the language that holds the text.
NEW: When you need a brand-new verb, you write a **custom action**, and wiring one up means touching every layer of Sharpee at once: the action logic, the grammar that recognizes the words, and the language that holds the text.

### 2. Registration-methods paragraph — emdash
OLD: The action objects below are top-level `const`s; the three registration methods — `getCustomActions`, `extendParser`, `extendLanguage` — are members of your `FamilyZooStory` class, alongside `initializeWorld`.
NEW: The action objects below are top-level `const`s. The three registration methods (`getCustomActions`, `extendParser`, `extendLanguage`) are members of your `FamilyZooStory` class, alongside `initializeWorld`.

### 3. "The four-phase action" intro — emdash
OLD: Every action — standard or custom — implements the same four-phase pattern you met in *The Standard Actions*.
NEW: Every action, standard or custom, implements the same four-phase pattern you met in *The Standard Actions*.

### 4. Code comment (Phase 1) — emdash
OLD: `  // Phase 1 — can the action proceed?`
NEW: `  // Phase 1: can the action proceed?`

### 5. Code comment (Phase 2) — emdash
OLD: `  // Phase 2 — mutate the world (only runs if valid)`
NEW: `  // Phase 2: mutate the world (only runs if valid)`

### 6. Code comment (Phase 3) — emdash
OLD: `  // Phase 3 — success events (text output)`
NEW: `  // Phase 3: success events (text output)`

### 7. Code comment (Phase 4) — emdash
OLD: `  // Phase 4 — failure events (runs instead of execute/report if invalid)`
NEW: `  // Phase 4: failure events (runs instead of execute/report if invalid)`

### 8. After the four-phase code — emdash
OLD: Validation checks, world mutation, success text, and failure text each live in their own phase — never tangled together.
NEW: Validation checks, world mutation, success text, and failure text each live in their own phase, never tangled together.

### 9. "Passing data between phases" — emdash
OLD: This is the sanctioned way to carry data forward — don't recompute the target in every phase, and don't smuggle it onto the context object itself.
NEW: This is the sanctioned way to carry data forward: don't recompute the target in every phase, and don't smuggle it onto the context object itself.

### 10. "A second action: photographing" intro — emdash
OLD: `getCustomActions` and the grammar further down both reference a `photographAction` — here it is in full.
NEW: `getCustomActions` and the grammar further down both reference a `photographAction`; here it is in full.

### 11. Code comment (photograph execute) — emdash
OLD: `    // Photographs are cosmetic — nothing in the world changes.`
NEW: `    // Photographs are cosmetic; nothing in the world changes.`

### 12. After photograph code — emdash
OLD: The camera it looks for is an ordinary item — add it to the gift shop (the room from Chapter 13) in `initializeWorld`:
NEW: The camera it looks for is an ordinary item. Add it to the gift shop (the room from Chapter 13) in `initializeWorld`:

### 13. After extendParser code — emdash
OLD: You can register several patterns for the same action — `photo` and `snap` are aliases for `photograph`.
NEW: You can register several patterns for the same action; `photo` and `snap` are aliases for `photograph`.

### 14. Code comment (extendLanguage) — emdash
OLD: `  // Feed action — every FeedMessages id needs text, or the player sees raw ids.`
NEW: `  // Feed action: every FeedMessages id needs text, or the player sees raw ids.`

### 15. After extendLanguage code — emdash
OLD: A `{param}` placeholder in the text is filled from the `params` object the action passed — so `params: { target: name }` substitutes into `{target}`.
NEW: A `{param}` placeholder in the text is filled from the `params` object the action passed, so `params: { target: name }` substitutes into `{target}`.

### 16. "The mistake everyone makes once" box — emdash
OLD: A custom verb needs *all three* registrations — the action from `getCustomActions()`, the pattern from `extendParser()`, and the message text from `extendLanguage()`.
NEW: A custom verb needs *all three* registrations: the action from `getCustomActions()`, the pattern from `extendParser()`, and the message text from `extendLanguage()`.
