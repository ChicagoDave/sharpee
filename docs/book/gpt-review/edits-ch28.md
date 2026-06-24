# Ch 28 — The Multi-File Story: edit proposals

The prose is clean and well-paced; this pass is em-dash removal. Each entry:
location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: A real story is all of it at once — and by now the Family Zoo has grown past what one file should hold.
NEW: A real story is all of it at once, and by now the Family Zoo has grown past what one file should hold.

### 2. "When one file stops working" — emdash
OLD: A single file that large is hard to navigate and harder to change — touching the scoring rules means scrolling past the map, the items, and the parser grammar to find them.
NEW: A single file that large is hard to navigate and harder to change. Touching the scoring rules means scrolling past the map, the items, and the parser grammar to find them.

### 3. Table row (zoo-map.ts) — emdash
OLD: | `zoo-map.ts` | rooms, exits, scenery — the physical zoo |
NEW: | `zoo-map.ts` | rooms, exits, scenery: the physical zoo |

### 4. "Organizing by concern" — emdash
OLD: The petting feature's trait, its capability behavior, and its prose can each live near the rest of *their* concern — the animal in `characters.ts`, the message in `language.ts` — because that's what you'll edit together when you change how petting works.
NEW: The petting feature's trait, its capability behavior, and its prose can each live near the rest of *their* concern (the animal in `characters.ts`, the message in `language.ts`) because that's what you'll edit together when you change how petting works.

### 5. "The index wires it together" — emdash
OLD: `index.ts` holds the `Story` class — the same four hooks you've used all along, now calling out to the builder functions instead of doing the work inline:
NEW: `index.ts` holds the `Story` class: the same four hooks you've used all along, now calling out to the builder functions instead of doing the work inline:

### 6. "The index wires it together" — emdash
OLD: The class reads like a table of contents for the story — which is exactly what a wiring file should be.
NEW: The class reads like a table of contents for the story, which is exactly what a wiring file should be.

### 7. "A feature that spans the files" — emdash
OLD: After enough turns the zoo closes: the zookeeper leaves, and the animals — freed from human ears — start to talk.
NEW: After enough turns the zoo closes: the zookeeper leaves, and the animals, freed from human ears, start to talk.

### 8. "A feature that spans the files" — emdash
OLD: The feature is *more* ambitious than anything before it, and yet no single file became harder to read — which is the entire payoff of organizing by concern.
NEW: The feature is *more* ambitious than anything before it, and yet no single file became harder to read, which is the entire payoff of organizing by concern.
