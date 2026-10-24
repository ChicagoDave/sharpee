# ADR-382: A grammar rule crosses from Chord to the matcher as structured parts, never as text to re-split

**Status**: **ACCEPTED** (David, 2026-10-23, session f12dc9: "yes", after the open-questions interview and `adr-review`). All five open questions resolved by David in the interview, 2026-10-23 (Q-1 retire `forAction`, Q-2 `grammar.ts` emits parts, Q-3 manifest shapes are parts only, Q-4 alternations compare as sets, Q-5 multi-word optionals refused, each "a", the recommended option); `adr-review` 17/20, its three findings folded (the greedy and typed-slot rule with the named lookups, two citations corrected, amendment-note ownership); Amends ADR-087 (the action-centric builder is retired) besides the records below. Written 2026-10-23, session f12dc9, on `chord-4-0`, at Phase 1 of `docs/work/parser-review/plan-20261023-step2-structured-seam.md`, from step 2 of the parser review's recommendation (`docs/work/parser-review/review-20261022.md`, root cause 2). Amends ADR-271 D3 (`fullPattern(string)` is replaced) and ADR-270 D3 (removal identity is structural, slot names ignored). Corrects the loader's and repokit's registration order to the definition order ADR-268 already requires; ADR-267 D12 stands as written. No implementation is authorized.

## Date: 2026-10-23

**Kind**: technical

**Scope**: `packages/if-domain` (`src/grammar/grammar-builder.ts`, `grammar-engine.ts`, `pattern-compiler.ts`), `packages/parser-en-us` (`src/english-pattern-compiler.ts`, `english-grammar-engine.ts`, `english-parser.ts`, `parse-failure.ts`, `src/grammar.ts` regenerated), `packages/chord` (a new pattern module; `analyzer.ts`, `parser.ts`, `claims-cone-rules.ts`, `stdlib-manifest.ts` regenerated, `package.json`), `packages/story-loader` (`loader.ts` grammar registration and removals), `tools/repokit` (`src/commands/grammar.ts`, `manifest.ts`), `packages/devkit/fixtures/basic-story` (`forAction` retired), `packages/parser-en-us/CLAUDE.md`, `packages/sharpee/docs/genai-api` (regenerated).

## Parent

- **The parser review** (`docs/work/parser-review/review-20261022.md`): root cause 2, findings B1, B4, B5, B6, B7, and H's "never read: `CompiledPattern.slots` and `maxTokens`". Step 1 of the same review is done (`plan-20261022-step1-ship-breaking-fixes.md`).
- **ADR-271 D3**: created `fullPattern(string)` as Chord's emission path, with `.where()` and `slotType` attached by a text scan of each line. That scan is B1.
- **ADR-270 D3**: removal identity is (action, pattern string, tier). This record changes the pattern half.
- **ADR-087**: the action-centric builder (`forAction`, `verbs`, `pattern`, `patterns`, `directions`), retired here (Q-1).
- **ADR-268 D2**: definition order is the final tiebreak. The loader's grouping breaks it (B7).
- **ADR-267** D9 (`[the target]` is an optional slot), D10 (greedy), D11 (typed slots), D12 (`means` and `directions`): the constructs whose meaning must survive the crossing.
- **ADR-210**, Packages table: `@sharpee/chord` depends on "nothing platform-runtime (browser-safe; `if-domain` types at most)". This is what lets the part type have one home (D1).

## Context — measured, not assumed

**Chord lowers a pattern to structured parts; the platform turns them into text and splits the text again.** The IR's pattern element is structured (`chord/src/ir.ts:1357-1360`): `word`, `slot` or `alt`, each with an optional `optional` flag. Greedy is an action-level list (`IRActionDef.greedy`), not a part property. From there:

