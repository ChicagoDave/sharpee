# Ch 03 — The Play Loop: edit proposals

Em-dash removal across the chapter. The "Events become text" section was already
revised and is clean there, so it is left untouched; the sweep covers the rest.
The Key takeaway still contained an em dash, so it is included. Each entry:
location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: This chapter opens the hood on that exchange — what the engine does in the moment between the player's keystroke and the next prompt.
NEW: This chapter opens the hood on that exchange: what the engine does in the moment between the player's keystroke and the next prompt.

### 2. "The loop" — emdash
OLD: This is the **play loop**, and the engine provides it. You never write it; you supply the world it operates on. A "turn" is one trip through step 3 — and that step has more going on inside it than it looks.
NEW: This is the **play loop**, and the engine provides it. You never write it; you supply the world it operates on. A "turn" is one trip through step 3, and that step has more going on inside it than it looks.

### 3. "Parse" — emdash
OLD: The **parser** turns the raw text into a structured command — a verb and its noun phrases.
NEW: The **parser** turns the raw text into a structured command: a verb and its noun phrases.

### 4. "Resolve scope" — emdash
OLD: Next the engine matches those words to actual entities — and only the ones the player can currently perceive.
NEW: Next the engine matches those words to actual entities, and only the ones the player can currently perceive.

### 5. "Resolve scope" — emdash
OLD: Scope is also what lets the player call things by their aliases — the `aliases` you put on an `IdentityTrait` back in Chapter 2.
NEW: Scope is also what lets the player call things by their aliases, the `aliases` you put on an `IdentityTrait` back in Chapter 2.

### 6. "Run the action" intro — emdash
OLD: With a verb and a resolved object in hand, the matching **action** runs. Every action — the standard ones, and any you write later — moves through the same phases:
NEW: With a verb and a resolved object in hand, the matching **action** runs. Every action, the standard ones and any you write later, moves through the same phases:

### 7. "Run the action" bullet (validate) — emdash
OLD: - **validate** — *can this happen?* Is the sign here, and is it something you can examine? If not, the action is **blocked** and reports why.
NEW: - **validate**: *can this happen?* Is the sign here, and is it something you can examine? If not, the action is **blocked** and reports why.

### 8. "Run the action" bullet (execute) — emdash
OLD: - **execute** — *change the world,* if anything changes. (Examining changes nothing; taking moves an item into your hands.)
NEW: - **execute**: *change the world,* if anything changes. (Examining changes nothing; taking moves an item into your hands.)

### 9. "Run the action" bullet (report) — emdash
OLD: - **report** — *record what happened.*
NEW: - **report**: *record what happened.*

### 10. "Run the action" closing — emdash
OLD: For now, the shape — check, change, report — is all you need.
NEW: For now, the shape (check, change, report) is all you need.

### 11. "Everyone else takes a turn" — emdash
OLD: Once the player's action resolves, the rest of the world gets to move: NPCs act, and timed events — countdowns and background processes — tick forward.
NEW: Once the player's action resolves, the rest of the world gets to move: NPCs act, and timed events (countdowns and background processes) tick forward.

### 12. "One turn, start to finish" bullet (Parse) — emdash
OLD: - **Parse** — the examining action, applied to "sign."
NEW: - **Parse**: the examining action, applied to "sign."

### 13. "One turn, start to finish" bullet (Scope) — emdash
OLD: - **Scope** — "sign" resolves to the welcome sign in the room.
NEW: - **Scope**: "sign" resolves to the welcome sign in the room.

### 14. "One turn, start to finish" bullet (Action) — emdash
OLD: - **Action** — examining validates (the sign is here and in scope), executes (nothing to change), and reports an event carrying the sign's description.
NEW: - **Action**: examining validates (the sign is here and in scope), executes (nothing to change), and reports an event carrying the sign's description.

### 15. "One turn, start to finish" bullet (Text) — emdash
OLD: - **Text** — the engine renders that event into the sign's description, and it prints.
NEW: - **Text**: the engine renders that event into the sign's description, and it prints.

### 16. "One turn, start to finish" bullet (Other actors) — emdash
OLD: - **Other actors** — nothing else lives in this tiny world yet, so the turn ends.
NEW: - **Other actors**: nothing else lives in this tiny world yet, so the turn ends.

### 17. Key takeaway — emdash
OLD: **actions emit events, not text** — the words are produced later, by the language layer — and that single separation is what makes a Sharpee story translatable, restylable, and able to stay quiet in the dark.
NEW: **actions emit events, not text**. The words are produced later, by the language layer, and that single separation is what makes a Sharpee story translatable, restylable, and able to stay quiet in the dark.
