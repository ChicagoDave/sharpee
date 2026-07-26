# ADR-270: The author alteration model

## Status: IMPLEMENTED (2026-07-26, session 0ea0e5) — all five phases landed same session; all nine acceptance items green (see the Session implementation addendum): Chord 2.5.0 adds `extend action` / `remove from action`, the engine gains the shape-removal primitive, the loader wires both with LoadError diagnostics, `define verb` is deleted (Chord 3.0.0, MAJOR) with cloak migrated — its `hook` verb now drives real stdlib putting, which the dead-path stub never did — and the acceptance-15 transcript story passes. Previously ACCEPTED same day. — Child of the ADR-266 umbrella (D14), the alteration model. Carries inherited Q-14 and Gap 3(c); owes umbrella acceptance 15 (the Inform 7 bar made assertable: a story removes a standard verb, adds a synonym to a standard action, and reorders two competing rules, each observably changing what parses). All five open questions resolved via the open-questions interview 2026-07-26 (each the presented recommendation, ruled by the owner): Q-1 incremental override (D1, inherited Q-14 answered), Q-2 `extend action` + `remove from action` blocks (D6), Q-3 load error both directions (D1), Q-4 `define verb` deleted (D7), Q-5 story constructs + spliced fragments (D8). adr-review 13/16, three SMALL findings folded (Modules list, removal-primitive surface contract, full-id-set validation precision) → re-scored 16/16, READY. Not yet implemented.

## Parent: ADR-266 (umbrella — direction (iv), boundary D8, the Gap 3 findings this ADR closes). Consumes ADR-269 (the base artifact `standard-en-us.story`, the grammar-file kind (D8), and name derivation (D10) — the prior art the story-side binding promotes), ADR-268 (the ordering model alterations compose under: confidence → tier → specificity → definition order; story tier beats standard unconditionally at equal confidence), ADR-267 (the construct spellings alteration lines are written in), ADR-271 (D3 `fullPattern()` — the emission seam extensions ride; D4 narrowed `define verb` docs *pending this ADR*, its forward note names this alteration model as the real answer). Relates to ADR-254 (dotless ids — why binding is by derivation, never by dotted literal), ADR-257 (language version — bumped by the new construct(s)), ADR-231 D2a (`.where()` is the parse-time gating surface for *authored* grammar — extensions may use it; stdlib refuses in `validate()`), ADR-084/ADR-087 (the story builder surface and action-centric shape), ADR-251 (imports — spliced fragments can carry alterations), ADR-210 (direction rule — untouched here; everything lands in story-loader/chord/if-domain, none of it platform-runtime-facing).

## Date: 2026-07-26

## Context

### The gap: authors can add and outrank, but not modify or remove

Gap 3 (umbrella) is the first clause of the original feedback — *"not readily apparent how to
change existing logic … that the library defines"* — and it is still open after ADR-269. The
standard grammar now ships as readable, editable Chord
(`packages/parser-en-us/grammar/standard-en-us.story`, 410 rules / 55 blocks), but editing it is
the **platform path**: edit the file, run `repokit grammar`, rebuild. A story author on the shipped
platform has no equivalent. Measured against the I7 bar (extend / alter / order):

| capability | today | where it falls short |
| --- | --- | --- |
| extend — new verb onto a standard action | `define action taking` in a story **mints `chord.action.taking`** (`story-loader/src/loader.ts:1102`) | shadowing, not extending: the author loses stdlib's implementation (Gap 3(a)) |
| alias — `define verb` | Phase A stub, docs narrowed by ADR-271 D4 (`loader.ts:2361-2386`, `KNOWN = {'put on': 'PUT_ON'}`) | one hardcoded mapping; and its consumption path is **dead** (see below) — Gap 3(b) |
| remove / narrow a standard rule | nothing | no primitive at any layer (Gap 3(c)) |
| order — control which rule wins | story tier outranks standard | works only by shadowing, which costs the implementation |

### Code facts (verified 2026-07-26 against the working tree)

