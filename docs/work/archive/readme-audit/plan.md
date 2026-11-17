# README Follow-Up Work (parked)

Parked 2026-07-25 after the audit/fix pass (see `findings.md`; fixes landed in
`85676e9d`). Nothing here is scheduled — pick up items as they become relevant.
The publish angle: tsf stages README.md into every tarball, so missing/stale
READMEs are public npm pages. None of this blocks the npm CI first-run work,
which completed 2026-07-26 (`@sharpee/ext-hunger@3.6.1` published via OIDC with
SLSA provenance). That checklist was archived to
`docs/unofficial/archive/publish/npm-ci.md` in the 2026-08-14 docs
consolidation — quarantined, so treat it as history rather than a live plan.

## 1. Missing READMEs (published packages)

All published at 3.6.0 today with no README, so their npm pages are blank:

- [ ] `packages/chord` — the `.story` language compiler (ADR-210). Largest gap;
      author-facing. Should lead with a `.story` example per the example-first
      docs rule.
- [ ] `packages/story-loader` — lowers Chord IR onto the platform (daemons,
      narrators, grammar).
- [ ] `packages/extensions/scoring` — ADR-262 consumer #1; mirror the structure
      of the new ext-hunger README (Chord `use scoring` block first, then TS API).

Not needed unless status changes: `bridge`, `interpreter` (no `publishConfig` —
tsf won't publish them); `extensions/conversation` (contingent on npm-ci.md
§10.1 — if it's kept and published, it needs a README too).

## 2. Code-side staleness (platform — needs discussion first)

Found while verifying READMEs against source; deliberately not fixed (CLAUDE.md:
platform changes require discussion). All small, none behavioral:

- [ ] `packages/parser-en-us/src/index.ts:33-49` — exported `metadata` says
      `parserVersion: '1.0.0'` (package is 3.6.0) and lists the never-emitted
      `VERB_PREP_NOUN` in `supportedPatterns` while omitting `VERB_NOUN_NOUN`.
- [ ] `packages/extensions/testing` — source doc comments still claim a
      `$assert` command (`src/index.ts:8`, `src/types.ts:33`); the
      `deterministicRandom` config flag exists but is read by nothing (README
      example still shows it — decide whether to remove the flag or the example).
      Note the never-turn-off-randomness policy when deciding the flag's fate.
- [ ] `packages/map-editor/electron/main.ts:126` — runtime error message tells
      the user to run the dead `./build.sh -s <story>`; should say
      `./repokit build <story>`.

## 3. Systemic: doc-freshness gate (candidate ADR)

Pattern-recurrence scan (2026-07-25) found "documentation drifted from code
after refactors" 11 times over 4 months; this audit was the largest instance
(24 of 30 READMEs stale). No systemic fix has ever been proposed. Sketch:

- `<!-- synced-with: <source-path> @ <date> -->` marker in docs that track
  specific source files; a checker compares the marker date against
  `git log -1 <source-path>` and flags drift.
- Wire the checker into `./repokit verify`.
- Per the ADR-first workflow, this starts as an ADR (platform/tooling change)
  before any implementation.

Related parked recurrences from the same scan, not README-specific: a sweep for
declared-but-unused platform seams (5 instances, e.g. `registerEventChain`), and
a root-cause dig into stale pnpm workspace installs (3 instances).
