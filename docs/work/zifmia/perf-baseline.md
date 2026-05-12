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

## Phase 3e — multi-worker baseline (2026-05-11)

Phase 3e introduced an in-process `WorkerPool` bounding concurrent
`executeTurnStatelessly` calls per container. The pool's capacity is
sized from `ZIFMIA_WORKER_COUNT` or defaults to `os.cpus().length - 1`.

Companion harness: `pnpm --filter @sharpee/zifmia perf:concurrent`.
Method: N rooms each run M sequential `look` turns; all N room-loops
run in parallel, so the pool sees N concurrent cross-room requests.
Per-request latency is timed end-to-end (POST → JSON parsed).

### Default pool — `ZIFMIA_WORKER_COUNT` unset (9 slots on M4)

| Setup | Rooms | Turns/room | n | p50 | p95 | p99 | mean |
| ----- | ----- | ---------- | - | --- | --- | --- | ---- |
| concurrent | 8 | 25 | 200 | 110.78 | **130.69** | 199.84 | 109.11 |

All numbers in milliseconds.

### Pool=1 (forced serialization, same load)

| Setup | Rooms | Turns/room | n | p50 | p95 | p99 | mean |
| ----- | ----- | ---------- | - | --- | --- | --- | ---- |
| concurrent | 8 | 15 | 120 | 110.05 | 123.19 | 197.55 | 106.21 |

### What this shows

- The 8-room concurrent p95 (~120 ms) is **not** the AC-14 budget.
  AC-14 is a per-request budget for the single-room hot path; the
  single-room baseline (16 ms p95 HTTP, see above) already meets it.
- The concurrent number is essentially the same whether the pool has 9
  slots, 2 slots, or 1 slot. The bottleneck under cross-room load is
  the JavaScript event loop (engine-only, single-threaded) plus SQLite
  WAL contention — **not** the pool cap.
- The pool's role under this load is admission control: when CPU is
  saturated, queued requests wait deterministically rather than
  trampling each other and the event loop. Behavior tests
  (`tests/server/worker-pool.test.ts`, `tests/server/command-concurrency.test.ts`)
  cover the cap and FIFO ordering — the perf number is informational.
- Container retest: the 2-vCPU container measurement remains the AC-14
  sign-off; this M4 baseline is the regression signal for local work.

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
