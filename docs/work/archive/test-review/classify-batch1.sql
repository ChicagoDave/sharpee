-- =============================================================================
-- Batch 1 Classification: core, engine, event-processor, character, ext-basic-combat
-- Generated 2026-04-06
-- =============================================================================

-- =============================================================================
-- PACKAGE: character (IDs 3102-3141)
-- =============================================================================

-- character-builder.test.ts
-- CharacterBuilder basics
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3102;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3103;
-- personality
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3104;
-- disposition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3105;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3106;
-- mood and threat
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3107;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3108;
-- cognitiveProfile
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3109;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3110;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3111;
-- knowledge and beliefs
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3112;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3113;
-- goals
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3114;
-- lucidity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3115;
-- perception
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3116;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3117;
-- triggers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3118;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3119;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3120;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3121;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3122;
-- custom predicates
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3123;
-- full Margaret example
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3124;
-- full Eleanor example
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3125;
-- COGNITIVE_PRESETS
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3126;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3127;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3128;
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3129;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3130;
-- VocabularyExtension
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3131;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3132;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3133;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3134;
-- applyCharacter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3135;
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3136;
-- compilation roundtrip
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3137;

-- integration.test.ts
-- full character lifecycle
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3138;
-- schizophrenic profile and hallucinations
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3139;
-- skip filtered events for PTSD
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3140;
-- coexist with NpcTrait
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3141;

-- =============================================================================
-- PACKAGE: core (IDs 1-94)
-- =============================================================================

-- event-system.test.ts
-- createEvent: basic event
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Uses toBeDefined for id/timestamp instead of checking type/format' WHERE id=1;
-- include entity info
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=2;
-- include metadata
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3;
-- handle empty payload
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=4;
-- generate unique IDs
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=5;
-- generate increasing timestamps
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=6;
-- handle complex payloads
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=7;
-- set narrate flag
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=8;
-- set tags from metadata
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=9;
-- handle all entity types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=10;
-- support legacy data property
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=11;
-- events suitable for semantic event source
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=12;
-- Event ID Format
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=13;
-- standard narrative events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=14;
-- standard error events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=15;

-- platform-events.test.ts
-- all required event types
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=16;
-- type guards: isPlatformEvent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=17;
-- type guards: isPlatformRequestEvent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=18;
-- type guards: isPlatformCompletionEvent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=19;
-- save requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=20;
-- save completed event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=21;
-- save failed event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=22;
-- restore requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=23;
-- restore completed event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=24;
-- restore failed event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=25;
-- quit requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=26;
-- quit confirmed event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=27;
-- quit cancelled event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=28;
-- restart requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=29;
-- restart completed event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=30;
-- restart cancelled event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=31;
-- generic platform event with custom data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=32;
-- unique event IDs
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=33;
-- include timestamp
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=34;

-- semantic-event-source.test.ts
-- store and retrieve events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=35;
-- clear all events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=36;
-- filter events by type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=37;
-- filter events by entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=38;
-- filter events by tag
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=39;
-- custom filters
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=40;
-- emit events to subscribers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=41;
-- EventEmitter interface
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=42;
-- emitter unsubscribe
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=43;
-- track unprocessed events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=44;
-- get events since specific event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=45;
-- find events by any entity role
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=46;
-- handle errors in event emitter listeners
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=47;

-- simple-event-source.test.ts
-- emit events to subscribers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=48;
-- multiple subscribers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=49;
-- unsubscribe function
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=50;
-- errors in subscribers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=51;
-- track subscriber count
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=52;
-- clear all subscribers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=53;
-- factory function
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=54;
-- unsubscribe called multiple times
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=55;
-- subscriber modifies handler list during emit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=56;

-- ifid.test.ts
-- generate valid IFID
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=57;
-- uppercase UUID format
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=58;
-- unique IFIDs
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=59;
-- accept valid uppercase UUID
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=60;
-- accept min length
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=61;
-- accept max length
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=62;
-- reject lowercase
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=63;
-- reject too short
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=64;
-- reject too long
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=65;
-- reject invalid chars
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=66;
-- accept hyphens
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=67;
-- normalize lowercase
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=68;
-- already uppercase
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=69;
-- null for invalid after normalization
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=70;
-- handle mixed case
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=71;

