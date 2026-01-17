# Canonical Troll Fight Logic (MDL Source)

**Source:** `docs/dungeon-81/mdlzork_810722/original_source/act1.254` (lines 174-239)
**Source:** `docs/dungeon-81/mdlzork_810722/original_source/dung.355` (TROLLDESC, TROLLOUT)

## Troll Descriptions

```lisp
TROLLDESC = "A nasty-looking troll, brandishing a bloody axe, blocks all passages
out of the room."

TROLLOUT = "An unconscious troll is sprawled on the floor. All passages out of
the room are open."
```

## Troll States

The troll has three states controlled by `TROLL-FLAG!-FLAG`:

| State | Flag Value | Description | Exits |
|-------|------------|-------------|-------|
| Alive/Fighting | NIL (false) | Uses TROLLDESC | Blocked |
| Unconscious (OUT!) | T (true) | Uses TROLLOUT, axe hidden | Open |
| Dead (DEAD!) | T (true) | Same as unconscious | Open |

## TROLL Function (act1.254:182-239)

### Combat Phase (FGHT?)

When combat check fires:

1. **If troll has axe:** No special action (continue fighting)
2. **If axe is in room AND probability check passes (75%):**
   - Troll recovers axe: "The troll, now worried about this encounter, recovers his bloody axe."
3. **If axe is elsewhere (troll disarmed):**
   - "The troll, disarmed, cowers in terror, pleading for his life in the guttural tongue of the trolls."

### Death (DEAD!)

```lisp
(<VERB? "DEAD!"> <SETG TROLL-FLAG!-FLAG T>)
```

Simply sets the flag to T. The troll body remains (uses TROLLOUT description).

### Knocked Out (OUT!)

```lisp
(<VERB? "OUT!">
 <TRZ .A ,OVISON>           ; Hide axe (remove visibility)
 <ODESC1 .T ,TROLLOUT>      ; Change description
 <SETG TROLL-FLAG!-FLAG T>) ; Set flag
```

- Axe becomes invisible (hidden)
- Description changes to TROLLOUT
- Exit flag set (passages open)

### Wake Up (IN!)

```lisp
(<VERB? "IN!">
 <TRO .A ,OVISON>           ; Show axe (add visibility)
 <COND (<==? <OROOM .T> .HERE>
        <TELL "The troll stirs, quickly resuming a fighting stance.">)>
 <ODESC1 .T ,TROLLDESC>     ; Restore description
 <SETG TROLL-FLAG!-FLAG <>>) ; Clear flag
```

- Axe becomes visible again
- Message if player is present
- Description restored to TROLLDESC
- Exit flag cleared (passages blocked again)

### Object Interactions

#### THROW/GIVE items to troll:

```lisp
; Troll catches/accepts the item
"The troll, who is remarkably coordinated, catches the {item}"
; or
"The troll, who is not overly proud, graciously accepts the gift"

; If knife specifically:
"and being for the moment sated, throws it back. Fortunately, the
troll has poor control, and the knife falls to the floor. He does
not look pleased."
; Knife drops to floor, troll becomes hostile again

; Any other item:
"and not having the most discriminating tastes, gleefully eats it."
; Item is destroyed (REMOVE-OBJECT)
```

#### TAKE/MOVE troll:

```lisp
"The troll spits in your face, saying \"Better luck next time.\""
```

#### Attack (MUNG) troll:

```lisp
"The troll laughs at your puny gesture."
```

#### HELLO when troll is dead/unconscious:

```lisp
"Unfortunately, the troll can't hear you."
```

## Axe Behavior (AXE-FUNCTION, line 176-180)

```lisp
<DEFINE AXE-FUNCTION ()
  <COND (<VERB? "TAKE">
         <TELL "The troll's axe seems white-hot. You can't hold on to it.">
         T)>>
```

**Important:** This only fires when the troll is ALIVE. When the troll is unconscious/dead:
- The axe is hidden (OVISON bit cleared) during OUT state
- After DEAD, the axe presumably becomes takeable (though MDL hides it during OUT)

## Exit Blocking

The Troll Room exits use conditional exits (CEXIT) that check `TROLL-FLAG`:

```lisp
; When TROLL-FLAG is NIL (troll alive): exits blocked
; When TROLL-FLAG is T (troll dead/out): exits open
```

## Combat Messages (TROLL-MELEE)

From `dung.355`, the troll has 8 combat outcomes with multiple message variants:

