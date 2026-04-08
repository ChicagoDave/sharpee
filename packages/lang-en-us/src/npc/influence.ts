/**
 * Language content for influence system (ADR-146)
 *
 * Platform default witnessed/resisted messages for influence events.
 * Authors override per-influence via InfluenceDef.witnessed / .resisted.
 *
 * Owner context: @sharpee/lang-en-us / npc
 */

export const influenceLanguage = {
  messages: {
    // -----------------------------------------------------------------------
    // Witnessed / resisted defaults
    // -----------------------------------------------------------------------

    'character.influence.witnessed.default':
      '{influencerName} exerts a subtle influence on {targetName}.',
    'character.influence.resisted.default':
      '{targetName} seems unaffected by {influencerName}.',

    // -----------------------------------------------------------------------
    // PC influence
    // -----------------------------------------------------------------------

    'character.influence.pc.focus_clouded':
      'You were about to do something, but you\'ve lost your train of thought.',
    'character.influence.pc.action_intercepted':
      'You find it hard to concentrate.',

    // -----------------------------------------------------------------------
    // Duration events
    // -----------------------------------------------------------------------

    'character.influence.effect.expired':
      'The influence over {targetName} fades.',
    'character.influence.effect.departed':
      'With {influencerName} gone, {targetName} regains composure.',
  },
};
