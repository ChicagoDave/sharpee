/**
 * GDT Restore Robber Command (RR)
 *
 * Re-enables the Thief NPC after being disabled with NR.
 * The thief resumes wandering, stealing, and combat behavior.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { NpcTrait } from '@sharpee/world-model';
import { setThiefDisabled, getThiefProps } from '../../../npcs/thief';

export const rrHandler: GDTCommandHandler = {
  code: 'RR',
  name: 'Restore Robber',
  description: 'Re-enable the thief NPC',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    // Check if already enabled
    if (!context.flags.thiefDisabled) {
      return {
        success: true,
        output: ['Thief already enabled.']
      };
    }

    // Find the thief entity
    const thief = context.world.getAllEntities().find(e => {
      const npcTrait = e.get(NpcTrait);
      return npcTrait?.behaviorId === 'thief';
    });

    if (!thief) {
      return {
        success: false,
        output: ['Thief not found in world.'],
        error: 'NOT_FOUND'
      };
    }

    // Set thief state to wandering
    const props = getThiefProps(thief);
    if (props) {
      props.state = 'WANDERING';
    }

    // Clear GDT flag
    context.setFlag('thiefDisabled', false);

    // Clear world-global flag
    setThiefDisabled(context.world, false);

    return {
      success: true,
      output: [
        'Thief RESTORED to active duty.',
        'The thief will resume wandering and stealing.'
      ]
    };
  }
};
