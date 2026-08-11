# Sharpee session corpus

Every work summary the project has produced, in one place, for retrospective
analysis. Assembled 2026-08-10.

## What is here

| Directory | Files | Span | Origin |
| --- | --- | --- | --- |
| `context-history/` | 1,533 | 2025-12-26 .. 2026-08-10 | backup drive + the repo's `docs/context/archive/` |
| `work-history/` | 12 (+ a `stdlib-test-archive/` subdirectory) | 2025-01-03 .. 2025-07-04 | backup drive |

`context-history/` is the union of two sets that were previously kept apart:

1. **1,080 entries** from `/Volumes/Backup/surface-archive/sharpee-archive/context-history/`
   — the Surface-era archive, running from the first summaries through 2026-02.
2. **463 entries** from the Sharpee repo's `docs/context/archive/` (440 summaries,
   23 hidden `.devarch-events-*.jsonl` files) — 2026-02 through 2026-08.

Ten filenames appeared in both (`session-20260218-*-main.md`). All ten were
byte-identical, so nothing was lost to the merge: 1,080 + 463 − 10 = 1,533.

Every copied file was verified byte-for-byte against its source (`cmp`) before
the repo's copy was removed. Zero missing, zero mismatched.

## Why Workspace and not the backup drive

`/Volumes/Backup` is NTFS and macOS mounts it **read-only**, so it cannot
receive files without third-party drivers. It remains a valid read-only snapshot
of sources 1 and 2 above; this directory is the writable working copy.

## Naming eras

Filenames change convention across the corpus, which matters when parsing it:

- `work-summary-<date>-<slug>.md` — the 2025 era (`work-history/`).
- `YYYY-MM-DD-HHMM-slug.md` — 176 files, late 2025 into early 2026.
- `session-YYYYMMDD-HHMM-<branch>.md` — 537+ files, the current convention.
- Free-named plans, checklists, and phase reports (`action-refactoring-master-plan.md`,
  `wt-6-fixes.txt`, and similar) — roughly 366 files. These are **not** session
  summaries and should be filtered out of any per-session analysis.

## Related tooling

`context-history/extract-blockers.sh` and `context-history/classify-blockers.mjs`
(2026-02) mine blockers out of the corpus and bucket them by regex. They carry a
hardcoded `/mnt/c/repotemp/...` path from the Surface era and need that edited
before they will run here.

## Still in the repo

`docs/context/` keeps only live session summaries — the current handoff that
DevArch's recap and pre-session audit read at session start. When those age out,
they belong here.
