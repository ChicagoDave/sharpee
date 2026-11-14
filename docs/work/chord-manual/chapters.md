# Chord manual: loose chapters from the 4.0.2 syntax

**Written**: 2026-11-13, session 625c8d.
**Source**: `packages/chord/chord.ebnf` read in full (the surface pinned to Chord 4.0.2), with
`packages/chord/src/catalog.ts` for the closed word lists, `packages/chord/src/stdlib-manifest.ts`
for the standard actions, `packages/chord/src/manifests/` for extension vocabulary, and
`packages/chord/src/character-manifest.ts` for the character vocabulary. Nothing here comes from the
website, the Family Zoo mirrors, or any other existing Chord material (David, 2026-11-13).

**What this is**: every construct the grammar admits, sorted into loose chapters in a teaching
order. Names in `code` are grammar productions or the words an author writes. The order is a
proposal; chapters will split, merge and move once the game is laid over them (`game.md`).

**What is not yet verified**: this is a reading of the grammar, not of the runtime. Each chapter's
claims get proven when its snapshot of the game compiles and loads. Two things the grammar does not
settle are marked "to check".

## Part I. A first story

**1. The shape of a story file.** Line-oriented text; spaces only, a tab is an error; blocks open
with a header line and close at dedent or an `end <word>` line; blank lines and what they mean inside
prose and inside `create` blocks; `##` comment runs (column 1, blank-delimited, top level only).
Words, numbers, quoted strings, kebab-case keys. `story-file`, `comment-run`, the Layout summary.

**2. The story header.** `story` and its closed field set: `title` (required), `id`,
`story-version`, `ifid`, `authors`, `testers`, `description`, `prologue`. A prose field is literal
text unless it is one kebab word, which makes it a phrase reference. `story-header`, `meta-field`,
`name-list-field`, `prose-field`. (Client fields wait for Part VII; `states`, `score`, `use` and
`on every turn` in the header wait for the chapters that teach them.)

**3. The player and the start.** A `person` who is `playable`; `starts in`; the single
`before the game starts` block and `change the player to`; why that block carries no prose and the
header's `prologue` does. `start-block`.

**4. Build, play, read an error.** The tool chapter: compiling and playing a story from the
`sharpee` command and from Chord Writer, and how to read a diagnostic (its code, its span, its
fix-it). To check: the exact commands at the pin, from the published CLI only.

## Part II. The world

**5. Rooms and exits.** `create <name>`, the kind line (`a room`) and the folded head
(`create the Den, a room`); descriptions as bare paragraphs; `aka`; the twelve directions; one exit
per line and the `exits:` line; reverse exits are inferred; `, one-way`; `first time` prose;
`room name` blocks and their `while` arms; `dark`. `create`, `exit`, `exits-line`, `room-name-block`.

**6. Things.** `a thing`; placement `in` and `on`; `scenery`, `plural`, `proper`; `carries` and
`wears` for starting possessions; backdrops (`in the A, the B and the C`, or scenery placed in a
region); `unlisted`, `concealed`, `hiding-spot`. `composition`, `placement`.

**7. Containers and supporters.** `a container`, `a supporter`; `holds <n>`; `openable` and
`starts open|closed`; `transparent`; `open-inventory`; `enterable` and `climbable`. `holds-line`,
`STATE-INIT`.

**8. Doors, locks and keys.** `a door`; `<direction> to <room> through the <door>`; a door has no
placement because its place is its room pair; `lockable with the <key>`; `starts locked`;
`opens when unlocked`. `setting`, `opens-when-line`.

**9. What things can do: the trait words.** A tour of the closed adjective list, each with the
standard action it answers: `wearable` and `wearable on the <part>`; `readable`; `edible`,
`drinkable`, `servings <n>`; `switchable`, `powered by`, `closes when switched off`; `pushable`,
`pullable` and the `pushing` block; `breakable`, `fragile`, `starts broken`; `attached to` and
`detachable`; `cuttable`, `diggable`, `flammable` with their tools; `settable`; `costs <n> <currency>`.
The full list is `TRAIT_ADJECTIVES` in `catalog.ts`.

**10. Light, dark and the other senses.** `dark` rooms; `light-source`, `starts lit|unlit`;
`night-vision`; `listener`, `define sound <name>`, `play sound`, `after hearing the <sound>`;
`smelly` and `loud` through closed containers.

**11. Regions.** `a region`; membership by a room's own `in the <region>`; `rooms <stem> 1 to n`
groups; a region's `exits` table; `landing`; region clauses (`after the player entering`,
`after the player leaving`, `on every turn`). `room-group`, `exit-table`, `landing-line`.