| Outcome | Code | Player Message Example |
|---------|------|----------------------|
| MISSED | 0 | "The troll swings his axe, but it misses." |
| UNCONSCIOUS | 1 | "The flat of the troll's axe hits you delicately on the head, knocking you out." |
| KILLED | 2 | "The troll lands a killing blow. You are dead." |
| LIGHT-WOUND | 3 | "The flat of the troll's axe skins across your forearm." |
| SERIOUS-WOUND | 4 | "The axe gets you right in the side. Ouch!" |
| STAGGER | 5 | "The troll hits you with a glancing blow, and you are momentarily stunned." |
| LOSE-WEAPON | 6 | (Player drops weapon) |
| HESITATE | 7 | (Miss on unconscious target) |
| SITTING-DUCK | 8 | (Kill unconscious target) |

## Platform Capability Analysis

### 1. Troll States (Alive → Unconscious → Dead, or Wake Up)

**MDL Mechanic:** Three states with transitions
- Alive: fighting, blocking exits
- Unconscious (OUT!): recoverable, axe hidden, exits open
- Dead (DEAD!): permanent, same display as unconscious

**Sharpee Capability:** CombatantTrait already has this!
```typescript
interface CombatantTrait {
  isAlive: boolean;      // false = dead
  isConscious: boolean;  // false = knocked out
  health: number;
  recoveryTurns?: number;

  knockOut(turns?: number): void;  // Sets isConscious = false
  wakeUp(): void;                   // Restores consciousness if alive
  kill(): void;                     // Sets isAlive = false
}
```

**Status:** ✅ Platform supports this. Story needs to use unconscious state properly.

**Implementation:**
- Combat at 20% health threshold triggers `knockOut()` (already in CombatService)
- Need daemon to count turns and call `wakeUp()` after N turns
- Death handler should check `isAlive` vs `isConscious` for different handling

---

### 2. Dynamic Description (TROLLDESC ↔ TROLLOUT)

**MDL Mechanic:** `<ODESC1 .T ,TROLLOUT>` changes object's description

**Sharpee Capability:** IdentityTrait.description is mutable
```typescript
const identity = troll.get(TraitType.IDENTITY) as IdentityTrait;
identity.description = 'An unconscious troll is sprawled on the floor.';
```

**Status:** ✅ Platform supports this. Just update trait in event handlers.

---

### 3. Exit Blocking/Unblocking

**MDL Mechanic:** CEXIT checks TROLL-FLAG, auto-blocks/unblocks

**Sharpee Capability:** RoomBehavior.blockExit/unblockExit
```typescript
RoomBehavior.blockExit(room, Direction.NORTH, 'message');
RoomBehavior.unblockExit(room, Direction.NORTH);
```

**Status:** ✅ Platform supports this. Need to call in both OUT and IN handlers.

---

### 4. Axe Visibility Toggle (OVISON bit)

**MDL Mechanic:** `<TRZ .A ,OVISON>` hides axe, `<TRO .A ,OVISON>` shows it

**Sharpee Capability:** ❌ No visibility toggle exists

**Options:**

**A) Add `isHidden` to IdentityTrait (Platform Change)**
```typescript
interface IIdentityData {
  isHidden?: boolean;  // If true, excluded from scope
}
```
Scope evaluator checks this flag. Clean, reusable for other puzzles.

**B) Move to "limbo" location (Story Workaround)**
```typescript
// Hide: move to nowhere
world.moveEntity(axe.id, 'limbo');
// Show: move back to troll or room
world.moveEntity(axe.id, troll.id);
```
Hacky but works without platform changes.

**C) Custom scope filter (Story Workaround)**
Register a scope filter that excludes the axe based on troll state.

**Recommendation:** Option A is cleanest - small platform change with broad utility.

---

### 5. Axe "White-Hot" (Block Taking with Custom Message)

**MDL Mechanic:** AXE-FUNCTION intercepts TAKE, returns custom message

**Sharpee Capability:** ✅ Extend existing Capability Dispatch (ADR-090)

The capability dispatch system already allows traits to register behaviors for actions.
Standard actions just need to check for capability claims before running their logic.

**Solution: Extend Capability Pattern to Standard Actions**

Small platform change - stdlib actions check for capability claims:
```typescript
// In stdlib taking.validate() - add at start
const blockingTrait = findTraitWithCapability(target, IFActions.TAKING);
if (blockingTrait) {
  const behavior = getBehaviorForCapability(blockingTrait, IFActions.TAKING);
  if (behavior) {
    const result = behavior.validate(target, context.world, context.player.id, {});
    if (!result.valid) {
      return { valid: false, error: result.error, params: result.params };
    }
  }
}
// Then proceed with standard taking validation...
```

