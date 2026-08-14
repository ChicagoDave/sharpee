# Proposal: docs/ consolidation

**Status**: PLANNED — twelve items (P-1 through P-8, P-10, P-11, P-12, P-14)
planned via `docs/work/docs-consolidation/plan.md`, 2026-08-13. P-13 is DONE
(executed directly 2026-08-13); P-9 remains ACCEPTED but deliberately
unplanned (David: "hold 9" — see P-9). `proposal-review` ran 2026-08-08 and raised 2 blocking
findings plus 5 advisory. **Amended 2026-08-13** (session 756ff6) for the
zifmia retirement, which moved one inventoried directory and partly executed
P-4; P-3, P-4 and the headline inventory are annotated in place. The amendment
was targeted, not a re-review — no other item's premises changed. **Both blockers are void**: they assumed the
guides/reference destination was a sharpee.net route, and David ruled it an
in-repo quarantine (P-1). Eight items are ACCEPTED (P-1 through P-8); six
remain PROPOSED. **Every directory in `docs/` now has a disposition.**
**Origin**: conversation — David, 2026-08-08: "We _do_ need to clean up docs/. I say we move guides and references to sharpee/unofficial/, clean up the root documents and work folders to archive and really only architecture, context, design, and work should be there… I'd like to settle this more cleanly than a directive, so let's identify the docs files and folders and list a mitigation for each in a proposal."
**Date**: 2026-08-08
**Session**: 6ad977

## Context

`docs/` holds **30 top-level directories and one loose file** (`README.md`).

> **Inventory amended 2026-08-13.** Was 31. `docs/zifmia/` moved into
> `docs/_archive/zifmia/` when the zifmia product line was retired, which
> partly executes P-4 and adds a tenant to one of the trees P-3 consolidates.
> Both items are annotated below. Nothing else in this inventory moved.

**The keep-list is eight** (David, 2026-08-08 — the original four, plus
`proposals/`, `book/`, `core-concepts/` and `brainstorm/`):

| Survivor | Why |
| --- | --- |
| `architecture/` | ADRs — the decision record |
| `context/` | Session summaries and the aggregation dataset |
| `design/` | Design material |
| `work/` | Work targets and plans |
| `proposals/` | Mechanically required — `session-planner` reads it (ADR-0008 D5) |
| `book/` | Finished product artifact |
| `core-concepts/` | Required session-start reading per `CLAUDE.md` |
| `brainstorm/` | DevArch skill output — `/devarch:brainstorm` writes here |

So **22 directories need a disposition**, not 27 (was 23 before the 2026-08-13 amendment).

The directive's premise is sound and the inventory supports it: **14 of the 31
directories have had no commit in over a month**, six of them in over six
months. The inventory also surfaced four directories the directive did not
cover — which is what made this worth proposing rather than executing. All four
have since been ruled (below); the reasoning is kept because it is what a future
session will want.

This work-set is the descendant of a standing direction already on file: the
repo was once the intended landing place for everyone, and that role moved to
the website, then the Book, and the Chord transition finished the job.
`docs/` was never re-shaped to match.

### Inventory (git last-commit date, tracked file count, on-disk size)

**Keep — named in the directive**

| Dir | Last commit | Files | Size |
| --- | --- | --- | --- |
| `architecture/` | 2026-08-07 | 466 | 6.2M |
| `context/` | 2026-08-07 | 435 | 8.5M |
| `design/` | 2026-07-28 | 30 | 1.9M |
| `work/` | 2026-08-07 | 589 | 14M |

**Relocate to `docs/unofficial/`** (P-1, P-2, P-6)

| Dir | Last commit | Files | Size |
| --- | --- | --- | --- |
| `guides/` | 2026-08-05 | 13 | 132K |
| `reference/` | 2026-08-05 | 9 | 424K |
| `spec/` | 2026-06-21 | 10 | 268K |

**Git-cold** — no commit in a month or more, except `tutorials/` and
`feedback/` (~2 weeks), grouped here because they share the same disposition

