/**
 * State Machine Runtime (ADR-119)
 *
 * Manages registered state machines and evaluates transitions each turn.
 */

import { ISemanticEvent } from '@sharpee/core';
import {
  StateMachineDefinition,
  EntityBindings,
  EvaluationContext,
  TransitionDefinition,
  TransitionTrigger,
  StateMachineInstanceState,
  StateMachineRegistryState,
} from './types';
import { evaluateGuard } from './guard-evaluator';
import { executeEffects } from './effect-executor';

interface RegisteredMachine {
  definition: StateMachineDefinition;
  bindings: EntityBindings;
  currentState: string;
  history: string[];
}

export class StateMachineRegistry {
  private machines = new Map<string, RegisteredMachine>();

  register(definition: StateMachineDefinition, bindings: EntityBindings = {}): void {
    if (this.machines.has(definition.id)) {
      throw new Error(`State machine already registered: ${definition.id}`);
    }
    // Validate initial state exists
    if (!definition.states[definition.initialState]) {
      throw new Error(`Initial state '${definition.initialState}' not found in machine '${definition.id}'`);
    }
    this.machines.set(definition.id, {
      definition,
      bindings: { ...bindings },
      currentState: definition.initialState,
      history: [definition.initialState],
    });
  }

  unregister(id: string): void {
    this.machines.delete(id);
  }

  getMachineState(id: string): string | undefined {
    return this.machines.get(id)?.currentState;
  }

  getMachineHistory(id: string): string[] | undefined {
    return this.machines.get(id)?.history;
  }

  evaluate(ctx: EvaluationContext): ISemanticEvent[] {
    const allEvents: ISemanticEvent[] = [];

    for (const machine of this.machines.values()) {
      const stateDef = machine.definition.states[machine.currentState];
      if (!stateDef || stateDef.terminal || !stateDef.transitions?.length) continue;

      const transition = this.findMatchingTransition(
        stateDef.transitions,
        machine,
        ctx
      );

      if (transition) {
        const events = this.executeTransition(machine, transition, ctx);
        allEvents.push(...events);
      }
    }

    return allEvents;
  }

  private findMatchingTransition(
    transitions: TransitionDefinition[],
    machine: RegisteredMachine,
    ctx: EvaluationContext
  ): TransitionDefinition | undefined {
    // Sort by priority (higher first), stable sort
    const sorted = [...transitions].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    for (const transition of sorted) {
      if (!this.triggerMatches(transition.trigger, machine, ctx)) continue;
      if (transition.guard && !evaluateGuard(transition.guard, ctx.world, machine.bindings, ctx.playerId)) continue;
      return transition;
    }

    return undefined;
  }

  private triggerMatches(
    trigger: TransitionTrigger,
    machine: RegisteredMachine,
    ctx: EvaluationContext
  ): boolean {
    switch (trigger.type) {
      case 'action': {
        if (ctx.actionId !== trigger.actionId) return false;
        if (trigger.targetEntity) {
          const expectedId = trigger.targetEntity.startsWith('$')
            ? machine.bindings[trigger.targetEntity]
            : trigger.targetEntity;
          if (ctx.actionTargetId !== expectedId) return false;
        }
        return true;
      }

      case 'event': {
        if (!ctx.actionEvents) return false;
        return ctx.actionEvents.some(event => {
          if (event.type !== trigger.eventId) return false;
          if (trigger.filter && event.data) {
            const data = event.data as Record<string, unknown>;
            for (const [key, value] of Object.entries(trigger.filter)) {
              // Resolve binding references in filter values
              const expected = typeof value === 'string' && value.startsWith('$')
                ? machine.bindings[value]
                : value;
              if (data[key] !== expected) return false;
            }
          }
          return true;
        });
      }

      case 'condition': {
        return evaluateGuard(trigger.condition, ctx.world, machine.bindings, ctx.playerId);
      }
    }
  }

  private executeTransition(
    machine: RegisteredMachine,
    transition: TransitionDefinition,
    ctx: EvaluationContext
  ): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const currentStateDef = machine.definition.states[machine.currentState];
    const targetStateDef = machine.definition.states[transition.target];

    if (!targetStateDef) {
      throw new Error(
        `Target state '${transition.target}' not found in machine '${machine.definition.id}'`
      );
    }

    // 1. Execute onExit effects of current state
    if (currentStateDef?.onExit) {
      events.push(
        ...executeEffects(currentStateDef.onExit, ctx.world, machine.bindings, ctx.playerId, machine.definition.id)
      );
    }

    // 2. Execute transition effects
    if (transition.effects) {
      events.push(
        ...executeEffects(transition.effects, ctx.world, machine.bindings, ctx.playerId, machine.definition.id)
      );
    }

    // 3. Move to target state
    machine.currentState = transition.target;
    machine.history.push(transition.target);

    // 4. Execute onEnter effects of target state
    if (targetStateDef.onEnter) {
      events.push(
        ...executeEffects(targetStateDef.onEnter, ctx.world, machine.bindings, ctx.playerId, machine.definition.id)
      );
    }

    // 5. Emit transition event
    events.push({
      id: `sm-transition-${Date.now()}`,
      type: 'sm.transition',
      timestamp: Date.now(),
      entities: {},
      data: {
        machineId: machine.definition.id,
        from: machine.history[machine.history.length - 2],
        to: transition.target,
      },
      tags: ['state-machine', machine.definition.id],
    });

    return events;
  }

  // ─── Serialization ──────────────────────────────────────────────────────

  getState(): StateMachineRegistryState {
    const instances: StateMachineInstanceState[] = [];
    for (const machine of this.machines.values()) {
      instances.push({
        id: machine.definition.id,
        currentState: machine.currentState,
        history: [...machine.history],
      });
    }
    return { instances };
  }

  setState(state: StateMachineRegistryState): void {
    for (const instanceState of state.instances) {
      const machine = this.machines.get(instanceState.id);
      if (machine) {
        machine.currentState = instanceState.currentState;
        machine.history = [...instanceState.history];
      }
    }
  }
}
