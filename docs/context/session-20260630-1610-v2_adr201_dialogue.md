# Session Summary: 2026-06-30 - main (CDT)

## Goals
- Recover and verify the two artifacts left uncommitted by the disconnected session 35097e.
- Complete single-ADR review of ADR-201 (Dialogue & Speech Emission) and apply all findings.
- Resolve open questions Q1, Q2, Q5 from the ADR-201 review.
- Extract the Structural Realization Mandate into its own ADR-202.
- Run multi-ADR review of the 202↔201 seam and apply all findings.
- Flip both ADRs to ACCEPTED.

## Phase Context
- **Plan**: ADR-192 Phrase Algebra (docs/context/plan.md) — all four phases DONE.
- **Phase executed**: No active plan phase — this session is ADR design work for follow-on atoms (ADR-201/202), outside the ADR-192 plan scope.
- **Tool calls used**: 40 / no budget set
- **Phase outcome**: N/A

## Completed

### Recovery of disconnected session 35097e artifacts
Both files left on disk by the prior SSH-terminated session were confirmed intact: the ADR-201 draft and the `+154` line Section L / S39–S46 dialogue-scenario inventory in `dynamic-text-scenarios.md`. No reconstruction was needed.

### Single-ADR review of ADR-201 (`/adr-review`)
Verified all code references against live source (`english-assembler.ts`, `phrase.ts`, `talking.ts`). Score 13/14 — one FAIL: the two new Phrase kinds (`Sentence`, `Quote`), the `Run` extension, and the `RenderPosition` state lacked pinned TypeScript field shapes (contrast: ADR-196 precedent). Two polish items also raised: AC-6 too soft to mechanize; no explicit rejection AC.

### Resolution of open questions Q1, Q2, Q5
- **Q1 (S40 pronoun capitalization)** — BOTH mechanisms adopted: an explicit `Pronoun.capitalize?` boolean flag AND structural position-state auto-cap. Precedence rule pinned: `true` → always cap; `false` → never cap; absent → cap iff sentence-initial.
- **Q2 (`{say:}` parser sugar)** — DEFERRED past v1. Ship `{quote:}` + explicit tag composition first; validate tag-comma ownership before locking single-token syntax.
- **Q5 (where the Structural Realization Mandate lives)** — EXTRACT into its own ADR (became ADR-202).

### ADR-202 authored — Structural Realization Mandate
New file `docs/architecture/adrs/adr-202-structural-realization-mandate.md`. Extracted the original §1 of ADR-201: text is produced by realizing a typed Phrase AST; the Assembler may inspect a node's own surface for a bounded linguistic rule but must not pattern-match across concatenated output or re-parse to recover grammatical structure. Binds all phrase-atom ADRs (ADR-195 through 201 and future atoms). Includes its own terminology, decision, consequences, 3 ACs, considered options, and relationship section.

### ADR-201 rewired to resolved decisions
§1 replaced with a pointer to ADR-202. §2 now pins TypeScript field shapes for `Sentence`, `Quote`, and `Pronoun.capitalize` (with the Q1 precedence rule). §3.1 pins the extended `Run` interface. §4 pins `RenderPosition`. §5 formally defers `{say:}`. §6 corrects the `talking.ts` path and real param name (`target`). AC-6 tightened to a concrete ESLint gate. New AC-10 added (parse-time rejection of bare-string dialogue attempts). Open Questions reorganized: Q1/Q2/Q5 resolved, Q3/Q4 remain non-blocking. "Builds on ADR-202" cross-reference added.

### Multi-ADR review of 202↔201 seam (`/adr-review 202 201`)
Three findings, all applied inline:

- **Finding 1 (real — "born violated" AC):** ADR-202 AC-1's initial allowlist omitted two helpers in `english-assembler.ts` that legitimately use regex for own-node morphology and block segmentation: `regularPluralVerb` (`:165`) and `splitRunsOnNewlines` (`:698`). Allowlist expanded to all five helpers (`regularPluralVerb`, `capitalizeSentenceStart`, `indefiniteArticle`, `collapseWhitespace`, `splitRunsOnNewlines`) in both ADRs. AC-2 reworded to permit whitespace-joining cross-run reads while banning structure-inferring reads.
- **Finding 2 (accuracy nit):** ADR-201 §3.2 step 4 said `collapseWhitespace` "operates on a run's own text" — inaccurate (it reads the previous run's trailing space, `:419`). Reworded to "whitespace normalization (ADR-183 authority)".
- **Finding 3 (sequencing clarity):** Sequencing bullet added to ADR-202: it is the prerequisite ADR; AC-1 lint lands independently; AC-3 is verified when ADR-201 lands; the mutual reference is a citation cross-link, not a dependency cycle; ADR-201 AC-6 ≡ ADR-202 AC-1, implement once.

### Both ADRs accepted
Status flipped PROPOSED → ACCEPTED on ADR-201 and ADR-202.

## Key Decisions

### 1. ADR-202 extracted as a standalone cross-cutting ADR
The Structural Realization Mandate is not specific to dialogue — it governs every phrase atom (ADR-195 through 201 and all future atoms). Extracting it prevents the rule from being buried inside a dialogue-scoped ADR and gives future atom ADRs a single normative reference to cite. ADR-201 becomes a dependent, not the host.

### 2. Q1: Both cap mechanisms adopted with pinned precedence
An explicit `Pronoun.capitalize?` flag lets authors override position-inferred behavior; the position-state auto-cap covers the common case without per-use annotation. The explicit flag takes strict precedence (`true`/`false`) over position inference (`absent` triggers inference). This eliminates ambiguity when a pronoun appears sentence-initially but the author deliberately wants it lowercase (e.g., inside a quoted sentence fragment).

### 3. AC-1 allowlist must be grounded in live source before CI
The first draft of ADR-202 AC-1 would have failed CI on compliant code. The multi-ADR review's live-source cross-check (`:165`, `:698`) was the gate that caught this. Allowlists for structural rules must enumerate observed helper names, not hypothetical ones.

## Next Phase
Plan complete — all ADR-192 phases done. The immediate next implementation slice for ADR-201/202 is the §6 stdlib dialogue catalog verb fix (`{verb:says target}` in `talking/asking/telling/answering`), which depends only on ADR-199 (already on `main`). This should run on a fresh phase branch.

## Open Items

### Short Term
- Implement §6 stdlib dialogue catalog verb fix (low-risk, ADR-199-only dependency).
- ADR-201 AC-1 ESLint gate and AC-10 parse-time rejection: implement once ADR-201/202 implementation phase begins.

### Long Term
- ADR-201 non-blocking open questions: cross-line last-mentioned tracking (S41/S46); whether a dedicated `Speech` kind is ever warranted beyond `Quote`.
- Pre-existing: dungeo walkthroughs broken (combat/chain-state) — flagged in prior sessions, still unresolved; tracked in `docs/work/dynamic-text/dungeo-cutover-cleanup-scope.md`.
- `{say:}` parser sugar deferred past v1 — revisit after tag-comma ownership validated in production use.

## Files Modified

**ADRs** (2 files):
- `docs/architecture/adrs/adr-202-structural-realization-mandate.md` — new; Structural Realization Mandate extracted from ADR-201 §1; ACCEPTED
- `docs/architecture/adrs/adr-201-dialogue-speech-emission.md` — rewired to ADR-202; pinned TS field shapes; Q1/Q2/Q5 resolved; AC-6/AC-10 tightened; multi-ADR findings applied; ACCEPTED

**Work tracking** (1 file, bulk authored in prior session 35097e):
- `docs/work/dynamic-text/dynamic-text-scenarios.md` — +154 lines: Section L / scenarios S39–S46 (dialogue/speech scenario inventory)

## Notes

**Session duration**: ~2 hours

**Approach**: review-driven design — single-ADR review surfaced the shape-pinning gap; open-question resolution drove the ADR split; multi-ADR review grounded the allowlist in live source. No code written; these ADRs are the contract for future implementation.

**Session 35097e recovery**: the disconnect left both artifacts intact; no re-derivation was needed. The `dynamic-text-scenarios.md` changes are attributed to 35097e's authoring but are committed together with this session's ADR work.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (documentation only; no code changes)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-199 (Verb atom) on `main` — required for the §6 implementation slice identified as next. ADR-196 (Optional/Choice) on `main` — cited by ADR-201 for `RenderPosition` sequencing.
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-202 authored and accepted: Structural Realization Mandate — Assembler may inspect a node's own surface for a bounded linguistic rule but must not pattern-match across concatenated output.
- ADR-201 accepted: Dialogue & Speech Emission — `Sentence`/`Quote`/`Pronoun.capitalize` shapes pinned; `RenderPosition` state pinned; `{say:}` deferred.
- Pattern applied: ADR-196 precedent for pinning TypeScript field shapes in acceptance criteria.

## Mutation Audit

- Files with state-changing logic modified: none (documentation-only session)
- Tests verify actual state mutations: N/A

## Recurrence Check

- Similar to past issue? NO — the "AC born violated" finding (Finding 1) is a first occurrence in this review chain; prior sessions had no analogous allowlist-grounding failure.

## Test Coverage Delta

- No test changes this session.

---

**Progressive update**: Session completed 2026-06-30 ~18:10 CDT
