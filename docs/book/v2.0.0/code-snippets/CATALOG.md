# Sharpee Book — Code Snippet Catalog

Every code and config snippet from *The Sharpee Author and Developer Manual*, extracted verbatim and organized by chapter in reading order.

- **152 snippets** across 31 chapters (149 author, 3 reference).
- Game-session transcripts (the `> look` ... output examples) are **not** included; they are example play sessions, not code.
- **author** snippets are the story code/config a reader writes (assembled in reading order into `src/index.ts` and project files).
- **reference** snippets are "Under the Hood" excerpts of the platform's own source (interfaces/classes you *import*, not code you write); their filenames carry a `.reference.` infix and are named for the symbol they document.
- File names are `NN-<slug>.<ext>`, where `NN` is the snippet's order within the chapter.

Regenerate with `node scripts/extract-book-snippets.cjs` (from `docs/book/`).

---

## How to Read This Book

`frontmatter-02-how-to-read/` &nbsp;·&nbsp; source: `docs/book/frontmatter/02-how-to-read.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-containertrait.reference.ts` | The "Under the Hood" box | typescript | reference — `ContainerTrait` | 47 |

# Volume I — Getting Started

## Installing Sharpee: The CLI and Your First Project

`ch01-installing-sharpee/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/01-installing-sharpee.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-working-in-a-terminal.sh` | Working in a terminal | bash | author | 54 |
| 02 | `02-installing-node-and-npm.sh` | Installing Node and npm | bash | author | 76 |
| 03 | `03-installing-the-cli.sh` | Installing the CLI | bash | author | 90 |
| 04 | `04-creating-a-story-project.sh` | Creating a story project | bash | author | 106 |
| 05 | `05-building-the-story.sh` | Building the story | bash | author | 132 |
| 06 | `06-playing-it.sh` | Playing it | bash | author | 153 |
| 07 | `07-playing-it.sh` | Playing it | bash | author | 162 |
| 08 | `08-a-typescript-primer.ts` | A TypeScript primer | typescript | author | 202 |
| 09 | `09-a-typescript-primer.ts` | A TypeScript primer | typescript | author | 214 |
| 10 | `10-a-typescript-primer.ts` | A TypeScript primer | typescript | author | 222 |
| 11 | `11-a-typescript-primer.ts` | A TypeScript primer | typescript | author | 230 |
| 12 | `12-a-typescript-primer.ts` | A TypeScript primer | typescript | author | 236 |
| 13 | `13-a-typescript-primer.ts` | A TypeScript primer | typescript | author | 244 |

## Your First Room: Entities, Traits, and the World

`ch02-your-first-room/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/02-your-first-room.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-story.reference.ts` | The Story interface | typescript | reference — `Story` | 22 |
| 02 | `02-the-shape-of-the-file.ts` | The shape of the file | typescript | author | 60 |
| 03 | `03-creating-the-player.ts` | Creating the player | typescript | author | 113 |
| 04 | `04-containertrait.reference.ts` | Creating the player | typescript | reference — `ContainerTrait` | 140 |
| 05 | `05-building-the-world.ts` | Building the world | typescript | author | 161 |
| 06 | `06-exposing-the-story.ts` | Exposing the story | typescript | author | 229 |
| 07 | `07-prove-it-your-first-transcript-test.sh` | Prove it: your first transcript test | bash | author | 295 |

## The Play Loop: How a Turn Works

`ch03-the-play-loop/` &nbsp;·&nbsp; source: `docs/book/parts/part-1/03-the-play-loop.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-events-become-text.ts` | Events become text | typescript | author | 65 |

# Volume II — Building a World

## Rooms & Navigation: Exits Wired in Pairs

`ch04-rooms-and-navigation/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/04-rooms-and-navigation.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-exits-live-on-the-room.ts` | Exits live on the room | typescript | author | 21 |
| 02 | `02-two-rules-that-trip-up-everyone.ts` | Two rules that trip up everyone | typescript | author | 40 |
| 03 | `03-getting-a-trait-back-with-get.ts` | Getting a trait back with `.get()` | typescript | author | 62 |
| 04 | `04-getting-a-trait-back-with-get.ts` | Getting a trait back with `.get()` | typescript | author | 70 |
| 05 | `05-putting-it-together.ts` | Putting it together | typescript | author | 82 |
| 06 | `06-putting-it-together.ts` | Putting it together | typescript | author | 94 |

## Scenery & Portable Objects: Everything Is Portable by Default

