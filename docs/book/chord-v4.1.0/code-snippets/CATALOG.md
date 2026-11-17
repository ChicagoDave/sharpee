# Sharpee Book — Code Snippet Catalog

Every code and config snippet from *The Sharpee Author and Developer Manual*, extracted verbatim and organized by chapter in reading order.

- **355 snippets** across 41 chapters (354 author, 1 reference).
- Game-session transcripts (the `> look` ... output examples) are **not** included; they are example play sessions, not code.
- **author** snippets are the story code/config a reader writes (assembled in reading order into `src/index.ts` and project files).
- **reference** snippets are "Under the Hood" excerpts of the platform's own source (interfaces/classes you *import*, not code you write); their filenames carry a `.reference.` infix and are named for the symbol they document.
- File names are `NN-<slug>.<ext>`, where `NN` is the snippet's order within the chapter.

Regenerate with `node scripts/extract-book-snippets.cjs` (from `docs/book/`).

---

## How to read this book

`frontmatter-01-how-to-read/` &nbsp;·&nbsp; source: `docs/book/frontmatter/01-how-to-read.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-conventions.story` | Conventions | chord | author | 65 |

# Part I. A first story

## The shape of a story file

`ch01-the-shape-of-a-story-file/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/01-the-shape-of-a-story-file.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-shape-of-a-story-file.story` | The shape of a story file | chord | author | 19 |
| 02 | `02-how-a-block-ends.story` | How a block ends | chord | author | 124 |
| 03 | `03-comments.story` | Comments | chord | author | 159 |

## The story header

`ch02-the-story-header/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/02-the-story-header.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-story-header.story` | The story header | chord | author | 10 |
| 02 | `02-the-two-fields-every-header-needs.story` | The two fields every header needs | chord | author | 35 |
| 03 | `03-the-two-fields-every-header-needs.story` | The two fields every header needs | chord | author | 49 |
| 04 | `04-the-prologue.story` | The prologue | chord | author | 116 |

## The player and the start

`ch03-the-player-and-the-start/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/03-the-player-and-the-start.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-making-ansel.story` | Making Ansel | chord | author | 13 |
| 02 | `02-handing-over-the-role.story` | Handing over the role | chord | author | 57 |

## Build, play, read an error

`ch04-build-play-read-an-error/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/04-build-play-read-an-error.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-installing-the-command.sh` | Installing the command | shell | author | 24 |
| 02 | `02-installing-the-command.sh` | Installing the command | shell | author | 30 |
| 03 | `03-checking-the-story.sh` | Checking the story | shell | author | 53 |
| 04 | `04-playing-the-story.sh` | Playing the story | shell | author | 74 |
| 05 | `05-reading-an-error.sh` | Reading an error | shell | author | 136 |
| 06 | `06-two-mistakes-with-the-folder.reference.sh` | Two mistakes with the folder | shell | reference | 234 |

# Part II. The world

## Rooms and exits

`ch05-rooms-and-exits/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/05-rooms-and-exits.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-what-create-does.story` | What `create` does | chord | author | 19 |
| 02 | `02-what-create-does.story` | What `create` does | chord | author | 27 |
| 03 | `03-exits.story` | Exits | chord | author | 52 |
| 04 | `04-the-way-back-is-free.story` | The way back is free | chord | author | 86 |
| 05 | `05-one-way-exits.story` | One-way exits | chord | author | 109 |
| 06 | `06-the-rest-of-lanternhall.story` | The rest of Lanternhall | chord | author | 135 |
| 07 | `07-the-first-visit.story` | The first visit | chord | author | 185 |
| 08 | `08-a-heading-of-its-own.story` | A heading of its own | chord | author | 228 |
| 09 | `09-build-and-try-it.sh` | Build and try it | shell | author | 254 |

## Things

`ch06-things/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/06-things.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-thing-and-where-it-is.story` | A thing and where it is | chord | author | 14 |
| 02 | `02-things-that-stay-put.story` | Things that stay put | chord | author | 56 |
| 03 | `03-more-than-one-and-things-with-names.story` | More than one, and things with names | chord | author | 88 |
| 04 | `04-more-than-one-and-things-with-names.story` | More than one, and things with names | chord | author | 101 |
| 05 | `05-other-words-for-a-thing.story` | Other words for a thing | chord | author | 128 |
| 06 | `06-a-thing-in-several-rooms.story` | A thing in several rooms | chord | author | 152 |
| 07 | `07-what-ansel-carries.story` | What Ansel carries | chord | author | 175 |
| 08 | `08-hidden-things.story` | Hidden things | chord | author | 210 |
| 09 | `09-hidden-things.story` | Hidden things | chord | author | 239 |
| 10 | `10-build-and-try-it.sh` | Build and try it | shell | author | 257 |

