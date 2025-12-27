# ADR-072: Combat System

## Status

Proposed

## Context

Mainframe Zork features combat encounters that are more nuanced than simple "attack and win" mechanics. The current `attacking` action is deterministic and minimal - it needs enhancement to support:

1. **Randomized outcomes** - Combat isn't deterministic; skill and luck matter
2. **Weapon effectiveness** - Sword vs. knife vs. bare hands
3. **Opponent skill levels** - Troll is weak, thief is formidable
4. **Combat state** - Health, consciousness, death
5. **Special weapons** - Elvish sword glows near danger
6. **Defensive actions** - Blocking, parrying (implicit in skill)

### Zork Combat Encounters

| Opponent | Skill | Behavior | Special |
|----------|-------|----------|---------|
| Troll | Low | Guards bridge, fights back | Regenerates if not killed properly |
| Thief | High | Steals, fights skillfully | Has own weapon, hardest fight |
| Cyclops | None | Doesn't fight, flees from name | Puzzle, not combat |
| Spirits | None | Block passage, dispelled by ritual | Not combat |

### Design Requirements

1. **Randomized but fair** - Skill influences probability, not guaranteed outcome
2. **Weapon matters** - Better weapons increase hit chance and damage
3. **Two-way combat** - Opponents fight back on their turn
4. **Death possible** - Player can die, respawns (see resurrection mechanics)
5. **NPC death** - Opponents can be killed permanently
6. **Observable state** - Player can see opponent health descriptively
7. **Seeded random** - Deterministic for testing

### Logic Location

Combat system spans multiple layers:
- **world-model**: Combat-related traits (Weapon, Combatant)
- **stdlib**: Combat behaviors, standard combat resolution
- **engine**: Integrates with NPC turn phase
- **story**: Custom combat handlers, special weapons

## Decision

### Combat Traits

```typescript
// In world-model: Marks entity as able to engage in combat
interface CombatantTrait {
  type: 'combatant';

  // Health
  health: number;
  maxHealth: number;

  // Combat skill (0-100, affects hit/dodge chance)
  skill: number;

  // Natural damage (if no weapon)
  baseDamage: number;

  // State
  isConscious: boolean;  // false = knocked out, can recover
  isAlive: boolean;      // false = dead permanently

  // Optional: turns until consciousness recovery
  recoveryTurns?: number;
}

// Enhanced weapon trait
interface WeaponTrait {
  type: 'weapon';

  // Damage bonus added to attacks
  damage: number;

  // Skill bonus when wielding this weapon
  skillBonus: number;

  // Special properties
  isBlessed?: boolean;    // Extra damage to undead/spirits
  glowsNearDanger?: boolean;  // Elvish sword behavior

  // Required trait to wield effectively (optional)
  requiredTrait?: string;
}
```

### Combat Resolution

Combat uses a skill-based probability system:

```typescript
interface CombatService {
  // Resolve a single attack
  resolveAttack(context: CombatContext): CombatResult;

  // Check if attacker can attack target
  canAttack(attacker: Entity, target: Entity): ValidationResult;

  // Get descriptive health status
  getHealthStatus(entity: Entity): HealthStatus;
}

interface CombatContext {
  attacker: Entity;
  target: Entity;
  weapon?: Entity;  // Weapon being used, if any
  world: World;
  random: SeededRandom;
}

interface CombatResult {
  hit: boolean;
  damage: number;
  targetNewHealth: number;
  targetKnockedOut: boolean;
  targetKilled: boolean;
  messageId: string;
  messageData: Record<string, unknown>;
}

type HealthStatus = 'healthy' | 'wounded' | 'badly_wounded' | 'near_death' | 'unconscious' | 'dead';
```

### Hit Probability Formula

