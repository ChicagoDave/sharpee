# Session Plan: Retrospective analysis of Sharpee's development history (C# origins → 5.0.0)

**Created**: 2026-08-10
**Plan Status**: DONE (2026-08-11 — all five phases complete; deliverables at
`/Volumes/Workspace/sharpee-corpus/retrospective/`, entry point `README.md`)
**Overall scope**: Read and verify the full ~3.5-year arc of Sharpee's development
— the March 2023 C# prototypes, the 2024 ChatGPT/Claude design conversations, the
March 2025 TypeScript rewrite, the invention of Chord, the macOS IDE, and the
2026-08-10 5.0.0 npm publish — and produce a written retrospective. This is
analysis and prose work over an archive: nothing under `packages/` changes, no
code is written, and the deliverable is a document, not a feature. **Read/write
work only. David wants the reading and synthesis phases (2 through 5) run by
Opus 5 or Fable 5 specifically** — a fresh read of the history, not a lighter
model's summary of it.
**Bounded contexts touched**: N/A — historical/archival analysis over prose and
code artifacts, not a change to any domain model.
**Key domain language**: N/A (see above). Corpus-specific terms this plan uses
consistently: **origin era** (C# prototypes + pre-repo design conversations,
2023-03 to 2025-03), **repo era** (the TypeScript monorepo, 2025-03-29 to
present, 2,171+ commits), **monthly digest** (one reader's fixed-schema summary
of a calendar month: shipped / broke / decided / carried forward), **throughline**
(a cross-cutting arc no single month shows — text-service born and deleted, the
transcript grammar built and cut, Tauri/zifmia set down, Chord's invention).

## References consulted
- `docs/context/session-20260810-2232-chord-writer-screenshots.md` (most recent
  session) — records the corpus consolidation that makes this plan possible
  (`/Volumes/Workspace/sharpee-corpus/`, 1,533 + 12 files, verified byte-for-byte
  before `docs/context/archive/` was deleted from the repo) and the
  already-agreed method (index → monthly read → throughline → verify against
  git/ADRs). **One correction this plan makes to that session's own addendum**:
  it says `chat-history/` (36 MB of raw exports) is "deliberately out of scope."
  The task that produced this plan explicitly reverses that — `chat-history/`
  reaches back to 2024-06, nine months before the repo exists, and is the only
  record of the pre-repo design period, so it is in scope (sampled, not read
  whole) starting at Phase 2.
- `docs/proposals/docs-consolidation.md` — eight items (P-1 through P-8) are
  ACCEPTED, none yet PLANNED (not fanned into this plan — none are retrospective
  work). Two constraints bear on this plan's scope: (1) **`docs/unofficial/` is
  a barred quarantine** (P-1) — "out of scope for proposal, planning, and
  research unless a human directs otherwise." None of this plan's sources live
  under `docs/unofficial/`, but if any phase surfaces material that has been
  quarantined there, it must not be cited without David moving it out first.
  (2) **A contradiction, resolved by David 2026-08-11**: P-3's "Explicitly out
  of scope" section states `docs/context/archive/` "stays where it is, by
  standing direction" — an ACCEPTED ruling from 2026-08-08. Two days later
  David directed the opposite and the archive was consolidated into the
  Workspace corpus. **His resolution**: the two rulings answer different
  questions. P-3's standing direction governs **DevArch's** operation — where
  the tooling keeps its own session records — while this work is **analysis**,
  and the analysis need is what overruled it. So it is a precedence rather than
  a conflict: when DevArch convention and analysis collide over the same files,
  analysis wins. P-3 is stamped accordingly in
  `docs/proposals/docs-consolidation.md`.
- Full sweep of `docs/architecture/adrs/` (318 files, this project's actual ADR
  location — `docs/adrs/` does not exist here, a known, deliberately-unfixed
  mismatch per `docs-consolidation.md`'s "Explicitly out of scope" section) was
  judged disproportionate: this plan makes no `packages/` change and introduces
  no domain model, so no ADR's Consequences section binds it. A targeted `grep`
  for retrospective/history/archive/methodology terms found no ADR governing
  historical analysis or archive methodology. Phase 1 does consult specific
  ADRs as **primary sources** (their Session field for dating, their Status
  lines as a known-unreliable signal per project memory) — that is data
  gathering, not a constraint check, and is scoped inside Phase 1 itself.
- `docs/context/project-profile.md` — no constraint bears on prose-only,
  no-`packages/`-change work; consulted to confirm the directory boundary this
  plan must not cross (`packages/`, `tools/`, `stories/` are all off-limits;
  the profile's own domain list is itself useful raw material for Phase 4's
  throughline work, not a constraint).

## Phases

### Phase 1: Mechanical index and git/ADR baseline
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A (see above) — every source in David's inventory, indexed
  without deep reading: the three C# repos (`/Volumes/Backup/archives/repos-old/`,
  117 .cs files across `IFPlatform`/`IFStory`/`StoryRunner`, excluding
  `PTRunner/`), the 5 ChatGPT design files (704 KB,
  `chat-history/chatgpt/`), the Claude exports (`reviewed/` 188 JSON,
  `platform/` 3 JSON, `claude/` 39 JSON), the session corpus
  (`/Volumes/Workspace/sharpee-corpus/`: `context-history/` 1,533 files,
  `work-history/` 12 files, filtering the ~366 plan/checklist/template files
  out of the summary set), this repo's git history (2,171+ commits, 110
  branches, 20 tags) plus the two sibling clones `sharpee_v1` (1,493 commits,
  ~30 branches not on `main` here) and `sharpee_v2` (1,920 commits, ~20
  branches), and the 318 ADRs under `docs/architecture/adrs/`.
