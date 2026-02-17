/**
 * Send Action - Mail order puzzle
 *
 * When the player types "send for brochure" (as hinted by the matchbook),
 * a brochure appears in the mailbox at West of House containing the
 * Don Woods stamp (1 point treasure).
 *
 * Pattern: "send for brochure", "send for free brochure", "order brochure"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import {
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  ReadableTrait,
  EntityType
} from '@sharpee/world-model';
import { TreasureTrait } from '../../traits';
import { SEND_ACTION_ID, SendMessages } from './types';

/**
 * Create the brochure with the Don Woods stamp inside
 */
function createBrochureWithStamp(context: ActionContext): void {
  const { world } = context;

  // Find the mailbox at West of House
  const mailbox = world.getAllEntities().find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name?.toLowerCase().includes('mailbox');
  });

  if (!mailbox) return;

  // Create the brochure
  const brochure = world.createEntity('brochure', EntityType.CONTAINER);
  brochure.add(new IdentityTrait({
    name: 'large brochure',
    aliases: ['brochure', 'MIT brochure', 'pamphlet', 'free brochure'],
    description: 'A large brochure from the MIT Tech Correspondence School. It contains pictures of wealthy graduates and a small stamp.',
    properName: false,
    article: 'a'
  }));

  brochure.add(new ContainerTrait({
    capacity: { maxItems: 1 }
  }));

  brochure.add(new OpenableTrait({ isOpen: true }));

  brochure.add(new ReadableTrait({
    text: `*** MIT TECH CORRESPONDENCE SCHOOL ***

Congratulations on your interest in our fine institution!

Our graduates have gone on to careers in:
  - Paper shuffling
  - Bit twiddling
  - Yak shaving
  - GRUEsome occupations

Enclosed please find a valuable collector's stamp as a FREE gift!

      ** ENROLL TODAY! **`
  }));

  // Create the Don Woods stamp (1 point treasure)
  const stamp = world.createEntity('stamp', EntityType.ITEM);
  stamp.add(new IdentityTrait({
    name: 'Don Woods stamp',
    aliases: ['stamp', 'woods stamp', 'postage stamp', "spelunker's stamp"],
    description: `A small postage stamp depicting a spelunker with a lamp. The caption reads:

   SPELUNKER TODAY
   ---------------
   |    ___      |
   |   (o o)     |
   |   /| |\\     |
   |   / \\       |
   ---------------
   Don Woods, Editor

   1 Zorkmid`,
    properName: false,
    article: 'a',
    // OFVAL is 0 in FORTRAN source — no take points
  }));

  stamp.add(new TreasureTrait({
    trophyCaseValue: 1     // OTVAL from FORTRAN source
  }));

  // Place stamp inside brochure
  world.moveEntity(stamp.id, brochure.id);

  // Place brochure inside mailbox (temporarily open it)
  const openable = mailbox.get(OpenableTrait);
  const wasOpen = openable?.isOpen ?? false;
  if (openable) {
    openable.isOpen = true;
  }
  world.moveEntity(brochure.id, mailbox.id);
  if (openable && !wasOpen) {
    openable.isOpen = false;
  }
}

export const sendAction: Action = {
  id: SEND_ACTION_ID,
  group: 'communication',

  validate(context: ActionContext): ValidationResult {
    const { world } = context;

    // Check if brochure was already ordered
    const alreadyOrdered = (world.getStateValue('dungeo.brochure.ordered') as boolean) || false;
    if (alreadyOrdered) {
      return {
        valid: false,
        error: SendMessages.ALREADY_SENT
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world } = context;

    // Mark as ordered
    world.setStateValue('dungeo.brochure.ordered', true);

    // Create the brochure with stamp
    createBrochureWithStamp(context);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: SEND_ACTION_ID,
      messageId: result.error || SendMessages.NO_TARGET,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    // Report the knock at the door and successful mail
    return [
      context.event('game.message', {
        messageId: SendMessages.SEND_FOR_BROCHURE
      }),
      context.event('game.message', {
        messageId: SendMessages.BROCHURE_KNOCK
      })
    ];
  }
};