```typescript
function calculateHitChance(
  attackerSkill: number,
  defenderSkill: number,
  weaponBonus: number
): number {
  // Base chance starts at 50%
  const baseChance = 50;

  // Skill differential: each point of advantage = +1%
  const skillDiff = (attackerSkill + weaponBonus) - defenderSkill;

  // Clamp to 10%-95% (always some chance either way)
  return Math.max(10, Math.min(95, baseChance + skillDiff));
}

function resolveCombat(ctx: CombatContext): CombatResult {
  const attacker = ctx.attacker;
  const target = ctx.target;

  const attackerCombat = attacker.traits.combatant;
  const targetCombat = target.traits.combatant;

  const weapon = ctx.weapon;
  const weaponTrait = weapon?.traits.weapon;

  const hitChance = calculateHitChance(
    attackerCombat?.skill ?? 30,
    targetCombat?.skill ?? 30,
    weaponTrait?.skillBonus ?? 0
  );

  const roll = ctx.random.int(1, 100);
  const hit = roll <= hitChance;

  if (!hit) {
    return {
      hit: false,
      damage: 0,
      targetNewHealth: targetCombat.health,
      targetKnockedOut: false,
      targetKilled: false,
      messageId: CombatMessages.ATTACK_MISSED,
      messageData: { attackerName: attacker.name, targetName: target.name }
    };
  }

  // Calculate damage
  const baseDamage = attackerCombat?.baseDamage ?? 1;
  const weaponDamage = weaponTrait?.damage ?? 0;
  const damage = baseDamage + weaponDamage;

  const newHealth = Math.max(0, targetCombat.health - damage);
  const killed = newHealth <= 0;
  const knockedOut = !killed && newHealth <= (targetCombat.maxHealth * 0.2);

  return {
    hit: true,
    damage,
    targetNewHealth: newHealth,
    targetKnockedOut: knockedOut,
    targetKilled: killed,
    messageId: killed
      ? CombatMessages.ATTACK_KILLED
      : knockedOut
        ? CombatMessages.ATTACK_KNOCKED_OUT
        : CombatMessages.ATTACK_HIT,
    messageData: {
      attackerName: attacker.name,
      targetName: target.name,
      damage,
      weaponName: weapon?.name
    }
  };
}
```

### Message Constants

```typescript
// In stdlib: combat-messages.ts
export const CombatMessages = {
  // Attack outcomes
  ATTACK_MISSED: 'combat.attack.missed',
  ATTACK_HIT: 'combat.attack.hit',
  ATTACK_HIT_LIGHT: 'combat.attack.hit_light',
  ATTACK_HIT_HEAVY: 'combat.attack.hit_heavy',
  ATTACK_KNOCKED_OUT: 'combat.attack.knocked_out',
  ATTACK_KILLED: 'combat.attack.killed',

  // Defense outcomes
  DEFEND_BLOCKED: 'combat.defend.blocked',
  DEFEND_PARRIED: 'combat.defend.parried',

  // Health status
  HEALTH_HEALTHY: 'combat.health.healthy',
  HEALTH_WOUNDED: 'combat.health.wounded',
  HEALTH_BADLY_WOUNDED: 'combat.health.badly_wounded',
  HEALTH_NEAR_DEATH: 'combat.health.near_death',

  // Special
  SWORD_GLOWS: 'combat.special.sword_glows',
  CANNOT_ATTACK: 'combat.cannot_attack',
  ALREADY_DEAD: 'combat.already_dead',
  NOT_HOSTILE: 'combat.not_hostile',
} as const;

// In lang-en-us: combat-text.ts
export const combatText = {
  'combat.attack.missed': ({ attackerName, targetName }) =>
    `Your attack misses the ${targetName}.`,
  'combat.attack.hit': ({ targetName, damage }) =>
    `You hit the ${targetName}!`,
  'combat.attack.knocked_out': ({ targetName }) =>
    `The ${targetName} collapses, unconscious!`,
  'combat.attack.killed': ({ targetName }) =>
    `The ${targetName} falls dead!`,
  'combat.health.wounded': ({ targetName }) =>
    `The ${targetName} appears wounded.`,
  'combat.health.badly_wounded': ({ targetName }) =>
    `The ${targetName} is badly wounded and staggering.`,
  'combat.special.sword_glows': () =>
    `Your sword glows with a faint blue light!`,
  // ...
};
```