## Containers and supporters

`ch07-containers-and-supporters/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/07-containers-and-supporters.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-two-kinds-that-hold.story` | Two kinds that hold | chord | author | 16 |
| 02 | `02-opening-and-closing.story` | Opening and closing | chord | author | 67 |
| 03 | `03-how-much-it-holds.story` | How much it holds | chord | author | 126 |
| 04 | `04-a-cupboard-on-the-wall.story` | A cupboard on the wall | chord | author | 147 |
| 05 | `05-seeing-through-and-saying-it-yourself.story` | Seeing through, and saying it yourself | chord | author | 177 |
| 06 | `06-seeing-through-and-saying-it-yourself.story` | Seeing through, and saying it yourself | chord | author | 210 |
| 07 | `07-getting-into-things.story` | Getting into things | chord | author | 224 |
| 08 | `08-build-and-try-it.sh` | Build and try it | shell | author | 255 |

## Doors, locks and keys

`ch08-doors-locks-and-keys/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/08-doors-locks-and-keys.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-door.story` | A door | chord | author | 13 |
| 02 | `02-a-door.story` | A door | chord | author | 24 |
| 03 | `03-a-lock-and-its-key.story` | A lock and its key | chord | author | 68 |
| 04 | `04-saving-the-player-a-step.story` | Saving the player a step | chord | author | 136 |
| 05 | `05-build-and-try-it.sh` | Build and try it | shell | author | 183 |

## What things can do: the trait words

`ch09-what-things-can-do-the-trait-words/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/09-what-things-can-do-the-trait-words.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-wearing.story` | Wearing | chord | author | 25 |
| 02 | `02-wearing.story` | Wearing | chord | author | 36 |
| 03 | `03-wearing.story` | Wearing | chord | author | 64 |
| 04 | `04-reading.story` | Reading | chord | author | 96 |
| 05 | `05-eating-and-drinking.story` | Eating and drinking | chord | author | 142 |
| 06 | `06-pulling-and-pushing.story` | Pulling and pushing | chord | author | 175 |
| 07 | `07-pulling-and-pushing.story` | Pulling and pushing | chord | author | 200 |
| 08 | `08-breaking.story` | Breaking | chord | author | 232 |
| 09 | `09-fixed-to-something.story` | Fixed to something | chord | author | 259 |
| 10 | `10-switching-on-and-off.story` | Switching on and off | chord | author | 286 |
| 11 | `11-build-and-try-it.sh` | Build and try it | shell | author | 330 |

## Light, dark and the other senses

`ch10-light-dark-and-the-other-senses/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/10-light-dark-and-the-other-senses.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-dark-room.story` | A dark room | chord | author | 13 |
| 02 | `02-a-light-to-carry.story` | A light to carry | chord | author | 56 |
| 03 | `03-seeing-in-the-dark.story` | Seeing in the dark | chord | author | 138 |
| 04 | `04-smell-and-sound.story` | Smell and sound | chord | author | 159 |
| 05 | `05-build-and-try-it.sh` | Build and try it | shell | author | 213 |

## Regions

`ch11-regions/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/11-regions.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-making-a-region.story` | Making a region | chord | author | 19 |
| 02 | `02-putting-rooms-in-it.story` | Putting rooms in it | chord | author | 34 |
| 03 | `03-scenery-for-a-whole-region.story` | Scenery for a whole region | chord | author | 63 |
| 04 | `04-a-run-of-rooms.story` | A run of rooms | chord | author | 99 |
| 05 | `05-a-table-of-exits.story` | A table of exits | chord | author | 123 |
| 06 | `06-a-backdrop-for-the-stacks.story` | A backdrop for the stacks | chord | author | 166 |
| 07 | `07-build-and-try-it.sh` | Build and try it | shell | author | 188 |

## Ways that are closed, hidden or strange

`ch12-ways-that-are-closed-hidden-or-strange/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/12-ways-that-are-closed-hidden-or-strange.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-way-that-refuses.story` | A way that refuses | chord | author | 15 |
| 02 | `02-a-way-that-refuses.story` | A way that refuses | chord | author | 30 |
| 03 | `03-a-way-that-refuses.story` | A way that refuses | chord | author | 61 |
| 04 | `04-a-way-that-kills.story` | A way that kills | chord | author | 86 |
| 05 | `05-a-way-that-kills.story` | A way that kills | chord | author | 92 |
| 06 | `06-a-way-that-is-sometimes-there.story` | A way that is sometimes there | chord | author | 124 |
| 07 | `07-a-way-with-its-own-command.story` | A way with its own command | chord | author | 146 |
| 08 | `08-build-and-try-it.sh` | Build and try it | shell | author | 218 |

# Part III. Making things happen

## States

