# Parser Refactor Checklist

Date: 2025-07-12

## Overview

Implement ADR-025 to preserve all information during parsing and provide rich command structure.

## Phase 1: Update Interfaces (World-Model Package)

- [x] Update `parsed-command.ts`
  - [x] Rename current `ParsedCommand` to `ParsedCommandV1` (temporary)
  - [x] Create new `ParsedCommand` interface with rich structure
  - [x] Add `Token` interface with position tracking
  - [x] Add `NounPhrase`, `VerbPhrase`, `PrepPhrase` interfaces
  - [x] Add `PartOfSpeech` enum if not exists

- [ ] Update `parser.ts` interface
  - [ ] Update `Parser.parse()` return type
  - [ ] Add `Parser.tokenize()` method to interface
  - [ ] Update `CommandResult` type if needed

## Phase 2: Parser Implementation (Stdlib Package)

- [ ] Update `parser-types.ts`
  - [ ] Enhance `Token` type with position, length
  - [ ] Add phrase types (NounPhrase, etc.)
  - [ ] Update `TokenCandidate` if needed

- [x] Rewrite `basic-parser.ts`
  - [x] Implement proper tokenization with position tracking
  - [x] Keep ALL tokens (including articles)
  - [x] Implement multi-phase parsing:
    - [x] Phase 1: Tokenization
    - [x] Phase 2: Part-of-speech classification
    - [x] Phase 3: Pattern matching
    - [x] Phase 4: Structure building
  - [x] Support compound verbs ("look at", "pick up")
  - [x] Build proper noun phrases with all information

- [ ] Update `parser-internals.ts`
  - [ ] Add new internal types as needed
  - [ ] Update pattern matching logic

## Phase 3: Validator Updates

- [x] Update `command-validator.ts`
  - [x] Adapt to new ParsedCommand structure
  - [x] Use noun phrase information for better matching
  - [x] Update entity resolution to use richer information
  - [x] Keep validation logic the same

## Phase 4: Test Updates

- [x] Fix parser tests (`basic-parser.test.ts`)
  - [x] Test tokenization preserves positions
  - [x] Test articles are preserved in noun phrases
  - [x] Test compound prepositions work ("look at")
  - [x] Test multi-word nouns handled correctly
  - [x] Test pattern matching validates properly

- [x] Update validator tests (`command-validator.test.ts`)
  - [x] Update test setup to create new ParsedCommand structure
  - [x] Ensure validation logic still works
  - [x] May need to adjust expectations

## Phase 5: Integration Testing

- [ ] Run full test suite
- [ ] Test with example commands:
  - [ ] "take the red ball"
  - [ ] "put the small key in the wooden box"
  - [ ] "look at the mirror"
  - [ ] "pick up all the coins"
  - [ ] "give the sword to the knight"

## Phase 6: Documentation

- [ ] Update parser documentation
- [ ] Add examples of new structure
- [ ] Document breaking changes
- [ ] Update any tutorials/guides

## Success Criteria

1. All parser tests pass with new structure
2. Validator tests pass after adaptation
3. No information lost during parsing
4. Better error messages with positions
5. Articles and modifiers preserved
6. Compound verbs supported

## Notes

- This is a breaking change, but we're already making breaking changes with capabilities
- Focus on information preservation over optimization
- Make sure debugging is improved with position information
- Consider adding parse tree visualization for debugging