### Enhanced Attacking Action

The existing `attacking` action is enhanced to use the combat service:

```typescript
// In stdlib: attacking/attacking.ts
const attackingAction: Action = {
  id: 'attacking',

  validate(context: ActionContext): ValidationResult {
    const target = context.target;
    if (!target) {
      return { valid: false, messageId: CombatMessages.NO_TARGET };
    }

    const targetCombat = target.traits.combatant;
    if (!targetCombat) {
      return { valid: false, messageId: CombatMessages.CANNOT_ATTACK };
    }

    if (!targetCombat.isAlive) {
      return { valid: false, messageId: CombatMessages.ALREADY_DEAD };
    }

    // Check if player has a weapon wielded
    const weapon = findWieldedWeapon(context);

    // Store for execute phase
    context.sharedData.set('weapon', weapon);

    return { valid: true };
  },

  execute(context: ActionContext): SemanticEvent[] {
    const target = context.target!;
    const weapon = context.sharedData.get('weapon');

    const result = context.services.combat.resolveAttack({
      attacker: context.actor,
      target,
      weapon,
      world: context.world,
      random: context.random
    });

    // Apply damage to target
    if (result.hit) {
      context.world.updateEntity(target.id, {
        traits: {
          ...target.traits,
          combatant: {
            ...target.traits.combatant,
            health: result.targetNewHealth,
            isConscious: !result.targetKnockedOut && !result.targetKilled,
            isAlive: !result.targetKilled
          }
        }
      });
    }

    // Store result for reporting
    context.sharedData.set('combatResult', result);

    return [{
      type: 'combat.attack',
      data: {
        attacker: context.actor.id,
        target: target.id,
        weapon: weapon?.id,
        result
      }
    }];
  },

  report(context: ActionContext): SemanticEvent[] {
    const result = context.sharedData.get('combatResult') as CombatResult;

    return [{
      type: 'report',
      data: {
        messageId: result.messageId,
        ...result.messageData
      }
    }];
  }
};
```

### NPC Combat (Counterattacks)

NPCs with guard behavior counterattack using the same combat service:

```typescript
// NPC behavior for combat response
const guardBehavior: NpcBehavior = {
  id: 'guard',

  onAttacked: (ctx, attacker) => {
    // Counterattack
    return [{ type: 'attack', target: attacker.id }];
  }
};

// When NPC attacks, same combat resolution applies
function executeNpcAttack(npc: Entity, target: Entity, ctx: NpcContext): NpcEvent[] {
  const weapon = getNpcWeapon(npc, ctx.world);

  const result = ctx.services.combat.resolveAttack({
    attacker: npc,
    target,
    weapon,
    world: ctx.world,
    random: ctx.random
  });

  // Apply damage
  if (result.hit) {
    applyDamage(target, result, ctx.world);
  }

  return [{
    type: 'npc.attacked',
    npc: npc.id,
    target: target.id,
    result
  }];
}
```

### Player Death and Resurrection

When player health reaches 0:

```typescript
// In story or stdlib: death handling
eventBus.on('combat.attack', (event) => {
  if (event.data.target === 'player' && event.data.result.targetKilled) {
    // Trigger death sequence
    eventBus.emit({
      type: 'player.died',
      data: { causeId: DeathMessages.KILLED_BY, causeData: { killer: event.data.attacker } }
    });
  }
});

// Resurrection (Zork-style: respawn in forest)
eventBus.on('player.died', (event) => {
  // After death message, respawn
  scheduler.setFuse({
    id: 'resurrection',
    name: 'Player Resurrection',
    turns: 1,
    trigger: (ctx) => {
      ctx.world.updateEntity('player', {
        location: 'forest-west',
        traits: {
          ...player.traits,
          combatant: {
            ...player.traits.combatant,
            health: player.traits.combatant.maxHealth,
            isAlive: true,
            isConscious: true
          }
        }
      });
      // Drop inventory at death location (Zork behavior)
      return [{
        type: 'player.resurrected',
        data: { messageId: DeathMessages.RESURRECTED }
      }];
    }
  });
});
```

