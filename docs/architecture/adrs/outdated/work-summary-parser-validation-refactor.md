# Work Summary - Parser-Validation Refactor Planning Session

**Date:** June 28, 2025
**Session Focus:** Architecting the parser → validation → execution pipeline

## What We Accomplished

1. **Identified Root Problem**
   - Current architecture conflates parsing (syntax) with validation (world semantics)
   - This causes circular dependencies between @sharpee/actions and @sharpee/stdlib
   - Parser currently tries to resolve entities, making it dependent on world model

2. **Designed Three-Phase Architecture**
   - **Parse Phase**: Pure grammar/vocabulary matching → ParsedCommand
   - **Validate Phase**: Entity resolution and precondition checking → ValidatedCommand  
   - **Execute Phase**: Business logic and event generation → SemanticEvent[]

3. **Key Architectural Insight**
   - This pattern matches the existing entity handler pattern (validate then execute)
   - Provides consistent mental model throughout system
   - Each phase can fail with phase-specific errors

4. **Created Comprehensive Documentation**
   - Detailed refactor plan with implementation checklist
   - Architectural decision record
   - Type definitions for each phase
   - Migration strategy

## Critical Decisions Made

1. **Parser will be world-agnostic** - only knows grammar and vocabulary
2. **New Validator component** - bridges parser output to action input
3. **ValidatedCommand includes handler** - no double lookup needed
4. **Shared types move to @sharpee/core** - breaks circular dependencies

## Next Session Should

1. **Start Implementation**
   - Create new type definitions in @sharpee/core
   - Begin parser refactor to remove world knowledge
   - Create CommandValidator interface

2. **Fix Build First**
   - This refactor will naturally fix many type errors
   - Resolves circular dependency issues
   - Makes testing possible

## Important Files Created

- `/decisions/parser-validation-refactor-2025-06-28.md` - Decision record
- `parser-validation-refactor-plan.md` artifact - Detailed implementation plan
- This summary for next session

## Context for Next Developer

We're at a critical juncture. The current parser tries to do too much, creating tangled dependencies. The proposed three-phase architecture (parse → validate → execute) will:

1. Fix the circular dependency preventing builds
2. Enable proper unit testing
3. Provide better error messages
4. Align with existing patterns in the codebase

This is THE blocker for v1. Once this refactor is complete, most other issues (trait property access, text service integration) become straightforward.

## Do Not Lose

- The insight that validation is neither "parser-ish" nor "world model-ish" 
- The parallel with entity handlers (validate + execute pattern)
- The three-phase architecture with clear boundaries
- The detailed implementation checklist in the refactor plan