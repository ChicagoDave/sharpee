# Ch 18 — The Language Layer: edit proposals

Almost entirely em-dash removal. The prose is plain and well-paced; I left the
working sentences alone. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash (two)
OLD: Chapter 3 promised that **actions emit events, not text** — that the words the player reads are produced later, somewhere else.
NEW: Chapter 3 promised that **actions emit events, not text**, that the words the player reads are produced later, somewhere else.

### 2. "Intent here, words there" — emdash
OLD: `zoo.photo.took_photo` is not text — it's a name for a piece of text.
NEW: `zoo.photo.took_photo` is not text. It's a name for a piece of text.

### 3. "Intent here, words there" — emdash
OLD: Nothing in the engine, stdlib, or world model ever hardcodes a sentence — it all flows through IDs.
NEW: Nothing in the engine, stdlib, or world model ever hardcodes a sentence. It all flows through IDs.

### 4. "Parameters" — emdash
OLD: and the template's `{target}` is where that value lands — so photographing the toucan reads "Click! You snap a photo of the toucan."
NEW: and the template's `{target}` is where that value lands, so photographing the toucan reads "Click! You snap a photo of the toucan."

### 5. "Parameters" parenthetical — emdash
OLD: when a parameter is an *entity*, the language layer can render its name with the right article and capitalization — "the toucan," "a flashlight," "Some feed."
NEW: when a parameter is an *entity*, the language layer can render its name with the right article and capitalization: "the toucan," "a flashlight," "Some feed."

### 6. "Naming message IDs" — emdash (two)
OLD: - Built-in messages use the `if.*` namespace — `if.action.taking.taken`.
NEW: - Built-in messages use the `if.*` namespace, as in `if.action.taking.taken`.

### 7. "Naming message IDs" — emdash
OLD: - Your story's messages take a story prefix — `zoo.feeding.fed_goats`,
NEW: - Your story's messages take a story prefix, such as `zoo.feeding.fed_goats`,

### 8. "Why route everything through IDs" — emdash
OLD: **Restyling.** Terse or florid, second person or third — swap the templates, keep the behavior.
NEW: **Restyling.** Terse or florid, second person or third: swap the templates, keep the behavior.

### 9. "Why route everything through IDs" — emdash
OLD: Supplying your own text for an existing ID replaces what the player sees there — a way to reskin a standard response in your story's voice without touching the action behind it.
NEW: Supplying your own text for an existing ID replaces what the player sees there, a way to reskin a standard response in your story's voice without touching the action behind it.

### 10. "Why route everything through IDs" closing — emdash
OLD: Wherever your story produces player-facing words — actions, and the event handlers from Chapter 13 — prefer a message ID over an inline string, so the text stays in the layer built to hold it.
NEW: Wherever your story produces player-facing words, whether in actions or in the event handlers from Chapter 13, prefer a message ID over an inline string, so the text stays in the layer built to hold it.
