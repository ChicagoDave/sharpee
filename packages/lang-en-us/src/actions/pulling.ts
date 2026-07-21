/**
 * Language content for pulling action
 */

export const pullingLanguage = {
  actionId: 'if.action.pulling',
  
  patterns: [
    'pull [something]',
    'pull [something] [direction]',
    'tug [something]',
    'tug on [something]',
    'drag [something]',
    'drag [something] [direction]',
    'yank [something]',
  ],
  
  // ADR-230 Phase 9b: rewritten to the action's ACTUAL requiredMessages —
  // pulled/worn/already_pulled had no English anywhere, while a rich
  // legacy vocabulary (lever_*/cord_*/comes_loose/pulled_direction/…) was
  // never emitted by any code path (and no story used it). Deleted.
  messages: {
    // Error messages
    'no_target': "Pull what?",
    'not_visible': "{You} {can't} see {the target}.",
    'not_reachable': "{You} {can't} reach {the target}.",
    'cant_pull_that': "{capitalize the target} {verb:is target} not something {you} can pull.",
    'worn': "{You} {can't} pull {the target} while wearing it.",
    'already_pulled': "{capitalize the target} has already been pulled.",

    // Success messages
    'pulled': "{You} {pull} {the target}.",
    'nothing_happens': "{You} {pull} {the target}, but nothing happens."
  },
  
  help: {
    description: 'Pull objects, levers, cords, or drag heavy items.',
    examples: 'pull lever, pull cord, drag chest south, tug rope, yank chain',
    summary: 'PULL/DRAG - Pull objects, levers, cords, or drag heavy items. Example: PULL LEVER'
  }
};