`ch05-scenery-and-portable-objects/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/05-scenery-and-portable-objects.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-everything-is-portable-by-default.ts` | Everything is portable by default | typescript | author | 22 |
| 02 | `02-entitytype-scenery-makes-a-thing-fixed.ts` | EntityType.SCENERY makes a thing fixed | typescript | author | 48 |
| 03 | `03-aliases-make-objects-findable.ts` | Aliases make objects findable | typescript | author | 99 |
| 04 | `04-putting-it-together.ts` | Putting it together | typescript | author | 159 |

## Containers & Supporters: What Holds What

`ch06-containers-and-supporters/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/06-containers-and-supporters.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-containertrait.ts` | ContainerTrait | typescript | author | 33 |
| 02 | `02-portable-vs-fixed-containers.ts` | Portable vs fixed containers | typescript | author | 69 |
| 03 | `03-supportertrait.ts` | SupporterTrait | typescript | author | 97 |
| 04 | `04-supportertrait.ts` | SupporterTrait | typescript | author | 108 |
| 05 | `05-capacity-limits.ts` | Capacity limits | typescript | author | 137 |

## Openable Things, Locked Doors & Keys: Gating the Way Through

`ch07-openable-locked-doors-and-keys/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/07-openable-locked-doors-and-keys.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-openabletrait.ts` | OpenableTrait | typescript | author | 19 |
| 02 | `02-stocking-a-container-that-starts-closed.ts` | Stocking a container that starts closed | typescript | author | 55 |
| 03 | `03-lockabletrait.ts` | LockableTrait | typescript | author | 73 |
| 04 | `04-doortrait-and-the-exit-via-property.ts` | DoorTrait and the exit `via` property | typescript | author | 111 |
| 05 | `05-doortrait-and-the-exit-via-property.ts` | DoorTrait and the exit `via` property | typescript | author | 122 |
| 06 | `06-wiring-it-all-together.ts` | Wiring it all together | typescript | author | 161 |
| 07 | `07-wiring-it-all-together.ts` | Wiring it all together | typescript | author | 171 |

## Light & Dark: What the Player Can See

`ch08-light-and-dark/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/08-light-and-dark.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-dark-rooms.ts` | Dark rooms | typescript | author | 19 |
| 02 | `02-lightsourcetrait.ts` | LightSourceTrait | typescript | author | 35 |
| 03 | `03-switchabletrait.ts` | SwitchableTrait | typescript | author | 50 |
| 04 | `04-the-flashlight-pattern.ts` | The flashlight pattern | typescript | author | 76 |
| 05 | `05-other-light-source-patterns.ts` | Other light-source patterns | typescript | author | 107 |
| 06 | `06-other-light-source-patterns.ts` | Other light-source patterns | typescript | author | 113 |
| 07 | `07-other-light-source-patterns.ts` | Other light-source patterns | typescript | author | 125 |
| 08 | `08-wiring-it-into-the-zoo.ts` | Wiring it into the zoo | typescript | author | 141 |
| 09 | `09-wiring-it-into-the-zoo.ts` | Wiring it into the zoo | typescript | author | 151 |

## The Map & Regions: Grouping Rooms

`ch09-the-map-and-regions/` &nbsp;·&nbsp; source: `docs/book/parts/part-2/09-the-map-and-regions.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-regions-grouping-rooms.ts` | Regions: grouping rooms | typescript | author | 42 |
| 02 | `02-regions-grouping-rooms.ts` | Regions: grouping rooms | typescript | author | 58 |
| 03 | `03-crossing-the-boundary.ts` | Crossing the boundary | typescript | author | 96 |
| 04 | `04-nesting-and-querying.ts` | Nesting and querying | typescript | author | 121 |

# Volume III — Making It Interactive

## The Standard Actions: The Four-Phase Model

`ch10-standard-actions-and-the-four-phase-model/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/10-standard-actions-and-the-four-phase-model.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-one-shape-for-every-action.ts` | One shape for every action | typescript | author | 42 |

## Readable Objects & Switchable Devices: Things That Carry State

`ch12-readable-objects-and-switchable-devices/` &nbsp;·&nbsp; source: `docs/book/parts/part-3/12-readable-objects-and-switchable-devices.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-readable-objects-switchable-devices-things-that-ca.ts` | Readable Objects & Switchable Devices: Things That Carry State | typescript | author | 16 |
| 02 | `02-readabletrait-what-an-object-says.ts` | ReadableTrait: what an object says | typescript | author | 28 |
| 03 | `03-readable-scenery-the-info-plaque.ts` | Readable scenery: the info plaque | typescript | author | 57 |
| 04 | `04-readable-items-the-brochure.ts` | Readable items: the brochure | typescript | author | 94 |
| 05 | `05-switchabletrait-a-device-with-on-off-state.ts` | SwitchableTrait: a device with on/off state | typescript | author | 129 |