- **Rendered to text in three places that disagree.** `story-loader/src/loader.ts:3188` `renderPatternPart` renders greedy as `:slot...`; `chord/src/analyzer.ts:1967` and `tools/repokit/src/commands/grammar.ts:87` render no greedy suffix. A fourth walker, `chord/src/parser.ts:350` `expandPattern`, expands a slot-free passage pattern into the commands it admits.
- **The directions cross-product and the `means` grouping exist twice.** `loader.ts:1690-1712` and `repokit grammar.ts:115-130` expand directions; `loader.ts:1733-1747` and `repokit grammar.ts:133-150` group the emissions by `JSON.stringify(defaults)` and register group by group.
- **The text is re-split in three places.** `if-domain/src/grammar/grammar-engine.ts:448-455` finds a line's slots with `split(/\s+/)` and `startsWith(':')`, so `[:target]` is not a slot and `.where()` and `slotType` skip it. `parser-en-us/src/english-parser.ts:809-824` builds the seat map the same way, so an optional slot gets no seat and lands in `extras`; a greedy slot keeps `...` in its name and never matches the slot map's key. `parse-failure.ts:153-180` splits `best.pattern` on spaces to find the slot after a preposition, and reads `expected` as a `:`-prefixed string. Repokit attaches slot types with `text.includes(':' + slot)` (`grammar.ts:146`), which also matches `:item` inside `:items`.
- **The compiled pattern already holds the facts, and nothing reads them.** `CompiledPattern { tokens, slots, minTokens, maxTokens }` (`if-domain/src/grammar/grammar-builder.ts:557-562`) is built for every rule (`grammar-engine.ts:58-60`). The matcher reads `tokens` and `minTokens`; `slots` and `maxTokens` have no production reader in `packages/` or `tools/`, and two tests read them (`parser-en-us/tests/english-pattern-compiler.test.ts:23`, `if-domain/tests/grammar/grammar-builder.test.ts:94`), which are updated with the change (grep, this session).
- **The bracket notation is handled by a regex.** `english-pattern-compiler.ts:174-186` rewrites each `[…]` to `[optional] …`, which marks only the first word optional; `validate()` (`:195`) never checks brackets.
- **Removal compares rendered strings.** `grammar-engine.ts:121-136` matches `rule.pattern === pattern`. The loader renders the removal (`loader.ts:1626`) and the analyzer renders it again and compares against the manifest's `grammarShapes` strings (`analyzer.ts:1966-1977`). Two more readers split those shape strings: the act-verb lexicon (`chord/src/parser.ts:229-238`) and `leadingWords` in `chord/src/claims-cone-rules.ts:912-919`, which already has a parts twin, `patternLeadingWords` (`:922-929`). The acting-statement matcher (ADR-329) is a fourth: it expands a story action's AST pattern to strings with its own walker, `expandPatternShapes` (`analyzer.ts:755`), merges them with the manifest's strings (`allActShapes`, `:7237`), and splits every shape on spaces to match it (`shapesOpenedBy` `:7252`, `matchActShape` `:7275-7284`, `matchShapeWords` `:773`). A manifest shape with an optional, such as `look [carefully] at :target`, therefore reaches `matchShapeWords` with `[carefully]` as a literal word, where a story shape has already been expanded to both readings (read from the code, not probed).
- **Registration order is group-major.** One `forAction` builder per distinct defaults object (`loader.ts:1733-1758`), so an action whose lines alternate between two `means` groups registers out of written order. ADR-268 D2 makes definition order the final tiebreak, and the engine is careful to preserve it (`grammar-engine.ts:48-55`). ADR-267 D12 itself says nothing about grouping: it rules the `means` line and the `directions` block. The grouping is an implementation choice whose comment cites D12.

**B1, on the bundle** (2026-10-23, this session; probe story `…/scratchpad/probe/seam.story`, built at `dist/cli/sharpee.js` of 02:25 that day). `define action poking` with `poke [the target]` and `the target must be held`, beside `define action prodding` with `prod the target` and the same requirement:

