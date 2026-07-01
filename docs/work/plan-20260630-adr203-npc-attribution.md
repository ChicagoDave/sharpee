# Session Plan: ADR-203 — NPC Attribution Speaker Agreement

**Created**: 2026-06-30
**Overall scope**: Promote the NPC speaker param from a bare string (`npcName: npc.name`) to a
`NounPhrase` produced by `nounPhraseFor(npc)` at emit time across all 6 emitter files,
migrate all agreeing-verb attribution templates in `npc/npc.ts` and `npc/conversation.ts`
to `{verb:LEMMA speaker}` form, and verify the full AC-1..AC-7 suite. This is an **atomic
cross-package rename** — the core param, every emitter, both template files, and the devkit
fixture must all land together. The build is intentionally red mid-branch and turns green only
when all sites are updated. Phases are an ordered work sequence within ONE cohesive landing on
a single branch (`v2_adr203`), not independently-mergeable slices.
**Bounded contexts touched**: N/A — language pipeline and NPC subsystem infrastructure (no domain behavior change)
**Key domain language**: N/A — DDD framing does not apply to this platform infrastructure work

## References consulted

- `docs/architecture/adrs/adr-203-npc-attribution-speaker-agreement.md` — the target ADR;
  defines the atomic rename contract, exhaustive emitter inventory, and AC-1..AC-7 acceptance
  criteria; mandates `nounPhraseFor(npc)` at emit time (mirrors the ADR-201 action path);
  `nounPhraseFor` lives in `stdlib/utils`, and both `character` and `extensions/basic-combat`
  must be able to import it.
- `docs/architecture/adrs/adr-201-dialogue-speech-emission.md` — the ADR-201 action path that
  ADR-203 mirrors; AC-3 of ADR-203 mandates a REAL-PATH plural-NPC test mirroring
  `dialogue-attribution-realpath.test.ts`; ADR-201 §6 deferred slice that ADR-203 now closes.
- `docs/architecture/adrs/adr-199-phrase-algebra-verb-atom-subject-agreement.md` — the Verb
  atom (`{verb:LEMMA subject}`) that all migrated templates rely on; boundary constraint: no
  verb surface strings in `if-domain`, all conjugation in `lang-en-us`.
- `docs/architecture/adrs/adr-194-phrase-algebra-contents-atom.md` — establishes the
  entity→NounPhrase bridge; `nounPhraseFor` is the stdlib implementation of
  `RenderWorld.nounPhraseFor`; the bridge is optional and degrades gracefully.
- `docs/architecture/adrs/adr-192-phrase-algebra-phrase-model-assembler-core.md` — the
  phrase-algebra core; article hints (`{the speaker}`, `{a speaker}`) are the ADR-192
  article-authority mechanism used by the migrated templates; `capitalize` hint controls
  sentence-initial capitalization.
- `docs/architecture/adrs/adr-202-structural-realization-mandate.md` — no structure-recovery
  regex in the assembler; the migrated templates must use `{verb:LEMMA speaker}` structural
  form, not post-processed strings; AC-7 requires ADR-202 structural gate stays green.
- `docs/context/project-profile.md` — Vitest + pnpm workspace; strict TypeScript;
  language-layer separation (no English in engine/stdlib/world-model); `packages/if-domain`
  contains no locale logic; platform changes (packages/) require user discussion (ADR-203 is
  ACCEPTED — that discussion is complete).
- `docs/context/session-20260630-1834-v2_adr201_impl.md` — open items from prior session:
  `packages/bootstrap` has never been built → `./repokit build dungeo` is not the primary
  gate (unit/integration suites are); the NPC attribution slice in `npc/npc.ts` and
  `npc/conversation.ts` was explicitly called out as the deferred follow-up ADR-203 closes.

## Dependency-Graph Pre-Verification (performed during planning)

**Both blocking questions are already resolved.** Checked before writing phases:

1. `packages/character/package.json` lists `"@sharpee/stdlib": "workspace:*"` as a dependency.
   `tick-phases.ts` does not currently import from stdlib but can — adding the import is
   straightforward (no package-level change needed).

2. `packages/extensions/basic-combat/package.json` lists `"@sharpee/stdlib": "workspace:*"`.
   `basic-npc-resolver.ts` already imports `findWieldedWeapon` and `NpcCombatResolver` from
   `@sharpee/stdlib`, so adding `nounPhraseFor` is a one-line import addition.

