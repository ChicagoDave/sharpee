# Ch 01 — Installing Sharpee: edit proposals

Mostly em-dash removal. The prose is clear and well-paced; I left it alone except
where an em dash appears or a recast reads more naturally. Each entry: location,
reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: This chapter gets you from an empty folder to a built story in a handful of commands — and, along the way, explains the foundation the whole platform stands on.
NEW: This chapter gets you from an empty folder to a built story in a handful of commands, and along the way explains the foundation the whole platform stands on.

### 2. "Why Node and TypeScript?" — emdash
OLD: Most interactive-fiction systems give you a purpose-built authoring language — Inform's natural-language syntax, TADS's bespoke object language.
NEW: Most interactive-fiction systems give you a purpose-built authoring language: Inform's natural-language syntax, TADS's bespoke object language.

### 3. "Why Node and TypeScript?" — emdash
OLD: That's a real trade-off. The cost is that you write actual code from the start — there's no gentler English-like surface to ease in on.
NEW: That's a real trade-off. The cost is that you write actual code from the start; there's no gentler English-like surface to ease in on.

### 4. "Why Node and TypeScript?" bullet (type checker) — emdash
OLD: **A type checker.** TypeScript catches whole classes of mistakes — a misspelled property, the wrong kind of value — at compile time instead of mid-playthrough.
NEW: **A type checker.** TypeScript catches whole classes of mistakes, such as a misspelled property or the wrong kind of value, at compile time instead of mid-playthrough.

### 5. "Why Node and TypeScript?" bullet (ordinary tooling) — emdash
OLD: **Ordinary tooling.** Version control, testing, formatting — the things millions of developers already use work on a Sharpee story unchanged.
NEW: **Ordinary tooling.** Version control, testing, formatting: the things millions of developers already use work on a Sharpee story unchanged.

### 6. "Why Node and TypeScript?" closing — emdash
OLD: In short, the "platform" isn't a separate application you launch — it's a library you import.
NEW: In short, the "platform" isn't a separate application you launch. It's a library you import.

### 7. "Working in a terminal" — emdash
OLD: Every Sharpee command in this book is typed into a **terminal** — a text window where you enter commands and read their output.
NEW: Every Sharpee command in this book is typed into a **terminal**, a text window where you enter commands and read their output.

### 8. "Working in a terminal" list (macOS) — emdash
OLD: - **macOS** — open **Terminal** (Applications → Utilities, or press ⌘-Space and type "Terminal").
NEW: - **macOS**: open **Terminal** (Applications → Utilities, or press ⌘-Space and type "Terminal").

### 9. "Working in a terminal" list (Windows) — emdash
OLD: - **Windows** — open **Windows Terminal** or **PowerShell** from the Start menu.
NEW: - **Windows**: open **Windows Terminal** or **PowerShell** from the Start menu.

### 10. "Working in a terminal" list (Linux) — emdash
OLD: - **Linux** — open your terminal emulator (often **Ctrl-Alt-T**).
NEW: - **Linux**: open your terminal emulator (often **Ctrl-Alt-T**).

### 11. "Working in a terminal" closing — emdash
OLD: and running a command with no arguments — plain `sharpee` — prints its help.
NEW: and running a command with no arguments, plain `sharpee`, prints its help.

### 12. "Installing Node and npm" — emdash
OLD: **npm** is its package manager, and it installs *with* Node — you don't fetch it separately.
NEW: **npm** is its package manager, and it installs *with* Node, so you don't fetch it separately.

### 13. "Installing Node and npm" step 2 — emdash
OLD: a version manager like **nvm** or **fnm** is a fine alternative — but the installer is the simplest start.)
NEW: a version manager like **nvm** or **fnm** is a fine alternative, but the installer is the simplest start.)

### 14. "Installing Node and npm" closing — emdash
OLD: `npm` is how you'll install Sharpee next — and any other library a story ever needs.
NEW: `npm` is how you'll install Sharpee next, and any other library a story ever needs.

### 15. "Installing the CLI" — emdash
OLD: Everything you do to a story — scaffold it, compile it, bundle it — goes through one command, `sharpee`.
NEW: Everything you do to a story, scaffold it, compile it, bundle it, goes through one command, `sharpee`.

### 16. "Installing the CLI" — emdash
OLD: The platform itself (`@sharpee/sharpee` — the world model, parser, standard library, and presentation layer) is *not* installed globally;
NEW: The platform itself (`@sharpee/sharpee`: the world model, parser, standard library, and presentation layer) is *not* installed globally;

### 17. "Building the story" — emdash
OLD: (If a build ever looks stale, delete `dist/` and rebuild — `build` checks that each step actually emits output, so a true no-op is rare.)
NEW: (If a build ever looks stale, delete `dist/` and rebuild. `build` checks that each step actually emits output, so a true no-op is rare.)

### 18. "Playing it" — emdash
OLD: A story bundle isn't much fun to read as a `.sharpee` file — you want to *play* it.
NEW: A story bundle isn't much fun to read as a `.sharpee` file; you want to *play* it.

### 19. "A TypeScript primer" — emdash
OLD: If the snippets below read clearly, you have everything you need — the book introduces the rest in context, and your editor fills the gaps.
NEW: If the snippets below read clearly, you have everything you need. The book introduces the rest in context, and your editor fills the gaps.

### 20. "A TypeScript primer" (type annotation) — emdash
OLD: A *type annotation* — the `: string` part below — tells the compiler what kind of value something holds, so it can flag a mistake before you run anything:
NEW: A *type annotation*, the `: string` part below, tells the compiler what kind of value something holds, so it can flag a mistake before you run anything:

### 21. "A TypeScript primer" (const/let) — emdash
OLD: You'll rarely write the annotations by hand — TypeScript infers most of them — but you'll read them constantly.
NEW: You'll rarely write the annotations by hand, since TypeScript infers most of them, but you'll read them constantly.

### 22. "A TypeScript primer" (classes) — emdash
OLD: Most of Sharpee's building blocks — traits especially — are classes:
NEW: Most of Sharpee's building blocks, traits especially, are classes:

### 23. "A TypeScript primer" closing — emdash
OLD: Don't try to memorize it — you'll absorb it by building the zoo, one chapter at a time.
NEW: Don't try to memorize it. You'll absorb it by building the zoo, one chapter at a time.

(Code comments were swept and contain no em dashes.)
