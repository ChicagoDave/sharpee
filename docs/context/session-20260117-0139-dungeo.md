# Session Summary: 2026-01-17 - dungeo

## Status: Completed

## Goals
- Fix troll combat bug (axe not dropping when troll dies)
- Document canonical troll behavior from MDL source
- Plan troll implementation with platform capabilities analysis
- Document capability dispatch pattern for team understanding

## Completed

### 1. Combat Service Fix - NPC Inventory Dropping

**Problem**: When NPCs die in combat, their inventory items don't drop to the room. The troll's axe was vanishing instead of becoming available for the player to take.

**Root Cause**: `applyCombatResult` in combat-service.ts wasn't handling inventory transfer for defeated NPCs.

**Solution**: Enhanced `applyCombatResult` to move all NPC inventory items to the room location before removing the NPC:

```typescript
// Get NPC's inventory before moving
const npcInventory = world.getInventory(npcId);

// Move all items to the room
for (const itemId of npcInventory) {
  world.moveEntity(itemId, locationId);
}

// Then remove the NPC
world.removeEntity(npcId);
```

**Files Modified**:
- `packages/stdlib/src/combat/combat-service.ts` - Added inventory dropping logic
- `packages/stdlib/src/combat/index.ts` - Exported `CombatVictory` type for actions
- `packages/stdlib/src/actions/standard/attacking/attacking.ts` - Use dropped items in report

**Verification**: The troll now properly drops the bloody axe when killed, matching Zork behavior.

### 2. Troll Logic Documentation

Created comprehensive documentation of canonical troll behavior at `docs/work/dungeo/troll-logic.md`:

**Canonical MDL Behavior** (from dungeon-81/mdlzork_810722/1actions.mud):
- Troll starts at east-west passage intersection, wielding bloody axe
- Wanders randomly between rooms (no fixed route)
- Attacks player on sight with escalating messages
- Blocks passage when present (TROLL-BLOCK-ATTACK daemon)
- Can be killed with weapons (TROLL-MELEE function)
- "Ferocious troll" vs "Unconscious troll" states
- Drops axe on death, becomes corpse

**Sharpee Platform Capabilities vs Requirements**:
- ✅ Has: NPC system, CombatBehavior, GuardBehavior
- ✅ Has: Health/damage mechanics, weapon support
- ✅ Has: Wandering behavior, movement blocking
- ❌ Needs: Capability dispatch on stdlib actions (CRITICAL)
- ❌ Needs: Combat state tracking (conscious/unconscious)
- ❌ Needs: Death handling with corpse transformation

**Implementation Plan**:

*Platform Changes* (discuss first per CLAUDE.md):
1. Enable capability dispatch on ALL stdlib actions (going, taking, etc.)
2. Add multi-state combat system (conscious → unconscious → dead)
3. Add death transformation behavior (NPC → corpse entity)

*Story Tasks* (can proceed):
1. Create TrollBlockingTrait + behavior
2. Implement troll wandering AI
3. Create troll entity with combat stats
4. Write troll-specific messages

### 3. Architecture Documentation

#### Added "Always Trust the Architecture" Principle to CLAUDE.md

New section documenting the core principle: **Extend existing patterns rather than inventing workarounds**.

**Key Points**:
- Capability dispatch exists to solve "entity-specific action behavior" problems
- Story traits should extend stdlib actions via capability dispatch, not create parallel action systems
- Example: Troll blocking requires `if.action.going` capability, not a "check if troll blocks" daemon

**Anti-Pattern Caught**:
- Initial troll plan suggested daemon checking player movements
- Correct approach: TrollBlockingTrait with `if.action.going` capability validates movement

#### Created Capability Dispatch White Paper

Wrote comprehensive technical documentation at `docs/design/sharpee-dispatch-wp.md`:

**Pattern Explained**:
- Double dispatch: Action asks entity "can you handle this?"
- Registry: `CapabilityRegistryService` maps (trait, action) → behavior
- Composition: Entity behavior = sum of all trait capabilities

**Real-World Analogies**:
- Attribute-Based Access Control (ABAC): Policies + attributes + decision engine
- HTTP Content Negotiation: Accept headers + server capabilities → response handler
- Rule Engines: Facts + rules + inference → action
- Plugin Systems: Core + extension points + plugins
- Medical Clinical Decision Support: Patient data + guidelines → recommendations

**Benefits**:
- Separation of concerns (traits own state, behaviors own logic)
- Open/closed principle (add capabilities without changing engine)
- Story-level extensibility (override ANY stdlib action)
- Testability (behaviors are pure functions)

**Trade-offs**:
- Additional indirection (action → registry → behavior)
- Registry management overhead
- Requires discipline to avoid "god traits"

### 4. Key Architectural Decision: Universal Capability Dispatch

