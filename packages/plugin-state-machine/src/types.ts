/**
 * State Machine Types (ADR-119)
 *
 * Declarative state machine definitions for puzzle and narrative orchestration.
 */

import { EntityId } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';

// ─── State Machine Definition ───────────────────────────────────────────────

export interface StateMachineDefinition {
  id: string;
  description?: string;
  initialState: string;
  states: Record<string, StateDefinition>;
}

export interface StateDefinition {
  description?: string;
  transitions?: TransitionDefinition[];
  onEnter?: Effect[];
  onExit?: Effect[];
  terminal?: boolean;
}

export interface TransitionDefinition {
  target: string;
  trigger: TransitionTrigger;
  guard?: GuardCondition;
  effects?: Effect[];
  priority?: number;
}

// ─── Triggers ───────────────────────────────────────────────────────────────

export type TransitionTrigger = ActionTrigger | EventTrigger | ConditionTrigger;

export interface ActionTrigger {
  type: 'action';
  actionId: string;
  targetEntity?: string; // Role reference ($door) or entity ID
}

export interface EventTrigger {
  type: 'event';
  eventId: string;
  filter?: Record<string, unknown>;
}

export interface ConditionTrigger {
  type: 'condition';
  condition: GuardCondition;
}

// ─── Guards ─────────────────────────────────────────────────────────────────

export type GuardCondition =
  | EntityGuard
  | StateGuard
  | LocationGuard
  | InventoryGuard
  | CompositeGuard
  | CustomGuard;

export interface EntityGuard {
  type: 'entity';
  entityRef: string;
  trait: string;
  property: string;
  value: unknown;
}

export interface StateGuard {
  type: 'state';
  key: string;
  value: unknown;
}

export interface LocationGuard {
  type: 'location';
  actorRef?: string;
  roomRef: string;
}

export interface InventoryGuard {
  type: 'inventory';
  actorRef?: string;
  entityRef: string;
}

export interface CompositeGuard {
  type: 'and' | 'or' | 'not';
  conditions: GuardCondition[];
}

export interface CustomGuard {
  type: 'custom';
  evaluate: (world: WorldModel, bindings: EntityBindings, playerId: EntityId) => boolean;
}

// ─── Effects ────────────────────────────────────────────────────────────────

export type Effect =
  | MoveEntityEffect
  | RemoveEntityEffect
  | SetTraitEffect
  | SetStateEffect
  | MessageEffect
  | EmitEventEffect
  | CustomEffect;

export interface MoveEntityEffect {
  type: 'move';
  entityRef: string;
  destinationRef: string;
}

export interface RemoveEntityEffect {
  type: 'remove';
  entityRef: string;
}

export interface SetTraitEffect {
  type: 'set_trait';
  entityRef: string;
  trait: string;
  property: string;
  value: unknown;
}

export interface SetStateEffect {
  type: 'set_state';
  key: string;
  value: unknown;
}

export interface MessageEffect {
  type: 'message';
  messageId: string;
  params?: Record<string, unknown>;
}

export interface EmitEventEffect {
  type: 'emit_event';
  eventType: string;
  entities?: {
    actor?: string;
    target?: string;
    instrument?: string;
    location?: string;
  };
  data?: unknown;
}

export interface CustomEffect {
  type: 'custom';
  execute: (world: WorldModel, bindings: EntityBindings, playerId: EntityId) => EffectResult;
}

export interface EffectResult {
  events?: Array<{ type: string; entities?: Record<string, string>; data?: unknown }>;
  messages?: Array<{ messageId: string; params?: Record<string, unknown> }>;
}

// ─── Bindings & Instance State ──────────────────────────────────────────────

export type EntityBindings = Record<string, EntityId>;

export interface StateMachineInstanceState {
  id: string;
  currentState: string;
  history: string[];
}

export interface StateMachineRegistryState {
  instances: StateMachineInstanceState[];
}

// ─── Evaluation Context ─────────────────────────────────────────────────────

export interface EvaluationContext {
  world: WorldModel;
  playerId: EntityId;
  playerLocation: EntityId;
  turn: number;
  actionId?: string;
  actionTargetId?: EntityId;
  actionEvents?: Array<{ type: string; data?: unknown; entities?: Record<string, string> }>;
}
