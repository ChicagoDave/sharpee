# Gaps and anomalies

What the index surfaces that the reading phases should explain rather than
re-discover. Everything here is a **question raised by mechanical counting**, not
a conclusion. Where two independent sources agree, that is noted, because
agreement between the corpus and git is the strongest signal available at this
stage.

## 0. What the silences were — David, 2026-08-11

Asked about them directly, before any of this was read:

> "the silences are when I hit a wall in context and model capability to handle
> complexity and walked away"

This is testimony, not inference, and it is the one thing the corpus could never
have produced: the record shows absence, and absence has no cause written in it.
Everything below stands, but read it in that light — a gap is a person putting the
project down, not a period of undocumented work.

A third, older wall was named the same day, and it is the largest of them:

> "the eleven month void was me trying to use the first version of ChatGPT and
> instantly giving up — those were the salad days of hallucinations and imaginary
> code"

It also makes a **testable claim**, and the dates already support it. Precise
boundaries, from git and file mtimes rather than month buckets:

| | Work stops | Work resumes | Away |
| --- | --- | --- | --- |
| Wall 1 | 2023-04-03 (last `StoryRunner` file) | 2024-03-02 (`StoryRunner` touched again) | ~11 months |
| Wall 2 | 2025-03-29 (`Initial commit`) | 2025-06-23 (`wholesale refactoring — not even going to list the changes`) | ~12 weeks |
| Wall 3 | 2025-09-02 (`fix: Resolve test failures after trait removal refactoring`) | 2025-12-25 (`docs: Reorganize three-phase work docs and update project status`) | ~16 weeks |

**The return from gap 2 is the same day as the first Opus 4.5 commit**
(`987ba181`, 2025-12-25) — and the month that follows is the largest in the
project's history: 429 commits in January 2026, 368 of them attributed to Opus
4.5. The wall was model capability; the return coincides with a model that could
hold the problem.

Phase 3 should test whether this pattern holds across the whole timeline — do
the surges track model releases, and do the walls track the ceiling of whatever
was current? The evidence for it is in `index-genai.md`, and this is the
retrospective's most interesting question, not a side note.

## 1. Two silences, both corroborated by git

| Period | Commits | Session summaries | Conversations |
| --- | --- | --- | --- |
| 2025-04 → 2025-05 | 0 | 0 summaries (30 dated notes) | 39 |
| 2025-10 → 2025-11 | 0 | 0 | 0 |

**October–November 2025 is silent in every source at once** — no commits, no
summaries, no conversations. Two full months. That is the single largest
discontinuity in the project's record and nothing in the index explains it.

**April–May 2025 is the opposite shape**: no commits at all, but 39 recorded
conversations. Design or exploration without code, or work that happened
somewhere the index cannot see.

## 2. The conversation record predates the repository by nine months

Claude exports run 2024-06 → 2024-10 (126 conversations, peaking at 74 in
August 2024), pause for November, resume for 3 conversations in December 2024,
then stop again through January and February 2025 before resuming in March 2025
— the month the repository is created.

The C# prototypes were also touched in 2024-03 and 2024-05, immediately before
the June 2024 conversations begin. So the sequence to test in Phase 2 is:
C# revisited (spring 2024) → design conversations (summer/autumn 2024) → quiet
(Nov 2024 – Feb 2025) → TypeScript repository (2025-03-29).

## 3. A summary dated January 2025 describes a monorepo that git says did not exist

`work-history/work-summary-2025-01-03-1615.md` is headed "Work Summary -
January 3, 2025, 4:15 PM" and describes fixing Core package tests and language
provider architecture in "the Sharpee interactive fiction engine monorepo."
The repository's first commit is 2025-03-29, and there are no conversations at
all in January 2025.

Three readings, and the index cannot choose between them:

1. The TypeScript work began locally in January 2025 and was only committed to
   git in March — supported by the repo having **two** "Initial commit" commits
   on the same day (`d9003cf7`, `330931b5`), which is what importing existing
   work looks like.
2. The date is wrong by a year (2026-01-03), which would place it in the busiest
   month in the entire corpus (444 summaries).
3. Some other repository held the work first.

Phase 2 should settle this — it decides where the TypeScript era actually
starts.

## 4. ADRs begin in July 2025, numbered from 001

The first ADR file enters git in 2025-07, but the numbering starts at
`adr-001`. Either the early ADRs were written before the repo and imported
together, or numbering was retrofitted. 318 ADRs now exist.

## 5. Three ADR status conventions coexist

`**Status:** X` (41 files), `## Status: X` and `## Status` + value on the next
line (264 files). The split is itself a dating signal and worth using as one.
Statuses are recorded verbatim in `index-adrs.md` and **not** corrected: 176
say ACCEPTED, 48 PROPOSED, 15 IMPLEMENTED, 14 SUPERSEDED, 14 DRAFT, and this
project's own memory holds that "Proposed" frequently means shipped.

## 6. Older clones carry 21 branches this one does not

`sharpee_v1` has 16 branches absent here — the whole `feat/adr-180-*` series
(ten branches: bootstrap, test-npm, build-bundle, browser, zifmia, cutover, and
the u1/u2/u3 CLI unification), plus `feature/adr-141-character-model`,
`feature/adr-189-*` (two), `fix/capability-dispatch-message-keys`,
`fix/remove-createEntityWithTraits`, and `ide/p3-source-index`. `sharpee_v2` has
5 (`v2_adr193_state_adjectives`, `v2_adr197_pronoun`, `v2_adr203`, `v2_adr204`,
`v2_adr206`).

Absence from the current clone is **not** evidence of abandonment — the work may
have merged under a different branch name. But these are the only places some of
that history survives, and they should be checked before any claim that a piece
of work was dropped.

## 7. 276 corpus files can only be dated by mtime

No date in the filename, none in the first 20 lines. Their dates in the index
come from file mtime, which survived the copies but records the last edit rather
than the writing. Listed in `index-corpus.md`. Most are plans, checklists, and
templates rather than session records.

## 8. Volume is not evenly distributed, and the peak is extreme

January 2026 alone holds 444 session summaries and 452 commits — roughly a third
of the entire corpus in one month. February 2026 holds another 186. Any
month-by-month reading will be lopsided, and Phase 3 should budget for that
rather than treating months as equal units.

## 9. The corpus stops where the repo's live directory begins

`context-history/` ends 2026-08-10 because that is when it was consolidated.
The five live summaries in the repo's `docs/context/` are the tail of the same
record and belong to the same analysis.
