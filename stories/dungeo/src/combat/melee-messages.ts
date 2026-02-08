/**
 * Canonical MDL Melee Combat Messages (dung.355:904-1081)
 *
 * Message tables for all combat participants. Each table is indexed by
 * MeleeOutcome (0-8), and each outcome has an array of variant strings.
 * One variant is picked at random per blow via SeededRandom.pick().
 *
 * Placeholders:
 *   {weapon} = name of the weapon being used/lost
 *   {villain} = name of the villain (troll, thief, cyclops)
 *
 * Source: docs/internal/dungeon-81/original_source/dung.355 lines 904-1081
 */

import type { MeleeOutcomeType } from './melee-tables';
import { MeleeOutcome } from './melee-tables';

// ============= Message ID Constants =============

export const MeleeMessages = {
  // Hero attack outcomes (keyed by weapon + outcome)
  HERO_ATTACK: 'dungeo.melee.hero_attack',
  // Villain attack outcomes (keyed by villain + outcome)
  VILLAIN_ATTACK: 'dungeo.melee.villain_attack',
  // Combat state messages
  STILL_RECOVERING: 'dungeo.melee.still_recovering',
  UNARMED_ATTACK: 'dungeo.melee.unarmed_attack',
  BACKUP_WEAPON: 'dungeo.melee.backup_weapon',
  VILLAIN_DISARMED: 'dungeo.melee.villain_disarmed',
} as const;

// ============= Type =============

/** A melee message table: outcome index → array of variant strings */
export type MeleeMessageTable = Record<MeleeOutcomeType, string[]>;

// ============= Hero Attack Tables (dung.355:904-950) =============
// Hero tables only have outcomes 0-6 (no HESITATE or SITTING_DUCK —
// the hero doesn't attack unconscious targets via the normal flow).

/**
 * SWORD-MELEE (dung.355:904-926)
 * Messages when the hero attacks with a sword.
 * D = villain name placeholder.
 */
export const SwordMelee: MeleeMessageTable = {
  // 0: MISSED
  [MeleeOutcome.MISSED]: [
    'Your swing misses the {villain} by an inch.',
    'A mighty blow, but it misses the {villain} by a mile.',
    'You charge, but the {villain} jumps nimbly aside.',
    'Clang! Crash! The {villain} parries.',
    'A good stroke, but it\'s too slow; the {villain} dodges.',
  ],
  // 1: UNCONSCIOUS
  [MeleeOutcome.UNCONSCIOUS]: [
    'Your sword crashes down, knocking the {villain} into dreamland.',
    'The {villain} is battered into unconsciousness.',
    'A furious exchange, and the {villain} is knocked out!',
  ],
  // 2: KILLED
  [MeleeOutcome.KILLED]: [
    'It\'s curtains for the {villain} as your sword removes his head.',
    'The fatal blow strikes the {villain} square in the heart: He dies.',
    'The {villain} takes a final blow and slumps to the floor dead.',
  ],
  // 3: LIGHT_WOUND
  [MeleeOutcome.LIGHT_WOUND]: [
    'The {villain} is struck on the arm; blood begins to trickle down.',
    'Your sword pinks the {villain} on the wrist, but it\'s not serious.',
    'Your stroke lands, but it was only the flat of the blade.',
    'The blow lands, making a shallow gash in the {villain}\'s arm!',
  ],
  // 4: SERIOUS_WOUND
  [MeleeOutcome.SERIOUS_WOUND]: [
    'The {villain} receives a deep gash in his side.',
    'A savage blow on the thigh! The {villain} is stunned but can still fight!',
    'Slash! Your blow lands! That one hit an artery; it could be serious!',
  ],
  // 5: STAGGER
  [MeleeOutcome.STAGGER]: [
    'The {villain} is staggered, and drops to his knees.',
    'The {villain} is momentarily disoriented and can\'t fight back.',
    'The force of your blow knocks the {villain} back, stunned.',
  ],
  // 6: LOSE_WEAPON
  [MeleeOutcome.LOSE_WEAPON]: [
    'The {villain}\'s weapon is knocked to the floor, leaving him unarmed.',
  ],
  // 7-8: Not used for hero attacks, but included for type completeness
  [MeleeOutcome.HESITATE]: [],
  [MeleeOutcome.SITTING_DUCK]: [],
};

/**
 * KNIFE-MELEE (dung.355:928-950)
 * Messages when the hero attacks with a knife.
 */
