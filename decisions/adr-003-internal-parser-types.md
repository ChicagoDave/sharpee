# ADR-003: Internal Parser Types

**Date:** 2025-01-11
**Status:** Accepted
**Context:** Parser API design and encapsulation

## Context

The parser previously exposed `CandidateCommand` as part of its public API, revealing internal implementation details about how it generates and scores multiple parse candidates. This created unnecessary coupling between the parser and its consumers.

## Decision

We will make `CandidateCommand` and related types internal to the parser implementation. The public API will only expose `ParsedCommand` through the `IParser` interface.

## Consequences

### Positive
- Cleaner public API - consumers only see `ParsedCommand`
- Better encapsulation - internal candidate selection logic is hidden
- Flexibility - can change parser internals without breaking API
- Type safety - can't accidentally use internal types outside parser

### Negative
- Cannot access multiple parse candidates (may need to add later for ambiguity handling)
- Less visibility into parser confidence scores
- Requires updating any code that used `CandidateCommand`

## Implementation

### Public API
```typescript
interface IParser {
  parse(input: string): CommandResult<ParsedCommand, ParseError>;
}

interface Parser extends IParser {
  tokenize(input: string): Token[];
  setDebugEventSource?(eventSource: EventSource): void;
}
```

### Internal Types (in parser-internals.ts)
```typescript
/**
 * @internal
 */
interface CandidateCommand {
  action: string;
  nounText?: string;
  nounCandidates?: string[];
  // ... other fields
}
```

### Migration
- Removed `parseMultiple()` method
- Made `parseWithErrors()` private
- Created `parser-internals.ts` for internal types

## Alternatives Considered

1. **Keep CandidateCommand public** - Rejected to maintain clean API
2. **Return array of ParsedCommand** - Rejected as most uses only need best match
3. **Add confidence to ParsedCommand** - Deferred to avoid API bloat

## Future Considerations

If ambiguity handling is needed, we could add:
- `parseWithAlternatives()` that returns multiple `ParsedCommand` objects
- Ambiguity resolution callbacks
- Confidence scores in `ParsedCommand.extras`

## References
- Parser-validation refactor decision
- Original parser design