- **Entry state**: Corpus consolidated and verified (done in the prior
  session — see References). Backup drive confirmed NTFS read-only; all
  outputs write to `/Volumes/Workspace/sharpee-corpus/retrospective/` or this
  repo, never to `/Volumes/Backup/`.
- **Deliverable**:
  - One structured index (e.g.
    `/Volumes/Workspace/sharpee-corpus/retrospective/index.md`, or a small set
    of per-source index files) recording, per document/commit/ADR: date (or
    best-effort inferred date with the inference method noted — the ChatGPT
    files are undated internally and dating them is explicitly part of this
    phase's work), title/slug, source category, and status where applicable.
  - Session-corpus entries normalized across the three filename conventions
    (`work-summary-<date>-<slug>.md`, `YYYY-MM-DD-HHMM-slug.md`,
    `session-YYYYMMDD-HHMM-<branch>.md`) into one date+slug+branch schema, with
    the ~366 non-summary files identified and excluded by name, not by date.
  - A git baseline: this repo's commit-date histogram by month, tag list,
    branch list; the same for `sharpee_v1`/`sharpee_v2` restricted to branches
    that do **not** exist on this repo's `main` (candidates for lost/abandoned
    work worth a look in later phases) — do not assume divergent branches are
    dead; note them for Phase 3/4 to check.
  - An ADR index: number, title, dated Session field, and its Status line
    flagged verbatim (project memory: ADR Status lines are known-unreliable,
    e.g. "Proposed" often means shipped — do not silently correct them here,
    just carry the flag forward).
  - A named list of **index-level gaps and anomalies** for the reading phases
    to explain rather than re-discover: the ~5-month conversation gap
    (2024-11 through 2025-02), `work-history/`'s earliest file (2025-01-03)
    predating this repo's first commit (2025-03-29) by ~3 months, and any
    other date discontinuity the index surfaces.
  - ~~Two open questions raised to David~~ — **both answered 2026-08-11 before
    Phase 1 began**:
    1. **Fan-out mode for Phase 3**: approved. David approved the plan as
       presented, Phase 3's fan-out included. Scale (how many agents, how
       batched) is confirmed with him when Phase 3 actually starts — the
       approval is of the method, not a blank cheque on agent count.
    2. **Deliverable format**: **a written retrospective AND a timeline.**
       Two artifacts, not one. Publication (e.g. sharpee.plover.net) is not
       part of this plan; David can decide that once he has read them.