```
$ node dist/cli/sharpee.js --story …/seam.story --exec "take coin/poke coin/poke lamp/prod coin/prod lamp"
> take coin      Taken.
> poke coin      You can't do that.
> poke lamp      You can't do that.
> prod coin      You prod the coin.
> prod lamp      You touch the lamp.
```

`--debug` on `poke lamp` shows the match as `"pattern": "VERB_ONLY"`, `"action": "chord.action.poking"`, with `lamp` under `"extras": { "target": … }`: the optional slot matched, but it got no seat. The required form binds and its constraint holds: the unheld lamp falls through to standard touching.

**B4, on the compiled compiler** (`packages/parser-en-us/dist/english-pattern-compiler.js`, same session):

```
"[look at] :x" => look (optional), at, :x
"look [at :x"  => look, "[at" (a literal), :x
"look at] :x"  => look, "at]" (a literal), :x
```

None throws. No pattern in the standard grammar, in Dungeo's grammar files or in `packages/character` uses a multi-word optional (grep, this session).

**Who calls the string entries.** `fullPattern` is called only by the loader (`loader.ts:1747, 1767, 1806`). `removeRules` is called only by the loader (`:1627`). `forAction` and its verb × template methods (`verbs`, `pattern`, `patterns`, `directions`) are called by the loader and by one test fixture, `packages/devkit/fixtures/basic-story/src/index.ts:181`. TS stories register through `define(text)`: eight files under `stories/dungeo/src/grammar/`, `stories/family-zoo-tutorial/src/index.ts`, and `packages/character/src/conversation/dialogue-extension.ts`.

## Decision

### D1 — The pattern element is an if-domain type, and chord produces it

`@sharpee/if-domain` defines the structured pattern element and the rule spec, in `src/grammar/grammar-builder.ts`:

```typescript
/** One element of a grammar pattern, as a rule is registered. */
export type PatternElement =
  | { kind: 'word'; word: string; optional?: boolean }
  | { kind: 'alt'; words: readonly string[]; optional?: boolean }
  | { kind: 'slot'; name: string; optional?: boolean; greedy?: boolean };

/** A grammar rule, as data. */
export interface GrammarRuleSpec {
  action: string;
  parts: readonly PatternElement[];
  /** How the rule displays in diagnostics and failure messages; never parsed. */
  pattern: string;
  defaults?: Partial<SemanticProperties>;
  /** Per-slot configuration, keyed by slot name; a name no part carries is an error. */
  slots?: Readonly<Record<string, { type?: SlotType; constraints?: readonly ScopeConstraintBuilder[] }>>;
  when?: GrammarGate;
}
```

`@sharpee/chord` adds `@sharpee/if-domain` as a dependency and imports from it **with `import type` only**, which ADR-210's Packages table allows ("`if-domain` types at most"). Chord stays browser-safe and runtime-free; a chord unit test fails on any non-type import of `@sharpee/if-domain`. The IR's own `IRPatternPart` is unchanged: it is the authored form, and the IDE decodes it. Chord's pattern module (D5) lowers it to `PatternElement[]`, and greedy becomes a per-slot flag at that step.

*Rejected:* a chord-side copy of the type pinned equal by a test in story-loader. That is the duplicated-and-synchronized wire type DevArch rule 8b forbids, and ADR-210 already permits the direct import. *Rejected:* if-domain importing chord's type. That would make the contracts package depend on the compiler, which reverses ADR-210's direction rule.

### D2 — One builder entry takes a rule spec

`GrammarBuilder` gains `rule(spec: GrammarRuleSpec): void`, which registers one rule at the builder's tier (story from `getStoryGrammar()`, standard otherwise). It **replaces `ActionGrammarBuilder.fullPattern(string)`**, which is deleted (amends ADR-271 D3). The loader registers through it, and so does the generated `grammar.ts`: **it emits one `grammar.rule({ action, pattern, parts, defaults })` literal per rule, in definition order** (Q-2, David, 2026-10-23: "a"). Generation then takes the loader's path exactly, through chord's `lowerActionRules` (D5), and the standard grammar never passes through text at startup. The file grows several times longer. Nobody edits it, and the `./repokit grammar --check` freshness gate (ADR-269 D7) is unchanged. The hand-maintained `platform-grammar.ts` (`?`, `and?`, the `trace` family, `:36-57`) stays on `define(text)`, through D3's front end.