`ch13-states/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/13-states.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-declaring-states.story` | Declaring states | chord | author | 23 |
| 02 | `02-declaring-states.story` | Declaring states | chord | author | 51 |
| 03 | `03-declaring-states.story` | Declaring states | chord | author | 58 |
| 04 | `04-declaring-states.story` | Declaring states | chord | author | 70 |
| 05 | `05-declaring-states.story` | Declaring states | chord | author | 80 |
| 06 | `06-reading-a-state.story` | Reading a state | chord | author | 113 |
| 07 | `07-changing-a-state.story` | Changing a state | chord | author | 130 |
| 08 | `08-changing-a-state.story` | Changing a state | chord | author | 139 |
| 09 | `09-states-that-go-both-ways.story` | States that go both ways | chord | author | 170 |
| 10 | `10-the-story-s-own-states.story` | The story's own states | chord | author | 198 |
| 11 | `11-the-states-you-do-not-declare.story` | The states you do not declare | chord | author | 250 |
| 12 | `12-build-and-try-it.sh` | Build and try it | shell | author | 275 |

## Reacting to the player: on and after

`ch14-reacting-to-the-player-on-and-after/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/14-reacting-to-the-player-on-and-after.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-thing-that-says-no.story` | A thing that says no | chord | author | 19 |
| 02 | `02-a-thing-that-says-no.story` | A thing that says no | chord | author | 40 |
| 03 | `03-speaking-in-the-action-s-place.story` | Speaking in the action's place | chord | author | 75 |
| 04 | `04-speaking-in-the-action-s-place.story` | Speaking in the action's place | chord | author | 91 |
| 05 | `05-adding-to-an-action-after.story` | Adding to an action: after | chord | author | 121 |
| 06 | `06-several-actions-one-clause.story` | Several actions, one clause | chord | author | 161 |
| 07 | `07-the-other-thing-in-the-command.story` | The other thing in the command | chord | author | 201 |
| 08 | `08-the-other-thing-in-the-command.story` | The other thing in the command | chord | author | 226 |
| 09 | `09-the-other-thing-in-the-command.story` | The other thing in the command | chord | author | 240 |
| 10 | `10-conditions-and-once.story` | Conditions and once | chord | author | 260 |
| 11 | `11-clauses-about-the-person.story` | Clauses about the person | chord | author | 293 |
| 12 | `12-build-and-try-it.sh` | Build and try it | shell | author | 331 |

## What a clause can say and do

`ch15-what-a-clause-can-say-and-do/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/15-what-a-clause-can-say-and-do.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-requirements-must.story` | Requirements: must | chord | author | 21 |
| 02 | `02-requirements-must.story` | Requirements: must | chord | author | 58 |
| 03 | `03-prohibitions-refuse-when.story` | Prohibitions: refuse when | chord | author | 75 |
| 04 | `04-printing-phrase.story` | Printing: phrase | chord | author | 123 |
| 05 | `05-changing-and-moving.story` | Changing and moving | chord | author | 154 |
| 06 | `06-changing-and-moving.story` | Changing and moving | chord | author | 163 |
| 07 | `07-changing-and-moving.story` | Changing and moving | chord | author | 202 |
| 08 | `08-the-when-suffix.story` | The when suffix | chord | author | 221 |
| 09 | `09-build-and-try-it.sh` | Build and try it | shell | author | 281 |

## Conditions

`ch16-conditions/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/16-conditions.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-what-a-condition-can-ask.story` | What a condition can ask | chord | author | 42 |
| 02 | `02-joining-conditions.story` | Joining conditions | chord | author | 54 |
| 03 | `03-joining-conditions.story` | Joining conditions | chord | author | 61 |
| 04 | `04-naming-a-condition.story` | Naming a condition | chord | author | 74 |
| 05 | `05-conditions-with-a-gap-it.story` | Conditions with a gap: it | chord | author | 97 |
| 06 | `06-conditions-with-a-gap-it.story` | Conditions with a gap: it | chord | author | 113 |
| 07 | `07-any-and-no.story` | Any and no | chord | author | 128 |
| 08 | `08-each.story` | Each | chord | author | 163 |
| 09 | `09-each.story` | Each | chord | author | 186 |
| 10 | `10-build-and-try-it.sh` | Build and try it | shell | author | 248 |

## Choosing between outcomes

`ch17-choosing-between-outcomes/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/17-choosing-between-outcomes.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-choosing-by-state-select-on.story` | Choosing by state: select on | chord | author | 17 |
| 02 | `02-refusals-stay-outside.story` | Refusals stay outside | chord | author | 52 |
| 03 | `03-refusals-stay-outside.story` | Refusals stay outside | chord | author | 69 |
| 04 | `04-one-clause-several-answers.story` | One clause, several answers | chord | author | 92 |
| 05 | `05-choosing-by-turn-select-with-a-strategy.story` | Choosing by turn: select with a strategy | chord | author | 133 |
| 06 | `06-choosing-by-count-first-time-second-time.story` | Choosing by count: first time, second time | chord | author | 195 |
| 07 | `07-build-and-try-it.sh` | Build and try it | shell | author | 274 |

