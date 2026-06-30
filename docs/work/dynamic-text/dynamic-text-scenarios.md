# Dynamic Text Formatting — Scenario Inventory

**Status:** examination / pre-ADR working doc
**Date:** 2026-06-25
**Purpose:** catalog the ways a story needs to format text *dynamically* (from world
state), using **Inform 7** as the comparison baseline, record what **Sharpee** does
today with file:line evidence, and note a **recommended mitigation** for each gap. The
ADRs fall out of this examination — they are sketched at the end, not decided here.

---

## Framing: the post-turn-assembly question

A recurring critique of Sharpee's **post-turn text assembly** (actions emit
events → a report service assembles text after the turn from message IDs + params +
the formatter chain) is that it can't do what Inform 7's inline text substitutions do
— e.g. "There is **an open** cabinet on the north wall." flipping to "**a closed**
cabinet" by state.

The critique conflates two different axes:

- **Timing — *when* text is produced.** I7's substitutions (`[if open]…`,
  `[printed name]`, content listing) also run *at output time against world state*.
  I7 is *also* post-action assembly. Timing is not the differentiator.
- **Locus of logic — *where* the branching lives.** I7 embeds presentation logic
  *inline in the prose string* (a templating mini-language). Sharpee keeps logic in
  *code* (handlers / report / param-building) and keeps templates near-dumb
  (formatters only).

So the real question is **how much presentation logic should live in the text layer**,
and **what dynamic-text machinery Sharpee has plumbed** — not "post-turn vs inline."
The report layer has full world-state access and can, in principle, do everything I7
does. Every gap below is *unbuilt plumbing*, not an architectural ceiling.

### How to read each scenario

- **Invariant** — the property the rendered output must always satisfy (this becomes
  the ADR acceptance criterion / test).
- **Want** — a concrete desired output.
- **Inform 7** — how I7 expresses it.
- **Sharpee today** — ✓ covered / ◐ partial / ✗ gap, with file:line.
- **Mitigation** — the smallest change that closes it, and which proposed ADR it feeds.

---

## A. Article & noun-phrase agreement

### S1. Indefinite article agreement (a / an) over the *rendered* phrase ✓
- **Invariant:** the indefinite article agrees with the first sounded letter of the
  fully-rendered noun phrase, not the bare noun.
- **Want:** "an owl", "a goat", "an hour".
- **I7:** `[a noun]` / printed name; a/an chosen from the actual text.
- **Sharpee:** ✓ `{a:item}` chooses a/an by the following word (lang-en-us `article.ts`;
  ADR-190 §article). Works for static names.
- **Mitigation:** none — but see S5: it must agree over *derived adjectives* too.

### S2. Definite / mass / proper / plural articles ✓
- **Invariant:** article is governed by the entity's noun type (common→the/a, proper→∅,
  mass→some, plural→∅/these).
- **Want:** "the cabinet", "some water", "Alice" (no article), "scissors".
- **I7:** printed name + indefinite/definite article machinery.
- **Sharpee:** ✓ `{the:}`, `{some}` (`article.ts`); driven by `IdentityTrait.nounType` /
  `properName` via `entityInfoFrom()` (stdlib `utils/entity-info.ts`).

### S3. Sentence-start capitalization ✓
- **Invariant:** a noun phrase opening a sentence is capitalized regardless of the
  entity's stored casing.
- **Sharpee:** ✓ `{cap:the:item}` (lang-en-us `text.ts`).

---

## B. State-derived adjectives & dynamic names  ← **the core gap**

### S5. Single state adjective woven into the noun phrase ✗
- **Invariant:** an object's *salient state* renders as an adjective inside its noun
  phrase, and the article (S1) agrees with that adjective.
- **Want:** "an **open** cabinet" / "a **closed** cabinet"; "a **locked** door".
- **I7:** the object's printed name adapts, or `[if open]open [end if]cabinet`, and
  the article rule sees the whole phrase.
- **Sharpee:** ✗ `IdentityTrait.adjectives` exists but is **static and never reaches
  `EntityInfo` or the formatters** (`identityTrait.ts:81`; `EntityInfo` has no
  `adjectives` field — lang-en-us `formatters/types.ts:29`). State only drives the
  *whole description string* via the `IFEntity.description` getter
  (`if-entity.ts:686`), not a composable adjective. To get "an open cabinet" the author
  hardcodes **two full sentences** in `openDescription`/`closedDescription`
  (e.g. Dungeo `house-interior.ts` trap door).
