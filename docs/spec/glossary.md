# Sharpee Specification Glossary

Domain terms used across the platform spec, defined in implementation-neutral language. Each entry names the spec document(s) where the term is elaborated.

---

## A

**Action**
A player-invocable operation with a unique ID (`if.action.taking`) and a four-phase implementation (`validate / execute / report / blocked`). Grammar patterns map to actions; the engine dispatches parsed commands to the action registry. [06]

**ActionContext**
The engine-supplied context object passed to every action phase. Provides read-only access to world, player, command, scope helpers, and an event-creation helper. [06]

**AuthorModel**
A parallel interface to the world model that bypasses gameplay validation. Used during world initialisation to place entities in states that normal play would reject (e.g., an item inside a closed container). [02]

---

## B

**Behaviour**
A stateless namespace of functions operating on entities and traits. Traits carry data; behaviours carry logic. Behaviours never hold per-instance state. [02]

**Before-action hook**
An engine-level listener that fires after a command is validated but before the action's execute phase. May mutate the world. Canonical use: break concealment before a noisy action executes. [05]

**Block key**
A dotted namespaced string identifying the channel (UI region) a text block belongs to. Core keys include `room.name`, `room.description`, `action.result`, `action.blocked`, `status.*`, `error`, `prompt`, `game.*`. [08]

---

## C

**Capability dispatch**
The pattern whereby a trait on the target entity claims an action ID, and the stdlib action delegates its four phases to the trait's `CapabilityBehavior`. Used for verbs whose semantics vary per entity (LOWER, RAISE, TURN, WAVE). ADR-090. [02, 06]

**Capability store**
Off-entity, keyed game state — scoring, save-slot registry, command history, debug flags. Distinct from the entity-trait model; persists across save/restore. [01, 02]

**Capability behaviour**
A 4-phase interface (`validate / execute / report / blocked`) that a trait registers to handle a specific action ID. Same shape as an action's four phases. ADR-090. [02, 06]

**Chain handler**
An event handler that produces follow-up events in response to a trigger event. Registered via `world.chainEvent(triggerType, handler, options)`. ADR-094. [02, 05]

**Command**
Collective term for a player input line and the structured artifact it becomes (`ParsedCommand` → `ValidatedCommand`). [03]

**Compiled pattern**
The internal representation of a grammar pattern after `build()` — tokens, slot positions, literal/alternate/optional/greedy flags. [04]

---

## D

**Daemon**
A named function that runs every turn under the SchedulerService. May be conditional; may run once or repeatedly. Produces semantic events. ADR-071. [05]

**Decoration**
A semantic annotation wrapping a substring of text output. Core types: `em`, `strong`, `item`, `room`, `npc`, `command`, `direction`, `underline`, `strikethrough`, `super`, `sub`. Stories add namespaced types. Nestable. ADR-091. [08]

**Disambiguation**
The process of selecting one entity from multiple scope-matching candidates for a noun phrase. Uses rules of exact match, held items, proximity, visibility, recency, and scope priority. When rules can't settle, emits `AMBIGUOUS_INPUT`. ADR-017. [03]

---

## E

**Effect**
In an action's `report` or `blocked` return value, an `(event-type, payload)` pair that will become a semantic event in the output stream. [06]

**Entity**
Any addressable object in the world. A `{ id, type, attributes, relationships }` record with a trait composition attached at runtime. [01, 02]

**Entity ID**
A unique string identifier for an entity. Reference implementation uses type-prefixed 3-character IDs (`r01`, `a01`, `c02`, …); alternative schemes are permitted provided uniqueness and stability across save/restore. ADR-011. [01]

**Event (semantic)**
A record describing something that happened in the world or engine. Shares a common envelope (`id`, `type`, `timestamp`, `entities`, `data?`, `tags?`, `priority?`, `narrate?`, `metadata?`). Append-only. [01]

**Event handler**
A world-registered listener on a specific event type. May mutate state; may emit additional events. Distinct from capability behaviours: handlers react after emission, behaviours replace action logic. ADR-086, ADR-117. [02, 06]

**Event log**
The append-only history of semantic events produced in a session. Serialised into the save envelope. The basis for undo snapshots and (potentially) event-sourced restore. [01]

---

## F

**Four-phase contract**
The canonical action shape: `validate → execute → report → blocked`. Validate is pure; execute mutates; report emits success events; blocked emits failure events. [06]

**Formatter**
A named function registered with the language provider, invoked via `{name:key}` in templates. Core formatters handle article selection (`a`), list formatting (`list`), casing (`capitalize`, `upper`, `lower`), pluralisation. ADR-095. [07]

**Fuse**
A countdown timer in the SchedulerService. Decrements each turn; triggers a function when it reaches zero; optionally repeats, may be cancelled, paused, adjusted. ADR-071. [05]

---

## G

**Grammar**
The pattern definitions the parser uses to match input against actions. Locale-specific. Written with a builder DSL. [04]

**Grammar builder**
The DSL for defining grammar patterns. Two APIs: `.define(pattern)` (literal / phrasal / complex) and `.forAction(actionId)` (action-centric with verb synonyms). ADR-087. [04]

