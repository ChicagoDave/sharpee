# A Story Language for Sharpee — external syntax + interpreter

> **SUPERSEDED (2026-07-10):** replaced by [`design.md`](./design.md), the givens-driven
> consolidated design. This sketch predates the seven givens and is kept for lineage only —
> its syntax (I7-flavored controlled English, `say`, explicit counters) does not reflect
> the current design.

**Status:** Design exercise (2026-07-10). No implementation. Third step in the
author-layer rathole: `docs/work/fluent/research-ideas.md` → `docs/work/fluent/dream-cloak.md`
→ this. The question: instead of (or on top of) a fluent TS layer, a completely
different syntax with an interpreter that transforms to Sharpee.

## 1. The reframe: the IR is the product, the syntax is a frontend

The moment story source stops being TypeScript, something must carry meaning between
the author's file and the engine. That something is a **Story IR**: a typed,
JSON-serializable, declarative model of a story — entities with traits, connections,
rules (event selector + condition + effects), text (with variants and markers),
vocabulary, endings, state declarations.

Once the IR exists, the language is just one frontend among several:

```
  .story file  ──parse──►┐
  fluent TS (dream-cloak)─►│                ┌─► runtime loader (generic Story impl
  IDE forms / map editor ─►│   Story IR ────┤      walks IR, calls platform APIs)
  LLM generation (ADR-116)─►┘                ├─► TS emitter ("eject" to fluent code)
                                             └─► introspection manifest (ADR-184) —
                                                  today's output format, now round-trippable
```

The dream-cloak exercise already produced the IR's semantic inventory without naming
it: the event-selector vocabulary (`player enters X`, `player reads Y`), the effect
vocabulary (`say`, `set`, `award`, `win`, `lose`), typed state, derived properties,
text variants. The fluent layer and the language are the same design wearing two
syntaxes. Nothing from step 2 is wasted.

## 2. Why this is more attractive for Sharpee than for most engines

1. **No-toolchain authoring.** Today an author needs node + npm + tsc + devkit. A
   `.story` file interpreted at load time needs a browser tab. The "Play It Now"
   playground (ADR-191) becomes: type in the left pane, play in the right pane,
   entirely client-side. This is the single biggest barrier-remover available.
2. **Multi-user hosting becomes safe.** zifmia running author *TypeScript* on a
   server is an arbitrary-code-execution problem. Running pure IR is data — fully
   sandboxable. Hosted stories could simply disallow TS escape hatches. (Multi-user
   is back at the design stage; this decision feeds it.)
3. **LLM generation becomes validatable** (ADR-116). A model emitting a constrained
   DSL/IR can be schema-checked, name-resolved, and behavior-tested before a human
   ever reads it. A model emitting free TypeScript cannot. Prompt-to-Playable gets
   dramatically more tractable with a closed target language.
4. **Platform evolution under stable stories.** `.story` files are data; the
   interpreter absorbs platform API changes. TS stories break when APIs move (we
   currently "don't care about backward compatibility" — a data format is how we
   eventually get to care cheaply).
5. **Authors already learn an embedded mini-language.** Phrase algebra markers
   (`{snippet:pins}`, ADR-209) and dynamic-text producers mean Sharpee prose already
   has syntax inside strings. The story language extends an idea authors meet anyway,
   rather than introducing the first one.

## 3. The syntax fork

Three families, one decision:

- **Free natural language (Inform 7 style).** Gorgeous, and a research project: NL
  parsing ambiguity, brittle error messages (I7's Problems pane represents a decade
  of effort), and tooling that fights every editor. Not recommended as the *grammar*,
  even though we should steal its *vocabulary*.
- **Controlled English blocks** — keyword-led lines with bare multiword names, prose
  as indented paragraphs, deterministic LL grammar. Reads aloud almost like I7,
  parses like a config language. **Recommended; sketched below.**
- **Config/data syntax (YAML-adjacent).** Cheapest to parse, most tool-friendly,
  least writer-friendly — prose lives in quoted strings again. The IR itself covers
  this niche (it *is* the data syntax); no need to make humans write it.

## 4. Dream Cloak, third form (`cloak.story`, ~75 lines)

```
story "Cloak of Darkness" by "Roger Firth (Sharpee implementation)"
  id: cloak-of-darkness
  version: 1.0.0
  blurb: A basic IF demonstration - hang up your cloak!

count disturbances starts at 0

room Foyer of the Opera House
  aka foyer, hall, entrance
  west to the Cloakroom
  south to the Foyer Bar
  north is blocked: "You've only just arrived, and besides, the weather
    outside seems to be getting worse."

  You are standing in a spacious hall, splendidly decorated in red and
  gold, with glittering chandeliers overhead. The entrance from the
  street is to the north, and there are doorways south and west.

room Cloakroom
  aka cloakroom

  The walls of this small room were clearly once lined with hooks,
  though now only one remains. The exit is a door to the east.

room Foyer Bar
  aka bar
  dark while the player has the velvet cloak

  The bar, much rougher than you'd have guessed after the opulence of
  the foyer to the north, is completely empty. There seems to be some
  sort of message scrawled in the sawdust on the floor.

the player
  starts in the Foyer of the Opera House
  wears the velvet cloak

  As good-looking as ever.

thing velvet cloak
  aka cloak
  wearable

  A handsome cloak, of velvet trimmed with satin, and slightly
  splattered with raindrops. Its blackness is so deep that it almost
  seems to suck light from the room.

thing brass hook
  aka hook, peg
  scenery, supporter (holds 1)
  in the Cloakroom

  It's just a small brass hook, screwed to the wall.

thing message in the sawdust
  aka message, sawdust, floor, writing
  scenery
  in the Foyer Bar

  description:
    when disturbances is 0
      The message, neatly marked in the sawdust, reads...
    when disturbances is under 3
      The message has been carelessly trampled, making it difficult to read.
    otherwise
      The message has been completely obliterated.

  reading it:
    when disturbances is 0
      You have won!
    when disturbances is under 3
      You can just make out: {garbled}
    otherwise
      The message is too trampled to read.

when the player enters the Foyer Bar in the dark
  increase disturbances by 1
  say "Blundering around in the dark isn't a good idea!"

when the player reads the message in the sawdust
  if disturbances is 0, win with "You have won!"
  if disturbances is 3 or more, lose with "The message has been trampled
    beyond recognition. You have lost!"

verb hang or hook means put (something) on (something)

text garbled comes from "./extras.ts"
```

