# Sharpee Standalone — No-npm Author Distribution

## Problem

Today, an author who wants to write a Sharpee story needs:

1. Node.js installed
2. pnpm (or npm) installed
3. `pnpm install` in a workspace / `npm install @sharpee/sharpee` in a story folder
4. A TypeScript toolchain (`tsc`, usually via `pnpm`)

That's a four-step install — reasonable for developers, painful for writers who don't live in a terminal. We'd like a distribution where the author downloads **one thing** (a binary or small folder), writes story files, and runs `./sharpee build my-story/` or `./sharpee play my-story/` with nothing else installed.

This doc surveys the realistic options for producing that distribution. **It is not an ADR** — there's no architecture to decide, just a packaging recipe to pick. The final artifact is an authoring-guide page: _"Install Sharpee without npm."_

## What "standalone" actually means

Before comparing options, separate the concerns that every option shares:

### 1. Runtime

The author's machine needs a JavaScript runtime to execute `dist/cli/sharpee.js` (the existing bundle produced by `build.sh`). Options differ in **how** the runtime gets there:

- Embedded into a single executable (Node SEA, Bun, pkg, nexe)
- Vendored alongside the bundle (zip-with-Node)
- Not shipped — use the system's runtime (current npm install)

### 2. Author story compilation

Stories are written in **TypeScript**. Today `build.sh` calls `tsc` to compile the story package. A standalone distribution has three choices for this:

- **A. Ship a TypeScript compiler** alongside the runtime. `sharpee build` shells out to the embedded tsc.
- **B. Use an in-process TS loader** (`esbuild`, `swc`, Bun's native loader, or `tsx`). The CLI loads `.ts` files directly — no emit step, no external compiler.
- **C. Restrict authors to JavaScript.** Simplest, but loses TypeScript-as-a-feature for story authors.

**Preferred: B with esbuild.** It's a single ~10MB binary, zero-config for the common case, and already bundled into several of the runtime options below. This is the biggest unknown and the first thing to validate.

### 3. Story template

Authors always need a starter project — rooms, objects, story.ts, regions/ folder. That ships as an editable folder, regardless of how the runtime is packaged. So **every option is really "one binary + a starter-story folder"**, not a single file.

### 4. Client assets

The browser and Zifmia clients have static HTML/CSS/JS that `build.sh -c browser` / `-c zifmia` produces. Those assets (~5MB gzipped) need to be embedded in the runtime bundle or shipped alongside it.

---

## The five options

### Option 1 — Node SEA (Single Executable Application)

Node 20.6+ ships a first-party mechanism for producing a single-file executable. The pipeline:

1. Generate an "SEA blob" from the existing bundle: `node --experimental-sea-config sea-config.json`
2. Copy the `node` binary: `cp $(command -v node) sharpee`
3. Inject the blob into the copy with `postject`: `npx postject sharpee NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_...`
4. Code-sign for macOS / Windows (otherwise Gatekeeper and SmartScreen block it)

**Artifact size:** ~80 MB (the full Node binary plus the bundle)

**Cross-compile:** Not supported. You produce macOS binaries on a Mac, Windows on a Windows host, Linux on Linux. A CI matrix (GitHub Actions) handles this.

**Runtime compatibility:** Full Node API — anything `dist/cli/sharpee.js` does today Just Works. No behavior divergence.

**TypeScript loading (concern 2):** Bundle `esbuild` into the SEA blob and register it as a loader. Works, adds ~10 MB.

**Pros:**
- Official Node feature — will be maintained long-term
- Zero behavior drift from the current CLI
- No third-party tooling risk

**Cons:**
- Experimental flag (as of Node 20) — stability improves each major release
- Produces per-platform binaries (three builds in CI)
- macOS / Windows signing required to avoid "unidentified developer" warnings
- Postject is an external tool (small, Apache 2.0, low risk)

**Verdict:** The safest long-term bet. Pick this if we want one path and we're willing to set up signing.

---

### Option 2 — Bun `build --compile`

Bun ships a `bun build --compile --outfile sharpee dist/cli/sharpee.js` command that produces a single executable with the Bun runtime embedded.

**Artifact size:** ~55 MB

**Cross-compile:** Supported from any host. One CI job can emit mac/win/linux binaries with `--target=bun-darwin-arm64` etc.

**Runtime compatibility:** Bun is API-compatible with Node for ~95% of surface, but edge cases exist (some native modules, some stream behaviors). Our stack uses `better-sqlite3` (native), `ws`, and plain Node HTTP — all three work under Bun today, but would need regression testing. The `tools/server` multiuser server uses Deno for the sandbox subprocess, which is orthogonal.

**TypeScript loading:** **Native.** Bun loads `.ts` files directly with zero config — this is Bun's headline feature. Big win for concern #2.

**Pros:**
- Smaller binaries than Node SEA
- Cross-compile from one host = simpler CI
- Native TypeScript — no esbuild to bundle
- Single-command build (`bun build --compile`)

**Cons:**
- Swaps runtimes — any Node-specific behavior we depend on becomes a risk surface
- Bun is younger than Node; fewer years of battle-testing in obscure scenarios
- Native modules (`better-sqlite3`) are supported but carry their own risk
- Two runtimes in the project (Node for dev, Bun for distribution) is cognitive overhead

**Verdict:** Attractive for the TypeScript + size wins. Risk is "runs on my machine in Node, breaks in some weird way on author's box running Bun." Worth a spike to confirm.

---

### Option 3 — `pkg` (Vercel)

Vercel's `pkg` tool was the de facto standard for embedding Node into a single binary before SEA existed. It's **deprecated** as of 2023 — Vercel recommends Node SEA.

**Artifact size:** ~50 MB

**Cross-compile:** Supported.

**TypeScript loading:** Requires prebundling, same as SEA.

**Pros:**
- Mature; used in thousands of projects
- Cross-compile supported

**Cons:**
- Deprecated — no new Node version support
- Archived-but-not-removed GitHub repo
- Any bug we hit is on us to fork or work around

**Verdict:** Skip. Deprecated status makes it a non-starter for a new packaging decision.

---

### Option 4 — `nexe`

Community alternative to `pkg`. Compiles a custom Node binary with the bundle baked in.

**Artifact size:** ~60 MB

**Cross-compile:** Limited. `nexe` often has to build Node from source for the target platform, which is slow and fragile.

**TypeScript loading:** Same as SEA — bundle esbuild.

**Pros:**
- Still maintained (as of 2025)
- Works without an SEA-capable Node

**Cons:**
- Slow builds (10+ min per target when Node source compile is required)
- Smaller community than SEA
- No clear advantage over SEA now that SEA exists

**Verdict:** Skip. SEA covers the same use case with first-party support.

---

### Option 5 — Vendored zip ("portable Node")

Ship a zip / tarball containing:

```
sharpee/
├── node                    # or node.exe — the Node runtime for this platform
├── sharpee.js              # the existing bundle
├── esbuild                 # TypeScript loader binary
├── clients/
│   ├── browser/            # static assets for -c browser output
│   └── zifmia/             # static assets for -c zifmia output
├── starter-story/          # copy-paste template the author edits
└── sharpee                 # shell wrapper: exec ./node ./sharpee.js "$@"
```

Author extracts the archive anywhere, runs `./sharpee/sharpee build my-story/`.

**Artifact size:** ~90 MB unzipped (largest — Node + bundle + esbuild + clients + template), ~30 MB zipped.

**Cross-compile:** Trivial. Download the Node prebuilt for each target, drop it in the zip.

**TypeScript loading:** Ship esbuild binary next to node.

**Pros:**
- Zero packaging tooling — just `tar` / `zip`
- No signing required (author extracts a folder, doesn't double-click a binary)
- Cross-compile is a one-script matrix
- Transparent — authors can see what's in the folder
- Fastest to prototype and ship

**Cons:**
- "Folder with stuff in it" is less elegant than "one file"
- Author has to put the folder somewhere and reference `./sharpee/sharpee`
- Adding the folder to `PATH` is a chore on Windows
- Larger download than single-binary options (Node + assets, unbundled)

**Verdict:** The pragmatic choice for a v1 release. Zero risk, zero signing, works today. Can be upgraded to SEA later without changing the author-facing experience much.

---

## Comparison matrix

| Option            | Size   | Cross-compile | TS support       | Signing required | Maturity      | Complexity |
| ----------------- | ------ | ------------- | ---------------- | ---------------- | ------------- | ---------- |
| 1. Node SEA       | ~80 MB | No (CI matrix)| Bundle esbuild   | Yes (mac/win)    | Experimental  | Medium     |
| 2. Bun compile    | ~55 MB | Yes           | Native           | Yes (mac/win)    | Young         | Low        |
| 3. pkg            | ~50 MB | Yes           | Bundle esbuild   | Yes              | Deprecated    | Low        |
| 4. nexe           | ~60 MB | Partial       | Bundle esbuild   | Yes              | Quiet         | High       |
| 5. Vendored zip   | ~90 MB | Yes           | esbuild binary   | No               | Trivial       | Very low   |

## Recommendation

**Ship Option 5 (vendored zip) first. Migrate to Option 1 (Node SEA) once we want single-file elegance.**

Rationale:

- **Option 5 works today** with no new tooling — we can produce the artifact in a weekend.
- It validates the _authoring experience_ (does `./sharpee build my-story` actually feel good? Is the starter-story template right?) before we invest in per-platform signing infrastructure.
- It removes the single biggest blocker for new authors (npm install) immediately.
- Option 1 is a drop-in replacement when we're ready — the author-facing CLI flags don't change. We just ship fewer files.
- Option 2 (Bun) is tempting but introduces runtime risk we don't need to take on day one.

## Open questions

1. **Does `better-sqlite3` need to be in the author-facing bundle?** The multiuser server uses it, but single-player `play` and `build` don't. If we exclude it we dodge the native-module headache entirely for v1.
2. **Client assets** — do we bake the browser/Zifmia static assets into the same artifact, or ship a separate `sharpee-clients` zip? If baked in, artifact grows; if separate, author has two downloads.
3. **Auto-update** — none of these options include a self-update mechanism. Authors would re-download on each release. Acceptable for v1?
4. **Windows shell wrapper** — a `.bat` equivalent of the `sharpee` shell script. Trivial, just remember to include it.
5. **Starter-story versioning** — when Sharpee moves from `0.8` to `0.9` and the trait API shifts, does the author's already-extracted `starter-story/` still work? Probably we pin starter-story to the Sharpee version that produced it; breaking changes mean a fresh download.

## Next steps (if we pursue this)

1. Spike Option 5 — produce a working `sharpee-standalone-darwin-arm64.tar.gz` from the current `dist/cli/sharpee.js`. Goal: extract, run `./sharpee play` on the Dungeo story, confirm it works.
2. Decide the TypeScript story: esbuild binary vs. precompile-at-publish (ship only `.js` story templates).
3. Write `docs/author-guide/install-standalone.md` — the user-facing installation instructions.
4. Add a `build.sh -c standalone` target that produces the zip per platform.
5. Defer Option 1 (SEA) until we've shipped Option 5 and know what authors actually need.

## Not pursued

- **Deno compile.** Would require porting the entire codebase to Deno's module resolution; cost vastly exceeds benefit. (The multiuser server uses Deno for sandboxing the subprocess, which is a different concern.)
- **WASM runtime.** Interesting long-term but not mature enough for a build+play tool today.
- **Browser-only distribution** (no CLI — run everything in the author's browser). Different product shape; worth a separate brainstorm, not this doc.

---

_Status: exploration — no decision committed. When we're ready to act, the first concrete step is the Option 5 spike._