-- result.test.ts
-- create success results
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=72;
-- create failure results
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=73;
-- handle any value types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=74;
-- identify success results
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=75;
-- identify failure results
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=76;
-- narrow types correctly
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=77;
-- map: transform success values
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=78;
-- map: pass through failures
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=79;
-- map: handle type transformations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=80;
-- mapError: transform error values
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=81;
-- mapError: pass through successes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=82;
-- flatMap: chain successful results
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=83;
-- flatMap: propagate failures
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=84;
-- flatMap: handle chained failures
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=85;
-- flatMap: complex chains
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=86;
-- unwrap: return value for success
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=87;
-- unwrap: throw error for failure
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=88;
-- unwrap: throw non-Error failures
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=89;
-- unwrapOr: return value for success
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=90;
-- unwrapOr: return default for failure
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=91;
-- unwrapOr: handle different types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=92;
-- real-world: parsing operations
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=93;
-- real-world: validation chains
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=94;

-- =============================================================================
-- PACKAGE: engine (IDs 95-264)
-- =============================================================================

-- command-executor.test.ts
-- initialization: create with all dependencies
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks toBeDefined and toBeInstanceOf - no behavior verified' WHERE id=95;
-- initialization: factory function
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks toBeInstanceOf - no behavior verified' WHERE id=96;
-- execute a valid command
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Does not verify world state changes or event content - only checks result.success is defined' WHERE id=97;
-- include timing data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=98;
-- handle unknown commands
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=99;
-- handle empty input
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=100;
-- handle whitespace-only input
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=101;
-- pass context to actions
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Does not verify context was actually passed - only checks result is defined' WHERE id=102;
-- handle action execution errors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=103;
-- handle sync and async actions
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=104;
-- parse commands using language provider
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=105;
-- normalize input
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=106;
-- return events with valid structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=107;
-- add timestamp to events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=108;
-- handle missing action registry
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=109;
-- handle missing parser
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=110;
-- handle missing language provider (skipped)
UPDATE tests SET test_type='functional', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Remove - permanently skipped, no longer relevant per comment' WHERE id=111;
-- create error event for failed commands
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=112;
-- execute commands quickly (performance)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=113;
-- handle many sequential commands
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks result is defined - no meaningful behavior assertion' WHERE id=114;

-- debug-xyzzy.test.ts
-- should not track xyzzy in command history
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=115;
-- should track successful commands in history
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=116;

-- game-engine.test.ts
-- initialization: standard setup
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks toBeDefined - no meaningful behavior assertion' WHERE id=117;
-- initialization: default config
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=118;
-- initialization: custom config
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks engine toBeDefined - custom config not verified' WHERE id=119;
-- story management: set story and initialize
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=120;
-- story management: initialize world
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=121;
-- story management: handle init errors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=122;
-- lifecycle: start and stop
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=123;
-- lifecycle: throw if already running
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=124;
-- lifecycle: throw if not running
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=125;
-- lifecycle: start without story
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=126;
-- turn execution: basic turn
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=127;
-- turn execution: update context after turn
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=128;
-- turn execution: emit turn events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=129;
-- turn execution: handle errors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=130;
-- turn execution: respect max history
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=131;
-- turn execution: process text output
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Does not verify text output was processed - only checks result is defined' WHERE id=132;
-- state management: save current state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=133;
-- state management: load saved state
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=134;
-- state management: reject incompatible save
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=135;
-- vocabulary management: update vocabulary
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks not.toThrow - no vocabulary state verification' WHERE id=136;
-- vocabulary management: mark entities in/out scope
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='No assertions at all - calls methods but never asserts outcome' WHERE id=137;
-- event handling: emit events during turn
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=138;
-- event handling: call onEvent config
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=139;
-- event handling: get recent events
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=140;
-- text service: have text service configured
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks toBeDefined - no behavior verified' WHERE id=141;

