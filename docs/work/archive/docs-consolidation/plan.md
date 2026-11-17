# Session Plan: Consolidate docs/ per the docs-consolidation proposal

**Created**: 2026-08-13
**Plan Status**: DONE (2026-08-14) — all five phases complete. Twelve of the
twelve plannable items closed; P-9 remains held at David's instruction and was
never in this plan's scope.
**Overall scope**: Execute the twelve ACCEPTED, plannable items of
`docs/proposals/docs-consolidation.md` — quarantine three trees into
`docs/unofficial/`, resolve three overlapping archive trees to two
destinations, archive sixteen git-cold/superseded trees, repair every
reference the moves break (including a published npm README), stop DevArch
runtime state accumulating in `docs/context/`, and rewrite `docs/README.md`
to describe the settled shape. Nothing is deleted — every item moves.
**Bounded contexts touched**: N/A — infrastructure/tooling (repo documentation
layout, a build script, a published README, DevArch runtime housekeeping). No
new domain concepts are introduced; DDD framing does not apply per
session-planner's own "When DDD Does NOT Apply" test (documentation-only /
non-domain-behavior work is the second listed case, and this is a `docs/`
reorganization, not a code change).
**Key domain language**: N/A (tooling/docs). Vocabulary carried through from
the proposal: quarantine (`docs/unofficial/`), junk mail (P-1's operating
rule), disposition (a directory's assigned destination), archived plan vs.
archived documentation (P-3's principle).

## References consulted
- `docs/proposals/docs-consolidation.md` — the source of all twelve items
  planned below, cited by id throughout; carries the per-item Done-when
  criteria, the 2026-08-13 amendment (zifmia now a fourth `_archive/` tenant,
  P-4 down to thirteen trees), and the explicit exclusions this plan respects:
  P-9 stays ACCEPTED/unplanned (David: "hold 9"), P-13 stays DONE (already
  executed), nothing is ever deleted.
- `docs/context/project-profile.md` — no CI/CD gates exist for this kind of
  change (manual/local process per standing direction); pnpm 10.13.1 workspace
  conventions bound on `packages/sharpee`'s publishable-README constraint
  (`tsf` stages `README.md` into the npm tarball, so Phase 3's link repair is
  a published-surface fix, not an internal one); "Platform is secondary to
  Chord + the IDE" framing confirms this `docs/` reorganization is
  legitimately out-of-band tooling work, not a platform change requiring the
  packages/ discussion gate in `CLAUDE.md`.
- `docs/context/session-20260813-1306-feat-adr-312-cli-test-recording.md` —
  most recent session summary; records `docs/work/chord-writer-intel/plan.md`
  reaching Plan Status DONE with all three phases DONE (the outgoing plan this
  session repoints away from — see Supersession note below) and confirms rule
  18b was already exercised once this same day for a different supersession,
  so its mechanics are live and working in this repo.
- `docs/architecture/adrs/adr-244-website-minimal-scroll-ia.md` — governs
  authored reference/guide material reaching sharpee.net; its Consequences
  section binds future *content* phases to the minimal-scroll rule. P-1's
  ruling that `docs/unofficial/` is an in-repo quarantine (never published)
  means this ADR's scroll discipline does not apply to anything this plan
  moves — confirmed still true; no phase below publishes quarantined content.
- `docs/architecture/adrs/adr-281-chord-writer-embedded-help.md` — the DMG's
  embedded-help corpus is a separate, already-curated document set (its own
  Consequences section scopes it to "the rendered corpus + index," unrelated
  to `docs/guides`/`docs/reference`). Confirms P-2's "duplication finding" is
  about the *website's* split-page copies, not the DMG's embedded help — this
  plan does not touch the embedded-help corpus.

**Note on ADR location**: this repo's ADRs live at `docs/architecture/adrs/`,
not `docs/adrs/` (`docs/adrs/` does not exist — the proposal records this
mismatch explicitly as out of scope and directs future sessions not to "fix"
it by creating `docs/adrs/`). This plan reads ADRs from their real location
rather than treating the mismatch as "no ADRs to consult."

**Supersession note (rule 18b).** `docs/context/.current-plan` names
`docs/work/chord-writer-intel/plan.md`. That plan's own header already reads
`**Plan Status**: DONE (2026-08-13) — all three phases shipped`, and all three
phases are individually marked DONE with commits. Every phase is terminal, so
rule 18b's dispose-before-repoint trigger — "the plan it currently names still
has a phase that is neither DONE nor ABANDONED" — does not fire. No
disposition question is needed; the pointer below repoints cleanly.

## Phases

### Phase 1: Stand up the `docs/unofficial/` quarantine and relocate the three low-risk trees
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A (tooling) — new `docs/unofficial/README.md`,
  `docs/guides/` → `docs/unofficial/guides/`, `docs/reference/` →
  `docs/unofficial/reference/`, `docs/spec/` → `docs/unofficial/spec/`,
  `CLAUDE.md`
- **Entry state**: `docs/unofficial/` does not yet exist. `docs/guides/` (13
  files), `docs/reference/` (9 files), and `docs/spec/` (10 files) still live
  at `docs/` top level. Issue #247 ("Revisit the purpose of docs/spec/…") is
  already filed and OPEN — confirmed this session, so P-6's issue-filing
  half is already satisfied; only the move remains. `CLAUDE.md` has no
  quarantine rule. Whether DevArch's `plan-lifecycle-and-folder-controls`
  Phase 4 gate (the `Read|Grep|Glob` PreToolUse hook defaulting to
  `docs/<name>`) has shipped upstream is unconfirmed and this phase does not
  depend on it either way — P-14's mechanical half is adopt-when-available,
  not build.
- **Deliverable**:
  - `docs/unofficial/README.md` stating, to a human who opens the folder
    directly, the four points P-1's Done-when names: in-repo/not published,
    unmaintained, out of scope for proposal/planning/research unless a human
    directs otherwise, and "using anything requires moving it out first."
    (P-1)
  - `git mv docs/guides docs/unofficial/guides`; `git mv docs/reference
    docs/unofficial/reference` — nothing deleted, both trees intact at the
    new path. (P-2)
  - `git mv docs/spec docs/unofficial/spec`. No new issue needed — #247
    already exists; link it from the moved tree's own note if useful. (P-6)
  - `CLAUDE.md` gains a new paragraph, in the same register as the existing
    MAJOR DIRECTIONS entries, stating the rule in the Junk Mail terms P-14
    quotes verbatim: *"`unofficial/` is junk mail. It is unmaintained,
    unpublished, and superseded. Do not cite it, plan from it, research in
    it, or treat anything in it as current. To use anything in it, move it
    out first — and moving it out is a human decision, not yours."* (P-14)
  - Confirm, don't build: check whether the upstream DevArch gate already
    resolves `docs/unofficial/` (test a `Read` against a file under it if the
    hook is present); if the gate hasn't shipped yet, say so plainly rather
    than stub one in this repo. (P-14)
  - Same-commit reference repair (P-12), scoped to what these three moves
    break:
    - Re-run `grep -rn 'docs/guides\|docs/reference\|docs/spec' CLAUDE.md
      packages/*/CLAUDE.md .claude/ tools/` before and after each move.
    - `docs/README.md`'s Quick Start section links to
      `./guides/creating-stories.md` and `./guides/build-system.md`, and its
      "Documentation Structure" tree names `reference/` and `guides/` at top
      level — patch these to the new `unofficial/` paths now so nothing
      dangles. (Phase 5 / P-11 still owns the *full* rewrite of this file;
      this is the minimal patch the same-commit discipline requires here.)
    - `.claude/settings.local.json` carries two Bash-allow permission-string
      entries citing `docs/reference/chord-language.md` (lines 226-227). They
      are inert if stale — permission strings, not links, so a mismatch is
      silent rather than broken — but they are captured by P-12's own
      `.claude/` grep target. Update them to the new path for continuity, or
      note explicitly why they were left (e.g. the allow-list will simply
      regrow on next use); don't leave them unaddressed without a stated
      reason.
- **Exit state**: `docs/guides/`, `docs/reference/`, and `docs/spec/` no
  longer exist at `docs/` top level; all their content lives under
  `docs/unofficial/`, unchanged. `docs/unofficial/README.md` and `CLAUDE.md`'s
  new paragraph both state the quarantine rule. The P-12 grep for
  `docs/guides`/`docs/reference`/`docs/spec` across `CLAUDE.md`,
  `packages/*/CLAUDE.md`, `.claude/`, `tools/` returns nothing unintentional.
  `docs/README.md` has no dangling links into the moved trees (full rewrite
  still pending Phase 5).
- **Status**: DONE (2026-08-14)
- **Outcome**: All deliverables met. 37 renames, nothing deleted.
  `docs/unofficial/README.md` states P-1's four points; `CLAUDE.md` carries
  P-14's paragraph verbatim; `docs/README.md` patched minimally.
  - **P-14 gate: confirmed NOT shipped upstream.** No `resolution-anchors.sh`
    under `~/.devarch/`, `~/.claude/hooks/`, or `docs/workflow/hooks/`, and
    `.claude/settings.json` has no `PreToolUse` hook on `Read`/`Grep`/`Glob`.
    Nothing was stubbed in locally, per this phase's own instruction.
  - **Two files were misclassified by this phase's premise and pulled back
    out** — the "three low-risk trees" framing does not hold uniformly:
    - `docs/reference/chord.ebnf` → `packages/chord/chord.ebnf`. It is a live
      conformance artifact, not stale reference: `packages/chord/tests/
      language-version.test.ts` hashes it as ADR-257 D5's build gate. The move
      broke that test with ENOENT; verified failing, then verified passing
      after the relocation (56 files / 740 tests green in `@sharpee/chord`).
      A live build gate must not read out of the quarantine.
    - `docs/guides/transcript-testing.md` → `docs/core-concepts/transcript-testing.md`.
      `@sharpee/transcript-tester` and `@sharpee/branch-tester` both link it
      from npm-published READMEs, and P-2 records it as having no sharpee.net
      equivalent — so Phase 3's repoint-to-site fix was unavailable. Both
      README links updated; `docs/core-concepts/README.md` now indexes it.
  - **Live bug found and fixed on the way** (outside the plan's scope, folded
    in): `website/public/chord.ebnf` — published on sharpee.net as a download —
    was stale Chord 2, still specifying the positional `story "Title" by
    "Author"` header ADR-298 removed, and missing comments (ADR-249), records
    (ADR-300 D10) and counters (ADR-264). No generation step exists between
    the two copies; the website's was last touched at the initial site ship
    (`d0cc4807`) while the real one advanced through ADR-298 and ADR-300.
    Synced from `packages/chord/chord.ebnf`; both now hash `c88bb89f…8ab4`.
    **The duplication itself is unresolved** — two hand-maintained copies with
    nothing keeping them honest, which is what let this rot silently.
  - **`.claude/settings.local.json:226-227` left unrepaired, with reason.**
    Globally gitignored and untracked, so machine-local and unfixable for
    anyone else; repointing them would preserve a standing permission to `awk`
    over quarantined content, which is the access P-14's rule bars. The
    allow-list regrows on next use.

### Phase 2: Resolve the three archive trees to their two destinations
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A (tooling) — `docs/archive/*` (27 entries) →
  `docs/work/archive/<slug>/`, `docs/_archive/*` (4 entries) and
  `docs/_archived/*` (28 entries) → `docs/unofficial/archive/`
- **Entry state**: Phase 1 complete — `docs/unofficial/` exists and is ready
  to receive `docs/unofficial/archive/`. `docs/archive/` still holds 27
  top-level entries (confirmed this session: 24 directories carrying a
  `plan.md`, 3 directories that do not — `chord-grammar-ordering`,
  `chord-parity`, `tutorial` — plus 6 loose `plan-*.md` files at the tree's
  own top level, outside any slug directory).
  > **Entry state corrected 2026-08-14 at execution.** Two counts in the
  > paragraph above are wrong. (1) There are **15** loose `plan-*.md` files, not
  > 6 — so `docs/archive/` holds 42 top-level entries (27 directories + 15
  > files), not 27, and the ambiguous set this phase must put to David is **18**
  > entries (3 directories + 15 files), not 9. (2) `docs/work/archive/` **already
  > existed** at HEAD with 26 entries, created by `cddf8446` ("archive completed
  > chord-* and adr-NNN work folders"); this phase's 24 joined them for 50. The
  > destination was in use before this plan proposed it — which is corroboration
  > that it is the right path, not a conflict.
  `docs/_archive/` holds `site/`,
  `web-save/`, `website/`, and `zifmia/` (the 2026-08-13 amendment's fourth
  tenant). `docs/_archived/` holds 28 loose superseded documents. All three
  trees still live at `docs/` top level. `docs/context/archive/` is untouched
  by this phase and every phase in this plan — it is explicitly excluded, not
  deferred.
- **Deliverable**:
  - `git mv` each of the 24 `plan.md`-bearing directories under
    `docs/archive/` to `docs/work/archive/<slug>/` — DevArch Phase 3's
    canonical path, verified not to be matched by any of the seven
    `docs/work/*/plan.md`-globbing consumers as an active plan. (P-3)
  - **Decision point — raise explicitly, do not infer.** The 3 non-`plan.md`
    entries (`chord-grammar-ordering`: analysis scripts + JSON dumps;
    `chord-parity`: design notes + a roadmap; `tutorial`: `v01.ts`…`v18.ts`
    checkpoint series) and the 6 loose `plan-*.md` files at `docs/archive/`'s
    own top level don't cleanly fit either side of P-3's own "archived plan
    you may legitimately consult vs. archived documentation that is junk
    mail" split. Put the two candidate destinations to David
    (`docs/work/archive/` alongside the 24, or `docs/unofficial/archive/`)
    before moving any of these nine; don't default one way silently. (P-3)
  - `git mv docs/_archive/{site,web-save,website,zifmia}
    docs/unofficial/archive/` — the second destination. (P-3)
  - `git mv` each of the 28 `docs/_archived/` entries into
    `docs/unofficial/archive/`. (P-3)
  - Same-commit reference check (P-12): grep for any live reference to
    `docs/archive/`, `docs/_archive/`, or `docs/_archived/` paths across
    `CLAUDE.md`, `packages/*/CLAUDE.md`, `.claude/`, `tools/`, and
    `packages/*/README.md`; none is currently known to exist, but confirm
    rather than assume — these three trees were never in P-12's own named
    grep patterns, which is itself worth verifying holds.
- **Exit state**: `docs/archive/`, `docs/_archive/`, and `docs/_archived/` no
  longer exist at `docs/` top level. The 24 archived work-target plans live at
  `docs/work/archive/<slug>/`. The 9 ambiguous entries (3 directories + 6
  loose files) are moved per David's explicit call, recorded in this plan's
  session summary. `docs/unofficial/archive/` holds the `site`/`web-save`/
  `website`/`zifmia` material and the 28 loose superseded documents.
  `docs/context/archive/` is byte-for-byte unchanged. Nothing deleted.
- **Status**: DONE (2026-08-14)
- **Outcome**: All three trees resolved; `docs/archive/`, `docs/_archive/` and
  `docs/_archived/` no longer exist at `docs/` top level. Final counts:
  `docs/work/archive/` 65 entries (26 pre-existing + 24 plan-bearing dirs + 15
  loose plans), `docs/unofficial/archive/` 35 (4 from `_archive/` + 28 from
  `_archived/` + the 3 non-plan dirs). Nothing deleted — every entry moved by
  `git mv`. The two emptied directories were removed with `rmdir`, which
  refuses a non-empty target, after all content was staged as renames.
  - **Entry-state corrections**: see the boxed note above — 15 loose plans not
    6 (18 ambiguous entries, not 9), and `docs/work/archive/` already existed
    with 26 entries.
  - **David's disposition call on the 18 ambiguous entries** (2026-08-14, in
    session; the plan required this be raised, not inferred): the **15 loose
    `plan-*.md` files → `docs/work/archive/`** — they are session plans of the
    same genre as the 24, differing only in lacking a slug directory; the
    **3 directories → `docs/unofficial/archive/`** — `chord-grammar-ordering/`
    is one-off experiment artifacts (`.cjs` scripts + JSON dumps),
    `chord-parity/` is design notes plus a roadmap, and `tutorial/` is the
    superseded v01–v18 familyzoo series replaced by the book-aligned
    `tutorials/familyzoo/v2.0.0/ch*` snapshots. The split follows P-3's own
    plan-vs-documentation test.
  - **P-12 check clean, after four repairs the plan did not anticipate.** No
    live surface referenced `docs/archive/`, `docs/_archive/` or
    `docs/_archived/` — except four provenance citations of
    `docs/archive/tutorial/` in live source outside `docs/`:
    `tutorials/familyzoo/{v1.5.0,v2.0.0}/src/index.ts:9` and the matching
    `src/README.md:9`. All four repointed to
    `docs/unofficial/archive/tutorial/`. **These were found only because
    Phase 1's lesson prompted a sweep outside the plan's named grep targets**
    — `tutorials/` is not among them, and none of the three trees was in
    P-12's own pattern list.
  - `docs/context/archive/` verified untouched by this phase (`git status`
    reports 0 changes under it). Note that it is *not* immune generally — the
    `commit-local` housekeeping writes there, as Phase 1's commit showed.

### Phase 3: Archive the git-cold and superseded-doc trees; repair the published npm README
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A (tooling) — thirteen git-cold trees + `actions/`,
  `api/`, `publish/` → `docs/unofficial/archive/`; `scripts/publish-npm.sh`;
  `packages/sharpee/README.md` (ships to npm); `docs/core-concepts/README.md`;
  `docs/work/readme-audit/plan.md`
- **Entry state**: Phase 2 complete — `docs/unofficial/archive/` exists and
  is the confirmed destination for both P-4 and P-5. The thirteen git-cold
  trees (`packages/`, `templates/`, `releases/`, `agents/`, `extensions/`,
  `internal/`, `testing/`, `screencast/`, `getting-started/`, `platform/`,
  `development/`, `tutorials/`, `feedback/` — `zifmia/` already moved via the
  2026-08-13 amendment, out of this phase's scope) and `docs/actions/`,
  `docs/api/`, `docs/publish/` all still live at `docs/` top level.
  Confirmed this session: `packages/sharpee/README.md` still carries three
  absolute `github.com/ChicagoDave/sharpee/blob/main/docs/` links (L96
  `getting-started/authors/README.md`, L97 `api/README.md`, L98
  `architecture/adrs/`), the package ships to npm via `tsf`, and this phase's
  own moves are what break L96 and L97. `docs/core-concepts/README.md:171`
  and `docs/work/readme-audit/plan.md:7` both still cite
  `docs/publish/npm-ci.md`, confirmed this session — P-13's execution earlier
  today did not touch either.
- **Deliverable**:
  - **Decision point — raise, don't infer.** Check `docs/tutorials/fernhill/`
    against the site's Chord tutorial before moving it; confirm whether it is
    superseded or the only surviving copy, and get David's call if the
    on-disk comparison doesn't settle it outright. (P-4)
  - `git mv` each of the thirteen git-cold trees into
    `docs/unofficial/archive/`. (P-4)
  - `git mv docs/actions docs/unofficial/archive/actions`; same for
    `docs/api` and `docs/publish`. With this, every directory in `docs/`
    named in the proposal's inventory has a disposition. (P-5)
  - Archive `scripts/publish-npm.sh` alongside the retired `publish/`
    material (e.g. `docs/unofficial/archive/publish/publish-npm.sh`) — the
    stale manual-publish script (`VERSION="0.9.64-beta"`, a WSL path) that
    `npm-ci.md`'s own Part E recommends removing. Not deleted, moved. (P-5)
  - **P-12 spine — the published-surface fix, same commit as the moves that
    cause it:**
    - `packages/sharpee/README.md` L96/L97: these are public npm-page links
      into content that is about to enter the `unofficial/` quarantine.
      Since P-1's rule bars citing quarantined content as current, repointing
      the links *into* `docs/unofficial/archive/` would be citing junk mail
      from a published surface — not an acceptable fix. Repoint L96 and L97
      to their sharpee.net equivalents (P-2 found the site carries this
      material in ADR-244's split form), or remove the links outright if no
      single equivalent page exists.
      **Verify every candidate URL returns 200 before substituting it.** This
      README ships to npmjs.com, so an unverified substitution trades a broken
      repo link for a broken web link — no improvement, and harder to notice.
      Checked 2026-08-13: `https://sharpee.net/chord/stdlib` 200,
      `https://sharpee.net/chord/cookbook` 200, **`https://sharpee.net/chord/guide`
      404** — so `guide` is not a valid target as written and takes P-12's
      remove-outright fallback unless an equivalent page exists by then.
      Re-check all three at execution time rather than trusting this line. L98 (`architecture/adrs/`) is untouched — it
      survives.
    - `docs/work/readme-audit/plan.md:7` — repair or drop the
      `docs/publish/npm-ci.md` citation now that the target has moved.
    - `docs/core-concepts/README.md:171` — this file is required session-start
      reading (`CLAUDE.md`), so it must not cite quarantined material as if
      current. Either repair the citation to the new archived path with an
      explicit "archived" label, or (preferred, since core-concepts should
      not depend on quarantined content at all) restate the seventh
      registration-point fact locally so the citation is unnecessary.
    - Re-run both of P-12's own Done-when checks and confirm each returns
      nothing unintentional:
      `grep -rn 'docs/guides\|docs/reference\|docs/actions\|docs/api\|docs/getting-started\|docs/publish' CLAUDE.md packages/*/CLAUDE.md .claude/ tools/`
      and
      `grep -rn 'github.com/ChicagoDave/sharpee/blob/main/docs/' packages/*/README.md`.
- **Exit state**: all thirteen git-cold trees plus `actions/`, `api/`, and
  `publish/` live at `docs/unofficial/archive/`; none exists at `docs/` top
  level. `scripts/publish-npm.sh` is archived, not deleted.
  `packages/sharpee/README.md`'s npm-published links no longer point into the
  quarantine. `docs/core-concepts/README.md` and
  `docs/work/readme-audit/plan.md` no longer cite a moved `docs/publish/`
  path without repair. Both of P-12's Done-when greps return nothing
  unintentional — P-12 is fully closed by the end of this phase.
- **Status**: DONE (2026-08-14)
- **Outcome**: All sixteen trees moved to `docs/unofficial/archive/` (51
  entries). `scripts/publish-npm.sh` archived beside `npm-ci.md`, not deleted.
  `docs/` top level is now the survivors plus `README.md` and `unofficial/`.
  - **`docs/tutorials/fernhill/` decision point resolved on-disk, no call
    needed** — the plan's own condition. The site carries all eight chapters at
    `website/src/app/learn/fernhill/` with identical section structure, and its
    copy is newer (2026-08-10 vs 2026-07-23); the per-chapter line delta is the
    H1 and frontmatter. Genuinely superseded.
  - **P-12 CLOSED.** Both Done-when greps pass. Remaining hits are the two
    gitignored `settings.local.json` permission strings (exception documented
    in Phase 1) and L98's `architecture/adrs/` link, which this plan states
    survives. Candidate URLs re-verified live at execution time rather than
    trusted from the plan: `/chord/guide` **404** (the 2026-08-13 finding still
    holds), `/chord/guide/world` 200, `/chord/stdlib` 200, `/learn/fernhill`
    200. `packages/sharpee/README.md`'s two broken links replaced by four
    working ones, including `packages/sharpee/docs/genai-api/index.md` — tracked
    in git and regenerated every build, so an API reference that cannot rot.
    `docs/core-concepts/README.md` no longer cites quarantined material at all:
    the seventh-registration-point fact is restated locally with the 4.5.0
    release it was learned from. `docs/work/readme-audit/plan.md` likewise.
  - **P-4 partially declined — `internal/dungeon-81/` recovered to a NEW ninth
    survivor, `docs/references/`** (David's ruling, 2026-08-14: "The MDL source
    needs to stay in docs/references"). It is the 1981 Mainframe Zork MDL,
    named *the authoritative MDL source* by `stories/dungeo/CLAUDE.md:13` and
    cited by **11 live files** — five Dungeo combat sources carrying
    line-level provenance, and six work docs under `docs/work/schism/` and
    `docs/work/dungeo/` that treat it as canon. All 11 repointed;
    `grep -rn 'docs/internal'` over live trees returns nothing.
    `internal/fonts/` and `internal/images/` stay quarantined (no consumers,
    verified). `docs/references/README.md` records what the directory is for.
  - **The third recovery in three phases, and the clearest statement of the
    pattern**: git-coldness is the wrong signal for a frozen reference corpus.
    **Unmaintained and unchanging look identical in git history and mean
    opposite things.** `chord.ebnf` (Phase 1), `transcript-testing.md`
    (Phase 1), and now `dungeon-81/` were all classified by proxy signals —
    "superseded on the site," "no site equivalent," "no commit in six months" —
    and all three were load-bearing. Every one was caught by sweeping outside
    the plan's named grep targets, never by the targets themselves.
- **Note for Phase 5**: the keep-list is now **nine**, not eight —
  `docs/references/` joins it. `docs/README.md`'s rewrite must say what it is
  and how it differs from `docs/unofficial/`.

### Phase 4: Stop DevArch runtime state accumulating in `docs/context/`
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A (tooling) — `docs/context/.devarch-events-*.jsonl`,
  `.session-state-*.json`, `.devarch-gate-blocks-*`, `.devarch-gate-*`,
  `.active-session`
- **Entry state**: Independent of Phases 1-3 — no ordering dependency either
  way, can run before or after the moves. Confirmed this session:
  `docs/context/` holds 74 `.devarch-events-*.jsonl`, 23
  `.session-state-*.json`, 11 `.devarch-gate-blocks-*`, and 1
  `.devarch-gate-*` file (all gitignored, growing since the proposal's count
  of 68/23/10/1 — one session's worth in the interim), sharing a directory
  with the committed session summaries that are `docs/context/`'s actual
  point.
- **Deliverable** (P-10): define and apply one of the two dispositions the proposal
  leaves open — (a) a stated retention rule (e.g., prune runtime files past a
  session-count or age threshold, matching the existing `.gitignore` patterns
  at lines 163-167) implemented as a small script or a documented manual
  step, consistent with the project's standing no-CI-gates direction; or (b)
  relocate these runtime paths out of `docs/context/` entirely (e.g. under
  `logs/` per `CLAUDE.md`'s existing `Logs: logs/` convention, or a
  `.devarch/runtime/` directory) with every path a hook or skill reads
  updated to match. **Before moving anything under option (b), verify against
  the hook scripts under `docs/workflow/hooks/` and `.claude/settings.json`
  which of these paths are live read targets for a running session** — these
  are not dead documentation, a session mid-flight depends on them existing
  at the path it expects.
- **Exit state**: the accumulation is no longer purely additive — either a
  retention rule runs and is documented, or the runtime files live outside
  `docs/context/` with every hook/skill that reads them continuing to
  function unchanged, verified by a subsequent session actually running
  (state file created/updated, gate cleared) without error.
- **Status**: DONE (2026-08-14)
- **Outcome**: Disposition **(a)**, a retention rule — because **(b) proved
  unavailable**, which is the finding this phase turned on. The deliverable's
  own instruction to "verify against the hook scripts under
  `docs/workflow/hooks/`" could not be followed as written: that directory does
  not exist in this repo, and `.claude/settings.json` declares no hooks. Every
  writer and reader of these paths is **upstream DevArch**, outside the repo —
  `~/.devarch/hooks/emit-event.sh:70,105`, `gate.sh:67,110,146`,
  `session-state.sh:55,63,72,101`, `session-start.sh:45` each hardcode
  `$repo_root/docs/context/`, and `gate.sh:43` / `session-state.sh:32` state it
  as a deliberate invariant ("One name, one directory"). Those files carry the
  "managed by DevArch and will be overwritten on update" warning, so a
  relocation would be undone by the next `devarch update`. Option (b) is not a
  choice this repository can make.
  - **The script**: `scripts/prune-devarch-runtime.sh`. Dry-run by default,
    `--apply` to delete, `--keep N` (default 20). Selects only the four runtime
    patterns; `session-*.md`, `project-profile.md`, `plan.md`, `README.md`,
    `.active-session` and `.current-plan` are structurally unmatchable. The id
    in `.active-session` is retained whatever its rank — a session mid-flight
    depends on its files existing where its hooks expect. No CI gate, per the
    project's standing direction; it is a documented manual step.
  - **Why 20 is safe**: no DevArch consumer reads a *historical* runtime file.
    `standup/SKILL.md:22,24` and `finalize/SKILL.md:32`, like the hooks
    themselves, resolve `{id}` from `.active-session` and read only the current
    session. The window exists so a recent summary can still be corroborated
    against its own event log (ADR-0019), not because anything requires it.
  - **Verified before applying, on a fixture** — the real script, real `rm`, no
    stub: six sessions, `--keep 2`, active session deliberately ranked *oldest*.
    Removed 12 files, retained 3 ids (the 2 newest **plus** the active one);
    every decoy survived. All four bad-usage paths exit 1 with a message
    (`--keep 0`, `--keep abc`, `--keep` with no value, unknown argument), as
    does running outside a git repository.
  - **Applied**: 90 of 123 files removed, 20 of 97 session ids retained
    including live `2420bc`. Counts went 76/24/11/1 → 19/2/1/0 across
    events/state/gate-blocks/gate (21/2/1/0 after the two restores described
    next). Among the removed: `.devarch-gate-13c113`, a gate a past session
    never cleared.
  - **A defect the apply run exposed, fixed in the same phase.** `git status`
    afterward showed two ` D` entries: `.devarch-events-297ac8.jsonl` and
    `.devarch-events-2d2ba5.jsonl` were **tracked**, committed by `55c5bc06`
    before `.gitignore:166` existed — and gitignore has no effect on files
    already committed. The first version of the script trusted "these are all
    gitignored" as an inference from the pattern list instead of asking git, so
    it deleted two tracked files. Both restored with `git checkout --`
    (verified: `git status` clean of them). The script now reads
    `git ls-files` and refuses to delete anything git tracks, reporting it as
    `SKIPPED (tracked by git)` instead — a fifth rejection path, verified in a
    second fixture where a committed runtime log ranked oldest and outside
    `--keep 1`: it survived, its untracked sibling was removed, and
    `git status` showed no deletion. The two restored files now carry fresh
    mtimes and so rank inside the retention window; they were left in place
    rather than re-pruned, since deleting a tracked file is a human's call.
    **The general shape is this plan's recurring one** — a proxy signal ("it
    matches a gitignore pattern") standing in for the real property ("git does
    not track it"), the same substitution that made `chord.ebnf`,
    `transcript-testing.md`, and `dungeon-81/` look inert in Phases 1 and 3.
  - **Exit-state check**: the live session's `.devarch-events-2420bc.jsonl`
    survived the prune and kept appending afterward (the hook wrote an `edit`
    row for this very plan update), `.session-state-2420bc.json` continued
    tracking, and the gate had already been cleared normally at session start.
  - **Documented**: new `docs/context/README.md` states what is committed
    versus runtime, names each of the four families and its writing hook,
    records why relocation is unavailable, and gives the prune invocations.
    `CLAUDE.md`'s Work Patterns points at it.
  - **Found in passing, outside this phase's targets** (the pattern Phases 1-3
    kept hitting, again): `CLAUDE.md` cites the session template at
    `docs/context/.session-template.md`; the file is actually at
    `.claude/.session-template.md`. Same class of broken reference P-12 closed.
    Separately, `scripts/__tests__/` holds four vitest files that no runner
    picks up — there is no root vitest config and `test:arch` covers only
    `tests/architecture`. Both reported to David, neither actioned here.

### Phase 5: Rewrite `docs/README.md` to describe the settled shape
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A (tooling/docs) — `docs/README.md`
- **Entry state**: Phases 1-3 complete — every directory named in the
  proposal's inventory has landed at its final disposition: the eight
  survivors (`architecture/`, `context/`, `design/`, `work/`, `proposals/`,
  `book/`, `core-concepts/`, `brainstorm/`) untouched; `docs/unofficial/`
  holding the quarantined guides/reference/spec plus its `archive/`
  subdirectory; `docs/work/archive/` holding the 24 (or more, per Phase 2's
  decision point) archived plans. Confirmed this session:
  `docs/README.md`'s current "Documentation Structure" tree and link tables
  still name `guides/`, `reference/`, `getting-started/`, and `internal/` at
  top level — all four have moved by this point in the plan.
- **Deliverable**: rewrite `docs/README.md`'s "Documentation Structure" tree
  and its "For Story Authors" / "For Developers" tables to list the eight
  surviving directories, state what belongs in each, and state where the
  moved material went (`docs/unofficial/` and its junk-mail rule,
  `docs/unofficial/archive/`, `docs/work/archive/`) and why — so a reader
  does not mistake an archived tree for current material or have to
  re-derive the shape from a directory listing. (P-11)
  - **Assert the two stays-put items, so they are citable and closeable.**
    Both are no-ops by construction, which is exactly why they would otherwise
    be silently dropped and left ACCEPTED forever:
    - `docs/book/` is at its original path and untouched by every move in
      Phases 1-3. (P-7)
    - `docs/proposals/` is at its original path and untouched. Mechanically
      required — `session-planner` reads it (ADR-0008 D5), so a move would
      break the planner rather than merely relocate a directory. (P-8)
    Verify by `ls -d docs/book docs/proposals` and by confirming neither
    appears in any Phase 1-3 move list.
- **Exit state**: `docs/README.md` accurately lists the eight survivors,
  states `docs/unofficial/`'s quarantine rule in the same terms as
  `CLAUDE.md`'s new paragraph (Phase 1), names both archive destinations, and
  contains no live link into a path this plan moved or archived.
- **Status**: DONE (2026-08-14)
- **Outcome**: `docs/README.md` rewritten. **Nine survivors, not the eight this
  phase's own Deliverable and Exit state say** — the plan's "Note for Phase 5"
  (added by Phase 3) is the correct count; `docs/references/` joined the
  keep-list when David ruled the MDL source out of the quarantine. The
  Deliverable's parenthetical list of eight was left as written above rather
  than edited, so the discrepancy stays visible.
  - **Structure**: the tree and a per-directory table now name all nine
    (`architecture/`, `book/`, `brainstorm/`, `context/`, `core-concepts/`,
    `design/`, `proposals/`, `references/`, `work/`) plus `unofficial/` marked
    as quarantine, each with what belongs in it. `references/` is described as
    *the deliberate opposite of `unofficial/`* — unchanging because it is
    finished, not because it was abandoned — which is the Phase 3 distinction
    stated where a reader will actually meet it.
  - **Where the rest went**: a table naming all three destinations
    (`unofficial/`, `unofficial/archive/`, `work/archive/`), what is in each,
    and how to treat it. The quarantine rule is stated in `CLAUDE.md`'s terms
    ("junk mail", do not cite/plan/research, moving it out is a human
    decision), plus the guidance that a hit under `unofficial/` is a lead to
    verify, never an answer.
  - **Stale content removed, all of it verified rather than assumed**: the
    header claimed **version 0.9.85** (actual: `packages/sharpee` is **5.0.0**),
    the ADR table claimed **135 ADRs** (actual: **320**), the structure tree
    still listed `getting-started/` and `internal/` (both gone since Phase 3),
    and "For Developers" linked `development/setup/setup-guide.md` and
    `development/standards/coding.md` — **both broken**, archived in Phase 3.
    Those two rows are replaced by the root `README.md` and `CLAUDE.md`, which
    is where build and setup instructions actually live. The version banner was
    dropped rather than corrected: a pinned number in a structure document is
    the same rot in slower motion.
  - **P-7 and P-8 asserted, so both are closeable**: `ls -d docs/book
    docs/proposals` returns both, and neither appears as a rename source in
    either consolidation commit (`3bb7af37`, `17cbfa34`) — checked with
    `git log --diff-filter=R --name-status` filtered to those paths, which
    returns empty. The renames git does show under `docs/book/` are internal
    to the book's own versioned-edition split (`e6540ec0`), not moves of the
    directory. `docs/README.md` now states both stay-puts and why
    `proposals/` mechanically cannot move (`session-planner` reads it).
  - **Exit state verified**: all **25** relative links in the new file resolve
    (extracted with a grep over `](./…)` and stat-checked one by one, zero
    broken). The only links into moved paths are the three archive destinations
    in the "Where the rest went" table, each labelled as an archive — which the
    Deliverable requires. The seven archived tree names cited in that table
    were each confirmed present under `docs/unofficial/archive/`.

## Items excluded, deliberately

- **P-9** (`docs/work/` disposition of 116 targets) — David: "hold 9." Stays
  ACCEPTED, not planned. It is by far the largest item, needs a per-target
  decision from David that cannot be inferred, and depends on upstream
  DevArch `plan-lifecycle-and-folder-controls` Phase 3 (archive-on-DONE)
  being confirmed shipped.
- **P-13** — already DONE, executed directly 2026-08-13 (commit `7e903ea2`).
  Not re-planned; not touched by any phase above.
