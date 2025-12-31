/**
 * Combat Message IDs (ADR-072)
 *
 * Semantic message IDs for combat-related events.
 * Actual text is provided by the language layer.
 */

/**
 * Message IDs for combat events
 */
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
  DEFEND_DODGED: 'combat.defend.dodged',

  // Health status descriptions
  HEALTH_HEALTHY: 'combat.health.healthy',
  HEALTH_WOUNDED: 'combat.health.wounded',
  HEALTH_BADLY_WOUNDED: 'combat.health.badly_wounded',
  HEALTH_NEAR_DEATH: 'combat.health.near_death',
  HEALTH_UNCONSCIOUS: 'combat.health.unconscious',
  HEALTH_DEAD: 'combat.health.dead',

  // Special weapon messages
  SWORD_GLOWS: 'combat.special.sword_glows',
  SWORD_STOPS_GLOWING: 'combat.special.sword_stops_glowing',
  BLESSED_WEAPON_EFFECT: 'combat.special.blessed_weapon',

  // Error/validation messages
  CANNOT_ATTACK: 'combat.cannot_attack',
  ALREADY_DEAD: 'combat.already_dead',
  NOT_HOSTILE: 'combat.not_hostile',
  NO_TARGET: 'combat.no_target',
  TARGET_UNCONSCIOUS: 'combat.target_unconscious',
  NEED_WEAPON: 'combat.need_weapon',

  // Combat state messages
  COMBAT_STARTED: 'combat.started',
  COMBAT_ENDED: 'combat.ended',
  PLAYER_DIED: 'combat.player_died',
  PLAYER_RESURRECTED: 'combat.player_resurrected',
} as const;

/**
 * Type for combat message IDs
 */
export type CombatMessageId = (typeof CombatMessages)[keyof typeof CombatMessages];

/**
 * Health status levels
 */
export type HealthStatus =
  | 'healthy'
  | 'wounded'
  | 'badly_wounded'
  | 'near_death'
  | 'unconscious'
  | 'dead';

/**
 * Get message ID for a health status
 */
export function getHealthStatusMessageId(status: HealthStatus): CombatMessageId {
  switch (status) {
    case 'healthy':
      return CombatMessages.HEALTH_HEALTHY;
    case 'wounded':
      return CombatMessages.HEALTH_WOUNDED;
    case 'badly_wounded':
      return CombatMessages.HEALTH_BADLY_WOUNDED;
    case 'near_death':
      return CombatMessages.HEALTH_NEAR_DEATH;
    case 'unconscious':
      return CombatMessages.HEALTH_UNCONSCIOUS;
    case 'dead':
      return CombatMessages.HEALTH_DEAD;
  }
}