- **Added 2026-08-11, David's scope addition**: two further timelines, both
  extractable mechanically from what the repo already records about itself.
  - **GenAI assistance timeline.** Every commit carries a
    `Co-Authored-By: Claude …` trailer naming the assisting model, so
    commits-per-model-per-month is a measured record rather than an estimate:
    10 distinct models across 2,055 non-merge commits, from the bare "Claude"
    of 2025-08 through Opus 4.5/4.6/4.7/4.8, Sonnet 4.6/5, Fable 5, and Opus 5.
    Delivered as `index-genai.md`. Churn (files/insertions/deletions per month)
    is reported raw and explicitly disclaimed — a month that deleted 12,000
    lines of retired grammar was one of the most valuable in the project.
  - **DevArch timeline.** `docs/workflow` enters git 2026-04-09 and
    `.devarch/descriptor.json` records `initializedAt` 2026-05-10, so DevArch
    adoption is datable. Three further signals: the 23 `.devarch-events-*.jsonl`
    logs in the corpus (701 event rows — hooks, gates, budgets, git operations,
    per session), the shift in session-summary structure from free-form prose to
    the rigid template (Status / Recurrence Check / Test Coverage Delta), and
    agent invocations recorded in the summaries themselves. Deferred to Phase 3
    as a dimension of the monthly read, since it is a story about *how the work
    changed shape*, not a separate corpus.
- **Exit state**: Every source in the inventory has an index entry; the two
  open questions have been put to David and answered (their answers become
  Phase 3's and Phase 5's entry states); no reading or synthesis has happened
  yet — this phase is purely mechanical.
- **Status**: DONE (2026-08-11). Deliverables at
  `/Volumes/Workspace/sharpee-corpus/retrospective/`: `README.md`,
  `index-corpus.{md,json}`, `index-git.md`, `index-adrs.{md,json}`,
  `index-chats.{md,json}`, `index-origin.md`, `index-genai.{md,json}`,
  `gaps-and-anomalies.md`, plus the five re-runnable build scripts.

### Phase 2: Origin era — C# prototypes through the TypeScript decision (2023-03 to 2025-03)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A — the pre-repo period: three C# prototypes, the
  ChatGPT design conversations, and the Claude exports through the ~5-month
  gap (2024-06 through 2025-02, 130 files across `reviewed/` + `platform/`).
- **Entry state**: Phase 1's index exists, including inferred dates for the
  ChatGPT files. **Run this phase under Opus 5 or Fable 5** (David's stated
  requirement for a fresh read, not a lighter-model summary).
- **Deliverable**:
  - A read (not exhaustive line-by-line, but a real read, not a skim) of the
    three C# prototypes' architecture: `IFPlatform/GameEngine.cs` +
    `StandardLibrary.cs` + `CloakOfDarkness/Story.cs`; `IFStory/WorldModel/`
    + `Grammar/` + `StoryEngine/`; `StoryRunner/DataStore/GraphEvents.cs` +
    `DataStore/World.cs` + `GrammarLibrary/Grammar.cs`. Note what each
    prototype was trying to be and how they relate to each other (sequence?
    parallel experiments?) — the file-mtime dating (2023-03-19 to 2023-04-01)
    is the only dating evidence available; state that plainly rather than
    implying more certainty than exists.
  - `chatgpt-1.txt` read in full (it is the origin document — "We're going to
    design a new parser-based Interactive Fiction platform using C#"); the
    other 4 ChatGPT files sampled for the design decisions that carried
    forward. Cross-reference against the C# prototypes: which design ideas in
    the conversation actually appear in the code, which don't.
  - The Claude exports from 2024-06 through 2025-02 (130 files, 2024-08's 71
    files being the largest single month) **sampled, not read whole** — a
    reasonable sampling strategy (e.g., every Nth file, or a title/date-driven
    selection weighted toward months with sparse coverage) stated explicitly
    in the deliverable so a future reader knows what was and wasn't read.
  - An explanation, evidenced rather than assumed, for the ~5-month gap
    (2024-11 to 2025-02) and for why `work-history/`'s first file
    (2025-01-03) predates the git repo's first commit by ~3 months — check
    whether that file is itself pre-repo planning material.
  - A written origin narrative: C# sketch → design conversation → (gap,
    explained) → the decision to rewrite in TypeScript → first commit
    2025-03-29. Cite specific files/commits for every claim, not "the
    conversations show."