**The engine has no removal surface.** `GrammarEngine` exposes `addRule`/`addRules`/`clear`/
`getRules`/`getRulesForAction`/`createBuilder` and nothing else (`if-domain/src/grammar/
grammar-engine.ts:55-127`); `clear()` is total and untiered (`:100-103` — wipes standard *and*
story) and is called by no production code. No disable flag, no mask, no per-rule delete. One
adjacent dead hook: `IParser.setVerbEnabled?()` is declared (`parser-types.ts:148`) and
implemented nowhere.

**Rule identity is shape, not id.** Rule ids are nondeterministic
(`` `rule_${Date.now()}_${Math.random()…}` ``, `grammar-engine.ts:133`) and **never read**
anywhere. The de-facto identity of a rule — the one ADR-269 D2's equivalence harness already
compares on — is (pattern string, action id, tier).

**Ordering is computed, with definition order as the final key.** The comparator
(`english-grammar-engine.ts:117-127`): confidence desc → tier (`story` before `standard`,
unconditional) → literal specificity desc → stable sort, i.e. definition order. There is no
numeric priority anywhere (ADR-268), and no per-rule ordering statement to author.

**Story-side `if.action.*` derivation is established prior art, at three sites.** Entity/trait
interceptor clauses derive `` `if.action.${gerund}` `` and validate the gerund against stdlib's
consulted set (`runtime.ts:206`, `:258`, gate at `:468-471` — story-loader already depends on
stdlib, so the id set is available at load time); state-machine triggers derive the same, today
unvalidated (`loader.ts:1854`); and repokit's grammar-file mode derives-and-validates with a
did-you-mean (ADR-269 D10, `tools/repokit/src/commands/grammar.ts:91,150-165`). What no site does
is derive `if.action.*` for **grammar registration** from a story — grammar-file mode's binding is
read only by the build step; the loader never sets or reads the IR `grammarFile` marker
(`chord/src/ir.ts:37-41`).

**`define verb`'s consumption path is dead, beyond its narrowness.** The stub emits vocabulary
whose grammar-side consumer is never invoked: `getCustomVocabulary()` reaches only
`registerDynamicVerbs` (`english-parser.ts:240-243`), which registers **no grammar rule**; the
rule-registering `addVerb` path is never called for custom vocabulary, and its pattern-format
switch would not match the loader's output anyway (`'VERB NOUN PREP NOUN'` with spaces at
`loader.ts:2384` vs `'VERB_NOUN_PREP_NOUN'` at `english-parser.ts:1384`). The one working example
(`cloak.story:82` `hang or hook means put … on …`) works through the vocabulary side effect, not
through a registered rule.

**The emission seam extensions need already exists.** ADR-271 D3's action-centric path
(`forAction()` + `fullPattern()`, constraints via `.where()`, slot types, `means` defaults,
`directions` cross-products) is what the loader runs for every story `define action`
(`loader.ts:1160-1189`). An extension construct reuses it wholesale; only the action id changes.

### Two audiences, two paths

The platform developer and locale maintainer edit the base and rebuild (ADR-269 — exists today).
The story author needs alterations that **compose with the shipped base at story load time**,
survive platform upgrades, and fail loudly when the base moves underneath them. That composition
model — Q-14, the umbrella's "single most consequential unresolved design point under (iv)" — is
this ADR's center.

## Decision (settled parts)

### D1 — The model is incremental override: alterations compose at load time over a pristine base, and fail loudly (Q-1 resolved 2026-07-26, inherited Q-14 answered)

*Owner ruling via the open-questions interview: incremental override — the recommended option.*

The model: alterations are **story-scoped declarations** (spelled per D6), applied
to the registered rule set when the story loads — never edits to `standard-en-us.story`. The base
file remains the single source of the standard grammar (ADR-269 D7's chain — Chord source →
generated module → freshness gate — is untouched), and an alteration affects only the loading
story's parser instance.

The standing invariant, independent of every open question: **an alteration that references
something the base does not have fails at load with a named diagnostic** — an unknown action name,
a pattern shape no standard rule carries. A silently no-op alteration is the ADR-235 D2 class
("compiles but cannot work") and is forbidden by construction. This is also the upgrade contract's
foundation: when a platform upgrade renames or removes what an alteration referenced, the story
fails loudly at next load, never drifts silently.

