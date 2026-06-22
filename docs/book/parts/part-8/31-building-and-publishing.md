# Building & Publishing — the Single-Player Browser Client

The zoo runs, it's tested, it saves. The last step is the one that turns a project
into a *game*: getting it onto a screen that isn't yours. For single-player Sharpee
that means one artifact — a self-contained browser client — and a handful of CLI
commands to produce it.

## The author toolchain

Throughout this book you've used the `sharpee` command from `@sharpee/devkit`. It's
the whole build toolchain for a standalone story: it compiles your TypeScript and
emits the runnable artifacts. (You install it globally as `sharpee`, below; if you
ever work *inside* the Sharpee monorepo itself, the same CLI is invoked through the
repo's `./sharpee` wrapper.) Crucially, *the platform is never rebuilt* — `@sharpee/sharpee`
is an ordinary npm dependency your story compiles against, so your builds are fast and
reproducible.

```bash
npm install -g @sharpee/devkit   # one-time
sharpee init my-game             # scaffold src/index.ts, package.json, tsconfig.json
cd my-game && npm install        # pull the platform from npm
sharpee build                    # compile src/ → dist/, emit the .sharpee bundle
```

`sharpee build` produces two things in `dist/`: the compiled story (`dist/index.js`)
and a **`.sharpee` bundle** — a single zipped file of your whole story, the unit you
hand to anything that runs Sharpee stories.

## Adding the browser client

A `.sharpee` bundle needs a runner. For single-player, that runner is the
framework-free browser client from Volume VII, and devkit builds a self-contained copy
of it wrapped around your story:

```bash
sharpee init-browser   # adds src/browser-entry.ts (once)
sharpee build          # now also emits the web client → dist/web/
```

`dist/web/` is the deliverable: an `index.html` and its assets with your story baked
in. It has no server, no build step, no runtime dependency — it's static files. Open
`index.html` and the game runs. That self-containment is the point: the same channel
architecture that let one story drive a terminal or a browser means the browser build
is just files.

## Hosting it

Because the client is static, "publishing" is "putting files on the web." Any static
host works — a personal site, GitHub Pages, itch.io, an S3 bucket. To check it locally
before you upload, point any static file server at the folder:

```bash
sharpee build
python3 -m http.server -d dist/web
# then open the printed http://localhost:8000
```

Upload the contents of `dist/web/` and share the URL. There is nothing to install on
the player's side; their browser is the interpreter.

## Versioning

Sharpee stamps a version into every build, in the form `X.Y.Z` (with a `-beta`
suffix during development), and — importantly — stamps it *first*, before any
compilation, so the number baked into the artifact always matches the build that
produced it. The version shows in the client's About box and travels in saves, which
is what lets the save format reason about which build wrote a file (the previous
chapter's versioned envelope). Bump it as you'd bump any package: a patch for fixes, a
minor for new content, a major for a breaking change.

## Publishing a story as a package

Shipping the browser client covers most authors. If instead you want to distribute
your *story* for others to embed or extend — as an npm package rather than a playable
build — you publish it like any scoped package, with your compiled `dist/` and the
`.sharpee` bundle as its artifacts. (Publishing the **platform** packages themselves —
the `@sharpee/*` scope — is a maintainer task that runs through the monorepo's `tsf`
toolchain, and isn't something a story author needs.)

## Key takeaway

Single-player publishing produces one self-contained artifact. `sharpee build`
compiles your story and emits a **`.sharpee` bundle**; `sharpee init-browser` then
`sharpee build` wraps it in the framework-free browser client at **`dist/web/`** — a
static `index.html` with no server and no install, which you host anywhere static
files live and verify locally with any file server. Builds are fast because the
platform is a pinned npm dependency, never rebuilt; every build is **version-stamped
first** so the number always matches the artifact. That ships the game to one player
in a browser. The final chapter scales it to many at once — Zifmia.