- **Exit state**: The origin narrative exists as a standalone document with
  every claim traceable to a named source file; the C# prototypes' role
  relative to each other is stated (not left implicit); the gap is explained
  or explicitly marked unexplained if the evidence doesn't support a claim.
- **Status**: DONE (2026-08-11). Deliverable:
  `/Volumes/Workspace/sharpee-corpus/retrospective/origin-narrative.md`.
  Findings: StoryRunner's April-2023 project list is essentially today's package
  decomposition; the reciprocal-edge invariant, event-publishing world, and
  fluent grammar builder all date from that prototype; the name "sharpee" is a
  C#-era directory name by 2024-07-28, eight months before the rewrite; the
  language decision is two conversations on 2024-12-14, scoped by
  "single-user single-threaded"; gap 1 (2025-03-29 → 2025-06-23) is not absence
  of work but twelve weeks of uncommittable build-fighting, landed in one commit;
  the conversation archive ends 2025-06-20 and the summary corpus starts
  2025-06-28 because the instrument changed (chat → Claude Code).
  **Anomaly 3 closed**: the two "January 3, 2025" summaries are misdated by a
  year — they cite `pnpm` (added 2025-07-02) and `if.action.looking` (first
  2025-06-23), so they are 2026-01-03. The corpus therefore starts 2025-06-28,
  not 2025-01; the project spans 3 years 5 months, the summary record 14 months.

### Phase 3: Monthly reading — the repo era (2025-03 through 2026-08)
- **Tier**: Large
- **Budget**: 400 (this is the fan-out phase; if multi-agent orchestration is
  in play, most of this budget is consumed inside sub-agent sessions, not the
  orchestrating session — see Entry state)
- **Domain focus**: N/A — one reader per calendar month (~17-18 months:
  2025-03 through 2026-08), each returning the fixed schema: what shipped,
  what broke, what got decided, what carried forward. Sources per month: the
  session-corpus entries for that month (from Phase 1's normalized index),
  the git commit log for that month, and ADRs whose Session field dates into
  that month.
- **Entry state**: **Phase 1's fan-out question has been answered by David —
  do not assume it.** If David opted into multi-agent orchestration, this
  phase dispatches one sub-agent per month (or small batch of adjacent
  low-volume months) via the Task tool, each running under Opus 5 or Fable 5,
  each returning the fixed schema. If David declined, this phase reads months
  sequentially in-session, and — given the volume — is expected to span more
  than one actual working session; that is acceptable, this plan phase simply
  stays CURRENT across those sessions until all months are covered.
- **Deliverable**:
  - One monthly digest per calendar month, fixed schema (shipped / broke /
    decided / carried forward), each citing specific commits, ADR numbers,
    or session-summary filenames — never "the summaries say" without a named
    source.
  - Each digest cross-checks its month's session-summary claims against that
    month's actual git commits and ADR Session-field entries (method step 4:
    verify against git and ADRs, never summaries alone) — a summary claiming
    something shipped that the git log for that month doesn't support is a
    **finding**, not silently corrected.
  - A check of the sibling-repo branches Phase 1 flagged as not present on
    this repo's `main` (~30 on `sharpee_v1`, ~20 on `sharpee_v2`) against
    the month they'd fall in by last-commit date — note anything that looks
    like abandoned or unmerged work worth a mention in the retrospective,
    without assuming abandonment from git-coldness alone (the
    `docs-consolidation.md` proposal names that exact inference as unreliable
    — a directory or branch being untouched measures when someone last ran a
    tool, not whether the work was finished, merged elsewhere, or dropped).
