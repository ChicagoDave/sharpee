# 5.5.0 — Chord 4.0: the kind leads, vehicles, locks, and a parser that searches

**Status**: PENDING PUBLISH
**Published**: PENDING PUBLISH
**Chord language**: 4.0.0
**Traces to**: ADR-355 · ADR-356 · ADR-357 · ADR-359 · ADR-360 · ADR-361 · ADR-362 · ADR-365 · ADR-366 · ADR-367 · ADR-368 · ADR-369 · ADR-370 · ADR-371 · ADR-372 · ADR-373 · ADR-374 · ADR-375 · ADR-376 · ADR-377 · ADR-378 · ADR-379 · ADR-380 · ADR-382 · ADR-383 · ADR-384 · ADR-385 · ADR-386 · ADR-387 · [#633](https://github.com/ChicagoDave/sharpee/pull/633) · [#549](https://github.com/ChicagoDave/sharpee/issues/549) · [#507](https://github.com/ChicagoDave/sharpee/issues/507) · [#560](https://github.com/ChicagoDave/sharpee/issues/560) · [#570](https://github.com/ChicagoDave/sharpee/issues/570)

> DRAFT (2026-10-26, session 63b2a2). This file moves to `docs/releases/release-5.5.0.md` the day the
> npm publish of 5.5.0 lands, with `**Status**: PUBLISHED` and the registry's date; until then
> `docs/releases/README.md` admits no file for it. Derived from `git log f6c27d1ba..a9e3c226c`
> (the 5.4.1 cut to the 5.5.0 cut): 170 commits on main and the 130 of the `chord-4-0` branch.

## What shipped

Chord moves to 4.0.0, its first major since 3.0.0, and the platform under it to 5.5.0. The
language change an author meets first is the one that made it a major: every `create` block names
its kind, and the kind leads the block (`a thing`, `a room`, `a container, openable`); the three
"hatch" forms that let a story reach into TypeScript are gone; a region declares its rooms instead
of nesting them. On that footing the language gains a vehicle kind with six movement models, with
sailing and open-field expanses as extensions on top of it; passages named by a command and exits
that exist while a condition holds; backdrops, night vision and listeners; things that are
attached, breakable or lit; two-noun and conversation-shaped clauses; and a dozen stock verbs that
needed no object. State machines are core. A test tree can lock a reached state as a claim, and
the lock proposes the necessary set from the line that reached it. Underneath, the English parser
was reviewed end to end and rebuilt in seven steps: it searches slot extents and ranks readings by
their nouns, every slot carries a declared seat, confidence is gone from ranking, one noun matcher
answers every "which thing is this" question, and every English word the parser used to carry
lives once, in the language package, with each parser instance owning its own state.

## Details

- **Every `create` block names its kind, and the kind leads the block** (ADR-359). `thing` is a
  kind; a block without one is `analysis.missing-kind-noun`; a kind behind a trait is
  `analysis.kind-not-first`. The inline form `create the Potting Shed, a room` is admitted.
- **Hatches are removed** (ADR-361): `define text … from`, `define action … from` and
  `define chain … from` are parse errors with fix-its; every Chord story is pure IR.
- **A region declares its rooms** (ADR-360): `rooms` groups and `in` membership replace
  `containing` and nesting; the heading loses its region part; a region exit table.
- **Blocks fold for density** (ADR-362): `create <name>, <composition>` and `exits:` /
  `exits, one-way:` lines.
- **The vehicle is a kind with a movement model** (ADR-366): line, streets, flight, compass, open
  and none; `admits`, `to outside`, boarding, the driving statements and predicates; UPPS's
  conveyances are vehicles. **Sailing** (ADR-375, `use sailing`: bearings in degrees, the naval
  commands, wind and sails) and **expanses** (ADR-376, `use expanses`: open movement on
  coordinates, landmarks, drift, edges, `start <vehicle> heading <direction>`) extend it.
- **State machines are core** (ADR-377): `define machine` needs no `use` line; writing
  `use state-machines` is a compile error that says so.
- **Passages and hidden exits** (ADR-378, ADR-380): a passage is a block with a grammar
  (`passage to <room> … end passage`, with `while`, `blocked` and `deadly` lines), an exit exists
  while a condition holds, `admits` on the way, a thing's own `pushing` block moves it between
  rooms; a flight's trip time is its `pace:`; `[the]` in a pattern.
- **Systems are domain services** (ADR-379): one question, one home, every mover — traversal and
  visibility answer the walking player, a vehicle, a pushed thing and an NPC alike.
- **A clause head lists its gerunds** (ADR-368): `on the player taking, touching`.
- **Containers say what they show and hold** (ADR-369): `transparent`; `holds <n>` is the one
  spelling of capacity; `in` and `out` are exit directions.
- **Stock verbs without an object side** (ADR-370): kissing, waving, jumping, saying yes / no /
  sorry, looking under, emptying.
- **Object-side adjectives** (ADR-371): lowering and raising take the clause body as their
  implementation; `flammable [with the <tool>]` gates burning; `settable` makes a thing's
  reversible states a dial and a `setting` head takes `to <value>`.
- **Two-noun and conversation-shaped clauses** (ADR-372): a head names its counterpart
  (`on the player throwing at the sorting machine`); `ask <person> for <thing>` is a request;
  a readable thing carries `define topics` and answers `consult`; `costs <n> <currency>` prices a
  thing and gates buying.
- **Physical state the platform enforces** (ADR-373): `attached to` / `detachable`; `breakable`,
  `fragile`, `starts broken`, `broken` as a state and `after the player breaking`; tying is a
  stock action.
- **Scope and senses** (ADR-374): a backdrop is one scenery thing in many rooms; `night-vision`,
  `can see` and `can reach` read the platform; `listener`, `after hearing the <sound>`,
  `define sound` without a file; lamps (`light`, `put out`, `light-source with`, `starts lit`,
  `powered by`); `dark` is reserved as a state name off rooms; `play sound` is never gated on the
  client.
- **A reached state can be locked as a claim** (ADR-367): `sharpee claim <line> "<fact>"` proposes
  the necessary set from the played line trimmed by the cone of influence, writes the claim and
  pins the card; a broken lock is a failed card named in the claim's words. **Claims under a
  necessary set** (ADR-365) prune the explorer to the winning path; a claim's `needs` is checked
  against the predicate's cone (`analysis.claim-inert-needs`).
- **The test tree is segmented on disk** (ADR-355): `<story>.tests/` with a manifest, a canonical
  gate and stable card ids. **Derived rule tests** (ADR-356): `arrange()`, END STATE cards prove
  endings, `sharpee test` reports branches, endings and rooms, and the derived runner reaches every
  noun a command names (#549). The IDE's Testing tab keeps stale results instead of dropping them,
  names each failed card's cause, and walks failures one stop at a time (ADR-357).
- **The parser review** (ADR-382 to ADR-387), seven steps: a grammar rule crosses from Chord to
  the matcher as structured parts, never as text to re-split, and `→` cardinality is refused until
  it is real (382); every slot declares its seat, so `hand the recipient the item` and
  `give the item to the recipient` seat alike and a missing object is asked for by its seat (383);
  rules rank by literal specificity, tier and definition order, and confidence is gone (384); one
  noun matcher serves the parse-time gate, the validator and list expansion, articles and
  determiners are split once, a pronoun is a whole item, and a gate failure names the phrase and
  the reason (385); the parser searches slot extents and ranks readings by their nouns, so
  `give the old man the sword`, `put jack in the box in chest` and `take salt and pepper shaker`
  read right, `and` and a comma are list readings, and `unlock door with` asks for the key (386);
  one word table per language owns articles, determiners, self words, list separators, manner
  adverbs, directions and number words, the possessive is by person (`your lantern` is the
  player's own in the second-person voice), the parse-failure sentences are the language's, and a
  parser instance owns its vocabulary and pronoun context — two parsers in one process share
  nothing (387).
- **Not in this release**: ADR-381 (connectors replace attachment) is accepted but its cutover has
  not landed; `attached to`, `detachable` and the tying actions still ship as ADR-373 describes
  them above.
- **Smaller platform fixes on main**: the location heading rides one wire (ADR-349); a chapter's
  title announces before the room (ADR-330 D4); the repokit bundle resolves `@sharpee/*` through
  exports maps (#542); pin verdicts name entities by display name (#533); `X.location = offstage`
  holds for an entity in no place (#548); the Secret Letter port's platform fixes land (#543).

## Upgrading

Breaking for stories, each with a diagnostic that names the fix:

- A `create` block without a kind, or with a trait before the kind, stops compiling (ADR-359):
  add `a thing` (or the kind) as the first line under the name.
- `define text|action|chain … from "<module>"` stops compiling (ADR-361): write the text as a
  `define phrase` with a strategy, the action as a `define action` block.
- `containing` and nested regions stop compiling (ADR-360): a region's `rooms` group lists its
  rooms; a room's membership is `in <region>`.
- `use state-machines` is an error (ADR-377): remove the line; `define machine` is core.
- A vehicle's `passage:` line becomes a `passage … end passage` block (ADR-380); a flight's time is
  `pace:`.
- `with max items N` and `with max weight N` are gone (ADR-369): `holds <n>`.

Breaking for TypeScript consumers of the platform packages:

- `IParseError` loses `message` and gains `params`; the engine renders a parse failure through the
  language provider (ADR-387 D3).
- The `vocabularyRegistry` singleton, `setPronounContextManager` / `getPronounContextManager`,
  the engine's `VocabularyManager`, `updateEntityVocabulary` and `updateScopeVocabulary`, and
  stdlib's `parser` re-export are removed (ADR-387 D4): a parser owns its registry and pronoun
  context; import `Parser`, `ParserFactory` and `Token` from `@sharpee/if-domain`.
- `ParserLanguageProvider` gains `getListSeparators`, `getMannerAdverbs`, `parseCardinal`,
  `getOrdinalNumbers`; `getDeterminers` returns each determiner with its possessive person;
  `LanguageProvider.getNarrativePerson` and `getLanguageWords` are required (ADR-387 D1, D2). A
  provider that lacks a getter fails to compile; nothing falls back to English.
- `WorldModel.setLanguageWords` must be called before a name is derived; `installStory` does it.
  A test that builds a bare `WorldModel` adds the line (ADR-387 D2).
- `GrammarMatch.confidence`, `experimentalConfidence` and `minConfidence` are gone (ADR-384);
  `GrammarBuilder.rule(spec)` takes structured parts (ADR-382); every entity slot carries a `seat`
  (ADR-383).