**12. Ways that are closed, hidden or strange.** `<direction> is blocked [while …]: <phrase>`;
`<direction> is deadly: <phrase>`; an exit that exists only `while` a condition holds; `passage`
blocks, where the way is taken by typing its own command. `passage-block`.

## Part III. Making things happen

**13. States.** `states:` on a thing, on a trait and on the story; `, reversible`; `change <thing>
to <state>`; `is <state>`; the state pairs the platform already owns (open/closed, locked/unlocked,
on/off, lit/unlit, worn/unworn, whole/broken) and why a story does not redeclare them.
`states-line`, `PLATFORM_STATE_PAIRS`.

**14. Reacting to the player: `on` and `after`.** `on the player <gerund>` intercepts, `after …`
reacts; where a clause lives (on the thing it concerns); gerund lists; the counterpart tail
(`giving to the porter`, `putting in the font`); the value tail on `setting`; `while`; `, once`;
bare heads in a person's own block. `on-clause`, `clause-form`, `head`, `counterpart`.

**15. What a clause can say and do.** The statements: `phrase` (with an inline prose body),
`refuse`, `refuse when`, the `must` requirements, `change`, `move … to | here | offstage`, `remove`,
`set`, `make … wear | take off`, and the `when <condition>` suffix. `statement`, `must-line`,
`stmt-when`.

**16. Conditions.** `and`, `or`, `not`, parentheses; `is`, `is a`, `is in`, `is here`, `has`,
`holds`, `wears`, `can see`, `can reach`; `one chance in <n>`; `define condition`; the quantifiers
`any` and `no`; `each <condition>` blocks and `the match`. `condition`, `predicate`, `each-block`.

**17. Choosing between outcomes.** `select on <value>` with `when` arms; `select <strategy>` with
`or` arms; ordinal blocks (`first time`, `second time`, …). `select-on`, `select-strategy`,
`ordinal-block`.

**18. Counting, scoring and ending.** `counter` lines and `define counter`, `raise`, `lower`,
`set`, numeric comparisons; `score <name> worth <n>` and `award`; `use scoring` and its `rank`
ladder; `win`, `lose`, `kill the player`. `counter-line`, `score-line`, `use-scoring-line`.

**19. Time.** `on every turn` (on a thing, a region, the story); `define timer` with named turns,
`meanwhile`, `interrupted`; the timer verbs; `when <timer> expires`; `when <thing> moves`;
`define sequence` and its anchors; `use chapters`, `define chapters`, and `during | before | after
<chapter>`. `define-timer`, `timer-clause`, `move-clause`, `define-sequence`, `define-chapters`.

## Part IV. Words

**20. Phrases.** `define phrase`, `define phrases <locale>`; variants with `or`; the strategies
`randomly`, `cycling`, `stopping`, `sticky`, `first-time`; `verbatim`; `while` gates; parameters
(`with <name> = <value>`); markers in prose. To check: the marker forms that are current, since the
grammar says only `{ content }`. `define-phrase`, `STRATEGY`, `param`.

**21. A thing's own words.** Per-entity `phrase <key>:` overrides; the reserved keys (`present`,
`entered`, `exited`, `disappeared`, `detail`); `detail … while`. `phrase-override`.

**22. Changing the standard messages.** `override message <alias>`, `override messages <locale>`;
`define phrasebook … while`, `use phrasebook`, `import phrasebook`. `override-message`,
`define-phrasebook`.

**23. New verbs.** `define action`: the `grammar` block, slots (`the target`), alternation with
`or`, optional parts in brackets, `→` cardinality and `means` lines; slot lines (`must be reachable |
visible | held`, `takes the rest of the line`, `is a topic`, `is an instrument`); `directions`;
`refuse without`, `refuse when`, `otherwise refuse`; `about` rows; `define action … while`.
The ownership rule: an action never asks which thing was named; the thing answers in its own
`on the player <gerund>`. `define-action`, `pattern`, `action-line`.

**24. New kinds of thing.** `define trait`: `data` fields and their types, `states`, `score`,
`phrases`, `on` clauses, `it` and `its` meaning the carrier; composing a trait with settings
(`with <field> <value>`) and `while`; `is a <trait>` in conditions. `define-trait`, `trait-field`.

**25. Bending the standard grammar.** `extend action`, `remove from action`; grammar files
(`grammar "<name>"`) and `import`. `extend-action`, `remove-from-action`, `grammar-file`.

