# @sharpee/ext-basic-combat

Basic combat extension — attack/defend mechanics.

---

### combat-service

```typescript
/**
 * Combat Service (ADR-072)
 *
 * Handles combat resolution using a skill-based probability system.
 * Moved from stdlib to basic-combat extension — stories opt in by
 * calling registerBasicCombat().
 */
import { EntityId, SeededRandom } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { HealthStatus } from './combat-messages.js';
/**
 * Context for combat resolution
 */
export interface CombatContext {
    /** The attacker entity */
    attacker: IFEntity;
    /** The target entity */
    target: IFEntity;
    /** Weapon being used (if any) */
    weapon?: IFEntity;
    /** The world model */
    world: WorldModel;
    /** Seeded random number generator */
    random: SeededRandom;
}
/**
 * Result of combat resolution
 */
export interface CombatResult {
    /** Whether the attack hit */
    hit: boolean;
    /** Damage dealt (0 if missed) */
    damage: number;
    /** Target's new health after damage */
    targetNewHealth: number;
    /** Whether target was knocked out (unconscious) */
    targetKnockedOut: boolean;
    /** Whether target was killed */
    targetKilled: boolean;
    /** Message ID for the result */
    messageId: string;
    /** Data for the message */
    messageData: Record<string, unknown>;
}
/**
 * Validation result for combat
 */
export interface CombatValidation {
    valid: boolean;
    messageId?: string;
    messageData?: Record<string, unknown>;
}
/**
 * Combat Service interface
 */
export interface ICombatService {
    /** Resolve a single attack */
    resolveAttack(context: CombatContext): CombatResult;
    /** Check if attacker can attack target */
    canAttack(attacker: IFEntity, target: IFEntity): CombatValidation;
    /** Get descriptive health status */
    getHealthStatus(entity: IFEntity): HealthStatus;
    /** Calculate hit chance */
    calculateHitChance(attackerSkill: number, defenderSkill: number, weaponBonus: number): number;
}
/**
 * Combat Service implementation
 */
export declare class CombatService implements ICombatService {
    /**
     * Calculate hit chance based on skills
     *
     * Base chance starts at 50%.
     * Each point of skill advantage = +1%.
     * Clamped to 10%-95% (always some chance either way).
     */
    calculateHitChance(attackerSkill: number, defenderSkill: number, weaponBonus: number): number;
    /**
     * Resolve an attack
     */
    resolveAttack(context: CombatContext): CombatResult;
    /**
     * Check if an entity can attack another
     */
    canAttack(attacker: IFEntity, target: IFEntity): CombatValidation;
    /**
     * Get health status for an entity
     */
    getHealthStatus(entity: IFEntity): HealthStatus;
}
/**
 * Create a new Combat Service instance
 */
export declare function createCombatService(): ICombatService;
/**
 * Result of applying combat damage
 */
export interface ApplyCombatResultInfo {
    /** IDs of items dropped from target's inventory */
    droppedItems: EntityId[];
}
/**
 * Apply combat result to the target entity
 * Handles health updates, consciousness changes, death, and inventory dropping
 */
export declare function applyCombatResult(target: IFEntity, result: CombatResult, world: WorldModel): ApplyCombatResultInfo;
```

### combat-messages