**Severity ruled (Q-3 resolved 2026-07-26, interview): load error, both directions** — an unknown
action name and an unmatched removal shape are each a named `LoadError` (did-you-mean for names,
near-miss pattern listing for shapes), consistent with ADR-269 D10's build error and the
never-silent policy. Softening a named error later is cheap and breaks nobody; hardening a
warning later would break shipped stories retroactively. **Rejected**: warning (an inert
alteration is adjacent to the forbidden silent-no-op class) and split severity by case (two rules
to learn where one suffices).

**Rejected** (Q-1 interview): story-shipped wholesale replacement — a story shipping its own
grammar file (ADR-269 D8 kind) in place of the base. It re-introduces load-time compilation of
the base kind (the cost ADR-269 D7 deliberately avoided), makes the author rebase a fork on every
platform upgrade, and defeats the loud-failure upgrade checks (a stale fork loads clean and
silently misses base fixes). The platform path — edit `standard-en-us.story`, `repokit grammar`,
rebuild — remains the whole-file route for those who build the platform. Also rejected: offering
both, which is two mechanisms to keep coherent for no capability the override lacks.

### D2 — Extension: grammar lines onto a standard action, by name derivation, story tier, no conveniences

The extension construct (`extend action`, D6) adds grammar lines to an **existing** action:

- **Binding by name derivation** — ADR-269 D10 promoted to the story side. The named action
  resolves story-first: a story-defined `define action` of that name wins (consistent with today's
  shadowing semantics); otherwise the stdlib gerund binds `if.action.<name>`; otherwise a named
  load error with the did-you-mean. Validation is against stdlib's **full exported action-id set**
  (the `IFActions` constants, which story-loader imports directly — review fix, 2026-07-26) —
  explicitly **not** `interceptorConsultingActionIds`, the consulted *subset* the interceptor gate
  uses; a non-consulted action is still extendable. No dotted id enters the language (ADR-254
  stands).
- **Story tier, exactly the stated lines** (mirror of ADR-269 D3): no `chord.action.*` mint, no
  automatic bare-verb prefix rules, no refusal ladder, no dispatch action. The stdlib action's own
  `validate()` owns refusals, as it does for every rule that already reaches it.
- **Grammar surfaces only** (umbrella D8): pattern lines, `means`, `directions`, slot-type lines,
  and `must be` constraints — `.where()` is the legitimate parse-time gate for *authored* grammar
  (ADR-231 D2a). Bodies, refusal ladders, phrases, scores are named analyzer errors inside an
  alteration block, exactly as in grammar-file mode (ADR-269 D4). No behavior crosses; every
  `if.action.*` implementation stays TypeScript.
- Emission rides ADR-271 D3's existing `forAction()`/`fullPattern()` path unchanged.

Because story tier outranks standard unconditionally at equal confidence, an extension line that
collides with a standard rule **wins** — which is what makes extension double as the reorder
mechanism (D4).

### D3 — Removal: a new engine primitive, identified by shape, dual-surface

Gap 3(c) is a genuine missing capability, not a wiring gap. The engine gains **per-rule removal by
shape**: remove the rule(s) matching (action id, pattern string), scoped to the standard tier by
default. Contract:

- **Identity is shape** — pattern-string equality including slot names, the same identity ADR-269
  D2's equivalence harness already uses (ids are nondeterministic and never read; there is nothing
  else a rule *could* be identified by). The Chord removal line converts to a pattern string
  through the same IR→pattern conversion the loader and the repokit emitter already own, so
  `get the item` removes taking's `get :item`.
- **Surface contract** (review fix, 2026-07-26): the primitive is diagnostic-free — shaped like
  `removeRules(action: string, pattern: string, tier: GrammarTier = 'standard'): number` on the
  `GrammarBuilder`/`GrammarEngine` surface, returning the count removed (exact name/home finalized
  at implementation). The **loader** owns the Chord-side diagnostic: count 0 raises the named
  `LoadError`; a TS story checks the return itself.
- **Loud on miss** (D1): removing a shape no standard rule carries is a named `LoadError` listing
  near-miss patterns of the named action (via `getRulesForAction`; severity ruled in D1).
- **Dual-surface** (umbrella D8 — grammar definitions are authorable in either Chord or
  TypeScript): the primitive lands on the `GrammarBuilder`/`GrammarEngine` surface, so a TS
  story's `extendParser` can perform the same removal; the Chord construct rides the same call.
