# Next Chat Session Prompt

## Continue Event Time Implementation - Phase 2 (Priority 3 Actions)

We are implementing ADR-041 (Simplified Action Context) and ADR-042 (Stdlib Action Event Types).

### Current Status
**Phase 1: ✅ COMPLETE**
* Simplified `EnhancedActionContext` from 6 methods to 1 `event()` method
* Created migration guide at `/packages/stdlib/src/actions/migration-guide-adr-041.md`

**Phase 2: In Progress (8/40+ actions migrated - 20%)**

**Completed Actions:**
1. ✅ **Priority 1 - Core Actions (4/4 COMPLETE)**
   - Taking, Dropping, Examining, Going
   
2. ✅ **Priority 2 - Manipulation Actions (4/4 COMPLETE)**
   - Closing (R&D phase), Opening, Locking, Unlocking

### Migration Pattern:
```
/actions/standard/[action-name]/
  ├── [action-name].ts         # Action implementation using context.event()
  ├── [action-name]-events.ts  # Typed event interfaces
  └── index.ts                 # Module exports
```

### Next Actions to Migrate (Priority 3 - Interaction Actions):
* **Giving** (start here)
* **Showing** 
* Putting
* Inserting
* Removing
* Throwing

### Key Files:
* Checklist: `/event-time-checklist.md`
* Progress: `/packages/stdlib/event-time-progress.md`
* Migration guide: `/packages/stdlib/src/actions/migration-guide-adr-041.md`

### Migration Steps:
1. Create folder `/actions/standard/[action-name]/`
2. Create `[action-name]-events.ts` with typed interfaces
3. Copy action and update all context method calls to use `context.event()`
4. Create `index.ts` with exports
5. Update imports in `/actions/standard/index.ts`
6. Move old file to `.bak`
7. Check for test files and note any that need import updates

Please continue with the Priority 3 actions, starting with **Giving** and **Showing**.

## Additional Context
- All Priority 1 (Core) and Priority 2 (Manipulation) actions are complete
- The migration pattern is well-established and working smoothly
- Tests may need import path updates but core logic remains unchanged
- Focus on maintaining backward compatibility where needed
