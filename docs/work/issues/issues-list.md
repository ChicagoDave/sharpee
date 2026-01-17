# Known Issues

Catalog of known bugs and issues to be addressed.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-001 | "get all" / "drop all" returns entity_not_found | Medium | Parser | 2026-01-16 | - | - |
| ISSUE-002 | "in" doesn't enter through open window | Low | Grammar | 2026-01-16 | - | - |
| ISSUE-003 | Window doesn't block passage to Kitchen | Critical | Story | 2026-01-16 | - | - |
| ISSUE-004 | "kill troll" not recognized | Critical | Parser | 2026-01-16 | - | - |
| ISSUE-005 | Text output order wrong (contents before description) | Medium | TextService | 2026-01-16 | - | - |
| ISSUE-006 | Troll doesn't attack player | Critical | Story/NPC | 2026-01-16 | - | - |
| ISSUE-007 | Template placeholder {are} not resolved | Medium | TextService | 2026-01-16 | - | - |
| ISSUE-008 | Disambiguation doesn't list options | Medium | TextService | 2026-01-16 | - | - |

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

### ISSUE-003: Window doesn't block passage to Kitchen

**Reported**: 2026-01-16
**Severity**: Critical
**Component**: Story / Room Connections

**Description**:
Player can walk west from Behind House into Kitchen without opening the window first. The window should block passage until opened.

**Reproduction**:
```
> (at Behind House)
> w
Kitchen
(should have been blocked!)
```

**Expected**: "The window is closed." or similar blocking message until window is opened.

**Actual**: Player enters Kitchen freely.

**Source**: Browser testing session 2026-01-16

---

### ISSUE-004: "kill troll" not recognized

**Reported**: 2026-01-16
**Severity**: Critical
**Component**: Parser / Grammar

**Description**:
The command "kill troll" returns "Parse failed: INVALID_SYNTAX" instead of initiating combat.

**Reproduction**:
```
> (at Troll Room)
> kill troll
I don't understand that.
```

**Expected**: Should attack the troll with wielded weapon or bare hands.

**Actual**: Parser doesn't recognize the syntax.

**Notes**: "attack troll" may also be affected. Combat verbs need grammar patterns.

**Source**: Browser testing session 2026-01-16, console log line 522-526

---

### ISSUE-005: Text output order wrong

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: TextService / Sort Stage

**Description**:
When entering a room, the contents list appears before the room name and description.

**Reproduction**:
```
> look
You can see small mailbox, front door, welcome mat, white house here.

West of House

This is an open field west of a white house with a boarded front door.
```

**Expected**:
```
West of House

This is an open field west of a white house with a boarded front door.

You can see small mailbox, front door, welcome mat, white house here.
```

**Actual**: Contents list comes first.

**Source**: Browser testing session 2026-01-16, console log line 41

---

### ISSUE-006: Troll doesn't attack player

**Reported**: 2026-01-16
**Severity**: Critical
**Component**: Story / NPC Behavior

**Description**:
The troll in Troll Room doesn't attack the player. Player can wait multiple turns with no combat occurring.

**Reproduction**:
```
> (at Troll Room with troll present)
> z
Time passes...
> z
Time passes...
(no attack from troll)
```

**Expected**: Troll should attack player each turn, player must fight or flee.

**Actual**: Troll is passive, never attacks.

**Notes**: Troll NPC behavior may not be implemented, or combat system not triggering.

**Source**: Browser testing session 2026-01-16, console log lines 486-520

---

### ISSUE-007: Template placeholder {are} not resolved

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: TextService / Language Provider

**Description**:
Inventory output shows unresolved template placeholder `{are}` instead of the word "are".

**Reproduction**:
```
> i
You {are} carrying:

  leaflet, welcome mat
```

**Expected**: "You are carrying:"

**Actual**: "You {are} carrying:"

**Notes**: Template resolution failing for verb conjugation placeholders.

**Source**: Browser testing session 2026-01-16, console log line 397

---

### ISSUE-008: Disambiguation doesn't list options

**Reported**: 2026-01-16
**Severity**: Medium
**Component**: TextService / Disambiguation

**Description**:
When multiple objects match (e.g., "rug" matches both oriental rug and welcome mat), the disambiguation prompt just says "Which do you mean?" without listing the options.

**Reproduction**:
```
> move rug
Which do you mean?
```

**Expected**: "Which do you mean: the oriental rug, or the welcome mat?"

**Actual**: "Which do you mean?" (no options listed)

**Notes**: The disambiguation event contains the candidates (topCandidates), but they're not being rendered.

**Source**: Browser testing session 2026-01-16, console log lines 310, 349

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