## Counting, scoring and ending

`ch18-counting-scoring-and-ending/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/18-counting-scoring-and-ending.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-counter-on-a-thing.story` | A counter on a thing | chord | author | 14 |
| 02 | `02-a-counter-on-a-thing.story` | A counter on a thing | chord | author | 43 |
| 03 | `03-a-counter-on-a-thing.story` | A counter on a thing | chord | author | 66 |
| 04 | `04-a-counter-for-the-story.story` | A counter for the story | chord | author | 78 |
| 05 | `05-a-counter-for-the-story.story` | A counter for the story | chord | author | 86 |
| 06 | `06-a-counter-for-the-story.story` | A counter for the story | chord | author | 95 |
| 07 | `07-scoring.story` | Scoring | chord | author | 112 |
| 08 | `08-scoring.story` | Scoring | chord | author | 130 |
| 09 | `09-scoring.story` | Scoring | chord | author | 139 |
| 10 | `10-winning-and-losing.story` | Winning and losing | chord | author | 195 |
| 11 | `11-winning-and-losing.story` | Winning and losing | chord | author | 207 |
| 12 | `12-trying-the-endings.story` | Trying the endings | chord | author | 247 |
| 13 | `13-killing-the-player.story` | Killing the player | chord | author | 298 |
| 14 | `14-build-and-try-it.sh` | Build and try it | shell | author | 334 |

## Time

`ch19-time/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/19-time.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-every-turn.story` | Every turn | chord | author | 21 |
| 02 | `02-every-turn.story` | Every turn | chord | author | 27 |
| 03 | `03-timers.story` | Timers | chord | author | 93 |
| 04 | `04-timers.story` | Timers | chord | author | 113 |
| 05 | `05-timers.story` | Timers | chord | author | 142 |
| 06 | `06-timers.story` | Timers | chord | author | 156 |
| 07 | `07-more-about-timers.story` | More about timers | chord | author | 196 |
| 08 | `08-a-sequence.story` | A sequence | chord | author | 228 |
| 09 | `09-chapters.story` | Chapters | chord | author | 276 |
| 10 | `10-chapters.story` | Chapters | chord | author | 305 |
| 11 | `11-build-and-try-it.sh` | Build and try it | shell | author | 361 |

# Part IV. Words

## Phrases

`ch20-phrases/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/20-phrases.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-two-ways-to-declare-a-phrase.story` | Two ways to declare a phrase | chord | author | 22 |
| 02 | `02-two-ways-to-declare-a-phrase.story` | Two ways to declare a phrase | chord | author | 37 |
| 03 | `03-variants-and-strategies.story` | Variants and strategies | chord | author | 56 |
| 04 | `04-the-sayings-of-hobb.story` | The sayings of Hobb | chord | author | 103 |
| 05 | `05-the-sayings-of-hobb.story` | The sayings of Hobb | chord | author | 118 |
| 06 | `06-text-that-keeps-its-shape.story` | Text that keeps its shape | chord | author | 158 |
| 07 | `07-text-that-keeps-its-shape.story` | Text that keeps its shape | chord | author | 170 |
| 08 | `08-markers.story` | Markers | chord | author | 208 |
| 09 | `09-markers.story` | Markers | chord | author | 222 |
| 10 | `10-a-phrase-inside-a-description.story` | A phrase inside a description | chord | author | 271 |
| 11 | `11-a-phrase-inside-a-description.story` | A phrase inside a description | chord | author | 283 |
| 12 | `12-build-and-try-it.sh` | Build and try it | shell | author | 327 |

## A thing's own words

`ch21-a-things-own-words/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/21-a-things-own-words.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-detail-a-sentence-that-depends.story` | Detail: a sentence that depends | chord | author | 21 |
| 02 | `02-detail-a-sentence-that-depends.story` | Detail: a sentence that depends | chord | author | 74 |
| 03 | `03-detail-a-sentence-that-depends.story` | Detail: a sentence that depends | chord | author | 123 |
| 04 | `04-present-how-a-thing-is-announced.story` | Present: how a thing is announced | chord | author | 164 |
| 05 | `05-disappeared-a-parting-line.story` | Disappeared: a parting line | chord | author | 203 |
| 06 | `06-build-and-try-it.sh` | Build and try it | shell | author | 245 |

## Changing the standard messages