`GrammarRule` keeps `pattern: string` as the rule's display text, supplied by the caller: Chord's renderer (D5) for a Chord rule, and the author's own text for `define(text)`. **Nothing parses `rule.pattern`.** It is read by diagnostics, failure messages and step 3's five seat tests (`english-parser.ts:964-996`), which stay until step 3 removes them. Because the renderer keeps today's output for every non-optional form, those tests keep working.

**The `forAction` family is retired** (Q-1, David, 2026-10-23: "a"). `GrammarBuilder.forAction`, `ActionGrammarBuilder` and its `verbs`, `pattern`, `patterns`, `directions`, `where`, `slotType`, `withDefaultSemantics`, `when` and `build` are deleted from `if-domain`. They were built to register the standard grammar in TypeScript, which is Chord now (ADR-269), and once `fullPattern` is gone their one caller outside the loader is the devkit `basic-story` fixture (`packages/devkit/fixtures/basic-story/src/index.ts:181`), whose `wear`/`don` block becomes two `define` lines. `packages/parser-en-us/CLAUDE.md` stops teaching it. Tests that exercise the family (`parser-en-us/tests/action-grammar-builder.test.ts`, `if-domain/tests/grammar/grammar-builder.test.ts` and the loader-adjacent suites that call it) move to `rule(spec)` or `define`, or are deleted where they test only the retired surface. A TS author has two entries: `define(text)` and `rule(spec)`.

### D3 — `define(text)` stays for TS stories, as a front end that produces parts

TS stories keep `define('put :item in|into :container')`. The text is parsed **once** into `PatternElement[]` by a bracket-aware tokenizer in the English pattern compiler (where the notation lives today; moving it is step 7's language-and-state question, not this one), and from there the rule takes the same path as a spec. `PatternCompiler` becomes two methods: `parse(text): PatternElement[]`, which throws `PatternSyntaxError` with an offset, and `compile(parts): CompiledPattern`.

The tokenizer refuses what today compiles silently (B4): an unclosed `[`, a stray `]`, a nested bracket, an empty `[]`. An optional element is one word, one alternation or one slot, so **a multi-word optional such as `[look at]` is refused** with `PatternSyntaxError` and its offset (Q-5, David, 2026-10-23: "a"). This matches Chord, where `[…]` wraps one element (ADR-267 D9). No TS pattern in the repository writes a group, and supporting one would give the text notation a construct the language lacks and `PatternElement` a group kind.

*Rejected:* moving Dungeo's eight grammar files, the zoo tutorial and the character dialogue extension to hand-written parts. `define` text is a fine notation for a TS author, and the defect was never the notation but re-splitting it downstream. One parse at the boundary removes the defect.

### D4 — The compiled pattern is the one source of slot facts

`CompiledPattern.slots` becomes an ordered list of slot records, in pattern order:

```typescript
export interface CompiledSlot {
  name: string;
  /** Index of the slot's token in `tokens`. */
  tokenIndex: number;
  optional: boolean;
  greedy: boolean;
  /** Resolved at build: the spec's type, or TEXT_GREEDY for a greedy slot, else ENTITY. */
  slotType: SlotType;
}
```

with a by-name lookup beside it, `CompiledPattern.slotsByName: ReadonlyMap<string, CompiledSlot>`. A slot's type has one rule: a greedy slot is `TEXT_GREEDY`, and any other type given for it in `GrammarRuleSpec.slots` (or by a `define` builder's typed-slot method) is a build error; a non-greedy slot takes the type the spec gives it, or `ENTITY` when none is given. `maxTokens` is deleted; it has no reader, and a greedy slot makes it meaningless. `PatternCompiler.extractSlots` is deleted; it has no caller. The record is shaped so that step 3 can add a `seat` field without reshaping it.

