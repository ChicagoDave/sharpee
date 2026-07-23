# Chord Grammar — Implementation Notation

A living EBNF-style notation of the Chord grammar **exactly as the parser
implements it** (`packages/chord/src/parser.ts`). It tracks the code, phase
by phase, so the accepted language is always reviewable at a glance.
Normative source: `docs/work/story-language/design.md` + ADR-210; grammar
*changes* (anything not in design.md) require David's approval via
`docs/architecture/chord-grammar-changes.md`.

A pure-EBNF extraction of the productions below (no ratchet history or
analyzer notes) lives in `docs/reference/chord.ebnf`; keep the two in sync.

**Current coverage: Phase A subset + Phase B declarations + Phase C
ownership package + the each package (E1–E3) + the zoo-surfaces package
(Z1/Z4/Z5, CP1'/CP3/Z3b, Z6)** (plans: docs/work/chord-phase-c/plan.md,
docs/work/chord-each/plan.md, docs/work/chord-zoo-surfaces/plan.md) as of
2026-07-14. The zoo-surfaces package adds the `first time` create block
(Z1), the `is here` deictic predicate (Z4), the five-adverb STRATEGY set
with `ordered`/`once` retired (Z5), the trailing `while` gate on
`define phrase` headers (CP1'), the reshaped per-entity `phrase` override
header with strategy/`while`/`or`-variants (CP3/Z3b), and the `remove`
statement (Z6). The each package adds the quantifier condition forms
`any <open-condition>` / `no <open-condition>`, the body-position
iteration block `each <open-condition> … end each` with the `the match`
binder, and the `must be any <name>` membership requirement (David,
2026-07-12). Phase C lands the ownership ratchet entries D1–D13: owner-attached
`on`/`after` clauses with `while` and `, once`, `states[, reversible]:` at
story/entity/trait scope, `must` requirements, `refuse when` in body
position, the statement-final `when` suffix, owner-attached `score … worth N`
lines, `change … to <state>`, and the `when <owner> becomes <state>` sequence
anchor. The floating half of the language is gone: top-level `when`/`once`/
`every` rules, `define flag`, the `flag` field type, `if`/`else`/`end if`,
and top-level `define score` no longer parse (each has a fix-it diagnostic
naming its owner-attached replacement — error recovery, not grammar, so
they have no productions below). Analysis/loader: later phases.

## Notation conventions

- `UPPER` = token class, `"quoted"` = literal word, `[x]` = optional,
  `{x}` = zero or more, `x | y` = alternatives.
- Chord is **line-oriented**: `NL` ends every rule that is one source line.
  `>>>` means "an indented block follows" — see Layout below, which EBNF
  cannot express.

## Layout rules (the part EBNF can't say)

| Block | Opens with | Closes with |
|---|---|---|
| story header fields | `story` line | dedent |
| `create` block | `create` line | dedent |
| `define phrases <locale>` / `phrases <locale>` | header line | dedent |
| `define trait` | header line | `end trait` |
| `define action` | header line | dedent |
| `define sequence` | header line | `end sequence` |
| sequence step | anchor line | dedent (next anchor or `end sequence`) |
| ordinal block (`first time`) | ordinal line | dedent (or `end` of enclosing) |
| prose block | first bare line | dedent (blank line = paragraph break; in `create` blocks a blank line ends the block, but later bare paragraphs append to the description) |
| `define phrase` | header line | `end phrase` |
| `define phrasebook` | header line | `end phrasebook` |
| `on` / `after` clause | header line | `end on` / `end after` (must match the opener) |
| `select` | `select …` line | `end select` (`or` at the `select`'s indent) |
| `each` block (E3) | `each <name>` line | `end each` |

- Indentation is **spaces only** (tab → `lex.tab-indent` error).
- Recovery: after an error the parser resynchronizes at the next `end` line
  or top-level keyword — one mistake, one diagnostic. (The recovery set
  still includes `when`/`once`/`every` so the removal fix-its land cleanly.)

## Tokens

```
WORD    = letter { letter | digit | "'" | "-" | "_" }     (* cant-leave, you'd *)
NUMBER  = digit { digit } { "." digit { digit } }          (* 1, 20, 1.0.0 *)
STRING  = '"' any-except-'"' '"'                           (* no escapes *)
MARKER  = "{" content "}"                                  (* inside text only *)
```

## Comments (ADR-249, 2026-07-20)

```
comment-line = "##" rest-of-line NL ;          (* column 1 — indent 0 only *)
comment-run  = comment-line { comment-line } ; (* stacked = multi-line comment *)
```

A comment-run is legal only **between top-level constructs** (before the
story header, between declarations, after the last) and must be
**blank-delimited on both sides** — file start and end count as blank,
so `##` as the very first line (the file-header comment) and a trailing
comment are legal. Lexer: comment lines are *flagged, never dropped*
(`Line.comment`); an undelimited run is `lex.comment-blank-lines`.
Parser: flagged lines are skipped at top-level dispatch only;
`parse.comment-inside-block` anywhere inside a construct — including at
indent 0 between a header and its indented body (one-line lookahead),
and for any indented `##` line in a code position. An indented `##`
line in prose is prose and renders verbatim (§5.2 opacity). There are
NO end-of-line comments: `#`/`##` mid-line is prose punctuation or a
parse error, exactly as before. One concept, one form (Given 7).

## Top level

```
story-file   = [ comment-run ] [ story-header ] { declaration | comment-run } ;
story-header = "story" STRING [ "by" STRING ] NL
               >>> { states-line | score-line | story-on-clause
                   | use-phrasebook-line
                   | WORD ":" rest-of-line NL } ;
story-on-clause = on-clause ;   (* `on every turn` only — ADR-236 D7, R4 *)
declaration  = create | define-condition | define-phrase | define-phrases
             | define-verb | define-text
             | define-trait | define-action | define-hatch
             | define-sequence
             | define-phrasebook | import-phrasebook ;
```

The story header hosts exactly one clause form: `on every turn [while
<cond>][, once]` (ADR-236 D7, ratchet R4) — the story-owned daemon. No
presence gate (it fires every turn wherever the player is), narration
broadcasts, and `it` is unbound in the body (`analysis.story-clause-it`).
Any other clause form in the header is `parse.story-clause`.

Removed from the top level (ownership package, ratchet 2026-07-11):
`when` rules, `once <condition>` rules, `every N turns` rules,
`define flag`, `define score`. Each removal is a parse error with a fix-it
naming the owner-attached replacement (`parse.removed-when`,
`parse.removed-once`, `parse.removed-every`, `parse.removed-flag`,
`parse.removed-score`).

## Ownership lines (Phase C; ratchet D2/D4/D8/D12)

Two line forms shared across owners:

```
states-line  = "states" [ "," "reversible" ] ":" WORD { "," WORD } NL ;
score-line   = "score" WORD "worth" NUMBER NL ;
```

- `states-line` is legal in the **story header** (D2), **create blocks**,
  and **define trait blocks** (D8). The owner starts in the first declared
  state; without `reversible`, backward `change` is a load error
  (`analysis.irreversible-state`, D4 — analyzer, not parser).
- `score-line` is legal in the **story header**, **create blocks**,
  **define trait blocks**, and **define action blocks** (D12). Score
  identities are owner-scoped.

## on / after clauses (ratchet D3/D5)

Owner-attached behavior, legal in `create` blocks and `define trait` blocks:

```
on-clause    = ( "on" | "after" ) clause-form
               [ "while" condition ]
               { "," clause-modifier } NL
               >>> { statement } "end" ( "on" | "after" ) NL ;
                                        (* terminator matches the opener *)
clause-form  = WORD "it"                          (* verb binding *)
             | WORD "anything" "as" "the" WORD    (* role binding, §2.2 *)
             | "every" "turn" ;                   (* `on` only *)
clause-modifier = "once"                          (* D5: one lifetime firing *)
             | ( "before" | "after" ) WORD ;      (* trait ordering, §2.2 *)
```

- `on <verb> it` intercepts (may `refuse`); `after <verb> it` reacts —
  `refuse`, `refuse when`, and `must` inside an `after` body are parse
  errors (`parse.react-refusal`, D3).
- `after every turn` is a parse error (`parse.after-every-turn`) —
  every-turn clauses are not reactions to an action.
- `while` is legal on every binding; comma modifiers repeat and follow it.
- Owner-scoped narration (D11) is semantics, not syntax: entity-owned
  every-turn clauses fire only in the owner's presence.
- **Region blocks** (ADR-236) are a legal clause home: `on every turn`
  fires while the player is in a member room, transitive through nesting
  (D4); `after entering it` / `after leaving it` bind to the region's
  crossing events, fired per boundary actually crossed (D6). `leaving`
  (ratchet R3) exists ONLY on region blocks — a load error anywhere else.

## create

```
create       = "create" name NL >>> { create-line } ;
create-line  = "aka" alias { "," alias } NL
             | "pronouns" WORD NL                          (* ADR-242 D5 (ratchet H2): person
                                                              blocks only; a standard set
                                                              (he|she|it|they) or a `define
                                                              pronouns` name — unknown word is
                                                              `analysis.unknown-pronouns` with
                                                              a suggestion; duplicate line is
                                                              `analysis.pronouns-duplicate`;
                                                              absent = platform by-number
                                                              fallback (no injected default) *)
             | states-line                                 (* ordered states, D2/D4 *)
             | score-line                                  (* owner-attached score, D12 *)
             | composition { "," composition } NL          (* pre-blank paragraph only *)
             | placement NL
             | "wears" name NL
             | "containing" name { [ "," ] [ "and" ] name } NL
                                                           (* region membership (ADR-236 D2,
                                                              ratchet R2): region blocks only;
                                                              additive across lines; members
                                                              are rooms or nested regions
                                                              (nesting sets parentRegionId,
                                                              D3). Placement lines on a
                                                              region are `analysis.region-
                                                              placement` *)
             | DIRECTION "to" name [ "through" name ] NL   (* exit; `through the <door>` tail
                                                              (ADR-234 D1, ratchet R2) — see
                                                              "Doors" below *)
             | DIRECTION "is" "blocked" [ "while" condition ] ":" WORD NL
                                                           (* blocked exit, phrase key *)
             | phrase-override                             (* per-entity override, CP3/Z3b *)
             | "first" "time" NL >>> prose-paragraph       (* Z1: first-VISIT description →
                                                              RoomTrait.initialDescription;
                                                              rooms only; `second time` etc.
                                                              are load errors *)
             | on-clause                                   (* `on`/`after`, D3 *)
             | prose-paragraph ;                           (* post-blank: description; consecutive
                                                              bare paragraphs append (2026-07-10) *)

phrase-override = "phrase" WORD [ "," STRATEGY ] [ "while" condition ] ":" NL
                  variant { "or" NL variant } ;
                  (* CP3/Z3b: `or` stands alone at the header's indent;
                     `detail` requires `while` and is single-text; `while`
                     on lifecycle channels / ordinary overrides is
                     `analysis.override-gate`; repeating `detail` keys
                     (`<id>.detail.2`, …) are analyzer-derived *)

composition  = [ ARTICLE ] WORD                            (* article ⇒ kind noun; bare ⇒ trait *)
               [ "with" setting { "and" setting } ]
               [ "while" condition ]                       (* conditional trait, e.g. dark while … *)
             | "starts" STATE-INIT ;                       (* ADR-231 D5a: initializer of the paired
                                                              trait's initial-value field; pairing
                                                              (`lockable`/`openable`/`switchable`
                                                              composed) is `analyze.starts-state-
                                                              pairing`. One-token lookahead:
                                                              "starts" "in" stays placement; any
                                                              other word is `parse.starts-state` *)
STATE-INIT   = "locked" | "unlocked" | "closed" | "open"
             | "off" | "on" ;
setting      = ARTICLE name                                (* ratchet R3 (ADR-234 D6): article
                                                              directly after `with`/`and` = the
                                                              adjective's single-entity value —
                                                              `lockable with the iron key`,
                                                              `cuttable with the knife`,
                                                              `diggable with the shovel`,
                                                              `openable with the crowbar`. The
                                                              removed `key`/`tool` keywords are
                                                              `parse.removed-config-keyword`
                                                              with fix-its *)
             | WORD { WORD }
               ( NUMBER | STRING | WORD | ARTICLE name ) ; (* last token(s) = the value; keyed
                                                              ARTICLE-name values remain for
                                                              authored-trait NAMED data fields
                                                              (`feedable with food the handful
                                                              of feed` — the keyword is the
                                                              field name) and word/number/string
                                                              configs keep their keyword
                                                              (`hiding-spot with position
                                                              behind`) *)
placement    = ( "in" | "on" ) ARTICLE name                (* on + article = placement… *)
             | "starts" "in" name ;                        (* …on + bare word = on-clause *)
DIRECTION    = north | south | east | west | northeast | northwest
             | southeast | southwest | up | down ;
```

## Doors (ADR-234/237/238, ratchets R2/R3, 2026-07-18)

- **One authoring form** — the exit-line tail: `north to the Hall through
  the oak door`. Direction explicit on the line; the reverse exit is
  inferred as the opposite direction (`connectRooms`'s established
  convention) — no matching line needed in the far room. A mirrored
  far-room line is legal only as the exact mirror (other side, opposite
  direction, stated at most once — `analysis.door-pair-mismatch`
  otherwise). `through` references a DECLARED door and never creates one
  (unknown name = `analysis.unknown-entity`; a non-door target =
  `analysis.door-through-kind`). `through` is a reserved word on exit-line
  destination names. The `between` placement form was struck before ever
  entering the grammar (David, 2026-07-17).
- **The door block is pure entity declaration** — kind, traits, aka,
  description, phrases, `on`/`after` clauses; it never names the rooms.
  Placement lines on it are `analysis.door-placement`: a door's location
  IS its room pair (the loader places it in the declaring room; it is
  present at BOTH rooms for scope and visibility, and only the door is —
  the far room never leaks — ADR-238). A door referenced by no `through`
  line is `analysis.door-unconnected` (hard); more than one room pair is
  `analysis.door-multi-pair`.
- **Defaults (D4)**: `a door` composes SceneryTrait + OpenableTrait
  starting CLOSED (`starts open` overrides). `lockable` is composed
  explicitly, and on a door starts LOCKED — the kind-scoped IF-convention
  default; `a door, lockable with the iron key, starts unlocked` is the
  override. A permanently open passage needs no door entity at all.
- **`, one-way`** is reserved, not wired: `parse.exit-one-way-reserved`
  names the reservation legibly. Doors and exits are bidirectional until
  its own ratchet entry lands.
- **Wiring (ADR-237 D4)**: the loader composes the door by direct trait
  composition and wires it exactly once through
  `connectRooms(room1, room2, direction, doorId)` — the platform's one
  exit-wiring implementation (via stamped both directions + room1
  placement; the primitive owns the DoorTrait-vs-exits invariant).

## Topics (ADR-239, 2026-07-18)

- **The `define topics` table block** is the one topic surface — the
  entity's declared table of ask/tell topics + responses, a closed,
  compile-visible set (D4: the story declares what can be asked about;
  lookup, never fuzzy):

  ```
  define topics for the porter
    about the sword: phrase sword-reply
    about "treasure", "the hoard": phrase treasure-reply
    about "the folly":
      phrase folly-reply
      change it to nervous
  end topics
  ```

- **Two row tiers.** `about the <entity>:` (entity tier) matches through
  the platform's quiet `topicEntityId` resolution — checked first.
  `about "<text>"[, "<text>" …]:` (free-text tier) declares the primary
  spelling plus comma-separated aliases (comma ruled by David 2026-07-18,
  superseding ADR-239's `or` example); matching is normalized whole-topic
  equality (case-insensitive, leading article stripped) — the SAME
  `normalizeTopic` the compile gates use.
- **Responses scale.** A one-line row names its statement directly (the
  common `phrase <key>` case, declare-and-emit prose sugar included); a
  row may instead open an indented statement body for rich beats. `it`
  inside a row body binds to the owner.
- **One table per entity** (`analysis.duplicate-topics-block`), on
  person-kind entities only (`analysis.topics-host` — only people answer
  ask/tell). The same table serves `ask` AND `tell` (D1). Overlaps are
  compile errors, never runtime tie-breaks: a duplicate entity or
  normalized quoted entry (aliases included) is `analysis.duplicate-topic`;
  a quoted entry colliding with the name/aka of an entity used in an
  entity-tier row of the same table is `analysis.topic-entity-collision`.
- **The catch-all is the existing unfiltered `on asking it` clause** — no
  on-clause grammar changed. It fires ONLY when the asked topic matches no
  declared entry (the NPC's own "couldn't say" voice); on a hit the
  matched row fully owns the response — the catch-all is suppressed, never
  appended (D5). With no catch-all declared, stdlib's `unknown_topic` /
  `not_interested` default speaks. `on telling it` mirrors identically.

## Person identity (ADR-242, ratchet H1–H3, 2026-07-19)

- **`proper`** — a person-only, unconditional trait adjective
  (`a person, proper`): the person is proper-named — bare "Tobias" in
  every rendering context (IdentityTrait `properName: true, article: ''`,
  the player's own shape). On any non-person kind it is
  `analysis.proper-person-only`; with a `while` tail it is
  `analysis.proper-conditional` (identity is not turn state). The
  create-line article is never read for identity — `create the
  zookeeper` and `create a zookeeper` load identically (D4, a recorded
  divergence from Inform 7's inference rule).
- **`pronouns <word>`** — a person body line (beside `aka`) naming the
  person's pronoun set: one of the standard four (`he`, `she`, `it`,
  `they`) or a `define pronouns` set name. Unknown word:
  `analysis.unknown-pronouns` with a nearest-match suggestion; second
  line: `analysis.pronouns-duplicate`; non-person host:
  `analysis.pronouns-person-only`. **Absent means absent** (ruled Q-2):
  no default is injected — the platform's by-number fallback renders
  "it"/"they", so gender a person by declaring the line.
- **`define pronouns <name> … end pronouns`** — a named set for
  non-standard gender identity: exactly five named rows (`subject`,
  `object`, `possessive`, `possessive-pronoun`, `reflexive`), order
  free. Missing row: `analysis.pronoun-set-rows`; duplicate row:
  `analysis.pronoun-set-duplicate-row`; a name shadowing a standard set:
  `analysis.pronoun-set-shadows`; redefinition:
  `analysis.duplicate-pronoun-set`. Declared forms are DATA in the IR
  (`ir.pronounSets`); the loader registers them into the language
  provider (`extendLanguage`), where the assembler consults them before
  the standard rows.

  ```
  create Kit
    a person, proper
    pronouns ze
    in the Gatehouse

  define pronouns ze
    subject ze
    object zir
    possessive zir
    possessive-pronoun zirs
    reflexive zirself
  end pronouns
  ```

## Extension surface (ADR-215/216, 2026-07-18)

- **`use <extension>`** — a story-header body line, one trusted platform
  extension per line (`combat`, `state-machines`). Admits that extension's
  static vocabulary manifest (`packages/chord/src/manifests/`) into the
  catalog and triggers its runtime registration from the loader's trusted
  registry — a `use`-only story stays pure IR. Unknown/duplicate names are
  compile errors; NPC vocabulary is CORE (always on; `use npc` is
  `analysis.extension-core`). `define behavior … from` was REMOVED
  (ADR-235 D2).
- **Extension trait adjectives** carry manifest-typed `with`-fields:
  `combatant with health 20 and skill 40 and hostile true` (health routes
  to the required HealthTrait per ADR-226), `weapon with damage 5 and
  skill-bonus 2`; the CORE NPC library `guard`/`passive`/`wanderer`/
  `follower`/`patrol` with params (`move-chance` is a percentage;
  `patrol with route [the Gate, the Yard]` uses the `[ … ]` name-list
  value — legal only where a manifest declares a list field). Unknown
  keys and mistyped values are compile errors.
- **`define machine … end machine`** under `use state-machines` (spelling
  A): `role <name> is <entity>`, `starts <state>`, `state <name>[,
  terminal]` blocks with `when <trigger>[ while <cond>]: <target>` lines
  and `on enter`/`on exit` bodies. Machines are story-owned (`it` is a
  compile error). Triggers: action-on-role/entity, `event <key>`,
  conditions; a bare word resolves as condition/story state first, else an
  action gerund. The existing `states:`/`select`/`change` surface is
  UNTOUCHED — this is additive depth.
- **Payloaded `emit`** — `emit <event.key> with <field> <value> [and …]
  [when <cond>]`: literals, value expressions (entity refs → world ids,
  `true`/`false` → booleans; plain strings are quoted), `[ … ]` arrays,
  `{ <field> <value>, … }` nested objects (commas inside brackets/braces,
  `and` at the flat level). Keys pass verbatim into `event.data`.
- **Media sugar + declared assets** — `define sound|image|music <name>
  from "<file>"` (DATA references, never hatches — `hasHatches` is
  untouched); `play sound <asset>`, `play music <asset> [looping]`,
  `stop music`, `show image <asset> [in <layer>]`, `hide image`,
  `play ambient <asset> [in <channel>]` (a sound asset),
  `stop ambient [in <channel>]`, `transition <kind>`, `clear` — all
  lower at compile onto payloaded `media.*` emits. The ambient channel
  word names a BED (ADR-241): omitted, both forms mean the default bed
  `main` (mirroring `image:main`), and bare `stop ambient` stops the
  default bed only. Ambient emits always carry the bed as a `channel`
  payload field.
- **`define ambient <word>` / `define layer <word>`** (ADR-241) — named
  family channel declarations, one-liners beside the asset
  declarations. Channel words beyond the implied set (the `main` bed;
  the pre-registered `background`/`main`/`overlay` image layers) must
  be declared — an undeclared word is `analysis.unknown-channel` with a
  nearest-match suggestion, never a silent second bed. Declared and
  implied-and-used family channels join the IR channel manifest
  (`family: 'ambient' | 'layer'`; data projections read as `'data'`)
  and the loader registers them platform-side — the browser renders
  ambient beds and image layers with no story TypeScript.
- **`define channel … end channel`** (spelling A; ADR-253) — a data
  projection: `mode replace|append|event`, optional `gated by
  <capability>`, and a single `return <construct> from <event>` line —
  `<construct>` is a field (`return hour from estate-clock`), a
  `"text (slot)"` template, or a `phrase <key>`. (ADR-253 replaced the
  ADR-216 `from event` + `take` lines; a `take` line is a parse error.)
  The value renders into a DOM element named for the channel, else the
  generic panel — placement ships platform-side, no story TypeScript.
- **`client has <capability>`** — a condition reading the LIVE negotiated
  client capabilities (closed flag set in Chord spelling: `sound`,
  `images`, `split-pane`, …); false for every gateable flag on a
  text-only client, so stories degrade deliberately.

## Phrasebooks (ADR-245/250, 2026-07-21)

```
define-phrasebook   = "define" "phrasebook" WORD [ "while" condition ] NL
                      >>> { phrasebook-entry }
                      "end" "phrasebook" NL ;
phrasebook-entry    = WORD [ "," STRATEGY | "," "verbatim" ] ":" NL
                      >>> prose { "or" NL >>> prose } ;   (* the phrase-override entry grammar *)
use-phrasebook-line = "use" "phrasebook" WORD [ "while" condition ] NL ;  (* header body; stackable *)
import-phrasebook   = "import" "phrasebook" STRING NL ;   (* top level; STRING ends ".story" *)
```

A named, predicated phrase collection (ADR-245 intent, ADR-250 design).
Books arbitrate first-predicate-match in file-appearance order, per key
(`use`d and `define`d alike); a predicate-less book is the DEFAULT
(always) book. The fallback chain is per-entity phrase → story
`define phrase` → active book → platform default — story text always
beats books (enforced statically at load: story-defined keys register
no book evaluator). Entry keys are STORY keys only (single kebab words,
ADR-254) — a dotted platform ID is `analysis.phrasebook-dotted-key`; to
override a standard-action message, use `override message <alias>`
(ADR-255). Entry-level `while` is
`analysis.phrasebook-entry-gate` (the book's header predicate is the
only gate). Other gates: `parse.phrasebook-header`/`-entry`/`-end`,
`parse.use-phrasebook`, `parse.import-form` (bare `import "<file>"`
reserved for the parked generalized import; non-`.story` paths
rejected), `analysis.duplicate-phrasebook`, `analysis.unknown-phrasebook`
(nearest-match against the compile-time manifest registry),
`analysis.phrasebook-reserved-key`, `analysis.phrasebook-duplicate-key`
(within one book; across books is the point),
`analysis.import-unresolved` / `analysis.import-fragment-content`
(fragments hold only `define phrasebook` blocks + `##` comments), and
the WARNING `analysis.phrasebook-partial-coverage` (a story-referenced
key covered only by predicated books renders nothing off-book). Book
coverage counts as declaration for `analysis.missing-phrase` — for
`use`d books via the manifest key list. IR: `StoryIR.phrasebooks`
(additive), entries inline for `define`, load-registry-resolved for
`use` (manifest/data conformance is a LoadError). Runtime: one ADR-240
evaluator per book-covered-not-story-defined key
(`phrasebook.template.<key>`), read at the engine's render point;
variant counters key `TEXT_STATE` as (`phrasebook.<book>`, key).

## define

```
define-condition = "define" "condition" WORD ":" condition NL ;
define-phrase    = "define" "phrase" WORD [ "," ( STRATEGY | "verbatim" ) ]
                   [ "while" condition ] NL                (* CP1' trailing gate *)
                   variant { "or" NL variant } "end" "phrase" NL ;
                   (* verbatim: single variant, line structure + relative
                      indentation preserved; no "or" variants *)
variant          = prose-paragraph ;
define-phrases   = "define" "phrases" LOCALE NL >>> { phrase-entry } ;
phrase-entry     = WORD ":" NL prose-paragraph ;           (* prose block only — the same-line
                                                              quoted/bare forms were removed
                                                              (grammar log 2026-07-10) *)
define-pronouns  = "define" "pronouns" WORD NL             (* ADR-242 D7 (ratchet H3): five named
                   >>> { PRONOUN-CASE WORD NL }               case rows, order free, all required;
                   "end" "pronouns" NL ;                      analyzer gates rows + shadowing *)
PRONOUN-CASE     = "subject" | "object" | "possessive"
                 | "possessive-pronoun" | "reflexive" ;
define-verb      = "define" "verb" WORD { "or" WORD } "means" pattern NL ;
pattern          = { WORD | "(" WORD ")" } ;               (* (something) = slot *)
define-text      = "define" "text" WORD "from" STRING NL ; (* TS hatch; name "br" reserved *)
STRATEGY         = "randomly" | "cycling" | "stopping" | "sticky" | "first-time" ;
                   (* Z5 (ADR-211 Decision 4): adverbs mirror the Choice
                      selectors 1:1. `ordered`/`once` are retired — load
                      errors naming `stopping`/`first-time`. The RULE
                      modifier `, once` (D5) is a different grammar site
                      and still parses. *)
```

`define flag` was removed (given 8, ratchet 2026-07-11): global booleans
are gone; facts are derived conditions or owner states (`parse.removed-flag`).

### Prose blocks and formatting (grammar log 2026-07-10)

- A blank line inside a prose block is a **paragraph break** (`\n\n` in the
  compiled text → a fresh text block downstream). In `create` blocks the
  block still ends at a blank line so keyword lines stay out of prose;
  consecutive bare paragraphs all append to the description.
- `{br}` is the **built-in hard-line-break marker** (flush line stacking,
  no paragraph gap). `br` is reserved: it needs no declaration and cannot
  be used as a phrase or hatch name (`analysis.reserved-marker`).
- `define phrase X, verbatim` preserves line structure, interior blank
  lines, and relative indentation (the common leading indent is stripped);
  mutually exclusive with strategies and `or` variants.
- Phrase body text must be indented under the `define phrase` header; a
  column-1 non-keyword line is `parse.phrase-text-indent` (one diagnostic
  for the run of flush-left lines; recovery still finds `end phrase`).
  Guard added 2026-07-19 — before it, such a line looped the variant
  parser to OOM.

## Traits, actions, hatches, sequences (Phase B, extended by Phase C)

```
define-trait   = "define" "trait" WORD NL
                 { trait-line }
                 "end" "trait" NL ;
trait-line     = "data" NL >>> { trait-field }
               | states-line                               (* trait-declared states, D8 *)
               | score-line                                (* D12 *)
               | "phrases" LOCALE NL >>> { phrase-entry }
               | on-clause ;
trait-field    = field-words ":" [ "optional" ]
                 ( "entity" | "number" | "name"
                 | "one" "of" WORD { "," WORD } )
                 [ "," "starts" token ] NL ;
```

The `flag` field type was removed (given 8 / D8): a `flag`-typed field is a
parse error (`parse.removed-flag-field`) pointing at trait `states`.

```
define-action  = "define" "action" WORD NL action-line* ;  (* dedent-terminated *)
action-line    = "grammar" NL >>> { pattern-line }
               | "the" WORD "must" "be" WORD NL            (* scope constraint (no colon) *)
               | must-line                                 (* D6 requirement (has colon) *)
               | score-line                                (* D12 *)
               | "refuse" "without" WORD ":" WORD NL
               | "refuse" "when" condition ":" WORD NL
               | "otherwise" "refuse" WORD NL              (* dispatch miss *)
               | "phrases" LOCALE NL >>> { phrase-entry }
               | statement ;                               (* §2.3 body *)
pattern-line   = ( WORD | ":" WORD )+ [ "→" token { token } ] NL ;  (* → = cardinality *)

define-hatch   = "define" ("action"|"chain") WORD "from" STRING NL ;
                 (* `chain` = ADR-094 chain hatch (WORD a curated stdlib chain
                    alias, e.g. opened-revealed; analysis.unknown-chain otherwise).
                    `define behavior … from` was REMOVED, ADR-235 D2. *)

define-sequence= "define" "sequence" WORD { WORD } NL
                 { sequence-step } "end" "sequence" NL ;
sequence-step  = step-anchor NL >>> { statement } ;
step-anchor    = "at" "turn" NUMBER                        (* absolute from story start *)
               | NUMBER "turns" "later"                    (* relative to previous step *)
               | "when" name "becomes" WORD ;              (* state anchor, D10 *)
```

### must requirements (ratchet D6)

Legal as a `define action` line AND as a body statement (never inside an
`after` clause):

```
must-line    = must-subject "must" infinitive ":" WORD NL ;
must-subject = value-expr ;    (* line must OPEN with lowercase `the`/`it`/`its`
                                  so capitalized prose stays prose *)
infinitive   = "be" ( ("a"|"an") WORD { WORD }             (* is-a *)
                    | "in" name                            (* is-in *)
                    | "any" WORD                           (* membership over a named open
                                                              condition (David, 2026-07-12);
                                                              standalone-name rule, same as
                                                              the condition quantifiers *)
                    | value-expr )                         (* is *)
             | ( "have" | "hold" | "wear" ) name           (* has/holds/wears *)
             | ( "see" | "reach" ) name ;                  (* can see/reach *)
```

`must not …` is a parse error (`parse.must-negative`): requirements are
positive by design; prohibitions use `refuse when <condition>: <key>`
(companion analyzer gate: `analysis.negated-requirement` on
`refuse when not …`). `must be no <name>` (standalone name) is the same
`parse.must-negative` error — a negated requirement in disguise; `must be
any <name>` requires the SUBJECT to satisfy the named open condition
(membership — the condition's `it` binds to the subject at evaluation).

## Statements

```
statement    = "refuse" phrase-key { param } NL            (* not in `after` bodies *)
             | "refuse" "when" condition ":" WORD NL       (* prohibition, D6; not in `after` *)
             | must-line                                   (* D6; not in `after` *)
             | "phrase" phrase-key { param } [ stmt-when ] NL [ inline-prose ]
             | "emit" WORD { WORD } [ stmt-when ] NL
             | "set" value-expr "to" value-expr NL
             | "change" name "to" WORD [ stmt-when ] NL    (* state transition; name may be
                                                              `the story` (D2) or any entity *)
             | "move" name "to" name [ stmt-when ] NL
             | "remove" name [ stmt-when ] NL              (* Z6: out of play entirely,
                                                              permanently; no `to` clause;
                                                              never the player
                                                              (analysis.remove-player) *)
             | "award" { token } [ "," "once" ] [ stmt-when ] NL
             | "win" [ WORD ] [ stmt-when ] NL
             | "lose" [ WORD ] [ stmt-when ] NL
             | select-on | select-strategy | ordinal-block | each-block ;
stmt-when    = "when" condition ;                          (* statement-final suffix, D7 *)
phrase-key   = WORD { "." WORD } ;                         (* dotted keys: zoo.pa.closing-3 *)
param        = "with" WORD { WORD } "=" value-expr ;
select-on    = "select" "on" value-expr NL
               >>> { "when" WORD NL >>> { statement } } "end" "select" NL ;
select-strategy = "select" STRATEGY NL
               >>> { statement } { "or" NL >>> { statement } } "end" "select" NL ;
ordinal-block = ORDINAL "time" NL >>> { statement } ;
ORDINAL      = "first" | "second" | … | "tenth" ;
each-block   = "each" WORD NL                              (* E3: iteration over a named
                                                              open condition (analyzer gate) *)
               >>> { statement } "end" "each" NL ;
```

- **`each` blocks (ratchet E3, 2026-07-12)** parse through the shared
  statement path, so they are legal exactly where statements are: `on`/
  `after` clause bodies, action bodies, trait clause bodies, sequence
  steps — and `refuse`/`must` legality inside the body follows the host
  (legal in `on`, error in `after`). Never top-level
  (`parse.each-top-level`); a missing condition name is
  `parse.each-condition`; trailing words after the name are
  `parse.each-trailing`. Nesting is legal; `the match` binds innermost.
  The open-condition requirement is the analyzer's gate, not the parser's.

- **`if`/`else`/`end if` was removed** (ratchet 2026-07-11): `if` is a parse
  error (`parse.removed-if`) pointing at `must` guards, the statement `when`
  suffix, and `select`.
- The **statement `when` suffix** (D7) is legal on `phrase`, `emit`,
  `change`, `move`, `remove`, `award`, `win`, `lose` — not on `set` or
  bare `refuse`.
  It is positionally distinct from the select-arm `when <value>` header
  (statement-final vs arm-header — homonym noted in the ratchet).
- **Declare-and-emit inline prose** (§2.6/§3.3): a deeper-indented bare
  prose block after `phrase <key>` registers the text under the key. A
  deeper line counts as a statement (not inline text) when it opens with a
  lowercase statement keyword, an ordinal, a `must`-shaped line, or
  `<n> turns` — prose sentences start capitalized.
- **Conditional blocked exits** (grammar log 2026-07-10):
  `DIRECTION "is" "blocked" [ "while" condition ] ":" WORD NL`.
- **Config name values**: `with <key> the <entity name>` — an article starts
  a multi-word entity-name value (`feedable with food the handful of feed`).
- **Lexing**: a lone `"` with no closer on the line is prose punctuation
  (multi-line dialogue); positions requiring strings diagnose at parse time.

## Conditions (closed selector grammar)

Precedence lowest→highest: `or`, `and`, `not`.

```
condition    = and-expr { "or" and-expr } ;
and-expr     = unary { "and" unary } ;
unary        = "not" unary
             | "(" condition ")"
             | "one" "chance" "in" NUMBER
             | ( "any" | "no" ) WORD                       (* E1/E2 quantifiers: only when
                                                              the WORD stands alone — a
                                                              subject merely starting with
                                                              `no` (`no smoking sign is …`)
                                                              keeps its predicate parse *)
             | WORD                                        (* bare ⇒ named-condition or
                                                              state ref, only when a
                                                              connective or end-of-condition
                                                              follows *)
             | value-expr predicate ;
predicate    = "is" [ "not" ] ( ( "a" | "an" ) WORD { WORD }   (* is-a *)
                              | "in" name                      (* is-in *)
                              | "here"                         (* is-here — the Z4 deictic:
                                                                  subject shares the player's
                                                                  location; entity subjects
                                                                  only (analysis.here-subject) *)
                              | value-expr )                   (* is *)
             | ( "has" | "holds" | "wears" ) name
             | "can" ( "see" | "reach" ) name ;                (* Phase B *)

value-expr   = NUMBER | STRING
             | "the" "match"                               (* E3 binder, standalone only —
                                                              `the match box` stays a name *)
             | "its" field-words                           (* possessive on `it` *)
             | name [ "'s" field-words ]                   (* the player's location *)
             | WORD { WORD } ;                             (* bare words *)
name         = [ ARTICLE ] WORD { WORD } ;
ARTICLE      = "the" | "a" | "an" ;
```

**`the match` (ratchet E3)** is the `each`-block binder: the iterated
entity inside the block's body; `it` keeps meaning the clause owner. In
NameRef positions (`change`/`move` targets, predicate things) it parses
as an ordinary name reference and resolves to the binder at analysis,
exactly as `it` does. Position enforcement is the analyzer's
`analysis.match-outside-each` gate; `match` is a reserved declaration
name (`analysis.reserved-name` — entity, alias, trait field, or slot).

Noun phrases stop at: `is has holds wears can and or then to while with`.

**State adjectives (D1) are not new syntax**: `the staff gate is closed`
parses as the plain `is <value>` predicate; `open`, `closed`, `locked`,
`unlocked`, `on`, `off`, `worn`, `lit` form a closed analyzer catalog
(`STATE_ADJECTIVES` in `catalog.ts`) resolved live from world trait state.
Likewise, a declared owner state (`after-hours`, `hungry`) is a valid
bare-word ref or `is <word>` object — analyzer resolution, not parser.

## Implementation readings (design.md ambiguities, resolved in code)

These are *readings* of design.md, not grammar additions — recorded here for
review; if any is wrong it becomes a grammar-changes entry:

1. **`define phrases <locale>` is dedent-terminated** (no `end phrases`) —
   normative §3.1 shows none; the "define keeps explicit end" meta-rule is
   read as applying to blocks with control flow.
2. **`on` disambiguation in create blocks**: `on` + article ⇒ placement
   (`on the table`); `on` + bare word ⇒ behavior clause (`on reading it`).
3. **Composition vs. prose**: non-keyword lines *before* the first blank
   line are composition; non-keyword paragraphs *after* a blank are the
   description (consecutive bare paragraphs append — grammar log 2026-07-10).
4. **`with` setting values**: the last token of each `and`-separated setting
   is the value; preceding words are the key (`max items 5`).
5. **Clause verbs are single raw words** (`on feeding it`,
   `after entering it`) — the parser is vocabulary-free; mapping a gerund
   to a dispatch action or event selector is the analyzer's job. (The old
   unsegmented `when`-header reading is obsolete with the when-rule removal.)
6. **Bare condition refs** (`while in-darkness`, `while after-hours`) are
   only taken when the word stands alone; otherwise a subject–predicate
   parse is attempted.
7. **Prose paragraphs join lines with single spaces**; markers keep precise
   per-line spans for AC-3 diagnostics.

## Analyzer readings (Phase 3 — resolution and gate policy)

8. **Entity IDs** are the lowercased name words joined with `-`
   (`the Foyer of the Opera House` → `foyer-of-the-opera-house`); the
   article is stripped and kept separately. Resolution order: exact name →
   exact alias → unique in-order word-subset (`the Foyer Bar` matches
   nothing else). Ambiguity/misses are errors with rename/nearest
   suggestions — never a guess.
9. **Descriptions and per-entity overrides become derived phrase keys**
   (`<entity-id>.description`, `<entity-id>.<key>`) registered in the
   story's default locale (Phase A: `en-US`), per given 3.
10. **Event-verb set: `entering`, `leaving`** (`EVENT_VERBS` in
    `catalog.ts`, gerund register since the ownership package; `leaving`
    added by ratchet R3, ADR-236 D6 — region blocks only, loader-refused
    elsewhere). An `on`/`after` clause verb is either a known event verb or
    a dispatch-action gerund; growing the set is a grammar change
    (governance log).
11. **`is <word>` objects** must be a declared state of the subject entity,
    a v1 trait adjective, a state adjective (D1), a literal, or an entity
    name — anything else is the unknown-value gate with a nearest-valid
    suggestion.
12. **Marker validation (Phase A slice):** bare lowercase single-word
    markers (`{garbled}`) must name a declared hatch or phrase key.
    Formatter-chain forms (`{You}`, `{verb:is item}`, `{the item}`) are not
    validated yet — that check lands with the full contract in Phase B/C.
13. **State-set gates are analyzer territory**: the three-ring boolean-state
    gate (D9: `analysis.boolean-state` / `analysis.shadow-state` /
    `analysis.negated-state`), state collisions across composed traits
    (D8: `analysis.state-collision`), irreversible-transition checking
    (D4: `analysis.irreversible-state`), and the negated-requirement gate
    (D6: `analysis.negated-requirement`) all fire after parse — the parser
    accepts any word list in a `states-line`.
14. **Quantifier gates (E1–E3)**: `any`/`no`/`each` (and `must be any`)
    require a declared OPEN condition — a closed condition or story state
    is `analysis.closed-condition-selection`, an undeclared name is
    `analysis.unknown-condition`. `the match` outside an `each` body is
    `analysis.match-outside-each`; `match` as a declared entity name,
    alias, trait data field, or grammar slot is `analysis.reserved-name`.
    The bare-open-condition-in-truth-position gate
    (`analysis.open-condition-truth`) now names the live fix-it forms.
    In `is` comparisons with `the match` as subject, the state set is
    statically unknowable (any entity may match) — the word passes as a
    symbol and the runtime resolves it, same stance as
    `change the match to <state>`. Enumeration domain (evaluator):
    all IR-declared entities, player and rooms included, in declaration
    (creation) order.
