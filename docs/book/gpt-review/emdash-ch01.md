# Em-dash review — part-1/01-installing-sharpee.md

Em-dash lines: 26, 103, 120, 127, 138, 139, 249

---

### 1. "Real editors" list item (line 26) — list
OLD:
- **Real editors.** Visual Studio Code (or any TypeScript-aware editor) gives you
  autocomplete, inline documentation, and errors flagged as you type — before you
  ever run the story.

NEW:
- **Real editors.** Visual Studio Code (or any TypeScript-aware editor) gives you
  autocomplete, inline documentation, and will flag as you type.

---

### 2. "Creating a story project" — wizard prompts (line 103) — prose
OLD:
`sharpee init` scaffolds a new project. On its own it walks you through a short
wizard — story title, package ID, author, description — each question defaulting
to a sensible value (the directory name, your username, and so on). Pass `-y` to
accept every default and scaffold in one shot, which is what we'll do here:

NEW:
`sharpee init` scaffolds a new project. On its own it walks you through a short
wizard (story title, package ID, author, description), each question defaulting
to a sensible value (the directory name, your username, and so on). Pass `-y` to
accept every default and scaffold in one shot, which is what we'll do here:

---

### 3. Project tree comment — index.ts (line 120) — comment
OLD:
```
my-zoo/
  src/
    index.ts        # your story — a single starter file to begin with
  package.json      # pinned to the platform version devkit shipped with
  tsconfig.json     # TypeScript config, set up for Sharpee
```

NEW:
```
my-zoo/
  src/
    index.ts        # a single starter file that hosts your story
  package.json      # pinned to the platform version devkit shipped with
  tsconfig.json     # TypeScript config, set up for Sharpee
```

---

### 4. "the platform arrives prebuilt" paragraph (line 127) — prose
OLD:
`src/index.ts` is where the story lives. Right now it's a starter stub; in the
next chapter you'll replace it with the first room of the zoo. The platform
arrives prebuilt in `node_modules`, so there is no platform to compile — only your
story.

NEW:
`src/index.ts` is where the story lives. Right now it's a starter stub; in the
next chapter you'll replace it with the first room of the zoo. The platform
arrives prebuilt in `node_modules`, so there is no platform to compile; only your
story.

---

### 5. "Building the story" output list (lines 138, 139) — list
OLD:
- `dist/index.js` — your compiled story.
- `dist/<id>.sharpee` — a single zipped **story bundle**, the unit you hand to a
  client or share for distribution.

NEW:
- `dist/index.js`: your compiled story.
- `dist/<id>.sharpee`: a single zipped **story bundle**, the unit you hand to a
  client or share for distribution.

---

### 6. "Key takeaway" — never build the platform (line 249) — prose
OLD:
Sharpee stories are TypeScript on Node, so the toolchain is the mainstream one:
install Node (which brings npm), then the CLI with `npm install -g @sharpee/devkit`.
Scaffold a project with `sharpee init`, write your story in `src/index.ts`, compile
and bundle it with `sharpee build`, and play it by adding a web client
(`sharpee init-browser`) and serving `dist/web/`. The platform is just a dependency
your story compiles against — you never build it yourself. With the toolchain in
place, the next chapter writes the zoo's first room.

NEW:
Sharpee stories are TypeScript on Node, so the toolchain is the mainstream one:
install Node (which brings npm), then the CLI with `npm install -g @sharpee/devkit`.
Scaffold a project with `sharpee init`, write your story in `src/index.ts`, compile
and bundle it with `sharpee build`, and play it by adding a web client
(`sharpee init-browser`) and serving `dist/web/`. The Sharpee platform has everything you need to create an interactive fiction story.
