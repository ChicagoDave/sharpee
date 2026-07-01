# Published `@sharpee/devkit@1.0.7` CLI crashes on every command — the book is un-followable from §1.4

**Labels:** `bug`, `devkit`, `publishing`, `book`, `blocker`
**Found by:** book QA pass (following *The Sharpee Author and Developer Manual* literally as a naive reader)
**Date:** 2026-06-22
**Affected package:** `@sharpee/devkit@1.0.7` (latest on npm)
**Environment:** Linux, node v22.23.0, npm 11.17.0

## Summary

Installing the CLI exactly as the book's Chapter 1 (§1.4) instructs and then running
*any* `sharpee` command — including bare `sharpee`, which §1.2/§1.8 say prints help —
crashes immediately with `MODULE_NOT_FOUND`. Every reader is blocked at the toolchain
step; nothing past §1.4 can be tested. `init`, `build`, `introspect`, `ifid` are all
dead.

## Steps to reproduce

```sh
npm install -g @sharpee/devkit   # installs 1.0.7
sharpee                          # expected: help text
```

## Actual result

```
Error: Cannot find module '../../core/index.js'
Require stack:
- .../@sharpee/devkit/standalone/ifid.js
- .../@sharpee/devkit/cli.js
    ...
  code: 'MODULE_NOT_FOUND'
```

`cli.js` `require`s `./standalone/ifid` at module-load time (`cli.js:26`), so the bad
require in `ifid.js` throws before any argument parsing — taking down every subcommand,
not just `ifid`.

## Root cause

Three shipped CLI files use **monorepo-relative requires** that were never rewritten to
package-name imports at publish time. In the source tree
(`packages/sharpee/src/cli/…`), `../../core/index.js` resolves to `packages/core`. In
the **published flat package**, the same path climbs to
`node_modules/@sharpee/core/index.js`, which does not exist — the bundled copy lives at
`@sharpee/devkit/node_modules/@sharpee/core/index.js`. Requiring **by package name**
resolves correctly (all targets are present under devkit's bundled `node_modules`, each
with `main: ./index.js`).

This is a *class* of bug (relative import escaping the package root), not a one-off.

## Exact locations and fix

| Shipped file | Line | Current (broken) | Fix |
|---|---|---|---|
| `standalone/ifid.js` | 6 | `require("../../core/index.js")` | `require("@sharpee/core")` |
| `standalone/build.js` | 204 | `require("../../transcript-tester/index.js")` | `require("@sharpee/transcript-tester")` |
| `standalone/build.js` | 205 | `require("../../transcript-tester/index.js")` | `require("@sharpee/transcript-tester")` |
| `commands/introspect.js` | 68 | `require("../../bootstrap/index.js")` | `require("@sharpee/bootstrap")` |

Fix in the **TypeScript source** under `packages/sharpee/src/cli/` (`ifid`, `build`,
`introspect`) — change sibling-package imports from relative paths to `@sharpee/<pkg>`
so they survive bundling/publish. Then rebuild and republish.

## Scope of the scan

Walked all 20 shipped JS files (excluding bundled `node_modules`) and resolved every
executed `require()` / dynamic `import()` against the filesystem: **46 relative loads,
exactly 4 broken — the 4 listed above. No other broken imports exist in the shipped
CLI.**

False alarm worth noting so it isn't re-investigated: a looser first scan flagged 10
`../packages/<pkg>/dist/index` references in `repo.js`. Those are **not** imports — they
are string data in the `BUNDLE_ALIASES` array (esbuild `--alias` config) and the
`BUNDLE_DTS` template literal (generated `.d.ts` text), mirroring `build.sh` by design
(ADR-180). They never load a module at runtime.

## Related concerns (not load-time breaks; flagged for review)

1. **Publish pipeline doesn't exercise the packaged CLI.** The book claims every code
   version is "real, compiled, and transcript-tested." The transcript-test runner is
   invoked from `standalone/build.js` — one of the broken files — so whatever validated
   the book's code was the in-repo build, **not** the published package. Add a smoke
   test that installs the *packed* tarball and runs `sharpee` + `sharpee init` +
   `sharpee build` end-to-end before publishing.
2. **`repo.js` monorepo assumptions.** `BUNDLE_ALIASES` / `BUNDLE_DTS` / `detectMode()`
   assume a monorepo `packages/…/dist` layout. Confirm `sharpee build` in a scaffolded
   **standalone** project doesn't take a monorepo code path. Untestable here because the
   CLI won't start.

## Documentation nit (separate, minor)

§1.4 gives bare `npm install -g @sharpee/devkit` with no permissions guidance. On a
setup where the global prefix isn't user-writable this fails with `EACCES` (a very
common first-time experience). A one-line "if you see EACCES, use a user-level prefix or
nvm/fnm" aside would help. Not a blocker.

## Acceptance criteria

- [ ] `npm install -g @sharpee/devkit && sharpee` prints help (no crash) from the
      published package.
- [ ] `sharpee init`, `sharpee build`, `sharpee introspect`, `sharpee ifid` all run.
- [ ] Pre-publish smoke test runs the packed tarball's CLI end-to-end.
- [ ] Re-run the book QA pass from §1.4 forward.
