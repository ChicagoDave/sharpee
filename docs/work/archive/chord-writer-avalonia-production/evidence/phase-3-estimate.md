# Phase 3, deliverable 1 — the estimate

**Date**: 2026-09-16 · **Session**: 9f9266 · **Status**: estimate only, no code written

Phase 3's plan text makes the estimate the first deliverable, ahead of any
implementation, "if the estimate below reveals a cost this budget can't cover,
split at that point rather than padding the estimate to fit." It does.

David's rulings folded in before this was written:

- **`@sharpee/bridge` and `@sharpee/runtime` drop the `import` condition** rather
  than gaining a `dist-esm`.
- **`linux-arm64` is out** of this pass. `linux-x64` only.

## Summary of the recommendation

Split Phase 3 in two. **Phase 3a** (GH #457, GH #448) is macOS-authorable and
needs no new vendored bytes. GH #457 is the urgent half: it stops the shipped
toolchain building any Chord story, on macOS, right now. GH #448 is Windows-only
but costs two edits, so it rides along. **Phase 3b** (Windows and Linux vendoring, the launcher) is a
larger and differently-shaped job than the plan assumed, because
`vendor-toolchain.sh` is macOS-only by construction rather than by omission.

| | Original Phase 3 | Proposed 3a | Proposed 3b |
|---|---|---|---|
| Tier | Large | Small | Large |
| Budget | 400 | 120 | 400+ |
| Needs David's Windows/Linux machine | yes | **no** | yes |
| Blocks macOS today | — | **yes** | no |

## GH #457 — the `files`/`exports` mismatch

The issue lists seven packages. Re-checked against the working tree on
2026-09-16; the set has moved since it was filed on 2026-09-13.

| Package | `files` today | `dist-esm` on disk | Disposition |
|---|---|---|---|
| `character` | `["dist"]` | present | add `dist-esm` to `files` |
| `bootstrap` | `["dist"]` | present | add `dist-esm` to `files` |
| `sharpee` | `["dist"]` | present | add `dist-esm` to `files` |
| `bridge` | `["dist"]` | **absent** | drop `import` + `module` (David, 2026-09-16) |
| `runtime` | `["dist"]` | **absent** | drop `import` + `module` (David, 2026-09-16) |
| `branch-tester` | *(no key)* | present | **already correct** — issue records `[]`, tree has none |
| `transcript-tester` | *(no key)* | present | **already correct** — same |

Two findings the issue does not carry:

**`bridge` and `runtime` promise an entry point that has never existed here.**
Both declare `"import": "./dist-esm/index.js"` and `"module":
"./dist-esm/index.js"` with no `dist-esm/` directory in the working tree at all.
This is not a packaging-list defect — it is a false promise in the package
metadata, which is the exact shape `docs/core-concepts/README.md` records as
failing `tsf validate --publish` (the `@sharpee/character` 5.1.0 break). David's
ruling resolves it: the condition goes, not the directory.

Dropping it is safe against the code. Nothing in `packages/`, `tools/`, or
`stories/` declares a dependency on either package (`grep` over every
`package.json`, 2026-09-16 — the only hits are the two packages' own manifests).
`@sharpee/runtime` is the browser/iframe one, so the condition looked
load-bearing; it is not — `packages/runtime/runtime-frame.html:9` loads
`./sharpee-runtime.js` through a plain `<script src>`, a pre-bundled IIFE that
never resolves the specifier through an exports map.

**Cost**: three one-line `files` edits, two metadata removals, and a re-run of
the vendoring reproduce from the issue. Small.

## GH #448 — devkit's subprocess seam

Two call sites, both `execFileSync` without a shell, both genuine Windows
ENOENT. A third candidate was investigated and ruled out.

| Site | Call | Fix |
|---|---|---|
| `standalone/build-browser.ts:248` | `execFileSync('npx', ['esbuild', …])` | delegate to `resolveEsbuild()` |
| `consumer-gen.ts:247` | `execFileSync('npm', ['pack', …])` | Windows-safe `npm` invocation |

**`build-browser.ts` is a delegation, not new machinery.** The same file already
routes the `.story` path through `browser-core.ts`, which uses `resolveEsbuild()`
from `standalone/esbuild-bin.ts` — the seam written for exactly this defect, with
the reasoning in its header. Only the legacy "TypeScript path (unchanged)" branch
still shells out to `npx`. Fixing it also removes an unpinned network download
(npm 7+ makes `npx esbuild` fetch from the registry rather than run the installed
copy), which is worth doing on every platform, not just Windows.

**`consumer-gen.ts` keeps `npm pack`; it just has to find it.** The file's header
names its consumer: "the standalone-build integration gate, which needs a real
installed-from-tarballs project to run `sharpee build` against." Its only caller
is `tools/repokit/src/commands/test-npm.ts:122`, consuming `tsf build --npm`
staging. That is a developer machine with npm by construction — never the sealed
toolchain, never an author's runtime path. So this is not a seam to build; it is
`npm` vs `npm.cmd` on a Windows developer's box, which is precisely what GH #448's
failing `devkit#test:ci` was.

### Ruled out: `standalone/build.ts:122`

The first pass of this estimate flagged `execSync('npx tsc')` as a third site and
a hole in ADR-279 D4's seal, on the grounds that devkit does not depend on
`typescript`. That was wrong on both counts, and David's ruling — *everything
we're doing is for Chord; devkit has always required node/tsc* — is the correct
reading of the design.

- `packages/devkit/templates/story/package.json.template:27` gives every
  TypeScript-authored project `"typescript": "^5.0.0"` as a devDependency, so
  `npx tsc` with `cwd: projectDir` resolves the project's own
  `node_modules/.bin/tsc`. No global install, no network.
- `build.ts:92` sends a Chord project through `runChordBuild` and returns at
  `:98` — thirty lines before the `tsc` call. The Chord path never reaches it.
- `execSync` runs through a shell, so Windows resolves `npx.cmd` normally. It is
  not an ENOENT site either.

The TypeScript story path assumes the author's own environment, which is what
devkit has always assumed. **No `typescript` dependency is added to devkit**, and
the "does the sealed toolchain ship tsc" question is closed: it does not need to,
because the toolchain serves Chord.

**Cost**: two edits. Small.

## Windows and Linux vendoring — the part the plan under-estimates

### The Node assets

`tools/ide/vendor/node/` ships `node-v22.23.1-darwin-arm64.tar.xz` (25.9 MB) and
`node-v22.23.1-darwin-x64.tar.xz` (27.5 MB), both git-tracked, with a
two-line `SHASUMS256.txt`. Adding `node-v22.23.1-win-x64.zip` and
`node-v22.23.1-linux-x64.tar.xz` is roughly **+55 MB of permanent git history**,
taking the directory to ~110 MB. Under GitHub's 100 MB per-file limit; a
repo-weight call regardless.

Windows Node also has a different internal layout — `node.exe` at the
distribution root, not `bin/node` — which the launcher and the C# host both
assume today.

### `vendor-toolchain.sh` cannot be extended to Windows

The plan says "extend `vendor-toolchain.sh` to emit the Windows launcher shape."
The script's own header says otherwise, and the body agrees:

> Owner context: tools/ide — packaging. **Mac-only by nature**, which is why it
> lives beside the Xcode project rather than in repokit
> (`tools/ide/vendor-toolchain.sh:6`)

Four mechanisms in it are macOS-specific, not incidentally but structurally:

1. **Step 4.6 codesigns Mach-O binaries** against `EXPECTED_TEAM` and
   `bundled-node.entitlements`. No Windows analogue; Windows signing is
   Phase 6's Azure Trusted Signing, a different tool at a different stage.
2. **The esbuild graft** (`:200–285`) rewrites pnpm store entries and re-points
   consumer **symlinks** with `ln -s`, then verifies the arch by grepping
   `file`'s output for `x86_64`. Both are POSIX-shell idioms.
3. **The seal enforcement** (`:345–420`) is a symlink-escape scan. pnpm on
   Windows uses junctions rather than symlinks; Node reports junctions through
   `isSymbolicLink()`, so this *may* survive, but it is unverified and is a
   probe, not an assumption.
4. **The launcher** (`:298`) writes a POSIX `#!/bin/sh` script and `:311`
   requires `$root/node/bin/node`.

Only (4) is the "launcher rewrite" the plan priced. (1)–(3) mean Windows needs a
**second assembler** — and where it runs is the central unanswered design
question: on Windows as a `.ps1`/`.cmd` peer, or cross-assembled from macOS with
the signing step deferred to the Windows build box.

Linux is genuinely cheaper: the POSIX shim and `node/bin/node` layout both hold,
so it needs the tarball, an `ESBUILD_PKG` case for `@esbuild/linux-x64`, a
non-Mach-O path around step 4.6, and a replacement for the `file | grep x86_64`
arch assertion.

### The C# consumer assumes POSIX too

`tools/ide/PaneHost/Hosting/NativeHostServices.cs:39,41` resolve the toolchain as
`bin/sharpee` and `node/bin/node`. Both need a platform-shaped resolution
(`bin\sharpee.cmd`, `node\node.exe`) — a fourth site the plan does not name, and
one that belongs to PaneHost rather than to the shell script.

## Open questions

**None remain.** Both questions this estimate opened were closed on 2026-09-16 —
one by David's ruling (the target is Chord; devkit has always required node/tsc),
one by the code (`consumer-gen`'s only caller is repokit's npm integration gate,
never the sealed toolchain). Phase 3a is unblocked.

## Proposed split

**Phase 3a — Toolchain correctness (Small, 120).** GH #457's five metadata edits
and GH #448's two sites. macOS only, no new vendored bytes, no Windows or Linux
machine time. Real-path test per rule 13a: assemble a toolchain with
`vendor-toolchain.sh`, then build a Chord `.story`
through `toolchain/bin/sharpee` — the reproduce from GH #457, which is the path
that actually broke.

**Phase 3b — Platform portability (Large, 400+).** The vendored assets, the
second assembler, the Windows launcher shape, and PaneHost's path resolution.
Entry state: 3a done, plus a decision on where the Windows assembler runs. Needs
David's Windows and Linux machines for the rule 13a real-path runs, named up
front.

## Incidental finding

`tools/ide/vendor/node/README.md` states "**darwin-arm64 only**" and documents a
single tarball. The directory has carried `darwin-x64` since 2026-08-13, and
`vendor-toolchain.sh:50–57` documents the two-arch decision explicitly. The README
is the stale one. This is GH #430's category (documentation drift surviving a
change) and is worth a line in that issue rather than a silent fix here.