- **Mitigation → ADR-A:** add `EntityInfo.adjectives`; let traits contribute
  state-derived adjectives at report time (OpenableTrait→open/closed,
  LockableTrait→locked, LightSourceTrait→lit, SwitchableTrait→on/off); have the
  `a`/`an`/`the`/`list` formatters render adjectives ahead of the noun and agree the
  article over the full phrase. "an open cabinet" then falls out with no per-sentence code.

### S6. Multiple / ordered adjectives ✗
- **Invariant:** stacked adjectives render in a stable, readable order ("a small locked
  iron chest"), with article agreement over the leading one.
- **I7:** adjective ordering via printed name / rules.
- **Sharpee:** ✗ no adjective composition at all (extends S5). Needs an ordering policy
  (opinion → size → state → material → noun, or author-declared order).
- **Mitigation → ADR-A** (ordering rule + per-trait adjective priority).

### S7. Dynamic printed name (the *noun* changes, not just adjectives) ✗
- **Invariant:** an entity's rendered name may be computed from state.
- **Want:** "the troll" → "the **dead** troll" / "the **glowing** orb"; a disguised NPC
  shown as "a hooded figure" until revealed.
- **I7:** `[printed name of X]`, "now the printed name of X is …".
- **Sharpee:** ✗ `IdentityTrait.name` is a static string; the computed getter is only
  for `description`, not `name` (`if-entity.ts:686`). No name hook.
- **Mitigation → ADR-A:** a computed-name hook (trait/behavior method consulted by
  `entityInfoFrom()` at report time) returning name + adjectives; must still feed the
  formatter chain (article/case/list), not bypass it.

### S8. Adjective *salience* policy ✗ (design nuance)
- **Invariant:** status adjectives appear only when the author deems them notable
  (show "open", hide "closed" if closed is the default; always show "lit").
- **I7:** author chooses per object.
- **Sharpee:** ✗ no concept yet (rides on S5). Per-trait/per-entity "show-when" flag.
- **Mitigation → ADR-A.**

---

## C. Conditional text  ← **the design-tension gap**

### S9. Inline if / else by state ✗
- **Invariant:** a clause's wording varies by a read-only state predicate, in one
  template, without splitting message IDs.
- **Want:** "The door is {open?open:closed}." ; "You see a chest{open?, lid flung wide:}."
- **I7:** `[if open]…[else]…[end if]`, `[unless]`.
- **Sharpee:** ✗ no in-template conditional — *all* branching is forced to the code
  layer (the action picks a different `messageId`, e.g. examining builds
  `container_contents` vs `surface_contents` in `examining-data.ts`). Clean separation,
  but heavy for fine-grained prose variation.
- **Mitigation → ADR-B:** a scoped conditional formatter `{if:<pred>?…:…}` reading
  *read-only* state predicates exposed to the template context. This deliberately moves
  some logic into the text layer — the central design call of ADR-B. Alternative:
  keep at code layer and instead make per-state messages cheaper (status quo).

### S10. Conditional whole-clause / list inclusion ✗
- **Invariant:** optional clauses appear/disappear by state without leaving stray
  punctuation or whitespace.
- **Sharpee:** ✗ (extends S9); punctuation-safety is its own invariant/test.
- **Mitigation → ADR-B.**

---

## D. Variation: alternating / cycling / once-only  ← needs persistent text state

### S12. Random alternation (flavor) ✗
- **Invariant:** repeated triggers of the same message vary their wording; selection is
  deterministic under save/restore and replay.
- **Want:** varied refusals ("You can't go that way." / "There's no exit there." / …);
  idle NPC lines.
- **I7:** `[one of]A[or]B[at random]`.
- **Sharpee:** ✗ none (no `one of`/random text selection anywhere). **Determinism caveat:**
  Sharpee scenes/saves must replay identically, so variation RNG must be seeded from
  deterministic state, not `Math.random()`.
- **Mitigation → ADR-B:** a `{one-of:…}` variation construct with a seeded selector.

### S13. Cycling / in-order / stopping / sticky ✗
- **Invariant:** sequential variants advance per trigger and the position **persists per
  (entity, message-key) across turns and saves**.
- **I7:** `[cycling]`, `[stopping]`, `[sticky]`, `[first time]…[only]`.
- **Sharpee:** ✗ no per-(entity,key) message state exists. Partial precedents:
  `RoomTrait.visited` (`roomTrait.ts:112`) and `ReadableTrait.hasBeenRead`
  (`readableBehavior.ts:35`, emits `firstTime:true`) track *one* boolean each, ad hoc.
- **Mitigation → ADR-B:** a small persistent **text-state store** keyed by
  (entityId, messageKey) holding a counter; saved with the world. This is the load-bearing
  new state for all of section D.

### S14. First-time vs subsequent / once-only text ◐
- **Invariant:** first occurrence may differ from later ones (room intro vs revisit).
- **I7:** `[first time]…[only]`; "the description, the first time".
- **Sharpee:** ◐ data exists, **not wired**: `RoomTrait.initialDescription` is stored but
  never auto-rendered by visited state, and looking has a `// first visit hardcoded true`
  TODO (`looking-data.ts:103`). **→ latent bug, see "Surfaced issues".**
- **Mitigation → ADR-B** (general mechanism) + a near-term fix to wire room first-visit.

---

## E. Lists, counts & contents enumeration

### S16. Natural-language list with articles + grouping ✓
- **Invariant:** a set renders as "a X, a Y, and a Z" with identical commons grouped and
  pluralized, author-configurable serial comma.
- **Sharpee:** ✓ `{list:items}` / `{the-list:}` / `{names:}` (lang-en-us `list.ts`;
  ADR-190). Requires `EntityInfo[]` (ADR-158).

### S17. Or-list ✓ / S18. Count + pluralization ✓
- **Sharpee:** ✓ `{or-list:}` ("north, south, or east"); `{count:}` ("three coins" /
  "one coin" / "nothing"), spelled 2–10 then numeric (`list.ts:178`).

### S19. List the contents of an *arbitrary* container/supporter in any sentence ◐
- **Invariant:** any open container's/supporter's direct contents can be enumerated in
  prose, with the correct preposition ("in"/"on").
- **Want:** "In the box you can see a key and a coin." / "On the shelf is a lantern."
- **I7:** `[a list of things in the box]`, `[the list of …]` — usable anywhere.
- **Sharpee:** ◐ exists but **special-cased per action** (examining
  `examining-data.ts:216`; looking `looking-data.ts:188`), not a reusable producer; an
  author writing a custom action re-implements it.
- **Mitigation → ADR-C:** extract a reusable contents-listing producer/formatter
  (`{contents:entity}`) emitting `EntityInfo[]` + preposition.

### S20. Nested / recursive contents ✗
- **Invariant:** containers within containers render to a chosen depth ("a box (in which
  is a ring)").
- **Sharpee:** ✗ only direct contents (no recursion) — `examining-data.ts`.
- **Mitigation → ADR-C** (depth-bounded recursion).

### S21. List items *with* their state adjectives ✗
- **Want:** "an open cabinet and a locked drawer" in one room listing.
- **Sharpee:** ✗ depends on S5 (adjectives) feeding S16 (list). Both needed.
- **Mitigation → ADR-A feeds ADR-C.**

---

## F. Pronouns & adaptive reference

### S23. Narrative-perspective pronouns (you / I / they-narrator) ✓ (actors)
- **Invariant:** narration adapts to the viewpoint character's person/pronouns.
- **Sharpee:** ✓ for actors: `ActorTrait.pronouns` (full sets incl. neopronouns +
  grammatical gender — `actorTrait.ts:10`) and a perspective resolver
  (`lang-en-us/perspective/placeholder-resolver.ts`) renders `{You}`/`{Your}` etc.

### S24. Output object pronouns ("you take **it** / them") ✗
- **Invariant:** a recently-referenced object renders as the correct object pronoun in
  output, agreeing in number/gender.
- **Want:** "You open the cabinet. You take **it**." ; "…take **them**."
- **I7:** `[the noun]`/`[it]`/`[them]`; pronoun bookkeeping.
- **Sharpee:** ✗ **output** object pronouns absent. The parser resolves *input* "it/them"
  (`parser-en-us/pronoun-context.ts:150`), and inanimate entities carry
  `grammaticalNumber` (`identityTrait.ts:69`) but no output `{it}`/`{them}` substitution.
- **Mitigation → ADR-D:** extend the perspective/placeholder resolver to objects with an
  output pronoun context (last-mentioned tracking), reusing the existing pronoun data.

### S25. Gendered object/animal pronouns ◐
- **Invariant:** non-player animates render he/she/they consistently in output.
- **Sharpee:** ◐ data exists on `ActorTrait`; output wiring is the same gap as S24.
- **Mitigation → ADR-D.**

---

## G. Verb agreement & viewpoint/tense

### S27. Subject–verb number agreement ✓
- **Invariant:** verb number agrees with subject ("the goat **is**" / "the goats **are**").
- **Sharpee:** ✓ `{is:}`/`{was:}`/`{has:}` (lang-en-us `verb.ts`).

### S28. General verb conjugation / adaptive person & tense ✗
- **Invariant:** arbitrary verbs conjugate to the narration's person and tense.
- **Want:** "you take / he takes"; past-tense story mode "you took".
- **I7:** adaptive text "[We] [take]" across person + tense.
- **Sharpee:** ✗ only is/was/has. Likely **low priority** (Sharpee is 2nd-person present
  by default), flag as future.
- **Mitigation:** a verb-conjugation formatter; defer unless multi-tense narration is a goal.

---

## H. Numbers

### S30. Numbers in words / ordinals ◐
- **Invariant:** numeric quantities can render as words and ordinals where prose expects them.
- **Want:** "fifteen coins", "the third attempt".
- **Sharpee:** ◐ `{count:}` spells 2–10 then digits (`list.ts:178`); no standalone
  number-to-words for arbitrary integers, no ordinals.
- **Mitigation → small formatter ADR** (or fold into ADR-A's formatter work): `{words:n}`,
  `{ordinal:n}`.

---

## I. Spatial / relational placement

### S32. Relation-driven placement phrases ◐
- **Invariant:** an object's location renders from its containment/support relation
  ("on the table", "in the cabinet", "on the north wall") rather than hardcoded prose.
- **I7:** prepositions generated from relations during listing.
- **Sharpee:** ◐ only "in/on" for container/supporter *contents* messages
  (`lang-en-us/actions/looking.ts:25`); walls have per-side support via ADR-173
  (`examining-data.ts:60`). General "on the north wall" for arbitrary scenery is
  **hardcoded by the author** in the description string.
- **Mitigation → ADR-C:** a relation→preposition phrase producer usable in listings and
  descriptions; optional author-declared placement on scenery.

---

## J. Whitespace, layout & verbatim output

### S34. Line/paragraph breaks ✓ / S35. Indent / center / right ✓
- **Sharpee:** ✓ `\n` (tight line), `\n\n` (paragraph), `[br]`, `[p]`
  (`assemble.ts:74`); `[indent=N:]`, `[center=N:]`, `[right:]` (ADR-183).

### S36. Preformatted / monospace / verbatim block (ASCII art, maps, tables) ✗
- **Invariant:** a block can preserve exact whitespace and use a monospace grid for
  alignment (title banners, maps, score tables, aligned columns).
- **I7:** fixed-letter spacing / table output; box quotations.
- **Sharpee:** ✗ only inline `[code:]`; **no block `<pre>` equivalent**, and ADR-183's
  deferred whitespace-collapse would actively break literal-whitespace tricks.
- **Mitigation → ADR-E:** a `[pre:…]` / verbatim block decoration with a
  whitespace-preservation contract, rendered as a monospace block (HTML `<pre>`-class
  span / terminal passthrough), explicitly exempt from collapse.

### S37. Exact vertical spacing / forced blank lines ◐
- **Sharpee:** ◐ paragraph gaps are CSS-driven; no "emit N blank lines".
- **Mitigation → ADR-E** (a spacer macro) or accept CSS-only.

---

## K. Compositional / appendable output

### S-append. Open-ended sentence with dynamic appends (deferred close / extend) ✗
- **Invariant:** an author-declared output may carry an open **append slot**; **zero**
  contributions leave the stem + terminator clean ("A cabinet."), and **N** contributions
  join under one punctuation rule (serial commas + final "and") regardless of count,
  order, or source; ordering is deterministic for save/replay; the **slot owns the
  lead-in/connective grammar**, not the contributor.
- **Want:** from one template line —
  "A cabinet." / "A cabinet, which is open." / "A cabinet, which is open, containing a
  brass key and a coin, and glowing faintly." — where the appended clauses are
  contributed dynamically by traits, behaviors, daemons, or NPCs that the author did not
  enumerate.
- **Inform 7 / legacy:** *streaming* print — print the stem, then imperative code decides
  to emit "." (close) or ", revealing …" (extend); every contributor must know whether it
  is first/last to get the commas and "and" right (fragile, order-dependent).
- **Sharpee:** ✗ no append/contribution model. Each message becomes an independent block
  (`assemble.ts`); there is no named slot a *second* contributor can add to before the
  turn's text finalizes. Today this is forced to the code layer — the action pre-computes
  the whole sentence and selects a messageId, so an independent daemon / NPC behavior /
  scent trait cannot tack a clause onto another action's sentence.
- **Distinction:** the *single, author-known* optional append is already covered by
  ADR-B `{?…}` wrapping an ADR-C producer (terminator outside the slot). S-append is the
  *open / multi-contributor* case where the author knows a slot exists but not what fills it.
- **Mitigation → ADR-F:** named append slots (`{+key}`) + a per-turn contribution channel
  + **central** punctuation reconciliation. Leans on the channel model (ADR-163): a slot
  is a small composition target that stays open until the turn's text finalizes.

---

## L. Dialogue & speech emission  ← **the cross-cutting composition gap**

NPC speech is not a *new* primitive — it **composes** the atoms above (pronouns F,
verb agreement G, variation D, conditional C, case A). But it composes them in a
distinct shape — *someone says something* — and that shape exposes invariants the
description scenarios never hit, because description rarely starts a sentence with a
pronoun, embeds a quoted sentence, or conjugates an arbitrary speech verb. These were
never enumerated, which is how the pronoun-capitalization gap reached "aspirational
prose in ADR-197" instead of an acceptance criterion. The stdlib `talking` action
(`lang-en-us/actions/talking.ts`) is the live reference: it shows what authors do today
(hardcode literal `says, "…"`) and where the seams are.

### S39. Speech attribution / dialogue tag ◐
- **Invariant:** the attributive verb of a dialogue tag agrees in number/person with
  the speaker ("the guard **says**" / "the guards **say**" / "you **say**"), and the
  speaker's name/reference is rendered through the normal article+case chain.
- **Want:** "The merchant says, …" ; "The twins say, …" ; "You say, …".
- **I7:** "[The speaker] [say]" — adaptive speech verb across person/number.
- **Sharpee:** ◐ the machinery exists but the dialogue templates don't use it. The
  `Verb` atom (ADR-199) conjugates an arbitrary lemma to the subject's number/person
  (`{verb:says target}` → "say" for a plural speaker via `regularPluralVerb`,
  english-assembler.ts:162–218). But the standard templates **hardcode the literal
  "says"** (`talking.ts:34–40`), which is only correct for a 3rd-singular speaker —
  a plural or 2nd-person speaker reads wrong. **Tense** is not adaptive (no past-tense
  "said" — that's S28, deferred).
- **Mitigation:** swap the literal speech verbs in the dialogue catalog for
  `{verb:<lemma> <speaker>}` (uses ADR-199; no platform change). Past-tense narration
  stays folded into S28.

### S40. Sentence-initial pronoun capitalization ✗  ← **the flagged gap**
- **Invariant:** a sentence (or quoted sentence) that *begins* with a pronoun
  capitalizes it — "**He** says…", "**They** reply…", "'**She**'ll know,' he adds."
- **Want:** "The guard turns. **He** says, …" rather than "…turns. he says, …".
- **I7:** sentence casing is automatic; `[They]` capitalizes.
- **Sharpee:** ✗ `{capitalize …}` is a **NounPhrase-only** hint (english-assembler.ts:141–142);
  the `Pronoun` atom has no capitalize path (`renderPronoun` returns the bare table form,
  english-assembler.ts:396–402) and `{capitalize pronoun:subject}` throws; there is **no
  auto sentence-start capitalization** (`capitalizeSentenceStart` is invoked *only* by the
  `np.capitalize` hint at :142, never at block/sentence start). Dialogue is where this
  bites hardest because so many narrated sentences open with a pronoun. This is the
  "aspirational" note in ADR-197 and the cap-gap follow-up from session 2026-06-29.
- **Mitigation → ADR-G:** either (a) honor `capitalize` on the `Pronoun` atom (carry the
  flag, apply `capitalizeSentenceStart` in `renderPronoun`), or (b) auto-capitalize the
  first alphabetic glyph of each rendered sentence/quoted clause. (a) is the smaller,
  more predictable change and matches the existing per-atom case authority.

### S41. Speaker / addressee pronoun reference ◐
- **Invariant:** within and across dialogue, the speaker and the addressed player render
  as the correct **case** pronoun — subject vs object vs possessive — agreeing in
  number/gender ("**she** tells **you**", "you ask **him**", "it was **his** idea").
- **Want:** "You ask the guard about the bridge. **He** shrugs. You press **him**."
- **I7:** pronoun bookkeeping + `[the noun]`/`[him]`.
- **Sharpee:** ◐ the `{pronoun:case}` atom (ADR-197) resolves the **last-mentioned**
  referent in any case (subject/object/possessive/reflexive — `PRONOUNS` table +
  `noteReference`/`lastMentioned`, english-assembler.ts:368–402) and the player viewpoint
  is handled by the perspective resolver (`{you}`, S23). Gaps: (1) last-mentioned is
  per-render-block, so cross-line/cross-turn antecedents are not yet tracked; (2) general
  **output object pronouns** for arbitrary objects remain the S24/S25 gap; (3) a
  sentence-initial reference still hits S40.
- **Mitigation → ADR-D** (output object/gender pronouns) + ADR-G for the cross-line
  last-mentioned scope; data already exists on `ActorTrait.pronouns` (actorTrait.ts:10).

### S42. Quote punctuation & the embedded quoted sentence ✗
- **Invariant:** a quoted utterance composes with its tag under one punctuation rule —
  comma before an opening quote in a leading tag, terminal punctuation **inside** the
  closing quote, the first quoted word capitalized, and no doubled/again-stripped marks
  when the utterance itself is dynamic.
- **Want:** from one template + a dynamic utterance param: `She says, "The bridge is
  out."` / `"The bridge is out," she says.` / `"Is it?" he asks.` — correct commas and
  capital regardless of which utterance string is bound.
- **I7:** quotation handling / smart casing inside say-text.
- **Sharpee:** ✗ no quote machinery. Quotes, the attaching comma, and the inner capital
  are **literal characters the author types** (`talking.ts:34` — `says, \"Hello
  there!\"`). Fine for a fixed line; brittle the moment the utterance is a bound param,
  a `Choice` variant, or an `Optional` (the author must hand-manage the comma/cap/period
  across every branch).
- **Mitigation → ADR-G:** a `{quote:<utterance>}` (or tag-aware speech) producer that
  owns the surrounding comma, the inner sentence-cap, and terminal-punctuation-inside —
  the dialogue analogue of how the list formatter owns serial commas.

### S43. Direct vs reported (indirect) speech ✗
- **Invariant:** the same semantic utterance can render as **direct** ("'The gate is
  locked,' she says.") or **reported** ("She tells you that the gate is locked."), and
  the reported form shifts pronouns/tense/deixis correctly.
- **I7:** authored separately; no automatic transform.
- **Sharpee:** ✗ no machinery; an author writes each form as its own message. The
  pronoun/tense shifting a true transform needs is out of scope today (tense ⇒ S28).
- **Mitigation:** **defer** (note in ADR-G as out-of-scope); revisit only if multi-tense
  narration (S28) is taken on.

### S44. State- / topic-conditional dialogue lines ◐
- **Invariant:** which line an NPC emits varies by conversation state (have we met?
  is this topic known/exhausted?) without exploding into hand-selected message IDs for
  every combination.
- **Want:** greet warmly if met before; offer a topic only while it's undiscussed.
- **I7:** `[if]…[end if]` against world/relationship state, inline in the say-text.
- **Sharpee:** ◐ branching lives in **code** today — the action picks the messageId
  (`talking.ts` carries `first_meeting` / `greets_again` / `remembers_you` /
  `nothing_to_say` variants; conversation state per ADR-018 / ADR-142). Inline
  conditional prose is the S9 gap (ADR-B); fine-grained variation is now also
  expressible with the ADR-196 `Optional`/`Choice` atoms keyed by `(speakerId, key)`.
- **Mitigation → ADR-B** (inline conditional) for in-template branching; otherwise the
  code-layer selection is idiomatic and already works.

### S45. First-time vs repeated dialogue (greet-once, then vary) ◐→✓
- **Invariant:** an NPC's line differs on first contact, then advances/cycles/sticks on
  repeat, **persisting per (speaker, message-key) across turns and saves**.
- **Want:** first "Hello, stranger." → then cycle "What now?" / "Yes?" / "Still here?".
- **I7:** `[first time]…[only]`, `[cycling]`.
- **Sharpee:** ◐→✓ previously ad-hoc booleans; **now buildable** with the ADR-196
  `Choice` atom (`firstTime`/`cycling`/`sticky` selectors) over the persistent
  text-state store keyed by `(speakerId, messageKey)`. This is S13/S14 realized for the
  dialogue case — worth an explicit dialogue example so authors don't re-invent it.
- **Mitigation:** none new — document the pattern (author guide); the platform piece
  shipped with ADR-196.

### S46. Name-then-pronoun alternation (anti-repetition) ◐
- **Invariant:** the first reference to a speaker in a passage uses the name; subsequent
  references switch to a pronoun, to avoid "The guard… the guard… the guard…".
- **Want:** "The guard scowls. **He** says, … Then **he** turns away."
- **Sharpee:** ◐ `{the speaker}` then `{pronoun:subject}` composes via the last-mentioned
  `note()` (ADR-197, english-assembler.ts:360–402), but only within one render block
  (see S41 scope gap), and a sentence-initial pronoun still needs S40.
- **Mitigation → S40 + S41** (no separate work once those land).

---

## Summary matrix

| ID | Scenario | Status | Mitigation → ADR |
|----|----------|--------|------------------|
| S1–S3 | Article/case agreement | ✓ | — |
| S5 | State adjective in noun phrase ("open cabinet") | ✗ | **ADR-A** |
| S6 | Ordered multiple adjectives | ✗ | ADR-A |
| S7 | Dynamic printed name | ✗ | ADR-A |
| S8 | Adjective salience policy | ✗ | ADR-A |
| S9–S10 | Inline conditional text | ✗ | **ADR-B** |
| S12 | Random alternation | ✗ | ADR-B |
| S13 | Cycling / persistent text state | ✗ | ADR-B |
| S14 | First-time / once-only | ◐ (half-wired) | ADR-B + bugfix |
| S16–S18 | Lists / count | ✓ | — |
| S19 | Reusable contents listing | ◐ | **ADR-C** |
| S20 | Nested contents | ✗ | ADR-C |
| S21 | List items with state adjectives | ✗ | ADR-A → ADR-C |
| S23 | Perspective pronouns (actors) | ✓ | — |
| S24–S25 | Output object/gender pronouns | ✗/◐ | **ADR-D** |
| S27 | Verb number agreement | ✓ | — |
| S28 | Adaptive person/tense | ✗ | defer |
| S30 | Numbers-in-words / ordinals | ◐ | small formatter |
| S32 | Relational placement phrases | ◐ | ADR-C |
| S34–S35 | Breaks / indent / center | ✓ | — |
| S36–S37 | Verbatim / preformatted block | ✗ | **ADR-E** |
| S-append | Compositional / appendable output (deferred close) | ✗ | **ADR-F** |
| S39 | Speech-attribution verb agreement | ◐ (atom exists, templates hardcode) | **ADR-G** (use ADR-199) |
| S40 | Sentence-initial pronoun capitalization | ✗ | **ADR-G** |
| S41 | Speaker/addressee pronoun reference | ◐ | ADR-G + ADR-D |
| S42 | Quote punctuation / embedded quoted sentence | ✗ | **ADR-G** |
| S43 | Direct vs reported speech | ✗ | defer (ADR-G note) |
| S44 | State/topic-conditional dialogue | ◐ (code-layer) | ADR-B |
| S45 | First-time / cycling dialogue | ◐→✓ (ADR-196) | document only |
| S46 | Name-then-pronoun alternation | ◐ | S40 + S41 |

---

## Proposed ADRs (these fall out of the matrix)

- **ADR-A — Computed adjectives & dynamic printed names.** `EntityInfo.adjectives`;
  trait-contributed, state-derived adjectives; computed-name hook; adjective ordering &
  salience; article agreement over the full phrase. *Highest leverage, lowest
  controversy — fits the architecture (logic stays in the report layer, templates stay
  dumb). Directly answers "an open cabinet."* Closes S5–S8, S21; strengthens S1.
- **ADR-B — In-template conditional & variation + persistent text state.** Scoped
  `{if:pred?…:…}`, `{one-of:…}` with seeded/persistent selectors, a per-(entity,key)
  text-state store saved with the world. *The deliberate design call — it moves some
  presentation logic into the text layer; needs explicit sign-off on how far.* Closes
  S9–S14.
- **ADR-C — Reusable contents listing & relational placement.** A `{contents:entity}`
  producer (depth-bounded) + relation→preposition phrasing. Closes S19–S20, S32; pairs
  with ADR-A for S21.
- **ADR-D — Output object & gendered pronouns.** Extend the existing perspective/pronoun
  resolver to objects with a last-mentioned context. Closes S24–S25 (data already
  exists on `ActorTrait`).
- **ADR-E — Verbatim / preformatted block.** A `[pre:…]` block + whitespace-preservation
  contract, exempt from the deferred collapse. Closes S36–S37.
- **ADR-F — Appendable / compositional output.** Named append slots (`{+key}`), a per-turn
  contribution channel, and central punctuation reconciliation. Closes S-append. Reuses
  ADR-C producers and ADR-A decoration/adjectives as contributions; sits on the ADR-163
  channel model. *Load-bearing decision: does a contributor supply bare clause content
  (slot owns lead-in/connective) or its own connective — the former keeps punctuation
  clean.*
- **ADR-G — Dialogue & speech emission.** The composition layer for NPC speech. Net-new
  pieces: (1) **sentence-initial pronoun capitalization** — honor `capitalize` on the
  `Pronoun` atom (or auto-cap sentence/quote starts), closing the ADR-197 cap-gap (S40);
  (2) a **quote/speech-tag producer** that owns the attaching comma, the inner sentence
  capital, and terminal-punctuation-inside-the-quote across dynamic utterances (S42);
  (3) **cross-line last-mentioned scope** so name→pronoun alternation survives beyond one
  render block (S41/S46). Reuses ADR-199 for speech-verb agreement (S39 — fix the stdlib
  `talking` templates to use `{verb:…}`), ADR-D for output object pronouns, and ADR-196's
  Choice for first-time/cycling lines (S45 — document, don't rebuild). Reported speech
  (S43) is explicitly **out of scope** pending S28.
- **Minor:** number-to-words / ordinal formatters (S30); adaptive tense/person (S28) —
  defer unless multi-tense narration becomes a goal.

**Suggested order:** ADR-A first (unblocks the headline scenario and S21), then ADR-C
(reuses A's adjectives), then ADR-F (reuses C's producers as contributions), then ADR-B
(the heavy, opinion-bearing one), with ADR-D and ADR-E independent and schedulable any time.

---

## Surfaced issues (docs-as-review)

- **Room first-visit is half-wired (S14).** `RoomTrait.initialDescription` is stored but
  never auto-rendered by `visited`, and `looking-data.ts:103` hardcodes first-visit as
  `true` with a TODO. Net effect: initial-vs-revisit room descriptions don't actually
  switch. Worth a near-term fix independent of ADR-B.
- **`IdentityTrait.adjectives` is dead data (S5).** Declared and set by stories (e.g.
  Dungeo's trap door `adjectives: ['trap']`) but never consumed by any formatter — it
  silently does nothing today.
- **Speech verbs are hardcoded literals in the dialogue catalog (S39).** `talking.ts:34–40`
  writes the literal `says` rather than `{verb:says target}`, so a non-3rd-singular
  speaker (plural twins, 2nd-person narration) reads ungrammatically. The ADR-199 atom
  already conjugates correctly; the catalog just doesn't call it. Low-risk near-term fix
  independent of ADR-G.
- **Pronouns can't be capitalized (S40).** `{capitalize pronoun:subject}` throws and there
  is no auto sentence-start cap, so the `{pronoun:case}` atom cannot open a sentence — the
  exact case dialogue narration leans on ("He says…"). The "compose `{capitalize}` over
  the pronoun" prose in ADR-197 is aspirational; this is the load-bearing item for ADR-G.
