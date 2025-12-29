/**
 * GDT No Robber Command (NR)
 *
 * Disables the Thief NPC - stops wandering, stealing, and attacks.
 * The thief remains in place but takes no actions.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { NpcTrait } from '@sharpee/world-model';
import { setThiefDisabled, getThiefProps, setThiefState } from '../../../npcs/thief';

export const nrHandler: GDTCommandHandler = {
  code: 'NR',
  name: 'No Robber',
  description: 'Disable the thief NPC',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    // Check if already disabled
    if (context.flags.thiefDisabled) {
      return {
        success: true,
        output: ['Thief already disabled.']
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

    // Set thief state to disabled
    const props = getThiefProps(thief);
    if (props) {
      props.state = 'DISABLED';
    }

    // Set GDT flag
    context.setFlag('thiefDisabled', true);

    // Set world-global flag (for behavior check)
    setThiefDisabled(context.world, true);

    return {
      success: true,
      output: [
        'Thief DISABLED.',
        'The thief will not wander, steal, or attack.',
        'Use RR to restore thief behavior.'
      ]
    };
  }
};
