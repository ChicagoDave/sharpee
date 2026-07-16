/**
 * Attacking action - hostile action against NPCs or objects
 *
 * This action handles combat or destructive actions.
 * - For NPCs with CombatantTrait: Requires a registered combat interceptor (ADR-118)
 *   - Without interceptor, blocks with "Violence is not the answer."
 * - For objects: Uses AttackBehavior for destruction mechanics
 *
 * Uses four-phase pattern with interceptor support (ADR-118):
 * 1. validate: preValidate hook → standard checks → postValidate hook
 * 2. execute: interceptor handles combat resolution
 * 3. blocked: onBlocked hook (if validation failed)
 * 4. report: standard events → postReport hook (additional effects)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  AttackBehavior,
  IAttackResult,
  HealthTrait,
  HealthBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { killPlayer } from '../../../death';
import { AttackedEventData } from './attacking-events';
import { AttackingSharedData, AttackResult } from './attacking-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { findWieldedWeapon } from '../../../combat';
import { nounPhraseFor } from '../../../utils';
import {
  ActionLifecycleDescriptor,
  LifecycleState,
  ResolvedConsultation,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228): the attacked target AND the wielded
 * weapon/instrument are consulted (the weapon was the audit's dead
 * second-entity surface). Only an explicitly-commanded weapon resolves —
 * a weapon inferred from inventory during execute is not a command entity
 * and gets no consultation.
 *
 * Special contract (D7.3, declared — not a comment): for combatant
 * targets, the TARGET consultation's postExecute REPLACES the action's
 * standard combat resolution. The action seeds the consultation's
 * sharedData with weapon/verb context and reads attackResult back.
 */
export const attackingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.ATTACKING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.ATTACKING],
      resolve: (ctx) => ctx.command.directObject?.entity
    },
    {
      id: 'weapon',
      // ADR-080: Prefer instrument field (from .instrument() patterns), fall back to indirectObject
      actionIds: [IFActions.ATTACKING],
      resolve: (ctx) => ctx.command.instrument?.entity ?? ctx.command.indirectObject?.entity,
      seedData: (ctx, entity) => ({
        weaponId: entity.id,
        weaponName: entity.name,
        targetId: ctx.command.directObject?.entity?.id,
        targetName: ctx.command.directObject?.entity?.name
      })
    }
  ],
  contracts: { postExecuteReplacesCore: true }
};

function getAttackingSharedData(context: ActionContext): AttackingSharedData {
  return context.sharedData as AttackingSharedData;
}

/** The target slot's consultation, which owns the combat special contract. */
function targetConsultation(state: LifecycleState | undefined): ResolvedConsultation | undefined {
  return state?.consultations.find(c => c.slotId === 'target');
}

