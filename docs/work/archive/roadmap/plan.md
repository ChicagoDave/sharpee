# Session Plan: Add a public roadmap (docs/ + website)

**Created**: 2026-08-14
**Plan Status**: DONE
**Overall scope**: Add a durable, publicly-visible roadmap: a `docs/roadmap/`
index plus one file per item in-repo, and a page on the Sharpee website
(`website/`) that renders it. Seven items seed it, in the user's stated
order: (1) Sharpee and Chord Temporal Controls, (2) character model in Chord
(ADR-310), (3) visual novel client (ADR-311), (4) screen reader / blind-player
client (ADR-100), (5) multi-player website (no ADR yet), (6) native Windows
IDE (no ADR yet), (7) CYOA / choice-based mode (ADR-103). Forge does not
appear — it is retired, replaced by Chord.
**Bounded contexts touched**: N/A — infrastructure/tooling and documentation.
This is a repo-layout + content-authoring change (roadmap schema, doc tree,
one website page); it introduces no new domain concepts and changes no
runtime behavior, so DDD framing does not apply (session-planner's own "When
DDD Does NOT Apply" test — documentation-only work is listed explicitly).
**Key domain language**: N/A (tooling/docs). Existing platform vocabulary
carried through unchanged: ADR status vocabulary (DRAFT/ACCEPTED/Proposed/
etc.), "umbrella" (a multi-ADR work grouping, per
`docs/work/temporal-controls/`), Sharpee package version vs. Chord language
version as two independent numbers (ADR-257). One distinction this plan must
not blur: **"multi-user" and "multi-player" are deliberately different
concepts** in this project (multi-user = the Zifmia hosting line, ADR-152/
153/153a/156/164/175/176/177, not in active development; multi-player has no
ADR at all) — item 5 is multi-player, not a rename of the Zifmia work.

## References consulted
- `docs/architecture/adrs/adr-257-chord-language-version.md` — the Sharpee
  (`@sharpee/*` lockstep) version and the Chord *language* version
  (`CHORD_LANGUAGE_VERSION`) are independent numbers on independent cadences,
  and Chord Writer carries its own third version again — current values
  Sharpee 5.0.0, Chord language 3.0.0, Chord Writer 1.0.0. A roadmap item's
  "target version" field must say which of the three it means, never an
  unqualified "version," and the website nav already models this split
  (separate `version` per `NavSection`) — the roadmap page should follow the
  same convention rather than inventing a fourth.
- `docs/context/project-profile.md` — website stack is Next.js 16 / React 19
  under `website/`, no website changes recorded since 2026-08-02; confirms
  the website phase is touching a currently-quiet area, not one mid-refactor.
- `docs/context/session-20260814-1523-main.md` (most recent session, Open
  Items) — ADR-310 open questions 1, 3, 5 remain unresolved, plus the D14
  precedence gap flagged as blocking implementation; nothing was committed
  that session. The ADR-310 roadmap item must record status **DRAFT** with
  these open questions, not imply it is ready to build.
- `docs/proposals/docs-consolidation.md` — P-9 is **ACCEPTED but
  deliberately held** ("hold 9," David's ruling): `docs/work/` should
  eventually contain only the active plan's target plus `docs/work/archive/`.
  Not planned here — P-9 stays refused/deferred work, per session-planner's
  own refusal rule, and is noted only so this plan's own target
  (`docs/work/roadmap/`) is understood as subject to that same eventual
  disposition once it completes, not as something this plan executes.

## Phases

### Phase 1: Roadmap schema and the seven known items
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: N/A (docs/ tooling)
- **Entry state**: `docs/roadmap/` does not exist. None of the seven items
  has a target date or target-version recorded anywhere. Two items carry
  open questions this phase must resolve with the user before writing final
  content, not by inference:
  1. **Target date / target version per item.** First action of this phase
     is to ask the user for the target date / target Sharpee version /
     target Chord version / target Chord Writer version for each of the
     seven items (or an explicit "no target yet" per item). Do not write a
     target field until that answer is in hand; write `TBD` only if the
     user explicitly says there is no target yet.
  2. **What "multi-player website" means (item 5).** No ADR exists for it
     and it is explicitly not the Zifmia multi-user line. Confirm scope
     with the user (what a "multi-player website" is — a new
     multiplayer-capable game surface, a Zifmia successor, something else)
     before writing `roadmap-005.md`'s overview beyond a scope-TBD stub.
- **Deliverable**:
  - A roadmap item schema (item id `NNN`, title, **status**, **created
    date**, **target date / target Sharpee version / target Chord version /
    target Chord Writer version** as applicable, one-paragraph overview,
    links to the umbrella/ADR(s)/issue it traces to). Decide and record the
    status vocabulary (reuse ADR status terms — DRAFT/Proposed/ACCEPTED/IN
    PROGRESS/DONE/ABANDONED — rather than inventing a second vocabulary).
    **The schema must carry two status-related fields where they diverge**:
    the ADR's own header status, and the roadmap's evidence-based status
    (verified against actual implementing code, per the project convention
    that ADR Status lines are not reliable gating truth on their own — see
    item 4 below for why this matters).
  - `docs/roadmap/README.md` — index listing all seven items with id,
    title, status, and target at a glance, linking to each item file.
  - `docs/roadmap/roadmap-001.md` — Sharpee and Chord Temporal Controls.
    Status DRAFT ("all design, nothing authorized for implementation," per
    `docs/work/temporal-controls/README.md`). Links: the umbrella README,
    issue #263, ADR-315 (DRAFT, Decision section superseded by ADR-317),
    ADR-316 (DRAFT, deferred "future maybe"), ADR-317 (DRAFT, in progress).
  - `docs/roadmap/roadmap-002.md` — character model in Chord (ADR-310).
    Status DRAFT (amended 2026-08-14), three open questions remain (1, 3,
    5) per the most recent session's Open Items — cite it as the source,
    don't restate stale detail as settled.
  - `docs/roadmap/roadmap-003.md` — visual novel client (ADR-311). Status
    DRAFT; explicitly consumes ADR-310 and is not implementable ahead of
    it — carry that dependency into the item's overview and into its
    target (it cannot land before item 2).
  - `docs/roadmap/roadmap-004.md` — screen reader / blind-player client
    (ADR-100). ADR header says **ACCEPTED** (2026-01-13 identified,
    2026-02-18 accepted with implementation plan), but there is **no
    implementing package**: `packages/` has no screen-reader/accessibility
    package, and the only related hit in the whole tree is a single
    `aria-live` attribute in `platform-browser/src/channels/layout.ts`
    (verified 2026-08-14). Record the roadmap status from that evidence
    (effectively not-started/no-implementation), not from the ADR header —
    per the project convention that ADR Status lines are unreliable and get
    verified against code, never taken as read.
  - `docs/roadmap/roadmap-005.md` — multi-player website. No ADR exists.
    Every existing ADR touching this area (152, 153, 153a, 156, 164, 175,
    176, 177 — the Zifmia line) is **multi-user**, a deliberately different
    concept, and Zifmia itself is not in active development. Do not cite
    those ADRs as this item's design; record scope as pending the
    clarification above, with whatever the user confirms as the actual
    overview text.
  - `docs/roadmap/roadmap-006.md` — native Windows IDE. No ADR exists.
    Chord Writer (`tools/ide/`) is macOS-only today (`project.yml`:
    `platform: macOS`, `MACOSX_DEPLOYMENT_TARGET`). Status: no design, not
    started.
  - `docs/roadmap/roadmap-007.md` — CYOA / choice-based mode (ADR-103).
    ADR header status is **Proposed**; no implementing package found in
    `packages/`. Status: Proposed / not started — the header and the
    evidence agree here, unlike item 4.
  - `docs/README.md` updated: its directory table currently states "Nine
    directories are current and maintained" and enumerates them; add
    `roadmap/` as a tenth and correct the count, so the index doesn't go
    stale the moment this phase lands.
- **Exit state**: `docs/roadmap/README.md` and all seven item files exist;
  every item carries status + created date + a target (or an explicit
  user-confirmed TBD); item 4's status is the evidence-based one, not the
  ADR header's; item 5's scope is either confirmed by the user or explicitly
  marked TBD in its own file (never invented); and `docs/README.md`'s
  directory table matches reality.
- **Status**: DONE (2026-08-14)
- **Phase outcome**: `docs/roadmap/README.md` written with the item table, the
  status vocabulary, and the schema. Seven item files written
  (`roadmap-001.md` … `roadmap-007.md`), each carrying Status / Built? /
  Created / three Target fields / Traces to. `docs/README.md` updated: count
  Nine → Ten, `roadmap/` added to both the tree and the directory table.
  Targets are `TBD` throughout on the user's instruction ("a wrong date on a
  public page is worse than an honest blank"); item 005's product name is also
  TBD and is the user's to choose. Created dates taken from ADR headers where
  present, otherwise from `git log --diff-filter=A` (ADR-100 → 2026-01-13,
  ADR-103 → 2026-01-14).

### Phase 2: Website roadmap page
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: N/A (website content page)
- **Entry state**: Phase 1 complete — `docs/roadmap/README.md` and the seven
  item files are the source of truth this page presents. Before writing any
  Next.js code, read the relevant guide(s) under `node_modules/next/dist/docs/`
  per `website/AGENTS.md` — this Next version (16.2.11) predates training
  data and its conventions cannot be assumed.
- **Deliverable**:
  - A new page following the site's existing `page.tsx` + `content.mdx`
    pattern (e.g. `website/src/app/sharpee/` is the reference example: a
    thin `page.tsx` wrapping `<DocPage>` around an imported `Content`).
    Decide during this phase whether content is hand-authored in
    `content.mdx` (matching every existing page in the site today) or
    sourced from `docs/roadmap/*.md` at build time — the former matches
    current site architecture exactly; the latter is a new pattern with no
    precedent elsewhere in `website/` and should not be introduced without
    flagging it first.
  - All seven items rendered with their status, created date, and target
    date/version, using the **same version-label split as `nav.ts`**
    (separate Sharpee-version, Chord-version, and Chord-Writer-version
    display, never a single merged "version") per ADR-257.
  - A `website/src/lib/nav.ts` entry so the page is reachable from the rail.
    Placement is a design call for this phase, not pre-decided by the plan:
    the existing `Sharpee` section (platform-scoped) and a new top-level
    section (the roadmap spans Sharpee, Chord, and Chord Writer) are both
    defensible: the live `Sharpee`/`Chord`/`Chord Writer`/`Tutorial`
    sections are the precedent to weigh it against.
  - No CI/GitHub Actions work of any kind (repo convention — no CI gates).
- **Exit state**: The roadmap is visible at a real route on the site,
  reachable from the nav rail, showing all seven items with their status,
  created date, and target fields.
- **Status**: DONE (2026-08-14)
- **Phase outcome**: Content is **derived, not hand-authored** — the design call
  the plan deliberately left open. `website/scripts/sync-roadmap.mjs` parses
  `docs/roadmap/roadmap-*.md` and emits `website/src/lib/roadmap-data.json`;
  `page.tsx` renders from that JSON. This follows the site's existing
  derived-artifact precedent (`sync-chord-ebnf.mjs`) rather than introducing a
  new pattern, and it removes the drift the hand-authored option would have
  carried. Wired into `prebuild` and `predev` alongside the two existing
  scripts. Nav gets its own top-level `Roadmap` section (not filed under
  Sharpee or Chord — the roadmap spans both plus Chord Writer).
  **Verification** (2026-08-14): `npx tsc --noEmit` → exit 0; `npx next build`
  → "✓ Compiled successfully in 2.7s", 160/160 static pages (was 159),
  `/roadmap` listed `○ (Static)`. Real-path tests of the sync script run against
  a scratch tree, not stubs: missing source dir → exit 1; item missing a
  required header field → exit 1 naming the field; item missing its
  `## What it is` section → exit 1; unchanged re-run → exit 0, no write.
  **Not deployed** — local build only.
  **AGENTS.md deviation**: `website/AGENTS.md` requires reading
  `node_modules/next/dist/docs/` before writing Next code. That directory does
  not exist in this install (`ls` → No such file or directory), so the step was
  impossible. Mitigation: the page uses only APIs already in use elsewhere in
  `website/` — a default-exported server component, `DocPage`, and a JSON
  import — with nothing recalled from training.
