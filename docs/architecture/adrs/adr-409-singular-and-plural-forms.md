# ADR-409: Every thing is declared singular or plural; plain forms are worked out by a few suffix rules, and the author writes the rest

**Planning**: OPEN

**Summary**: Every Chord thing, person and door is declared `singular` or `plural`. Its other form either comes from a handful of English suffix rules, applied once at compile time to the name's last word and to each aka word (`candles`↔`candle`, `jar`↔`jars`, `box`→`boxes`, `berry`→`berries`), or is written by the author (`plural of cactus`, `singular of mice`). The analyzer refuses a bare declaration on endings the rules cannot handle safely (`shelf`, `potato`, `cactus`, `houses`). There is no dictionary and no word list. The rules are locale data in lang-en-us, carried to chord through the stdlib manifest. The IR carries every form, and a written form outranks a worked-out one. The runtime matcher works nothing out. GH #836's `examine candle` works with a bare `plural`. This bears on Chord (4.2.0), the manifest's locale facts, the story loader, world-model's naming surface and noun ranking, world-index, the examinable lens, `lemmatize`, and every in-repo `.story` file.

**Status**: **ACCEPTED** (David, 2026-11-24, session 4a60b3: "yes", to "mark ADR-409 ACCEPTED?". This came after the open-questions interview and an `adr-review` that went from 17/22 to 22/22 once four findings were folded in: the interface shapes, the module list, the restated collision evidence, and the owner of the notes on other records. The review's two further findings, stopword names and proper names, were folded the same way.) Acceptance does not authorize the `packages/` work. The implementing plan's phases each need David's explicit go.

**Amended**: Amendment 1 (2026-11-24, session 4a60b3, David: "a", after "this is an effort to make the IDE v1.0.0 worthy") adds D7 and AC-9 to AC-12: Chord Writer surfaces the forms.

**Date**: 2026-11-24

**Kind**: technical

**Scope**: packages/lang-en-us, tools/repokit, packages/chord, packages/story-loader, packages/world-model, packages/stdlib, packages/parser-en-us, packages/world-index, packages/branch-tester, packages/ide-protocol, packages/devkit, packages/if-domain, packages/engine, tools/ide/web/testing-surface, tools/ide/SharpeeIDE, tools/ide/SharpeeIDETests, tools/ide/PaneHost, tools/ide/PaneHost.Tests, stories, branch-stories, test-stories

Within those paths:
- packages/lang-en-us: `src/data/words.ts` (the suffix rules); `src/language-provider.ts` (D6);
- tools/repokit: `src/commands/manifest.ts` (carries the rules);
- packages/chord:
  - `src/stdlib-manifest.ts` (generated);
  - `src/catalog.ts` (`singular`);
  - the parser's `of <form>`;
  - the analyzer's declaration gate and rule application;
  - `src/ir.ts` (the forms);
  - `src/version.ts` (to 4.2.0);
- packages/story-loader: `src/build/trait-routes.ts`, `src/build/entity.ts`;
- packages/world-model: `src/traits/identity/identityTrait.ts`, `src/traits/identity/noun-match.ts`;
- packages/stdlib: `src/validation/command-validator.ts` (D4);
- packages/parser-en-us: `src/reading-names.ts` (D4);
- packages/world-index: `src/vocabulary.ts`;
- packages/branch-tester: `src/lens/`;
- the `singular-plural` kind id (D5): packages/ide-protocol (`src/lens-output.ts`, `src/run-events.ts`), packages/devkit (`src/commands/lens-sources.ts`), tools/ide/web/testing-surface, and both heads' generated protocol;
- packages/lang-en-us: `src/assembler/english-assembler.ts`, the renderer that reads `pluralForm` before `pluralize`, which is unchanged but now reached by Chord things;
- packages/if-domain: `src/parser-language-provider.ts` (D6);
- the `lemmatize` fakes in the parser-en-us, stdlib and engine tests;
- the Chord grammar docs blocks, and the Chord pin in both Chord Writer heads;
- every `.story` file in `stories/`, `branch-stories/` and `test-stories/`, but not the pinned `tutorials/*/chord-v4.1.0/` editions.

## Context

A thing answers only to the singular or plural its name and aka words are written in. GH #836 records The Relighting's candles:

```
create the candles
  aka prickets
  a thing, scenery, plural, light-source, starts unlit, wick
```

(`tutorials/relighting/chord-v4.1.0/chapter-40/relighting.story:767`). `examine candles` works, and `examine candle`, `take candle` and `take pricket` print "You can't see any such thing." Closed issue 512 is the same gap the other way: Secret Letter's `examine support posts` fails on a "support post". Players type either.

What the code does now (measured 2026-11-24 at 4560c4811, `docs/work/thing-answers-both-numbers/census-20261124.md` §2):
- **The matcher.** The one noun matcher (`packages/world-model/src/traits/identity/noun-match.ts`, ADR-385) matches the name, alias and adjective words as written. ADR-385 D2 says: "It does not recognise plurals."
- **Chord's marker.** Chord's only marker is the optional `plural` adjective (`packages/chord/src/catalog.ts:46`), and leaving it off silently means singular. `plural` sets `IdentityTrait.grammaticalNumber`, the existing field that picks "it" or "them" (ADR-089), and does nothing else (`packages/story-loader/src/build/trait-routes.ts:368`).
- **The rendering plural.** `IdentityTrait.plural` (ADR-190) is an author-supplied plural for rendering, which only TypeScript can set. It has no singular counterpart.
- **Locale words.** These reach chord as data. lang-en-us's words are generated into `packages/chord/src/stdlib-manifest.ts` (`StdlibLocaleFacts`: articles, self words, name stopwords) by `./repokit manifest` (`tools/repokit/src/commands/manifest.ts`). That is how chord reads `nameStopwords` with no English code (ADR-387 D2).

The interview went through three positions before arriving at this design.
1. **Derive both forms of every word at match time** from lang-en-us's `singularize`/`pluralize` (the first draft). The census over 195 stories found 1,060 worked-out forms equal to another entity's written word, Dungeo's control panel `buttons` against four "… button" things among them. It also found that English's full rules go wrong: `staff → stafves`, `roof → rooves`, `bookshelves → bookshelve` (#842).
2. **Derive nothing; the author writes every form** (David: "it's too complicated to ensure success with derived meanings"). Then David pointed out that "some pluralizations are obvious and some are not — can't we differentiate?", and added "I don't want to embed an entire dictionary into this".
3. **This record:** a few suffix rules for the obvious cases, the author for the rest, and no word list.

## Decision

### D1 — Singular or plural is declared on every thing, person and door

*(David, 2026-11-24, session 4a60b3, in the open-questions interview: "We should force the author to specify singular or plural", then "I just meant plural/singular — word numbers and undefined counts are up to the author… and if it's a group that can be examined and not taken, that's also on the author"; Q-9: "a", "a".)*

- **The adjective.** Chord gains `singular` beside `plural`. The analyzer refuses a thing, person or door that declares neither, and one that declares both. `singular` sets `IdentityTrait.grammaticalNumber = 'singular'`, as `plural` sets `'plural'`.
- **Not rooms or regions.** Rooms and regions are named by movement, `look` and grammar such as `ah`, not the examine path. The analyzer refuses the declaration on them. A person carries it beside `proper` where it has one. Rejected:
  - requiring it on rooms and regions, which gives every room a meaningless form;
  - requiring it on things only, which leaves `the guards` with no singular.
- **TypeScript is unchanged.** `IdentityTrait.grammaticalNumber` stays optional, and unset reads as singular. A TypeScript author gives forms by setting `IdentityTrait.singular` or `IdentityTrait.plural` (D3). ADR-214 is met because both surfaces can express the capability. Rejected:
  - a type-level requirement, which would mean a mass edit of every TypeScript entity and fixture;
  - a runtime check in `createEntity`, which moves an authoring check into the engine.

  Dungeo does not move.
- **What stays the author's.** Mass nouns and uncountables (`water`, `sand`), where the author picks what the prose uses. Word numbers (`three coins`), and undefined counts. A group examined but not taken, which is `scenery` with a `plural` name, as scullery's jars are. Counted, interchangeable things (`take 3 candles`) stay ADR-147's, which is unbuilt.

### D2 — Plain forms come from a few suffix rules; no dictionary

*(David, 2026-11-24: "some pluralizations are obvious and some are not — can't we differentiate?", "I don't want to embed an entire dictionary into this", then "a", aka words included.)*

**The English rules.** They are applied to one word: the name's last word (`bee smoker` → `bee smokers`), or an aka word's last word.

The last word is the head only when no stopword stands between content words. A name or aka word with one of the locale's `nameStopwords` inside it, such as `pot of gold` or `bag of coins`, has its head first. So it counts as unsafe, and the rule does not touch it. That reads the existing stopword data and adds no list.

A `proper` person gets no worked-out form, so Wren does not answer to `wrens`.
- **Making a plural:**
  - after `s`, `x`, `z`, `ch` or `sh`, add `es` (`box` → `boxes`, `torch` → `torches`);
  - after a consonant, a final `y` becomes `ies` (`berry` → `berries`);
  - otherwise add `s` (`candle` → `candles`, `jar` → `jars`).
- **Making a singular:** drop the final `s` (`candles` → `candle`, `crocks` → `crock`).
- **Unsafe endings** have no rule.
  - Singular words ending in `f`, `fe`, `o`, `us` or `is` (`shelf`, `staff`, `potato`, `cactus`, `crisis`).
  - Plural words ending in `ses`, `xes`, `zes`, `ches`, `shes`, `ies`, `ves` or `oes`, or in `ss`, `us` or `is`, or not ending in `s` at all (`houses`, `boxes`, `movies`, `shelves`, `glass`, `mice`, `people`). For those, the rule cannot tell the singular.

**What a bare declaration does.**
- **On the name.** A bare `plural` or `singular` takes the rule's form for the name's last word. On an unsafe ending the analyzer refuses it with a diagnostic naming the fix: "write `plural of <singular>` (or `singular of <plural>`); the rule cannot tell the other form of `houses`."
- **On aka words.** Each aka word whose last word has a safe ending gets its other form by the same rule (`aka prickets` also answers to `pricket`). An aka word with an unsafe ending answers only as written, and the author adds its other form to aka if they want it. The analyzer does not refuse it.

**What the rules cannot know.** With no word list they cannot know an irregular that looks regular: `mouse`, `man`, `child` and `sheep` give `mouses`, `mans`, `childs`, `sheeps`. That costs one wrong extra form nobody types, and the right form is missing. The author writes `singular of mice`, `singular of men` or `singular of sheep` (D3). The author's rule is one line: **a bare declaration works for plain `s`/`es`/`ies` words; for anything else, write `of`.**

This replaces the interview's earlier Q-10 ruling ("a", `of` required on every thing), which was given while nothing was to be worked out. A thing still always has its other form, either worked out or written.

**Where the rules live.** They are lang-en-us's, as data, in `packages/lang-en-us/src/data/words.ts` (ADR-387 D1). `./repokit manifest` carries them into `StdlibLocaleFacts` beside `nameStopwords`, as:

```ts
interface FormRules {
  /** Rewrites tried in order; the first whose `ending` matches applies. */
  readonly toPlural: readonly FormRewrite[];
  readonly toSingular: readonly FormRewrite[];
  /** Endings with no rule: a bare declaration on them is refused. */
  readonly unsafeSingularEndings: readonly string[];
  readonly unsafePluralEndings: readonly string[];
}
interface FormRewrite {
  /** The word's ending; `""` matches any word. */
  readonly ending: string;
  /** Letters the ending must follow, when the rule needs them (`y` after a consonant). */
  readonly after?: readonly string[];
  /** How many letters of the word to drop, then what to add. */
  readonly drop: number;
  readonly add: string;
}
```

`StdlibLocaleFacts.formRules: FormRules`. A plural word that does not end in any `toSingular` ending is unsafe by having no matching rewrite. The analyzer applies whatever rules the story's locale declares, so chord holds no English and a new locale brings its own rules. lang-en-us's `singularize.ts` and `pluralize.ts` are not these rules and are not read by them. They are the lens's and rendering's concerns (D5, Consequences).

**Applied once, at compile time.** The analyzer writes every form into the IR, marking each one as written by the author or worked out by a rule:

```ts
type FormOrigin = 'written' | 'worked-out';
interface IREntityForms {
  /** The name's other form: worked out (D2) or written (D3); a thing, person or door always has one. */
  readonly name: { readonly form: string; readonly origin: FormOrigin };
  /** Worked-out other forms of aka words. Written aka words stay in `aka`. */
  readonly aka: readonly { readonly word: string; readonly form: string }[];
}
// IREntity gains `forms?: IREntityForms` (absent on rooms and regions)
```

Nothing is worked out at load or at match time:
- the story loader copies the forms onto `IdentityTrait`;
- `namingSurfaceOf` reads them;
- world-index reads them from the IR (`irNamingSurface`), so Swift's `WorldVocabulary` still reads only what it is given (ADR-321 D11).

### D3 — The author writes any form: `plural of <singular>`, `singular of <plural>`

*(David, 2026-11-24, Q-3: "the author should be able to define both ways"; the syntax: "a reads the best".)*

```
create the candles
  aka prickets
  a thing, scenery, plural, light-source, starts unlit, wick
  in the Refectory

create the cacti
  aka succulents
  a thing, scenery, plural of cactus
  in the Greenhouse

create the mouse
  a thing, singular of mice
  in the Larder

create the bookshelves
  a thing, scenery, plural of bookshelf
  in the Study
```

The candles take the rules: `candle` and `pricket` are worked out. The others are written.

- **Shape.** `of` takes one name, which may be several words (`plural of bee smoker`). It follows the pattern of `attached to <the thing>`, and is always allowed as an override. The analyzer refuses an `of` with no form after it.
- **One fact for matching and rendering.**
  - On a `plural` thing the name's other form, written or worked out, sets a new `IdentityTrait.singular?: string`.
  - On a `singular` thing it sets ADR-190's `IdentityTrait.plural?: string`, so lists render "two cacti". The assembler already reads it as `pluralForm` before `pluralize` (`packages/lang-en-us/src/assembler/english-assembler.ts:351`).
  - A new `IdentityTrait.nameFormOrigin?: 'written' | 'worked-out'` records where that form came from. Unset means written, which is what a TypeScript author who sets `singular` or `plural` gets.
  - Worked-out aka forms go to a new `IdentityTrait.akaForms?: readonly { word: string; form: string }[]`. These are kept apart from `aliases` so D4 can rank them. `akaForms` is the loader's.
- **On the surface.** `NamingSurface` gains `writtenForms: readonly string[]` and `workedOutForms: readonly string[]`, both filled by `namingSurfaceOf`:
  - `writtenForms` is the name's form when its origin is written.
  - `workedOutForms` is the name's form when its origin is worked out, plus every `akaForms` form.
  - A written form joins the surface as an alias does: the exact tier as a whole phrase, and the words tier word by word. A worked-out form answers at the words tier only (D4).

### D4 — A written form outranks a worked-out one

*(David's Q-1 ruling, 2026-11-24: "a", given for the first draft's derivation. He confirmed it for D2's compile-time forms under Q-12: "a".)*
- **The tiers.** Worked-out forms answer at the words tier only, never the exact tier.
- **Ranking.** A match whose words are all written outranks one that needs a worked-out form, applied the way `wordsMatched` is today: in the validator's dominance (`packages/stdlib/src/validation/command-validator.ts`) and the parser's noun rank (`packages/parser-en-us/src/reading-names.ts`). `NounMatch` gains `workedOutWords`.
- **Effect.** A worked-out form only fills a gap. A phrase that names something today names the same thing afterwards wherever both are in scope.
- **Why the rule is needed.** The census measured collisions under full derivation, `numberForms` on every name and aka word. That run, `node scratchpad/census/census.js` on 2026-11-24 (census §3a), found 1,060 collisions in the Chord stories: Secret Letter 673 and the 43 Relighting chapters 133. D2's rules reach a subset of those words, because unsafe endings and stopword names are excluded. Phase 2's census re-measures under D2's rules, and the rule holds whatever that count is.
- **No group rule.** A plural typed against several singular things is ordinary disambiguation. *(David, Q-4: "why do anything?")* A group is the author's: a scenery thing with `aka buttons` outranks every button that only works out `buttons`.

### D5 — The examinable lens's finding names what to write

*(David, Q-5: "a", keep the finding and have it name the fix. Q-11: "a", rendering and the lens may use lang-en-us's full `singularize`/`pluralize`, while the matcher reads only stored forms. Rejected under Q-11: limiting the lens to D2's rules, which would leave it unable to suggest irregulars or unsafe aka forms.)* The lens's existing `number-form` finding is retitled from "Number form" to "Singular/plural" (`packages/branch-tester/src/lens/lens-words.ts`). Its kind id `number-form` becomes `singular-plural` in `packages/ide-protocol/src/lens-output.ts` and `run-events.ts`, in the lens, in devkit's `lens-sources.ts`, in the Testing tab, and in both heads' generated protocol. It now fires where the prose uses a form no rule and no author gave:
- an unsafe-ending aka word in its other form;
- an irregular the rules got wrong (`mice` against `mouse`).

It reads its guess from lang-en-us's `singularize`/`pluralize` (ADR-407 D5), which is a suggestion to the author that the runtime never reads. Its wording names the fix: "the prose says `mice`; write `singular of mice`" or "add `pricket` to aka".

### D6 — `lemmatize` leaves the provider contract

*(David, Q-7: "a".)* `lemmatize` is a stemmer (`candles → candl`, `shed → sh`) with no runtime caller (ADR-407 Amendment 4). It is deleted from `ParserLanguageProvider` (`packages/if-domain/src/parser-language-provider.ts`) and `EnglishLanguageProvider` (`packages/lang-en-us/src/language-provider.ts`), along with:
- its tests in `packages/lang-en-us/tests/language-provider.test.ts` and `text-processing.test.ts`;
- the fakes in `packages/parser-en-us/tests/unit/english-parser.test.ts`, `packages/stdlib/tests/unit/parser/parser-factory.test.ts` and `packages/engine/tests/story-testing-verification.test.ts`;
- the mentions in `singularize.ts`'s header and `singularize.test.ts`.

#839 closes with this change.

### D7 — Chord Writer surfaces the forms (Amendment 1)

*(Amendment 1, David, 2026-11-24, session 4a60b3, after acceptance. Reminder: "this is an effort to make the IDE v1.0.0 worthy". Then "a", all four of the following.)* Both Chord Writer heads, SharpeeIDE and PaneHost, ship each of these. A capability in one head only is not done (ADR-408 D1).

1. **The pin moves with the language.** Both heads' Chord version check and lexer corpus move to 4.2.0 in the same phase as the grammar, never after it. Chord Writer never refuses a story the toolchain accepts, and `singular`, `plural` and `of` are highlighted.
2. **The refusal carries a fix, and Chord Writer applies it.**
   - Chord's `Diagnostic` (`packages/chord/src/diagnostics.ts`) gains an optional, generic `fix` field, which other diagnostics may use later:

     ```ts
     fix?: {
       label: string;
       edits: readonly { span: Span; text: string }[];
     }
     ```

   - The analyzer attaches it to the bare-declaration refusal (D2), with the edit's span on the declaration and a placeholder form. Chord holds no English.
   - devkit's `compose`, which both heads run (`compose --json`, ADR-258 D5), holds the story's language. It fills the placeholder with lang-en-us's suggestion from `singularize`/`pluralize`: `plural of house` for `houses`. The suggestion is the author's to accept or edit (D5's rule: a suggestion, never read by the runtime).
   - The field rides the compose payload in `@sharpee/ide-protocol`, regenerated into both heads (`./repokit protocol`).
   - Each head offers the fix on the diagnostic in the editor. **Fix all** applies every such fix in the story at once, which is what an author opening a 4.1.0 project in 4.2.0 meets on day one.
3. **The World Index shows what a thing answers to.** Each thing's entry lists its name, its aka words and its forms, with worked-out forms marked as such (`jar`, worked out from `jars`). It reads `IREntity.forms` from the published surface, and works nothing out in Swift or C#. An author sees the rule's work without running the game.
4. **The lens card offers the edit.** A "Singular/plural" finding card (D5) already selects its phrase (ADR-408 D9). It also offers the edit its wording names (`singular of mice`, or adding `pricket` to aka), using the same edit shape as item 2.

Acceptance: AC-9 to AC-12 below.

## Acceptance Criteria

- **AC-1.** The analyzer, pinned in chord's tests:
  - refuses a thing, person or door declared neither or both;
  - refuses the declaration on a room or region;
  - refuses an `of` with no form;
  - refuses a bare declaration on an unsafe name ending, with the `of` fix in the message. Each unsafe class has a case: `shelf`, `potato`, `cactus`, `houses`, `movies`, `shelves`, `mice`, and the stopword name `pot of gold`.
- **AC-2.** The analyzer writes worked-out forms into the IR, each marked as worked out: `candles` → `candle`, `jar` → `jars`, `box` → `boxes`, `berry` → `berries`, `bee smoker` → `bee smokers`, and `aka prickets` → `pricket`. A written `of` form is marked as written. An unsafe aka word gets no form, and neither does an aka word with a stopword inside it (`aka bag of coins`). A `proper` person declared `singular of Wrens` carries only that written form, and a bare-declared proper person is refused like any unsafe name, because it gets no worked-out form. The rules are read from the locale facts, and a test locale with different rules gives different forms.
- **AC-3.** `./repokit manifest --check` holds the rules as lang-en-us declares them. `tests/one-home.test.ts` covers their one home in `data/words.ts`.
- **AC-4.** Through the real loader, the forms land on `IdentityTrait.singular`, `.plural`, `.nameFormOrigin` and `.akaForms` as AC-2 describes. world-model's `noun-match` tests pin:
  - a written form at both tiers;
  - a worked-out form at the words tier only;
  - a written match outranking a worked-out one (`buttons` beside a thing with `aka buttons` and things named "… button" resolves to the aka thing alone);
  - a TypeScript entity with `IdentityTrait.plural` set answering to it.
- **AC-5.** Through the CLI bundle at seed 42, on a test story whose test set calls for it (ADR-395 D4):
  - `examine candle` and `examine pricket` emit the examined event for a bare-`plural` "candles" with `aka prickets`;
  - `examine mice` emits it for a `singular of mice` mouse.
- **AC-6.** world-index's `resolvePhrase` resolves both kinds of form from the IR and agrees with `matchNoun`.
- **AC-7.** The Dungeo walkthrough chain prints 949 passed. The unit transcripts at `--seed 42` print 1715 passed, with the census baseline's 10 failures and 2 seed refusals. Dungeo is TypeScript, so nothing is worked out for it.
- **AC-8.** No English rule appears in chord, story-loader, world-model, if-domain or world-index source. The rules arrive as locale data. The Relighting's published `game.js` size is recorded against 1,971,327 bytes.
- **AC-9 (D7.1).** Both heads accept a Chord 4.2.0 story. Their version-check tests and lexer-corpus tests pin 4.2.0, and the corpus covers `singular`, `plural of` and `singular of`.
- **AC-10 (D7.2).** Applying the fix leaves a source that compiles. This is pinned in three places:
  - `compose --json` on a story with a bare `plural` on "houses" carries a diagnostic whose `fix` edits the declaration to `plural of house`, in a devkit real-path test;
  - each head's test applies the fix, then fix-all over a multi-refusal story, and recompiles clean: an XCTest in SharpeeIDE and a PaneHost.Tests case.
- **AC-11 (D7.3).** Each head's World Index test shows the jars' `jar` marked as worked out and a `singular of mice` form marked as written, read from a real compose of a test story.
- **AC-12 (D7.4).** A Testing-tab test applies a lens card's edit, recompiles the story, and shows the finding gone on the next lens run.

## Consequences

- ADR-385 D2 stands for the matcher: it recognises a plural only when the plural is on the surface. A dated note there points here. The surface now carries forms the compiler worked out.
- **Every in-repo `.story` file needs the declaration on every thing, person and door** (D1), plus an `of` wherever the name's ending is unsafe (D2). There are 242 files, and 64 already use `plural`.
- **Chord 4.2.0, in Sharpee 5.8.0.** *(David, Q-9: "nope Chord 4.2.0 and sharpee 5.8.0".)*
  - A required declaration stops existing stories compiling, which ADR-257 D2 defines as a major. It ships as a minor, a recorded one-time override of D2 as 1.1.0 was (ADR-261 Consequences), and is cross-noted at ADR-257 D2.
  - `CHORD_LANGUAGE_VERSION` (`packages/chord/src/version.ts:406`) moves to 4.2.0, pinned by `tests/language-version.test.ts`.
  - Both Chord Writer heads' version check and the lexer corpus are bumped first.
  - The grammar docs blocks are regenerated and checked (`./repokit grammar --check`).
  - The platform moves to 5.8.0 at publish, not per landing.
  - **Migrated in the same change:** the test stories, the branch stories and `stories/*.story`. Each `of` form is written into the source and reviewed in the diff. The `chord-v4.1.0` tutorial folders stay the published 4.1.0 edition.
- **`StdlibLocaleFacts` gains the suffix rules.** The IR gains each entity's forms with their origin, and its format moves if the loader's wire-compat gate (`IR_FORMAT`, ADR-257 D3) needs it.
- **The lens kind id is renamed with the protocol** (D5: `number-form` → `singular-plural`, regenerated by `./repokit protocol`). The lens pins move with the migrated test stories: scullery's OB-56 and OB-58 and orchard's 6 (ADR-408 AC-1) are re-recorded.
- **Who writes the notes on other records.** After the implementing plan's Phase 2 gates pass, its closing phase writes dated notes in four places:
  - on ADR-257 D2, the one-time override;
  - on ADR-385 D2, that plurals come from forms on the surface;
  - on ADR-408 AC-1, the re-recorded pins and the renamed kind id;
  - on ADR-190, that `IdentityTrait.plural` is now also set from Chord.

  The same phase sets this record's Planning to IMPLEMENTED. No record is superseded.
- **Rendering.** `IdentityTrait.plural` and `.singular` now exist for every Chord thing, so rendering reads them before `pluralize`. `pluralize` remains the fallback for a TypeScript entity that sets none. #842 stays a separate fix to that fallback and to the lens's guesses.
- **Census validity.**
  - Still holds: its test-story finding (0 collisions) and its Dungeo finding (no moves, since Dungeo is TypeScript).
  - Still applies: its baseline (§1), against which the implementing plan's gates compare.
  - Measured under full derivation, so an upper bound for D2: its Chord-story collision counts. Phase 2 re-measures them.

## Session

Session 4a60b3, 2026-11-24, Phase 1 of `docs/work/thing-answers-both-numbers/plan-20261124-thing-answers-both-numbers.md` (GH #836). The interview moved through derivation at match time, then no derivation, then this design. The record of each step is in this session's summary.
