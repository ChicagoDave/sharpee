# Session Plan: Consolidate docs/ per the docs-consolidation proposal

**Created**: 2026-08-13
**Plan Status**: ACTIVE
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
- **Status**: CURRENT (since 2026-08-13)

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
  own top level, outside any slug directory). `docs/_archive/` holds `site/`,
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
- **Status**: PENDING

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
- **Status**: PENDING

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
- **Status**: PENDING

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
- **Status**: PENDING

## Items excluded, deliberately

- **P-9** (`docs/work/` disposition of 116 targets) — David: "hold 9." Stays
  ACCEPTED, not planned. It is by far the largest item, needs a per-target
  decision from David that cannot be inferred, and depends on upstream
  DevArch `plan-lifecycle-and-folder-controls` Phase 3 (archive-on-DONE)
  being confirmed shipped.
- **P-13** — already DONE, executed directly 2026-08-13 (commit `7e903ea2`).
  Not re-planned; not touched by any phase above.
