# Phase 3 Remaining Work Checklist

## Current Status
- **Completed**: Semantic grammar infrastructure implemented and committed
- **Completed**: Core stdlib files updated (context, meta-action, validation, capabilities)
- **Remaining**: 71 build errors in action files (all import-related)

## Import Fixes Needed (71 errors)

### Core Package Imports (@sharpee/core)
- [ ] Replace all `SemanticEvent` with `ISemanticEvent` in action files (~49 files)
- [ ] Replace all `SystemEvent` with `ISystemEvent` 
- [ ] Replace all `GenericEventSource` with `IGenericEventSource`
- [ ] Replace all `QueryHandler` with `IQueryHandler`
- [ ] Replace all `PendingQuery` with `IPendingQuery`
- [ ] Replace all `QueryResponse` with `IQueryResponse`
- [ ] Replace all `QuitContext` with `IQuitContext`
- [ ] Replace all `RestartContext` with `IRestartContext`
- [ ] Replace all `SaveContext` with `ISaveContext`
- [ ] Replace all `RestoreContext` with `IRestoreContext`

### World-Model Package Imports (@sharpee/world-model)
- [ ] Replace all `CloseResult` with `ICloseResult`
- [ ] Replace all `DropItemResult` with `IDropItemResult`
- [ ] Replace all `OpenResult` with `IOpenResult`
- [ ] Replace all `TakeItemResult` with `ITakeItemResult`
- [ ] Replace all `MoveResult` with `IMoveResult`
- [ ] Replace all remaining world-model interfaces with I-prefix versions

### Files Requiring Updates (by directory)

#### actions/standard/ (49 files with SemanticEvent imports)
- [ ] about/about.ts ✓ (already fixed)
- [ ] again/again.ts
- [ ] attacking/attacking.ts
- [ ] climbing/climbing.ts
- [ ] closing/closing.ts
- [ ] drinking/drinking.ts
- [ ] dropping/dropping.ts
- [ ] eating/eating.ts
- [ ] entering/entering.ts
- [ ] examining/examining.ts
- [ ] exiting/exiting.ts
- [ ] giving/giving.ts
- [ ] going/going.ts
- [ ] help/help.ts
- [ ] inserting/inserting.ts
- [ ] inserting/inserting-semantic.ts ✓ (already fixed)
- [ ] inventory/inventory.ts
- [ ] jumping/jumping.ts
- [ ] kissing/kissing.ts
- [ ] listening/listening.ts
- [ ] locking/locking.ts
- [ ] looking/looking.ts
- [ ] opening/opening.ts
- [ ] pulling/pulling.ts
- [ ] pushing/pushing.ts
- [ ] putting/putting.ts
- [ ] quitting/quitting.ts ✓ (already fixed)
- [ ] read/read.ts
- [ ] removing/removing.ts
- [ ] restarting/restarting.ts ✓ (already fixed)
- [ ] restoring/restoring.ts
- [ ] saving/saving.ts
- [ ] searching/searching.ts
- [ ] showing/showing.ts
- [ ] smelling/smelling.ts
- [ ] switching/switching.ts
- [ ] taking/taking.ts
- [ ] talking/talking.ts
- [ ] tasting/tasting.ts
- [ ] telling/telling.ts
- [ ] thinking/thinking.ts
- [ ] throwing/throwing.ts
- [ ] touching/touching.ts
- [ ] unlocking/unlocking.ts
- [ ] using/using.ts
- [ ] waiting/waiting.ts
- [ ] waking/waking.ts
- [ ] wearing/wearing.ts
- [ ] taking_off/taking-off.ts

## Semantic Grammar Integration

### After Import Fixes Complete
- [ ] Test stdlib build successfully
- [ ] Integrate semantic parser into main parser-en-us
- [ ] Update CommandInput interface in if-domain with semantics
- [ ] Create migration guide for actions to use semantics

### Action Migration to Semantics
- [ ] INSERTING - use semantic spatialRelation instead of parsed manipulation
- [ ] GOING - use semantic direction normalization
- [ ] DROPPING - use semantic manner for verb variations
- [ ] PUTTING - use semantic spatial relations
- [ ] Create template for semantic action migration
- [ ] Document semantic property usage patterns

## Testing & Validation
- [ ] Run full test suite after import fixes
- [ ] Verify backward compatibility
- [ ] Performance testing of semantic extraction
- [ ] Integration tests with real games

## Documentation
- [ ] Update ADR-053 with Phase 3 completion notes
- [ ] Create migration guide for I-prefix interfaces
- [ ] Document semantic grammar usage in actions
- [ ] Update action author guidelines

## Final Steps
- [ ] Remove deprecated non-I-prefixed exports
- [ ] Clean up temporary compatibility code
- [ ] Create PR for refactor/i-prefix-interfaces branch
- [ ] Merge to main

## Notes
- All import fixes follow the same pattern: add 'I' prefix to interface names
- The semantic grammar infrastructure is complete and tested
- Context adapter may need updates once CommandInput includes semantics
- Consider automating the import fixes with a script (but user prefers file-by-file)

## Build Error Tracking
- Starting errors: 200+
- After core fixes: 88
- Current: 71
- Target: 0

## Time Estimate
- Import fixes: 2-3 hours (manual, file by file)
- Testing: 1 hour
- Semantic integration: 2-3 hours
- Documentation: 1 hour
- Total: ~7-8 hours of work remaining