export const attackingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ATTACKING,
  group: "interaction",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'self',
    'not_holding_weapon',
    'attacked',
    'attacked_with',
    'hit',
    'hit_with',
    'struck',
    'struck_with',
    'punched',
    'kicked',
    'unarmed_attack',
    'broke',
    'smashed',
    'destroyed',
    'shattered',
    'already_damaged',
    'partial_break',
    'defends',
    'dodges',
    'retaliates',
    'flees',
    'peaceful_solution',
    'no_fighting',
    'unnecessary_violence'
  ],

  /**
   * Validate whether the attack action can be executed
   * Checks preconditions only - no state changes
   */
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    // ADR-080: Prefer instrument field (from .instrument() patterns), fall back to indirectObject
    const weapon = context.command.instrument?.entity ?? context.command.indirectObject?.entity;

    // Must have a target
    if (!target) {
      return { valid: false, error: 'no_target' };
    }

    const state = resolveLifecycle(context, attackingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check if target is visible
    if (!context.canSee(target)) {
      return { valid: false, error: 'not_visible', params: { target: nounPhraseFor(target) } };
    }

    // Check if target is reachable
    if (!context.canReach(target)) {
      return { valid: false, error: 'not_reachable', params: { target: nounPhraseFor(target) } };
    }

    // Prevent attacking self
    if (target.id === actor.id) {
      return { valid: false, error: 'self' };
    }

    // Check if using a weapon — implicit take if on floor nearby
    if (weapon) {
      const carryCheck = context.requireCarriedOrImplicitTake(weapon);
      if (!carryCheck.ok) {
        return carryCheck.error!;
      }
    }

    // For combatants, check if target is already dead and if combat system is registered
    if (target.has(TraitType.COMBATANT)) {
      const health = target.get(TraitType.HEALTH) as HealthTrait | undefined;
      if (health && !HealthBehavior.isAlive(health)) {
        return { valid: false, error: 'already_dead', params: { target: nounPhraseFor(target) } };
      }
      // No combat interceptor registered on the target — block with standard IF response
      if (!targetConsultation(state)) {
        return { valid: false, error: 'violence_not_the_answer', params: { target: nounPhraseFor(target) } };
      }
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  /**
   * Execute the attack action
   * Assumes validation has already passed - no validation logic here
   * - For combatants: Interceptor handles combat (validate blocks if no interceptor)
   * - For objects: Uses AttackBehavior for destruction mechanics
   */
  execute(context: ActionContext): void {
    // Assume validation has passed - no checks needed
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    // ADR-080: Prefer instrument field (from .instrument() patterns), fall back to indirectObject
    let weapon = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    let weaponInferred = false;
    const sharedData = getAttackingSharedData(context);

    // If no weapon specified, try to infer one from inventory
    const verb = context.command.parsed.action || context.command.parsed.structure.verb?.text || 'attack';
    if (!weapon) {
      // For certain verbs, or when attacking combatants, try to find a weapon
      const shouldInferWeapon =
        verb === 'stab' || verb === 'slash' || verb === 'cut' ||
        target.has(TraitType.COMBATANT);

      if (shouldInferWeapon) {
        weapon = findWieldedWeapon(context.player, context.world);
        if (!weapon) {
          // Fall back to AttackBehavior's inference
          const inventory = context.world.getContents(context.player.id);
          weapon = AttackBehavior.inferWeapon(inventory);
        }
        weaponInferred = !!weapon;
      }
    }

    const state = getLifecycleState(context);
    const targetC = targetConsultation(state);

    // Seed combat context onto the target consultation's sharedData so the
    // combat interceptor knows what's swinging (weapon may be inferred here
    // in execute, after the descriptor's resolve-time seeding).
    if (targetC) {
      Object.assign(targetC.data, {
        weaponId: weapon?.id,
        weaponName: weapon?.name,
        weaponInferred,
        verb,
        targetId: target.id,
        targetName: target.name
      });
    }

    // Check if target is a combatant (NPC combat)
    if (target.has(TraitType.COMBATANT)) {
      if (targetC?.interceptor.postExecute) {
        // === SPECIAL CONTRACT: postExecuteReplacesCore (ADR-228 D7.3) ===
        // The target consultation's postExecute IS the combat resolution
        // (declared on attackingLifecycle.contracts, not a comment). It
        // must populate its sharedData with:
        //   - attackResult: AttackResult
        //   - combatResult: CombatResult (optional, for compatibility)
        //   - usedCombatService: false
        //   - customMessage: string (optional)
        // The engine runs ALL consultations' hooks (weapon-slot hooks fire
        // too — the audit's dead second-entity surface).
        if (state) runPostExecute(context, state);

        // Copy interceptor's result data to sharedData
        const attackResult = targetC.data.attackResult as AttackResult;
        Object.assign(context.sharedData, {
          attackResult: attackResult || {
            success: true,
            type: 'missed',
            damage: 0,
            remainingHitPoints: 0,
            targetDestroyed: false,
          },
          weaponUsed: weapon?.id,
          weaponInferred,
          customMessage: targetC.data.customMessage as string | undefined,
          combatResult: targetC.data.combatResult as unknown,
          usedCombatService: (targetC.data.usedCombatService as boolean | undefined) ?? false,
        } satisfies Partial<AttackingSharedData>);
      } else {
        // Should not reach here — validate blocks if no interceptor.
        // Defensive fallback: treat as missed.
        Object.assign(context.sharedData, {
          attackResult: {
            success: false,
            type: 'missed',
            damage: 0,
            remainingHitPoints: 0,
            targetDestroyed: false,
          } as AttackResult,
          weaponUsed: weapon?.id,
          weaponInferred,
          usedCombatService: false,
        } satisfies AttackingSharedData);
        if (state) runPostExecute(context, state);
      }
    } else {
      // Use AttackBehavior for object destruction
      const result: IAttackResult = AttackBehavior.attack(target, weapon, context.world);

      // Convert to our AttackResult type for consistency
      const attackResult: AttackResult = {
        success: result.success,
        type: result.type,
        damage: result.damage,
        remainingHitPoints: result.remainingHitPoints,
        targetDestroyed: result.targetDestroyed,
        targetKilled: result.targetKilled,
        itemsDropped: result.itemsDropped,
        debrisCreated: result.debrisCreated,
        exitRevealed: result.exitRevealed,
        transformedTo: result.transformedTo
      };

      // Store result for report phase
      Object.assign(context.sharedData, {
        attackResult,
        weaponUsed: weapon?.id,
        weaponInferred,
        customMessage: result.message,
        usedCombatService: false
      } satisfies AttackingSharedData);

      // ADR-228 D7.3: hooks run unconditionally — the non-combatant branch
      // previously skipped postExecute entirely.
      if (state) runPostExecute(context, state);
    }
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.attacked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { target: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.attacked', result.error);
    }

    return events;
  },

  /**
   * Report events after attacking
   * Generates atomic events - one discrete fact per event
   */
  report(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject!.entity!;
    const weaponId = context.sharedData.weaponUsed as string | undefined;
    const weapon = weaponId ? context.world.getEntity(weaponId) : undefined;
    const verb = context.command.parsed.action || 'attack';
    const result = context.sharedData.attackResult as AttackResult;
    const customMessage = context.sharedData.customMessage as string | undefined;
    const usedCombatService = context.sharedData.usedCombatService as boolean | undefined;
    const combatResult = context.sharedData.combatResult as { messageId: string; damage?: number; messageData?: Record<string, unknown> } | undefined;
    const state = getLifecycleState(context);

    const events: ISemanticEvent[] = [];

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Check if attack failed (for non-combat attacks)
    if (!result.success && !usedCombatService) {
      const failMessageId = customMessage || 'attack_ineffective';
      const fullFailMessageId = failMessageId.includes('.')
        ? failMessageId
        : `${context.action.id}.${failMessageId}`;
      events.push(
        context.event('if.event.attacked', {
          messageId: fullFailMessageId,
          // params carry EntityInfo for the formatter chain (ADR-158)
          params: { target: nounPhraseFor(target) },
          target: target.id,
          targetName: target.name,
          failed: true
        })
      );
      // ADR-228 D7.3: postReport is unconditional — failed non-combat
      // attacks previously returned before the hooks (and dropped the
      // implicit-take events above).
      if (state) runPostReport(context, state, events, 'if.event.attacked');
      return events;
    }

    // Build event data
    const eventData: AttackedEventData = {
      target: target.id,
      targetName: target.name,
      weapon: weapon?.id,
      weaponName: weapon?.name,
      unarmed: !weapon
    };

    // params carry EntityInfo for the formatter chain (ADR-158)
    const params: Record<string, any> = {
      target: nounPhraseFor(target),
      weapon: weapon ? nounPhraseFor(weapon) : undefined
    };

    // Create ATTACKED event for world model
    events.push(context.event('if.event.attacked', eventData));

    // Determine message based on result type
    let messageId: string;

    // Use CombatService message IDs for combatant attacks.
    // ADR-158: provide both `target` (EntityInfo for templates) and
    // `targetName` (string for handler / event-sourcing compat). The
    // combatResult.messageData also carries both shapes.
    if (usedCombatService && combatResult) {
      messageId = combatResult.messageId;
      params.damage = combatResult.damage;
      params.attackerName = context.player.name;
      params.targetName = target.name; // string for combat service compat
      params.target = nounPhraseFor(target);

      // Add any extra data from combat result
      if (combatResult.messageData) {
        Object.assign(params, combatResult.messageData);
      }
    } else {
      // Standard attack behavior messages (or interceptor-provided customMessage)
      switch (result.type) {
        case 'broke':
          messageId = 'target_broke';
          if (result.debrisCreated?.length) {
            params.debris = result.debrisCreated.length;
          }
          break;
        case 'damaged':
          messageId = 'target_damaged';
          params.damage = result.damage;
          params.remaining = result.remainingHitPoints;
          break;
        case 'destroyed':
          messageId = 'target_destroyed';
          if (result.transformedTo) {
            const transformed = context.world.getEntity(result.transformedTo);
            params.transformedTo = transformed?.name;
          }
          if (result.exitRevealed) {
            params.exitRevealed = result.exitRevealed;
          }
          break;
        case 'killed':
          messageId = 'killed_target';
          if (result.itemsDropped?.length) {
            params.itemsDropped = result.itemsDropped.length;
          }
          break;
        case 'knocked_out':
          messageId = 'combat.attack.knocked_out';
          params.damage = result.damage;
          break;
        case 'missed':
          messageId = 'combat.attack.missed';
          break;
        case 'hit':
          messageId = weapon ? 'hit_with' : 'hit_target';
          params.damage = result.damage;
          break;
        default:
          messageId = 'attacked';
      }
    }

    // Update the main attacked event with messageId for text rendering
    // The first event in the array is the attacked event - update it
    // customMessage from story interceptors may be fully-qualified (e.g., dungeo.melee.hero_attack)
    // and should not be prefixed. Standard messageId from the switch block above is always
    // action-scoped and must be prefixed.
    const resolvedMessageId = customMessage || messageId;
    const fullMessageId = customMessage && customMessage.includes('.')
      ? customMessage
      : `${context.action.id}.${resolvedMessageId}`;
    events[0] = context.event('if.event.attacked', {
      messageId: fullMessageId,
      params,
      ...eventData
    });

    // Additional events based on result
    if (result.itemsDropped?.length) {
      for (const itemId of result.itemsDropped) {
        const item = context.world.getEntity(itemId);
        if (item) {
          events.push(context.event('if.event.dropped', {
            item: itemId,
            itemName: item.name,
            dropper: target.id,
            dropperName: target.name
          }));
        }
      }
    }

    if (result.exitRevealed) {
      events.push(context.event('if.event.exit_revealed', {
        direction: result.exitRevealed,
        room: context.world.getLocation(context.player.id)
      }));
    }

    // Post-report hooks run before death/knockout events so attack blow
    // text renders before consequence messages (e.g., troll disappearance
    // smoke). postReport may override the if.event.attacked messageId or
    // emit additional narration events (ISSUE-074 / ADR-228).
    if (state) runPostReport(context, state, events, 'if.event.attacked');

    // For killed targets, emit a death event.
    if (result.targetKilled) {
      if (target.id === context.player.id) {
        // ADR-224: player death routes through the canonical primitive, not the
        // generic if.event.death — combat becomes one `cause` among many. (Forward-
        // looking: the attack grammar blocks self-attack, so this branch is not a
        // live path today; Dungeo's real combat-death path is its own melee engine,
        // migrated in Phase 4.)
        const deathEvent = killPlayer(context.world, context.player, {
          cause: 'combat',
          messageId: 'combat.player_died',
          terminal: true,
        });
        if (deathEvent) events.push(deathEvent);
      } else {
        events.push(context.event('if.event.death', {
          target: target.id,
          targetName: target.name,
          killedBy: context.player.id
        }));
      }
    }

    // For knocked out targets, emit a knockout event
    if (result.targetKnockedOut) {
      events.push(context.event('if.event.knocked_out', {
        target: target.id,
        targetName: target.name,
        knockedOutBy: context.player.id
      }));
    }

    return events;
  }
};
