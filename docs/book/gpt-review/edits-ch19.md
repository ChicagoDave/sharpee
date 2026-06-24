# Ch 19 — The Formatter Chain: edit proposals

Entirely em-dash removal. The prose is plain and well-paced; I left the working
sentences alone. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: The last chapter left a thread hanging: when a message parameter is an *entity*, the language layer renders its name with the right article and capitalization — "the toucan," "a flashlight," "Some feed."
NEW: The last chapter left a thread hanging: when a message parameter is an *entity*, the language layer renders its name with the right article and capitalization: "the toucan," "a flashlight," "Some feed."

### 2. "The problem with hardcoded articles" — emdash
OLD: It reads fine for "the brass key" — but the moment the object is a flashlight you wanted "a flashlight," or a proper name ("you pick up Captain," no article at all), or a mass noun ("you scatter some feed"), the baked-in "the" is wrong.
NEW: It reads fine for "the brass key," but the moment the object is a flashlight you wanted "a flashlight," or a proper name ("you pick up Captain," no article at all), or a mass noun ("you scatter some feed"), the baked-in "the" is wrong.

### 3. "Why pass the entity, not its name" — emdash
OLD: An article formatter can only choose correctly if it knows what kind of noun it's dealing with — is it a proper name? a mass noun? a plural?
NEW: An article formatter can only choose correctly if it knows what kind of noun it's dealing with: is it a proper name? a mass noun? a plural?

### 4. "Why pass the entity, not its name" closing — emdash
OLD: This is the practical reason the earlier chapters were careful about `IdentityTrait`'s `properName` and `article` fields — the formatter chain is what finally reads them.
NEW: This is the practical reason the earlier chapters were careful about `IdentityTrait`'s `properName` and `article` fields: the formatter chain is what finally reads them.

### 5. "Capitalization and other text formatters" — emdash
OLD: That's another formatter, and formatters **chain** — list several, separated by colons, and they apply in turn:
NEW: That's another formatter, and formatters **chain**: list several, separated by colons, and they apply in turn:

### 6. "Verb agreement" — emdash
OLD: `{is:item}` emits "is" or "are" depending on the entity's number — the same `grammaticalNumber: 'plural'` flag you set back in Chapter 5 (or `.plural()` on the `object()` builder).
NEW: `{is:item}` emits "is" or "are" depending on the entity's number, the same `grammaticalNumber: 'plural'` flag you set back in Chapter 5 (or `.plural()` on the `object()` builder).

### 7. "Lists" — emdash (two)
OLD: `{items:list}` joins an array into a natural English list — commas and a final "and" — and you can format each element before joining:
NEW: `{items:list}` joins an array into a natural English list, with commas and a final "and," and you can format each element before joining:
