# Ch 25 — The Web Client: edit proposals

Entirely em-dash removal. The prose is clean otherwise and the code comments are
already dash-free. Each entry: location, reason, OLD → NEW.

---

### 1. "What the client is responsible for" — emdash
OLD: it holds the DOM, runs the input box, draws the menus and save dialogs, and — most importantly — receives each turn packet and paints it.
NEW: it holds the DOM, runs the input box, draws the menus and save dialogs, and, most importantly, receives each turn packet and paints it.

### 2. After the three-call code block — emdash
OLD: You rarely write this by hand — `sharpee build --browser` generates the entry point and the host page for you.
NEW: You rarely write this by hand. `sharpee build --browser` generates the entry point and the host page for you.

### 3. "How a turn reaches the screen" — emdash
OLD: Inside `connectEngine`, the client builds a **renderer** — the consumer-side host from the previous chapter — and subscribes to exactly two engine signals:
NEW: Inside `connectEngine`, the client builds a **renderer** (the consumer-side host from the previous chapter) and subscribes to exactly two engine signals:

### 4. "Why no framework" — emdash
OLD: State that *would* be component props lives instead in `--modifier` classes and standard ARIA attributes — an open menu carries `--open` and `aria-expanded`, a checked theme carries `--checked`.
NEW: State that *would* be component props lives instead in `--modifier` classes and standard ARIA attributes: an open menu carries `--open` and `aria-expanded`, a checked theme carries `--checked`.

### 5. "Overriding a renderer" — emdash
OLD: After the platform defaults are in place — available from `connectEngine` onward — a story grabs the renderer and registers its own.
NEW: After the platform defaults are in place, available from `connectEngine` onward, a story grabs the renderer and registers its own.

### 6. "Replacing an existing channel's renderer" — emdash
OLD: A standard channel like `score` already renders into a platform element — the status line.
NEW: A standard channel like `score` already renders into a platform element, the status line.

### 7. After the score code block — emdash
OLD: You're not adding anything to the page — the score element is already there; you're only changing what gets written into it.
NEW: You're not adding anything to the page. The score element is already there; you're only changing what gets written into it.

### 8. "Rendering a channel you invented" — emdash
OLD: A channel you created in `registerChannels` (the `zoo.ambience` channel from the last chapter) has no place on the page yet — the platform doesn't know it exists, so left alone its value falls to the renderer's JSON-tree fallback.
NEW: A channel you created in `registerChannels` (the `zoo.ambience` channel from the last chapter) has no place on the page yet. The platform doesn't know it exists, so left alone its value falls to the renderer's JSON-tree fallback.

### 9. "Save, restore, and theme" — emdash
OLD: Theme switching is one attribute flip on the document — the subject of the next chapter.
NEW: Theme switching is one attribute flip on the document, the subject of the next chapter.
