# Plan: ISSUE-065 — Two disconnected scope evaluation systems

## Problem
Three systems evaluate entity scope with unclear boundaries: world-model ScopeRegistry, parser-en-us scope-evaluator, and stdlib command-validator. It's unclear which is authoritative and whether the overlap is intentional.

## Scope
- Severity: Medium
- Component: world-model, parser-en-us, stdlib
- Blast radius: High complexity — cross-cutting architectural concern. 9 Dungeo files, 13 occurrences.

## Steps

### Phase 1: Architectural Investigation (before any code changes)

1. **Trace the runtime call chains**
   - Start from a player command (e.g., `take sword`) and trace through:
     - Parser tokenization -> grammar match -> slot resolution -> scope evaluation
     - Command validation -> entity resolution -> scope filtering
   - Record which scope APIs are actually called at each stage

2. **Map the three systems**
   - **world-model ScopeRegistry + ScopeEvaluator**: What calls it? Is it used at all during normal gameplay?
   - **parser-en-us scope-evaluator**: What does it resolve that the world-model system doesn't?
   - **stdlib command-validator**: How does its entity resolution differ from the parser's?

3. **Document the findings**
   - Write up: which system is authoritative for what
   - Identify: is the overlap intentional (two-pass design) or accidental duplication?
   - Identify: are there edge cases where the systems disagree?

4. **Present findings for discussion**
   - This is an architectural decision — must discuss before implementing
   - Options: consolidate into one, clearly document the separation, or hybrid

### Phase 2: Implementation (after architectural decision)

5. **Based on the investigation, one of:**
   - **Option A: Consolidate** — parser and validator both delegate to world-model ScopeRegistry
   - **Option B: Document the boundary** — each system has a clear, documented responsibility
   - **Option C: Remove unused code** — if ScopeRegistry is unused, remove it

6. **If consolidating (Option A):**
   - Define the canonical scope API
   - Update parser to delegate to it
   - Update validator to delegate to it
   - Ensure story-facing APIs (`context.canSee`, `.where()` constraints) remain stable

7. **Regression test**
   - Run full walkthrough chain (`wt-01` through `wt-17`)
   - Run all unit transcripts
   - Scope changes can cause subtle behavioral shifts — test thoroughly

## Effort Estimate
Large — Phase 1: 1 session (investigation). Phase 2: 2-3 sessions (implementation if consolidating).

## Dependencies
- Should be done after ISSUE-057 (parser changes) to avoid conflicts
- Should be done after ISSUE-063 Phase 1 (getTrait typing) since scope code uses traits extensively

## Risks
- **Highest risk issue in the list** — scope evaluation affects every single player command
- Parser and validator may silently compensate for each other's gaps — consolidating could expose bugs
- Edge cases: magic telescope (see into another room), darkness (affects scope), troll axe visibility
- Must run comprehensive regression testing after any changes
- Recommend: make this investigation-first, implementation-optional