# Volume IV — Custom Behavior

## Event Handlers: Reacting to What Happens

`ch13-event-handlers/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/13-event-handlers.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-two-kinds-of-handler.ts` | Two kinds of handler | typescript | author | 47 |
| 02 | `02-two-kinds-of-handler.ts` | Two kinds of handler | typescript | author | 58 |
| 03 | `03-reading-the-event-data.ts` | Reading the event data | typescript | author | 93 |
| 04 | `04-setting-up-the-gift-shop-the-press-and-remembering.ts` | Setting up: the gift shop, the press, and remembering IDs | typescript | author | 112 |
| 05 | `05-setting-up-the-gift-shop-the-press-and-remembering.ts` | Setting up: the gift shop, the press, and remembering IDs | typescript | author | 136 |
| 06 | `06-setting-up-the-gift-shop-the-press-and-remembering.ts` | Setting up: the gift shop, the press, and remembering IDs | typescript | author | 189 |
| 07 | `07-reaction-pattern-the-goats-eat-the-feed.ts` | Reaction pattern: the goats eat the feed | typescript | author | 201 |
| 08 | `08-transformation-pattern-put-a-in-get-b-out.ts` | Transformation pattern: put A in, get B out | typescript | author | 250 |

## Custom Actions: Teaching the Parser New Verbs

`ch14-custom-actions/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/14-custom-actions.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-custom-actions-teaching-the-parser-new-verbs.ts` | Custom Actions: Teaching the Parser New Verbs | typescript | author | 12 |
| 02 | `02-the-four-phase-action.ts` | The four-phase action | typescript | author | 34 |
| 03 | `03-a-complete-custom-action-feeding.ts` | A complete custom action: feeding | typescript | author | 82 |
| 04 | `04-a-second-action-photographing.ts` | A second action: photographing | typescript | author | 187 |
| 05 | `05-a-second-action-photographing.ts` | A second action: photographing | typescript | author | 242 |
| 06 | `06-telling-the-engine-getcustomactions.ts` | Telling the engine: getCustomActions | typescript | author | 263 |
| 07 | `07-teaching-the-parser-extendparser.ts` | Teaching the parser: extendParser | typescript | author | 274 |
| 08 | `08-supplying-the-text-extendlanguage.ts` | Supplying the text: extendLanguage | typescript | author | 301 |

## Capability Dispatch: One Verb, Many Rules

`ch15-capability-dispatch/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/15-capability-dispatch.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-capability-dispatch-one-verb-many-rules.ts` | Capability Dispatch: One Verb, Many Rules | typescript | author | 13 |
| 02 | `02-1-a-trait-that-declares-a-capability.ts` | 1. A trait that declares a capability | typescript | author | 48 |
| 03 | `03-2-a-behavior-that-implements-the-capability.ts` | 2. A behavior that implements the capability | typescript | author | 71 |
| 04 | `04-3-registration-that-links-trait-to-behavior.ts` | 3. Registration that links trait to behavior | typescript | author | 134 |
| 05 | `05-the-dispatch-action.ts` | The dispatch action | typescript | author | 148 |
| 06 | `06-the-dispatch-action.ts` | The dispatch action | typescript | author | 244 |
| 07 | `07-the-dispatch-action.ts` | The dispatch action | typescript | author | 252 |
| 08 | `08-the-dispatch-action.ts` | The dispatch action | typescript | author | 262 |
| 09 | `09-making-the-zoo-s-animals-pettable.ts` | Making the zoo's animals pettable | typescript | author | 289 |

## Custom Traits & Behaviors: Data and Logic, Kept Apart

`ch16-custom-traits-and-behaviors/` &nbsp;·&nbsp; source: `docs/book/parts/part-4/16-custom-traits-and-behaviors.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-defining-a-custom-trait.ts` | Defining a custom trait | typescript | author | 41 |
| 02 | `02-defining-a-custom-trait.ts` | Defining a custom trait | typescript | author | 60 |
| 03 | `03-defining-the-behavior.ts` | Defining the behavior | typescript | author | 76 |
| 04 | `04-putting-the-pair-to-work.ts` | Putting the pair to work | typescript | author | 112 |

# Volume V — Words

## Extending the Grammar: Teaching New Sentence Shapes

