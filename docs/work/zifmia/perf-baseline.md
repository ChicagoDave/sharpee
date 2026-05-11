# Zifmia AC-14 perf baseline

> ADR-175 AC-14: "`look` on Dungeo under 100 ms p95 on a 2-vCPU SQLite container."
> Regenerate with `pnpm --filter @sharpee/zifmia perf:baseline`.

## Latest run — 2026-05-11

| Field          | Value |
| -------------- | ----- |
| Run date       | 2026-05-11 |
| Fixture        | `dungeo@1.0.0` — **AC-14 target** |
| Bundle size    | 1.70 MiB |
| Node           | v25.8.1 |
| OS             | darwin 25.4.0 |
| CPU            | Apple M4 × 10 cores |
| Memory         | 16.0 GiB |
| Warmup runs    | 10 (discarded) |
| Measured runs  | 100 |

### Measurements

| Regime | min | p50 | p90 | p95 | p99 | max | mean |
| ------ | --- | --- | --- | --- | --- | --- | ---- |
| direct (in-process executor)          | 12.56 | 13.29 | 13.99 | **14.24** | 14.52 | 17.11 | 13.40 |
| http (Fastify + fetch over loopback)  | 14.35 | 15.29 | 15.99 | **16.06** | 16.41 | 16.50 | 15.35 |

All numbers in milliseconds.

### AC-14 verdict

**PASS** on this hardware. Both `direct` and `http` p95 are well under the 100 ms target. The 100 ms gate is calibrated against a 2-vCPU SQLite container; the Apple M4 is faster, so this run establishes the floor — re-baselining on the actual container before AC-14 sign-off is still required, but no immediate engine work is needed.

## How the test was unblocked

The earlier run hit a Node-ESM directory-import bug in the `dist-esm/` output of every `@sharpee/*` package. Fixed at the build-tool level by adding an `esmExtensions` flag to `tsf` (`/Users/david/repos/tsf`) that rewrites relative specifiers in emitted JS files to include the explicit `.js` or `/index.js` Node ESM requires. Sharpee's `ts-forge.config.json` `esm` target now sets `esmExtensions: true`; rebuilding the `esm` target across the workspace makes the bundles loadable via `node --input-type=module` and via Zifmia's dynamic-import flow.

See the tsf release for the rewriter implementation (`src/transform/imports.ts` → `transformEsmExtensions`) and the test suite (`tests/esm-extensions.test.ts`).

## How to regenerate this doc

```bash
cd tools/zifmia
pnpm perf:baseline | tee /tmp/zifmia-perf.txt
# Then update the "Latest run" section with the new numbers.
```

The harness exits:
- `0` if Dungeo loaded **and** both p95 numbers are under 100 ms
- `1` if Dungeo loaded but a p95 missed
- `2` if the harness fell back to the tiny fixture (AC-14 not evaluated)
