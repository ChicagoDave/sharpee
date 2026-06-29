# Experiment: Inform 7 v10 complex text output → Sharpee phrase algebra

**Branch**: `experiment/i7-text-comparison`
**Date**: 2026-06-27
**Goal**: Take 20 of Inform 7 (v10)'s complex text-output features and write the
Sharpee equivalent on the new phrase algebra (ADR-192/199/200). This maps I7's
prose engine onto Sharpee's, shows what the algebra does **today**, and confirms
which follow-on atoms (ADR-193–198) the remaining features need.

The Sharpee equivalents that use **implemented** atoms are verified executably in
`packages/lang-en-us/tests/i7-comparison.test.ts` (each renders through
`parsePhraseTemplate` → `EnglishAssembler` and asserts the exact output).

---

## Sharpee phrase-grammar quick reference (what exists today)

Authoring is a template string that parses to a `Phrase` tree; the English
Assembler realizes it. Placeholders are **producer references**, never in-string
control flow.

| Template | Phrase | Realizes |
|----------|--------|----------|
| `{item}` | `NounPhrase` (producer's `articleType`) | the entity's noun phrase |
| `{the item}` | NounPhrase `definite` | "the cabinet" |
| `{a item}` / `{an item}` | NounPhrase `indefinite` | a/an agreed over the **rendered head** ("an owl", "an hour", "a university") |
| `{some item}` | NounPhrase `some` | "some water" (mass) |
| `{capitalize the item}` | + Case authority | "The cabinet" |
| (proper noun) | NounPhrase `properName` | "Aragorn" (no article) |
| `{verb:is x}` / `{verb:was x}` / `{verb:has x}` / `{verb:opens x}` | `Verb` (ADR-199) | is/are, was/were, has/have, opens/open — agrees number **and person** with subject `x` |
| `{verbatim:x}` | `Verbatim` (ADR-200) | opaque pass-through, whitespace-exempt |
| bare `{n}` where `n` is a number | `Literal` | "42" |
| (producer binds) `PhraseList` | `PhraseList` | grouped, pluralized, serial-comma list ("two goats and a parrot") |
| literal text + placeholders | `Sequence` | concatenation; `\n` → block boundaries |

**Authorities owned by the Assembler** (single locus each): Article (a/an/the/some/∅
over the realized head), Agreement (verb number/person, pluralization), Punctuation
(serial comma, conjunctions, no dangling comma), Whitespace (collapse + verbatim
exemption + newline→block), Reference (last-mentioned seam), Case (sentence-start /
`{capitalize}`).

**Implemented atoms**: `Literal`, `NounPhrase`, `PhraseList`, `Sequence`, `Empty`,
`Verb` (ADR-199), `Verbatim` (ADR-200).

**Reserved/stub atoms (future ADRs — throw today)**:
- `Contents` → entity contents / relational placement — **ADR-194**
- `Slot` → named contribution channels — **ADR-195**
- `Optional` / `Choice` → conditional / cycling / random / stopping text — **ADR-196**
- `Pronoun` → pronoun reference, last-mentioned antecedent — **ADR-197**
- `Numeral` → number as words / ordinal — **ADR-198**
- state-derived adjectives ("an **open** box") — **ADR-193**

### The deliberate design difference vs Inform 7
I7 embeds **control flow in the text string**: `[if ...]...[otherwise]...[end if]`,
`[one of]...[or]...[cycling]`. Sharpee (ADR-192) **rejects in-string control flow** —
logic lives in code. A conditional/cycling output is a **named producer**
(`Optional`/`Choice`) the template references, and the selection logic + the
deterministic `textState` seed live in the producer/engine, not in the prose. So
several I7 "text" features are, in Sharpee, *producer* features (ADR-196) — same
output, different (and replayable/deterministic) home.

---

## The 20 samples

Each entry: **I7 source → output**, the **Sharpee equivalent** (template + the
producer-bound params), and a **status**: ✅ implemented & verified in
`i7-comparison.test.ts` / 🔜 future atom.

### Part A — Implemented today (✅ verified)

**1. Definite article** — I7 `say "[The noun] is here."` → "The cabinet is here."
Sharpee: `"{capitalize the item} is here."` with `item = nounPhraseFor(cabinet)`.
*Article authority + Case authority.*

**2. Indefinite a/an — and a Sharpee *advantage*** — I7's `[a noun]` defaults to a
**first-letter** guess (vowel → "an"), so it *mis-handles* silent-h and consonant-glides
and requires a **per-object override**: `The indefinite article of the honest lawyer is
"an". The indefinite article of the university is "a".` → "an honest lawyer outside a
university." Sharpee: `"You see {a item}."` — the Assembler's article authority agrees
a/an over the **rendered head** automatically (vowel sound, silent-h "hour/honest/heir",
glide "uni-/one-"), so "an owl", "an hour", "a university" need **no per-object data**.
*Verified: §02 of the test.*

**3. Capitalized sentence-start indefinite** — I7 `say "[A noun] blocks the way."` →
"An ogre blocks the way." Sharpee: `"{capitalize a item} blocks the way."`.

**4. Mass noun** — I7 a thing "water" with indefinite article "some" → "some water".
Sharpee: `"There is {some stuff} here."` with `stuff.number = 'mass'`.

**5. Proper noun, no article** — I7 prints a proper-named thing bare → "Aragorn smiles."
Sharpee: `nounPhraseFor` sets `properName`, `articleType:'none'` → "Aragorn smiles."

**6. List with grouping + Oxford comma** — I7 `say "You can see [a list of things in
the location] here."` → "You can see two goats and a parrot here." Sharpee: the report
layer binds a `PhraseList` of `NounPhrase`s; template is `"You can see {items} here."`.
*Punctuation + Agreement authorities: identical items group & count-spell, serial comma.*

**7. Serial-comma toggle** — I7 `Use the serial comma.` Sharpee: a **locale setting**
(`LocaleSettings.serialComma`) the Assembler reads, not a per-template directive.

**8. Subject-verb agreement is/are** — I7 adaptive `say "[The noun] [regarding the
noun][are] locked."` → "The door is locked." / "The gates are locked." Sharpee:
`"{capitalize the x} {verb:is x} locked."` — the `Verb` atom (ADR-199) agrees number with
the realized subject `x`. *Sharpee's `{verb:is x}` carries its own subject reference, so
there is no separate `[regarding …]` step.*

**9. Coordinated subject → plural verb** — I7 `say "[The troll] and [the goats][regarding
the troll and the goats][are] blocking the bridge."` → "The troll and the goats **are**
blocking the bridge." Sharpee: the subject param is a `PhraseList` → `{verb:is subj}` reads
plural off it. *Falls out of subject-number resolution for free — no `[regarding]`.*

**10. Second-person player verb** — I7 second-person narrative `say "[We] [are]
carrying too much."` → "you are…". Sharpee: `{verb:is actor}` where `actor` is the
player; `RenderContext.narrative` ⇒ 2nd person ⇒ plural form "are" (ADR-199 §4 B). (The
subject pronoun "you" is supplied by the perspective layer.)

**11. have/has agreement** — I7 `[have]` → "The box has a lid." / "The boxes have lids."
Sharpee: `{verb:has x}`.

**12. Static adjectives, article agrees over leading adjective** — I7 prints adjectives
before the noun → "a small iron chest" / "an old empty box" ("an" over "old"). Sharpee:
`NounPhrase.adjectives` from `IdentityTrait`; the article authority agrees over the head
**including** the leading adjective.

**13. Verbatim / preformatted block** — I7 `[fixed letter spacing]` banner →
preserved spacing/line breaks. Sharpee: `{verbatim:banner}` (ADR-200) — whitespace-exempt
run; newlines lift to block boundaries.

**14. Regular verb agreement** — I7 adaptive `[opens]` → "The door opens slowly." /
"The doors open slowly." Sharpee: `{verb:opens x}` (regular `-s` strip).

**15. Small-count spelling in lists** — I7 `[number of X in words]` inside a list →
"three coins". Sharpee: the list authority already spells counts 2–10 ("two goats",
"three coins"). *(The standalone `[number] in words` is the `Numeral` atom — Part B.)*

### Part B — Maps to a planned atom (🔜 future ADR)

These are the I7 features Sharpee deliberately routes through a **named producer** or
a reserved atom rather than in-string control flow.

**16. Conditional text** — I7 `say "The door is [if the door is open]open[otherwise]
closed[end if]."` Sharpee: **no in-string `if`** (ADR-192). Either the producer returns
the right phrase from code, or the future `Optional`/`Choice` atom (**ADR-196**) is a
named producer the template references: `"The door is {choice doorState}."` where
`doorState` is a producer. *Output identical; logic lives in code, deterministically.*

**17. Cycling text** — I7 `say "[one of]red[or]green[or]blue[cycling]."` Sharpee:
`Choice` (**ADR-196**) backed by the `textState` seam (per-`(entityId, messageKey)`
store) so the cycle is **deterministic and save/replay-safe** — a property I7's cycling
doesn't guarantee across undo.

**18. Random / stopping text** — I7 `[one of]…[at random]` and `[one of]first[or]
again[stopping]`. Sharpee: `Choice` with a **seeded** selector / the `textState` store
(**ADR-196**). Determinism is the explicit win (ADR-192 §7).

**19. Number in words / ordinal** — I7 `say "[the number of coins in words] coins"` →
"seven coins". Sharpee: the `Numeral` atom (**ADR-198**) — `{number:coins words}`. The
spelling logic (`countWord`) already exists in the Assembler for list counts; ADR-198
exposes it as an atom.

**20. Pronoun reference** — I7 `say "[The noun] is heavy. [It] weighs a ton."` →
tracks the antecedent → "it"/"them"/gendered. Sharpee: the `Pronoun` atom (**ADR-197**)
consuming the **`reference` seam** (last-mentioned tracking) that the Assembler already
feeds (`NounPhrase.referableId` → `ctx.reference.note`). `pronounSet` on `NounPhrase`
carries gender/neopronoun. `{pronoun:it}` resolves to the last-mentioned referent.

**Bonus — Possessive** — I7 `"[The noun]'s lid"` → "the troll's axe". Sharpee: not yet
designed — candidate `NounPhrase` extension (`possessiveOf`) or a small atom; noted for a
future ADR.

**Bonus — State-derived adjective** — I7 `The printed name of the strongbox is "[if
open]open [otherwise]closed [end if]wooden box".` → "an open wooden box" / "a closed
wooden box" (the article recomputes a/an *after* the dynamic adjective). Sharpee static
adjectives are done (#12); the **state-derived** contributor ("open" from `OpenableTrait`)
is **ADR-193** — and because Sharpee's article authority always agrees over the *realized*
head, the a/an recomputation is automatic once the adjective is contributed.

### Part C — A genuine design difference (not a planned atom)

**Adaptive verb TENSE** — I7 `say "[We] [open] the oak door and [step] through."` renders
"You open … and step through." in present tense and "You opened … and stepped through."
after `now the story tense is the past tense` — every bracketed verb conjugates to the
live story tense (incl. irregulars "go"→"went"). **Sharpee does not do tense adaptation**:
`{verb:lemma x}` agrees number/person only; the author writes the surface tense they want
(ADR-199 §Scope explicitly excludes tense/aspect). This is a deliberate scope choice, not
a missing atom — IF in practice is overwhelmingly present-tense second-person, and a
tense-adaptive verb is an additive future option if a real need appears.

---

## Findings

1. **The foundational text machinery matches — and in one place beats — I7 today.**
   Articles (a/an, mass, proper), capitalization, grouped/pluralized/serial-comma lists,
   subject-verb agreement (incl. coordinated subjects and 2nd-person), regular & irregular
   verbs, and verbatim/preformatted blocks all render correctly — 15/15 verified.
   **Beats**: a/an agreement is *automatic* over the rendered head (silent-h, glides),
   where I7 falls back to a first-letter guess that needs a per-object
   `indefinite article` override.

2. **The phrase algebra is at least as expressive as I7 for these, with two structural
   advantages**: (a) each cross-cutting concern (article, agreement, punctuation,
   whitespace, case) has **one owner** (the Assembler authority), so they compose without
   the per-substitution seams I7's `say` phrases hit; (b) it is **language-neutral** — a
   second locale is a second Assembler over unchanged trees.

3. **The deliberate divergence is control flow.** I7 embeds `[if]` / `[one of]…[cycling]`
   / `[at random]` **in the prose**. Sharpee forbids that (ADR-192): these become **named
   producers** (`Optional`/`Choice`, ADR-196) with a **deterministic `textState` seed**, so
   cycling/random/stopping survive save/undo/replay byte-identically — something I7's
   stateful text substitutions do not guarantee.

4. **The roadmap is exactly the gap.** Every I7 feature not yet matched maps 1:1 to a
   reserved atom whose seam already exists in the core: `Numeral`→ADR-198 (countWord
   exists), `Pronoun`→ADR-197 (reference seam wired), `Choice/Optional`→ADR-196 (textState
   seam wired), state-derived adjectives→ADR-193, `Contents`→ADR-194, `Slot`→ADR-195. The
   atoms are additive — a new union member + one Assembler case each.

**Conclusion**: the ADR-192 cutover delivers parity with I7's *foundational* text engine
(and a/an it handles *better*), a cleaner, deterministic basis for its *advanced*
(stateful/conditional) features which land additively as ADR-193–198, and one deliberate
non-goal (tense adaptation). The phrase-algebra atom roadmap is, in effect, "the rest of
the Inform text engine, made language-neutral and deterministic."

---

## Inform 7 sources (Writing with Inform, 10.x)

- §5.5–5.8 — articles, lists, text with random alternatives:
  https://ganelson.github.io/inform-website/book/WI_5_7.html
- §14.1 — tense & narrative viewpoint:
  https://ganelson.github.io/inform-website/book/WI_14_1.html
- §14.3 — adapting verbs:
  https://ganelson.github.io/inform-website/book/WI_14_3.html
- §14.4 — adapting text about the player (`[We]`/`[us]`/`[our]`):
  https://ganelson.github.io/inform-website/book/WI_14_4.html
- §14.6 — `[regarding …]` and adapting verbs to other subjects:
  https://ganelson.github.io/inform-website/book/WI_14_6.html

I7 syntax cross-checked against these via a research pass (2026-06-27); the Sharpee
equivalents for Part A are verified executably in
`packages/lang-en-us/tests/i7-comparison.test.ts` (15/15).