- **Exit state**: Every month from 2025-03 through 2026-08 has a digest;
  every digest's claims are sourced; discrepancies between self-reported
  session summaries and git/ADR evidence are recorded as findings, not
  smoothed over.
- **Status**: DONE (2026-08-11). 13 readers ran in parallel via the Workflow
  tool (one per month, January 2026 split at the 13th; 2025-10/11 have no
  record to read), 0 errors, ~3M subagent tokens, 7.6 minutes wall clock.
  Deliverables: `monthly-digests.md` (339 KB) and `monthly-digests.json` at
  `/Volumes/Workspace/sharpee-corpus/retrospective/`, plus `extract-digests.mjs`
  and the 15 per-month manifests that fed the readers.
  Totals across the 13 digests: 253 shipped items, 195 broke, 249 decided,
  150 abandoned, and **113 recorded contradictions between the summaries and
  git** — the single largest finding of the phase, and the reason the
  verify-against-git instruction was made mandatory.
  Note a Phase 1 index bug fixed here: `<slug>-YYYYMMDD-HHMM.md` filenames were
  falling through to the header-date fallback and mis-filing (e.g.
  `work-summary-eprf-20250704-0215.md` landing in 2025-01). Filename dates now
  win over header dates; the index and manifests were rebuilt.

### Phase 4: Throughline synthesis
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — cross-cutting arcs no single month's digest shows:
  text-service (born, then deleted per ADR-174), the transcript grammar
  (built, then cut — the ADR-300 through ADR-306 testing-intelligence arc),
  Tauri/zifmia (`--runner` set down, multi-user status per
  `project_zifmia_not_active.md`), the invention of Chord (language versioned
  independently, ADR-257), the macOS IDE's emergence as the primary product
  surface alongside Chord, and the path to the 5.0.0 npm publish.
- **Entry state**: Phase 2's origin narrative and Phase 3's full set of
  monthly digests exist and are sourced.
- **Deliverable**: One document per identified throughline, each tracing its
  arc across the monthly digests it touches, verified against the ADRs and
  commits that mark its start/end (an ADR's Status line alone is not
  sufficient evidence that something shipped or was retired — cross-check
  against actual commits/deletions per project memory on unreliable ADR
  statuses). Explicitly look for throughlines beyond the six named above —
  those are David's starting list, not a closed set.
- **Exit state**: Every major throughline has a sourced, verified document;
  each one states clearly where it started, what changed along the way, and
  its current state as of 5.0.0.
- **Status**: DONE (2026-08-11). Eight tracers ran in parallel, 0 errors,
  ~988k subagent tokens, 9.3 minutes. Deliverables: `throughlines.md` (173 KB)
  and `throughlines.json`, plus `extract-throughlines.mjs`. Each arc returned a
  thesis, a dated timeline with commit/ADR citations, 870–1,080 words of
  analysis, 8–10 counter-evidence items, and a statement of what was verified
  directly versus taken from the digests.
  **The world-model tracer overturned a Phase 2 claim** and this plan records it
  rather than quietly amending the narrative: the reciprocal-edge invariant and
  publish-on-every-mutation did **not** survive. `SpatialIndex` (2025-07-02,
  331b0674) replaced the graph with a single-parent tree plus derived child
  index; no C# edge-type name appears in `packages/world-model/src`;
  `addRelationship`/`getRelated` is forward-only with zero production callers and
  a unit test asserting the reverse lookup returns false; `updateEntity` carries
  a commented-out "Future: Could emit change events here"; event sourcing was
  dropped in December 2025 as an "unnecessary technical rathole" and save/restore
  is a gzipped snapshot. What survived is the **decomposition and vocabulary**,
  which is real continuity — and ADR-278 (July 2026) proposes reintroducing both
  invariants as a new feature, prompted by an outside request rather than by
  memory of the 2023 prototype. `origin-narrative.md` must be corrected in
  Phase 5, not silently.