`ch22-changing-the-standard-messages/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/22-changing-the-standard-messages.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-finding-a-message.sh` | Finding a message | shell | author | 17 |
| 02 | `02-overriding-one-message.story` | Overriding one message | chord | author | 52 |
| 03 | `03-an-override-is-a-phrase.story` | An override is a phrase | chord | author | 80 |
| 04 | `04-several-at-once.story` | Several at once | chord | author | 111 |
| 05 | `05-the-markers-in-a-template.story` | The markers in a template | chord | author | 146 |
| 06 | `06-phrasebooks.story` | Phrasebooks | chord | author | 189 |
| 07 | `07-phrases-in-a-file-of-their-own.story` | Phrases in a file of their own | chord | author | 261 |
| 08 | `08-build-and-try-it.sh` | Build and try it | shell | author | 281 |

## New verbs

`ch23-new-verbs/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/23-new-verbs.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-declaring-an-action.story` | Declaring an action | chord | author | 16 |
| 02 | `02-the-grammar.story` | The grammar | chord | author | 52 |
| 03 | `03-the-grammar.story` | The grammar | chord | author | 62 |
| 04 | `04-what-must-be-true-of-the-thing-named.story` | What must be true of the thing named | chord | author | 84 |
| 05 | `05-what-must-be-true-of-the-player.story` | What must be true of the player | chord | author | 110 |
| 06 | `06-when-nothing-answers.story` | When nothing answers | chord | author | 149 |
| 07 | `07-when-nothing-answers.story` | When nothing answers | chord | author | 174 |
| 08 | `08-the-four-workings.story` | The four workings | chord | author | 184 |
| 09 | `09-a-verb-that-only-answers.story` | A verb that only answers | chord | author | 224 |
| 10 | `10-verbs-with-a-subject.story` | Verbs with a subject | chord | author | 259 |
| 11 | `11-other-kinds-of-slot.story` | Other kinds of slot | chord | author | 313 |
| 12 | `12-a-verb-that-comes-and-goes.story` | A verb that comes and goes | chord | author | 337 |
| 13 | `13-build-and-try-it.sh` | Build and try it | shell | author | 384 |

## New kinds of thing

`ch24-new-kinds-of-thing/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/24-new-kinds-of-thing.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-trait-that-answers-a-verb.story` | A trait that answers a verb | chord | author | 19 |
| 02 | `02-a-trait-that-answers-a-verb.story` | A trait that answers a verb | chord | author | 41 |
| 03 | `03-one-trait-several-things.story` | One trait, several things | chord | author | 86 |
| 04 | `04-a-trait-may-answer-standard-actions-too.story` | A trait may answer standard actions too | chord | author | 125 |
| 05 | `05-a-trait-with-one-thing.story` | A trait with one thing | chord | author | 158 |
| 06 | `06-a-trait-with-one-thing.story` | A trait with one thing | chord | author | 166 |
| 07 | `07-a-trait-with-states-and-a-score.story` | A trait with states and a score | chord | author | 213 |
| 08 | `08-a-trait-with-states-and-a-score.story` | A trait with states and a score | chord | author | 238 |
| 09 | `09-a-thing-s-own-words-again.story` | A thing's own words, again | chord | author | 254 |
| 10 | `10-a-thing-s-own-words-again.story` | A thing's own words, again | chord | author | 281 |
| 11 | `11-the-bell-and-the-grille.story` | The bell and the grille | chord | author | 313 |
| 12 | `12-data-on-a-trait.story` | Data on a trait | chord | author | 373 |
| 13 | `13-data-on-a-trait.story` | Data on a trait | chord | author | 398 |
| 14 | `14-is-it-a-wick.story` | Is it a wick? | chord | author | 423 |
| 15 | `15-build-and-try-it.sh` | Build and try it | shell | author | 445 |

## Bending the standard grammar

`ch25-bending-the-standard-grammar/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/25-bending-the-standard-grammar.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-adding-words-to-an-action.story` | Adding words to an action | chord | author | 19 |
| 02 | `02-extending-a-standard-action.story` | Extending a standard action | chord | author | 55 |
| 03 | `03-taking-words-away.story` | Taking words away | chord | author | 89 |
| 04 | `04-moving-a-word.story` | Moving a word | chord | author | 116 |
| 05 | `05-a-file-for-the-grammar.story` | A file for the grammar | chord | author | 185 |
| 06 | `06-a-file-for-the-grammar.story` | A file for the grammar | chord | author | 192 |
| 07 | `07-build-and-try-it.sh` | Build and try it | shell | author | 227 |

# Part V. People

## People who act

