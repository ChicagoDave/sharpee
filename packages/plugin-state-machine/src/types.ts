/**
 * State Machine Types (ADR-119)
 *
 * Declarative state machine definitions for puzzle and narrative orchestration.
 *
 * Entity references in these types use a binding convention: a string starting
 * with `$` (e.g. `$door`) is a role looked up in the machine's
 * {@link EntityBindings}; any other string is a literal entity id.
 */

import { EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';

// ─── State Machine Definition ───────────────────────────────────────────────

/** A complete declarative state machine: its states and where it starts. */
export interface StateMachineDefinition {
  /** Unique machine id. Registering two machines with the same id throws. */
  id: string;
  /** Optional human-readable description of what the machine models. */
  description?: string;
  /** The state the machine begins in; must be a key of {@link states}. */
  initialState: string;
  /** All states, keyed by state name. */
  states: Record<string, StateDefinition>;
}

/** One state within a machine. */
export interface StateDefinition {
  /** Optional description of the state. */
  description?: string;
  /** Transitions out of this state, tried in descending `priority` each turn. */
  transitions?: TransitionDefinition[];
  /** Effects run when the machine enters this state. */
  onEnter?: Effect[];
  /** Effects run when the machine leaves this state. */
  onExit?: Effect[];
  /** When true, the machine stops evaluating once in this state (an end state). */
  terminal?: boolean;
}

/** A single edge from the owning state to {@link target}. */
export interface TransitionDefinition {
  /** Name of the state to move to when this transition fires. */
  target: string;
  /** What causes this transition to be considered. */
  trigger: TransitionTrigger;
  /** Optional extra condition that must hold for the transition to fire. */
  guard?: GuardCondition;
  /** Effects run as part of taking this transition (after onExit, before onEnter). */
  effects?: Effect[];
  /** Higher priority transitions are tried first; defaults to 0. */
  priority?: number;
}

// ─── Triggers ───────────────────────────────────────────────────────────────

/** What can cause a transition to be considered. */
export type TransitionTrigger = ActionTrigger | EventTrigger | ConditionTrigger;

/** Fires when the player runs a specific action (optionally on a specific target). */
export interface ActionTrigger {
  type: 'action';
  /** The action id to match (the verb that ran). */
  actionId: string;
  /** Optional target to match: a role reference (`$door`) or a literal entity id. */
  targetEntity?: string;
}

/** Fires when one of the turn's action events matches. */
export interface EventTrigger {
  type: 'event';
  /** The event type to match. */
  eventId: string;
  /** Optional event-data fields that must match; `$`-values resolve via bindings. */
  filter?: Record<string, unknown>;
}

/** Fires when a guard condition evaluates true (no player action required). */
export interface ConditionTrigger {
  type: 'condition';
  /** The condition to evaluate against world state each turn. */
  condition: GuardCondition;
}

// ─── Guards ─────────────────────────────────────────────────────────────────

/** A boolean condition evaluated against world state. */
export type GuardCondition =
  | EntityGuard
  | StateGuard
  | LocationGuard
  | InventoryGuard
  | CompositeGuard
  | CustomGuard;

/** True when an entity's trait property equals a value. */
export interface EntityGuard {
  type: 'entity';
  /** Role reference (`$x`) or literal id of the entity to inspect. */
  entityRef: string;
  /** Trait name on the entity. */
  trait: string;
  /** Property of that trait to read. */
  property: string;
  /** Value the property must equal. */
  value: unknown;
}

/** True when a world state value equals a value. */
export interface StateGuard {
  type: 'state';
  /** World state key (see `world.getStateValue`). */
  key: string;
  /** Value the state must equal. */
  value: unknown;
}

/** True when an actor is in a given room. */
export interface LocationGuard {
  type: 'location';
  /** Role/id of the actor; defaults to the player when omitted. */
  actorRef?: string;
  /** Role/id of the room the actor must be in. */
  roomRef: string;
}

/** True when an actor is carrying a given entity. */
export interface InventoryGuard {
  type: 'inventory';
  /** Role/id of the carrier; defaults to the player when omitted. */
  actorRef?: string;
  /** Role/id of the entity that must be carried. */
  entityRef: string;
}

/** Combines other guards with boolean logic. */
export interface CompositeGuard {
  /** `and` = all true, `or` = any true, `not` = not all true. */
  type: 'and' | 'or' | 'not';
  /** The sub-conditions to combine. */
  conditions: GuardCondition[];
}

/** A guard backed by a custom predicate function. */
export interface CustomGuard {
  type: 'custom';
  /** Returns true when the guard passes. */
  evaluate: (world: WorldModel, bindings: EntityBindings, playerId: EntityId) => boolean;
}

// ─── Effects ────────────────────────────────────────────────────────────────

/** A world mutation or event emission performed when a transition/state fires. */
export type Effect =
  | MoveEntityEffect
  | RemoveEntityEffect
  | SetTraitEffect
  | SetStateEffect
  | MessageEffect
  | EmitEventEffect
  | CustomEffect;

/** Move an entity to a destination. */
export interface MoveEntityEffect {
  type: 'move';
  /** Role/id of the entity to move. */
  entityRef: string;
  /** Role/id of the destination (room or container). */
  destinationRef: string;
}

/** Remove an entity from the world. */
export interface RemoveEntityEffect {
  type: 'remove';
  /** Role/id of the entity to remove. */
  entityRef: string;
}

/** Set a property on an entity's trait. */
export interface SetTraitEffect {
  type: 'set_trait';
  /** Role/id of the entity. */
  entityRef: string;
  /** Trait name. */
  trait: string;
  /** Property to set. */
  property: string;
  /** Value to assign. */
  value: unknown;
}

/** Set a world state value. */
export interface SetStateEffect {
  type: 'set_state';
  /** World state key. */
  key: string;
  /** Value to store. */
  value: unknown;
}

/** Emit a message event for the player to see. */
export interface MessageEffect {
  type: 'message';
  /** Message id to resolve via the language provider. */
  messageId: string;
  /** Optional parameters for the message template. */
  params?: Record<string, unknown>;
}

/** Emit an arbitrary semantic event. */
export interface EmitEventEffect {
  type: 'emit_event';
  /** The event type to emit. */
  eventType: string;
  /** Optional role/id entities to attach, by semantic role; `$`-values resolve via bindings. */
  entities?: {
    actor?: string;
    target?: string;
    instrument?: string;
    location?: string;
  };
  /** Optional event payload. */
  data?: unknown;
}

/** An effect backed by a custom function. */
export interface CustomEffect {
  type: 'custom';
  /** Performs the effect and returns events/messages to emit. */
  execute: (world: WorldModel, bindings: EntityBindings, playerId: EntityId) => EffectResult;
}

/** What a {@link CustomEffect} returns: events and/or messages to emit. */
export interface EffectResult {
  /** Semantic events to emit. */
  events?: Array<{ type: string; entities?: Record<string, string>; data?: unknown }>;
  /** Messages to show the player. */
  messages?: Array<{ messageId: string; params?: Record<string, unknown> }>;
}

// ─── Bindings & Instance State ──────────────────────────────────────────────

/** Maps role names (e.g. `$door`) to concrete entity ids for one machine instance. */
export type EntityBindings = Record<string, EntityId>;

/** The saveable state of a single running machine. */
export interface StateMachineInstanceState {
  /** The machine's id. */
  id: string;
  /** The state it is currently in. */
  currentState: string;
  /** The ordered list of states it has occupied. */
  history: string[];
}

/** The saveable state of the whole registry (all machine instances). */
export interface StateMachineRegistryState {
  /** One entry per registered machine. */
  instances: StateMachineInstanceState[];
}

// ─── Evaluation Context ─────────────────────────────────────────────────────

/** Per-turn context handed to the runtime when evaluating transitions. */
export interface EvaluationContext {
  /** The live world model. */
  world: WorldModel;
  /** The player entity id. */
  playerId: EntityId;
  /** The player's current location id. */
  playerLocation: EntityId;
  /** The current turn number. */
  turn: number;
  /** The id of the action that ran this turn, if any. */
  actionId?: string;
  /** The direct-object entity id of that action, if any. */
  actionTargetId?: EntityId;
  /** The semantic events the action emitted this turn. */
  actionEvents?: Array<{ type: string; data?: unknown; entities?: Record<string, string> }>;
}