- **Testimony added mid-phase**: `testimony.md` collects David's own account —
  the three walls, the first-ChatGPT hallucinations, and (2026-08-11) the
  GenAI/SDLC insight that "refactoring whole swaths of code is workable," which
  is the interpretive key to the build-then-delete arc.

### Phase 5: Verification pass and the written retrospective
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A — final synthesis and delivery.
- **Entry state**: Phases 1 through 4 complete. **Phase 1's deliverable-format
  question has been answered by David — do not assume it.** Whatever format
  was chosen (document only / document + verified timeline artifact /
  published piece) governs this phase's Deliverable.
- **Deliverable**:
  - A final spot-verification pass: pick a sample of claims from the origin
    narrative, the monthly digests, and the throughlines, and re-check them
    against git/ADRs directly (not against the digests that already claim to
    have done this) — a check on the checking, per the same "verify, don't
    trust self-report" principle applied one level up.
  - The retrospective document itself, in whatever format Phase 1 settled:
    the 3.5-year arc from the March 2023 C# sketch through the 5.0.0 npm
    publish (2026-08-10, with the Chord Writer DMG in Apple's notarization
    queue the same evening), written in David's and the project's own
    language, citing sources throughout rather than asserting from synthesis
    alone.
  - If a verified-timeline artifact was requested separately from the prose
    document, produce it as a distinct, dated, sourced list — not folded
    silently into the prose.
  - If publishing was requested, prepare the piece in the format its
    destination needs (e.g. a sharpee.plover.net post per the existing blog
    pattern) but do not publish without a separate explicit go-ahead — this
    plan covers producing the artifact, not shipping it unasked.
- **Exit state**: The retrospective exists, is internally consistent with
  Phases 1 through 4's sourced findings, and any spot-check discrepancies
  found in this phase's own verification pass are either resolved in the
  document or flagged as open questions for David rather than silently
  dropped.
- **Status**: DONE (2026-08-11). Verification: 5 adversarial verifiers, 41
  load-bearing claims, 0 errors — **20 CONFIRMED, 19 PARTLY-WRONG, 2 REFUTED**,
  recorded claim-by-claim with the settling command in `verification.md`. Only
  the corrected wording was used in the deliverables. Both refutations corrected
  Phase 4 tracers: the friendly-zoo TypeScript canon was **moved** (nine
  100%-similarity renames in `97e26e41`, still at HEAD), not deleted; and the
  terminal-ADR count is 24 of 318 unqualified (28 widened), not 36.
  One verifier's note is itself a finding worth keeping: `throughlines.md` was
  **more careful than the claims compressed out of it** — it said "almost name
  for name" and hedged a percentage as a range, and the compression dropped both
  qualifiers. Every wrong claim in this retrospective was produced by summarizing
  something true and losing what made it true.
  `origin-narrative.md`'s Phase 2 error is struck through in place, not edited
  away. Deliverables: **`retrospective.md`** and **`timeline.md`**, with
  `README.md` rewritten as the entry point.

## Cross-phase discipline (applies to every phase)
- **No `packages/` (or `tools/`, `stories/`) changes at any point.** This is
  read-and-write-prose work; if a phase finds itself editing platform source,
  it has left this plan's scope.
- **Verify against git and ADRs, never summaries alone** (method step 4) —
  this is not just Phase 3's rule, it applies whenever any phase cites a
  claim from a session summary, a chat export, or an ADR's own prose.
- **All intermediate and final outputs write to
  `/Volumes/Workspace/sharpee-corpus/retrospective/` or this repo — never to
  `/Volumes/Backup/`**, which is read-only.
- **Phases 2 through 5 run under Opus 5 or Fable 5** per David's explicit
  requirement for a fresh, high-quality read of the history.
