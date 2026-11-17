# Research: TypeScript 7.0 RC — Sharpee adoption assessment

**Date:** 2026-06-19
**Branch:** `research/typescript-v7-rc`
**Status:** Research only — no code changes. Decision deferred to David.

## TL;DR

The TS7 native (Go) compiler RC shipped **2026-06-18**. The headline win is ~10x
compile speed (the team cites VS Code's typecheck dropping 77s → 7s). **Sharpee's
own source is nearly TS7-clean** — but Sharpee **cannot adopt tsgo today**, because
the build tool `tsf` is built on the TypeScript *programmatic API* (`ts.createProgram`),
and that API does not ship in TS7.0. It is promised for **7.1, months out.**

The blocker is the toolchain, not the codebase.

## What TS7.0 RC is

- Entire compiler/language-service rewritten in Go; native binary, shared-memory
  multithreading. New flags: `--checkers` (default 4), `--builders`, `--singleThreaded`.
- Install: `npm i -D typescript@rc`; binary is `tsgo`.
- TS6.0 is the last JS-codebase release and the supported bridge; TS7 is the native line.

## The hard blocker: tsf uses the Strada programmatic API

`./sharpee build` runs `@davidcornelson/tsf` (v1.0.0), which imports `typescript` as a
**library**, not as a CLI:

| tsf module | Strada API used |
| --- | --- |
| `compilers/tsc.js` | `ts.createProgram(...)` — primary compile path |
| `compilers/esbuild.js` | `ts.createProgram(...)` — typecheck pass |
| `transform/declarations.js` | `typescript` — `.d.ts` generation |
| `compilers/rollup-bundler.js` | `require('typescript')` |

TS7.0 ships **no stable programmatic API** (Microsoft: "a stable programmatic API for
TypeScript 7.1 or later," several months out). Tools that import `typescript` as a
library do not work on 7.0 — same class of breakage that takes out ts-morph.
**Bumping tsf's `typescript` dep to 7.0 will not work.** Adoption is gated on either
(a) TS7.1's programmatic API + a tsf port, or (b) tsf shelling out to the `tsgo` CLI.

## Sharpee source compatibility (the good news)

Audited configs and source. Sharpee is mostly clean:

- **No decorators** anywhere in `packages/` — TS7's missing decorator emit is a non-issue.
- **No `.d.ts`-from-JS** — Sharpee is all TS; the JS-declaration-emit gap doesn't apply.
- **Targets fine** — base `target: ES2022`, `module: commonjs`/`es2022`. TS7 only drops
  `es5`, `amd/umd/systemjs/none`, `downlevelIteration` — none used.

Two config migration items remain (whenever adoption happens):

1. **`moduleResolution: "node"`** in `tsconfig.base.json` — removed in TS7. Must become
   `"bundler"` or `"nodenext"`. (Single base-config change; inherited everywhere.)
2. **`baseUrl`** in ~10 tsconfigs (`tsconfig.dev.json`, stories/*, packages/bridge,
   packages/runtime, packages/map-editor) — removed in TS7; convert each to `paths`.

## Options

1. **Wait for TS7.1 + port tsf** — adopt natively once the programmatic API lands.
   Cleanest; preserves tsf's create-program architecture. Timeline: TS controls it.
2. **Re-architect tsf around `tsgo` CLI** — drop `ts.createProgram`, shell out to the
   native binary, parse output. Unblocks now, but it's a tsf rewrite (its whole value is
   programmatic multi-target emit), and is a platform/toolchain change → needs its own ADR.
3. **Defer** (current state) — revisit when 7.1 RC lands. Cheap; costs nothing today.

## Recommendation

**Defer to TS7.1 (option 1).** The 10x win is real but the gate is tsf's dependency on
the programmatic API, which is exactly what 7.0 withholds. Track it; re-open when 7.1
hits RC. If we want it sooner, the only path is a tsf-on-tsgo-CLI re-architecture, which
is a platform change requiring David's sign-off and an ADR.

## Open questions for David

- Worth a low-priority GitHub issue to track "adopt tsgo when tsf supports TS7.1 API"?
- Any appetite for the tsf-on-CLI rewrite to get the speed win before 7.1 — or is the
  current `tsf` create-program design something you want to keep?

## Sources

- [TypeScript 7.0 RC ships (TechTimes, 2026-06-18)](https://www.techtimes.com/articles/318666/20260618/typescript-70-rc-ships-go-compiler-cuts-vs-code-build-time-77-seconds-seven.htm)
- [Announcing TypeScript 7.0 Beta (Microsoft DevBlogs)](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/)
- [Progress on TypeScript 7 — Dec 2025 (Microsoft DevBlogs)](https://devblogs.microsoft.com/typescript/progress-on-typescript-7-december-2025/)
- [microsoft/typescript-go](https://github.com/microsoft/typescript-go)
- [Testing 15 libraries with the TS7 toolchain (Medium)](https://thinkingthroughcode.medium.com/i-tested-15-popular-libaries-with-typescript-7-toolchain-heres-how-to-fix-broken-migration-7ea719018e6d)
