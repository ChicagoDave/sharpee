# AC-13 baseline: test-tree output before the region migration

ADR-360 AC-13 requires Fernhill and the Secret Letter to report "exactly what they did before, line for line" once their `containing` lines become `in` lines and the Secret Letter's nested region is flattened. Phase 5 of `../plan-20261009-adr-360-362.md` makes `containing` a parse error, so neither story compiles again until Phase 8 migrates it. This output was recorded first, in Phase 1, so Phase 8 has something to compare against.

Recorded 2026-10-09 (session d8546c) on `main` at `8d0b1ff3c` plus the uncommitted Phase 1 gates, after `./repokit build dungeo`. Both stories compile with no diagnostic under those gates.

| File | Command | Exit | Tree | Derived rule tests |
|---|---|---|---|---|
| `fernhill.txt` | `./sharpee test branch-stories/fernhill --verbose` | 0 | 86 cards, 106 assertions passing; 222 commands | 63 branches, no failures |
| `secret-letter.txt` | `./sharpee test branch-stories/secret-letter --verbose` | 1 | 1469 cards, 2652 assertions passing; 21136 commands | 1650 branches, 53 failing |

The Secret Letter's exit 1 comes from its derived rule tests (ADR-356), not from its test tree: 53 derived branches fail before any change in this plan (for example `ENTITY_NOT_FOUND` on `on showing` / `on giving` rows in `lords-market.chord`). They are part of the baseline. Phase 8 compares against them as recorded and does not fix them.

Only stdout is captured. The runs also print `[phrase] renderMessage(...)` warnings on stderr, for example the Secret Letter's `stall-lift-quietly` stub with an unbound `{the item}`. Those are pre-existing and not compared.

**Only Fernhill gates.** David ruled on 2026-10-09 that the Secret Letter is not a gate for this plan. Its baseline is kept so Phase 8 can report the migration's effect on it, but a Secret Letter difference blocks nothing.

To compare in Phase 8, run the same two commands into scratch files and `diff` each against its file here. Any difference is a finding to trace, never something to re-record.
