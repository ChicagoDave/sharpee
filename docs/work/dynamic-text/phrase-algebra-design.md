# The Phrase Algebra — Design Sketch

**Status:** design sketch / pre-ADR. North-star doc for dynamic text.
**Date:** 2026-06-26
**Supersedes the framing of:** `dynamic-text-proposed-solutions.md` (the six A–F ADRs).
**Companion:** `dynamic-text-scenarios.md` (the 37-scenario inventory — still the requirements).

> This doc replaces the "six bolt-on formatters" plan with **one unifying model**. The
> scenarios doc stays valid as the *requirements* (what must render); this doc is the
> *mechanism* (how). The A–F ADRs become *facets* of one algebra, not six dialects.

---

## 1. The root cause (why six ADRs, restated as one bug)

Today a placeholder renders through a **formatter chain** whose signature is

```
formatter: (string | number | EntityInfo | EntityInfo[]) => string
```

(`lang-en-us/formatters/registry.ts` `applyFormatters`). The chain splits on `:`
(`parsePlaceholder`), applies formatters left-to-right, and **collapses to a bare
`string` after the first formatter.**

That early collapse is the whole problem. The moment `{the:item}` becomes `"the
cabinet"`:

- an enclosing phrase can no longer **agree an article** over it (lost: leading sound,
  number) → S5–S8 need adjectives *inside* the noun phrase
- it can no longer be **counted or grouped** with siblings → S16–S21
- it can no longer be **pronoun-referenced** later in the turn → S24–S25
- it can no longer be **composed** with a second contributor's clause → S-append
- a **conditional/variation** has nowhere to live except in the string itself → S9–S14

Every gap in the scenario matrix is a symptom of *realizing to string too early.*

**The fix, stated once:** text is not a string with embedded formatters. Text is a
**tree of phrases** that defer realization, each carrying the grammatical metadata the
others need, rendered by **one assembler** at end of turn.

ADR-190 already took the first step: `EntityInfo` is a value that carries `name`,
`plural`, `nounType`, `article`, `grammaticalNumber` — **it is a proto-phrase.** We are
not inventing a model; we are finishing the one we started.

---

## 2. The Phrase

A **Phrase** is an immutable, composable value that knows how to realize itself to text
*later*, against full world state, via a locale renderer. It defers realization and
carries the metadata neighbors need to agree with it.

**Metadata every phrase may carry** (the "agreement surface"):

| Field | For | Example |
|-------|-----|---------|
| `number` | verb agreement, pluralization | `singular` \| `plural` \| `mass` |
| `person` | pronouns, verb conjugation | `1` \| `2` \| `3` |
| `pronounSet` | gendered/neopronoun reference | `she/her`, `they/them` |
| `properName` | article suppression | `true` → no article |
| `articleType` | a/an/the/some/∅ | `indefinite` \| `definite` \| `some` \| `none` |
| `leadingSound` | a/an choice (computed at realize from rendered head) | vowel-ish? |
| `referableId` | last-mentioned tracking → later `{it}` | entity id |
| `whitespace` | collapse exemption | `normal` \| `verbatim` |
| `decorations` | emphasis etc. carried through composition | `[em]`, `[code]` |

The renderer computes the final string; agreement (article, verb, case) runs **over the
realized head span**, not the bare noun. This is what makes "an **open** cabinet" fall
out for free.

---

## 3. The phrase kinds (the algebra)

A small fixed set. **Atoms** are leaves; **combinators** build phrases from phrases;
**modifiers** wrap a phrase.

### Atoms

| Kind | Produces | Subsumes |
|------|----------|----------|
| `Literal` | raw author text (carries leading sound when it heads a span) | the prose between placeholders |
| `NounPhrase` | article + adjectives + noun for an entity, agreed as a whole | **ADR-A** (S5–S8, S21) |
| `Pronoun` | subject/object/possessive, resolved against last-mentioned ctx | **ADR-D** (S23–S25) |
| `Numeral` | a number as digits / words / ordinal | minor (S30) |
| `Verbatim` | opaque text, exempt from whitespace collapse | **ADR-E** (S36–S37) |
| `Empty` | renders to nothing; absorbed cleanly by combinators | the punctuation-safe "else" |

