# Phase 3a — Toolchain correctness (GH #457, GH #448)

**Date**: 2026-09-16 · **Session**: 9f9266 · **Status**: DONE

Phase 3a is the macOS-authorable half of the Phase 3 split proposed in
`phase-3-estimate.md` and approved by David the same day. It fixes the two
defects that need no vendored bytes and no Windows or Linux machine time.

## GH #457 — the `files`/`exports` mismatch

Five manifests changed. The set differs from the issue's seven, which was
accurate on 2026-09-13 and had moved by the time this ran (see the estimate).

| Package | Change |
|---|---|
| `character` | `"files": ["dist"]` → `["dist", "dist-esm"]` |
| `bootstrap` | same |
| `sharpee` | same |
| `bridge` | dropped `"module"` and `exports["."].import` |
| `runtime` | same |

`branch-tester` and `transcript-tester` needed nothing — they carry no `files`
key at all, so npm ships everything. The issue records `[]` for both.

`bridge` and `runtime` promised `"import": "./dist-esm/index.js"` with no
`dist-esm` directory in the tree at all. **David's ruling (2026-09-16): drop the
condition rather than build the directory.** Verified safe before editing —
nothing in `packages/`, `tools/`, or `stories/` declares a dependency on either
(`grep` over every `package.json`; the only hits are their own manifests), and
`packages/runtime/runtime-frame.html:9` loads `./sharpee-runtime.js` through a
plain `<script src>`, a pre-bundled IIFE that never resolves the specifier
through an exports map.

## GH #448 — devkit's subprocess seam

Two sites. The third candidate (`standalone/build.ts:122`, `execSync('npx tsc')`)
was **ruled out, not fixed** — see the estimate. David's ruling: everything here
is for Chord, and devkit has always required the author's own node/tsc. The
TypeScript story template ships `typescript` as a devDependency
(`templates/story/package.json.template:27`), so `npx tsc` resolves the project's
own copy; and `build.ts:92` returns a Chord project through `runChordBuild` at
`:98`, thirty lines before that call. No `typescript` dependency was added to
devkit.

- **`standalone/build-browser.ts:248`** — `execFileSync('npx', ['esbuild', …])`
  replaced by `resolveEsbuild()`, the seam `standalone/esbuild-bin.ts` already
  provides and the `.story` path already uses through `browser-core.ts`. Fixes
  ENOENT on Windows (execFileSync spawns without a shell; the launcher is
  `npx.cmd`) and, on every platform, removes an unpinned registry download —
  npm 7+ makes `npx esbuild` fetch a copy rather than run the installed one.
- **`consumer-gen.ts:247`** — `'npm'` replaced by a platform-named `NPM`
  constant (`npm.cmd` on win32). npm stays the tool: the file's only caller is
  `tools/repokit/src/commands/test-npm.ts:122`, a developer-machine integration
  gate that consumes `tsf build --npm` staging, never the sealed toolchain.
  Named rather than `shell: true`, which would put every argument back through
  cmd.exe's quoting.

## Results

- `npx tsc -p packages/devkit/tsconfig.json --noEmit` — clean
- `pnpm --filter '@sharpee/devkit' test` — **183 passed, 1 skipped, 0 failures**
  (182 before; +1 is the new test below)
- `pnpm exec tsf validate --publish` — exit 0, **34 packages "Outputs valid"**,
  zero errors

### Real-path test — GH #457 (rule 13a)

The issue's own reproduce, run end to end:

```
bash tools/ide/vendor-toolchain.sh <staging> --force     # exit 0, seal verified, 177M
<staging>/toolchain/bin/sharpee build fernhill.story     # ✅ game.js 1516.6 KB
```

`@sharpee/character` now carries `dist-esm` inside the sealed closure
(`toolchain/devkit/node_modules/.pnpm/@sharpee+character@file+packages+character/
node_modules/@sharpee/character` → `dist`, `dist-esm`, `package.json`,
`README.md`). No injection, no override, no stub.

**Negative control.** Moving `dist-esm` aside *inside the sealed copy* and
rebuilding reproduces the issue's error verbatim —
`✘ [ERROR] Could not resolve "@sharpee/character"` — and restoring it returns the
build to green. The fix is what made the difference, demonstrated rather than
asserted.

### Real-path test — GH #448 (rule 13a)

`src/standalone/browser-build-ts-path.test.ts` is new. Every pre-existing browser
test scaffolds a **Chord** project, which takes the `browser-core.ts` path, so
nothing covered the TypeScript branch this phase changed — including the fernhill
run above. The new test scaffolds with `--ts`, asserts no `.story` file exists
(a `.story` would route to the other branch), runs the real
`runBuildBrowserCommand`, and asserts on `dist/web/game.js` written by the real
esbuild subprocess. It guards its own premise with
`expect(resolveEsbuild().bundled).toBe(true)`, so a fallback to `npx` cannot make
it pass for the wrong reason.

**Negative control.** Replacing `resolveEsbuild()` with a bogus command name
turns the test red at `build-browser.ts:261`; restored, green. The assertion
cannot pass without the subprocess running.

## Findings recorded, not fixed

- **`@sharpee/bridge` and `@sharpee/runtime` are absent from
  `tsf validate --publish`'s 34 packages.** Neither is marked `private`. That
  absence is why a false `exports.import` promise survived in both: the gate that
  catches exactly this defect — and did catch it for `@sharpee/character` at
  5.1.0 — never looks at them. Predates this phase; worth its own issue.
- **A mis-called `runInitBrowserCommand` scaffolds into `process.cwd()` with no
  guard.** Both it and `runBuildBrowserCommand` take the project directory as
  their *second* parameter; passing it inside `args` silently falls back to the
  current directory. During this session that wrote `src/browser-entry.ts`,
  `src/version.ts`, and an empty `browser/` into `packages/devkit` itself, and
  broke the typecheck until removed (deleted with David's confirmation). A guard
  — refuse when the resolved directory holds no story config, or when it is a
  workspace package — would turn a silent mess into an error. Not fixed here:
  out of Phase 3a's scope.

## Files Modified

- `packages/{character,bootstrap,sharpee}/package.json` — `dist-esm` added to `files`.
- `packages/{bridge,runtime}/package.json` — `module` and `exports["."].import` dropped.
- `packages/devkit/src/standalone/build-browser.ts` — TypeScript branch spawns devkit's own esbuild.
- `packages/devkit/src/consumer-gen.ts` — platform-named `npm` executable.
- `packages/devkit/src/standalone/browser-build-ts-path.test.ts` — new; the GH #448 real-path test.
