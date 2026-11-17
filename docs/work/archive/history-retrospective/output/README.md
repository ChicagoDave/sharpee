# Sharpee history retrospective

**Start here: [`retrospective.md`](retrospective.md) and
[`timeline.md`](timeline.md).** Those are the deliverables; everything else is
the evidence they rest on, kept so any claim can be traced or re-derived.

| File | What it is |
| --- | --- |
| `retrospective.md` | The written retrospective, March 2023 → August 2026 |
| `timeline.md` | The verified timeline, one row per turning point |
| `verification.md` | 41 load-bearing claims handed to adversarial verifiers: 20 confirmed, 19 corrected, 2 refuted |
| `testimony.md` | David's own account of what the archive cannot explain |
| `throughlines.md` | Eight cross-cutting arcs, each traced and verified against git |
| `monthly-digests.md` | 13 monthly digests covering 1,247 session summaries |
| `origin-narrative.md` | The pre-repo era, with its own correction struck through in place |
| `gaps-and-anomalies.md` | What the counting exposed, before anything was read |

---

## Phase 1 index

Phase 1 of `docs/work/history-retrospective/plan.md`: a mechanical index of every
source, built 2026-08-11. Nothing here interprets anything. Every field is parsed
from a filename, read from a document's own header, or taken from git — and where
a date had to be inferred, the inference method is recorded beside it.

## The five index files

| File | What it indexes |
| --- | --- |
| `index-corpus.md` / `.json` | 1,542 session-corpus files — date, title, branch, filename convention, and summary-vs-plan classification |
| `index-git.md` | Three clones: commit counts, per-month histogram, tags, and the 21 branches the older clones carry that this one does not |
| `index-adrs.md` / `.json` | 318 ADRs — number, title, **verbatim** status, and git's date for the commit that added each one |
| `index-chats.md` / `.json` | 235 conversations — 230 dated Claude exports with their own titles and timestamps, plus 5 undated ChatGPT dumps |
| `index-origin.md` | The pre-repo era: three C# prototypes (52 source files, 2,693 lines) and the five ChatGPT design conversations |

`gaps-and-anomalies.md` collects what the counting exposed — nine items the
reading phases should explain rather than rediscover.

The scripts that produced all of it (`build-index.mjs`, `build-git-index.sh`,
`build-adr-index.mjs`, `build-chat-index.mjs`) sit beside their output and are
re-runnable.

## The shape of the record

| Era | Span | Sources |
| --- | --- | --- |
| C# prototypes | 2023-03-19 → 2023-04-03, revisited 2024-03 → 2024-05 | `IFPlatform`, `IFStory`, `StoryRunner` |
| ChatGPT design | undated; internally ordered, files 3 and 4 postdate 2023-04-01 | 5 text dumps, 704 KB |
| Claude design | 2024-06-26 → 2025-06-20 | 230 exports, 35 MB |
| TypeScript repo | 2025-03-29 → 2026-08-10 | 2,171 commits, 318 ADRs |
| Session corpus | 2025-01 → 2026-08 | 1,257 summaries + 285 plans/notes |

Roughly three and a half years, ending with Sharpee 5.0.0 on npm (2026-08-10)
and the Chord Writer DMG in Apple's notarization queue.

## What the index will not tell you

- **Whether a status line is true.** ADR statuses are recorded exactly as
  written; this project's own history says they drift.
- **Whether a branch was abandoned.** Absence from the current clone is not
  evidence; it is a place to look.
- **What actually happened in any month.** That is Phases 2 through 5. The index
  is the map, not the territory.
