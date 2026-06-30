# Author Guide — Custom Dynamic Messages (Layer 2) — OUTLINE

> Draft outline, not the finished guide. Layer 2 of the documentation plan: for authors
> writing **custom messages with dynamic content**. Layer 1 (= "you usually don't need
> this") and Layer 3 (= code-bound Optional/Choice) live elsewhere.
>
> Writing rules for the eventual guide:
> - **Every example is dynamic.** Never demo a token on static text it doesn't need —
>   that's what made earlier drafts misleading. Each section shows ONE template →
>   several correct outputs.
> - **Lead each section with the failure it prevents**, not the token.
> - **Only inline tokens here.** Anything code-bound (Optional/Choice) is explicitly
>   out of scope and points to Layer 3.
> - Syntax shown is verified against `parse-phrase-template.ts` (ADR-192 §5).

---

## 0. Who this is for / when you need it

- You're writing a **custom** message (a story action, a reaction) whose text mentions
  an entity, a number, an actor, or a runtime value.
- You do **not** need this for standard verbs — stdlib messages already render correctly
  (link to Layer 1).
- The one-line promise: *reference the thing; let the renderer get the grammar right.*

## 1. The one mental shift (read this first)

- You are **not concatenating strings.** A message is a template; placeholders are
  *references* the renderer resolves with correct grammar at output time.
- Why it matters: the renderer can only fix `a`/`an`, agreement, commas, and pronouns
  if you hand it the *entity/value*, not pre-formatted text.
- The cardinal rule, stated once and repeated: **never do grammar by hand.** If you find
  yourself typing `a`/`an`, joining a list with commas, or choosing `he`/`she` — stop and
  use a token.
- Tiny "before/after of an author mistake" to anchor it (hand-rolled vs token).

## 2. Naming things — articles & capitalization

- **Failure it prevents:** `a apple`, `a umbrella`; wrong capitalization at sentence start
  for a name you don't control.
- Tokens: `{item}`, `{the item}`, `{a item}`, `{an item}`, `{some item}`,
  `{capitalize the item}`.
- Dynamic example:
  - `You found {a item}.` → "You found a hat." / "You found an umbrella."
  - `{capitalize the item} is here.` → "The umbrella is here."
- Key points:
  - Bare `{item}` = no article (the name only).
  - `a`/`an` is chosen at render time from the item — works for items added later.
  - **Capitalize at sentence start** with `{capitalize …}` (don't hand-capitalize a
    dynamic name). NOTE (verified): `capitalize` is a **NounPhrase-only** hint — it does
    not compose over `{pronoun:…}` or other `kind:` atoms, and there is **no automatic**
    sentence-start capitalization. See §4 for the pronoun consequence.
- Gotcha: pass entity params as entity values (the producer's `nounPhraseFor`/binding),
  **not** bare strings — a bare string strips the metadata articles need (ADR-158).

## 3. Numbers — digits, words, ordinals

- **Failure it prevents:** bare "42" where prose wants "forty-two"; "3 floor" vs
  "third floor".
- Token: `{number:coins}` (digits), `{number:coins words}`, `{number:floor ordinal}`.
  Formats: `digits` (default) · `words` · `ordinal`.
- Dynamic example:
  - `You count {number:coins words} coins.` → "…forty-two coins."
  - `You reach the {number:floor ordinal} floor.` → "…the third floor."
- Key point: one runtime value, format chosen by the token — no manual conversion.

## 4. Pronouns — refer back without repeating the name

- **Failure it prevents:** repeating the noun ("the cabinet … the cabinet"); guessing
  `he`/`she`/`they`/`it` for an actor you didn't write.
- Token: `{pronoun:subject|object|possessive|possessive-pronoun|reflexive}`.
- The referent is the **last-mentioned** entity — so mention the noun first, then the
  pronoun (explain the ordering rule plainly, with a 2-sentence example).
- Dynamic example:
  - `{capitalize the actor} draws {pronoun:possessive} sword.` →
    "The knight draws her sword." / "…his sword." / "…their sword."
- Key points:
  - Agrees in number AND gender, resolved at render time.
  - No antecedent → graceful neuter default ("it"), not a crash.
  - **Sentence-start capitalization (verified limitation):** the `{pronoun:case}` atom
    **cannot** be capitalized — there is no inline form and no auto-capitalization, so a
    sentence-initial `{pronoun:subject}` renders lowercase ("he"/"it"/"they"). Author
    guidance: keep `{pronoun:…}` mid-sentence; at sentence start use a NounPhrase
    (`{capitalize the actor}`) or, for the player, the perspective `{You}` (§5). (This is
    a known platform gap vs the ADR-197 prose; flagged separately.)

## 5. Verbs that agree — subject & person

- **Failure it prevents:** "The doors is locked"; "You takes the key"; text frozen to one
  grammatical person.
- **Two distinct mechanisms — call this out explicitly (verified):**
  - **Perspective layer (ADR-089) — a string PRE-PASS, runs before the phrase parser.**
    `{You}`/`{you}`, `{Your}`/`{your}`, `{Yours}`, `{Yourself}`, `{You're}`, and **bare
    verb conjugation** `{take}` / `{have}` / `{can't}`. These agree with the *narrator/
    player's* person and number; capitalization via the explicit capital variant `{You}`.
  - **Verb atom (ADR-199) — a phrase atom.** `{verb:is item}`, `{verb:has item}`,
    `{verb:opens door}` (lemma + subject param). Agrees with the *subject param's* number.
  - The confusion to defuse: `{take}` (perspective, agrees with the player) vs
    `{verb:take thing}` (atom, agrees with `thing`). Same word, different agreement source.
- Dynamic example:
  - `{capitalize the item} {verb:is item} locked.` → "The door is locked." /
    "The doors are locked."
  - `{You} {take} {the item}.` → "You take the key." (adapts to narrative person).
- Key point: write one line; agreement follows either the subject param (atom) or the
  configured narrative person (perspective) — pick the mechanism that matches the subject.

## 6. Lists — let the renderer punctuate

- **Failure it prevents:** dangling commas, missing serial "and", per-item `a`/`an`,
  plurals — every time the set changes.
- Surface: bind a **list value** to a param and reference it by name — `{items}` — OR use
  a `{slot:here}` channel that several producers contribute into.
- Dynamic example:
  - `You see {items}.` → "a brass key, an apple, and three gold coins."
  - Remove an item → "a brass key and three gold coins." (still clean, no dangling comma).
- Key point: never pre-join a list. Hand it over; the renderer owns commas + "and".
- Cross-ref: `{slot:…}` for open-ended, multi-producer lists (brief; details Layer 4).

## 7. Opaque text — `{verbatim:name}`

- **Failure it prevents:** the renderer "helpfully" reformatting text that must pass
  through untouched (a player-entered name, debug output, a raw direction).
- Token: `{verbatim:name}` — render the param's value as-is, whitespace-exempt.
- Dynamic example: `Hello, {verbatim:playerName}.` → exactly what the player typed.
- Key point: use when you explicitly do NOT want grammar applied.

## 8. Putting it together — a worked custom message

- One realistic story message that uses several tokens at once (article + verb agreement
  + pronoun), shown as: the template, the producer params it expects, and 2–3 rendered
  outputs for different entities.
- Reinforces the mental model end to end.

## 9. What's NOT here (boundaries)

- **Appearing/disappearing text and variation** (Optional / Choice) are **not inline** —
  you build them in code and bind by name. → Layer 3 (recipes).
- **Standard verb messages** already work — don't re-author them. → Layer 1.
- **Slots, seams, determinism, locale internals** → Layer 4/5.

## 10. Quick reference (cheat sheet)

- One compact table: token → what it does → tiny dynamic example.
  Rows: `{the item}` · `{a item}` · `{capitalize the item}` · `{number:n words}` ·
  `{number:n ordinal}` · `{pronoun:case}` · `{verb:lemma subject}` · person tokens
  (`{You}`/`{take}`) · `{items}` (list) · `{slot:key}` · `{verbatim:name}`.

## 11. Common mistakes (anti-patterns)

- Hand-rolling `a`/`an`, commas, or `he`/`she`. (Use the token.)
- Passing entity params as bare strings (`entity.name`) instead of entity values →
  strips article/agreement metadata (ADR-158).
- Trying to write `{optional:…}` / `{choice:…}` inline — these are rejected at parse time
  by design; build them in code (Layer 3).
- Pre-joining a list before binding it.
- Forgetting the last-mentioned ordering for pronouns (pronoun before any noun → wrong
  or neuter-default referent).
- Reassurance: **unknown tokens fail loudly at parse time**, not silently at render time.

---

## Resolved (research findings — verified against source)

1. **Pronoun sentence-start capitalization — a real gap, not a syntax to document.**
   `capitalize` is a NounPhrase-only hint (`english-assembler.ts:142`); `capitalizeSentenceStart`
   is called in exactly one place (that hint); `{capitalize pronoun:subject}` *throws* at
   parse time (prefix `"capitalize pronoun"` is not a known kind, `parse-phrase-template.ts`).
   There is no auto sentence-start capitalization. → The `{pronoun:case}` atom can't be
   capitalized; the guide states the limitation (§4). ADR-197's "compose `{capitalize}` over
   the pronoun" prose is aspirational. **Platform follow-up (not in this guide):** decide
   whether to add a capitalize path for the pronoun atom or auto-cap sentence starts.

2. **Person placeholders are a separate PRE-PASS, confirmed.** `renderMessage`
   (`language-provider.ts`) runs `resolvePerspectivePlaceholders` (ADR-089) on the raw
   string *first*, then `parsePhraseTemplate`. So `{You}`/`{take}` resolve before the phrase
   atoms; they are NOT phrase atoms. Two verb mechanisms exist (perspective `{take}` vs atom
   `{verb:…}`) — documented in §5.

3. **Verified-example home: a snippet test on `renderMessage`.** Back every guide example
   with a test that calls `languageProvider.renderMessage(template, params)` under a set
   narrative context and asserts the output — this exercises *both* the perspective pre-pass
   and the phrase parse in one hermetic check (e.g.
   `packages/lang-en-us/tests/doc-examples/author-guide.test.ts`). Keeps the doc honest and
   rot-proof. (A couple of true e2e cases can also live as a friendly-zoo transcript.)
