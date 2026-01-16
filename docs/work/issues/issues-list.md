# Known Issues

Catalog of known bugs and issues to be addressed.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-001 | "get all" / "drop all" returns entity_not_found | Medium | Parser | 2026-01-16 | - | - |
| ISSUE-002 | "in" doesn't enter through open window | Low | Grammar | 2026-01-16 | - | - |

---

## Open Issues

### ISSUE-001: "get all" / "drop all" returns entity_not_found

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: Parser / Command Validator

**Description**:
Using "get all" or "drop all" returns `core.entity_not_found` instead of taking/dropping all portable items in scope.

**Reproduction**:
```
> l
You can see kitchen table, brown sack, glass bottle here.

> get all
core.entity_not_found

> drop all
core.entity_not_found
```

**Expected**: Should take/drop all portable items in the current location.

**Source**: `docs/work/dungeo/play-output-6.md` lines 66-67, 74-75

---

### ISSUE-002: "in" doesn't enter through open window at Behind House

**Reported**: 2026-01-16
**Severity**: Low
**Component**: Grammar / Room Connections

**Description**:
At Behind House with the window open, typing "in" doesn't enter the Kitchen through the window. Player must use "w" instead.

**Reproduction**:
```
> (at Behind House with window open)
> in
You can't go that way.

> w
Kitchen
```

**Expected**: "in" should work as an alias for entering through the window when at Behind House.

**Notes**: May require special handling since the window is both a direction and an enterable object. Classic Zork behavior would allow "in" here.

**Source**: `docs/work/dungeo/play-output-6.md` lines 49-50

---

## Closed Issues

(None yet)

---

## Issue Template

```markdown
### ISSUE-XXX: Brief description

**Reported**: YYYY-MM-DD
**Severity**: Critical / High / Medium / Low
**Component**: Parser / Engine / Stdlib / Story / etc.

**Description**:
Detailed description of the issue.

**Reproduction**:
Steps or transcript to reproduce.

**Expected**: What should happen.

**Actual**: What actually happens.

**Notes**: Any additional context.

**Source**: Where the issue was discovered.
```
