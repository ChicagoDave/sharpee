# Balloon Puzzle Phase 1 - Actions Implementation

**Date:** 2026-01-03 22:00
**Branch:** dungeo

## Summary

Implemented Phase 1 of the balloon puzzle: grammar patterns and action stubs for LIGHT, TIE, and UNTIE commands.

## Completed Work

### Grammar Patterns Added (in extendParser)

**LIGHT action:**
- `light :object with :tool` (priority 160)
- `set fire to :object with :tool` (priority 160)
- `ignite :object with :tool` (priority 160)

**TIE action:**
- `tie :object to :target` (priority 150)
- `tie :object` (priority 145)
- `fasten :object to :target` (priority 150)
- `attach :object to :target` (priority 150)

**UNTIE action:**
- `untie :object` (priority 150)
- `untie :object from :target` (priority 155)
- `unfasten :object` (priority 150)
- `detach :object` (priority 150)

### Language Messages Added (in extendLanguage)

- `LightMessages.SUCCESS/NO_FIRE_SOURCE/NOT_FLAMMABLE/ALREADY_BURNING/GUIDEBOOK_LIT/IN_RECEPTACLE`
- `TieMessages.SUCCESS/NO_ROPE/NOT_AT_LEDGE/ALREADY_TIED/NO_HOOK/NOT_IN_BALLOON`
- `UntieMessages.SUCCESS/NOT_TIED/NO_ROPE`

### Action Files Created

**stories/dungeo/src/actions/light/**
- `types.ts` - Action ID and message constants
- `light-action.ts` - Four-phase action (validate/execute/blocked/report)
- `index.ts` - Exports

**stories/dungeo/src/actions/tie/**
- `types.ts` - Action ID and message constants
- `tie-action.ts` - Four-phase action with balloon state checks
- `index.ts` - Exports

**stories/dungeo/src/actions/untie/**
- `types.ts` - Action ID and message constants
- `untie-action.ts` - Four-phase action with tether state checks
- `index.ts` - Exports

### Action Logic

**LIGHT action:**
- Validates target is flammable (guidebook, book, newspaper, leaves, paper, coal)
- Validates tool is fire source (match, matches, matchbook, candle, torch, lantern)
- Sets `isBurning = true` and calculates `burnTurnsRemaining = size * 20`
- Special message for guidebook

**TIE action:**
- Validates player is in balloon
- Validates balloon is at a ledge position (ledg2, ledg3, ledg4)
- Validates rope is in player inventory
- Sets `balloonState.tetheredTo` to hook ID
- Sets `balloonState.daemonEnabled = false`

**UNTIE action:**
- Validates player is in balloon
- Validates balloon is currently tethered
- Clears `balloonState.tetheredTo`
- Sets `balloonState.daemonEnabled = true`

## Files Modified

- `stories/dungeo/src/actions/index.ts` - Added exports and imports for light/tie/untie
- `stories/dungeo/src/index.ts` - Added grammar patterns and language messages
- `stories/dungeo/src/regions/volcano/objects/balloon-objects.ts` - Fixed ContainerTrait/OpenableTrait property names

## Files Created

- `stories/dungeo/src/actions/light/` (types.ts, light-action.ts, index.ts)
- `stories/dungeo/src/actions/tie/` (types.ts, tie-action.ts, index.ts)
- `stories/dungeo/src/actions/untie/` (types.ts, untie-action.ts, index.ts)
- `stories/dungeo/tests/transcripts/balloon-actions.transcript`

## Notes

1. Build verification completed with `pnpm --filter '@sharpee/story-dungeo' build`
2. Balloon objects had incorrect property names (`isEnterable` → `enterable`, removed `openVerb`/`closeVerb`)
3. Actions follow the four-phase pattern from wave-action.ts example

## Next Steps (Phase 2)

1. **Balloon Daemon** - Implement the scheduled event that:
   - Fires every 3 turns when `daemonEnabled = true`
   - Checks `burningObject` state
   - Moves balloon position up/down based on heat
   - Handles crash at VAIR4

2. **Receptacle Logic** - When burning object is put in receptacle:
   - Balloon becomes operational
   - Cloth bag inflates
   - Daemon behavior changes

3. **Position Rooms** - Create virtual room descriptions for mid-air positions

4. **Integration Testing** - Full playthrough from Volcano Bottom to ledges