-- historical-accuracy.test.ts
-- complete entity snapshots in action events
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Conditional assertions with if-checks may silently pass without verifying snapshots exist' WHERE id=142;
-- room snapshots in movement events (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - parser/vocabulary not set up properly for movement commands' WHERE id=143;
-- container contents in opening events
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Conditional assertions with if-checks may silently pass if no open event found' WHERE id=144;
-- reconstruct game state from events alone
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks event structure, does not actually reconstruct game state' WHERE id=145;
-- preserve entity state at time of event
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Conditional if-check on lampAtTake/lampAtDrop may silently pass' WHERE id=146;
-- include turn number in event data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=147;
-- include actor and location in enriched events (skipped)
UPDATE tests SET test_type='functional', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - feature not implemented per TODO comment' WHERE id=148;
-- normalize event types to lowercase
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=149;
-- handle functions in event data (skipped)
UPDATE tests SET test_type='functional', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - event source does not track manually emitted events per TODO' WHERE id=150;

-- integration.test.ts
-- complete a full game session
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=151;
-- handle save and restore
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=152;
-- handle game completion (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - engine.isComplete() not implemented per TODO' WHERE id=153;
-- handle malformed input
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=154;
-- recover from action errors
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=155;
-- handle rapid turn execution (perf)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=156;
-- maintain event ordering
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks events exist and have type string - does not verify ordering' WHERE id=157;
-- format complex game output
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Does not verify formatting - only checks result.success is defined' WHERE id=158;
-- update vocabulary as player moves
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=159;
-- create functional standard engine
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=160;
-- handle multi-room world with objects
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=161;
-- complete game after turn limit (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - setMaxTurns not implemented per TODO' WHERE id=162;
-- complete game on score threshold (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - setScoreThreshold not implemented per TODO' WHERE id=163;

-- command-history.test.ts (integration)
-- track successful commands in history
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=213;
-- not track failed commands (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - needs investigation on why failed commands are tracked' WHERE id=214;
-- track multiple commands in order (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - needs unskipping and verification' WHERE id=215;
-- track complex commands with objects (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - needs unskipping and verification' WHERE id=216;
-- not track non-repeatable commands (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - needs unskipping and verification' WHERE id=217;
-- respect maxEntries limit (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - needs unskipping and verification' WHERE id=218;
-- handle AGAIN command
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=219;
-- handle AGAIN with no history (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - needs unskipping and verification' WHERE id=220;
-- handle missing command history capability (skipped)
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Permanently skipped - test uses private internals, needs rewrite' WHERE id=221;

-- event-handlers.test.ts (integration)
-- stories register event handlers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=222;
-- complex multi-entity interactions
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=223;

-- query-events.test.ts (integration)
-- emit client.query event on quit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=224;
-- emit platform.quit_requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=225;
-- emit if.event.quit_requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=226;

-- parser-extension.test.ts
-- add custom verbs
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=164;
-- add custom prepositions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=165;
-- handle addNoun (placeholder)
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks not.toThrow for placeholder method - no actual behavior to verify yet' WHERE id=166;
-- handle addAdjective (placeholder)
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks not.toThrow for placeholder method - no actual behavior to verify yet' WHERE id=167;
-- add custom messages
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=168;
-- add action help
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=169;
-- add action patterns
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=170;
-- merge patterns with existing actions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=171;

-- performance/event-size-analysis.test.ts
-- measure event sizes for common actions
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=227;
-- compare snapshot vs reference sizes
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=228;
-- analyze memory usage patterns
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=229;

-- platform-operations.test.ts
-- detect and queue platform events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=172;
-- save: process save requested event and call hook
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=173;
-- save: emit save completed event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=174;
-- save: emit save failed when hook throws
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=175;
-- save: emit save failed when no hook
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=176;
-- restore: process restore requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=177;
-- restore: load save data and emit completion
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=178;
-- restore: emit restore failed when no data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=179;
-- quit: process quit requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=180;
-- quit: stop engine and emit confirmation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=181;
-- quit: emit cancelled when declined
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=182;
-- quit: quit by default when no hook
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=183;
-- restart: process restart requested event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=184;
-- restart: reinitialize story and emit completion
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=185;
-- restart: emit cancelled when declined
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=186;
-- multiple: process in order
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=187;
-- multiple: continue processing even if one fails
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=188;
-- emission: add completion events to turn events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=189;
-- emission: emit through event source
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=190;

-- story-testing-verification.test.ts
-- successfully initialize with test story
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=191;
-- load language provider directly
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=192;

-- story.test.ts
-- validate valid story config
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=193;
-- accept author as array
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=194;
-- validate semantic version
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=195;
-- reject invalid versions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=196;
-- accept prerelease versions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=197;
-- require all mandatory fields
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=198;
-- track completion state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=199;

-- event-emitter.test.ts (unit)
-- on: register handler
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=230;
-- on: multiple handlers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=231;
-- off: remove specific handler
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=232;
-- off: handle removing non-existent handler
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=233;
-- emit: call all registered handlers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=234;
-- emit: collect semantic events from handlers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=235;
-- emit: handle handlers returning void
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=236;
-- clear: clear handlers for specific event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=237;
-- clear: clear all handlers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=238;
-- listenerCount: return 0 for unregistered
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=239;
-- listenerCount: return correct count
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=240;

-- scheduler-service.test.ts (unit)
-- daemon: register
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=241;
-- daemon: throw duplicate
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=242;
-- daemon: remove
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=243;
-- daemon: pause and resume
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=244;
-- daemon: run in priority order
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=245;
-- daemon: only run if condition met
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=246;
-- daemon: remove runOnce after first run
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=247;
-- fuse: set a fuse
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=248;
-- fuse: count down and trigger
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=249;
-- fuse: cancel and call onCancel
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=250;
-- fuse: adjust turns
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=251;
-- fuse: pause and resume
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=252;
-- fuse: respect tickCondition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=253;
-- fuse: repeat fuses
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=254;
-- entity cleanup: cancel fuses bound to entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=255;
-- serialization: save and restore state
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=256;
-- seeded random: deterministic random
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=257;
-- seeded random: chance function
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=258;
-- seeded random: pick from array
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=259;
-- seeded random: shuffle array
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=260;
-- introspection: active daemons info
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=261;
-- introspection: active fuses info
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=262;
-- createSchedulerService: should create
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=263;
-- createSchedulerService: accept optional seed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=264;

-- universal-capability-dispatch.test.ts
-- checkCapabilityDispatch: shouldDispatch=true for matching capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=200;
-- checkCapabilityDispatch: shouldDispatch=false without capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=201;
-- checkCapabilityDispatch: shouldDispatch=false for undefined target
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=202;
-- checkCapabilityDispatch: shouldDispatch=false for unregistered capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=203;
-- checkCapabilityDispatch: correct behavior for blocking trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=204;
-- executeCapabilityValidate: valid=true when allowed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=205;
-- executeCapabilityValidate: valid=false when blocked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=206;
-- executeCapabilityExecute: call execute phase
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=207;
-- executeCapabilityReport: return events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=208;
-- executeCapabilityBlocked: return blocked events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=209;
-- integration: troll blocking passage
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=210;
-- integration: guarded treasure
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=211;
-- integration: allow taking unguarded items
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=212;

-- =============================================================================
-- PACKAGE: event-processor (IDs 3080-3101)
-- =============================================================================

-- entity-handlers.test.ts
-- should not invoke entity on handler (removed in ISSUE-068)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3080;
-- should not invoke when no target
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3081;
-- should not invoke when no handler for type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3082;
-- should handle handler returning void
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3083;
-- should handle handler throwing error
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3084;
-- should not invoke when entity does not exist
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3085;

-- processor-reactions.test.ts
-- process simple reactions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3086;
-- handle nested reactions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3087;
-- respect maxReactionDepth
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3088;
-- handle failed reactions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3089;
-- not process reactions if initial event fails
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3090;

-- processor.test.ts
-- constructor: default options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3091;
-- constructor: custom options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3092;
-- constructor: register standard handlers
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3093;
-- processEvents: single valid event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3094;
-- processEvents: multiple events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3095;
-- processEvents: validation failures
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3096;
-- processEvents: skip validation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3097;
-- processEvents: capture preview changes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3098;
-- processEvents: handle events that throw errors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3099;
-- setOptions: update processor options
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3100;
-- getWorld: return world model
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3101;

-- =============================================================================
-- PACKAGE: ext-basic-combat (IDs 3142-3164)
-- =============================================================================

-- combat-service.test.ts
-- calculateHitChance: 50% for equal skills
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3142;
-- calculateHitChance: increase with skill advantage
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3143;
-- calculateHitChance: decrease with disadvantage
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3144;
-- calculateHitChance: include weapon bonus
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3145;
-- calculateHitChance: clamp to minimum 10%
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3146;
-- calculateHitChance: clamp to maximum 95%
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3147;
-- resolveAttack: miss when roll exceeds hit chance
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3148;
-- resolveAttack: hit and deal damage
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3149;
-- resolveAttack: add weapon damage
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3150;
-- resolveAttack: apply armor reduction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3151;
-- resolveAttack: kill target at 0
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3152;
-- resolveAttack: knock out at 20%
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=1, mitigation='Conditional if-check on result.hit may silently pass without testing knockout logic' WHERE id=3153;
-- canAttack: allow attacking combatant
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3154;
-- canAttack: reject non-combatant
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3155;
-- canAttack: reject dead target
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3156;
-- getHealthStatus: healthy
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3157;
-- getHealthStatus: wounded
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3158;
-- getHealthStatus: badly_wounded
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3159;
-- getHealthStatus: near_death
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3160;
-- getHealthStatus: unconscious
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3161;
-- getHealthStatus: dead
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3162;
-- getHealthStatus: healthy for non-combatant
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3163;
-- createCombatService: create a combat service
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0, mitigation=NULL WHERE id=3164;