`ch26-people-who-act/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/26-people-who-act.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-pronouns.story` | Pronouns | chord | author | 25 |
| 02 | `02-pronouns.story` | Pronouns | chord | author | 40 |
| 03 | `03-pronouns.story` | Pronouns | chord | author | 50 |
| 04 | `04-a-set-of-your-own.story` | A set of your own | chord | author | 83 |
| 05 | `05-the-stock-behaviours.story` | The stock behaviours | chord | author | 121 |
| 06 | `06-the-stock-behaviours.story` | The stock behaviours | chord | author | 135 |
| 07 | `07-the-five-words.story` | The five words | chord | author | 175 |
| 08 | `08-having-a-person-do-something.story` | Having a person do something | chord | author | 228 |
| 09 | `09-goals.story` | Goals | chord | author | 289 |
| 10 | `10-the-steps.story` | The steps | chord | author | 362 |
| 11 | `11-when-a-goal-is-active.story` | When a goal is active | chord | author | 425 |
| 12 | `12-build-and-try-it.sh` | Build and try it | shell | author | 484 |

## Asking and telling

`ch27-asking-and-telling/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/27-asking-and-telling.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-table-of-topics.story` | A table of topics | chord | author | 17 |
| 02 | `02-a-thing-as-a-subject.story` | A thing as a subject | chord | author | 72 |
| 03 | `03-what-a-row-can-do.story` | What a row can do | chord | author | 107 |
| 04 | `04-what-a-row-can-do.story` | What a row can do | chord | author | 118 |
| 05 | `05-a-subject-nobody-has.story` | A subject nobody has | chord | author | 162 |
| 06 | `06-looking-things-up.story` | Looking things up | chord | author | 185 |
| 07 | `07-greetings.story` | Greetings | chord | author | 213 |
| 08 | `08-the-line-a-greeting-needs.story` | The line a greeting needs | chord | author | 264 |
| 09 | `09-manner.story` | Manner | chord | author | 282 |
| 10 | `10-build-and-try-it.sh` | Build and try it | shell | author | 321 |

## Conversations with a shape

`ch28-conversations-with-a-shape/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/28-conversations-with-a-shape.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-conversations-with-a-shape.story` | Conversations with a shape | chord | author | 19 |
| 02 | `02-a-thread.story` | A thread | chord | author | 34 |
| 03 | `03-a-question.story` | A question | chord | author | 102 |
| 04 | `04-a-way-back.story` | A way back | chord | author | 181 |
| 05 | `05-how-many-times.story` | How many times | chord | author | 230 |
| 06 | `06-what-has-been-discussed.story` | What has been discussed | chord | author | 257 |
| 07 | `07-sending-a-subject-elsewhere.story` | Sending a subject elsewhere | chord | author | 291 |
| 08 | `08-speaking-first.story` | Speaking first | chord | author | 305 |
| 09 | `09-build-and-try-it.sh` | Build and try it | shell | author | 341 |

## Inner lives

`ch29-inner-lives/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/29-inner-lives.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-mood.story` | Mood | chord | author | 27 |
| 02 | `02-mood.story` | Mood | chord | author | 43 |
| 03 | `03-a-mood-of-your-own.story` | A mood of your own | chord | author | 63 |
| 04 | `04-changing-a-mood.story` | Changing a mood | chord | author | 74 |
| 05 | `05-feelings.story` | Feelings | chord | author | 110 |
| 06 | `06-feelings.story` | Feelings | chord | author | 124 |
| 07 | `07-changing-a-feeling.story` | Changing a feeling | chord | author | 144 |
| 08 | `08-changing-a-feeling.story` | Changing a feeling | chord | author | 173 |
| 09 | `09-changing-a-feeling.story` | Changing a feeling | chord | author | 184 |
| 10 | `10-what-a-person-knows.story` | What a person knows | chord | author | 213 |
| 11 | `11-what-a-person-knows.story` | What a person knows | chord | author | 228 |
| 12 | `12-telling-one-another.story` | Telling one another | chord | author | 241 |
| 13 | `13-build-and-try-it.sh` | Build and try it | shell | author | 291 |

## Principles

`ch30-principles/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/30-principles.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-principles.story` | Principles | chord | author | 14 |
| 02 | `02-something-told-in-confidence.story` | Something told in confidence | chord | author | 36 |
| 03 | `03-something-told-in-confidence.story` | Something told in confidence | chord | author | 48 |
| 04 | `04-a-thing-a-person-will-not-do.story` | A thing a person will not do | chord | author | 59 |
| 05 | `05-a-thing-a-person-will-not-do.story` | A thing a person will not do | chord | author | 84 |
| 06 | `06-what-decides-between-principles.story` | What decides between principles | chord | author | 103 |
| 07 | `07-what-decides-between-principles.story` | What decides between principles | chord | author | 112 |
| 08 | `08-honesty.story` | Honesty | chord | author | 155 |
| 09 | `09-honesty.story` | Honesty | chord | author | 168 |
| 10 | `10-build-and-try-it.sh` | Build and try it | shell | author | 223 |

