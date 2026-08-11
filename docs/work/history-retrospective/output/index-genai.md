# GenAI assistance timeline

Extracted from 2055 non-merge commits across all branches. The
`Co-Authored-By: Claude …` trailer names the assisting model, so this is the
project's own record of which assistant wrote with David, and when — not an
estimate.

## Models, in order of first appearance

| Model | Commits | First | Last |
| --- | --- | --- | --- |
| Claude | 194 | 2025-08 | 2026-08 |
| Claude Opus 4.5 | 542 | 2025-12 | 2026-02 |
| Claude Opus 4.6 | 129 | 2026-02 | 2026-05 |
| Claude Sonnet 4.6 | 155 | 2026-03 | 2026-05 |
| Claude Opus 4.6 (1M context) | 130 | 2026-03 | 2026-04 |
| Claude Opus 4.7 (1M context) | 96 | 2026-04 | 2026-05 |
| Claude Opus 4.8 (1M context) | 265 | 2026-06 | 2026-07 |
| Claude Fable 5 | 315 | 2026-07 | 2026-08 |
| Claude Opus 5 (1M context) | 114 | 2026-07 | 2026-08 |
| Claude Sonnet 5 | 1 | 2026-07 | 2026-07 |

## Per month

`Attributed` counts commits carrying a model trailer; the rest are David's own
commits or predate the convention. Churn is raw and unweighted — a generated
bundle and a rewritten parser count the same, which is exactly why it must not be
read as productivity on its own.

| Month | Commits | Attributed | Files | +Lines | −Lines | Dominant model |
| --- | --- | --- | --- | --- | --- | --- |
| 2025-03 | 2 | 0 | 106 | 47496 | 0 | — |
| 2025-06 | 1 | 0 | 529 | 52832 | 31495 | — |
| 2025-07 | 13 | 0 | 2634 | 429147 | 62165 | — |
| 2025-08 | 85 | 63 | 3342 | 165160 | 39558 | Claude (63) |
| 2025-09 | 3 | 2 | 76 | 6583 | 648 | Claude (2) |
| 2025-12 | 151 | 144 | 1316 | 88285 | 10030 | Claude Opus 4.5 (144) |
| 2026-01 | 429 | 368 | 5178 | 346873 | 196970 | Claude Opus 4.5 (368) |
| 2026-02 | 126 | 126 | 2540 | 155165 | 403126 | Claude Opus 4.6 (96) |
| 2026-03 | 85 | 85 | 1185 | 213316 | 22540 | Claude Opus 4.6 (1M context) (46) |
| 2026-04 | 231 | 226 | 2871 | 238615 | 100748 | Claude Opus 4.6 (1M context) (84) |
| 2026-05 | 104 | 103 | 1592 | 118510 | 28893 | Claude Sonnet 4.6 (51) |
| 2026-06 | 255 | 254 | 2450 | 172921 | 31098 | Claude Opus 4.8 (1M context) (200) |
| 2026-07 | 391 | 391 | 7568 | 358948 | 55652 | Claude Fable 5 (236) |
| 2026-08 | 179 | 179 | 4270 | 164595 | 137539 | Claude Fable 5 (79) |

## Caveats this file will not let you skip

- **Attribution is a convention, not instrumentation.** A commit without a trailer
  was not necessarily written unassisted; the convention started partway through.
- **Churn measures text, not work.** Deleting 12,000 lines of retired grammar was
  one of the most valuable months in this project.
- **Model names are release names, not capability marks.** A month attributed to
  one model may include work by another through a subagent.
