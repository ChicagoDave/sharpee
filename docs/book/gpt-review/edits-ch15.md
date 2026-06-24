# Ch 15 — Capability Dispatch: edit proposals

Title and opening paragraph were already revised and clean, so this pass sweeps
the rest of the body. It is entirely em-dash removal; the prose is otherwise
plain and I left it alone. Each entry: location, reason, OLD → NEW.

---

### 1. Code comment (behavior execute) — emdash
OLD: `    // no world mutation — petting is cosmetic`
NEW: `    // no world mutation; petting is cosmetic`

### 2. After the behavior code — emdash
OLD: `report()` and `blocked()` return `CapabilityEffect[]` — built with the `createEffect()` helper — rather than events directly.
NEW: `report()` and `blocked()` return `CapabilityEffect[]`, built with the `createEffect()` helper, rather than events directly.

### 3. "The mistake everyone makes once" box — emdash
OLD: The registry holds exactly one behavior per trait type + capability — a second registration replaces the first.
NEW: The registry holds exactly one behavior per trait type + capability; a second registration replaces the first.

### 4. "The dispatch action" intro — emdash
OLD: Writing it by hand shows exactly what dispatch does — find the trait that claims the capability, look up its behavior, and delegate each phase:
NEW: Writing it by hand shows exactly what dispatch does: find the trait that claims the capability, look up its behavior, and delegate each phase.

### 5. After the dispatch-action code — emdash
OLD: An entity with no `PettableTrait` falls out at `findTraitWithCapability()` and gets the `CANT_PET` message — petting the hay bale just tells you that you can't.
NEW: An entity with no `PettableTrait` falls out at `findTraitWithCapability()` and gets the `CANT_PET` message; petting the hay bale just tells you that you can't.

### 6. "Making the zoo's animals pettable" — emdash
OLD: The goats (from Chapter 4) and rabbits (from Chapter 5) are already scenery in the Petting Zoo — give each a `PettableTrait` carrying its kind.
NEW: The goats (from Chapter 4) and rabbits (from Chapter 5) are already scenery in the Petting Zoo, so give each a `PettableTrait` carrying its kind.

### 7. Code comment (petting-zoo animals) — emdash
OLD: `// The petting-zoo animals — already in the world, now pettable.`
NEW: `// The petting-zoo animals, already in the world, now pettable.`

### 8. After the trait-adding code — emdash
OLD: With `goats`, `rabbits`, and `parrot` all carrying a `PettableTrait`, every `pet` command in the walkthrough below resolves — and each animal's `animalKind` selects its own outcome from the single behavior.
NEW: With `goats`, `rabbits`, and `parrot` all carrying a `PettableTrait`, every `pet` command in the walkthrough below resolves, and each animal's `animalKind` selects its own outcome from the single behavior.

### 9. "How it fits together" follow-up — emdash
OLD: Type `pet parrot` and the same path runs — but `animalKind` is `'parrot'`, so the behavior returns the bite message instead.
NEW: Type `pet parrot` and the same path runs, but `animalKind` is `'parrot'`, so the behavior returns the bite message instead.
