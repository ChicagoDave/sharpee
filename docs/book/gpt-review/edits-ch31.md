# Ch 31 — Building & Publishing: edit proposals

The prose is clean; this pass is em-dash removal. Each entry: location, reason,
OLD → NEW. (Chapter title left untouched per instructions.)

---

### 1. Opening paragraph — emdash
OLD: For single-player Sharpee that means one artifact — a self-contained browser client — and a handful of CLI commands to produce it.
NEW: For single-player Sharpee that means one artifact, a self-contained browser client, and a handful of CLI commands to produce it.

### 2. "The author toolchain" — emdash
OLD: Crucially, *the platform is never rebuilt* — `@sharpee/sharpee` is an ordinary npm dependency your story compiles against, so your builds are fast and reproducible.
NEW: Crucially, *the platform is never rebuilt*: `@sharpee/sharpee` is an ordinary npm dependency your story compiles against, so your builds are fast and reproducible.

### 3. "The author toolchain" — emdash
OLD: `sharpee build` produces two things in `dist/`: the compiled story (`dist/index.js`) and a **`.sharpee` bundle** — a single zipped file of your whole story, the unit you hand to anything that runs Sharpee stories.
NEW: `sharpee build` produces two things in `dist/`: the compiled story (`dist/index.js`) and a **`.sharpee` bundle**, a single zipped file of your whole story, the unit you hand to anything that runs Sharpee stories.

### 4. "Adding the browser client" — emdash
OLD: It has no server, no build step, no runtime dependency — it's static files.
NEW: It has no server, no build step, no runtime dependency. It's static files.

### 5. "Versioning" — emdash
OLD: Sharpee stamps a version into every build, in the form `X.Y.Z` (with a `-beta` suffix during development), and — importantly — stamps it *first*, before any compilation, so the number baked into the artifact always matches the build that produced it.
NEW: Sharpee stamps a version into every build, in the form `X.Y.Z` (with a `-beta` suffix during development), and, importantly, stamps it *first*, before any compilation, so the number baked into the artifact always matches the build that produced it.

### 6. "Publishing a story as a package" — emdash
OLD: If instead you want to distribute your *story* for others to embed or extend — as an npm package rather than a playable build — you publish it like any scoped package, with your compiled `dist/` and the `.sharpee` bundle as its artifacts.
NEW: If instead you want to distribute your *story* for others to embed or extend, as an npm package rather than a playable build, you publish it like any scoped package, with your compiled `dist/` and the `.sharpee` bundle as its artifacts.

### 7. "Publishing a story as a package" — emdash
OLD: (Publishing the **platform** packages themselves — the `@sharpee/*` scope — is a maintainer task that runs through the monorepo's `tsf` toolchain, and isn't something a story author needs.)
NEW: (Publishing the **platform** packages themselves, the `@sharpee/*` scope, is a maintainer task that runs through the monorepo's `tsf` toolchain, and isn't something a story author needs.)
