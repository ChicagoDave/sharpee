/**
 * Melt Action
 *
 * MDL GLACIER function MELT handler (act1.mud:389-398):
 * - "melt ice with torch" (flaming instrument) -> partial melt, player drowns
 * - "melt ice with X" (non-flaming) -> "You certainly won't melt it with a X."
 * - "melt X" (non-glacier target) -> "You can't melt that."
 *
 * If the instrument is the torch, it is turned off (TORCH-OFF).
 * GLACIER-MELT-FLAG is set (for custom room description on revisit).
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, LightSourceTrait, IFEntity } from '@sharpee/world-model';
import { GlacierTrait } from '../../traits/glacier-trait';
import { MELT_ACTION_ID, MeltMessages } from './types';

/**
 * Find the glacier entity in the player's current room.
 * Used by literal grammar patterns ("melt glacier", "melt ice").
 */
function findGlacierInRoom(context: ActionContext): IFEntity | undefined {
  const playerLocation = context.world.getLocation(context.player.id) || '';
  const contents = context.world.getContents(playerLocation);
  return contents.find(e => !!e.get(GlacierTrait));
}

/**
 * Check if an entity is flaming (open flame + lit).
 * MDL FLAMING? = ONBIT set AND not electric.
 * In our system: isFlame attribute + LightSourceTrait.isLit.
 */
function isFlaming(entity: IFEntity): boolean {
  if (!entity.attributes.isFlame) return false;
  const ls = entity.get(LightSourceTrait);
  return ls?.isLit ?? false;
}

export const meltAction: Action = {
  id: MELT_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    // Try direct object first (from "melt :target" pattern),
    // then search room (for literal "melt glacier/ice" patterns)
    const target = context.command.directObject?.entity || findGlacierInRoom(context);

    // Instrument from ".instrument()" grammar modifier or indirect object
    const instrument = context.command.instrument?.entity ?? context.command.indirectObject?.entity;

    // Must have a target that is the glacier
    if (!target || !target.get(GlacierTrait)) {
      return { valid: false, error: MeltMessages.NOTHING };
    }

    // Already melted
    const glacierTrait = target.get(GlacierTrait);
    if (glacierTrait?.melted) {
      return { valid: false, error: MeltMessages.NOTHING };
    }

    // Literal patterns ("melt glacier", "melt ice") always find the glacier.
    // The ":target" pattern might resolve a non-glacier entity.
    // For "melt glacier" without "with", require instrument.
    if (!instrument) {
      return { valid: false, error: MeltMessages.NO_INSTRUMENT };
    }

    // Store for execute/report
    context.sharedData.target = target;
    context.sharedData.instrument = instrument;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const instrument = context.sharedData.instrument as IFEntity;
    if (!instrument) return;

    if (!isFlaming(instrument)) {
      // Non-flaming instrument - just a message, no state change
      const identity = instrument.get(IdentityTrait);
      context.sharedData.instrumentName = identity?.name || 'that';
      context.sharedData.noFlame = true;
      return;
    }

    // Flaming instrument -> partial melt + death
    context.sharedData.death = true;

    // Set partial melt flag (MDL: GLACIER-MELT-FLAG)
    context.world.setStateValue('dungeo.glacier.partial_melt', true);

    // If instrument is torch, turn it off (MDL: TORCH-OFF)
    const torchIdentity = instrument.get(IdentityTrait);
    if (torchIdentity?.name?.toLowerCase().includes('torch')) {
      const ls = instrument.get(LightSourceTrait);
      if (ls) {
        ls.isLit = false;
      }
    }

    // Kill the player
    context.world.setStateValue('dungeo.player.dead', true);
    context.world.setStateValue('dungeo.player.death_cause', 'glacier_melt');
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: MELT_ACTION_ID,
      messageId: result.error || MeltMessages.NOTHING,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    if (context.sharedData.noFlame) {
      return [context.event('game.message', {
        messageId: MeltMessages.NO_FLAME,
        instrument: context.sharedData.instrumentName
      })];
    }

    if (context.sharedData.death) {
      return [context.event('if.event.player.died', {
        messageId: MeltMessages.DEATH,
        cause: 'glacier_melt'
      })];
    }

    return [];
  }
};
