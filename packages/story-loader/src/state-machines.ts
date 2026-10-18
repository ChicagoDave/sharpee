/**
 * state-machines.ts — the core state-machine plugin and `define machine` lowering.
 *
 * Engine-side only: every story gets one state-machine plugin, registered
 * at engine-ready beside the NPC service and the scheduler, with no `use`
 * line to open it. Every `define machine` is lowered into the plugin's
 * registry — platform id `chord.machine.<slug>`, role bindings as
 * `$<role>` entries (world ids), action triggers on `if.action.<gerund>`,
 * Chord conditions as custom guards over the shared evaluator, Chord
 * bodies as one custom effect each through the runtime's statement
 * executor. A story with no machines still carries the plugin: it is the
 * host every vehicle's built-in machine ticks in, and an empty plugin does
 * nothing per turn.
 *
 * Public interface: installStateMachines.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-377 D2, D3 — state machines are core; one plugin per story on the
 *   loader's core path, and the vehicle machine is a phase of it.
 * - ADR-119 — the state-machine shapes the definitions lower onto.
 * - ADR-256 — event ids translate to the platform runtime type at the seam.
 */
import type { IRCondition, IRStatement, StoryIR } from '@sharpee/chord';
import {
  StateMachinePlugin,
  type EntityBindings,
  type StateDefinition,
  type StateMachineDefinition,
  type TransitionDefinition,
} from '@sharpee/plugin-state-machine';
import type { WorldModel } from '@sharpee/world-model';
import { LoadError } from './errors.js';
import { translateEventId } from './event-id-map.js';
import type { ExtensionEngineHost, ExtensionInstallContext } from './extension-registry.js';

type IRMachine = NonNullable<StoryIR['machines']>[number];

/** Lower one `define machine` onto the platform's state-machine shapes. */
function buildMachineDefinition(
  machine: IRMachine,
  context: ExtensionInstallContext,
): {
  definition: StateMachineDefinition;
  bindings: EntityBindings;
} {
  const bindings: EntityBindings = {};
  for (const role of machine.roles) {
    const worldId = context.worldId(role.entity);
    if (!worldId) {
      throw new LoadError(`Machine \`${machine.name}\`: role \`${role.name}\`'s entity was never built.`, machine.span);
    }
    bindings[`$${role.name}`] = worldId;
  }

  const chordGuard = (condition: IRCondition) => ({
    type: 'custom' as const,
    evaluate: (world: unknown) => context.evalCondition(condition, world as WorldModel),
  });
  const chordEffect = (statements: IRStatement[]) => ({
    type: 'custom' as const,
    execute: (world: unknown) => ({
      events: context
        .execMachineBody(statements, world as WorldModel)
        .map((e) => ({ type: e.type, data: e.data, entities: e.entities as Record<string, string> })),
    }),
  });

  const states: Record<string, StateDefinition> = {};
  for (const state of machine.states) {
    const transitions: TransitionDefinition[] = state.transitions.map((t) => {
      let trigger: TransitionDefinition['trigger'];
      switch (t.trigger.kind) {
        case 'action': {
          let targetEntity: string | undefined;
          if (t.trigger.target) {
            targetEntity = t.trigger.target.startsWith('$')
              ? t.trigger.target
              : context.worldId(t.trigger.target);
            if (targetEntity === undefined) {
              throw new LoadError(`Machine \`${machine.name}\`: a trigger target was never built.`, t.span);
            }
          }
          trigger = {
            type: 'action',
            actionId: `if.action.${t.trigger.action}`,
            ...(targetEntity !== undefined ? { targetEntity } : {}),
          };
          break;
        }
        case 'event':
          // ADR-256: translate the dotless Chord id to the platform runtime
          // type the machine fires on (media.* → dotted; author events pass
          // through), matching the emit seam.
          trigger = { type: 'event', eventId: translateEventId(t.trigger.event) };
          break;
        case 'condition':
          trigger = { type: 'condition', condition: chordGuard(t.trigger.condition) };
          break;
      }
      return {
        target: t.target,
        trigger,
        ...(t.condition ? { guard: chordGuard(t.condition) } : {}),
      };
    });
    states[state.name] = {
      ...(state.terminal ? { terminal: true } : {}),
      ...(state.onEnter.length > 0 ? { onEnter: [chordEffect(state.onEnter)] } : {}),
      ...(state.onExit.length > 0 ? { onExit: [chordEffect(state.onExit)] } : {}),
      ...(transitions.length > 0 ? { transitions } : {}),
    };
  }

  return {
    definition: {
      id: `chord.machine.${machine.name.replace(/\s+/g, '-')}`,
      initialState: machine.initialState,
      states,
    },
    bindings,
  };
}

/**
 * Register the story's state-machine plugin on the engine and lower every
 * `define machine` into it. Runs once per story at engine-ready, for every
 * story, whether or not it declares a machine (ADR-377 D2).
 *
 * @param ir the compiled story, whose `machines` are lowered
 * @param engine the engine's plugin registry host
 * @param context the loader-side services the lowering needs
 * @returns the registered plugin, so a caller can add machine phases to it
 * @throws LoadError when a role or trigger target names an entity never built
 */
export function installStateMachines(
  ir: StoryIR,
  engine: ExtensionEngineHost,
  context: ExtensionInstallContext,
): StateMachinePlugin {
  const smPlugin = new StateMachinePlugin();
  engine.getPluginRegistry().register(smPlugin);
  const smRegistry = smPlugin.getRegistry();
  for (const machine of ir.machines ?? []) {
    const { definition, bindings } = buildMachineDefinition(machine, context);
    smRegistry.register(definition, bindings);
  }
  return smPlugin;
}
