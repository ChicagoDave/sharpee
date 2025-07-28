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
  LEVER: 'lever',
  CORD: 'cord',
  BELL_PULL: 'bellPull',
  ATTACHED: 'attached',
  PUSHABLE: 'pushable',
  BUTTON: 'button',
  MOVEABLE_SCENERY: 'moveableScenery',
  TURNABLE: 'turnable',
  DIAL: 'dial',
  KNOB: 'knob',
  WHEEL: 'wheel',
  CRANK: 'crank',
  VALVE: 'valve',
  
  // Spatial traits
  DOOR: 'door',
  
  // Object property traits
  FRAGILE: 'fragile',
  BREAKABLE: 'breakable',
  
  // Basic traits
  ACTOR: 'actor',
  
  // New traits
  EXIT: 'exit',
  ENTRY: 'entry'
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
  [TraitType.LEVER]: TraitCategory.INTERACTIVE,
  [TraitType.CORD]: TraitCategory.INTERACTIVE,
  [TraitType.BELL_PULL]: TraitCategory.INTERACTIVE,
  [TraitType.ATTACHED]: TraitCategory.INTERACTIVE,
  [TraitType.PUSHABLE]: TraitCategory.INTERACTIVE,
  [TraitType.BUTTON]: TraitCategory.INTERACTIVE,
  [TraitType.MOVEABLE_SCENERY]: TraitCategory.INTERACTIVE,
  [TraitType.TURNABLE]: TraitCategory.INTERACTIVE,
  [TraitType.DIAL]: TraitCategory.INTERACTIVE,
  [TraitType.KNOB]: TraitCategory.INTERACTIVE,
  [TraitType.WHEEL]: TraitCategory.INTERACTIVE,
  [TraitType.CRANK]: TraitCategory.INTERACTIVE,
  [TraitType.VALVE]: TraitCategory.INTERACTIVE,
  
  // Spatial
  [TraitType.DOOR]: TraitCategory.STANDARD,
  [TraitType.EXIT]: TraitCategory.STANDARD,
  
  // Object property
  [TraitType.FRAGILE]: TraitCategory.STANDARD,
  [TraitType.BREAKABLE]: TraitCategory.STANDARD,
  
  // Basic
  [TraitType.ACTOR]: TraitCategory.STANDARD,
  
  // New traits
  [TraitType.ENTRY]: TraitCategory.INTERACTIVE
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
