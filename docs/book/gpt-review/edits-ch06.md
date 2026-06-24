# Ch 06 — Containers & Supporters: edit proposals

Clean prose; entirely em-dash removal. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: Two new traits cover both cases — and the difference between them is the difference between *in* and *on*.
NEW: Two new traits cover both cases, and the difference between them is the difference between *in* and *on*.

### 2. "Two kinds of holders" list — emdash (x2)
OLD: - **`ContainerTrait`** — things go *inside*. Backpacks, boxes, drawers, dispensers.
- **`SupporterTrait`** — things go *on top*. Tables, shelves, benches, pedestals.
NEW: - **`ContainerTrait`**: things go *inside*. Backpacks, boxes, drawers, dispensers.
- **`SupporterTrait`**: things go *on top*. Tables, shelves, benches, pedestals.

### 3. "Two kinds of holders" — emdash
OLD: "put X **in** Y" routes to the container; "put X **on** Y" routes to the supporter. You never write that logic — you just declare which kind of holder each object is.
NEW: "put X **in** Y" routes to the container; "put X **on** Y" routes to the supporter. You never write that logic; you just declare which kind of holder each object is.

### 4. After the backpack code — emdash
OLD: Because we *didn't* add `SceneryTrait`, this backpack is portable — and that's where containers get interesting.
NEW: Because we *didn't* add `SceneryTrait`, this backpack is portable, and that's where containers get interesting.

### 5. "Portable vs fixed containers" — emdash (x2)
OLD: A bag of five items counts as **one** item in the player's own inventory. A fixed container — the dispenser below — is for built-in storage the player can reach into but never walk off with:
NEW: A bag of five items counts as **one** item in the player's own inventory. A fixed container, like the dispenser below, is for built-in storage the player can reach into but never walk off with:

### 6. After the dispenser code — emdash
OLD: A fixed container still needs its own `IdentityTrait` — the name and aliases are how the player refers to it (`examine dispenser`) — and its `moveEntity`, which bolts it into the Petting Zoo.
NEW: A fixed container still needs its own `IdentityTrait` (the name and aliases are how the player refers to it, as in `examine dispenser`) and its `moveEntity`, which bolts it into the Petting Zoo.

### 7. "SupporterTrait" — emdash
OLD: The key behavioral difference from a container: supporters are always **open** — whatever sits on a bench is visible without any special action.
NEW: The key behavioral difference from a container: supporters are always **open**, so whatever sits on a bench is visible without any special action.

### 8. "Capacity limits" — emdash
OLD: Capacity isn't just bookkeeping — limited space is the raw material of puzzles, forcing the player to choose what to carry and what to leave behind.
NEW: Capacity isn't just bookkeeping. Limited space is the raw material of puzzles, forcing the player to choose what to carry and what to leave behind.

### 9. "Traits are composable" — emdash
OLD: The real lesson of this chapter isn't either trait on its own — it's that an entity can wear several traits at once, and they stack cleanly:
NEW: The real lesson of this chapter isn't either trait on its own. It's that an entity can wear several traits at once, and they stack cleanly:

### 10. Key takeaway — emdash (still contains em dashes; not handled by the locked pass)
OLD: Either can be portable or fixed depending on whether it also has `SceneryTrait`, and a portable container carries its contents with it as a single inventory item. Set `capacity` to bound them — and remember that traits are composable, so you build each object by stacking the small traits it needs.
NEW: Either can be portable or fixed depending on whether it also has `SceneryTrait`, and a portable container carries its contents with it as a single inventory item. Set `capacity` to bound them, and remember that traits are composable, so you build each object by stacking the small traits it needs.