| Dir | Last commit | Files | Size |
| --- | --- | --- | --- |
| `packages/` | 2025-12-27 | 117 | 836K |
| `templates/` | 2025-12-30 | 1 | 8K |
| `releases/` | 2026-01-01 | 1 | 8K |
| `agents/` | 2026-01-05 | 1 | 8K |
| `extensions/` | 2026-01-14 | 2 | 20K |
| `internal/` | 2026-02-04 | 61 | 4.3M |
| ~~`brainstorm/`~~ *(stays — DevArch output, P-4)* | 2026-05-10 | 9 | 168K |
| `zifmia/` | 2026-06-18 | 5 | 52K |
| `testing/` | 2026-06-18 | 8 | 84K |
| `screencast/` | 2026-06-20 | 1 | 16K |
| ~~`spec/`~~ *(to `docs/unofficial/`, P-6)* | 2026-06-21 | 10 | 268K |
| `getting-started/` | 2026-06-21 | 2 | 24K |
| `platform/` | 2026-06-21 | 2 | 12K |
| `development/` | 2026-06-21 | 6 | 52K |
| `tutorials/` | 2026-07-23 | 8 | 44K |
| `feedback/` | 2026-07-24 | 1 | 4K |

**Warm but unnamed by the directive** — `core-concepts/`, `proposals/` and
`book/` now stay (P-13, P-8, P-7); `actions/`, `api/` and `publish/` are all
archived (P-5). **Every directory in `docs/` now has a disposition.**

| Dir | Last commit | Files | Size |
| --- | --- | --- | --- |
| ~~`actions/`~~ *(archived, P-5 — warm only because `85d54966` dismantled it)* | 2026-08-07 | 17 | 84K |
| ~~`api/`~~ *(archived, P-5 — superseded website material)* | 2026-08-05 | 24 | 672K |
| `core-concepts/` | 2026-08-06 | 1 | 48K |
| ~~`publish/`~~ *(archived, P-5 — superseded by the publish-npm workflow)* | 2026-08-06 | 1 | 32K |
| `proposals/` | 2026-07-31 | 1 | 24K |
| `book/` | 2026-08-01 | 420 | 4.2M |

**Archive trees**

| Dir | Last commit | Files | Size |
| --- | --- | --- | --- |
| `_archive/` | 2026-07-19 | 123 | **39M** |
| `_archived/` | 2026-02-16 | 101 | 840K |
| `archive/` | 2026-08-02 | 156 | 2.3M |
| `context/archive/` | (inside `context/`) | 420 | — |

### Four things the directive did not cover — now ruled

All four were raised as open questions and answered by David on 2026-08-08.
**Three stay; `spec/` goes to `unofficial/`** — it was first ruled "stays" and
reversed the same day. Recorded here with the reasoning that made each a
question, since the reasoning is what a future session will want.

1. **`docs/proposals/`** — this file lives in it, and `session-planner` refuses
   to plan from items outside it (ADR-0008 D5); DEVARCH.md rule 18a hardcodes
   the path. Keeping it was mechanically forced. → **P-8, ACCEPTED**
2. **`docs/book/`** — 4.2M and 420 files of finished, QA'd product that happens
   to sit under `docs/`. Neither stale nor documentation-about-the-repo, so
   neither "keep" nor "archive" obviously fit. → **P-7, ACCEPTED**
3. **`docs/spec/`** — nine normative documents, ~4,800 lines. First ruled
   "stays" on the argument that age was the wrong signal; **reversed the same
   day** once David named the real objection: the premise is good, the content
   is out of date. It goes to `unofficial/` with an issue to revisit.
   → **P-6, ACCEPTED (revised)**
4. **`docs/core-concepts/`** — named in `CLAUDE.md` as required session-start
   reading. Staying resolves the instruction-breakage risk, but **not** the
   content problem: it still describes `@sharpee/text-service`, deleted by
   ADR-174. It is read at the start of every session, so its staleness
   actively misinforms. → **P-13 (new)**

---

## Items

### P-1: `unofficial/` is an in-repo quarantine, barred from automated work
- **Decided**: David, 2026-08-08 — "the unofficial folder (it can be in the repo
  root or in docs) is explicitly barred from proposal or planning or research
  unless directed by a human."
- **The model** (David, same day): *"it's almost like Junk Mail and to use
  anything you have to move it out first."* That is the operational rule, and it
  is stronger than a read-ban: nothing in `unofficial/` may be **cited, planned
  from, or treated as current where it sits**. Recovering a file means moving it
  out — a deliberate, human-directed act that forces the re-qualification stale
  content needs before it can be leaned on again.
- **Done when**: the folder exists and the bar is written where agents read it
  (see P-14), stating four things: it is **in-repo, not published**; its
  contents are **unmaintained**; it is **out of scope for proposal, planning,
  and research** unless a human directs otherwise; and **using anything requires
  moving it out first**.
