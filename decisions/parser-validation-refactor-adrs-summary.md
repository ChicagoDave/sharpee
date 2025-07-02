# Parser-Validation Refactor ADRs Summary

This document summarizes all Architectural Decision Records extracted from the parser-validation-refactor-plan.md.

## Active ADRs

### ADR-004: Parser-Validation-Execution Separation
**Status:** Accepted (2025-06-28)
- Separate command processing into Parse → Validate → Execute phases
- Resolves circular dependencies and unclear responsibilities
- Each phase has single responsibility with clear interfaces

### ADR-005: No I-Prefix for Interfaces  
**Status:** Accepted (2025-01-12)
- Remove `I` prefix from all interfaces (IEntity → Entity)
- Follow modern TypeScript conventions
- Improve code readability and consistency

### ADR-006: Debug Events as System Events
**Status:** Accepted (2025-01-12)
- Separate debug events from semantic (story) events
- Use callback pattern for optional debug infrastructure
- Keep story events pure domain events

### ADR-007: Actions in Standard Library
**Status:** Accepted (2025-01-12)
- Move actions from separate package into stdlib
- Eliminates circular dependency
- Better cohesion of IF standard functionality

## Proposed ADRs

### ADR-008: Core Package as Generic Event System
**Status:** Proposed (2025-01-12)
- Move IF-specific types from core to world-model
- Make core truly generic for any narrative system
- World-model becomes the IF framework package

## Key Principles from Refactor

1. **Three-Phase Pattern** - Consistent parse/validate/execute pattern throughout system
2. **No Circular Dependencies** - Clean dependency hierarchy
3. **Phase-Specific Errors** - Better error messages for each phase
4. **Testable Components** - Parser works without world model
5. **Single Responsibility** - Each component has one clear job

## Decision Rationale

The refactor emerged from recognizing that the parser was doing too much - mixing syntax parsing with entity resolution and validation. This caused:
- Circular dependencies between packages
- Inability to test parser without full world model
- Unclear error messages (parse vs validation vs execution)
- Difficult to maintain and extend

The three-phase architecture mirrors existing patterns in the system (entity handlers, event processing) and provides a clean, consistent approach throughout.

## Implementation Status

- ✅ Phase 1-3, 3.5, 3.6: Type definitions and parser refactor complete
- ✅ Phase 4, 6: Actions moved to stdlib
- 🚧 Phase 3.7: Core refactoring (proposed)
- ⏳ Phase 5: Engine updates needed
- ⏳ Phase 7-8: Testing and documentation

## References

- `/parser-validation-refactor-plan.md` - Full implementation plan
- `/decisions/adr-*.md` - Individual ADR files
- Entity handler pattern (prepare/validate/execute)
- Event processing pattern (receive/validate/apply)