3. `packages/core/package.json` has **no** `if-domain` dependency (only `eventemitter3`).
   The `npcName?: string` field in `IQueryContext` should be removed; the speaker param
   stays in the loose `Record<string, unknown>` data bag (the `[key: string]: any` index
   already accommodates it) rather than adding a typed `speaker?: NounPhrase` field — this
   keeps core's dependency shape unchanged, which the ADR explicitly sanctions.

## AC Coverage Map

| AC | Phase | What proves it |
|----|-------|----------------|
| AC-1 (REAL-PATH plural agrees) | Phase 3 | New `npc-attribution-realpath.test.ts` — plural NPC through real NPC-subsystem emitter + real EnglishLanguageProvider |
| AC-2 (proper name unchanged) | Phase 3 | Unit assertion: proper-named NPC ("Sam") renders identically before/after |
| AC-3 (article orthogonal to agreement) | Phase 3 | Unit: `{the speaker}` → "The …" / `{a speaker}` → "A …"; agreement unaffected for singular + plural |
| AC-4 (verbatim payloads byte-identical) | Phase 3 | Unit: `{verbatim:text}` content is byte-identical |
| AC-5 (exhaustive rename) | Phase 3 | `grep -rn "npcName" packages/ --include="*.ts" | grep -v ".d.ts" | grep -v "test"` returns zero emitter lines |
| AC-6 (negative/graceful: missing IdentityTrait) | Phase 3 | Unit fixture: NPC with partial/missing IdentityTrait degrades to name surface + singular; no throw |
| AC-7 (ADR-202 structural gate + suites green) | Phase 3 | All touched packages' test suites pass; `structural-mandate.test.ts` stays green |

## Branch Strategy

All four phases execute on branch `v2_adr203`. The branch is created at the start of Phase 1
and merged to `main` only when Phase 3 is fully green. Phase 0 is read-only (no branch needed).
The build is intentionally partially red after Phase 1 ends (templates still reference `npcName`)
and after Phase 2 begins; it becomes green only after Phase 2 fully lands and typechecks pass.

---

## Phases

---

### Phase 0: Dependency-Graph Confirmation and IQueryContext Decision
- **Branch**: none (read-only verification; no code changes)
- **Tier**: Small
- **Budget**: 75 tool calls
- **Domain focus**: N/A — package dependency audit; no logic changes

- **Entry state**:
  - `main` has ADR-201/202 fully implemented (all five phases DONE, merged).
  - ADR-203 is ACCEPTED.
  - `nounPhraseFor` lives at `packages/stdlib/src/utils/noun-phrase.ts`, exported from
    `@sharpee/stdlib`.

- **Deliverable**:
  - Confirm (by reading `package.json` and current imports) that `@sharpee/character` and
    `@sharpee/extensions/basic-combat` already depend on `@sharpee/stdlib`. Read the
    relevant `package.json` files and the two emitter files to confirm the import path is
    clear. **This is a blocking verification step** — if either package does NOT depend on
    stdlib, stop and extract `nounPhraseFor` to a shared lower package before Phase 1.
  - Confirm the `IQueryContext` decision: `packages/core/package.json` has no `if-domain`
    dependency; therefore the `npcName?: string` field is removed from `IQueryContext` and
    the speaker param lives in the loose `Record<string, unknown>` data bag — no typed
    `speaker?: NounPhrase` field is added to core (avoids a new `core → if-domain`
    dependency). Document this decision as a comment on the `IQueryContext` interface when
    making the core change in Phase 1.
  - Scan `packages/lang-en-us/src/npc/npc.ts` and `conversation.ts` to catalog every
    template line and its verb (to prepare the migration list for Phase 2). Pay special
    attention to negated constructions (`doesn't respond` → `{verb:does speaker} not
    respond` for singular/plural correctness) and lines with embedded literal dialogue
    strings (those stay as-is per ADR-200 opaque-text rule; only the attribution verb
    migrates).
  - Note the devkit fixture approach: `packages/devkit/fixtures/basic-story/src/npcs.ts`
    uses literal `npcName: 'maintenance bot'` (a raw string, not `npc.name`). After the
    rename, this needs a `NounPhrase` literal constructed inline (not `nounPhraseFor` of a
    real entity) — shape: `{ kind: 'noun-phrase', head: 'maintenance bot', number: 'singular',
    properName: false, articleType: 'the' }` (or whichever fields `NounPhrase` requires).
    Confirm the exact `NounPhrase` shape from `packages/if-domain/src/phrase.ts` during
    this phase so Phase 1 has a ready answer.