**Decision**: Enable capability dispatch on ALL stdlib actions, not just specialized verbs like LOWER/WAVE.

**Rationale**:
- Troll blocking requires intercepting `if.action.going` (a standard action)
- Many puzzles need entity-specific behavior for standard verbs (OPEN coffin vs OPEN door)
- Consistency: If some actions support it, all should

**Implementation Approach**:
- Engine-level change: Check capability registry before every action execution
- Fallback to default behavior if no capability registered
- Story traits can now intercept/block ANY action

**Impact**:
- Unlocks all Zork puzzle mechanics (guardians blocking, entity-specific interactions)
- Maintains stdlib action semantics (capability behaviors follow 4-phase pattern)
- Platform discussion required before implementation (per CLAUDE.md)

## Key Decisions

### 1. Combat Service Owns Inventory Dropping

When NPCs die, the combat service handles inventory transfer before entity removal. This keeps the logic centralized and ensures consistency across all combat scenarios.

**Alternative Considered**: Death behavior on NPCs handles dropping.
**Rejected Because**: Combat service already coordinates NPC removal, adding inventory transfer there is simpler.

### 2. Troll Implementation Requires Platform Changes

After analyzing MDL source and Sharpee capabilities, determined that proper troll implementation needs platform enhancements:
- Universal capability dispatch (so TrollBlockingTrait can intercept going)
- Multi-state combat (conscious/unconscious/dead)
- Death transformation (NPC entity → corpse entity)

These are general-purpose features that will benefit many Zork puzzles, not troll-specific workarounds.

### 3. Document Capability Dispatch for Team

Created white paper explaining the pattern to:
- Help team understand when/why to use capability dispatch vs other patterns
- Provide real-world analogies for intuition
- Document trade-offs and design rationale
- Support onboarding future contributors

## Open Items

### Short Term
- Discuss platform changes with user (universal capability dispatch, multi-state combat)
- Implement platform changes after approval
- Create troll entity and behaviors based on `troll-logic.md` plan
- Test troll combat and blocking with transcripts

### Long Term
- Apply capability dispatch pattern to other guardians (thief, cyclops)
- Implement remaining combat states (unconscious, resurrection)
- Create corpse transformation system for all killable NPCs

## Files Modified

**Platform** (3 files):
- `packages/stdlib/src/combat/combat-service.ts` - Added NPC inventory dropping on death
- `packages/stdlib/src/combat/index.ts` - Exported CombatVictory type
- `packages/stdlib/src/actions/standard/attacking/attacking.ts` - Use dropped items in combat report

**Documentation** (3 files):
- `CLAUDE.md` - Added "Always Trust the Architecture" principle
- `docs/work/dungeo/troll-logic.md` - NEW: Canonical troll behavior and implementation plan
- `docs/design/sharpee-dispatch-wp.md` - NEW: Capability dispatch white paper

## Architectural Notes

### Capability Dispatch as Universal Pattern

This session revealed that capability dispatch should be the PRIMARY extension mechanism for all stdlib actions, not just specialized verbs. The troll blocking puzzle (a core Zork mechanic) fundamentally requires entity-specific behavior for standard actions like GOING.

**Pattern Evolution**:
1. **Initial**: Capability dispatch for verbs with no standard semantics (LOWER, WAVE)
2. **Current**: Capability dispatch for any action where entity-specific behavior is needed
3. **Future**: All stdlib actions check capability registry, enabling story-level override of ANY action

This makes Sharpee's architecture more like HTTP (any handler can intercept any request) than like OOP method dispatch (fixed hierarchy).

### Combat Service as Coordination Layer

The combat service pattern works well:
- Resolves attacks using attacker/defender stats and weapons
- Applies damage and determines victory/defeat
- Coordinates side effects (inventory dropping, entity removal)
- Emits events for other systems to react

This keeps combat logic centralized while allowing story-specific extensions via event handlers.

### Documentation as Team Resource

Created two new team resources:
1. `troll-logic.md` - Story-level puzzle documentation pattern (canonical behavior + platform gap analysis + implementation plan)
2. `sharpee-dispatch-wp.md` - Platform pattern documentation (what/why/when/trade-offs + real-world analogies)

These provide templates for documenting future puzzles and architectural patterns.

## Notes

**Session duration**: ~3 hours

**Approach**:
1. Bug fix with root cause analysis
2. Deep dive into canonical source code (MDL)
3. Platform capabilities gap analysis
4. Architectural pattern documentation
5. Team communication via white paper

**Key Insight**: The troll puzzle revealed a fundamental architectural need - capability dispatch must work on ALL actions, not just specialized verbs. This unlocks the full range of Zork puzzle mechanics and aligns with Sharpee's extensibility goals.

**Next Session**: Discuss platform changes with user, then implement universal capability dispatch and multi-state combat system.

---

**Progressive update**: Session completed 2026-01-17 02:46
