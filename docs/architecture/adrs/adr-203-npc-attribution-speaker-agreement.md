# ADR-203: NPC Attribution Speaker Agreement — Promoting the NPC Speaker Param

## Status: ACCEPTED

> Accepted 2026-06-30 by David. The deferred "later slice" named in ADR-201 §6 (hardcoded
> attribution verbs in `packages/lang-en-us/src/npc/`). Continues the ADR-199 (Verb) +
> ADR-201 (Dialogue) agreement line into the NPC subsystem. Two review questions resolved
> at acceptance (see **Resolution**).

## Date: 2026-06-30

## Terminology

- **NPC attribution message** — an engine/subsystem-emitted line naming an NPC and a verb it
  performs: `"{npcName} says, …"`, `"{npcName} enters …"`, `"{npcName} attacks you!"`. Sourced
  by the NPC/character subsystems, not by a player action's four-phase report.
- **Speaker param** — the parameter an attribution message binds the acting NPC to. Today it is
  `npcName: string` (a bare name); this ADR promotes it to a `NounPhrase`.
- **Agreement-bearing param** — a value carrying `number` (and `person`) that the ADR-199 Verb
  realizer reads at realize time to conjugate `{verb:lemma subject}`.

## Context

ADR-201 §6 migrated the **action catalogs** (`talking`/`asking`/`telling`) to `{verb:says
target}`. There, the action emits `params.target = nounPhraseFor(target)` — a **`NounPhrase`
carrying `number`** (from `IdentityTrait.nounType`/`grammaticalNumber`), resolved at emit time.
Verified: `stdlib/tests/integration/dialogue-attribution-realpath.test.ts` — a plural NPC
renders "The triplet acrobats **say**".

The **NPC subsystem** was left on the old shape. `packages/lang-en-us/src/npc/npc.ts` and
`conversation.ts` render attribution as `{verbatim:npcName} says, "…"`, and every emitter passes
`npcName: npc.name` — a **bare string**. The Verb atom **degrades a bare-string subject to
singular** (`verb-agreement.test.ts:113`), so `{verb:says npcName}` on today's string param would
*always* render "says". A plural/collective NPC ("the twins", "the guards") renders "the twins
**says** / **attacks** you". The attribution cannot agree until the speaker param carries `number`
— a cross-package contract change, hence its own ADR.

## Resolution (review questions, resolved at acceptance)

- **Article rendering is an authoring choice, not platform-inferred.** The speaker becomes a
  `NounPhrase`; the *article* is chosen per-template with the existing ADR-192 hints (`{a speaker}`
  / `{the speaker}` / no-article), and a story author overrides the message to say "A maintenance
  bot enters…" or "The maintenance bot enters…" as they wish. **No first-mention/discourse tracking
  is introduced** (considered and rejected as over-engineering). Agreement is orthogonal to the
  article: `{verb:… speaker}` reads `number` regardless of which article the template uses.