Story creates trait + behavior:
```typescript
// stories/dungeo/src/traits/troll-axe-trait.ts
export class TrollAxeTrait implements ITrait {
  static readonly type = 'dungeo.trait.troll_axe';
  static readonly capabilities = ['if.action.taking'] as const;

  guardianId: EntityId;
}

// stories/dungeo/src/behaviors/troll-axe-behavior.ts
export const TrollAxeTakingBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    const trait = entity.get<TrollAxeTrait>('dungeo.trait.troll_axe');
    const guardian = world.getEntity(trait.guardianId);
    if (guardian && CombatBehavior.isAlive(guardian)) {
      return { valid: false, error: 'dungeo.axe.white_hot' };
    }
    return { valid: true }; // Allow standard taking to proceed
  },
  execute() {}, // Not needed - standard taking handles it
  report() { return []; },
  blocked(entity, world, actorId, error) {
    return [{ type: 'action.blocked', payload: { messageId: error } }];
  }
};

// In story init
registerCapabilityBehavior(TrollAxeTrait.type, 'if.action.taking', TrollAxeTakingBehavior);
```

**Status:** ✅ Clean extension of existing architecture. Small stdlib change required.

---

### 6. Troll Recovery Daemon (Wake Up After N Turns)

**MDL Mechanic:** Troll can wake up (IN! event)

**Sharpee Capability:** ✅ Daemon/Fuse system exists (ADR-071)
```typescript
// Register daemon that checks troll state each turn
scheduler.registerDaemon('troll-recovery', (context) => {
  const troll = context.world.getEntity(trollId);
  const combatant = troll?.get(TraitType.COMBATANT);
  if (combatant && !combatant.isAlive) return []; // Dead, no recovery
  if (combatant && !combatant.isConscious) {
    // Check recovery counter
    if (combatant.recoveryTurns !== undefined) {
      combatant.recoveryTurns--;
      if (combatant.recoveryTurns <= 0) {
        combatant.wakeUp();
        // Trigger IN! logic...
      }
    }
  }
  return [];
});
```

**Status:** ✅ Platform supports this. Implementation is story-level.

---

### 7. Weapon Recovery (75% Chance to Recover Axe)

**MDL Mechanic:** During FGHT?, if axe in room, 75% chance troll recovers it

**Sharpee Capability:** ✅ NPC behaviors have tick phase
```typescript
// In guard behavior tick or custom troll behavior
const axeLocation = world.getLocation(axeId);
const trollLocation = world.getLocation(trollId);
if (axeLocation === trollLocation && random.chance(0.75)) {
  world.moveEntity(axeId, trollId);
  return [messageEvent('dungeo.troll.recovers_axe')];
}
```

**Status:** ✅ Platform supports this. Add to troll's NPC behavior.

---

### 8. Disarmed Cowering

**MDL Mechanic:** If troll has no weapon and can't recover, shows cowering message

**Sharpee Capability:** ✅ NPC behavior can check inventory
```typescript
// In guard behavior
const hasWeapon = world.getContents(npc.id).some(item => item.has(TraitType.WEAPON));
if (!hasWeapon) {
  // Can't attack, show cowering message instead
  return [messageEvent('dungeo.troll.cowers')];
}
```

**Status:** ✅ Platform supports this. Add to troll's NPC behavior.

---

### 9. THROW/GIVE Item Interactions

**MDL Mechanic:**
- Troll catches/accepts items
- Knife: throws back, troll becomes hostile
- Other items: troll eats them (destroyed)

**Sharpee Capability:** ❌ No entity-level throw/give interception

**Same problem as #5.** Need entity action handlers or event hooks.

**Workaround:** Could use post-action event handlers:
```typescript
world.registerEventHandler('if.event.given', (event, world) => {
  if (event.data.recipient === trollId) {
    const item = world.getEntity(event.data.item);
    if (item?.name === 'knife') {
      // Throw back logic
    } else {
      // Eat item (move to limbo/destroy)
    }
  }
});
```
Problem: This fires AFTER the give succeeds, so item is already in troll's inventory.
We'd need to then move/destroy it, which works but is less clean.

**Status:** ⚠️ Partial support via post-action handlers. Pre-action hooks would be cleaner.

---

### 10. TAKE/MOVE Troll Response

**MDL Mechanic:** "The troll spits in your face..."

**Sharpee Capability:** ❌ Same entity action interception problem

**Workaround:** Troll has ActorTrait, so taking an actor might already be blocked.
Need to verify and potentially add custom message.

---

## Platform Changes Needed

### Priority 1: Entity Visibility Toggle
**Change:** Add `isHidden?: boolean` to IdentityTrait
**Impact:** Small, non-breaking
**Benefit:** Enables hiding objects without moving them (axe, secret doors, etc.)

### Priority 2: Capability Check in Standard Actions
**Change:** Standard stdlib actions check `findTraitWithCapability()` before running
**Impact:** Small - add ~10 lines to each action's validate phase
**Benefit:** Stories can register traits that block/intercept any standard action