```typescript
/**
 * Combat Message IDs (ADR-072)
 *
 * Semantic message IDs for combat-related events.
 * Actual text is provided by the language layer.
 */
/**
 * Message IDs for combat events
 */
export declare const CombatMessages: {
    readonly ATTACK_MISSED: "combat.attack.missed";
    readonly ATTACK_HIT: "combat.attack.hit";
    readonly ATTACK_HIT_LIGHT: "combat.attack.hit_light";
    readonly ATTACK_HIT_HEAVY: "combat.attack.hit_heavy";
    readonly ATTACK_KNOCKED_OUT: "combat.attack.knocked_out";
    readonly ATTACK_KILLED: "combat.attack.killed";
    readonly DEFEND_BLOCKED: "combat.defend.blocked";
    readonly DEFEND_PARRIED: "combat.defend.parried";
    readonly DEFEND_DODGED: "combat.defend.dodged";
    readonly HEALTH_HEALTHY: "combat.health.healthy";
    readonly HEALTH_WOUNDED: "combat.health.wounded";
    readonly HEALTH_BADLY_WOUNDED: "combat.health.badly_wounded";
    readonly HEALTH_NEAR_DEATH: "combat.health.near_death";
    readonly HEALTH_UNCONSCIOUS: "combat.health.unconscious";
    readonly HEALTH_DEAD: "combat.health.dead";
    readonly SWORD_GLOWS: "combat.special.sword_glows";
    readonly SWORD_STOPS_GLOWING: "combat.special.sword_stops_glowing";
    readonly BLESSED_WEAPON_EFFECT: "combat.special.blessed_weapon";
    readonly CANNOT_ATTACK: "combat.cannot_attack";
    readonly ALREADY_DEAD: "combat.already_dead";
    readonly NOT_HOSTILE: "combat.not_hostile";
    readonly NO_TARGET: "combat.no_target";
    readonly TARGET_UNCONSCIOUS: "combat.target_unconscious";
    readonly NEED_WEAPON: "combat.need_weapon";
    readonly COMBAT_STARTED: "combat.started";
    readonly COMBAT_ENDED: "combat.ended";
    readonly PLAYER_DIED: "combat.player_died";
    readonly PLAYER_RESURRECTED: "combat.player_resurrected";
};
/**
 * Type for combat message IDs
 */
export type CombatMessageId = (typeof CombatMessages)[keyof typeof CombatMessages];
/**
 * Health status levels
 */
export type HealthStatus = 'healthy' | 'wounded' | 'badly_wounded' | 'near_death' | 'unconscious' | 'dead';
/**
 * Get message ID for a health status
 */
export declare function getHealthStatusMessageId(status: HealthStatus): CombatMessageId;
```

### basic-combat-interceptor

```typescript
/**
 * Basic Combat Interceptor
 *
 * Wraps CombatService as an ActionInterceptor for PC→NPC attacks.
 * Registered on CombatantTrait for if.action.attacking.
 */
import { ActionInterceptor } from '@sharpee/world-model';
/**
 * ActionInterceptor that uses CombatService for PC→NPC combat resolution.
 *
 * postExecute populates sharedData with:
 *   - attackResult: AttackResult-shaped object
 *   - combatResult: CombatResult from CombatService
 *   - usedCombatService: true
 */
export declare const BasicCombatInterceptor: ActionInterceptor;
```

### basic-npc-resolver

```typescript
/**
 * Basic NPC Combat Resolver
 *
 * Wraps CombatService as an NpcCombatResolver for NPC→PC (and NPC→NPC) attacks.
 * Used by npc-service.ts executeAttack() when registered.
 */
import type { NpcCombatResolver } from '@sharpee/stdlib';
/**
 * Basic NPC combat resolver using CombatService.
 *
 * Resolves NPC attacks using the skill-based probability system.
 * Returns semantic events for the attack result and optional death.
 */
export declare const basicNpcResolver: NpcCombatResolver;
```

### index

```typescript
/**
 * @sharpee/ext-basic-combat
 *
 * Generic skill-based combat extension for Sharpee IF engine.
 *
 * Provides opt-in combat resolution for both attack directions:
 * - PC→NPC: BasicCombatInterceptor (registered on CombatantTrait + if.action.attacking)
 * - NPC→PC: basicNpcResolver (registered as NpcCombatResolver)
 *
 * Stories with custom combat (e.g., Dungeo's melee system) register their
 * own interceptor and resolver instead of calling registerBasicCombat().
 *
 * @example
 * ```typescript
 * import { registerBasicCombat } from '@sharpee/ext-basic-combat';
 *
 * // In story's initializeWorld():
 * registerBasicCombat();
 * ```
 */
/**
 * Register the basic combat system for both attack directions.
 *
 * Call this in your story's initializeWorld() to enable generic
 * skill-based combat. Do NOT call this if your story registers
 * its own combat interceptor/resolver.
 *
 * Registers:
 * 1. BasicCombatInterceptor on CombatantTrait + if.action.attacking (PC→NPC)
 * 2. basicNpcResolver as the NPC combat resolver (NPC→PC)
 */
export declare function registerBasicCombat(): void;
export { CombatService, createCombatService, applyCombatResult, type ICombatService, type CombatContext, type CombatResult, type CombatValidation, type ApplyCombatResultInfo, } from './combat-service.js';
export { CombatMessages, getHealthStatusMessageId, type CombatMessageId, type HealthStatus, } from './combat-messages.js';
export { BasicCombatInterceptor } from './basic-combat-interceptor.js';
export { basicNpcResolver } from './basic-npc-resolver.js';
```