export const KnifeMelee: MeleeMessageTable = {
  // 0: MISSED
  [MeleeOutcome.MISSED]: [
    'Your stab misses the {villain} by an inch.',
    'A good slash, but it misses the {villain} by a mile.',
    'You charge, but the {villain} jumps nimbly aside.',
    'A quick stroke, but the {villain} is on guard.',
    'A good stroke, but it\'s too slow; the {villain} dodges.',
  ],
  // 1: UNCONSCIOUS
  [MeleeOutcome.UNCONSCIOUS]: [
    'The haft of your knife knocks out the {villain}.',
    'The {villain} drops to the floor, unconscious.',
    'The {villain} is knocked out!',
  ],
  // 2: KILLED
  [MeleeOutcome.KILLED]: [
    'The end for the {villain} as your knife severs his jugular.',
    'The fatal thrust strikes the {villain} square in the heart: He dies.',
    'The {villain} takes a final blow and slumps to the floor dead.',
  ],
  // 3: LIGHT_WOUND
  [MeleeOutcome.LIGHT_WOUND]: [
    'The {villain} is slashed on the arm; blood begins to trickle down.',
    'Your knife point pinks the {villain} on the wrist, but it\'s not serious.',
    'Your stroke lands, but it was only the flat of the blade.',
    'The blow lands, making a shallow gash in the {villain}\'s arm!',
  ],
  // 4: SERIOUS_WOUND
  [MeleeOutcome.SERIOUS_WOUND]: [
    'The {villain} receives a deep gash in his side.',
    'A savage cut on the leg stuns the {villain}, but he can still fight!',
    'Slash! Your stroke connects! The {villain} could be in serious trouble!',
  ],
  // 5: STAGGER
  [MeleeOutcome.STAGGER]: [
    'The {villain} drops to his knees, staggered.',
    'The {villain} is confused and can\'t fight back.',
    'The quickness of your thrust knocks the {villain} back, stunned.',
  ],
  // 6: LOSE_WEAPON
  [MeleeOutcome.LOSE_WEAPON]: [
    'The {villain} is disarmed by a subtle feint past his guard.',
  ],
  // 7-8: Not used for hero attacks
  [MeleeOutcome.HESITATE]: [],
  [MeleeOutcome.SITTING_DUCK]: [],
};

// ============= Villain Attack Tables (dung.355:952-1081) =============

/**
 * CYCLOPS-MELEE (dung.355:952-991)
 * Messages when the cyclops attacks the hero.
 */
export const CyclopsMelee: MeleeMessageTable = {
  // 0: MISSED
  [MeleeOutcome.MISSED]: [
    'The Cyclops misses, but the backwash almost knocks you over.',
    'The Cyclops rushes you, but runs into the wall.',
    'The Cyclops trips over his feet trying to get at you.',
    'The Cyclops unleashes a roundhouse punch, but you have time to dodge.',
  ],
  // 1: UNCONSCIOUS
  [MeleeOutcome.UNCONSCIOUS]: [
    'The Cyclops knocks you unconscious.',
    'The Cyclops sends you crashing to the floor, unconscious.',
  ],
  // 2: KILLED
  [MeleeOutcome.KILLED]: [
    'The Cyclops raises his arms and crushes your skull.',
    'The Cyclops has just essentially ripped you to shreds.',
    'The Cyclops decks you. In fact, you are dead.',
    'The Cyclops breaks your neck with a massive smash.',
  ],
  // 3: LIGHT_WOUND
  [MeleeOutcome.LIGHT_WOUND]: [
    'A quick punch, but it was only a glancing blow.',
    'The Cyclops grabs but you twist free, leaving part of your cloak.',
    'A glancing blow from the Cyclops\' fist.',
    'The Cyclops chops at you with the side of his hand, and it connects, but not solidly.',
  ],
  // 4: SERIOUS_WOUND
  [MeleeOutcome.SERIOUS_WOUND]: [
    'The Cyclops gets a good grip and breaks your arm.',
    'The monster smashes his huge fist into your chest, breaking several ribs.',
    'The Cyclops almost knocks the wind out of you with a quick punch.',
    'A flying drop kick breaks your jaw.',
    'The Cyclops breaks your leg with a staggering blow.',
  ],
  // 5: STAGGER
  [MeleeOutcome.STAGGER]: [
    'The Cyclops knocks you silly, and you reel back.',
    'The Cyclops lands a punch that knocks the wind out of you.',
    'Heedless of your weapons, the Cyclops tosses you against the rock wall of the room.',
    'The Cyclops grabs you, and almost strangles you before you wiggle free, breathless.',
  ],
  // 6: LOSE_WEAPON
  [MeleeOutcome.LOSE_WEAPON]: [
    'The Cyclops grabs you by the arm, and you drop your {weapon}.',
    'The Cyclops kicks your {weapon} out of your hand.',
    'The Cyclops grabs your {weapon}, tastes it, and throws it to the ground in disgust.',
    'The monster grabs you on the wrist, squeezes, and you drop your {weapon} in pain.',
  ],
  // 7: HESITATE
  [MeleeOutcome.HESITATE]: [
    'The Cyclops is so excited by his success that he neglects to kill you.',
    'The Cyclops, momentarily overcome by remorse, holds back.',
    'The Cyclops seems unable to decide whether to broil or stew his dinner.',
  ],
  // 8: SITTING_DUCK
  [MeleeOutcome.SITTING_DUCK]: [
    'The Cyclops, no sportsman, dispatches his unconscious victim.',
  ],
};