This extends ADR-090's capability dispatch to work WITH standard actions, not just replace them.

---

## Implementation Plan

### Phase 1: Platform Changes (Small)
1. Add `isHidden` to IdentityTrait + scope check
2. Add capability check to stdlib taking action
3. Add capability check to stdlib giving/throwing actions (same pattern)

### Phase 2: Story Implementation
1. ✅ Inventory drops on death (done)
2. Create TrollTrait with state management
3. Create TrollAxeTrait + behavior (white-hot blocking)
4. Update troll description on unconscious/death
5. Unblock/reblock exits on state changes
6. Add troll recovery daemon (wake after N turns)
7. Add weapon recovery to troll behavior (75% chance)
8. Add disarmed cowering message
9. Add throw/give item handling via capability behaviors

---

## Sharpee Implementation Status

### Completed
- [x] Troll entity with CombatantTrait
- [x] Troll blocks north exit (RoomBehavior.blockExit)
- [x] Death handler unblocks exit
- [x] Death handler adds score (+10)
- [x] Bloody axe in troll inventory
- [x] Inventory drops when killed (dropsInventory: true, applyCombatResult fixed)
- [x] NPC combat messages (npc.combat.attack.*)
- [x] Player has CombatantTrait for combat resolution

### Platform TODO (Small Changes)
- [ ] Add `isHidden` to IdentityTrait
- [ ] Add scope check for `isHidden` flag
- [ ] Add capability check to taking action validate phase
- [ ] Add capability check to giving action validate phase
- [ ] Add capability check to throwing action validate phase

### Story TODO (Dungeo)
- [x] Create TrollAxeTrait + TrollAxeTakingBehavior (white-hot)
- [ ] Create TrollTrait (state, descriptions, room/axe references)
- [ ] Update troll description on unconscious (TROLLOUT)
- [ ] Update troll description on death
- [ ] Re-block exit if troll wakes up (IN! handler)
- [ ] Add troll recovery daemon (wake after N turns)
- [ ] Add weapon recovery to troll behavior (75% chance)
- [ ] Add disarmed cowering message
- [ ] Create TrollGivingBehavior (eats items, knife special case)
- [ ] Create TrollThrowingBehavior (catches items)
- [ ] Add all troll messages to lang-en-us

---

## Current Implementation Gap Analysis (2026-01-17)

### Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Axe "white-hot" blocking | ✅ Done | TrollAxeTrait + TrollAxeTakingBehavior via Universal Capability Dispatch |
| Death handling | ✅ Done | Exit unblocks, +10 score, inventory drops |
| Combat with troll | ✅ Done | Guard behavior, combat messages |
| Exit blocking when alive | ✅ Done | RoomBehavior.blockExit on north exit |

### Not Implemented

| Feature | Priority | Blocking Issue |
|---------|----------|----------------|
| **Unconscious state (OUT!)** | High | Need to differentiate knockOut from death |
| **Axe hidden when unconscious** | High | Needs `isHidden` platform change or limbo workaround |
| **Dynamic descriptions (TROLLDESC ↔ TROLLOUT)** | High | Need state change handlers |
| **Wake up daemon (IN!)** | High | Need daemon to count turns and trigger wake |
| **Re-block exits on wake** | High | Part of IN! handler |
| **Weapon recovery (75%)** | Medium | Troll NPC behavior tick phase |
| **Disarmed cowering** | Medium | Check inventory in guard behavior |
| **THROW/GIVE items to troll** | Medium | Need TrollGivingBehavior + TrollThrowingBehavior |
| **TAKE/MOVE troll response** | Low | Custom message for attempting to take actor |
| **Unarmed attack response** | Low | "laughs at puny gesture" when attacking without weapon |
| **HELLO to dead/unconscious troll** | Low | Custom talking response |

### Platform Changes Still Needed

| Change | Impact | Benefit |
|--------|--------|---------|
| Add `isHidden` to IdentityTrait | Small | Hide axe when troll unconscious without moving to limbo |
| Scope check for `isHidden` flag | Small | Exclude hidden items from parser scope |

### Files Created This Session

- `stories/dungeo/src/traits/troll-axe-trait.ts` - Trait with guardianId config
- `stories/dungeo/src/traits/troll-axe-behaviors.ts` - Validate/execute/report/blocked phases
- `stories/dungeo/tests/transcripts/troll-axe.transcript` - Test for white-hot blocking

### Test Coverage

```
> take axe (troll alive)
"The troll's axe seems white-hot. You can't hold on to it."  ✅

> take axe (troll dead)
"Taken."  ✅
```