`ch17-extending-the-grammar/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/17-extending-the-grammar.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-where-patterns-go.ts` | Where patterns go | typescript | author | 32 |
| 02 | `02-aliases-many-patterns-one-action.ts` | Aliases: many patterns, one action | typescript | author | 62 |
| 03 | `03-prepositions-and-two-slots.ts` | Prepositions and two slots | typescript | author | 79 |
| 04 | `04-constraining-a-slot.ts` | Constraining a slot | typescript | author | 101 |

## The Language Layer: Messages & Message IDs

`ch18-the-language-layer/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/18-the-language-layer.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-intent-here-words-there.ts` | Intent here, words there | typescript | author | 14 |
| 02 | `02-registering-your-text.ts` | Registering your text | typescript | author | 36 |

## The Phrase Algebra: Grammar in the Template, Not the Text

`ch19-the-phrase-algebra/` &nbsp;·&nbsp; source: `docs/book/parts/part-5/19-the-phrase-algebra.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-pass-a-noun-phrase-not-a-name.ts` | Pass a noun phrase, not a name | typescript | author | 59 |
| 02 | `02-lists.ts` | Lists | typescript | author | 128 |
| 03 | `03-branching-stays-in-code.ts` | Branching stays in code | typescript | author | 208 |
| 04 | `04-branching-stays-in-code.ts` | Branching stays in code | typescript | author | 237 |
| 05 | `05-where-the-parameters-go-nest-them-under-params.ts` | Where the parameters go: nest them under `params` | typescript | author | 265 |

# Volume VI — Living Worlds

## Non-Player Characters: Actors That Take Turns

`ch20-non-player-characters/` &nbsp;·&nbsp; source: `docs/book/parts/part-6/20-non-player-characters.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-non-player-characters-actors-that-take-turns.ts` | Non-Player Characters: Actors That Take Turns | typescript | author | 25 |
| 02 | `02-creating-an-npc-entity.ts` | Creating an NPC entity | typescript | author | 43 |
| 03 | `03-the-parrot-becomes-an-npc.ts` | The parrot becomes an NPC | typescript | author | 97 |
| 04 | `04-writing-a-custom-behavior.ts` | Writing a custom behavior | typescript | author | 134 |
| 05 | `05-registering-the-plugin-and-behaviors.ts` | Registering the plugin and behaviors | typescript | author | 210 |

## Scenes: Named Windows of Story Time

`ch21-scenes/` &nbsp;·&nbsp; source: `docs/book/parts/part-6/21-scenes.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-creating-a-scene.ts` | Creating a scene | typescript | author | 33 |
| 02 | `02-querying-a-scene.ts` | Querying a scene | typescript | author | 51 |
| 03 | `03-reacting-to-transitions.ts` | Reacting to transitions | typescript | author | 73 |
| 04 | `04-reacting-to-transitions.ts` | Reacting to transitions | typescript | author | 90 |
| 05 | `05-common-shapes.ts` | Common shapes | typescript | author | 117 |

## Turns, Timed Events & Daemons: Giving the World a Clock

`ch22-timed-events-and-daemons/` &nbsp;·&nbsp; source: `docs/book/parts/part-6/22-timed-events-and-daemons.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-how-the-scheduler-ticks.ts` | How the scheduler ticks | typescript | author | 24 |
| 02 | `02-how-the-scheduler-ticks.ts` | How the scheduler ticks | typescript | author | 48 |
| 03 | `03-daemons-run-every-turn.ts` | Daemons: run every turn | typescript | author | 69 |
| 04 | `04-conditional-daemons-react-to-state.ts` | Conditional daemons: react to state | typescript | author | 132 |
| 05 | `05-fuses-count-down-and-fire.ts` | Fuses: count down and fire | typescript | author | 188 |
| 06 | `06-giving-the-announcements-their-words.ts` | Giving the announcements their words | typescript | author | 225 |

## Scoring & Endgame: Winning the Game

`ch23-scoring-and-endgame/` &nbsp;·&nbsp; source: `docs/book/parts/part-6/23-scoring-and-endgame.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-score-ledger.ts` | The score ledger | typescript | author | 18 |
| 02 | `02-defining-the-scoring-table.ts` | Defining the scoring table | typescript | author | 47 |
| 03 | `03-defining-the-scoring-table.ts` | Defining the scoring table | typescript | author | 94 |
| 04 | `04-awarding-points-as-the-player-plays.ts` | Awarding points as the player plays | typescript | author | 117 |
| 05 | `05-awarding-points-as-the-player-plays.ts` | Awarding points as the player plays | typescript | author | 128 |
| 06 | `06-awarding-points-as-the-player-plays.ts` | Awarding points as the player plays | typescript | author | 149 |
| 07 | `07-awarding-points-as-the-player-plays.ts` | Awarding points as the player plays | typescript | author | 191 |
| 08 | `08-the-victory-daemon.ts` | The victory daemon | typescript | author | 225 |
| 09 | `09-the-victory-daemon.ts` | The victory daemon | typescript | author | 263 |
| 10 | `10-the-victory-daemon.ts` | The victory daemon | typescript | author | 270 |

