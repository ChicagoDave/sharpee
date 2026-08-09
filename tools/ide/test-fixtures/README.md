# IDE test fixtures

Stories owned by the IDE's test suites. **Not author stories.** Nothing here is
built by `./repokit`, discovered by any story sweep, or shipped in the app or the
DMG — the directory sits outside `tools/ide/project.yml`'s
`sources: - path: SharpeeIDETests`, so XcodeGen never enumerates it either.

## `fernhill-frozen/`

A frozen snapshot of `branch-stories/fernhill` taken **2026-08-07**, holding only
what a `sharpee test --tree` run needs: `fernhill.story` plus `tests/`. The real
story's `assets/`, `browser/` and `dist/` are deliberately absent — verified
unnecessary by a clean run against this copy.

Consumed by `SharpeeIDETests/TestingTabRealPathTests.swift` (ADR-301 Acceptance
1–6, a rule-13a real-path suite).

### Do not re-sync this with `branch-stories/fernhill`

The suite's assertions are pinned to **this snapshot's** tree, not to whatever
Fernhill becomes:

| Assertion | Value |
| --- | --- |
| Nodes passing | 22 |
| Commands | 552 (518 authored + 34 replayed) |
| Roots | 5 |
| `arrival` | 2 commands |
| `arrival/concealment` | 16 turns, first at source line 12 |
| `arrival/key` | interior node broken in place by one test, restored in a `defer` |

Recorded from `node packages/devkit/dist/cli.js test fernhill.story --tree` run
in this directory, 2026-08-07: exit 0, `22 passed`,
`552 commands (518 authored + 34 replayed)`.

Go-live Phase 4 (`docs/work/ide-go-live/plan-20260806-go-live.md`) moves
Fernhill's 22 transcripts out of the story and rewrites them from scratch, which
is expected to produce a **different** tree. Decoupling from that is the entire
reason this copy exists. Re-syncing it would turn the suite red for no defect.

If the fixture ever needs to change, change it deliberately and update the
assertions from a real run — never by copying Fernhill again.
