# Sample Chapter: The Complete Workflow in Action

## Chapter 15: Build and Test Logs as Feedback

Let's walk through a real example from Sharpee that demonstrates the complete workflow: identifying a problem through test logs, having a design conversation, creating an ADR, building a plan, implementing with a checklist, and validating through logs.

### The Problem Emerges

It started with a failing test log:

```
FAIL tests/unit/actions/taking-golden.test.ts
Error: Cannot find package '@sharpee/parser-en-us' imported from 
'/mnt/c/repotemp/sharpee/packages/stdlib/tests/test-utils/parser-helpers.ts'
```

This single line in a build log triggered a workflow that would result in a significant architectural improvement.

### Step 1: Design Conversation with Claude

**Me:** "I'm seeing module resolution errors in our tests. The parser-en-us package exists and builds fine, but vitest can't find it. This is blocking all our stdlib tests."

**Claude:** "This looks like a module resolution issue specific to vitest. Let me analyze the situation:

1. The package exists and builds
2. Node.js can resolve it (we can require it)
3. Vitest specifically cannot resolve it

This suggests a vitest configuration issue. Let's explore our options..."

The conversation continued for several exchanges, exploring:
- Vitest's resolution mechanism
- Workspace configuration
- Build vs source resolution
- Dynamic vs static imports

### Step 2: Capturing the Decision in an ADR

From this conversation, we created ADR-048:

```markdown
# ADR-048: Static Module Resolution for Test Environments

## Status
Accepted

## Context
Our test suite uses vitest, which has different module resolution behavior than Node.js runtime. Tests were failing to resolve workspace packages even though the packages were properly built and linked.

Build log evidence:
- Parser package builds successfully
- Node.js can require the module
- Vitest fails with MODULE_NOT_FOUND

## Decision
We will use vitest aliases to map workspace packages directly to their TypeScript sources during testing, bypassing the need for built artifacts.

## Consequences
- Faster test execution (no build step required)
- Better debugging experience (source maps not needed)
- Tests run against TypeScript directly
- Must maintain alias configuration as packages are added

## Alternatives Considered
1. **Pre-build all packages**: Slow, requires full rebuild for each change
2. **Use Node resolution**: Would require different test runner
3. **Dynamic imports**: Would make tests async unnecessarily
```

### Step 3: Creating an Implementation Plan

With the ADR in place, we created a plan:

```markdown
# Plan: Fix Module Resolution for Tests

## Phase 1: Immediate Fix
1. Add aliases to vitest.config.ts for failing packages
2. Verify tests can import packages
3. Run test suite to identify any other issues

## Phase 2: Systematic Solution  
1. Audit all package dependencies
2. Create consistent alias configuration
3. Document the pattern for future packages
4. Update development setup guide

## Phase 3: Prevention
1. Add check to CI for missing aliases
2. Create package scaffold with test config
3. Update new package checklist
```

### Step 4: Implementation Checklist

We converted the plan to an actionable checklist:

```markdown
## Module Resolution Fix Checklist

- [ ] Open vitest.config.ts in stdlib package
- [ ] Add alias for @sharpee/parser-en-us pointing to ../parser-en-us/src
- [ ] Add alias for @sharpee/lang-en-us pointing to ../lang-en-us/src  
- [ ] Save and run single test to verify resolution
- [ ] Run full test suite if single test passes
- [ ] Check for any new resolution errors
- [ ] Document solution in troubleshooting guide
- [ ] Update package README with test setup
```

### Step 5: Implementation with Claude

**Me:** "Let's implement the fix. Here's the current vitest.config.ts:"

```typescript
resolve: {
  alias: {
    '@sharpee/world-model': path.resolve(__dirname, '../world-model/src'),
    '@sharpee/core': path.resolve(__dirname, '../core/src'),
    '@sharpee/if-domain': path.resolve(__dirname, '../if-domain/src')
  }
}
```

**Claude:** "I'll add the missing aliases for parser-en-us and lang-en-us:"

```typescript
resolve: {
  alias: {
    '@sharpee/world-model': path.resolve(__dirname, '../world-model/src'),
    '@sharpee/core': path.resolve(__dirname, '../core/src'),
    '@sharpee/if-domain': path.resolve(__dirname, '../if-domain/src'),
    '@sharpee/parser-en-us': path.resolve(__dirname, '../parser-en-us/src'),
    '@sharpee/lang-en-us': path.resolve(__dirname, '../lang-en-us/src')
  }
}
```

### Step 6: Validation Through Logs

After implementation, we run the tests:

```bash
$ pnpm test

✓ tests/unit/actions/taking-golden.test.ts (5 tests) 45ms
✓ tests/unit/actions/dropping-golden.test.ts (4 tests) 23ms
...
Test Files  42 passed (42)
     Tests  287 passed (287)
  Duration  4.32s
```

Success! But we're not done yet.

### Step 7: Closing the Loop

The successful test log confirms our fix, but it also reveals new information:

1. **Performance**: Tests now run faster (4.32s vs previous 8.91s)
2. **Coverage**: We can now see true coverage of TypeScript source
3. **Debugging**: Stack traces point to actual source lines

This feeds back into a new design conversation:

**Me:** "The alias solution worked perfectly. Tests are now running 50% faster. Should we apply this pattern to all our test configurations?"

**Claude:** "Yes, and we should go further. Let's create ADR-049 about standardizing test configuration across all packages..."

### The Rhythm of Development

This example shows the natural rhythm that emerges:

```
Problem in logs → Design conversation → ADR → Plan → 
Checklist → Implementation → Validation in logs → New insights
```

Each step produces artifacts:
- **Conversation**: Understanding and options
- **ADR**: Permanent decision record
- **Plan**: Phased approach
- **Checklist**: Concrete actions
- **Implementation**: Code changes
- **Logs**: Validation and new insights

### Key Lessons

1. **Logs are not endpoints**: They're starting points for improvement
2. **Every problem deserves a conversation**: Don't jump to solutions
3. **Document decisions immediately**: ADRs prevent re-litigation
4. **Plans prevent wandering**: Stay focused on the goal
5. **Checklists prevent mistakes**: Especially in multi-step fixes
6. **Success logs reveal opportunities**: Performance improvements, simplifications

### Your Turn

In your next Claude session, try this workflow:

1. Start with a failing test or build log
2. Have a design conversation about the root cause
3. Document the decision in a simple ADR
4. Create a plan with phases
5. Convert to a checklist
6. Implement with Claude
7. Validate with logs
8. Look for the next improvement

Remember: The goal isn't just to fix the immediate problem. It's to build a system of continuous improvement where every problem makes your project stronger.

---

## Exercise: Analyzing Your Own Logs

Take a recent build or test failure from your project:

1. **Extract the key error** (one line if possible)
2. **Start a conversation with Claude** about root causes
3. **Document three alternatives** you discussed
4. **Create a mini-ADR** (even just 5 lines)
5. **Build a checklist** (5-10 items)
6. **Implement the fix**
7. **Compare before/after logs**

What did you learn that you wouldn't have discovered by just fixing the immediate problem?