- **ACs satisfied**: none (pure verification); confirms preconditions for AC-1..AC-7.

- **Exit state**:
  - Written confirmation: both packages already depend on stdlib; no relocation of
    `nounPhraseFor` is needed.
  - IQueryContext approach decided: loose bag (no new core → if-domain dependency).
  - Migration catalog for npc.ts and conversation.ts template lines prepared (can be a
    scratchpad note, not a committed file).
  - NounPhrase literal shape for devkit fixture confirmed.
  - No files modified; no branch created.

- **Status**: PENDING

---

### Phase 1: Core Contract, All Emitters, and Devkit Fixture (Branch Open — Build Goes Red Here)
- **Branch**: `v2_adr203` (cut from `main` at start of this phase; stays open through Phase 3)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: N/A — cross-package param rename

- **Entry state**:
  - Phase 0 complete: import reachability confirmed, IQueryContext decision recorded,
    devkit fixture NounPhrase shape confirmed.
  - `main` has all ADR-201/202 work (dialogue-attribution-realpath.test.ts exists as a
    reference).
  - All emitter files use `npcName: npc.name` or `npcName: 'maintenance bot'`.

- **Deliverable**:

  **1. `packages/core/src/query/types.ts`** — remove `npcName?: string` from `IQueryContext`
  (lines ~107-108). Add a documentation comment noting the speaker param lives in the loose
  `data`/`messageParams` bag as a `NounPhrase`, not a typed `IQueryContext` field, to keep
  `core` free of an `if-domain` dependency. No new import.

  **2. `packages/character/src/tick-phases.ts`** (line ~413) — add import of `nounPhraseFor`
  from `@sharpee/stdlib`; replace `npcName: npc.name` with `speaker: nounPhraseFor(npc)`.
  (The data-bag key name changes from `npcName` to `speaker`.)

  **3. `packages/extensions/basic-combat/src/basic-npc-resolver.ts`** (line ~96) — add
  `nounPhraseFor` to the existing stdlib import; replace `npcName: npc.name` with
  `speaker: nounPhraseFor(npc)`.

  **4. `packages/stdlib/src/npc/npc-service.ts`** (×3 sites — lines ~345, ~656, ~664) —
  import `nounPhraseFor` from `../utils`; replace all three `npcName: npc.name` occurrences
  with `speaker: nounPhraseFor(npc)`. At line ~656/664, the existing spread
  `{ npcName: npc.name, ...(direction ? { direction } : {}) }` becomes
  `{ speaker: nounPhraseFor(npc), ...(direction ? { direction } : {}) }`.

  **5. `packages/stdlib/src/npc/behaviors.ts`** (×5 sites — lines ~56, ~109, ~124, ~171,
  ~199) — import `nounPhraseFor` from `../utils`; replace all five
  `data: { npcName: context.npc.name }` occurrences with `data: { speaker: nounPhraseFor(context.npc) }`.

  **6. `packages/devkit/fixtures/basic-story/src/npcs.ts`** (×2 sites — lines ~31, ~45) —
  import `NounPhrase` from `@sharpee/if-domain`; replace literal
  `npcName: 'maintenance bot'` with a constructed `NounPhrase` literal using the shape
  confirmed in Phase 0. (The devkit fixture does not have a live world, so `nounPhraseFor`
  of a real entity is not applicable; a literal `NounPhrase` is correct here.)

  After these changes: all emitters produce a `speaker: NounPhrase` param. The templates
  (`{verbatim:npcName}`) still reference the old key and will produce empty output at
  runtime. TypeScript may or may not flag this (template params are `Record<string, any>`).
  **The build is intentionally partially broken at this point** — this is expected and
  documented. Do not attempt to chase compile errors by reverting; proceed to Phase 2.

- **ACs contributed to**: AC-5 (exhaustive rename is half-done after this phase).

- **Exit state**:
  - Zero occurrences of `npcName: npc.name` remain in any of the 5 emitter files or the
    devkit fixture (grep confirms).
  - `IQueryContext.npcName?: string` is removed from core; comment documents loose-bag
    approach.
  - TypeScript typechecks for each changed package compile individually (or flag only
    missing-template-param warnings, not type errors in the emitter logic itself).
  - Tests may fail at this point (templates produce empty output); this is expected.