### Combinators

| Kind | Produces | Subsumes |
|------|----------|----------|
| `List` | phrases joined with grouping + serial comma + and/or | **ADR-190 ✓** (S16–S18); generalize from EntityInfo to Phrase |
| `Contents` | a `List` of an entity's direct contents + preposition from relation | **ADR-C** (S19–S20, S32) |
| `Sequence` | ordered concatenation under one punctuation authority | a "sentence" |
| `Slot` | a **named, open** target; many producers contribute during the turn; joined at finalize by the slot's grammar policy | **ADR-F** (S-append) |

### Modifiers

| Kind | Produces | Subsumes |
|------|----------|----------|
| `Optional` | a phrase **or** `Empty`, by a predicate over context/params | **ADR-B**, conditional half (S9–S10) |
| `Choice` | one alternative selected by a **seeded, persistent** selector | **ADR-B**, variation half (S12–S14) |
| `Decorated` | a phrase wrapped in emphasis/code/etc. | existing inline decoration, composed |

**The crucial reframe for ADR-B:** `Optional` and `Choice` are **not template syntax.**
There is no `{?…|…}` or `{#cycle|…}` in the prose string. They are phrases *produced in
code* and bound to a name the template references. A conditional clause is: the report
layer builds an `Optional`, names it `detail`, and the template says `{detail}` — empty
renders to nothing, and the surrounding `Sequence`/`Slot` owns the punctuation. **All
branching stays in code. The string stays dumb.** That is the Sharpee Way, kept.

---

## 4. Producers — who emits phrases

A **producer** is a pure function from render context to a phrase:

```
type PhraseProducer = (ctx: RenderContext) => Phrase
```

`RenderContext` exposes: read-only world, the bound params, the per-(entity,key)
**text-state store**, the **last-mentioned context**, and locale settings (serial comma,
etc.). A producer may return `Empty`.

Producers live in code, at the layer that owns the logic:

- **Entities / traits** produce their own `NounPhrase`. Traits opt into two hooks:
  - `AdjectiveContributor.contributeAdjectives(ctx): string[]` — `OpenableTrait` →
    `['open']`/`['closed']`, `LockableTrait` → `['locked']`, `LightSourceTrait` →
    `['lit']`. (S5–S8)
  - `PrintedName.printedName(ctx): string | undefined` — computed noun swaps, e.g. a
    disguised NPC. (S7)
  - `Contents` consults containment/support relations for the list + preposition. (S19, S32)
- **Actions / report services** compose producer outputs into `Sequence`s and `Slot`s.
- **Behaviors / daemons / NPCs** `ctx.contribute(slotKey, phrase, {priority})` to open
  slots during the turn — without knowing about each other. (S-append)

`EntityInfo` (ADR-190) becomes the **input** a `NounPhrase` producer consumes — the
entity→data bridge stays; `NounPhrase` is the renderable it feeds. (Open decision 4 on
whether they merge.)

---

## 5. The one Assembler (the keystone)

A single per-locale **Assembler** (English realization lives in `lang-en-us`) walks the
phrase tree at end of turn and is the **sole authority** for:

| Authority | Owns | Replaces today's scattered |
|-----------|------|----------------------------|
| **Article** | a/an/the/some/∅ agreed over the realized head (incl. adjectives) | `article.ts`, half of `list.ts` |
| **Agreement** | verb number/person, pluralization | `verb.ts`, `pluralize()` |
| **Punctuation** | serial commas, final and/or, no dangling comma for `Empty`, terminators | scattered across every formatter |
| **Whitespace** | collapse + paragraph breaks, with `Verbatim` exemption | `assemble.ts` collapse |
| **Reference** | last-mentioned tracking → `Pronoun` resolution | (does not exist) |
| **Case** | sentence-start capitalization | `cap` formatter |

This is the single biggest win over six ADRs: **punctuation, article, and whitespace are
correct for *any* composition, because exactly one component owns each** — instead of N
formatters each half-owning a slice and failing to compose at the seams.

---

## 6. The pipeline (old → new)