## Part V. People

**26. People who act.** `a person`; `pronouns` and `define pronouns`; the stock behaviors
(`wanderer`, `follower`, `patrol`) and their settings; the acting statement (`the porter opens the
gate`); `goal` blocks and their steps. `goal-block`, `verb-words`, the npc manifest.

**27. Asking and telling.** `define topics for <person>` with entity and quoted topics; topics on
a readable thing; `define greetings`; `define manner`. `define-topics`, `define-greetings`,
`define-manner`.

**28. Conversations with a shape.** `define exchange`, `then asks | invites`, `deflect to`,
`leave`; `define initiative` and `hold their tongue`; `define conversation` with beats, transitions
and a conclusion; the conditions `was discussed`, `is fresh | recent | stale`, `is concluded`,
`the subject changes`, `asked once | again | many times`.

**29. Inner lives.** Personality words and intensities on the kind line; `mood` and `define mood`;
`feels … toward`; `knows` and `thinks` with source and confidence; `define fact`; `spreads`;
`influence` blocks and `resists`; `cognitive-profile` and `define profile`; `change mood`,
`change feeling toward`; the conditions `feels` and `knows`.

**30. Principles.** `temperament` and `define temperament`; `never <act>`; `protects`;
`answers honestly`; `honor before` and `define honor`; `code` and `define code`; `burdened by`;
`define topic … as`.

**31. More than one protagonist.** Several `playable` people; `change the player to` during play;
`the player` as a role, resolved when a clause fires.

## Part VI. Larger machinery

**32. Machines.** `define machine`: roles, `starts`, states, `when … : <state>` transitions,
`on enter` and `on exit`. `define-machine`.

**33. Vehicles.** `a vehicle`; `movement:` (`none`, `line`, `streets`, `compass`, `flight`);
`carries:`, `drive:`, `commands:`, `stops:`, `direction:`, `pace:`, `destinations:`, `aboard:`,
`boarded through:`; the `position` block; `admits`; `to outside`; `start`, `stop`, `send`; the
conditions `is under way`, `is at`, `is heading`. `vehicle-line`, `position-block`.

**34. Open water and open ground.** `use expanses`: `an expanse`, `size:`, `landmarks`,
`visibility:`, `drift:`, `sight:`, `seen from afar:`, `movement: open`, `stride:`, placement
`at x, y`, and the distance conditions. `use sailing`: `wind:`, the `sailing` block, `sails:`,
`set … sails to`, `is in irons`. `expanse-line`, `landmarks-block`, `sailing-block`.

**35. The opt-in systems.** What `use` means; `use combat` (`combatant`, `weapon`); `use hunger`
with its rungs; the `, announce` suffix. `use-line`, `use-hunger-line`, the combat manifest.

## Part VII. Presentation

**36. Sound, music and pictures.** `define sound | image | music <name> from "<file>"`;
`define ambient`, `define layer`; `play`, `stop`, `show image`, `hide image`, `transition`, `clear`;
`client has <capability>`. `define-asset`, `media-statement`.

**37. The page the player sees.** The header's client fields (`client`, `theme`, `themes`,
`default-theme`, `template`, `storage-prefix`); `define channel` (mode, `gated by`, `return`,
records); `emit` with a payload. `client-config-field`, `define-channel`, `emit-field`.

## Part VIII. Proving and shipping

**38. Test trees.** Recording a play-through as a tree of cards, forks, and what a card asserts.
To check: the tree-authoring path a reader has from the published CLI alone.

**39. Claims.** The claims file: `claims … end claims`, `needs rooms | things | verbs`, `claim`
and `never`, and the predicates a claim may state. `claims-file`, `claim-predicate`.

**40. Publishing.** `ifid`, the story's version, the browser build, what ships.

## Appendices (generated, never hand-written)

A. The grammar (`chord.ebnf`). B. Kinds, trait words, state words and their pairings
(`catalog.ts`). C. The standard actions and their gerunds (`stdlib-manifest.ts`, the standard
grammar). D. Statements and conditions, one line each. E. Character vocabulary
(`character-manifest.ts`). F. Message aliases. G. Removed forms and their replacements (the grammar
names each one with a fix-it).

## Coverage notes

- Every top-level `declaration` alternative in the grammar has a chapter above.
- Constructs that depend on a `use` line are grouped in Part VI and Part III chapter 19 (chapters);
  the manual says at first mention which words need which line.
- The grammar names many removed spellings. They belong in Appendix G and in chapter 4's lesson on
  reading a fix-it, not in the teaching chapters.