/**
 * TROLL-MELEE (dung.355:993-1029)
 * Messages when the troll attacks the hero.
 */
export const TrollMelee: MeleeMessageTable = {
  // 0: MISSED
  [MeleeOutcome.MISSED]: [
    'The troll swings his axe, but it misses.',
    'The troll\'s axe barely misses your ear.',
    'The axe sweeps past as you jump aside.',
    'The axe crashes against the rock, throwing sparks!',
  ],
  // 1: UNCONSCIOUS
  [MeleeOutcome.UNCONSCIOUS]: [
    'The flat of the troll\'s axe hits you delicately on the head, knocking you out.',
  ],
  // 2: KILLED
  [MeleeOutcome.KILLED]: [
    'The troll lands a killing blow. You are dead.',
    'The troll neatly removes your head.',
    'The troll\'s axe stroke cleaves you from the nave to the chops.',
    'The troll\'s axe removes your head.',
  ],
  // 3: LIGHT_WOUND
  [MeleeOutcome.LIGHT_WOUND]: [
    'The axe gets you right in the side. Ouch!',
    'The flat of the troll\'s axe skins across your forearm.',
    'The troll\'s swing almost knocks you over as you barely parry in time.',
    'The troll swings his axe, and it nicks your arm as you dodge.',
  ],
  // 4: SERIOUS_WOUND
  [MeleeOutcome.SERIOUS_WOUND]: [
    'The troll charges, and his axe slashes you on your {weapon} arm.',
    'An axe stroke makes a deep wound in your leg.',
    'The troll\'s axe swings down, gashing your shoulder.',
    'The troll sees a hole in your defense, and a lightning stroke opens a wound in your left side.',
  ],
  // 5: STAGGER
  [MeleeOutcome.STAGGER]: [
    'The troll hits you with a glancing blow, and you are momentarily stunned.',
    'The troll swings; the blade turns on your armor but crashes broadside into your head.',
    'You stagger back under a hail of axe strokes.',
    'The troll\'s mighty blow drops you to your knees.',
  ],
  // 6: LOSE_WEAPON
  [MeleeOutcome.LOSE_WEAPON]: [
    'The axe hits your {weapon} and knocks it spinning.',
    'The troll swings, you parry, but the force of his blow disarms you.',
    'The axe knocks your {weapon} out of your hand. It falls to the floor.',
    'Your {weapon} is knocked out of your hands, but you parried the blow.',
  ],
  // 7: HESITATE
  [MeleeOutcome.HESITATE]: [
    'The troll strikes at your unconscious form, but misses in his rage.',
    'The troll hesitates, fingering his axe.',
    'The troll scratches his head ruminatively: Might you be magically protected, he wonders?',
    'The troll seems afraid to approach your crumpled form.',
  ],
  // 8: SITTING_DUCK
  [MeleeOutcome.SITTING_DUCK]: [
    'Conquering his fears, the troll puts you to death.',
  ],
};

/**
 * THIEF-MELEE (dung.355:1031-1081)
 * Messages when the thief attacks the hero.
 */