```
TODAY:  event(messageId, params)
          → lookup template string
          → parsePlaceholder (split ':') → formatter chain → string  ← collapses early
          → assemble.ts joins blocks + collapses whitespace

NEW:    event(messageId, params)
          → report builds a PHRASE TREE (literals + named producers + slots)
          → engine tracks last-mentioned ctx + text-state store across the turn
          → ASSEMBLER realizes the tree post-turn (article / agreement / pronoun /
            list grouping / slot join / punctuation / whitespace)
          → final text
```

Message templates in `lang-{locale}` stop being "strings with formatter chains" and
become **phrase templates**: literal text + named holes that bind to producers. (The
exact authoring surface is **Open Decision 1.**)

---

## 7. Layering — where each piece lives

Per CLAUDE.md logic-location. The crucial new boundary: **the algebra is
language-neutral; the realization is per-locale.**

| Layer | Owns |
|-------|------|
| **`@sharpee/if-domain`** (D5) | the `Phrase` kinds + `PhraseProducer` + `RenderContext` — language-neutral contracts (no locale logic), beside the existing `language-provider.ts` / `contracts.ts` |
| **world-model** | traits implement `AdjectiveContributor` / `PrintedName` / contents contribution; `EntityInfo` feeds `NounPhrase` |
| **lang-en-us** | the **Assembler** (English realization): article rules, pluralization, verb tables, pronoun tables. ADR-190's formatters move *into* this. |
| **engine / report** | builds phrase trees from events; owns the **last-mentioned context** and **text-state store** across the turn; runs the assembler |
| **stdlib actions** | declare phrase templates; bind producers; open slots |
| **story** | author phrase templates; contribute to slots; implement custom producers |

This boundary is *better than today*: English-specific a/an and pluralization stop being
baked into the template format and become a renderer concern. It sets up i18n for free —
a second locale ships a second Assembler, the phrase trees are unchanged.

---

## 8. Determinism (save / replay / transcript-safe)

Non-negotiable — Sharpee saves and transcript tests must replay identically.

- `Choice` selectors (`cycle`/`stop`/`shuffle`/`random`/`first`) seed from
  **deterministic turn/entity state**, never `Math.random()`.
- `Slot` contributions order by `(priority, stable-insertion)`.
- The **text-state store** (per-(entityId, messageKey) counters for cycling/first-time)
  **serializes with the world.** This is the one piece of genuinely new persistent state
  the model introduces — it is load-bearing for all of section D and must round-trip.

---

## 9. Scenario coverage (the matrix, re-mapped onto one model)

| Scenario | Old ADR | Phrase-algebra mechanism |
|----------|---------|--------------------------|
| S1–S3 article/case | — | Assembler article + case authority |
| S5–S8 adjectives / dynamic name | A | `NounPhrase` + `AdjectiveContributor` / `PrintedName` |
| S9–S10 conditional | B | `Optional` producer, bound by name (no string syntax) |
| S12–S14 variation / first-time | B | `Choice` + text-state store |
| S16–S18 lists / count | ✓190 | `List` + `Numeral` (generalize 190 to Phrase) |
| S19–S21 contents / nested / w-adjectives | C(+A) | `Contents` → `List` of `NounPhrase` |
| S24–S25 output pronouns | D | `Pronoun` atom + last-mentioned ctx |
| S30 numbers-in-words / ordinal | minor | `Numeral` atom |
| S32 relational placement | C | preposition from relation in `Contents` |
| S36–S37 verbatim | E | `Verbatim` atom + whitespace authority |
| S-append | F | `Slot` combinator + contribution channel |
| S28 adaptive tense/person | defer | future `Verb` atom with person/tense from narration ctx — *fits the model, not a special case* |

Everything lands in one algebra. Even the deferred items are *atoms we haven't added
yet*, not architectural exceptions.

---

## 10. Decisions

### Decided

**D1 — Authoring surface: string that parses to a phrase tree.** Authors write
`"You take {the item}."`; placeholders are *producer references*, not formatter chains;
all branching is a named code-side producer. Pure programmatic composition was rejected
as a big authoring regression for the common literal-plus-reference line. (Programmatic
construction stays available *under* the surface for power users, but the string is the
default authoring path.)