The three text scans are removed, and each reads the record instead:
- **Slot configuration** attaches by name against the compiled slots. A constraint or type naming a slot the pattern lacks is a build error, where today it silently attaches nowhere.
- **The parser's seat map** (`english-parser.ts:809-824`) iterates the compiled slots. An optional slot gets a position like a required one, which fixes B1. A greedy slot's name is clean. The positional rule (first non-instrument slot is the direct object) is kept exactly; whether an optional slot *should* count is step 3's.
- **The failure classifier** (`parse-failure.ts`) receives the expected element as a structured value from the engine: the failure record's `expected` field becomes `expected?: PatternElement` (a `slot` part carries its `name`, a `word` or `alt` part its words), and finds the slot after a preposition from the compiled tokens.

### D5 — One pattern module in chord: lowering, rendering, directions, commands

One module in `packages/chord/src/` (working name `patterns.ts`, flat beside `claims.ts` and the `condition-*.ts` modules, which is where chord keeps small cross-cutting modules) owns every walk over pattern parts:

- `lowerActionRules(action, options)` turns one `define action` or `extend action` into its ordered rule list: one entry per emitted rule with `parts: PatternElement[]`, the rendered `pattern`, per-rule `defaults` (`means`, and `direction` from the expansion), slot types and greedy flags, and the scope requirement *words* (the loader maps words to builder predicates, which are runtime functions chord cannot hold). It covers the directions cross-product with its bare form, and the bare-verb forms when asked.
- `renderPattern(parts)` produces the display text, greedy suffix included. It is the only renderer.
- `expandCommands(parts)` is today's `expandPattern`, moved unchanged. ADR-380's passage expansion calls it.
- `expandReadings(parts)` expands every optional and alternation to its readings, slots kept, optional-first. It replaces the analyzer's `expandPatternShapes` (`analyzer.ts:755`), and the acting-statement matcher (ADR-329) runs it over story and manifest shapes alike. `expandCommands` is `expandReadings` restricted to slot-free patterns, so the two share one walk.
- `samePatternShape(a, b)` is the removal identity (D6).

The loader and repokit's `expandGrammarIr` call `lowerActionRules`; their own renderers, expansions and groupings are deleted (B5). Repokit already runtime-requires the built chord (`grammar.ts`, `compileStandardGrammarRules`).

This module does not cut across ADR-335 or ADR-336. ADR-335 D5 keeps `extendParser` as facade, and the loader's registration behind it shrinks to mapping requirement words and calling `grammar.rule`. ADR-336 leaves `parser.ts` alone except for the one function this moves.

### D6 — Removal identity is structural (amends ADR-270 D3)

Two patterns have the same shape when they have the same number of elements and each pair matches: both are words equal after lowercasing; both are alternations with the same set of words after lowercasing, in any order (Q-4, David, 2026-10-23: "a"; an alternation is a set of words that each admit the rule, and the order an author lists them changes nothing the parser does, so `press or push the target` removes `push|press :target`); or both are slots, **whatever their names**. The `optional` flag must match on every pair. So `remove from action taking: get the thing` removes `get :item`, which B6 records it does not do today.

