# ADR-274: The bundled CLI cannot cold-transpile a hatched story

## Status: DRAFT (2026-07-25) — defect ADR, found during ADR-273's Phase 4 verification. Carries Q-1 (fix route); DRAFT until it is resolved.

## Parent: none (standalone platform defect). Relates to ADR-259 D6 as amended 2026-07-23 (hatch modules resolve to authored TS, transpiled at load — the amendment that introduced the defect), ADR-187 (repokit owns the CLI bundle), ADR-180 (devkit as author tool), ADR-252 D2 (a story needs no package.json/tsconfig — the promise the transpile path serves).

## Date: 2026-07-25

## Context

### How it surfaced

During ADR-273's transcript verification, every `friendly-zoo` invocation of `dist/cli/sharpee.js`
— `--test`, `--exec`, single transcript or suite — hung forever with zero output and 0% CPU.
`fernhill` (a pure `.story` with no TS extras) ran normally against the same bundle. A native stack
sample showed the main thread parked in **`Atomics.wait`** inside top-level script execution.

### The defect

`requireHatchModule` (`packages/devkit/src/standalone/hatch-transpile.ts`, the 2026-07-23 ADR-259 D6
amendment) transpiles a hatched story's authored `.ts` at load time via **`esbuild.buildSync`**.
esbuild's sync API works by spawning a worker thread and blocking the main thread on `Atomics.wait`
until the worker services the request. Inside `dist/cli/sharpee.js` the esbuild **library is inlined
by the bundle build** — and the inlined copy's worker handshake never completes in that context, so
the wait never wakes. The hang is unconditional on the cold path.

### Why nobody noticed for two days

The transpile is cached at `$TMPDIR/sharpee-hatch/<hash>.cjs`, keyed by a hash of source path +
content, and the cache is checked **before** esbuild is touched. The 7-23 work populated the cache
(plausibly through a non-bundled path), so every subsequent warm run skipped `buildSync` entirely.
macOS purges `/var/folders` temp files after ~3 days of disuse; the first post-purge run — 7-25 —
hit the cold path for the first time. Verified: `$TMPDIR/sharpee-hatch` was missing, and re-warming
it with the workspace's real esbuild (byte-identical cache key) restored every `friendly-zoo` suite
to green without touching the bundle.

**Blast radius**: every hatched story (`define … from "<mod>.ts"`), on every fresh machine or
post-purge temp dir, through every bundled entry point. Pure `.story` stories are unaffected. The
failure mode is the worst kind — an infinite silent hang, not an error.

## Decision

*(Direction, pending Q-1 — the load-time transpile stays; ADR-252 D2's no-toolchain promise is not
reopened.)*

### D1 — The bundle must not inline esbuild

Whatever route Q-1 picks, the invariant is: `require('esbuild')` inside a bundled host must resolve
to a real, working esbuild — never to a bundle-inlined copy whose sync worker cannot answer. The
bundle build (repokit) enforces this structurally, not by convention.

### D2 — A cold transpile failure must be an error, not a hang

If esbuild is unavailable or its worker cannot start, `requireHatchModule` fails with a named error
telling the author what is missing — the ADR-273 D3 principle (fail closed, never silently) applied
one layer up. A watchdog or preflight check around the sync call is acceptable; an unbounded
`Atomics.wait` is not.

## Acceptance

1. On a machine with **no** `$TMPDIR/sharpee-hatch` cache, `node dist/cli/sharpee.js --test
   stories/friendly-zoo/tests/transcripts/*.transcript` completes (all suites green) — the cold path
   works in-bundle. Verified by deleting the cache dir before the run.
2. The warm path still costs one `existsSync` (no regression to ADR-259 D6's caching).
3. A cold transpile with esbuild genuinely unavailable produces a named error naming the remedy, not
   a hang. *(D2)*
4. The `friendly-zoo` transcript suites are the regression set, run cache-cold.

## Consequences

**Gained.** Hatched stories work on fresh machines and CI runners; the author-facing failure mode
becomes an actionable error. The temp-cache purge stops being a time bomb.

**Cost.** A repokit bundle-config change (and possibly a devkit resolution change) sized by Q-1;
the CLI bundle may need to ship or locate an external esbuild, which touches distribution.

**Rejected.** Reverting the 7-23 amendment (per-story `tsc` output contradicted ADR-259 D8 /
ADR-252 D2 — the transpile direction stands). Documenting "run once with network/deps present" —
a silent hang is not documentable behavior.

## Open Questions

### Q-1: How does the bundle get a working esbuild?
- **Why it matters**: three routes with different distribution costs. (a) **Mark esbuild external
  in the repokit CLI bundle** and resolve it from the workspace/story `node_modules` at runtime —
  smallest change, but a globally-installed CLI (ADR-180 U2) must then carry esbuild as a real
  dependency. (b) **Spawn the esbuild binary directly** (its CLI, not the JS sync API) — avoids the
  worker mechanism entirely, but re-implements option plumbing. (c) **Precompile hatches at story
  build time** (repokit/devkit emit the `.cjs` beside the story, loader prefers it) — removes
  load-time esbuild from the CLI entirely but partially reintroduces the build-step-per-story that
  the 7-23 amendment removed.
- **Blocks**: D1's mechanism; acceptance 1 and 3.

## Session

Session of 2026-07-25 (b52717). Found as the fifth discovery of the ADR-271/273 implementation run:
`friendly-zoo` hung on every CLI invocation while `fernhill` ran clean; diagnosed by process sample
(`Atomics.wait` in esbuild's inlined `runCallSync`), confirmed by the missing cache dir, and worked
around by warming the cache with the workspace's real esbuild
(`scratchpad/warm-hatch-cache.js`, byte-identical key derivation). Owner confirmed ADR-worthy at
session end. The workaround is machine-local and expires with the next temp purge — this ADR is the
durable record until the fix lands.