# Volume VII — Presentation

## Channels: The Universal UI Surface

`ch24-channels/` &nbsp;·&nbsp; source: `docs/book/parts/part-7/24-channels.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-defining-your-own-channel.ts` | Defining your own channel | typescript | author | 91 |
| 02 | `02-defining-your-own-channel.ts` | Defining your own channel | typescript | author | 102 |

## The Web Client: A Framework-Free UI

`ch25-the-web-client/` &nbsp;·&nbsp; source: `docs/book/parts/part-7/25-the-web-client.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-what-the-client-is-responsible-for.ts` | What the client is responsible for | typescript | author | 20 |
| 02 | `02-how-a-turn-reaches-the-screen.ts` | How a turn reaches the screen | typescript | author | 68 |
| 03 | `03-overriding-a-renderer.ts` | Overriding a renderer | typescript | author | 127 |
| 04 | `04-overriding-a-renderer.ts` | Overriding a renderer | typescript | author | 150 |

## Decoration & Theming: Style Without HTML on the Wire

`ch26-decoration-and-theming/` &nbsp;·&nbsp; source: `docs/book/parts/part-7/26-decoration-and-theming.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-theming-one-dom-many-skins.css` | Theming: one DOM, many skins | css | author | 81 |
| 02 | `02-theming-one-dom-many-skins.css` | Theming: one DOM, many skins | css | author | 99 |
| 03 | `03-built-in-themes-list-the-id.jsonc` | Built-in themes: list the id | jsonc | author | 141 |
| 04 | `04-your-own-theme-three-lines-of-css-and-one-list-ent.css` | Your own theme: three lines of CSS and one list entry | css | author | 189 |

## Media & Audio: Sight and Sound as Channels

`ch27-media-and-audio/` &nbsp;·&nbsp; source: `docs/book/parts/part-7/27-media-and-audio.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-room-atmospheres-in-practice.ts` | Room atmospheres in practice | typescript | author | 125 |
| 02 | `02-room-atmospheres-in-practice.ts` | Room atmospheres in practice | typescript | author | 131 |
| 03 | `03-room-atmospheres-in-practice.ts` | Room atmospheres in practice | typescript | author | 150 |
| 04 | `04-room-atmospheres-in-practice.ts` | Room atmospheres in practice | typescript | author | 179 |
| 05 | `05-room-atmospheres-in-practice.ts` | Room atmospheres in practice | typescript | author | 216 |

# Volume VIII — Shipping

## The Multi-File Story: Putting It All Together

`ch28-the-multi-file-story/` &nbsp;·&nbsp; source: `docs/book/parts/part-8/28-the-multi-file-story.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-each-file-exports-a-builder-and-its-ids.ts` | Each file exports a builder and its IDs | typescript | author | 59 |
| 02 | `02-the-index-wires-it-together.ts` | The index wires it together | typescript | author | 87 |

## Transcript Testing & Walkthroughs: Proving the Game Still Works

`ch29-transcript-testing-and-walkthroughs/` &nbsp;·&nbsp; source: `docs/book/parts/part-8/29-transcript-testing-and-walkthroughs.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-running-them.sh` | Running them | bash | author | 109 |

## Saving & Restoring: State Lives in the World

`ch30-saving-and-restoring/` &nbsp;·&nbsp; source: `docs/book/parts/part-8/30-saving-and-restoring.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-one-thing-you-must-save-yourself.ts` | The one thing you must save yourself | typescript | author | 29 |
| 02 | `02-the-one-thing-you-must-save-yourself.ts` | The one thing you must save yourself | typescript | author | 51 |

## Building & Publishing: The Single-Player Browser Client

`ch31-building-and-publishing/` &nbsp;·&nbsp; source: `docs/book/parts/part-8/31-building-and-publishing.md`

| # | File | Section | Lang | Kind | Src line |
|---|------|---------|------|------|----------|
| 01 | `01-the-author-toolchain.sh` | The author toolchain | bash | author | 18 |
| 02 | `02-adding-the-browser-client.sh` | Adding the browser client | bash | author | 39 |
| 03 | `03-hosting-it.sh` | Hosting it | bash | author | 55 |