- **Status**: PENDING

---

### Phase 2: Template Migration (npc.ts + conversation.ts)
- **Branch**: `v2_adr203` (continuing)
- **Tier**: Small
- **Budget**: 150 tool calls
- **Domain focus**: N/A — lang-en-us template reauthoring

- **Entry state**:
  - Phase 1 complete: all emitters emit `speaker: NounPhrase`.
  - `packages/lang-en-us/src/npc/npc.ts` (~28 attribution lines) and `npc/conversation.ts`
    (~17 attribution lines) still use `{verbatim:npcName}` with literal verbs.
  - The migration catalog prepared in Phase 0 is available.

- **Deliverable**:

  **`packages/lang-en-us/src/npc/npc.ts`** — systematic migration of all attribution lines:

  - **Name-only position** (start of all lines): `{verbatim:npcName}` → `{capitalize the speaker}`.
    This replaces the verbatim rendering with the ADR-192 article+capitalize hint over the
    NounPhrase. Using `{the speaker}` as the default article; authors can override per-message.

  - **Agreeing-verb lines**: append `{verb:LEMMA speaker}` after the NounPhrase. Examples:
    ```
    'npc.enters': "{capitalize the speaker} {verb:enters speaker} from the {verbatim:direction}."
    'npc.leaves': "{capitalize the speaker} {verb:leaves speaker} to the {verbatim:direction}."
    'npc.arrives': "{capitalize the speaker} {verb:arrives speaker}."
    'npc.departs': "{capitalize the speaker} {verb:departs speaker}."
    'npc.notices_player': "{capitalize the speaker} {verb:notices speaker} you."
    'npc.takes': "{capitalize the speaker} {verb:picks speaker} up {verbatim:itemName}."
    'npc.drops': "{capitalize the speaker} {verb:drops speaker} {verbatim:itemName}."
    'npc.follows': "{capitalize the speaker} {verb:follows speaker} you."
    'npc.guard.blocks': "{capitalize the speaker} {verb:blocks speaker} your way!"
    'npc.guard.attacks': "{capitalize the speaker} {verb:attacks speaker} you!"
    'npc.attacks': "{capitalize the speaker} {verb:attacks speaker} you!"
    'npc.misses': "{capitalize the speaker} {verb:swings speaker} at you but misses!"
    'npc.hits': "{capitalize the speaker} {verb:hits speaker} you for {damage} damage!"
    'npc.speaks': "{capitalize the speaker} {verb:says speaker}, \"{verbatim:text}\""
    'npc.shouts': "{capitalize the speaker} {verb:shouts speaker}, \"{verbatim:text}\""
    'npc.whispers': "{capitalize the speaker} {verb:whispers speaker}, \"{verbatim:text}\""
    'npc.mutters': "{capitalize the speaker} {verb:mutters speaker}, \"{verbatim:text}\""
    'npc.laughs': "{capitalize the speaker} {verb:laughs speaker}."
    'npc.growls': "{capitalize the speaker} {verb:growls speaker} menacingly."
    'npc.cries': "{capitalize the speaker} {verb:cries speaker}."
    'npc.sighs': "{capitalize the speaker} {verb:sighs speaker}."
    'npc.greets': "{capitalize the speaker} {verb:greets speaker} you."
    'npc.farewell': "{capitalize the speaker} {verb:bids speaker} you farewell."
    'npc.confused': "{capitalize the speaker} {verb:looks speaker} confused."
    ```

  - **Passive/auxiliary constructions**: the verb atom conjugates the auxiliary:
    ```
    'npc.guard.defeated': "{capitalize the speaker} {verb:is speaker} no longer a threat."
    'npc.killed': "{capitalize the speaker} {verb:has speaker} been slain."
    'npc.unconscious': "{capitalize the speaker} {verb:collapses speaker}, unconscious."
    ```

  - **Negated construction** (`doesn't respond`) — use the do-support form:
    ```
    'npc.no_response': "{capitalize the speaker} {verb:does speaker} not respond."
    ```
    Singular renders "does not respond"; plural renders "do not respond". The contraction
    form ("doesn't") is lost here; if the author prefers it, they override the message.
    This is acceptable: correctness for plural beats stylistic contraction for singular.

  - **`npc.ignores_player`**: `{capitalize the speaker} {verb:ignores speaker} you.`

  **`packages/lang-en-us/src/npc/conversation.ts`** — same systematic pattern across all
  17 attribution lines. Each `{verbatim:npcName} VERB rest.` becomes
  `{capitalize the speaker} {verb:VERB speaker} rest.`. Examples:
  ```
  'character.conversation.response.deflect': "{capitalize the speaker} {verb:changes speaker} the subject."
  'character.conversation.response.refuse': "{capitalize the speaker} {verb:refuses speaker} to discuss that."
  'character.conversation.cognitive.fragmented': "{capitalize the speaker} {verb:speaks speaker} in broken fragments, losing the thread mid-sentence."
  'character.conversation.between.eager.1': "{capitalize the speaker} {verb:watches speaker} you expectantly."
  'character.conversation.between.eager.3': "{capitalize the speaker} {verb:clears speaker} their throat, waiting for your attention."
  ```
  Lines with embedded literal dialogue (e.g., `"I wasn't finished."`, `"We're not done
  here."`, `"A word, if you please."`) — the attribution verb migrates; the embedded literal
  string stays verbatim (ADR-200 opaque-text rule). Example:
  ```
  'character.conversation.attention.protests': "{capitalize the speaker} {verb:frowns speaker} as you turn away. \"I wasn't finished.\""
  'character.conversation.attention.blocks': "{capitalize the speaker} {verb:steps speaker} in front of you. \"We're not done here.\""
  'character.conversation.initiates': "{capitalize the speaker} {verb:approaches speaker} you. \"A word, if you please.\""
  ```

  After this phase, the assembler receives a `speaker: NounPhrase` param; `{the speaker}`
  and `{verb:LEMMA speaker}` both resolve it. The build should typecheck green.

