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

## Current Implementation Gap Analysis (2026-01-17)

### Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Axe "white-hot" blocking | ✅ Done | TrollAxeTrait + TrollAxeTakingBehavior via Universal Capability Dispatch |
| Death handling | ✅ Done | Exit unblocks, +10 score, inventory drops |
| Combat with troll | ✅ Done | Guard behavior, combat messages |
| Exit blocking when alive | ✅ Done | RoomBehavior.blockExit on north exit |
| Axe hidden when unconscious | ✅ Done | TrollAxeVisibilityBehavior via `if.scope.visible` capability |
| Unconscious state (OUT!) | ✅ Done | `if.event.knocked_out` handler on troll entity |
| Dynamic descriptions | ✅ Done | TROLLDESC ↔ TROLLOUT on knockout/wakeup |
| Wake up daemon (IN!) | ✅ Done | `troll-daemon.ts` counts recovery turns, triggers wake |
| Re-block exits on wake | ✅ Done | Part of wake up daemon |

### Not Implemented

| Feature | Priority | Blocking Issue |
|---------|----------|----------------|
| **Weapon recovery (75%)** | Medium | Troll NPC behavior tick phase |
| **Disarmed cowering** | Medium | Check inventory in guard behavior |
| **THROW/GIVE items to troll** | Medium | Need TrollGivingBehavior + TrollThrowingBehavior |
| **TAKE/MOVE troll response** | Low | Custom message for attempting to take actor |
| **Unarmed attack response** | Low | "laughs at puny gesture" when attacking without weapon |
| **HELLO to dead/unconscious troll** | Low | Custom talking response |

### Platform Changes Still Needed

None! All high-priority troll features implemented using existing platform capabilities:
- Visibility via `if.scope.visible` capability dispatch (no `isHidden` needed)
- State changes via entity event handlers (`if.event.knocked_out`, `if.event.death`)
- Recovery via scheduler daemon (ADR-071)

### Files Created/Modified

**Session 2026-01-17 (generic dispatch + visibility):**
- `stories/dungeo/src/traits/troll-axe-trait.ts` - Trait with guardianId, claims `if.action.taking` + `if.scope.visible`
- `stories/dungeo/src/traits/troll-axe-behaviors.ts` - TrollAxeTakingBehavior + TrollAxeVisibilityBehavior
- `stories/dungeo/tests/transcripts/troll-axe.transcript` - Test for white-hot blocking
- `stories/dungeo/tests/transcripts/troll-visibility.transcript` - Test for axe hidden when unconscious

**Session 2026-01-17 (wake up daemon + dynamic descriptions):**
- `stories/dungeo/src/scheduler/troll-daemon.ts` - Recovery daemon (5 turn countdown)
- `stories/dungeo/src/scheduler/scheduler-messages.ts` - Added TROLL_KNOCKED_OUT, TROLL_WAKES_UP
- `stories/dungeo/src/regions/underground.ts` - Added knockout handler, TROLLDESC/TROLLOUT constants
- `stories/dungeo/src/index.ts` - Register daemon, add English messages
- `stories/dungeo/tests/transcripts/troll-recovery.transcript` - Test for wake up daemon

### Test Coverage

```
> take axe (troll alive)
"The troll's axe seems white-hot. You can't hold on to it."  ✅

> take axe (troll dead)
"Taken."  ✅

> look (troll unconscious)
Axe NOT visible  ✅

> examine troll (conscious)
"blocks the northern passage"  ✅

> examine troll (unconscious)
"sprawled on the floor... passages open"  ✅

> wait 5 turns (in troll room)
"The troll stirs, quickly resuming a fighting stance."  ✅

> north (after troll wakes)
"The troll blocks your way."  ✅
```