**D2 — Placeholder grammar: NounPhrase is the unprefixed default; non-noun kinds are
prefixed.** This is the "4th path" — option 2's terseness for the 90% noun case, option
3's uniform `{kind:name …}` for everything else. It gives a **clean break** from the old
`:`-split formatter chain (old `{cap:the:item}` now errors, forcing migration rather than
letting it rot silently) while avoiding a sigil grab-bag: every non-default atom is a
named prefix that scales as new atoms are added.

| Reference | Kind | Notes |
|-----------|------|-------|
| `{item}` | NounPhrase (default) | bare param ref → the entity's noun phrase |
| `{the item}` | NounPhrase | leading hint words: `a` / `an` / `the` / `some` |
| `{capitalize the item}` | NounPhrase | `capitalize` = sentence-start capitalization hint |
| `{slot:detail}` | Slot | open append target (was `{+detail}`) |
| `{pronoun:it}` | Pronoun | resolves against last-mentioned ctx; `{capitalize pronoun:it}` to cap |
| `{contents:box}` | Contents | direct contents as a list + preposition |
| `{number:coins words}` | Numeral | `words` / `ordinal` / (default digits) |
| `{verbatim:banner}` | Verbatim | whitespace-collapse-exempt |

All kind prefixes and hint words are **spelled in full** — `pronoun`, `number`,
`capitalize`, `verbatim`, `contents`, `slot` — never abbreviated. Clarity over keystrokes,
matching the model's no-cryptic-special-cases ethos.

Rules: inside `{…}`, the **last bare token is the producer/param name**; **leading bare
tokens are hints** (`a`/`an`/`the`/`some`/`capitalize`, drawn from a small reserved set, so
they can't be param names). A token of the form **`kind:`** at the head selects a non-noun
phrase kind and the remainder is that kind's `name + hints`. There is **no** `:`-chain,
`?`, `|`, or `#` — branching and variation are never expressed in the string; they are
named `Optional`/`Choice` producers the template references like any other.

**D3 — Migration shape: a long-lived `v2` branch, full clean replacement.** Not
incremental-on-`main`, and not big-bang-on-`main` — a *third* shape: the entire pipeline
swap happens on a quarantined `v2` branch while `main` keeps shipping 1.x, and lands to
users all at once as the **2.0 release** when `v2` → `main`.

Why this beats the other two:

- The big-bang **red period stops being a cost** — `v2` may sit red as long as it needs;
  `main` is unaffected, so "everything breaks at once" is just normal in-progress state.
- The incremental **dual-maintenance cost disappears** — no dispatch seam, no two
  pipelines coexisting, no compatibility shims. The old formatter chain is simply
  *deleted* in `v2`.
- **D2's clean break is fully honored** — "old colon syntax now errors" is true on day
  one of the new pipeline, because nothing legacy must keep working beside it (under
  incremental this could only happen in a final cleanup step).
- It **frees D4 and D5 toward their clean options** — `NounPhrase` can outright replace
  `EntityInfo` (D4), and the new `Phrase` contracts land cleanly in `if-domain` (D5).

**Mechanics (decided): two explicitly-named worktrees, 1.x maintenance-only.**

- `repos/sharpee_v1` → `main` / 1.x — a rename of today's `repos/sharpee`; remains the
  **deploy source** (live dungeo + zifmia build from here); **maintenance-only**.
- `repos/sharpee_v2` → the `v2` branch, added as a **git worktree** of the same repo
  (`git worktree add ../sharpee_v2 -b v2`) — shared object store, branches inherently in
  sync, no cross-clone reconciliation.
- *Rename is safe:* a repo sweep (2026-06-26) found **no in-repo dependency** on the
  folder name — only stale references (`fix-crawlers.sh` → superseded `website/dist`) and
  two `.claude` allowlists (harmless). The old Apache vhost is defunct (at most
  `demo.sharpee.net`). A `repos/sharpee → repos/sharpee_v1` symlink covers any stray
  absolute-path reference with zero config churn.

**Drift is bounded by discipline, not constant re-merging:**

- 1.x receives **only maintenance** — the 1.1.x republish, dungeo #170, genuine bugfixes.
  Nothing new.
- **All new and forward-looking work originates in `v2`** (the phrase algebra *and* other
  new features, e.g. ADR-191 Play-It-Now). Drift is therefore one-directional and small —
  you rarely forward-port, because new work starts in `v2`.
- The **book** (em-dash ch05–31) is the one version-neutral stream: it stays on 1.x (tied
  to the live site) and is **merged forward into `v2` periodically**.
- **Timing:** nothing is cut today — design continues on `main`. Create the `v2` worktree
  at the moment the first phrase-algebra/breaking commit is ready to land.

**D4 — `EntityInfo` fate: `NounPhrase` replaces it.** One noun type. ADR-190's
grammatical fields (`name`, `plural`, `nounType`, `properName`, `grammaticalNumber`) are
**absorbed as `NounPhrase`'s language-neutral data**, and the entity→data extractor
`entityInfoFrom` (`stdlib/utils/entity-info.ts`) becomes the **`NounPhrase` producer**.
ADR-190's design work survives as that producer — this is a rename-and-absorb, not a
throwaway. The one *English-specific* field that does **not** survive onto the
language-neutral phrase is the literal article string (`article: 'a'|'an'`): `NounPhrase`
carries the language-neutral `articleType` (`indefinite`/`definite`/`some`/`none`) and the
**assembler computes the a/an surface** — a boundary cleanup the `v2` break enables.
Likewise irregular plural *realization* is the assembler's job (author overrides supplied
through the locale layer). No legacy path needs `EntityInfo` kept alive (D3).