**Grammar rules that keep this deterministic:**
- Entity declarations are `<kind> <bare name>` where kind ∈ {room, thing, person,
  door, …} maps to entity type + default traits (ADR-189 alignment).
- Inside a block, lines starting with a recognized keyword (aka, west/south/…, in,
  on, dark, scenery, wearable, when, if, …) are directives; the first bare indented
  paragraph is the description. Adjectives = traits, exactly the dream-cloak
  builder methods.
- Connections declared once are bidirectional (`one way` modifier to override).
- Names resolve with article stripping ("the velvet cloak" → `velvet cloak`);
  ambiguity is a compile error with a rename suggestion, never a guess.
- Prose blocks pass through the phrase algebra untouched — `{snippet:x}`, markers,
  and `{garbled}`-style named producers work as they do today.
- `text <name> comes from <module>` is the escape hatch: a named TS export
  implementing a producer/handler. Same for `action <name> comes from …` later.

## 5. Execution: interpreter first, transpiler as the eject path

**Primary: runtime interpretation.** Parser produces IR; a generic `Story`
implementation (one new package, e.g. `@sharpee/story-loader`) walks the IR and makes
the same platform calls the dream-cloak layer would: helpers-style entity creation,
`connectRooms`, `blockedExits`, EventProcessor registration, dynamic-text producers,
scheduler entries. Conditions and effects run in a tiny expression evaluator — no
`eval`, no TS compiler at runtime.

- The expression language is **deliberately capped**: comparisons, and/or/not,
  arithmetic on counters, the predicate set (`has`, `is in`, `is worn`, `is dark`,
  `is open`, …). No loops, no user-defined functions, no string manipulation. The
  moment logic outgrows this, the answer is a named TS escape hatch, not a richer
  expression grammar. This cap is the firewall against the config-language death
  spiral (every "smart" config format eventually becomes a bad programming language).
- Source positions travel with the IR so runtime errors and transcript failures
  report `.story` line numbers.

**Secondary (later): TS emitter.** `sharpee eject` transforms IR → dream-cloak-style
fluent TypeScript for stories that outgrow the language entirely. One-way door,
clearly labeled.

**Acceptance gate** (Integration Reality): the interpreted `cloak.story` must pass
the existing cloak-of-darkness transcripts unmodified (minus the two divergences
noted in dream-cloak.md §4). Transcript tests are behavior-parity proofs — we
already own the harness.

## 6. Honest cost accounting

1. **Diagnostics are the product.** A writer's compiler must say "I don't know which
   'hook' you mean on line 41 — you have 'brass hook' and 'hook rug'" — not dump a
   parse stack. Budget more effort for error messages than for the parser itself.
2. **Editor tooling.** Syntax highlighting (TextMate grammar) is cheap; the real win
   is an LSP — completion of entity names, go-to-definition on "the velvet cloak",
   rename. `ide-protocol` is manifest wire types only, so LSP is net-new work, but
   ADR-154/185 want an authoring IDE anyway and a DSL makes its language services
   *simpler* than TS analysis would be.
3. **The seam.** Escape hatches mean two-language stories. Keep the seam narrow and
   nominal: `.story` declares names; TS files export implementations of a small
   documented interface. Hosted/multi-user mode can refuse stories with hatches.
4. **A third dialect for the book.** Mitigation: the language becomes the *author*
   track and TS the *developer/extension* track — arguably cleaner than today, where
   the book walks writers through capability dispatch.
5. **Grammar freeze pressure.** Published `.story` files make syntax changes breaking
   changes. Version-stamp the format (`story language 1`) from day one.

## 7. Decision points

1. **Interpreter vs transpiler as the primary path.** Recommendation above:
   interpreter (playground + zifmia + no-toolchain are the strategic wins). If
   emitted-TS-you-then-own is primary, most of §2 evaporates.
2. **Syntax family.** Controlled-English blocks (sketch) vs markdown-flavored vs
   I7-style free NL. The sketch is a proposal, not a conclusion.
3. **Where the power cap sits.** The capped-expression list in §5 is a first cut;
   every addition after that is a one-way ratchet.
4. **Is sandboxed hosting a driving requirement?** If yes, pure-IR (no hatches)
   becomes a supported profile and priorities shift toward the loader; if no, the
   TS emitter path gets more weight.
5. **Relationship to the fluent layer.** Do we still build the fluent TS layer as a
   product, or does it survive only as (a) the emitter target and (b) the loader's
   internal vocabulary? Building both as *products* doubles the dialect problem.
6. **Naming.** Working title "the story language", extension `.story`. A real name
   can wait until it survives the dream-zoo test.
7. **Second acid test** stands: the zoo (custom actions, NPC behavior swap, daemons,
   scoring) is where the escape-hatch design gets stressed for real.