`samePatternShape` lives in chord's pattern module, the one place both callers can import it: the analyzer's census-3 check at compile time, and the loader at load time. The engine primitive becomes `removeRules(action, matches: (rule: GrammarRule) => boolean, tier = 'standard'): number`. It is still diagnostic-free, it still returns the count, and the caller still owns the miss diagnostic (ADR-270 D3's contract). What changes is that the identity test is passed in, not hard-coded as string equality. The loader is its only caller (grep, this session).

**The manifest's `grammarShapes` carries parts only** (Q-3, David, 2026-10-23: "a"): `Readonly<Record<string, readonly (readonly PatternElement[])[]>>`, written by `./repokit manifest` from the same `lowerActionRules` output that generates `grammar.ts`, so the two cannot drift. No display string is stored beside it. The analyzer compares a removal against it with `samePatternShape`, and a shape shown in a diagnostic (the "standard patterns are" list) is rendered by `renderPattern` at the point of display. The act-verb lexicon (`chord/src/parser.ts:229-238`) and `claims-cone-rules.ts` read a shape's leading words from parts (`patternLeadingWords` already does so for IR parts), and the string `leadingWords` is deleted. The acting-statement matcher (`allActShapes`, `shapesOpenedBy`, `matchActShape`, `matchShapeWords`) takes each story or manifest shape through `expandReadings` and matches the resulting parts. A slot is a part of kind `slot`, and an alternation's spellings are its `words`. That ends the space-splitting, and a manifest optional is matched in both readings, as a story optional already is. The matcher's rules (first literal by lemma, a slot consuming up to the next literal, story shapes first, most literals wins) are otherwise unchanged.

ADR-269 D2's equivalence harness, which also compared rules by pattern string, was a one-time migration gate. No harness remains in `tools/repokit/src`, `scripts/` or `packages/parser-en-us/tests` (grep "equivalence", this session), so nothing else depends on string identity.

### D7 — Rules register in definition order

Each emitted rule is one `grammar.rule(spec)` call carrying its own defaults, in the order the author wrote the lines. There is no bucket-by-defaults pass, in the loader or in repokit. This is not a new rule: it makes the loader and the generated grammar obey ADR-268 D2, which they currently break wherever an action's `means` groups interleave (B7). ADR-267 D12 stands as written. The loader comment that cites D12 for the grouping is corrected.

Bare-verb forms keep their place after the action's slotted forms, as today (`loader.ts:1764-1768`). They are separate forms, not a reordering of written lines.

**This changes behavior wherever groups interleave**, by ADR-268's own terms. The proof is a before-and-after dump of every story's registered rules, in order, with each difference classified, plus the regenerated `grammar.ts` diff, the Dungeo chain and every Chord tree. If any pinned recording would change, implementation stops for David's ruling.

### D8 — Passage commands use the same walker

`registerPassageGrammar` registers each passage command through `grammar.rule` with word parts. The commands come from `expandCommands`, now in the pattern module, so no sixth walker exists.

### D9 — What step 2 leaves to step 3

Step 3 declares roles: which slot is the direct object, the indirect object, the instrument, the topic or the text. It then removes the five `rule.pattern.includes(…)` seat tests, `primarySlotOf`, and the slot-name guesses in failure messages. This record does the part step 3 stands on and decides none of it:

- the compiled slot record can take a `seat` field;
- `GrammarRuleSpec.slots` can take a per-slot seat, so a declared role is one more field rather than a second entry point;
- the seat map reads the record.

The positional default stays exactly as today. Step 3's ADR inherits the question of whether an optional slot takes a positional seat.

> **Amended by ADR-383 D2 (2026-10-23):** answered yes. Every entity slot's seat is set on `CompiledSlot.seat` at build, an optional slot counted like a required one; declared seats (`GrammarRuleSpec.slots[name].seat`, `.seat(name, seat)`) are taken first and undeclared entity slots fill the seats left free in pattern order.

## Consequences

**Gained.** One home for every structural pattern fact: if-domain for the type, chord for every walk over Chord's parts, the compiled pattern for every slot fact at match time. `[the target]` works as ADR-267 D9 promised. Malformed patterns are refused where they are written. A removal names a rule by its shape, as an author reads it. Registration order is the order the author wrote, as ADR-268 promised. Text survives only as a label, and a guard test keeps it that way.

**Constrains.**
- No code parses `GrammarRule.pattern`, or a manifest shape string, to recover structure. A guard test enforces it over `packages/if-domain/src/grammar`, `packages/parser-en-us/src`, `packages/story-loader/src` and `packages/chord/src` (acceptance 7).
- Chord imports `@sharpee/if-domain` types only.
- A new pattern construct in Chord lands in the pattern module and in `PatternElement` together, or it cannot reach the matcher.
- A future change to grammar registration in the loader goes through `lowerActionRules`; it never adds a second walker.
- Step 3's seat declaration joins `CompiledSlot` and `GrammarRuleSpec.slots`.

**Cost.**
- `fullPattern` is deleted, and so is the `forAction` family (ADR-087's action-centric builder).
- `GrammarRule` gains `parts`.
- `PatternCompiler` changes shape.
- `removeRules` changes signature.
- `grammar.ts` is regenerated.
- The registration-order fix may move a rule in a pinned transcript, which is a content decision for David.
- The genai API reference regenerates.

**Unchanged.**
- The IR (`IRPatternPart`, `IRActionDef.greedy`), so the IDE decoder and the protocol generator are untouched.
- The EBNF and `CHORD_LANGUAGE_VERSION`. No construct is added or changed in what Chord accepts, except that a constraint on an optional slot now takes effect, which gets a `chord-grammar-changes.md` row.
- `define(text)` for TS stories, and `platform-grammar.ts`, which uses it.
- ADR-268's resolution order.

**Amendment notes on the records this changes.** Each note is one line under the decision it replaces, pointing here; the original text is never edited. The plan phase that deletes a surface writes its note in the same commit: ADR-270 D3 (removal identity) in the phase that makes removal structural; ADR-271 D3 (`fullPattern`) and ADR-087's action-centric builder (`forAction` and its methods) in the phase that deletes them. The plan's close-out phase checks that all three notes exist before the plan is marked DONE.
- ADR-267 D12.

## Acceptance criteria

1. A Chord action `poke [the target]` with `the target must be held` matches `poke coin` with the coin held, seats the coin as the direct object and renders its phrase; `poke lamp` with the lamp unheld does not match the story rule. Run on the bundle and through `./sharpee test`. *(D4, B1)*
2. `define('[look at] :x')`, `define('look [at :x')`, `define('look at] :x')` and `define('look [] :x')` each throw `PatternSyntaxError` with an offset. *(D3, B4)*
3. The same pattern written as text and as parts yields identical `CompiledPattern.slots`; `put :items in :item` yields two slots; a constraint or type naming a slot the pattern lacks throws. *(D3, D4)*
4. One pattern renderer and one directions expander exist in the repository, both in chord's pattern module; a grep for the deleted functions finds none. *(D5, B5)*
5. `remove from action taking: get the thing` passes the analyzer and removes `get :item` at load; a removal matching no shape still reports `analysis.unmatched-removal-pattern`. *(D6, B6)*
6. An action whose lines alternate between two `means` groups registers its rules in written order. The before-and-after registration dump over Dungeo and every Chord story is produced, and each difference is classified. *(D7, B7)*
7. A guard test fails if any file in the paths named under Consequences splits, regexes or `startsWith(':')`-scans a rule's pattern text or a manifest shape string. It is shown failing once against a re-introduced scan. *(Consequences)*
8. Chord imports nothing from `@sharpee/if-domain` except types (a chord unit test). *(D1)*
9. The Dungeo chain and every Chord tree pass at each implementation phase, with recordings unchanged unless David rules a classified order difference. *(D7)*
10. An acting statement whose words fit a standard shape only through an optional element (`the guard looks at the door` against `look [carefully] at :target`) is matched with its slot bound. It is probed before the change, to record whether it is refused today. *(D6)*

## Session

Session f12dc9, 2026-10-23, `chord-4-0`. Plan: `docs/work/parser-review/plan-20261023-step2-structured-seam.md`, Phase 1.