**D5 — Core home: `@sharpee/if-domain`, not a new package.** The language-neutral `Phrase`
kinds + `PhraseProducer` + `RenderContext` interfaces live in `@sharpee/if-domain`
alongside the existing `language-provider.ts` / `contracts.ts` / channel contracts — that
package *is* "core domain model and contracts." A new `@sharpee/text` package was rejected:
it would collide with the existing `text-service*` / `text-blocks` family and add sprawl.
Downstream is unchanged: the assembler emits into `@sharpee/text-blocks`
(`ITextBlock`/`IDecoration`), so the pipeline is **phrase tree (`if-domain`) → assembler
(`lang-en-us`) → `ITextBlock[]` (`text-blocks`)**.

---

## 11. Suggested ADR decomposition (under the new frame)

The phrase algebra is *one architecture*. Per D3, these ADRs are the **internal build
order of the `v2` branch** — each reviewable as it merges into `v2` — not a sequence that
ships atom-by-atom to `main`. They all reach users together at the **2.0 release** when
`v2` lands:

1. **ADR — Phrase model & Assembler core.** The `Phrase` kinds, `PhraseProducer`, the
   single Assembler, the new pipeline. Re-expresses ADR-190's `List`/`EntityInfo` as the
   first phrases. *Foundational — everything else is an atom added to this.*
2. **ADR — NounPhrase & state-derived adjectives** (was ADR-A). First real payoff: "an
   open cabinet."
3. **ADR — Contents & relational placement** (was ADR-C). `Contents` combinator.
4. **ADR — Slots & compositional output** (was ADR-F). The contribution channel
   (leans on the ADR-163 channel model).
5. **ADR — Optional/Choice & text-state store** (was ADR-B, **de-fanged**: code-side
   producers, no in-string control flow). Plus the room first-visit bugfix.
6. **ADR — Pronoun atom & last-mentioned context** (was ADR-D). Independent.
7. **ADR — Verbatim atom** (was ADR-E). Independent.

The two **latent bugs** the scenarios doc surfaced fold in cheaply: `IdentityTrait.
adjectives` becoming live data (ADR 2), and room first-visit wiring (ADR 5).

---

## 12. Why this is more "The Sharpee Way," in one line

Six ADRs patched the *symptoms* of early string collapse, and two of them smuggled
control flow into prose. The phrase algebra removes the *cause*: text becomes data that
renders itself, **all logic stays in code**, and **one assembler** owns every
correctness concern — which is exactly the architecture's existing creed (logic in the
report layer, templates near-dumb), finally applied to text itself.
