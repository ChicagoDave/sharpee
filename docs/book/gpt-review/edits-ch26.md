# Ch 26 — Decoration & Theming: edit proposals

Mostly em-dash removal, including two inside code comments, plus one section
heading. The prose is dense but clear; I left it alone except for the dashes.
Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: Channels carry data, and the client paints it — but the data still has to *say* something about emphasis, and the page still has to *look* like something.
NEW: Channels carry data, and the client paints it, but the data still has to *say* something about emphasis, and the page still has to *look* like something.

### 2. "Decoration: styling without HTML on the wire" — emdash
OLD: Volume V's formatter chain handled *grammar* — articles and capitalization inside a message template.
NEW: Volume V's formatter chain handled *grammar*: articles and capitalization inside a message template.

### 3. After the bracket-syntax example — emdash
OLD: The prose pipeline turns each bracket into a structured decoration node — `[em:Zork]` becomes `{ className: 'sharpee-em', content: ['Zork'] }` — and the browser renderer turns *that* into `<span class="sharpee-em">Zork</span>`.
NEW: The prose pipeline turns each bracket into a structured decoration node, so `[em:Zork]` becomes `{ className: 'sharpee-em', content: ['Zork'] }`, and the browser renderer turns *that* into `<span class="sharpee-em">Zork</span>`.

### 4. "Platform vocabulary" — emdash
OLD: Write a name the platform *doesn't* know — `[thief-taunt:Hold still!]` — and it emits `<span class="thief-taunt">` verbatim, with no prefix, and your story's CSS owns the styling completely.
NEW: Write a name the platform *doesn't* know, such as `[thief-taunt:Hold still!]`, and it emits `<span class="thief-taunt">` verbatim, with no prefix, and your story's CSS owns the styling completely.

### 5. "Theming: one DOM, many skins" — emdash
OLD: Sharpee's theming model (ADR-170) rests on two commitments. First, a stable **component vocabulary** — a fixed set of class names the DOM always uses, regardless of theme:
NEW: Sharpee's theming model (ADR-170) rests on two commitments. First, a stable **component vocabulary**: a fixed set of class names the DOM always uses, regardless of theme:

### 6. "Theming: one DOM, many skins" — emdash
OLD: Second — and this is the part ADR-188 settled — the platform ships a **theme engine**, and a theme is *data*.
NEW: Second, and this is the part ADR-188 settled, the platform ships a **theme engine**, and a theme is *data*.

### 7. Code comment in the engine CSS block — emdash
OLD: `/* the engine — shipped by the platform, written once, never per theme */`
NEW: `/* the engine, shipped by the platform, written once, never per theme */`

### 8. After the engine CSS block — emdash
OLD: The engine also ships the default token values on `:root` — the `classic` white-on-blue palette — so the page is **always** skinned, even with no theme selected.
NEW: The engine also ships the default token values on `:root`, the `classic` white-on-blue palette, so the page is **always** skinned, even with no theme selected.

### 9. "the published contract" paragraph — emdash
OLD: So the contract between platform and author is now the **tokens**, not a pile of per-theme component rules — the variables aren't a convenience *inside* a theme, they *are* the theme.
NEW: So the contract between platform and author is now the **tokens**, not a pile of per-theme component rules. The variables aren't a convenience *inside* a theme, they *are* the theme.

### 10. Same paragraph — emdash (two dashes around the flip example)
OLD: Switching is still one attribute flip — `data-theme="modern-dark"` → `data-theme="zoo-sunny"` — and the whole page re-skins, because the engine re-reads the tokens.
NEW: Switching is still one attribute flip, from `data-theme="modern-dark"` to `data-theme="zoo-sunny"`, and the whole page re-skins, because the engine re-reads the tokens.

### 11. Same paragraph — emdash
OLD: an unset token, an unknown `data-theme`, or a selected theme that isn't wired into the build all resolve to the `:root` default — the page is never unskinned.
NEW: an unset token, an unknown `data-theme`, or a selected theme that isn't wired into the build all resolve to the `:root` default, so the page is never unskinned.

### 12. "Applying themes" — emdash
OLD: The build reads that list, copies in any theme CSS, links it after the engine, and builds the theme menu — the `classic` default plus one entry per theme you list.
NEW: The build reads that list, copies in any theme CSS, links it after the engine, and builds the theme menu: the `classic` default plus one entry per theme you list.

### 13. "Built-in themes" heading — emdash
OLD: ### Built-in themes — list the id
NEW: ### Built-in themes: list the id

### 14. "Built-in themes" body — emdash
OLD: (plus `classic`, the white-on-blue default, which is always present). To offer some of them, just list their **ids** — no installs, no extra dependencies:
NEW: (plus `classic`, the white-on-blue default, which is always present). To offer some of them, just list their **ids**, with no installs and no extra dependencies:

### 15. "Your own theme" heading — emdash
OLD: ### Your own theme — three lines of CSS and one list entry
NEW: ### Your own theme: three lines of CSS and one list entry

### 16. Flourish paragraph — emdash (two dashes around the aside)
OLD: If you *want* to push past the tokens — Family Zoo, for instance, deliberately puts its green on the title and menu bars instead of the engine's default (the status bar) — add a few **flourish** rules under the same `[data-theme]` selector in that same stylesheet:
NEW: If you *want* to push past the tokens (Family Zoo, for instance, deliberately puts its green on the title and menu bars instead of the engine's default, the status bar), add a few **flourish** rules under the same `[data-theme]` selector in that same stylesheet:

### 17. "Sharing a theme across stories" callout — emdash
OLD: The same `[data-theme]` block can instead be published as a small npm package other authors install and list by name — the path the built-ins themselves use internally.
NEW: The same `[data-theme]` block can instead be published as a small npm package other authors install and list by name, the path the built-ins themselves use internally.

### 18. "The status line" — emdash
OLD: The bar across the top — *Toucan Enclosure · Score: 12 · Turns: 47* — is not a special widget.
NEW: The bar across the top, *Toucan Enclosure · Score: 12 · Turns: 47*, is not a special widget.

### 19. "The status line" — emdash
OLD: Nothing about the status line is privileged — it's the universal channel mechanism pointed at a strip of the page.
NEW: Nothing about the status line is privileged. It's the universal channel mechanism pointed at a strip of the page.
