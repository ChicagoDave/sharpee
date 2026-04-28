# ADR-162 AC-8 — World-Snapshot Bandwidth Baseline

**Captured**: 2026-04-27
**ADR**: [`docs/architecture/adrs/adr-162-world-model-replication.md`](../../architecture/adrs/adr-162-world-model-replication.md)
**Plan**: [`plan-2026-04-27-adr-162-world-replication.md`](./plan-2026-04-27-adr-162-world-replication.md)
**Acceptance criterion**: AC-8 — capture `OUTPUT.world` byte size across
~10 turns of dungeo so future delta-encoding or hash-dedup work has a
frozen reference point.

---

## Methodology

The measurement is reproducible — re-run with:

```bash
cd tools/server
SHARPEE_BANDWIDTH=1 pnpm exec vitest run tests/sandbox/bandwidth-baseline.test.ts
```

The test (`tests/sandbox/bandwidth-baseline.test.ts`) drives a real Deno
sandbox spawned via the production `spawnSandbox` path against the
`stories/dungeo.sharpee` bundle. No stubs. The sandbox emits a real
`OUTPUT.world` JSON snapshot on every turn — the test records
`output.world.length` (UTF-16 character count, equal to byte count for
ASCII JSON) for ten turns.

**Frozen command sequence** (any edit invalidates this baseline — re-record
the document if you change the list):

| # | Command         | Notes                                |
|---|-----------------|--------------------------------------|
| 1 | `look`          | Opening room description.            |
| 2 | `open mailbox`  | Container interaction.               |
| 3 | `read leaflet`  | Item examination.                    |
| 4 | `take leaflet`  | Inventory mutation.                  |
| 5 | `inventory`     | Inventory readout.                   |
| 6 | `south`         | Directional movement.                |
| 7 | `east`          | Directional movement.                |
| 8 | `open window`   | Container/openable interaction.      |
| 9 | `enter window`  | Enterable interaction.               |
| 10| `look`          | Opening of inside-house region.      |

The bundle hash is implicitly the one produced by the latest
`./build.sh -s dungeo` invocation; the test compiles fresh into a
temporary cache directory, so the numbers reflect the bundle at the
time of measurement.

---

## Captured numbers (2026-04-27)

| #  | Command         | `OUTPUT.world` bytes |
|----|-----------------|---------------------:|
| 1  | `look`          | 425,040              |
| 2  | `open mailbox`  | 425,728              |
| 3  | `read leaflet`  | 426,270              |
| 4  | `take leaflet`  | 426,884              |
| 5  | `inventory`     | 427,497              |
| 6  | `south`         | 428,067              |
| 7  | `east`          | 428,600              |
| 8  | `open window`   | 429,138              |
| 9  | `enter window`  | 429,756              |
| 10 | `look`          | 430,274              |

| Statistic | Bytes   | KiB    |
|-----------|--------:|-------:|
| Min       | 425,040 | 415.08 |
| Median    | 427,782 | 417.76 |
| Mean      | 427,725 | 417.70 |
| Max       | 430,274 | 420.19 |

---

## Observations

- **Per-turn delta is small.** Each turn grows the snapshot by roughly
  500–700 bytes (worst observed: 688). The shape of the world is largely
  static; the bulk of the per-turn delta is event-history accumulation.
- **Absolute size is the dominant cost.** A typical turn ships ~418 KiB
  to each connected client. For a four-player room over 100 turns,
  that is roughly 167 MiB of egress aggregate before considering chat,
  DM, or roster churn. This is the order-of-magnitude motivation for
  ADR-162 Open Question 1 (hash-dedup) and any future delta-encoding
  work.
- **No compression on the wire today.** WS frames are sent as-is. JSON
  on dungeo's world snapshot compresses extremely well in spot checks
  (LZ-style ratios around 5–10×); enabling per-message-deflate on the
  WS handler is the cheapest first move and is independent of any
  delta strategy.
- **The test is bandwidth-only, not latency.** End-to-end turn time
  (READY → OUTPUT) is captured incidentally as ~50–100 ms locally on
  an M-series Mac. That number is not part of the baseline and will
  vary by host; do not regress against it.

---

## Implications for future work

- **Delta encoding** (Open Question 1 in ADR-162). The ~500–700 bytes
  of per-turn change vs. ~418 KiB total snapshot suggests an in-place
  diff (e.g., `jsondiffpatch`-style or RFC 6902 JSON-Patch) could cut
  per-turn egress by ~600×. The decision deferred until this baseline
  existed; the numbers here are the reference point.
- **WS compression**. Cheaper alternative — turn on permessage-deflate
  in the Hono WS handler. Spot-check compressed size first to decide
  whether deflate alone is enough or if a delta is also needed.
- **Hash-dedup**. The snapshot's tail (event history) is monotonically
  growing, so a content-hash-based dedup would not benefit consecutive
  turns. Only useful if the same world is broadcast to many clients
  in the same tick — which is the multi-user use case. Worth modeling
  before implementing.

---

## Re-measurement protocol

1. Build dungeo: `./build.sh -s dungeo` (so `stories/dungeo.sharpee` is fresh).
2. Run `SHARPEE_BANDWIDTH=1 pnpm exec vitest run tests/sandbox/bandwidth-baseline.test.ts` from `tools/server`.
3. The test logs a `[ADR-162-AC8]` line followed by JSON with `sizes` and `stats`.
4. Update the table above with the new numbers and update the **Captured** date.
5. If the command sequence is changed in the test, update the table headers and add a note explaining the change.