## More than one protagonist

`ch31-more-than-one-protagonist/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/31-more-than-one-protagonist.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-two-people-who-can-be-played.story` | Two people who can be played | chord | author | 15 |
| 02 | `02-two-people-who-can-be-played.story` | Two people who can be played | chord | author | 31 |
| 03 | `03-handing-the-role-over.story` | Handing the role over | chord | author | 52 |
| 04 | `04-the-player-is-whoever-has-the-role.story` | The player is whoever has the role | chord | author | 115 |
| 05 | `05-the-player-is-whoever-has-the-role.story` | The player is whoever has the role | chord | author | 125 |
| 06 | `06-what-a-room-says-about-someone.story` | What a room says about someone | chord | author | 150 |
| 07 | `07-keeping-a-scene-where-it-belongs.story` | Keeping a scene where it belongs | chord | author | 171 |
| 08 | `08-handing-it-back.story` | Handing it back | chord | author | 190 |
| 09 | `09-build-and-try-it.sh` | Build and try it | shell | author | 264 |

# Part VI. Larger machinery

## Machines

`ch32-machines/` &nbsp;·&nbsp; source: `docs/book/parts/part-6/32-machines.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-parts.story` | The parts | chord | author | 29 |
| 02 | `02-the-machine.story` | The machine | chord | author | 60 |
| 03 | `03-moving-between-states.story` | Moving between states | chord | author | 107 |
| 04 | `04-moving-between-states.story` | Moving between states | chord | author | 128 |
| 05 | `05-moving-between-states.story` | Moving between states | chord | author | 142 |
| 06 | `06-telling-the-world.story` | Telling the world | chord | author | 191 |
| 07 | `07-telling-the-world.story` | Telling the world | chord | author | 203 |
| 08 | `08-build-and-try-it.sh` | Build and try it | shell | author | 230 |

## Vehicles

`ch33-vehicles/` &nbsp;·&nbsp; source: `docs/book/parts/part-6/33-vehicles.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-problem-for-a-vehicle.story` | A problem for a vehicle | chord | author | 24 |
| 02 | `02-the-book-hoist.story` | The book hoist | chord | author | 45 |
| 03 | `03-a-vehicle-that-is-driven.story` | A vehicle that is driven | chord | author | 165 |
| 04 | `04-flight.story` | Flight | chord | author | 222 |
| 05 | `05-a-vehicle-the-player-steers.story` | A vehicle the player steers | chord | author | 267 |
| 06 | `06-a-vehicle-the-player-steers.story` | A vehicle the player steers | chord | author | 301 |
| 07 | `07-a-vehicle-with-rooms-inside.story` | A vehicle with rooms inside | chord | author | 315 |
| 08 | `08-build-and-try-it.sh` | Build and try it | shell | author | 367 |

## Open water and open ground

`ch34-open-water-and-open-ground/` &nbsp;·&nbsp; source: `docs/book/parts/part-6/34-open-water-and-open-ground.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-turning-the-system-on.story` | Turning the system on | chord | author | 24 |
| 02 | `02-an-expanse.story` | An expanse | chord | author | 41 |
| 03 | `03-an-expanse.story` | An expanse | chord | author | 69 |
| 04 | `04-rooms-seen-from-the-water.story` | Rooms seen from the water | chord | author | 79 |
| 05 | `05-rooms-seen-from-the-water.story` | Rooms seen from the water | chord | author | 102 |
| 06 | `06-a-vehicle-on-open-water.story` | A vehicle on open water | chord | author | 111 |
| 07 | `07-a-vehicle-on-open-water.story` | A vehicle on open water | chord | author | 151 |
| 08 | `08-looking-across-water.story` | Looking across water | chord | author | 193 |
| 09 | `09-looking-across-water.story` | Looking across water | chord | author | 202 |
| 10 | `10-things-adrift.story` | Things adrift | chord | author | 284 |
| 11 | `11-the-new-ending.story` | The new ending | chord | author | 302 |
| 12 | `12-the-new-ending.story` | The new ending | chord | author | 316 |
| 13 | `13-the-new-ending.story` | The new ending | chord | author | 323 |
| 14 | `14-build-and-try-it.sh` | Build and try it | shell | author | 360 |

## The opt-in systems

`ch35-the-opt-in-systems/` &nbsp;·&nbsp; source: `docs/book/parts/part-6/35-the-opt-in-systems.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-opt-in-systems.story` | The opt-in systems | chord | author | 10 |
| 02 | `02-combat.story` | Combat | chord | author | 68 |
| 03 | `03-hunger.story` | Hunger | chord | author | 125 |
| 04 | `04-announcing.story` | Announcing | chord | author | 187 |
| 05 | `05-build-and-try-it.sh` | Build and try it | shell | author | 218 |

