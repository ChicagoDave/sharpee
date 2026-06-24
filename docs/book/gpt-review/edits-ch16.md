# Ch 16 — Custom Traits & Behaviors: edit proposals

The prose is clean and steady, so this pass is entirely em-dash removal. I left
the working prose alone rather than manufacture changes. Each entry: location,
reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: This chapter steps back to the layer those traits live in — the world model — and shows how to build your own trait, and the **behavior** that owns the rules around it, when the standard kit doesn't carry the state your story needs.
NEW: This chapter steps back to the layer those traits live in, the world model, and shows how to build your own trait, and the **behavior** that owns the rules around it, when the standard kit doesn't carry the state your story needs.

### 2. "Traits are data; behaviors are rules" first bullet — emdash
OLD: It holds the state an entity carries — a name, a capacity, whether a light is lit — and nothing else.
NEW: It holds the state an entity carries (a name, a capacity, whether a light is lit) and nothing else.

### 3. Same section, LightSourceTrait paragraph — emdash
OLD: `LightSourceTrait` is just fields — `brightness`, `isLit`, `fuelRemaining`. The matching `LightSourceBehavior` is where the *logic* lives:
NEW: `LightSourceTrait` is just fields: `brightness`, `isLit`, `fuelRemaining`. The matching `LightSourceBehavior` is where the *logic* lives:

### 4. Same section, closing line — emdash
OLD: This is the same principle you met in Chapter 10 from the action side — *behaviors own mutations, actions coordinate them*.
NEW: This is the same principle you met in Chapter 10 from the action side: *behaviors own mutations, actions coordinate them*.

### 5. "Defining a custom trait" — emdash
OLD: By convention, custom trait types take a story-specific prefix — `zoo.trait.…` — to stay clear of the platform's built-ins.
NEW: By convention, custom trait types take a story-specific prefix, `zoo.trait.…`, to stay clear of the platform's built-ins.

### 6. Same section, next paragraph — emdash
OLD: The state it needs — a count of charges — isn't in any standard trait, so you write one:
NEW: The state it needs, a count of charges, isn't in any standard trait, so you write one:

### 7. After the trait code — emdash
OLD: That's the whole trait — pure data and a constructor that copies in any overrides, exactly like the built-ins.
NEW: That's the whole trait: pure data and a constructor that copies in any overrides, exactly like the built-ins.

### 8. "Defining the behavior" intro — emdash
OLD: the *rule* — "you can dispense only while charges remain, and each use spends one" — belongs in a behavior.
NEW: the *rule* ("you can dispense only while charges remain, and each use spends one") belongs in a behavior.

### 9. After the behavior code — emdash
OLD: That keeps it pure and testable — you can call `DispenserBehavior.dispense(d)` in a test and assert the count dropped, with no parser, no turn, no text in the way.
NEW: That keeps it pure and testable: you can call `DispenserBehavior.dispense(d)` in a test and assert the count dropped, with no parser, no turn, no text in the way.

### 10. "Putting the pair to work" — emdash
OLD: A trait and behavior are inert on their own — something has to *call* the behavior.
NEW: A trait and behavior are inert on their own; something has to *call* the behavior.

### 11. Code comment (success branch) — emdash
OLD: `  // success — hand out a serving of feed`
NEW: `  // success: hand out a serving of feed`

### 12. Code comment (empty branch) — emdash
OLD: `  // empty — report that it's out`
NEW: `  // empty: report that it's out`

### 13. "Which tool, when?" closing paragraph — emdash
OLD: If an object needs to remember something the standard traits don't model — charges, a temperature, a loyalty score — and needs rules around how that something changes, that's a trait-and-behavior.
NEW: If an object needs to remember something the standard traits don't model (charges, a temperature, a loyalty score) and needs rules around how that something changes, that's a trait-and-behavior.
