# Architecture Decision Records (ADRs)

This directory contains all Architecture Decision Records for the Sharpee Interactive Fiction Platform. ADRs document significant architectural decisions made during development.

## Status Key

| Status | Meaning |
|--------|---------|
| **Implemented** | Decision is current and fully implemented |
| **Accepted** | Approved, implementation planned or in progress |
| **Proposed** | Under consideration, not yet approved |
| **Future Extension** | Approved concept, deferred to a future release |
| **On Hold** | Paused, may be revisited |
| **Partially Accepted** | Some aspects adopted, others rejected |
| **Informational** | Reference material, not a decision |
| **Superseded** | Replaced by another ADR |
| **Abandoned** | No longer relevant or viable |

## Complete ADR Index

| # | Title | Status |
|---|-------|--------|
| [001](./adr-001-parser-debug-events.md) | Parser Debug Events Architecture | Implemented |
| [002](./adr-002-debug-mode-meta-commands.md) | Debug Mode Meta Commands | Implemented |
| [003](./adr-003-internal-parser-types.md) | Internal Parser Types | Implemented |
| [004](./adr-004-parser-validation-separation.md) | Parser-Validation-Execution Separation | Superseded (by four-phase action pattern) |
| [005](./adr-005-action-interface-location.md) | Action Interface Location and ValidatedCommand Design | Implemented |
| [006](./adr-006-const-objects-not-enums.md) | Use Const Objects Instead of Enums | Implemented |
| [007](./adr-007-actions-in-stdlib.md) | Actions in Standard Library | Implemented |
| [008](./adr-008-core-as-generic-engine.md) | Core Package as Generic Event System | Implemented |
| [009](./adr-009-entity-cloning-strategy.md) | Deep Cloning Strategy for Entity Copies | Implemented |
| [010](./adr-010-no-i-prefix-interfaces.md) | No I-Prefix for Interfaces | Superseded (by ADR-053) |
| [011](./adr-011-entity-id-system.md) | Entity ID System Design | Implemented |
| [012](./adr-012-debug-as-system-events.md) | Debug Events as System Events | Implemented |
| [013](./adr-013-lighting-extensions.md) | Lighting as Extension System | Abandoned |
| [014](./adr-014-unrestricted-world-model-access.md) | Unrestricted World Model Access / Author Model | Implemented |
| [015](./adr-015-spatial-index-references.md) | SpatialIndex Pattern References | Informational |
| [016](./adr-016-author-recorded-event-metadata.md) | Author Recorded Event Metadata | Abandoned |
| [017](./adr-017-disambiguation.md) | Disambiguation Strategy for Entity References | Superseded (by platform events) |
| [018](./adr-018-conversational-state-management.md) | Conversational State Management | Future Extension |
| [019](./adr-019-platform-implementation-patterns.md) | Platform Implementation Patterns for Conversational UI | Future Extension |
| [020](./adr-020-clothing-pockets-design.md) | Clothing and Pockets Design | Proposed |
| [021](./adr-021-parser-edge-cases.md) | Parser Edge Cases and Complex Command Support | Superseded (by later parser ADRs) |
| [022](./adr-022-extension-architecture.md) | Extension Architecture | Implemented |
| [023](./adr-023-message-system-integration.md) | Message System Integration | Implemented |
| [024](./adr-024-score-data-storage.md) | Score Data Storage | Implemented |
| [025](./adr-025-parser-information-preservation.md) | Parser Information Preservation | Implemented |
| [026](./adr-026-language-specific-parsers.md) | Language-Specific Parser Architecture | Implemented |
| [027](./adr-027-parser-package-architecture.md) | Parser Package Architecture | Implemented |
| [028](./adr-028-simplified-language-management.md) | Simplified Story Language Management | Implemented |
| [029](./adr-029-text-service-architecture.md) | Simple Query-Based Text Service Architecture | Implemented |
| [030](./adr-030-if-services-package.md) | Introduction of if-services Package | Implemented |
| [031](./adr-031-self-inflating-help-system.md) | Self-Inflating Help System | Accepted |
| [032](./adr-032-capability-refactoring-command-history.md) | Capability Refactoring and Command History | Implemented |
| [033](./adr-033-save-restore-architecture.md) | Save/Restore Architecture | Implemented |
| [034](./adr-034-event-sourcing-save-restore.md) | Event Sourcing for Save/Restore | Abandoned |
| [035](./adr-035-platform-event-architecture.md) | Platform Event Architecture | Implemented |
| [036](./adr-036-parser-contracts-if-domain.md) | Parser Contracts (IF Domain) | Implemented |
| [037](./adr-037-parser-language-provider.md) | Parser Language Provider | Implemented |
| [038](./adr-038-language-agnostic-actions.md) | Language-Agnostic Action Implementation | Implemented |
| [039](./adr-039-action-event-emission-pattern.md) | Action Event Emission Pattern | Implemented |
| [040](./adr-040-turn-based-time-progression.md) | Turn-Based Time Progression | Implemented |
| [041](./adr-041-simplified-action-context.md) | Simplified Action Context Interface | Superseded |
| [042](./adr-042-stdlib-action-event-types.md) | Stdlib Action Event Type Migration | Superseded |
| [043](./adr-043-scope-and-implied-indirect-objects.md) | Scope Resolution and Implied Indirect Objects | Implemented |
| [044](./adr-044-parser-vocabulary-gaps.md) | Parser and Vocabulary System Gaps | Implemented |
| [045](./adr-045-scope-management-system.md) | Scope Management System | Superseded |
| [046](./adr-046-scope-perception-architecture.md) | Scope and Perception Architecture | Implemented |
| [047](./adr-047-entity-type-safety.md) | Entity Type Safety and Validation | Implemented |
| [048](./adr-048-static-language-architecture.md) | Static Language, Parser, and Text Service Architecture | Abandoned |
| [049](./adr-049-auto-save-architecture.md) | Auto-Save Architecture | Implemented |
| [050](./adr-050-meta-commands.md) | Meta-Commands Implementation | Implemented |
| [051](./adr-051-action-behaviors.md) | Action Behaviors for Complex Action Handling | Superseded (by ADR-052) |
| [052](./adr-052-event-handlers-custom-logic.md) | Event Handlers and Custom Logic | Implemented (Phase 1) |
| [053](./adr-053-interface-naming-convention.md) | Adopt I-Prefix Convention for All TypeScript Interfaces | Implemented |
| [054](./adr-054-semantic-grammar.md) | Semantic Grammar for Command Processing | Implemented |
| [055](./adr-055-npm-publishing.md) | NPM Publishing Strategy | Implemented |
| [056](./adr-056-story-testing-framework.md) | Story Testing Framework | Superseded (by ADR-073) |
| [057](./adr-057-before-after-rules.md) | Rulebook System for Story Logic | On Hold |
| [058](./adr-058-action-report-function.md) | Action Report Function for Atomic Event Generation | Superseded |
| [058x](./adr-058x-atomic-events.md) | Atomic Events Implementation | Implemented |
| [059](./adr-059-action-customization-boundaries.md) | Action Customization Boundaries | Abandoned |
| [060](./adr-060-command-executor-refactor.md) | Refactor CommandExecutor to Thin Orchestrator | Implemented |
| [061](./adr-061-snapshot-code-smell.md) | Entity Snapshot Code Smell | Implemented |
| [062](./adr-062-direction-language-coupling.md) | Direction Language Coupling in Going Action | Implemented |
| [063](./adr-063-sub-actions-pattern.md) | Sub-Actions Pattern for Related Action Families | Implemented |
| [064](./adr-064-world-events-and-action-events.md) | World Events and Action Events | Implemented |
| [065](./adr-065-grammatical-semantic-translation.md) | Grammatical to Semantic Translation Framework | Implemented |
| [066](./adr-066-text-snippets.md) | Text Snippets Library | Implemented |
| [067](./adr-067-linguistics.md) | Language-Specific Linguistics Architecture | Implemented |
| [068](./adr-068-unified-darkness-checking.md) | Unified Darkness Checking | Implemented |
| [069](./adr-069-perception-event-filtering.md) | Perception-Based Event Filtering | Implemented |
| [070](./adr-070-npc-system.md) | NPC System Architecture | Implemented |
| [071](./adr-071-daemons-and-fuses.md) | Daemons and Fuses (Timed Events) | Implemented |
| [072](./adr-072-combat-system.md) | Combat System | Moved to extension (ext-basic-combat) |
| [073](./adr-073-transcript-story-testing.md) | Transcript-Based Story Testing | Implemented |
| [074](./adr-074-ifid-requirements.md) | IFID Requirements | Implemented |
| [075](./adr-075-event-handler-consolidation.md) | Effects-Based Handler Pattern | Implemented |
| [076](./adr-076-scoring-system.md) | Scoring System Architecture | Implemented |
| [077](./adr-077-release-build-system.md) | Release Build System | Implemented |
| [078](./adr-078-magic-paper-puzzle.md) | Magic Paper Puzzle (Thief's Painting) | Implemented |
| [079](./adr-079-dungeon-text-alignment.md) | Dungeon Text Alignment | Implemented |
| [080](./adr-080-raw-text-grammar-slots.md) | Grammar Enhancements for Classic IF Patterns | Implemented |
| [081](./adr-081-npm-release-strategy.md) | npm Release Strategy | Implemented |
| [082](./adr-082-typed-event-system.md) | Typed Event System | Implemented |
| [082z](./adr-082-vocabulary-constrained-slots.md) | Context-Aware Vocabulary and Extended Grammar Slots | Implemented |
| [083](./adr-083-spirit-pc-paradigm.md) | Spirit PC Paradigm — Non-Physical Player Character | Proposed |
| [084](./adr-084-remove-story-grammar-wrapper.md) | Remove StoryGrammarImpl Wrapper | Implemented |
| [085](./adr-085-scoring-system.md) | Event-Based Scoring System | Implemented |
| [086](./adr-086-event-handler-unification.md) | Event Handler Unification | Implemented |
| [087](./adr-087-action-centric-grammar.md) | Action-Centric Grammar with Verb Aliases | Implemented |
| [088](./adr-088-grammar-engine-refactor.md) | Grammar Engine Refactoring | Implemented |
| [089](./adr-089-pronoun-identity-system.md) | Pronoun and Identity System | Implemented |
| [090](./adr-090-entity-centric-action-dispatch.md) | Entity-Centric Action Dispatch via Trait Capabilities | Implemented |
| [091](./adr-091-text-decorations.md) | Text Decorations in Message Templates | Implemented |
| [092](./adr-092-smart-transcript-directives.md) | Smart Transcript Directives | Implemented |
| [093](./adr-093-i18n-entity-vocabulary.md) | Entity Vocabulary and Adjective Disambiguation | Implemented |
| [094](./adr-094-event-chaining.md) | Event Chaining | Implemented |
| [095](./adr-095-message-templates.md) | Message Templates with Formatters | Implemented |
| [096](./adr-096-text-service.md) | Text Service Architecture | Implemented |
| [097](./adr-097-react-client.md) | React Client Architecture | Implemented |
| [098](./adr-098-terminal-client.md) | Terminal Client Architecture | Proposed |
| [099](./adr-099-glk-client.md) | GLK Client | Identified |
| [100](./adr-100-screen-reader-client.md) | Screen Reader Accessibility | Accepted |
| [101](./adr-101-graphical-client-architecture.md) | Graphical Client Architecture | Accepted |
| [102](./adr-102-dialogue-extension-architecture.md) | Dialogue Extension Architecture | Proposed |
| [103](./adr-103-choice-based-story-architecture.md) | Choice-Based Story Architecture | Proposed |
| [104](./adr-104-implicit-inference.md) | Implicit Inference and Implicit Actions | Implemented |
| [105](./adr-105-javascript-browser-client.md) | JavaScript Browser Client | Superseded (by ADR-114) |
| [106](./adr-106-domain-events-and-event-sourcing.md) | Domain Events and Event Sourcing | Implemented |
| [107](./adr-107-dual-mode-authored-content.md) | Dual-Mode Authored Content | Implemented |
| [108](./adr-108-player-character-system.md) | Player Character System | Implemented |
| [109](./adr-109-playtester-annotation-system.md) | Play-Tester Annotation System | Implemented |
| [110](./adr-110-debug-tools-extension.md) | Debug & Testing Tools Extension | Implemented |
| [111](./adr-111-extension-ecosystem.md) | Extension Ecosystem | Implemented |
| [112](./adr-112-client-security-model.md) | Client Security Model | Abandoned |
| [113](./adr-113-map-position-hints.md) | Map Position Hints | Abandoned |
| [114](./adr-114-browser-platform-package.md) | Browser Platform Package | Implemented |
| [115](./adr-115-map-export-cli.md) | Map Export CLI | Proposed |
| [116](./adr-116-prompt-to-playable.md) | Prompt-to-Playable (Conversational Story Development) | Proposed |
| [117](./adr-117-event-handlers-vs-capability-behaviors.md) | Eliminate Broad Use of Event Handlers | Implemented |
| [118](./adr-118-stdlib-action-interceptors.md) | Stdlib Action Interceptors | Implemented |
| [119](./adr-119-state-machines.md) | State Machines for Puzzles and Narratives | Implemented |
| [120](./adr-120-engine-plugin-architecture.md) | Engine Plugin Architecture | Implemented |
| [121](./adr-121-story-runner-architecture.md) | Story Runner Architecture | Implemented |
| [122](./adr-122-rich-media-and-story-styling.md) | Rich Media and Story Styling | Proposed |
| [123](./adr-123-typed-daemon-hierarchy.md) | Typed Daemon Hierarchy | Partially Accepted |
| [124](./adr-124-entity-annotations.md) | Entity Annotations | Implemented |
| [125](./adr-125-zifmia-panels.md) | Zifmia Panel and Windowing System | Proposed |
| [126](./adr-126-destination-interceptors-and-room-conditions.md) | Destination Interceptors for Room Entry Conditions | Implemented |
| [127](./adr-127-location-scoped-interceptors.md) | Location-Scoped Interceptors | Proposed |
| [128](./adr-128-walkthrough-panel.md) | Walkthrough Panel for Zifmia | Proposed |
| [129](./adr-129-treasure-scoring-to-story-layer.md) | Transactional Score Ledger and Treasure Scoring Split | Implemented |
| [130](./adr-130-zifmia-packaging.md) | Zifmia vs Story Installers — Two Separate Products | Proposed |
| [131](./adr-131-automated-world-explorer.md) | Automated World Explorer (Regression Test Generator) | Proposed |

## Summary

| Status | Count |
|--------|-------|
| Implemented | 90 |
| Proposed | 12 |
| Accepted | 3 |
| Future Extension | 2 |
| Superseded | 10 |
| Abandoned | 7 |
| Other (On Hold, Partially Accepted, Informational, Moved) | 4 |
| **Total** | **131** |

## Open ADRs (Roadmap)

These ADRs represent planned or proposed future work.

### Accepted (Implementation Planned)

- **ADR-031**: Self-Inflating Help System
- **ADR-100**: Screen Reader Accessibility — ARIA support for Zifmia client
- **ADR-101**: Graphical Client Architecture — Author-controlled multimedia (images, sound, music)

### Proposed

- **ADR-020**: Clothing and Pockets Design — Container hierarchy for wearable items
- **ADR-057**: Rulebook System for Story Logic (On Hold)
- **ADR-083**: Spirit PC Paradigm — Non-physical player character support
- **ADR-098**: Terminal Client Architecture — CLI-based game client
- **ADR-099**: GLK Client (Identified, research stage)
- **ADR-102**: Dialogue Extension Architecture — NPC conversation systems (ASK/TELL, menus)
- **ADR-103**: Choice-Based Story Architecture — CYOA-style stories with parser hybrid
- **ADR-115**: Map Export CLI — Export story maps from code
- **ADR-116**: Prompt-to-Playable — Conversational (AI-assisted) story development
- **ADR-122**: Rich Media and Story Styling — Embedded media in story output
- **ADR-125**: Zifmia Panel and Windowing System — Multi-panel desktop client
- **ADR-127**: Location-Scoped Interceptors — Action interceptors tied to rooms
- **ADR-128**: Walkthrough Panel for Zifmia — In-client walkthrough display
- **ADR-130**: Zifmia vs Story Installers — Split runner from author packaging tool
- **ADR-131**: Automated World Explorer — Regression test generator

### Future Extensions

- **ADR-018**: Conversational State Management — Dialog system for NPCs
- **ADR-019**: Platform Implementation Patterns for Conversational UI

## Supporting Documents

- [Traits with Built-in Container](./2025-01-19-traits-with-builtin-container.md) — Container trait design notes
- [Lighting Interim Plan](./lighting-interim-plan.md) — Lighting system roadmap
- `./core-systems/` — Detailed save/load and undo system designs
- `./batch/` — Code review session records
- `./outdated/` — Superseded decisions kept for historical reference

---

*Last updated: February 2026 | Total ADRs: 131*
