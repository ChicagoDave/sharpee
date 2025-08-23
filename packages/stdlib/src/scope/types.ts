/**
 * Core types for the scope system
 */

import { IFEntity } from '@sharpee/world-model';

/**
 * Levels of scope indicating how an entity can be perceived
 */
export enum ScopeLevel {
  /** In actor's inventory - always accessible */
  CARRIED = 'carried',
  
  /** Can physically touch/manipulate */
  REACHABLE = 'reachable',
  
  /** Can see with eyes */
  VISIBLE = 'visible',
  
  /** Can hear */
  AUDIBLE = 'audible',
  
  /** Can smell or otherwise sense */
  DETECTABLE = 'detectable',
  
  /** Cannot perceive at all */
  OUT_OF_SCOPE = 'out_of_scope'
}

/**
 * Types of sensory perception
 */
export enum SenseType {
  /** Visual perception - blocked by opaque barriers, needs light */
  SIGHT = 'sight',
  
  /** Auditory perception - travels through some barriers */
  HEARING = 'hearing',
  
  /** Olfactory perception - needs air path */
  SMELL = 'smell',
  
  /** Tactile perception - requires physical contact */
  TOUCH = 'touch',
  
  /** Supernatural/psychic perception - game-specific */
  VIBE = 'vibe'
}

/**
 * Determines what entities are in scope for an actor
 */
export interface ScopeResolver {
  /**
   * Get the highest level of scope for a target entity
   */
  getScope(actor: IFEntity, target: IFEntity): ScopeLevel;
  
  /**
   * Check if actor can see the target
   */
  canSee(actor: IFEntity, target: IFEntity): boolean;
  
  /**
   * Check if actor can physically reach the target
   */
  canReach(actor: IFEntity, target: IFEntity): boolean;
  
  /**
   * Check if actor can hear the target or sounds from it
   */
  canHear(actor: IFEntity, target: IFEntity): boolean;
  
  /**
   * Check if actor can smell the target
   */
  canSmell(actor: IFEntity, target: IFEntity): boolean;
  
  /**
   * Get all entities visible to the actor
   */
  getVisible(actor: IFEntity): IFEntity[];
  
  /**
   * Get all entities reachable by the actor
   */
  getReachable(actor: IFEntity): IFEntity[];
  
  /**
   * Get all entities the actor can hear
   */
  getAudible(actor: IFEntity): IFEntity[];
}

/**
 * Tracks what actors know about based on what they've witnessed
 */
export interface WitnessSystem {
  /**
   * Record who can witness a state change
   */
  recordWitnesses(change: StateChange): WitnessRecord;
  
  /**
   * Update actor knowledge based on what was witnessed
   */
  updateKnowledge(record: WitnessRecord): void;
  
  /**
   * Get what an actor knows about
   */
  getKnownEntities(actorId: string): EntityKnowledge[];
  
  /**
   * Check if an actor has discovered an entity
   */
  hasDiscovered(actorId: string, entityId: string): boolean;
  
  /**
   * Get what an actor knows about a specific entity
   */
  getKnowledge(actorId: string, entityId: string): EntityKnowledge | undefined;
}

/**
 * Represents a change in world state that can be witnessed
 */
export interface StateChange {
  type: 'move' | 'create' | 'destroy' | 'modify' | 'action';
  entityId: string;
  actorId?: string; // Who caused the change
  timestamp: number;
  
  // For movement
  from?: string;
  to?: string;
  
  // For property changes
  property?: string;
  oldValue?: any;
  newValue?: any;
  
  // For actions
  action?: string;
  target?: string;
}

/**
 * Record of who witnessed what and how
 */
export interface WitnessRecord {
  change: StateChange;
  witnesses: Map<string, WitnessDetail>;
}

/**
 * Details about how an actor witnessed something
 */
export interface WitnessDetail {
  actorId: string;
  sense: SenseType;
  level: WitnessLevel;
  confidence: 'certain' | 'likely' | 'unsure';
}

/**
 * Level of detail in witnessing
 */
export enum WitnessLevel {
  /** Saw/heard/sensed everything clearly */
  FULL = 'full',
  
  /** Saw/heard/sensed some but not all details */
  PARTIAL = 'partial',
  
  /** Caught a glimpse or hint */
  PERIPHERAL = 'peripheral',
  
  /** Deduced from evidence rather than direct perception */
  INFERRED = 'inferred'
}

/**
 * What an actor knows about an entity
 */
export interface EntityKnowledge {
  entityId: string;
  exists: boolean;
  
  // Visual knowledge
  lastSeen?: number;
  lastKnownLocation?: string;
  visualProperties?: Map<string, any>;
  
  // Other sensory knowledge
  lastHeard?: number;
  heardFrom?: string; // Approximate direction/location
  
  lastSmelled?: number;
  scentStrength?: 'faint' | 'moderate' | 'strong';
  
  // Discovery metadata
  discoveredAt: number;
  discoveredBy: SenseType;
  
  // Movement tracking
  movementHistory?: MovementRecord[];
}

/**
 * Record of witnessed movement
 */
export interface MovementRecord {
  from: string;
  to: string;
  witnessedAt: number;
  witnessedBy: SenseType;
  confidence: 'certain' | 'likely' | 'unsure';
}

/**
 * Witness event types - all data, no narrative text
 */
export interface WitnessActionEvent {
  type: 'if.witness.action';
  data: {
    witnessId: string;
    sense: SenseType;
    level: WitnessLevel;
    action: string;
    actorId: string;
    targetId?: string;
    fromLocation?: string;
    toLocation?: string;
    timestamp: number;
  };
}

export interface WitnessMovementEvent {
  type: 'if.witness.movement';
  data: {
    witnessId: string;
    sense: SenseType;
    level: WitnessLevel;
    entityId: string | 'unknown';
    fromLocation: string;
    toLocation: string;
    direction?: string;
    timestamp: number;
  };
}

export interface WitnessSoundEvent {
  type: 'if.witness.sound';
  data: {
    witnessId: string;
    sense: SenseType;
    soundType: string;
    intensity: 'faint' | 'moderate' | 'loud';
    fromDirection?: string;
    estimatedLocation?: string;
    timestamp: number;
  };
}

export interface WitnessScentEvent {
  type: 'if.witness.scent';
  data: {
    witnessId: string;
    sense: SenseType;
    scentType: string;
    intensity: 'faint' | 'moderate' | 'strong';
    fromDirection?: string;
    characteristics?: string[];
    timestamp: number;
  };
}

export type WitnessEvent = 
  | WitnessActionEvent 
  | WitnessMovementEvent 
  | WitnessSoundEvent 
  | WitnessScentEvent;