- **ACs contributed to**: AC-4 (verbatim text payloads untouched), AC-5 (zero `npcName`
  template usages remain).

- **Exit state**:
  - Zero occurrences of `{verbatim:npcName}` remain in `npc.ts` or `conversation.ts`
    (grep confirms).
  - All template lines use `{capitalize the speaker}` and `{verb:LEMMA speaker}`.
  - Full typecheck across changed packages is clean.
  - Unit test suites may still fail if existing tests hardcode expected output with old
    `npcName` string format; fix those within this phase.

- **Status**: PENDING

---

### Phase 3: Test Suite and Green Gate
- **Branch**: `v2_adr203` (completing)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: N/A — test writing and build verification

- **Entry state**:
  - Phase 2 complete: all emitters and templates migrated; typecheck green.
  - The `dialogue-attribution-realpath.test.ts` (ADR-201 path) exists in
    `packages/stdlib/tests/integration/` as a reference for the REAL-PATH test pattern.
  - `structural-mandate.test.ts` (ADR-202 gate) exists in `packages/lang-en-us/tests/assembler/`.

- **Deliverable**:

  **AC-1 — REAL-PATH test** (new file:
  `packages/stdlib/tests/integration/npc-attribution-realpath.test.ts`):
  - Construct a plural NPC entity with `IdentityTrait.nounType: 'plural'` (e.g. "the twins").
  - Drive it through a real NPC-subsystem emitter (e.g., `npc-service.ts` `speaks` path) with
    a real `EnglishLanguageProvider` (same wiring as `dialogue-attribution-realpath.test.ts`).
  - Assert the rendered output contains "say" (plural) not "says".
  - Repeat for a singular NPC: assert "says".
  - This is a REAL-PATH test — no mock provider, no stubbed realizer.

  **AC-2 — Proper-name unchanged**:
  - Construct a proper-named NPC (`IdentityTrait.properName: true`, e.g. "Sam").
  - Assert the rendered attribution output contains "Sam" (no article) and uses "says"
    (singular proper name). Result must be byte-identical to pre-migration behavior.

  **AC-3 — Article orthogonal to agreement**:
  - Test `{the speaker}` (common-noun NPC): renders "The guard" / "The guards".
  - Test `{a speaker}` (if used in a template): renders "A guard".
  - Assert agreement is correct in both article forms, for both singular and plural.

  **AC-4 — Verbatim payloads byte-identical**:
  - For `npc.speaks`, assert `{verbatim:text}` content in the output matches exactly
    what was passed in (no escaping, no modification).

  **AC-5 — Exhaustive rename**:
  - Assert (as a test or a documented build-step): `grep -rn "npcName" packages/ --include="*.ts" | grep -v ".d.ts" | grep -v test` returns zero lines. Can be a CI-triggerable shell assertion or a small Vitest test that reads the source files and checks.

  **AC-6 — Negative / graceful degradation**:
  - Construct an NPC entity that lacks `IdentityTrait` entirely (or has a partial one).
  - Call `nounPhraseFor` on it. Assert it returns a `NounPhrase` with the entity's raw
    `name` and defaults to `number: 'singular'` — no throw.
  - Drive this NPC through the `speaks` emitter + provider. Assert it renders without
    throwing and falls back to name surface + singular verb.

  **AC-7 — Structural gate + all suites green**:
  - Run the full test suite for all touched packages: `packages/stdlib`, `packages/lang-en-us`,
    `packages/character`, `packages/extensions/basic-combat`, `packages/devkit`.
  - Run `packages/lang-en-us/tests/assembler/structural-mandate.test.ts` explicitly to
    confirm the ADR-202 gate is still green (the template changes do not introduce any new
    structure-recovery strings or regex in the assembler).
  - Note the known `./repokit build dungeo` limitation: `packages/bootstrap` has never been
    built, so the full platform build cannot be verified in this session. Unit/integration
    suites are the primary gate. Record this as a follow-up in the session summary.

  When all ACs are green, merge `v2_adr203` to `main`.