- **Removal removes reachability only.** Vocabulary entries and the action implementation are
  untouched; the action's other patterns still reach it. Removing every pattern of an action is
  legal and simply makes it unreachable by parse.
- The 12 platform-side exception rules (`platform-grammar.ts`) are standard-tier and removable by
  the same shape rule — nothing is special-cased.

This is a platform change (if-domain + parser-en-us match path untouched; the mutation surface
grows by one operation) and is recorded here per the platform-change policy.

### D4 — Reorder is compositional; no ordering syntax is added

ADR-268's model stands whole: no numeric priority, no ordering annotations, no relational
("list X before Y") vocabulary. An author who wants standard rule B to beat standard rule A
**restates B as an extension line** (story tier wins) or **removes A**. Umbrella acceptance 15's
reorder clause is discharged compositionally — the transcript test restates the loser of a real
TIE pair and shows the parse flip.

**Rejected:** a relational ordering construct. It would introduce a second ordering vocabulary
alongside ADR-268's computed model, reopen the annotation door that ADR-268 D1/D4 closed, and
serve no case the two existing verbs (extend, remove) do not already cover.

### D5 — The language change carries the usual paper trail

The new top-level constructs (D6) are an EBNF addition with an approved
`chord-grammar-changes.md` row and an ADR-257 version bump. Analyzer gates enforce D2's
grammar-surfaces-only rule inside alteration blocks with named diagnostics. Author-facing
documentation of the constructs is **ADR-272's** (the docs-surfaces child); this ADR hands the
capability over, it does not write the pages.

### D6 — The constructs are `extend action` and `remove from action`, two dedicated blocks (Q-2 resolved 2026-07-26)

*Owner ruling via the open-questions interview: two dedicated blocks — the recommended option.*

```chord
extend action taking
  grammar
    snag the item

remove from action taking
  get the item
  take up the item
```

Each construct does one thing; `extend action` reads as what it is, and a story that only removes
never writes an empty `grammar` section. Block forms are required in either case — a one-line
`remove get the item from taking` cannot be parsed reliably, because patterns themselves contain
`from` (`drink from the target`). Chord's existing `remove` is a *body* statement (entity
removal, `chord/src/parser.ts:3885-3896`) and is position-distinguishable from this top-level
form. Final EBNF productions land at implementation with D5's paper trail.

**Rejected** (Q-2 interview): a single `alter action` block with `add`/`remove` sections (one
entry keyword but two new inner keywords, and neither half reads as well); `extend action`
carrying a `remove` section (extending-by-removing reads oddly when a story only removes).

### D7 — `define verb` is deleted; `extend action` supersedes it (Q-4 resolved 2026-07-26)

*Owner ruling via the open-questions interview: delete — the recommended option.*

The construct is removed from the language: the EBNF production, the Phase A loader stub
(`loader.ts:2361-2386`), and the published `define verb` page all go, and `cloak.story:82`
migrates to the extension construct (`hang the item on the supporter` / `hook …` lines onto the
standard put-on action). Two constructs for one capability fails the one-way-to-say-it bar —
especially when one of them is a single hardcoded mapping riding a consumption path that is dead
(Context): the vocabulary it registers reaches no grammar rule, and its one working example works
by side effect.

