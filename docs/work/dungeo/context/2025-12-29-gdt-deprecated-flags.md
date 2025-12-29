# Work Summary: GDT Deprecated Flag Commands (AF/DF)

**Date:** 2025-12-29
**Branch:** dungeo

## Task

Implement AF (Alter Flags) and DF (Display Flags) GDT commands.

## Decision

After reviewing what these commands did in original FORTRAN/MDL Zork, we decided to implement them as **deprecated stubs** rather than functional commands.

### Rationale

In original Zork, objects had **bit flags** stored as bits in a word:
- `TAKEBIT` - can be picked up
- `OPENBIT` - is currently open
- `ONBIT` - device is on
- `LIGHTBIT` - provides light
- etc.

**DF** displayed these flags, **AF** toggled them.

Sharpee uses **trait-based composition** instead. Boolean properties are spread across traits:
- `openable.isOpen`
- `lightSource.lit`
- `switchable.isOn`
- etc.

The existing **DO** (Display Object) command already shows all trait properties, making DF redundant. For altering state, game commands (`open`, `close`, `turn on`) or other GDT commands (`AO`, `AH`) suffice.

## Implementation

Both commands are registered but return deprecation messages explaining:
1. What they did in FORTRAN/MDL Zork
2. Why they're not needed in Sharpee
3. What to use instead

### DF Response
```
DF (Display Flags) was used in the FORTRAN/MDL versions of Zork
where objects had bit flags (TAKEBIT, OPENBIT, LIGHTBIT, etc.).

Sharpee uses trait-based composition instead.
Use DO <entity> to view entity state and traits.
```

### AF Response
```
AF (Alter Flags) was used in the FORTRAN/MDL versions of Zork
where objects had bit flags that could be directly toggled.

Sharpee uses trait-based composition instead.
To modify entity state, use:
  - Game commands (open, close, turn on, etc.)
  - AO to move objects
  - AH to teleport the player
```

## Files Changed

- `stories/dungeo/src/actions/gdt/commands/df.ts` - New (deprecated stub)
- `stories/dungeo/src/actions/gdt/commands/af.ts` - New (deprecated stub)
- `stories/dungeo/src/actions/gdt/commands/index.ts` - Register DF/AF handlers

## Test Coverage

Verified via transcript test that both commands return expected deprecation messages.

## Next Steps

Remaining GDT commands from Phase 3+:
- `DC` - Display Clock (needs ADR-071 Daemons/Fuses)
- `DV` - Display Villains (needs ADR-070 NPC System)
- NPC toggle commands (needs ADR-070)
