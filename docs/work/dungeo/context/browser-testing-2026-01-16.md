# Work Summary: Browser Testing Session - 2026-01-16

## Overview

First browser playtest session of Dungeo using the new thin web client. Ran a 42-turn playtest capturing console logs, which revealed 14 issues and allowed verification of several fixes.

## Session Details

- **Date**: 2026-01-16
- **Duration**: ~2 hours
- **Console logs**: `logs/console-export-2026-1-16_21-39-12.log`, `logs/console-export-2026-1-16_22-8-43.log`
- **Branch**: dungeo

## Fixes Applied

### 1. Welcome Mat Alias Fix
**Problem**: "move rug" triggered disambiguation between oriental rug and welcome mat.

**Root Cause**: Welcome mat had "rug" as an alias, which isn't in the original MDL source.

**Solution**: Updated `stories/dungeo/src/regions/white-house.ts`:
```typescript
// Before
aliases: ['mat', 'doormat', 'door mat', 'rug']

// After
aliases: ['mat', 'rubber mat']  // MDL: ["MAT"] + ["WELCO" "RUBBE"]
```

**Verified**: Turn 14 in second session - "move rug" now correctly finds only oriental rug.

### 2. Browser Entry TypeScript Fix
**Problem**: `browser-entry.ts` failed TypeScript compilation due to browser-only APIs (AudioContext).

**Solution**: Excluded from tsc in `stories/dungeo/tsconfig.json`:
```json
"exclude": ["node_modules", "dist", "src/browser-entry.ts"]
```

Browser entry is compiled separately by esbuild for the web bundle.

### 3. Mobile CSS Additions
Added comprehensive mobile support to `templates/browser/infocom.css`:

| Feature | Implementation |
|---------|----------------|
| Safe areas | `env(safe-area-inset-*)` for notched phones |
| Small phones | `@media (max-width: 380px)` - smaller fonts, wrapped status |
| Landscape | `@media (max-height: 500px)` - compact spacing |
| iOS zoom prevention | 16px input font size |
| Dynamic viewport | `100dvh` for virtual keyboard handling |
| Touch targets | `@media (pointer: coarse)` - 52px min height |

## Issues Discovered (14 total)

### Critical (3)
| Issue | Description | Component |
|-------|-------------|-----------|
| ISSUE-003 | Window doesn't block passage to Kitchen | Story |
| ISSUE-004 | "kill troll" not recognized | Parser |
| ISSUE-006 | Troll doesn't attack player | Story/NPC |

### High (1)
| Issue | Description | Component |
|-------|-------------|-----------|
| ISSUE-010 | Room contents not shown on room entry | TextService |

### Medium (7)
| Issue | Description | Component |
|-------|-------------|-----------|
| ISSUE-001 | "get all" / "drop all" returns entity_not_found | Parser |
| ISSUE-005 | Text output order wrong (contents before description) | TextService |
| ISSUE-007 | Template placeholder {are} not resolved | TextService |
| ISSUE-008 | Disambiguation doesn't list options | TextService |
| ISSUE-009 | Egg openable by player (should require thief) | Story |
| ISSUE-012 | Browser client needs save/restore (localStorage) | Browser |
| ISSUE-014 | Turning on lamp in dark room should trigger LOOK | Engine/Stdlib |

### Low (3)
| Issue | Description | Component |
|-------|-------------|-----------|
| ISSUE-002 | "in" doesn't enter through open window | Grammar |
| ISSUE-011 | Nest visibility on room entry | Story |
| ISSUE-013 | Lamp message missing "The" article | TextService |

## Working Correctly

The following features worked as expected:
- Navigation between rooms
- Object interaction (open, take, put, examine, read)
- Trophy case scoring (egg=10, canary=8, total=18)
- NPC movement (thief wandering: r4b→r4a→r45→r3x→r3w→r3z)
- Container reveal on open
- Trapdoor mechanics (rug reveal, open, descend, slam shut)
- Lantern/darkness mechanics
- Save command (triggers event, though no persistence yet)
- Forest ambience ("A songbird chirps in the distance")

## Key Insight: ISSUE-010 is Root Cause

ISSUE-010 (room contents not shown on room entry) explains several other observations:
- Nest appeared "hidden" (ISSUE-011) - actually visible on LOOK, just not on entry
- Objects in rooms not discoverable without explicit LOOK

## Files Modified

- `stories/dungeo/src/regions/white-house.ts` - welcome mat aliases
- `stories/dungeo/tsconfig.json` - exclude browser-entry.ts
- `templates/browser/infocom.css` - mobile CSS (~110 lines added)
- `docs/work/issues/issues-list.md` - 14 issues documented

## Next Steps

Priority order for fixes:
1. **Critical**: Window blocking (ISSUE-003) - breaks early game flow
2. **Critical**: Combat grammar (ISSUE-004, ISSUE-006) - troll encounter broken
3. **High**: Room contents on entry (ISSUE-010) - affects whole game UX
4. **Medium**: Browser save/restore (ISSUE-012) - needed for real playtesting