### Special Weapon: Elvish Sword

```typescript
// Daemon that checks for nearby danger
scheduler.registerDaemon({
  id: 'elvish-sword-glow',
  name: 'Elvish Sword Danger Detection',
  condition: (ctx) => {
    const sword = ctx.world.getEntity('elvish-sword');
    return sword?.location === 'player' || isInPlayerRoom(sword, ctx);
  },
  run: (ctx) => {
    const playerRoom = ctx.world.getEntity(ctx.playerLocation);
    const hostileNearby = getEntitiesInRoom(playerRoom, ctx.world)
      .some(e => e.traits.npc?.isHostile && e.traits.combatant?.isAlive);

    const sword = ctx.world.getEntity('elvish-sword');
    const wasGlowing = sword.traits.weapon?.isGlowing;

    if (hostileNearby && !wasGlowing) {
      ctx.world.updateEntity('elvish-sword', {
        traits: {
          ...sword.traits,
          weapon: { ...sword.traits.weapon, isGlowing: true }
        }
      });
      return [{
        type: 'ambient',
        data: { messageId: CombatMessages.SWORD_GLOWS }
      }];
    } else if (!hostileNearby && wasGlowing) {
      ctx.world.updateEntity('elvish-sword', {
        traits: {
          ...sword.traits,
          weapon: { ...sword.traits.weapon, isGlowing: false }
        }
      });
    }
    return [];
  }
});
```

### Combat Skill Levels (Zork-Calibrated)

| Entity | Skill | Damage | Notes |
|--------|-------|--------|-------|
| Player (unarmed) | 30 | 1 | Base starting |
| Player (sword) | 30 + 20 | 1 + 3 | With elvish sword |
| Troll | 25 | 2 | Weak fighter |
| Thief | 70 | 3 | Master combatant |

## Consequences

### Positive

1. **Authentic Zork feel** - Randomized combat with skill factors
2. **Two-way combat** - NPCs fight back naturally via NPC system
3. **Extensible** - Custom weapons, special abilities via traits
4. **Testable** - Seeded random for deterministic tests
5. **Localized** - All text via message IDs

### Negative

1. **RNG frustration** - Players may get unlucky streaks
2. **Balance tuning** - Skill/damage values need playtesting
3. **Complexity** - More moving parts than deterministic combat

### Neutral

1. **No explicit "wield" action** - Sword in inventory = wielded (could add later)
2. **Simple health model** - No body parts, armor, etc.

## Alternatives Considered

### Alternative 1: Deterministic Combat

Fixed outcomes based on weapon/skill comparison.

**Rejected because**:
- Not faithful to Zork
- Less engaging for players
- Removes tactical uncertainty

### Alternative 2: Complex RPG System

Stats, armor, multiple damage types, etc.

**Rejected because**:
- Overkill for parser IF
- High authoring burden
- Not Zork-like

### Alternative 3: Rock-Paper-Scissors

Attack types that counter each other.

**Rejected because**:
- Doesn't fit Zork model
- Requires complex parser support
- Over-engineered

## Implementation Notes

### Phase 1: Core Combat
1. CombatantTrait and WeaponTrait in world-model
2. CombatService in stdlib
3. Enhanced attacking action
4. combat-messages.ts

### Phase 2: NPC Integration
1. NPC counterattack behavior
2. Player death handling
3. Resurrection mechanics

### Phase 3: Special Features
1. Elvish sword glow daemon
2. Health status descriptions
3. Combat event handlers for story customization

## References

- Zork MDL source (fight.mud, combat.mud)
- Inform 6 combat system
- TADS combat libraries