- **Path: `docs/unofficial/`** — revised 2026-08-08 after reading DevArch's
  plan `plan-lifecycle-and-folder-controls`. I had chosen repo root; DevArch's
  Phase 4 builds `resolution-anchors.sh`, whose default resolution is
  `docs/<name>`, and its dogfood step moves that repo's own junk into
  `docs/unofficial/`. A repo-root path would require a
  `.devarch/resolution-anchors.json` override on day one. Matching the default
  means the read-ignore gate works here with zero configuration, which outweighs
  my original tidiness argument.
- **What this ruling dissolved**: the two blocking review findings both assumed
  a sharpee.net route. Nothing is published, so ADR-244's minimal-scroll rule
  does not apply and ADR-281's "canon is canon because it is maintained" is not
  threatened. No ADR is needed — this is not a durable promise to readers,
  because there are no readers outside the repo.
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-2: Move `docs/guides/` and `docs/reference/` into `docs/unofficial/`
- **Done when**: both trees (22 files, 9,530 + 3,395 lines) live under
  `docs/unofficial/`; neither exists at its old path; nothing is deleted; in-repo
  references to the old paths are repaired per P-12.
- **Depends on**: P-1 (ACCEPTED)
- **Unblocked**: review flagged this twice on the assumption of a site route.
  Both findings are void — see P-1. It is a plain move again.
- **The duplication finding still stands, and the quarantine is the answer to
  it.** The site already carries this material in the split form ADR-244
  mandates: **53** pages under `chord/stdlib` against `stdlib-reference.md`'s
  3,957 lines, **55** under `chord/guide` against `chord-language.md`'s 2,194,
  **23** under `chord/cookbook` against `stdlib-cookbook.md`'s 1,203. These are
  superseded copies, which is exactly what a quarantine is for — no diff pass
  is needed, because nothing here is being promoted to anything.
- **Worth knowing on the way out**: `transcript-testing.md` and
  `creating-a-language-implementation.md` have no site equivalent, so they are
  the two files whose material genuinely leaves circulation. The transcript one
  is already covered — the author-facing gap it leaves is #246.
- **Accepted**: David, 2026-08-08.
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-3: Resolve the three archive trees to two destinations, by what they hold
- **Done when**: `_archive/`, `_archived/` and `archive/` no longer exist at
  `docs/` top level; all 380 files are preserved, none deleted; and each landed
  at the destination its content warrants (below). `docs/context/archive/`
  (420 files) is **untouched and still at its current path**.
- **The split, and the principle behind it** (David, 2026-08-08: the archive
  "would be `docs/unofficial/archive`"). Checked what each tree actually holds
  rather than treating "archive" as one kind of thing:

  | Tree | What is in it | Destination |
  | --- | --- | --- |
  | `archive/` (27 dirs) | **24 carry a `plan.md`** — archived work targets (`chord-211-core`, `chord-author-pipeline`, …) | **`docs/work/archive/<slug>/`** — DevArch Phase 3's canonical path |
  | `_archive/` (4 dirs) | `site` 5.1M, `web-save` 24M, `website` 9.8M — old website material — **plus `zifmia/` (5 banner-topped operator guides, added 2026-08-13)** | **`docs/unofficial/archive/`** |
  | `_archived/` (28 entries) | Loose superseded docs — `blog/`, `book/`, `debug-mode.md`, `forge-brainstorm.md`, `grammar-table.md`, … | **`docs/unofficial/archive/`** |

  The principle that separates them: **an archived plan is history you may
  legitimately consult; archived documentation is junk mail.** Plans keep a
  DevArch-managed lifecycle and stay readable — `docs/work/` is an anchor and
  is not behind the read-gate, which is what makes retro analysis over old
  plans possible at all. Superseded documentation goes behind the gate, where
  using it means moving it out first.

  This is why the earlier "single tree under one name" wording was wrong, and
  it is a better answer than picking whichever of three names looked tidiest.
- **The three `archive/` entries with no `plan.md`** need a look before moving:
  `chord-grammar-ordering` (analysis scripts + JSON dumps), `chord-parity`
  (design notes and a roadmap), and `tutorial` (`v01.ts`…`v18`, the tutorial
  checkpoint series). None is a plan, so none obviously follows the other 24.
- **Constraint**: `docs/context/archive/` is an aggregation dataset and its
  location is deliberately stable — it is excluded from this item, not merely
  deferred within it, and it stays readable for the same reason archived plans do.
- **Note**: overlaps issue **#215** ("Decide a home for the archives — 5
  locations, 47M and growing"), which is the wider version of this problem.
  `_archive/` alone is 39M, so this item is most of #215's mass.