- **Full migration.** All agreeing-verb `npc.*` / `conversation.*` lines migrate (so "the twins
  **attack**", not only "the twins **say**"). The param-promotion work is identical either way; a
  speech-only cut would leave a mixed, still-wrong model.

## Decision

Promote the NPC speaker from a bare string to a `NounPhrase` speaker param, and migrate all
agreeing attribution templates to the ADR-199/201 form.

### 1. Param contract

The attribution param is a **`NounPhrase`** (the `if-domain` type) carrying `number` and
`properName`, produced by **`nounPhraseFor(npc)`** (the existing `stdlib/utils` resolver) **at
emit time** — identical to the action path. It replaces the `npcName: string` param end-to-end;
the name surface renders from this NounPhrase (no parallel `npcName` string is kept).

- `packages/core/src/query/types.ts` — the typed convenience field `npcName?: string` is removed.
  Implementation note to verify: whether the replacement is a strongly-typed `speaker?: NounPhrase`
  field (adds a `core → if-domain` type import — if-domain is foundational, so acceptable) or the
  param stays in the loose `Record<string, unknown>` bag with the shape documented. Either is
  conformant; pick the one that keeps core's existing dependency shape.

### 2. Emitters (atomic multi-step update)

Every site that sets `npcName: npc.name` instead emits `nounPhraseFor(npc)` as the speaker param.
The **exhaustive** emitter inventory (grep-verified — no other setter exists):

- `packages/character/src/tick-phases.ts`
- `packages/extensions/basic-combat/src/basic-npc-resolver.ts`
- `packages/stdlib/src/npc/npc-service.ts` (×3), `packages/stdlib/src/npc/behaviors.ts` (×5)
- `packages/devkit/fixtures/basic-story/src/npcs.ts` (×2 — the test fixture; must migrate or its
  build breaks)

This rename is a **single atomic update**: the core param, *every* emitter above, and both
template files must change together. A missed emitter leaves an unresolved/typed-wrong param → a
broken or unrendered attribution line (the classic silent multi-step failure). CI is green only
when all sites land in one change.

**Transitive risk to verify:** `nounPhraseFor` lives in `stdlib/utils`. The `character` and
`extensions/basic-combat` emitters must be able to import it; if their dependency graph doesn't
already reach `stdlib`, `nounPhraseFor` (or a thin equivalent) moves to a shared lower package.
Confirm import reachability before coding each emitter.

### 3. Templates (lang-en-us `npc/npc.ts` + `npc/conversation.ts`)

- **Every agreeing-verb line** → `{capitalize the speaker} {verb:LEMMA speaker}[, "…"]` (speech
  `says/shouts/whispers/mutters`; movement `enters/leaves/arrives/departs`; `notices_player`,
  `takes/drops/follows`; combat `attacks/misses/hits`; emotes `laughs/growls/cries/sighs`; the
  `conversation.ts` verbs). `{verb:… speaker}` agrees with `number`.
- **Name-only lines** → `{capitalize the speaker}` for the name surface.
- **Article** is per-template via the standard hint (`{the speaker}` default here; a template may
  use `{a speaker}`), author-overridable at the story level.
- `{verbatim:text}` utterance/emote payloads are unchanged (ADR-200 opaque author/behavior text).

## Options considered

- **Discourse-driven article (auto a→the on first mention)** — rejected: over-engineering; the
  platform has no first-mention tracking and the author already controls the article via ADR-192
  hints.
- **No-article NounPhrase to preserve raw names** — subsumed: the author picks the article per
  template; a no-article rendering is just `{speaker}` with `articleType:'none'` when wanted.
- **Speech-verbs-only migration** — rejected (see Resolution): leaves a mixed, still-incorrect model.
- **Keep `npcName` string; add a parallel agreeing param** — rejected: two params for one entity,
  drift risk.

## Scope

**In:** the `NounPhrase` speaker param (core query type); its emit-time resolution via
`nounPhraseFor` at all 4 emitter files listed (incl. the devkit fixture); full `npc.ts` +
`conversation.ts` template migration; agreement + rendering tests incl. a REAL-PATH plural-NPC test.

**Out:** `{say:speaker utterance}` sugar (ADR-201, past v1); gender/output-object pronouns (future
ADR-D); tense/aspect (ADR-199 Out); the sibling attribution slices in `actions/giving.ts` and
`stories/dungeo/src/regions/endgame.ts` (separate, may reuse this param); any first-mention/discourse
article automation.

## Consequences

- **Collective/plural NPCs agree**: "the twins **say**", "the guards **block** your way".
- **Singular NPCs are byte-identical** where the template keeps the same article as the current
  wording; proper-named NPCs ("Sam") suppress the article regardless. The *only* intended change is
  correct verb number — plus any deliberate per-template article the author now controls.
- **Cross-package + atomic** — core, character, extensions/basic-combat, stdlib, lang-en-us, and the
  devkit fixture change together. `./repokit build dungeo` (currently blocked on `packages/bootstrap`)
  should validate the dungeo NPC lines end-to-end once that blocker clears.
- **Boundary/determinism preserved** — no locale strings in core; agreement stays realize-time and
  pure (ADR-192 §7 / ADR-202 — no structure-recovery regex; `nounPhraseFor` is plain resolution).
- **Low practical incidence** — most NPCs are singular proper names already correct; this closes a
  correctness hole rather than fixing a widespread visible bug.

## Acceptance Criteria

1. **Agreement (REAL-PATH):** a plural NPC (`IdentityTrait.nounType:'plural'`) driven through a real
   emitter + real `EnglishLanguageProvider` renders `npc.speaks` as "… **say**, "…"" not "says"; a
   singular NPC renders "says". (Mirrors the ADR-201 realpath test, on an NPC-subsystem emitter.)
2. **Proper name unchanged:** a proper-named NPC ("Sam") renders identically before/after (no article).
3. **Article is template-driven, orthogonal to agreement:** with `{the speaker}` a common-noun NPC
   renders "The …"; swapping the template to `{a speaker}` renders "A …"; **agreement is unaffected**
   in both (asserted for singular and plural).
4. **Verbatim payloads unchanged:** `{verbatim:text}` utterance/emote content is byte-identical.
5. **Exhaustive rename:** no bare-string `npcName` param remains in core, any of the 4 emitter files,
   or the templates; grep confirms zero `npcName` setters after the change.
6. **Negative / graceful:** an NPC that can't resolve to a full `NounPhrase` (e.g. missing/partial
   `IdentityTrait`) renders without throwing — the speaker degrades to its name surface and the verb
   to singular (matching the existing bare-string degrade behavior). Asserted with a fixture NPC.
7. **Structural gate + suites green:** ADR-202 structural test stays green; all touched packages' suites pass.

## Relationships

- **Extends** ADR-201 §6 into the NPC subsystem; **uses** ADR-199 (Verb), ADR-194 (`nounPhraseFor`
  bridge), ADR-158 (`EntityInfo`), ADR-192 (Article/Case authority). **Bound by** ADR-202.
- **Sibling follow-ups** (same param, separate slices): `actions/giving.ts`, `stories/dungeo/.../endgame.ts`.

## Session

Drafted + accepted 2026-06-30 (session `012562`, branch `main`), the first ADR-201 deferred
attribution slice. Reviewed via `/adr-review` (initial draft: 6/12, NEEDS WORK); this revision
resolves the two contract-affecting questions and the flagged gaps (concrete `NounPhrase` type,
emit-time resolution, exhaustive emitter list incl. devkit fixture, atomic-update framing, negative AC).
