# ADR-192 Phase 3b + 4 — Detailed Scope (the fused destructive + integration step)

**Created**: 2026-06-26
**Status**: READY — not started; the §7.1 verb-agreement BLOCKER is **resolved** (ADR-199
ACCEPTED 2026-06-27, option B). §7.2 (appetite) and §7.3 (LanguageProvider API) remain
author/implementer calls but are non-blocking.
**Branch (proposed)**: `v2_phase34` from `main`.
**Constraint**: ADR-192 explicitly rejects a dual pipeline / dispatch seam. Old and
new template syntaxes cannot coexist on the same message set, so the cutover is
**atomic across all templates** and merges to `main` only when the whole thing is
green (build + every package suite + the dungeo walkthrough chain).

This is the work deferred from Phase 3 (the additive half, 3a, is already on `main`:
`parsePhraseTemplate`, `nounPhraseFor`, `NounPhrase.capitalize`).

---

## 1. The integration point (from the pipeline map)

Today, every stdlib event with a `messageId` renders through:

```
engine/prose-pipeline/handlers/{domain-message,generic,audibility}.ts
  → LanguageProvider.getMessage(messageId, params)        // lang-en-us/language-provider.ts:178
      → resolvePerspectivePlaceholders(template, narrativeCtx)   // {You}/{your}/{take}  (ADR-089)
      → formatWithFormatters(message, params, registry, ctx)     // the :-chain → STRING
  → assemble.ts createBlocks(blockKey, message)            // string → ITextBlock[]
  → ChannelService routes blocks                            // channel-service
```

The phrase path replaces the middle:

```
  → template = LanguageProvider.getTemplate(messageId)            // raw template
  → template = resolvePerspectivePlaceholders(template, narCtx)   // KEEP — runs first
  → tree     = parsePhraseTemplate(template, params)              // → Phrase tree
  → blocks   = EnglishAssembler.realize(tree, renderCtx)          // → ITextBlock[]
```

Key facts the exploration established:
- **Perspective resolution stays** and runs **before** `parsePhraseTemplate` (string
  pre-pass; no placeholder-syntax collision — perspective names are fixed words,
  phrase placeholders are param refs).
- **The world model is NOT in scope** in the prose-pipeline handlers today. A
  `RenderContext` needs read-only world access, so the world must be threaded into
  `HandlerContext` / `ProsePipeline.processTurn`.
- **`LanguageProvider` is the single runtime consumer** of the formatter chain
  (`language-provider.ts:21-26,46,56,191-195`). It is the central thing to refactor.
- The Assembler already emits `ITextBlock[]`, so `assemble.ts createBlocks` becomes a
  no-op for the phrase path (blocks come straight from `realize`).

---

## 2. Workstreams and sizes

| # | Workstream | Surface | Size |
|---|------------|---------|------|
| W1 | Pipeline plumbing: thread world into prose-pipeline; `LanguageProvider.getTemplate` + a `realize`-style entry exposing the Assembler; perspective-before-parse ordering | engine prose-pipeline (3 handlers + pipeline.ts + assemble.ts), lang-en-us language-provider.ts | Medium |
| W2 | `RenderContext` runtime: `RenderWorld` adapter over `IWorldModel`; `LocaleSettings` from provider; placeholder `reference`/`textState`/`contribute` seams (impls deferred to ADR-195–197) owned per-turn by engine | engine + lang-en-us | Medium |
| W3 | **Verb agreement** (`{is:}`/`{was:}`/`{has:}`, 52 templates) — needs a decision (§7.1) | lang-en-us | Medium + DECISION |
| W4 | Re-author all `:`-chain templates → new grammar | 418 templates, 46 files | **Large (mechanical, bulk)** |
| W5 | Migrate `entityInfoFrom` → `nounPhraseFor` in all callers | 236 sites, 41 source files (+ basic-combat 3) | **Large (mechanical, bulk)** |
| W6 | `{list:items}` → programmatic `PhraseList` binding | 3 templates (looking, going) + their `-data.ts` | Small |
| W7 | Delete legacy infra: `parsePlaceholder`, `applyFormatters`, `formatMessage`, `createFormatterRegistry`, `formatters/{article,list,verb,text,registry,types}.ts`, `EntityInfo`, `entityInfoFrom` + barrel exports | lang-en-us formatters/, stdlib utils/, 3 barrels | Medium |
| W8 | Delete/rewrite formatter test suites; keep ADR-190 parity (already in assembler test) | 6 test files | Medium |
| W9 | Amend ADR-158 §Consequences (superseded-by-192 note) | 1 doc | Trivial |
| W10 | Walkthrough/transcript reconciliation + full build verify | ~69 dungeo transcripts (52 unit + 17 wt) | Medium (iterative) |

**Bulk reality**: W4 (418 templates) + W5 (236 call sites) dominate. They are
mechanical but must be done together because re-authored templates expect
`NounPhrase` params, and migrated actions produce them. Neither half builds alone.

---

## 3. The verb-agreement gap (the one real blocker)

