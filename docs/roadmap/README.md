# Sharpee Roadmap

What is planned, what is being designed, and what has shipped. One file per item.

**Nothing here is a delivery commitment.** An item's presence means it is a direction
worth pursuing; its status says how far it has actually got. Where an item traces to
Architecture Decision Records, those ADRs are the detail and this page is the summary.

**Current versions**: Sharpee `5.0.0` · Chord language `3.0.0` · Chord Writer `1.0.0`.
The three move independently (ADR-257), which is why an item's target names *which* version
it means.

---

## Items

| # | Item | Status | Built? | Target |
|---|------|--------|--------|--------|
| [001](./roadmap-001.md) | Sharpee and Chord Temporal Controls | DRAFT | none | TBD |
| [002](./roadmap-002.md) | The character model in Chord | DRAFT | none | TBD |
| [003](./roadmap-003.md) | Visual novel client | DRAFT | none | TBD |
| [004](./roadmap-004.md) | Screen reader client | ACCEPTED | none | TBD |
| [005](./roadmap-005.md) | Multi-user website *(name TBD)* | ACCEPTED | archived | TBD |
| [006](./roadmap-006.md) | Native Windows IDE | PROPOSED | none | TBD |
| [007](./roadmap-007.md) | Choice-based (CYOA) mode | PROPOSED | none | TBD |

---

## The item schema

Every `roadmap-NNN.md` carries the same header block:

```markdown
**Status**: PROPOSED | DRAFT | ACCEPTED | IN PROGRESS | DONE | ABANDONED
**Built?**: none | partial | shipped — with the evidence for the claim
**Created**: YYYY-MM-DD
**Target date**: a date, or TBD
**Target Sharpee version**: a version, n/a, or TBD
**Target Chord version**: a version, n/a, or TBD
**Traces to**: the ADRs, issues, and umbrella docs that hold the detail
```

### Status

Reuses the ADR status vocabulary rather than inventing a second one, with one addition
(`IN PROGRESS`) and one clarification: **`ACCEPTED` means the design is settled, not that
anything was built.** That is what `Built?` is for.

| Status | Means |
|---|---|
| `PROPOSED` | A direction with no settled design. May have no ADR at all. |
| `DRAFT` | Being designed. Open questions remain; no implementation authorized. |
| `ACCEPTED` | Design settled. Says nothing about whether code exists. |
| `IN PROGRESS` | Being built now. |
| `DONE` | Shipped. |
| `ABANDONED` | Deliberately dropped. Kept so the decision is not re-litigated. |

### Why `Built?` is a separate field

An ADR's own header status is what its author wrote when they wrote it, and this project
treats those as unreliable — several read `Proposed` for things that shipped, and at least
one reads `ACCEPTED` for something with no implementing code. So each item states its
delivery state **from evidence** — a package that exists, a test that runs, a route that
serves — and where an ADR's header disagrees, the item says so explicitly rather than
silently picking one.

### Target

Three separate target fields because Sharpee, the Chord language, and Chord Writer version
independently (ADR-257). An item may target one, two, or all three; `n/a` is a real answer.

`TBD` is honest and is the default. A target is a deliberate act, not something inferred
from an item's age or apparent size.

---

## This directory is the source of truth

[sharpee.net/roadmap](https://sharpee.net/roadmap) is **derived from these files**.
`website/scripts/sync-roadmap.mjs` parses each `roadmap-NNN.md` on `prebuild`/`predev` and
emits `website/src/lib/roadmap-data.json`, which the page renders.

Edit items here, never the JSON. The script fails the build rather than publishing a
half-read roadmap: a missing source directory, a missing header field, or a missing
`## What it is` section each exit non-zero and name the problem. That also means the header
block above is a contract — renaming a field breaks the site build until the script agrees.

## Related

- [`docs/architecture/adrs/`](../architecture/adrs/) — the decision records themselves
- [`docs/work/`](../work/) — active work targets, one folder per target
- [`docs/proposals/`](../proposals/) — templated proposals with `P-n` items
