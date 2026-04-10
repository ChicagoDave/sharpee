/**
 * Language content for hiding and revealing actions (ADR-148)
 *
 * Public interface: hidingLanguage, revealingLanguage.
 * Owner context: @sharpee/lang-en-us / actions
 */

export const hidingLanguage = {
  actionId: 'if.action.hiding',

  patterns: [
    'hide behind [thing]',
    'hide under [thing]',
    'hide on [thing]',
    'hide in [thing]',
    'duck behind [thing]',
    'crouch behind [thing]',
  ],

  messages: {
    // Success messages per position
    'behind': "{You} {slip} behind {the target}.",
    'under': "{You} {crawl} under {the target}.",
    'on': "{You} {crouch} on {the target}, out of sight.",
    'inside': "{You} {climb} into {the target}, concealing {yourself}.",

    // Failure messages
    'nothing_to_hide': "{You} {can't} hide there.",
    'cant_hide_there': "{You} {can't} hide {position} {the target}.",
    'already_hidden': "{You're} already hidden.",
  },

  help: {
    description: 'Hide behind, under, on, or inside something to avoid being seen.',
    examples: 'hide behind curtain, duck under desk, hide inside armoire',
    summary: 'HIDE BEHIND/UNDER/ON/IN - Conceal yourself to observe without being detected. Example: HIDE BEHIND CURTAIN',
  },
};

export const revealingLanguage = {
  actionId: 'if.action.revealing',

  patterns: [
    'stand up',
    'come out',
    'reveal myself',
    'unhide',
    'stop hiding',
  ],

  messages: {
    'revealed': "{You} {come} out of hiding.",
    'not_hidden': "{You're} not hiding.",
  },

  help: {
    description: 'Stop hiding and reveal yourself.',
    examples: 'stand up, come out, unhide',
    summary: 'STAND UP/COME OUT/UNHIDE - Stop hiding and reveal yourself. Example: STAND UP',
  },
};
