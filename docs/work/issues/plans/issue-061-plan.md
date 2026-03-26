# Plan: ISSUE-061 — Multi-word entity names fail in story grammar `:thing` slots

## Problem
Story grammar patterns using `:thing` (e.g., `photograph :thing`) fail to resolve multi-word entity names/aliases. Same root cause as ISSUE-057.

## Scope
- Severity: Medium
- Component: parser-en-us
- Blast radius: Same as ISSUE-057

## Steps

This issue shares the same root cause as ISSUE-057. The fix for ISSUE-057 (multi-token slot matching in the parser) will also fix this issue.

1. **Implement ISSUE-057 fix first**
   - See `issue-057-plan.md` for the full implementation plan

2. **Verify story grammar patterns work**
   - After ISSUE-057 is fixed, specifically test story grammar with multi-word targets
   - Test: `photograph stuffed animals` (multi-word alias in `:thing` slot)
   - Test: story-defined patterns with `.where()` constraints and multi-word entities

3. **Test GDT commands still work**
   - GDT uses `:arg...` greedy slots as a workaround
   - Verify these still function correctly after the parser change
   - The greedy slot behavior should be unaffected

4. **Close both issues together**
   - ISSUE-057 and ISSUE-061 should be closed in the same PR

## Effort Estimate
Zero additional effort — resolved by ISSUE-057 fix.

## Dependencies
- **Blocked by ISSUE-057** — same root cause, same fix.

## Risks
- See ISSUE-057 risks.