- **Why `docs/work/archive/` for the plans**: DevArch Phase 3 verified that
  `docs/work/*/plan.md` is a single-segment glob that does **not** match two
  levels deep, against all seven consumers — so an archived plan stops being
  treated as active without any code change.
- **P-4's destination is the unofficial archive**, since none of its fourteen
  trees is a work target.
- **Accepted**: David, 2026-08-08; re-accepted the same day with the
  two-destination split after the DevArch plan made the original single-tree
  wording self-contradictory.
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-4: Archive the fourteen git-cold trees
- **Scope**: `packages/`, `templates/`, `releases/`, `agents/`, `extensions/`,
  `internal/`, `zifmia/`, `testing/`, `screencast/`, `getting-started/`,
  `platform/`, `development/`, `tutorials/`, `feedback/`.
- **Excluded**: `brainstorm/` (David, 2026-08-08) — it is a DevArch skill output
  directory, the same category as `proposals/` in P-8. It is git-cold because
  `/devarch:brainstorm` has not run since 2026-05-10, not because it is dead.
- **Done when**: each is moved (never deleted) into **`docs/unofficial/archive/`**
  per P-3, and `docs/` no longer carries any of them at top level.
- **One to check individually before moving**: `tutorials/fernhill/` (may be
  superseded by the site's Chord tutorial, or may be the only copy).
- **AMENDED 2026-08-13 — `zifmia/` is already done, and its reasoning is void.**
  This item said `zifmia/` "likely belongs beside the tool at `tools/zifmia/`,
  not in an archive," on the grounds that it documented a shipping product.
  Both halves are now false: the zifmia line was retired that day (the name was
  misused — the same server shipped twice, as `tools/zifmia` and `tools/shite`)
  and the tool itself is archived at `tools/_archive/zifmia`. The five
  deployment docs moved to `docs/_archive/zifmia/` with per-file retirement
  banners, kept because ADR-153 AC-9 requires operator documentation to exist.
  So this item's scope is **thirteen** trees, not fourteen; `zifmia/` needs
  only to be carried along by P-3's archive consolidation, not dispositioned
  again.
- **The signal that was wrong, and where else it applies**: `brainstorm/` was
  in this item because it is git-cold. Git-coldness measures *when a tool last
  ran*, not whether the directory is live, so it misclassifies every
  tool-output location. Checked the rest against what DevArch actually writes:
  `docs/context/`, `docs/proposals/`, `docs/work/`, `docs/brainstorm/` and
  `docs/objectives/` are the referenced paths. The first four are on the
  keep-list; `docs/objectives/` does not exist yet and will appear the first
  time `/devarch:objective` runs. **No other directory in this item's scope is
  a tool output.** `agents/` was the one worth a second look — it holds a single
  `work-summary-writer.md` — but nothing reads it; the live agent definitions
  are elsewhere.
- **Accepted**: David, 2026-08-08, less `brainstorm/`.
- **Depends on**: P-3 (ACCEPTED)
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-5: Archive `actions/`, `api/` and `publish/`
- **Done when**: all three are moved into **`docs/unofficial/archive/`** per
  P-3 and nothing is deleted. With this item done, every one of `docs/`'s 31 directories has a
  disposition.
- **Also archive `scripts/publish-npm.sh`** — the stale manual-publish script
  (`VERSION="0.9.64-beta"`, WSL path `/mnt/c/repotemp/tsf/...`) that `npm-ci.md`
  Part E's own E3 recommends removing. Outside `docs/`, included here because it
  is the same superseded material.
- **`docs/publish/` → archive** (David, 2026-08-08): outdated and superseded by
  `.github/workflows/publish-npm.yml`, which does trusted publishing over OIDC
  (`id-token: write`). The doc's *procedure* is indeed superseded.
- **`docs/api/` → archive** (David, 2026-08-08): "old website material that's
  been superseded." 24 static HTML pages (`actions-*.html`, `authoring.html`),
  superseded by the site's 53 `chord/stdlib` pages and `sharpee/actions-and-traits`.
- **`docs/actions/` → archive** (David, 2026-08-08). It is not documentation:
  it is an abandoned package, `@sharpee/actions` v0.1.0 — "Event-driven action
  system for Sharpee IF Platform" — with `src/`, `examples/` and a `tsconfig.json`.
  Never a pnpm workspace member, no dependents, never built or published. Its
  last substantive commit was `25e9c868` on **2026-01-14**; nothing outside
  session summaries references it.
- **The second bad signal, and the mirror of P-4's.** I classified `actions/`
  as "warm" because git showed a commit on 2026-08-07. That commit was
  `85d54966`, which *deleted its `package.json`* to stop the DevArch test gate
  walking it as a spurious 37th suite — the directory was being dismantled, not
  maintained. So:
  - **git-cold ≠ dead** — `brainstorm/` was cold because a tool had not run (P-4).
  - **git-warm ≠ alive** — `actions/` was warm because someone was removing it.

  Both misreadings came from using commit recency as a proxy for liveness. The
  reliable question is *who writes here and who reads here*, which is what the
  P-4 sweep asked, and the question every remaining disposition was settled on.
- **Archiving `api/` breaks a link in a published npm README** — see P-12, which
  this finding widens. Not a reason to keep `api/`; a reason to fix the README
  in the same commit that moves it.
- **Part E goes with it.** I raised its three unchecked boxes (E1 scope-level
  2FA, E2 token revocation, E3 removing the stale script) as possible live work;
  David: *"it's old! — archive it."* Recorded as decided — the checklist is
  archived along with the document, not extracted.

  One fact worth stating once, because it outlives the paperwork either way:
  whether the `@sharpee` scope has *"require 2FA and disallow tokens"* set, and
  whether the `~/.npmrc` token is still live, are properties of the npm account
  rather than of this repo. Archiving the doc settles the doc. It is not a claim
  about the account, and nothing in this proposal checks it.
- **Two live references break** and are P-12's to repair:
  `docs/work/readme-audit/plan.md:7`, and `docs/core-concepts/README.md:169`,
  which cites `docs/publish/npm-ci.md` §10.2 for "full detail" on the seventh
  registration point for a publishable package. That second one sits in a file
  every session is instructed to read, so it is P-13's problem too.
- **Accepted**: David, 2026-08-08 — `actions/`, `api/` and `publish/` all archived.
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-6: `docs/spec/` moves to `docs/unofficial/`, with an issue to revisit its purpose
- **Done when**: `docs/spec/` (10 files, 268K) lives under `docs/unofficial/`
  alongside P-2's material. The issue is filed: **#247**, "Revisit the purpose
  of docs/spec/ — the premise is good, the content went stale."
- **Decided**: David, 2026-08-08 — *"I kind of like the premise I had for it,
  but it's out of date, so this goes to unofficial with a gh issue to maybe
  someday revisit its purpose."*
- **Reverses an earlier ruling in this same proposal.** P-6 was first accepted
  as "stays", on my argument that it is the only written conformance contract
  for the engine and that git-coldness was the wrong signal. The second look is
  better: *out of date* is a different objection from *old*, and it is the
  decisive one. A stale normative document is worse than an absent one, because
  "MUST" and a conformance table read as current no matter when they were
  written. Quarantine is the honest place for a spec nobody has re-checked.
- **Consequence worth naming.** Under the P-1 junk-mail rule, `05-engine.md`'s
  normative turn cycle and conformance table, and `01-data-model.md`'s
  determinism MUST with its `SeededRandom` contract, become uncitable where they
  sit. That is the intent — they should not be cited until re-qualified — but it
  does mean the engine has **no citable written contract** until the issue is
  picked up. Worth knowing rather than discovering.
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-7: The Sharpee Book stays at `docs/book/`
- **Done when**: `docs/book/` is untouched by the sweep and is named as a
  survivor in `docs/README.md`.
- **Decided**: David, 2026-08-08. 420 files, 4.2M, complete and QA'd as of
  2026-06-23.
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-8: `docs/proposals/` stays at its current path
- **Done when**: `docs/proposals/` is named as a survivor in `docs/README.md`.
- **Decided**: David, 2026-08-08 — and mechanically forced regardless:
  `session-planner` refuses to plan from items outside it (ADR-0008 D5) and
  DEVARCH.md rule 18a hardcodes `docs/proposals/<slug>.md`.
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-9: `docs/work/` holds the one active plan; everything else is dispositioned and moved
- **The rule** (David, 2026-08-08): *"only active plans cannot be swept —
  everything else has to get explicitly mitigated and moved,"* and *"we're only
  ever working on one plan at a time anyway."*

  So there is no staleness heuristic to build and no taxonomy to maintain.
  **`.current-plan` names the active plan. That target stays. Every other target
  gets an explicit disposition from David and then moves.** Not-yet-dispositioned
  is a state to resolve, never a state to leave.
- **Done when**: `docs/work/` contains the target `.current-plan` points at, plus
  `docs/work/archive/`. Every other target has been dispositioned by David and
  moved to `docs/work/archive/<slug>/`.
- **The backlog**: **110 targets**, of which `.current-plan` names one
  (`ide-go-live`). **109 need a disposition.**
- **Counts restated 2026-08-13**: **117 targets**, and the pointer has moved
  twice since this was written — it named `ide-go-live`, then
  `adr-312-cli-test-recording`, and now `chord-writer-intel`, which is DONE. So
  116 need a disposition, and the figure grows with ordinary work; it is a
  backfill against a moving baseline, not a fixed list. Rule 18b is live in
  `DEVARCH.md` (exercised twice on 2026-08-13), so no NEW orphans accumulate;
  whether Phase 3's archive-on-DONE has shipped was not confirmed and should be
  before this item is planned. For context on why no automatic
  rule would have worked: 22 carry a CURRENT or PENDING phase, 56 have a plan
  with every phase closed, and **32 have no `plan.md` at all** — folders of
  notes and context that were never plans. Only the pointer distinguishes the
  live one, which is exactly David's point.
- **This supersedes #214's framing**, which scoped "archive 86 stale entries."
  The real number is larger and the rule is simpler.
- **Depends on**: DevArch `plan-lifecycle-and-folder-controls` Phases 1-3 for
  the disposition vocabulary and the archival move. Building any of it here
  would duplicate upstream work.
- **Two corrections I made getting here, both worth keeping.**
  1. I first reported six long-CURRENT plans as "shipped" or "obsolete",
     inferring from the existence of `packages/media`, `packages/runtime`,
     `WorldEventSystem.ts` and `packages/queries`. DevArch's plan names that
     exact inference as its cautionary case, under a constraint that disposition
     is the user's *"not on a timer, not on a heuristic, and **not on
     evidence**."* Evidence may justify asking; it is never the answer.
  2. I then measured "active" as "has a CURRENT phase", which is also wrong -
     `ide-go-live` is the active plan and has five COMPLETE phases and no CURRENT
     one. Under the pointer rule the question does not arise.

  Both errors were me building a classifier where a pointer already existed.
- **The forward fix is upstream, and P-9 is only the backfill** (David,
  2026-08-08: *"when we change the plan pointer, we should immediately mitigate
  it — that's a devarch thing"*). DevArch's two halves already compose to that
  rule:
  - **Phase 1 rule 18b** — when `session-planner` is about to point
    `.current-plan` at a new slug while the old plan still has a non-DONE,
    non-ABANDONED phase, the session must ask for a disposition first. Never a
    silent supersession.
  - **Phase 3** — a plan reaching Plan Status DONE or ABANDONED is archived at
    that moment.

  Between them, a pointer change always leaves the old plan resolved: already
  archived if it finished, or disposition-asked if it did not. No third state.

  The defect they close: rule 18a closes *proposal items* at session end, nothing
  closed *plan phases*, and `work-summary-writer` only ever advances the plan
  `.current-plan` points at — so a plan orphaned by a new slug stayed CURRENT
  forever. That is how 109 targets accumulated.

  **Once 18b and Phase 3 ship, no new orphans accumulate.** P-9 is strictly the
  109 that predate the rule; it is a one-time debt, not a recurring sweep.
- **Accepted**: David, 2026-08-13 (session 756ff6)
- **Status**: ACCEPTED

### P-10: Stop DevArch runtime state accumulating in `docs/context/`
- **Done when**: the 103 gitignored runtime files under `docs/context/` — 68
  `.devarch-events-{id}.jsonl`, 23 `.session-state-{id}.json`, 10
  `.devarch-gate-blocks-{id}`, one `.devarch-gate-{id}`, one `.active-session` —
  are either pruned on a stated retention rule or relocated out of `docs/`.
- **Note**: gitignored, so invisible to `git status` and to every count above,
  but growing once per session and sharing a directory with the session
  summaries that are the point of `context/`.
- **Accepted**: David, 2026-08-13 (session 756ff6)
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-11: Rewrite `docs/README.md` to describe the settled shape
- **Done when**: `docs/README.md` lists the eight surviving directories, says
  what belongs in each, and states where the moved material went and why — so
  the next person does not re-derive this from directory listings, and does not
  mistake an archived tree for current material.
- **Depends on**: P-1, P-2, P-3, P-4, P-5
- **Accepted**: David, 2026-08-13 (session 756ff6)
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-12: Repair references to moved paths, including published ones
- **Done when**: both of these return nothing unintentional —
  - in-repo relative paths:
    `grep -rn 'docs/guides\|docs/reference\|docs/actions\|docs/api\|docs/getting-started\|docs/publish' CLAUDE.md packages/*/CLAUDE.md .claude/ tools/`
  - **absolute GitHub URLs in published package READMEs**:
    `grep -rn 'github.com/ChicagoDave/sharpee/blob/main/docs/' packages/*/README.md`
- **The published-README case, found 2026-08-08 while archiving `api/`.**
  `packages/sharpee/README.md` — which ships to npm — carries three absolute
  links into `docs/`, and the accepted items break two of them:
  - L96 → `docs/getting-started/authors/README.md` — **breaks** (P-4 archives
    `getting-started/`, already ACCEPTED)
  - L97 → `docs/api/README.md` — **breaks** (P-5 archives `api/`)
  - L98 → `docs/architecture/adrs/` — survives
  These are `github.com/...` URLs, so no grep for a relative `docs/` path finds
  them, and they are user-facing on npmjs.com rather than merely internal. This
  is the single most externally-visible breakage in the whole consolidation, and
  it was invisible to the item's original Done-when.
- **Depends on**: P-2, P-4, P-5
- **No longer in scope**: the `core-concepts` references (`CLAUDE.md:84`,
  `packages/world-model/CLAUDE.md:13`) and `DEVARCH.md` rule 18a's
  `docs/proposals/` path — both targets now stay put, so neither reference
  breaks.
- **Note**: this is the item that determines whether the cleanup is felt as an
  improvement or as a week of broken references. Worth doing in the same commit
  as each move rather than as a trailing pass.
- **Accepted**: David, 2026-08-13 (session 756ff6)
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

### P-13: Fix `docs/core-concepts/README.md`, which every session is told to read
- **Done when**: the file no longer describes removed architecture — specifically
  `@sharpee/text-service`, deleted by ADR-174 and replaced by the engine prose
  pipeline plus channel I/O — and its claims are checked against current
  `packages/` source rather than against its own history.
- **Why it is separate**: keeping the directory (P-5's original scope) resolved
  where the file lives and nothing about whether it is right. `CLAUDE.md:84`
  instructs every session to read it at start, and
  `packages/world-model/CLAUDE.md:13` cites it for the behaviors-own-mutations
  pattern. A stale file in that position misinforms every session that follows
  the instruction — which is a sharper problem than any directory placement in
  this proposal.
- **Note**: this is a content fix, not a move, and it is the one item here with
  a per-session cost while it goes unfixed.
- **Accepted**: David, 2026-08-13 (session 756ff6)
- **DONE 2026-08-13** — executed directly rather than planned, at David's
  instruction ("do 13"), because it is independent of every move in this
  proposal and was wrong for every session in the meantime. What was found:
  - The `@sharpee/text-service` half was **already fixed** — the removal note
    and the prose-pipeline/channel-IO replacement were in place.
  - The second clause (claims checked against source) was not. A mechanical
    diff of the package list against `packages/` found `@sharpee/branch-tester`
    — the ADR-307 tree-document test runtime — **undescribed entirely**, and
    `channel-service` still listing a "multi-user server" among its hosts.
    Both fixed.
  - **The standing "never rely on ADRs, read the code" directive did not
    exist.** `git log -S` on this file returns nothing and a repo-wide grep
    finds it only inside session summaries claiming it was written. Today's
    `pattern-recurrence-detector` had named that pattern top-priority
    *precisely because* it "recurred after its own fix was in place" — the fix
    was never in place. Now written, as `## Reading This Repository`, with the
    two concrete 2026-08-13 instances and a note that its own absence was an
    instance of the pattern.
- **Status**: DONE

### P-14: Adopt DevArch's `unofficial/` gate, and write the rule for humans
- **Done when**: the rule is stated in `CLAUDE.md` in the same register as the
  existing MAJOR DIRECTIONS entries, in the Junk Mail terms David used:

  > `unofficial/` is junk mail. It is unmaintained, unpublished, and superseded.
  > Do not cite it, plan from it, research in it, or treat anything in it as
  > current. **To use anything in it, move it out first** — and moving it out is
  > a human decision, not yours.

  and the folder carries a `README.md` saying the same thing to a human who
  opens it directly.
- **Why this needs its own item**: P-1 records the decision; without this the
  decision has no reader. Every agent in this repo takes `CLAUDE.md` as binding
  and none of them will infer a quarantine from a directory name. A bar that
  lives only in a proposal is a bar that holds until the next session.
- **The mechanical half is already planned upstream, and better than what I
  sketched.** DevArch `plan-lifecycle-and-folder-controls` **Phase 4** builds a
  `Read|Grep|Glob` PreToolUse hook that exits 2 for any path resolving under the
  unofficial directory, with a release-instruction banner in exactly the terms
  David used — *move it out first, a human vouching for the file is the release
  condition*. It fails open on an absent/unresolvable path, and a bare repo-wide
  Grep with no `path` is a documented limitation rather than a silent gap. So
  this item's mechanical half is **adopt**, not build: take the gate when it
  ships, and confirm it resolves `docs/unofficial/` here.
- **Still Sharpee's to write**: the human-facing half. A hook refuses a tool
  call; it does not tell a person opening the folder what the folder is. The
  `CLAUDE.md` paragraph and the folder's own `README.md` remain this item.
- **Depends on**: P-1 (ACCEPTED)
- **Accepted**: David, 2026-08-13 (session 756ff6)
- **Status**: PLANNED (docs/work/docs-consolidation/plan.md, 2026-08-13)

---

## Interlock with DevArch

Read 2026-08-08: `../devarch/docs/work/plan-lifecycle-and-folder-controls/plan.md`
(Phase 1 CURRENT, 2–5 PENDING). It overlaps this proposal in four places, and in
every one DevArch is the right owner:

| DevArch | Meets this proposal at |
| --- | --- |
| Ph. 1–3 — plan terminal state, disposition prompt, archival to `docs/work/archive/<slug>/` | **P-9** becomes backfill; the mechanism is upstream |
| Ph. 3 — canonical plan-archive path | **P-3** — settled: 24 archived work targets follow DevArch to `docs/work/archive/`; non-plan archives go to `docs/unofficial/archive/` |
| Ph. 4 — `Read\|Grep\|Glob` gate on `unofficial/`, defaulting to `docs/<name>` | **P-1** path revised to `docs/unofficial/`; **P-14**'s mechanical half becomes *adopt* |
| Ph. 5 — immutability gate on six anchors: `unofficial`, `architecture`, `brainstorm`, `context`, `proposals`, `work` | **the keep-list** — see the gap below |

**The anchor gap.** DevArch's six anchors protect five of this proposal's eight
survivors. **`design/`, `book/` and `core-concepts/` are Sharpee-specific keeps
and get no immutability protection** — a `rm -rf docs/book` would not be blocked.
Worth deciding whether that matters; it is not a defect in either plan, just a
seam where a Sharpee decision has no upstream enforcement.

**One override this repo should set.** DevArch's plan anticipates it by name:
`.devarch/resolution-anchors.json` with `"architecture": "docs/architecture/adrs"`,
since Sharpee's ADRs are not at `docs/adrs/`. That is the same mismatch recorded
below as out-of-scope, and this is its proper fix — a config entry rather than
moving 466 files.

## Explicitly out of scope

- **The `docs/adrs/` vs `docs/architecture/adrs/` mismatch.** Noticed while
  assembling references for P-4: DevArch's skills read `docs/adrs/`, and
  Sharpee's 466 ADRs live in `docs/architecture/adrs/`. `docs/adrs/` does not
  exist, so `proposal-review` and `adr-review` currently assemble zero ADRs in
  this repo — including for this proposal's own review. Real, pre-existing, and
  nothing to do with consolidating `docs/`; recorded here so the next person to
  see an empty ADR reference set knows why. Do not "fix" it by creating
  `docs/adrs/`.

- **Deleting anything.** Every item above moves; none deletes. Any deletion is a
  separate decision.
- **`docs/context/archive/`** — ~~stays where it is, by standing direction
  (P-3).~~ **SUPERSEDED 2026-08-10**: the directory was consolidated into
  `/Volumes/Workspace/sharpee-corpus/context-history/` and removed from the repo
  (commit `a72bcef5`), so the whole session-summary history sits in one readable
  place. David's resolution when this item was raised against that move: the two
  rulings answer different questions — the standing direction governs
  **DevArch's** operation, where the tooling keeps its session records, while the
  consolidation serves **analysis**, and the analysis need is what overruled it.
  Precedence, not contradiction: analysis wins when the two collide over the same
  files. See `docs/work/history-retrospective/plan.md`.
- **Fixing the content of `guides/` and `reference/`.** Their staleness is
  tracked in #213 and is low priority by standing direction. This proposal moves
  them; it does not repair them — and since P-1 landed on an unpublished
  quarantine, no question of publishing known-wrong grammar arises.