# Part VII. Presentation

## Sound, music and pictures

`ch36-sound-music-and-pictures/` &nbsp;·&nbsp; source: `docs/book/parts/part-7/36-sound-music-and-pictures.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-declaring-an-asset.story` | Declaring an asset | chord | author | 31 |
| 02 | `02-playing-a-sound.story` | Playing a sound | chord | author | 53 |
| 03 | `03-a-sound-is-also-a-sound-in-the-world.story` | A sound is also a sound in the world | chord | author | 88 |
| 04 | `04-what-a-sound-sounds-like.story` | What a sound sounds like | chord | author | 132 |
| 05 | `05-what-a-sound-sounds-like.story` | What a sound sounds like | chord | author | 144 |
| 06 | `06-from-afar-and-with-no-file.story` | From afar, and with no file | chord | author | 176 |
| 07 | `07-from-afar-and-with-no-file.story` | From afar, and with no file | chord | author | 187 |
| 08 | `08-a-bed-of-sound.story` | A bed of sound | chord | author | 243 |
| 09 | `09-showing-a-picture.story` | Showing a picture | chord | author | 265 |
| 10 | `10-showing-a-picture.story` | Showing a picture | chord | author | 280 |
| 11 | `11-music-named-beds-and-layers.story` | Music, named beds and layers | chord | author | 296 |
| 12 | `12-music-named-beds-and-layers.story` | Music, named beds and layers | chord | author | 337 |
| 13 | `13-asking-what-the-client-can-do.story` | Asking what the client can do | chord | author | 366 |
| 14 | `14-build-and-try-it.sh` | Build and try it | shell | author | 403 |

## The page the player sees

`ch37-the-page-the-player-sees/` &nbsp;·&nbsp; source: `docs/book/parts/part-7/37-the-page-the-player-sees.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-client-fields.story` | The client fields | chord | author | 28 |
| 02 | `02-building-the-page.sh` | Building the page | shell | author | 73 |
| 03 | `03-building-the-page.sh` | Building the page | shell | author | 120 |
| 04 | `04-a-channel.story` | A channel | chord | author | 137 |
| 05 | `05-raising-an-event.story` | Raising an event | chord | author | 166 |
| 06 | `06-what-a-channel-may-return.story` | What a channel may return | chord | author | 222 |
| 07 | `07-what-a-channel-may-return.story` | What a channel may return | chord | author | 252 |
| 08 | `08-a-reference-in-a-field.story` | A reference in a field | chord | author | 279 |
| 09 | `09-the-stylesheet.css` | The stylesheet | css | author | 294 |
| 10 | `10-build-and-try-it.sh` | Build and try it | shell | author | 343 |

# Part VIII. Proving and shipping

## Test trees

`ch38-test-trees/` &nbsp;·&nbsp; source: `docs/book/parts/part-8/38-test-trees.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-reading-what-the-story-says.sh` | Reading what the story says | shell | author | 130 |
| 02 | `02-running-the-tree.sh` | Running the tree | shell | author | 225 |
| 03 | `03-build-and-try-it.sh` | Build and try it | shell | author | 431 |

## Claims

`ch39-claims/` &nbsp;·&nbsp; source: `docs/book/parts/part-8/39-claims.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-a-fact-worth-keeping.sh` | A fact worth keeping | shell | author | 48 |
| 02 | `02-locking-it.sh` | Locking it | shell | author | 83 |
| 03 | `03-the-claims-file.story` | The claims file | chord | author | 145 |
| 04 | `04-the-report.sh` | The report | shell | author | 215 |
| 05 | `05-a-claim-written-by-hand.story` | A claim written by hand | chord | author | 309 |
| 06 | `06-a-claim-no-line-reaches.story` | A claim no line reaches | chord | author | 366 |
| 07 | `07-the-needs-lines.story` | The needs lines | chord | author | 457 |
| 08 | `08-build-and-try-it.sh` | Build and try it | shell | author | 512 |

## Publishing

`ch40-publishing/` &nbsp;·&nbsp; source: `docs/book/parts/part-8/40-publishing.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-identifier.story` | The identifier | chord | author | 48 |
| 02 | `02-the-identifier.sh` | The identifier | shell | author | 76 |
| 03 | `03-the-version.story` | The version | chord | author | 101 |
| 04 | `04-whether-the-source-goes-too.story` | Whether the source goes too | chord | author | 120 |
| 05 | `05-publish.sh` | Publish | shell | author | 136 |
| 06 | `06-publish.sh` | Publish | shell | author | 146 |
| 07 | `07-build-and-try-it.sh` | Build and try it | shell | author | 262 |