---

## I

**IFEntity**
The runtime enrichment of the base `Entity` with a trait composition, scope priorities, minimum scopes, and presentation annotations. [01, 02]

**IFID**
Interactive Fiction Identifier — a UUID v4 (uppercase) per the Treaty of Babel that uniquely identifies a story across its published versions. [01]

**Implicit take**
Engine-inserted TAKE before an action that requires holding the target, when the target is reachable and takeable. Produces a prepended "(first taking the X)" event. ADR-104. [06]

**Implicit inference**
Engine's attempt to pick a different target when a pronoun-resolved target fails an action's requirements. Example: "read it" where `it=mailbox` fails because mailbox isn't readable; engine tries to find a nearby readable entity. ADR-104. [05, 06]

**Input mode**
An alternate input handler that bypasses the parser when `world.state[INPUT_MODE_STATE_KEY]` matches the handler's ID. Used for password puzzles, raw-text dialogues. ADR-137. [05]

**Interceptor (action interceptor)**
A trait-declared hook that runs alongside the default action logic (pre-validate, on-blocked, post-execute). Adds side-effects or rejection without replacing the core action. ADR-118. [06]

**Invariant**
A condition that MUST always hold for a valid world / saved file / turn / event stream. Each spec document lists its invariants.

---

## L

**LanguageProvider**
The per-locale object supplying message templates, vocabulary, grammar patterns, and formatters. Swapped wholesale to change locale. The peer subsystem consumed by both parser (3) and text service (8). [07]

**Locale**
A BCP-47 language tag (`en-US`, `fr-FR`) identifying the natural language of the parser + language provider pair. The platform separates locale-specific code from locale-neutral contracts. [03, 07]

---

## M

**Message ID**
A dotted namespaced string identifying a template in the language provider (`if.action.taking.taken`, `scope.not_reachable`, `story-id.custom-message`). Events carry message IDs; the text service resolves them to prose. [06, 07]

**Meta-command**
A command that operates outside the turn cycle: no turn increment, no plugin phase, no undo snapshot, events processed only through the text service. SAVE, RESTORE, QUIT, UNDO, AGAIN, SCORE, HELP, VERSION, ABOUT, and similar. [05]

---

## N

**NarrativeContext / NarrativeSettings**
Story-level perspective configuration (1st / 2nd / 3rd person) and tense. Supplied by `StoryConfig.narrative`; consumed by the language provider for perspective placeholders. ADR-089. [07]

**NounPhrase**
A parsed substring representing a noun reference — head, modifiers, articles, determiners, candidates — with optional pre-resolved `entityId` from pronoun resolution. [03]

---

## P

**ParsedCommand**
The parser's output: tokens + verb/directObject/preposition/indirectObject structure + action ID + optional text/typed/vocabulary/instrument slots. Entities are candidates, not yet resolved. [03]

**Parser**
The subsystem that converts input text to `ParsedCommand`. Locale-specific. [03]

**Pattern**
A grammar rule source string (`"push :target"`, `"put :item in|into :container"`). Compiled to a `CompiledPattern`. [04]

**Phase (of an action)**
One of `validate`, `execute`, `report`, `blocked`. [06]

**Plugin (TurnPlugin)**
A subsystem that participates in the turn cycle's plugin phase. Ordered by priority. Canonical plugins: NPC (100), state machine (80), scene (60), scheduler (50). ADR-120. [05]

**Platform event**
An event in the `platform.*` namespace emitted by actions (or the engine) to request save, restore, quit, restart, undo, or again. Processed post-turn, pre-text-service. [01, 05]

**Pronoun context**
Parser-local memory of recent entity references, used to resolve `it`, `them`, `him`, `her`, and neopronouns. Updated by the engine after a successful command. ADR-089. [03, 05]

---

## R

**Region**
A categorical grouping of rooms with optional ambient properties (ambient sound/smell, default darkness). Regions nest. Regions are not spatial containers. ADR-149. [02]

**Report phase**
The third phase of an action. Runs only on success. Emits all success events with captured state snapshots. [06]

---

## S

**Save envelope**
The JSON structure the engine produces on save and consumes on restore. `SaveData` contains version, timestamp, metadata, engine state (event source, spatial index, turn history, plugin states), and story config. [01]

**Scene**
A temporal / narrative phase with begin and end conditions (closures) evaluated each turn. Scenes have states: waiting → active → ended. ADR-149. [02, 05]

**Scheduler**
The service managing daemons and fuses. Often implemented as a TurnPlugin. Ticks after NPCs, before turn end. ADR-071. [05]

**Scope**
The set of entities an actor can reference at a given moment. Computed from current containment, traits, darkness, and scope rules. Not persisted. [02]

**Scope level**
An ordinal expressing how strongly an entity is in scope: UNAWARE (0), AWARE (1), VISIBLE (2), REACHABLE (3), CARRIED (4). Actions declare their required level per slot. [02, 06]

**Scope rule**
A declarative record granting scope conditionally ("butterfly is reachable in the garden", "mirror reflection visible during examine"). Has a priority; may include function predicates. [02]