Gates on the migration: the ADR-271 D5 docs-examples-load test (updated for the page's removal)
and cloak-of-darkness's transcripts, which must stay green across the swap. Removing a shipped
construct carries the same paper trail as adding one: its own `chord-grammar-changes.md` row and
the ADR-257 bump (shared with D6's, if landed together). This completes ADR-271 D4's forward
note — the docs narrowed then; the construct retires now, superseded rather than orphaned.

**Rejected** (Q-4 interview): keeping Phase A as narrowed sugar beside the general mechanism —
it preserves a hardcoded table and a dead path in the language forever, for one story's one line.

### D8 — Alterations live in the story: the story file and spliced fragments (Q-5 resolved 2026-07-26)

*Owner ruling via the open-questions interview: story constructs — the recommended option.*

`extend action` and `remove from action` are **story-level declarations**, legal in the story
file and in `.chord` fragments spliced by `import` (ADR-251) — which works by construction, since
import is textual splicing and a fragment's declarations compile in the story's own mode. That
gives multi-file organization (e.g. a story keeping its grammar alterations in
`grammar-tweaks.chord`) for free, with no new loading machinery.

The grammar-file kind stays what ADR-269 D8 made it: the **base artifact's** kind, consumed by
the build step. Story-loader continues never to read the `grammarFile` IR marker; ADR-269 D8's
"override file can be the same kind" hook is hereby resolved *against* — the override surface is
story constructs, not a second grammar-file consumer.

**Rejected** (Q-5 interview): letting a story reference a standalone grammar-file-kind override
document — a second loading mode in story-loader for no capability the story-construct route
lacks.

*Modules (review fix, 2026-07-26):* **chord** — EBNF (`extend action` / `remove from action`
productions; `define verb` production removed), `parser.ts` (two new story-level forms; the
`define verb` parse path removed), `analyzer.ts` (alteration-block gates: grammar surfaces only,
named diagnostics), `chord.ebnf` pin + `chord-grammar-changes.md` rows + ADR-257 bump.
**if-domain** — the removal primitive on `GrammarBuilder`/`GrammarEngine` (D3); no matcher or
comparator changes. **story-loader** — alteration wiring (extension emission over the existing
`forAction()`/`fullPattern()` path; removal → primitive + `LoadError` on miss), full-id-set name
validation (D2), `toVocabularyVerb` stub and its `define verb` handling deleted (D7).
**parser-en-us** — untouched (no match-path change; `platform-grammar.ts` rules simply remain
removable by shape). **website** — the `define verb` page removed; other pages are ADR-272's.
**stories** — `cloak.story` migrated (D7). **tests** — the ADR-271 D5 docs-examples-load test
updated; the acceptance suite here.

## Acceptance

Restating umbrella item 15, made concrete:

1. **The I7-bar transcript test** (umbrella 15): a story (i) removes a standard verb — the command
   stops parsing as that action; (ii) adds a synonym to a standard action — the command parses and
   drives the **stdlib implementation**, asserted on state (the taken item is in inventory), not
   on text alone; (iii) reorders two competing rules by restating a real TIE-pair loser — the
   winner observably flips. Each of the three changes what parses. *(D2, D3, D4)*
2. Extension rule shape is asserted, not inferred: the registered rules carry the `if.action.*`
   id, tier `story`, exactly the stated lines — no `chord.action.*` mint, no bare-verb prefix
   rules, no dispatch action. *(D2)*
3. An unknown action name in an extension is a named load error with a did-you-mean, validated
   against stdlib's id set plus the story's own actions. *(D1, D2)*
4. A removal whose shape matches no standard rule produces its named `LoadError` listing the
   named action's actual patterns — never a silent no-op, never a warning. *(D1, D3)*
5. **Dual-surface**: a TS story performs the same removal through `getStoryGrammar()`'s builder
   surface, asserted the same way. *(D3)*
6. Behavior declarations inside an alteration block (body, refusal ladder, phrase, score) are
   named analyzer errors, tested by name. *(D2, D5)*
7. The base is pristine: no alteration path writes `standard-en-us.story` or the generated module;
   alterations are story-scoped (a parser constructed without the story is unaffected). *(D1)*
8. The EBNF change(s) land with their `chord-grammar-changes.md` row(s) and ADR-257 bump. *(D5)*
9. `define verb` is gone — EBNF production, loader stub, and published page removed;
   `cloak.story` migrated to `extend action` with its transcripts green; the ADR-271 D5
   docs-examples-load test updated and green. *(D7)*

## Consequences

**Gained (when ACCEPTED + implemented).** Gap 3 closes — the last open clause of the original
feedback. The I7 bar is met in full: extend (D2), alter (D2+D3), order (D4, compositionally), all
without shadowing's cost of losing the stdlib implementation. `define verb`'s debt is retired
(D7). ADR-272 gains the last capability its author-facing pages need to describe.

**Cost.** One engine mutation primitive (per-rule removal) — small, but the first ever, and the
first API through which a story can *narrow* what the platform parses; authors can now break
standard parsing deliberately, and the loud-failure contract (D1) is what keeps them from breaking
it accidentally. New Chord construct(s): EBNF, analyzer gates, changes-row, ADR-257 bump. A
story-side name-validation path (cheap — the id set is already in story-loader's dependency
surface).

**Rejected (by the settled parts).** Relational ordering syntax (D4). Making shadowing inherit
stdlib behavior — the umbrella already rejected it; extension-by-binding supersedes it. A
verb→action-id resolution path for `define verb` (ADR-271's forward note — D2's derivation *is*
that path, generalized). Silent-no-op alterations in any form (D1).

**Not addressed.** Extension grammar for Chord *extensions* (ADR-215 packages) — alterations here
are story-scoped. Locale interactions beyond what ADR-269 D9 already rules (the constructs are
mechanism, locale-generic by construction). The author-facing documentation pages (ADR-272's).

## Session

Session of 2026-07-26 (0ea0e5). Drafted as the next umbrella child after ADR-269's implementation
landed (6d8ec8fe). Grounded before drafting: ADR-266/269/271 re-read in full; the engine's
mutation surface, comparator, and rule-identity facts verified against
`if-domain/src/grammar/grammar-engine.ts` and `english-grammar-engine.ts`; the story-loader
emission path, the three `if.action.*` derivation precedents, the dead `define verb` consumption
path (including the space-vs-underscore pattern-format mismatch), and the absence of any
story-side `if.action.*` grammar binding verified against `loader.ts`/`runtime.ts`;
`Part D of docs/work/grammar-parity/sharpee-chord-grammar-syntax.md` (Gap 3(b)/(c) and the
target-naming form converge here) consulted.

**Implementation addendum (2026-07-26, same session, on the owner's "begin").** Plan:
`docs/work/author-alteration-model/plan.md`. All five phases landed:

- **Phase 1 (Chord 2.5.0)**: `extend action` / `remove from action` parsed (shared
  `parseActionBlockParts` refactor), analyzer gates (`analysis.alteration-behavior`,
  `analysis.removal-shape`, `analysis.empty-extension`; grammar files reject both kinds), IR
  additive `grammarExtensions`/`grammarRemovals`; EBNF + pin + changes-row; 20 new tests;
  chord 615/615 (4 IR goldens re-recorded on the owner's OK — languageVersion-only).
- **Phase 2**: `GrammarEngine.removeRules(action, pattern, tier='standard'): number` +
  builder delegation — diagnostic-free, shape identity, survivor order preserved; if-domain
  102/102.
- **Phase 3**: loader wiring — shared `registerActionGrammar` (bare-verb forms now gated to
  dispatch actions), story-first resolution, full-`IFActions` validation with did-you-mean
  (bounded-Levenshtein helper), removal via the primitive with `LoadError` on 0 listing the
  action's actual patterns; story-loader tests assert registered rule shape (acceptance 2–4).
- **Phase 4 (Chord 3.0.0, MAJOR)**: `define verb` deleted — EBNF production, parser path
  (now `parse.removed-define-verb` fix-it), `DefineVerb` AST, `IRVerbDef` + `StoryIR.verbs`,
  the loader stub + `getCustomVocabulary`, the website page (+ nav/links), with its
  changes-row; `cloak.story` (and the chord fixture) migrated to
  `extend action putting` → `hook the item on the hook` — verified live: `hook cloak on
  hook` → *"You put the velvet cloak on the brass hook."* (the stub's dead path never
  registered a rule); docs-examples-load narrowed to the define-action page;
  `ide-protocol`'s `IRVerbDef` re-export replaced with the two alteration types.
- **Phase 5**: `stories/grammar-alterations/` acceptance story + transcript (6/6): `get`
  removed → "I don't understand", `snag` → stdlib taking asserted on inventory state,
  `read book` flips reading → examining. **Acceptance 1(iii) note**: the 29 static TIE
  pairs never co-match one runtime command, so the reorder demo uses D4's stated mechanism
  directly (restate the pattern under the preferred action; story tier flips the winner)
  rather than literally restating a TIE-pair loser. Dual-surface (acceptance 5): real
  `EnglishParser.getStoryGrammar().removeRules(...)` tests in parser-en-us (287 green).
  Root tsc clean; repokit 40 / devkit 83; corpus sanity green (cloak 81/81, fernhill,
  friendly-zoo, go-out-exiting 7/7, dungeo units 1787 pass + accepted classes).
