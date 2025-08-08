# Claude Development Workflow Templates

## Template 1: Starting a Design Conversation

```
I need to [solve problem / implement feature / fix issue].

Current situation:
- [Key constraint 1]
- [Key constraint 2]
- [Current implementation if exists]

Requirements:
- [Requirement 1]
- [Requirement 2]

What are my architectural options? Please consider:
1. Different approaches
2. Trade-offs of each
3. Implementation complexity
4. Future maintainability
```

## Template 2: ADR from Conversation

```markdown
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Superseded]

## Context
[What problem are we solving? Include evidence from logs/tests if applicable]

## Decision
[What we decided to do]

## Consequences
### Positive
- [Good outcome 1]
- [Good outcome 2]

### Negative  
- [Trade-off 1]
- [Trade-off 2]

### Neutral
- [Thing that changes]

## Alternatives Considered
1. **[Alternative 1]**: [Why we didn't choose it]
2. **[Alternative 2]**: [Why we didn't choose it]

## References
- [Link to conversation]
- [Link to related ADR]
- [Link to build/test log]
```

## Template 3: Implementation Plan

```markdown
# Plan: [What We're Implementing]

## Goal
[One sentence description of success]

## Context
- ADR: [Link to ADR]
- Related issues: [Links]
- Dependencies: [What must exist first]

## Phase 1: [Foundation]
Duration: [Estimate]
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Success Criteria
- [ ] [Measurable outcome]
- [ ] Tests: [What should pass]

## Phase 2: [Core Implementation]
Duration: [Estimate]
1. [Step 1]
2. [Step 2]

### Success Criteria
- [ ] [Measurable outcome]
- [ ] Tests: [What should pass]

## Phase 3: [Polish and Validation]
Duration: [Estimate]
1. [Step 1]
2. [Step 2]

### Success Criteria
- [ ] [Measurable outcome]
- [ ] Performance: [Metrics]

## Rollback Plan
If issues arise:
1. [How to revert]
2. [What to preserve]
```

## Template 4: Implementation Checklist

```markdown
# Checklist: [Task Name]

## Prerequisites
- [ ] Read ADR-XXX
- [ ] Review current implementation in [file]
- [ ] Run baseline tests: `pnpm test`
- [ ] Note current performance: [metric]

## Implementation
- [ ] Open [primary file]
- [ ] [Specific change 1]
- [ ] Run tests to verify no breaks
- [ ] [Specific change 2]
- [ ] Update types if needed
- [ ] [Specific change 3]
- [ ] Run build: `pnpm build`

## Validation
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Performance metric: [requirement]
- [ ] Manual test: [specific scenario]

## Documentation
- [ ] Update README if API changed
- [ ] Update inline documentation
- [ ] Add to CHANGELOG.md

## Cleanup
- [ ] Remove debug console.logs
- [ ] Remove commented old code
- [ ] Format code: `pnpm format`

## Commit
- [ ] Stage related changes together
- [ ] Write descriptive commit message
- [ ] Reference issue/ADR in commit
```

## Template 5: Build/Test Log Analysis Request

```
I'm seeing this error in my build/test logs:

```
[Paste error here]
```

Context:
- This started after: [recent change]
- Environment: [Node version, OS, etc.]
- Package: [which package/module]

What I've tried:
1. [Attempt 1]
2. [Attempt 2]

Can you help me:
1. Understand the root cause
2. Identify potential solutions
3. Determine the best approach
```

## Template 6: Session Handoff Document

```markdown
# Session Handoff: [Date]

## What Was Accomplished
- [Major achievement 1]
- [Major achievement 2]
- Partially complete: [What's in progress]

## Current State
- Branch: [branch name]
- Last commit: [commit hash and message]
- Tests: [passing/failing count]
- Build: [status]

## Decisions Made
- [Decision 1 with brief rationale]
- [Decision 2 with brief rationale]
- See ADR-XXX for [specific decision]

## Next Steps
Priority order:
1. [ ] [Most important task]
2. [ ] [Second priority]
3. [ ] [Third priority]

## Blockers/Issues
- [Issue 1]: [Description and impact]
- [Issue 2]: [Description and impact]

## Files Changed
Key files to review:
- `path/to/file1.ts`: [What changed and why]
- `path/to/file2.ts`: [What changed and why]

## Context for Next Session
To continue, you'll need to:
1. Review [specific file/ADR]
2. Understand that [key decision/constraint]
3. Know that [important detail]

## Test Command
Start by running: `[specific test command]`
Expected result: [what should happen]
```

## Template 7: Problem to ADR Conversation

```
Claude, I've identified a problem that needs an architectural decision.

Problem Statement:
[Clear description of the issue]

Evidence:
- Log output: [relevant log]
- Test failure: [test that's failing]
- Performance metric: [measurement]

Constraints:
- Must maintain: [backward compatibility/API/etc.]
- Cannot change: [fixed requirement]
- Budget: [time/resources available]

Let's explore solutions and document our decision in an ADR. What are our options?
```

## Template 8: Checklist Validation

```
I've completed this checklist:

✅ [Completed item 1]
✅ [Completed item 2]
❌ [Failed item] - Error: [what happened]
⚠️ [Partial item] - Note: [what's incomplete]

The failure/warning is:
```
[Error message or unexpected behavior]
```

Should I:
1. Continue with the remaining items?
2. Fix this issue first?
3. Roll back and try a different approach?
```

## Usage Tips

1. **Keep templates in your project**: Store these in a `docs/templates/` folder
2. **Customize for your domain**: Add domain-specific sections
3. **Version your templates**: They should evolve with your project
4. **Share with your team**: Consistency multiplies effectiveness
5. **Link templates to examples**: Show real uses from your project

## The Meta-Template

When creating your own templates:

```
## Template: [Purpose]

### When to Use
[Specific situation that calls for this template]

### Structure
[Section 1]: [What goes here]
[Section 2]: [What goes here]

### Example
[Real or realistic example]

### Anti-patterns
Don't: [Common mistake]
Do: [Better approach]
```

Remember: Templates are starting points, not rigid rules. Adapt them as you learn what works for your project and team.