**Semantic event**
See Event (semantic).

**Slot**
A placeholder in a grammar pattern (`:target`, `:item`, `:container`). Has a name, a type (entity / text / typed / vocabulary), and constraints. [04]

**Spatial index**
The containment graph of the world: parent-of and children-of relations. Single-parent invariant. [01, 02]

**Story**
An author-supplied module that provides config, world initialisation, player creation, optional custom actions / vocabulary / event handlers / language extensions. [05]

---

## T

**TextBlock**
A structured chunk of output: `{ key: channel, content: List<TextContent> }`. Emitted by the text service, consumed by clients. ADR-133. [08]

**TextContent**
Either a plain `String` or a `Decoration`. Nestable. [08]

**Template**
A message template string with placeholders: simple (`{item}`), formatted (`{a:item}`), or perspective (`{You}`, `{take}`). Stored in the language provider under a message ID. [07]

**Text service**
The subsystem that transforms a turn's events into a list of text blocks. Stateless. [08]

**Trait**
A typed data record attached to an entity. Pure data; no methods. Identified by a namespaced type string (`if.trait.openable`). [01, 02]

**Trait-type uniqueness**
The invariant that an entity has at most one trait of any given type. [02]

**Turn**
One iteration of the engine's turn cycle. A successful player action advances the turn counter by one; meta-commands and parse failures do not. [05]

**Turn cycle**
The 13-phase sequence the engine runs per input: parse → transform → meta-check → validate → before-action → four-phase execute → undo snapshot → plugins → platform ops → text service → pronoun update → counter update → lifecycle. [05]

---

## V

**ValidatedCommand**
The validator's output: a `ParsedCommand` plus resolved entity references and a concrete action ID. Ready for execute. [03]

**ValidationResult**
The output of an action's `validate` phase: `{ valid, error?, params?, data? }`. The optional `data` field carries discoveries forward to `execute`, `report`, or `blocked`. [06]

**Visibility**
The predicate "can actor observe target now" — depends on scope, darkness, containment transparency, and minimum-scope overrides. Evaluated by `canSee(observer, target)`. ADR-068. [02]

**Vocabulary**
The parser's dictionary — verbs, nouns, adjectives, prepositions, pronouns, directions. Built from the language provider plus entity names/aliases contributed by the world model. ADR-082. [03, 05]

---

## W

**World model**
The in-memory representation of game state: entities, trait composition, spatial containment, typed relationships, capability store, score ledger, scope rules. [02]

**Witness system**
Optional extension for modelling what NPCs perceive and remember — senses (SIGHT, HEARING, SMELL, TOUCH, VIBE), witness levels (FULL, PARTIAL, PERIPHERAL, INFERRED). [06]

---

## ADR Cross-Reference (selected)

| ADR | Title                                           | Spec location             |
|-----|-------------------------------------------------|---------------------------|
| 011 | Entity ID System                                 | [01]                      |
| 017 | Disambiguation Strategy (Proposed)               | [03]                      |
| 025 | Parser Information Preservation                  | [03]                      |
| 033 | Save/Restore Architecture                        | [01]                      |
| 034 | Event Sourcing Save/Restore (Proposed/Future)    | [01]                      |
| 052 | Event Handlers for Custom Logic                  | [02, 06]                  |
| 058 | Action Report Function                           | [06]                      |
| 068 | Unified Darkness Checking                        | [02]                      |
| 069 | Perception Event Filtering                       | [02, 05]                  |
| 070 | NPC System                                       | [05]                      |
| 071 | Daemons and Fuses                                | [05]                      |
| 086 | Event Handler Unification                        | [02, 05]                  |
| 087 | Action-Centric Grammar                            | [04]                      |
| 089 | Pronoun and Identity System                      | [03, 07]                  |
| 023 | Message System Integration                        | [07]                      |
| 028 | Simplified Language Management                    | [07]                      |
| 066 | Text Snippets                                     | [07]                      |
| 093 | i18n Entity Vocabulary                            | [07]                      |
| 090 | Entity-Centric Action Dispatch                   | [02, 06]                  |
| 091 | Text Decorations                                  | [07, 08]                  |
| 094 | Event Chaining                                    | [02, 06]                  |
| 095 | Message Templates                                 | [07]                      |
| 096 | Text Service Architecture                         | [08]                      |
| 097 | Message-ID on Domain Events                       | [06, 08]                  |
| 104 | Implicit Actions (Inference + Auto-Take)          | [05, 06]                  |
| 118 | Stdlib Action Interceptors                        | [06]                      |
| 120 | Engine Plugin Architecture (Proposed)             | [05]                      |
| 124 | Entity Annotations                                | [02]                      |
| 129 | Score Ledger                                      | [02]                      |
| 133 | Structured Text Output                            | [05, 07]                  |
| 137 | Input Modes                                       | [05]                      |
| 148 | Before-action Hook / Concealment                  | [05, 06]                  |
| 149 | Regions and Scenes                                | [02, 05]                  |

---

*End of glossary.*
