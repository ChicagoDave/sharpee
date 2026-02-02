/**
 * Centralized trait type definitions
 * 
 * All trait types used in the world model system
 */

/**
 * Trait types as a const object for extensibility
 */
export const TraitType = {
  // Standard traits
  IDENTITY: 'identity',
  CONTAINER: 'container',
  SUPPORTER: 'supporter',
  ROOM: 'room',
  WEARABLE: 'wearable',
  CLOTHING: 'clothing',
  EDIBLE: 'edible',
  SCENERY: 'scenery',

  // Interactive traits
  OPENABLE: 'openable',
  LOCKABLE: 'lockable',
  SWITCHABLE: 'switchable',
  READABLE: 'readable',
  LIGHT_SOURCE: 'lightSource',

  // Manipulation traits
  PULLABLE: 'pullable',
  ATTACHED: 'attached',
  PUSHABLE: 'pushable',
  BUTTON: 'button',
  MOVEABLE_SCENERY: 'moveableScenery',

  // Spatial traits
  DOOR: 'door',
  CLIMBABLE: 'climbable',

  // Object property traits

  // Basic traits
  ACTOR: 'actor',

  // New traits
  EXIT: 'exit',
  
  // Combat traits
  WEAPON: 'weapon',
  BREAKABLE: 'breakable',
  DESTRUCTIBLE: 'destructible',
  COMBATANT: 'combatant',
  EQUIPPED: 'equipped',

  // NPC traits (ADR-070)
  NPC: 'npc',

  // Transport traits
  VEHICLE: 'vehicle',
  ENTERABLE: 'enterable',

  // System traits
  STORY_INFO: 'storyInfo'
} as const;

/**
 * Type for trait type values
 */
export type TraitType = typeof TraitType[keyof typeof TraitType];

/**
 * Trait categories for organization
 */
export const TraitCategory = {
  STANDARD: 'standard',
  INTERACTIVE: 'interactive',
  ADVANCED: 'advanced'
} as const;

/**
 * Type for trait category values
 */
export type TraitCategory = typeof TraitCategory[keyof typeof TraitCategory];

/**
 * Map trait types to categories
 */
export const TRAIT_CATEGORIES: Record<TraitType, TraitCategory> = {
  // Standard
  [TraitType.IDENTITY]: TraitCategory.STANDARD,
  [TraitType.CONTAINER]: TraitCategory.STANDARD,
  [TraitType.SUPPORTER]: TraitCategory.STANDARD,
  [TraitType.ROOM]: TraitCategory.STANDARD,
  [TraitType.WEARABLE]: TraitCategory.STANDARD,
  [TraitType.CLOTHING]: TraitCategory.STANDARD,
  [TraitType.EDIBLE]: TraitCategory.STANDARD,
  [TraitType.SCENERY]: TraitCategory.STANDARD,

  // Interactive
  [TraitType.OPENABLE]: TraitCategory.INTERACTIVE,
  [TraitType.LOCKABLE]: TraitCategory.INTERACTIVE,
  [TraitType.SWITCHABLE]: TraitCategory.INTERACTIVE,
  [TraitType.READABLE]: TraitCategory.INTERACTIVE,
  [TraitType.LIGHT_SOURCE]: TraitCategory.INTERACTIVE,

  // Manipulation
  [TraitType.PULLABLE]: TraitCategory.INTERACTIVE,
  [TraitType.ATTACHED]: TraitCategory.INTERACTIVE,
  [TraitType.PUSHABLE]: TraitCategory.INTERACTIVE,
  [TraitType.BUTTON]: TraitCategory.INTERACTIVE,
  [TraitType.MOVEABLE_SCENERY]: TraitCategory.INTERACTIVE,

  // Spatial
  [TraitType.DOOR]: TraitCategory.STANDARD,
  [TraitType.CLIMBABLE]: TraitCategory.INTERACTIVE,
  [TraitType.EXIT]: TraitCategory.STANDARD,

  // Object property

  // Basic
  [TraitType.ACTOR]: TraitCategory.STANDARD,
  
  // Combat
  [TraitType.WEAPON]: TraitCategory.INTERACTIVE,
  [TraitType.BREAKABLE]: TraitCategory.INTERACTIVE,
  [TraitType.DESTRUCTIBLE]: TraitCategory.INTERACTIVE,
  [TraitType.COMBATANT]: TraitCategory.INTERACTIVE,
  [TraitType.EQUIPPED]: TraitCategory.INTERACTIVE,

  // NPC traits
  [TraitType.NPC]: TraitCategory.STANDARD,

  // Transport traits
  [TraitType.VEHICLE]: TraitCategory.INTERACTIVE,
  [TraitType.ENTERABLE]: TraitCategory.INTERACTIVE,

  // System traits
  [TraitType.STORY_INFO]: TraitCategory.STANDARD
};

/**
 * Helper to check if a trait type exists
 */
export function isValidTraitType(type: string): type is TraitType {
  return Object.values(TraitType).includes(type as TraitType);
}

/**
 * Get trait category
 */
export function getTraitCategory(type: TraitType): TraitCategory {
  return TRAIT_CATEGORIES[type];
}

/**
 * Get all trait types in a category
 */
export function getTraitsByCategory(category: TraitCategory): TraitType[] {
  return Object.entries(TRAIT_CATEGORIES)
    .filter(([_, cat]) => cat === category)
    .map(([type, _]) => type as TraitType);
}

/**
 * Get all trait types
 */
export function getAllTraitTypes(): TraitType[] {
  return Object.values(TraitType);
}

/**
 * Add a new trait type at runtime (for extensions)
 */
export function registerTraitType(name: string, value: string, category: TraitCategory = TraitCategory.STANDARD): void {
  // Add to TraitType object (note: this modifies the const object)
  (TraitType as any)[name] = value;

  // Add to categories
  TRAIT_CATEGORIES[value as TraitType] = category;
}