- **ACs satisfied**: AC-1 (REAL-PATH plural agreement), AC-2 (proper-name unchanged),
  AC-3 (article orthogonal), AC-4 (verbatim payloads), AC-5 (exhaustive rename),
  AC-6 (graceful degradation), AC-7 (suites green + ADR-202 structural gate).

- **Exit state**:
  - `npc-attribution-realpath.test.ts` exists and passes (AC-1 real-path).
  - All AC-1..AC-7 test assertions pass.
  - `grep -rn "npcName" packages/ --include="*.ts"` (excluding `.d.ts` and test files)
    returns zero emitter lines.
  - `structural-mandate.test.ts` green.
  - All touched package suites green.
  - `v2_adr203` merged to `main`.
  - Session summary records the bootstrap/dungeo build as a deferred open item (unchanged
    from prior session state).

- **Status**: PENDING

---

## Implementation Notes

### Verb Lemmas for Irregular Verbs

Some template verbs have irregular third-person singular forms. The ADR-199 Verb atom handles
conjugation from lemmas. Use the base (infinitive) form as the lemma:
- "enters" → `{verb:enters speaker}` (regular; base is "enter" for plural, "enters" for singular)

Actually, **the lemma passed to `{verb:LEMMA speaker}` is the third-person-singular form** in
the existing Verb atom contract (ADR-199: `{verb:is target}` → "is"/"are"). Verify this
against the actual atom behavior before committing to a lemma convention. The existing
`npc.speaks` pattern from `talking.ts` uses `{verb:says target}` where "says" is the
3sg form — follow that same convention.

### Devkit Fixture NounPhrase Literal

`packages/devkit/fixtures/basic-story/src/npcs.ts` hardcodes `npcName: 'maintenance bot'`
as a plain string (it is a test fixture, not a real world call). The replacement must be a
`NounPhrase` literal. Confirm the exact required fields from
`packages/if-domain/src/phrase.ts` during Phase 0. A minimal conformant literal will look
approximately like: `speaker: { kind: 'noun-phrase', head: 'maintenance bot', number: 'singular', properName: false }`.

### Build Red During Phase 1

After Phase 1 emitters are updated, the templates still reference `{verbatim:npcName}` —
this param name no longer matches. At runtime, `{verbatim:npcName}` will resolve to empty
(the param bag has `speaker`, not `npcName`). TypeScript will not catch this because
template params are `Record<string, unknown>`. This is expected and deliberate — do not
chase the symptom by reverting emitter changes. Proceed directly to Phase 2.

### `./repokit build dungeo` Limitation

Per the prior session, `packages/bootstrap` has never been built and `./repokit` itself
won't compile. The full platform build remains blocked. Unit and integration test suites
(via `pnpm --filter '@sharpee/...' test`) are the acceptance gate for this ADR.