`formatters/verb.ts`: `{is:target}` → "is"/"are" by `target`'s `grammaticalNumber`
(or `nounType==='plural'`). Example (`actions/attacking.ts`):
`"{the:cap:target} {is:target} dead."` → "The troll is dead." / "The pygmy goats are dead."

Problems:
1. ADR-192's **closed union has no verb kind** (stubs: pronoun, number, verbatim,
   contents, slot, optional, choice). Verb is not in the algebra.
2. `{is:target}` contains `:`, so `parsePhraseTemplate` treats `is` as a kind prefix,
   finds it unknown, and **throws** (AC-11). These 52 templates would hard-fail.

They cannot be deleted (52 real usages) or mechanically space-rewritten (no construct).
**This needs a decision — see §7.1.**

---

## 4. Other non-mechanical items

- **`{list:items}` (W6)**: not a kind prefix in the new grammar. The report/`-data.ts`
  layer builds a `PhraseList` of `nounPhraseFor(item)` and binds it to `items`; the
  template references bare `{items}`. Affects `looking.ts`/`looking-data.ts`,
  `going.ts`. (`{the-list:}`/`{count:}` have **zero** real usages — docs only.)
- **`{the:cap:item}` (172 templates)**: → `{capitalize the item}` (carrier already
  shipped in 3a). Bulk but mechanical.
- **RenderContext seams**: `reference`/`textState`/`contribute` get placeholder runtime
  impls (return Empty / empty store / no-op) per ADR-192 §6; real impls are ADR-195–197.
- **Decoration interplay**: the open question (decorations through composition) — current
  Assembler treats `phrase.decorations` as className wrappers; `[em:]`/`[code:]` bracket
  decorations are parsed by `engine/prose-pipeline/decorations/parser.ts` AFTER text.
  Confirm the bracket-decoration pass still runs post-realize (it operates on block text).

---

## 5. Proposed sequencing (single branch, atomic cutover, keep main green by merging only when whole)

1. **W1+W2** — pipeline plumbing + RenderContext runtime, with the new path wired but
   templates still old (path not yet switched). Builds, old path still active.
2. **W3** — land the chosen verb-agreement mechanism (§7.1).
3. **W6** — PhraseList binding for looking/going.
4. **W4+W5** — the bulk: re-author all templates + migrate all actions, action-by-action
   (each action's templates + its `entityInfoFrom` sites together) so each vertical slice
   is internally consistent. Pipeline switched to phrase path once enough is migrated.
   *(During this window the build is red on the branch — expected; it's pre-merge.)*
5. **W7+W8** — delete legacy infra + old tests once nothing references them.
6. **W9** — ADR-158 amendment.
7. **W10** — `./repokit build dungeo`, run `--chain wt-*` + unit transcripts, reconcile
   diffs (articles/grouping/Oxford/caps). Transcripts use substring `contains` so most
   are robust; `article-rendering.transcript` is the sentinel.
8. Full green → merge `v2_phase34` → `main` → push.

---

## 6. Size estimate

Realistically **multiple sessions on one long-lived branch**. The bulk (W4+W5 ≈ 650
edits across ~80 files) is the bulk of the time; W1–W3 are the design-sensitive core;
W10 is iterative against the walkthrough suite. This does not merge incrementally — it
is one atomic cutover by ADR mandate.

---

## 7. Decisions needed before starting

### 7.1 Verb agreement — RESOLVED (option B → ADR-199 ACCEPTED 2026-06-27)
**Decision: option B.** The 59 `{is:}`/`{has:}` usages (`{was:}` has zero live usages)
become `{verb:is x}`/`{verb:has x}`, a new `Verb` atom in the closed union realized by the
Assembler's Agreement authority. Implemented as W3. Full contract — interface, subject
resolution (3rd-person / 2nd-person player / surface-less default), agreement algorithm,
and acceptance criteria — in **ADR-199**. Rationale for B over A: v1 is frozen in the
sibling repo, so A's only advantage (leaving templates untouched) is illusory — W4
re-authors every template anyway, making A a guaranteed second migration for no saving.

Original options, for the record:
- **(A) Transitional pre-pass**: a string pre-pass resolving `{is:x}`→"is"/"are" before
  `parsePhraseTemplate`. Rejected — reintroduces the formatter-style string pass ADR-192
  deletes; no backward-compat reason to take it.
- **(B) Add a `Verb` kind now** — **CHOSEN** (ADR-199).
- **(C) Defer the 59 usages behind a shim** — rejected; leaves a known hole + a second cutover.

### 7.2 Appetite / session plan
Confirm this runs as one atomic, multi-session branch that merges only when fully green
(build + all suites + walkthrough chain) — vs. a smaller first slice to de-risk.

### 7.3 LanguageProvider API (implementation lean — will decide unless you object)
Add a new `LanguageProvider` method returning `ITextBlock[]` (e.g.
`renderMessage(messageId, params, renderCtx)`) and expose the Assembler, keeping
`getMessage`→string only for any non-phrase callers; remove its formatter step.