export const ThiefMelee: MeleeMessageTable = {
  // 0: MISSED
  [MeleeOutcome.MISSED]: [
    'The thief stabs nonchalantly with his stiletto and misses.',
    'You dodge as the thief comes in low.',
    'You parry a lightning thrust, and the thief salutes you with a grim nod.',
    'The thief tries to sneak past your guard, but you twist away.',
  ],
  // 1: UNCONSCIOUS
  [MeleeOutcome.UNCONSCIOUS]: [
    'Shifting in the midst of a thrust, the thief knocks you unconscious with the haft of his stiletto.',
    'The thief knocks you out.',
  ],
  // 2: KILLED
  [MeleeOutcome.KILLED]: [
    'Finishing you off, a lightning throw right to the heart.',
    'The stiletto severs your jugular. It looks like the end.',
    'The thief comes in from the side, feints, and inserts the blade into your ribs.',
    'The thief bows formally, raises his stiletto, and with a wry grin, ends the battle and your life.',
  ],
  // 3: LIGHT_WOUND
  [MeleeOutcome.LIGHT_WOUND]: [
    'A quick thrust pinks your left arm, and blood starts to trickle down.',
    'The thief draws blood, raking his stiletto across your arm.',
    'The stiletto flashes faster than you can follow, and blood wells from your leg.',
    'The thief slowly approaches, strikes like a snake, and leaves you wounded.',
  ],
  // 4: SERIOUS_WOUND
  [MeleeOutcome.SERIOUS_WOUND]: [
    'The thief strikes like a snake! The resulting wound is serious.',
    'The thief stabs a deep cut in your upper arm.',
    'The stiletto touches your forehead, and the blood obscures your vision.',
    'The thief strikes at your wrist, and suddenly your grip is slippery with blood.',
  ],
  // 5: STAGGER
  [MeleeOutcome.STAGGER]: [
    'The butt of his stiletto cracks you on the skull, and you stagger back.',
    'You are forced back, and trip over your own feet, falling heavily to the floor.',
    'The thief rams the haft of his blade into your stomach, leaving you out of breath.',
    'The thief attacks, and you fall back desperately.',
  ],
  // 6: LOSE_WEAPON
  [MeleeOutcome.LOSE_WEAPON]: [
    'A long, theatrical slash. You catch it on your {weapon}, but the thief twists his knife, and the {weapon} goes flying.',
    'The thief neatly flips your {weapon} out of your hands, and it drops to the floor.',
    'You parry a low thrust, and your {weapon} slips out of your hand.',
    'Avoiding the thief\'s stiletto, you stumble to the floor, dropping your {weapon}.',
  ],
  // 7: HESITATE
  [MeleeOutcome.HESITATE]: [
    'The thief, a man of good breeding, refrains from attacking a helpless opponent.',
    'The thief amuses himself by searching your pockets.',
    'The thief entertains himself by rifling your pack.',
  ],
  // 8: SITTING_DUCK
  [MeleeOutcome.SITTING_DUCK]: [
    'The thief, noticing you begin to stir, reluctantly finishes you off.',
    'The thief, forgetting his essentially genteel upbringing, cuts your throat.',
    'The thief, who is essentially a pragmatist, dispatches you as a threat to his livelihood.',
  ],
};

// ============= Lookup Maps =============

/** Hero weapon → message table */
export const HeroMeleeTables: Record<string, MeleeMessageTable> = {
  sword: SwordMelee,
  knife: KnifeMelee,
};

/** Villain name → message table */
export const VillainMeleeTables: Record<string, MeleeMessageTable> = {
  troll: TrollMelee,
  thief: ThiefMelee,
  cyclops: CyclopsMelee,
};

// ============= Message Selection =============

/**
 * Get a melee message for a hero attack outcome.
 *
 * @param weaponName Hero's weapon name (e.g., 'sword', 'knife')
 * @param outcome The MeleeOutcome value
 * @param villainName Name of the villain being attacked (for {villain} placeholder)
 * @param pick Function to pick a random element from an array
 * @returns The formatted message string, or undefined if no messages for this outcome
 */
export function getHeroAttackMessage(
  weaponName: string,
  outcome: MeleeOutcomeType,
  villainName: string,
  pick: <T>(arr: T[]) => T
): string | undefined {
  // Normalize weapon name to match table keys
  const key = weaponName.toLowerCase().includes('sword') ? 'sword' : 'knife';
  const table = HeroMeleeTables[key] ?? KnifeMelee;
  const variants = table[outcome];
  if (!variants || variants.length === 0) return undefined;
  const msg = pick(variants);
  return msg.replace(/\{villain\}/g, villainName);
}

/**
 * Get a melee message for a villain attack outcome.
 *
 * @param villainKey Villain identifier (e.g., 'troll', 'thief', 'cyclops')
 * @param outcome The MeleeOutcome value
 * @param weaponName Name of hero's weapon (for {weapon} placeholder in lose-weapon/serious-wound)
 * @param pick Function to pick a random element from an array
 * @returns The formatted message string, or undefined if no messages for this outcome
 */
export function getVillainAttackMessage(
  villainKey: string,
  outcome: MeleeOutcomeType,
  weaponName: string,
  pick: <T>(arr: T[]) => T
): string | undefined {
  const table = VillainMeleeTables[villainKey] ?? TrollMelee;
  const variants = table[outcome];
  if (!variants || variants.length === 0) return undefined;
  const msg = pick(variants);
  return msg.replace(/\{weapon\}/g, weaponName);
}
