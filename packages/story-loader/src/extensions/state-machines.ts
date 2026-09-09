/**
 * state-machines.ts — the `use state-machines` registry entry.
 *
 * Engine-side only: `installFromIR` registers the state-machine plugin and
 * lowers every `define machine` into its registry — platform id
 * `chord.machine.<slug>`, role bindings as `$<role>` entries (world ids),
 * action triggers on `if.action.<gerund>`, Chord conditions as custom
 * guards over the shared evaluator, Chord bodies as one custom effect each
 * through the runtime's statement executor. The plugin instance is built
 * here because the machines must be lowered into it after construction.
 * `gatedConstruct` names `define machine` as the construct this `use`
 * unlocks, so rogue IR carrying one without the `use` is refused.
 *
 * Public interface: STATE_MACHINES_EXTENSION.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-119 — the state-machine shapes the definitions lower onto.
 * - ADR-215 — `use state-machines` and the loader's rogue-IR backstop.
 * - ADR-256 — event ids translate to the platform runtime type at the seam.
 * - ADR-335 D3 — IR-shaped construction lives in the registry entry.
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
import { LoadError } from '../errors.js';
import { translateEventId } from '../event-id-map.js';
import type { ExtensionInstallContext, ExtensionRegistration } from '../extension-registry.js';

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

export const STATE_MACHINES_EXTENSION: ExtensionRegistration = {
  gatedConstruct: (ir) =>
    (ir.machines ?? []).length > 0 ? { construct: 'define machine', span: ir.machines![0].span } : null,
  installFromIR: (ir, engine, context) => {
    const smPlugin = new StateMachinePlugin();
    engine.getPluginRegistry().register(smPlugin);
    const smRegistry = smPlugin.getRegistry();
    for (const machine of ir.machines ?? []) {
      const { definition, bindings } = buildMachineDefinition(machine, context);
      smRegistry.register(definition, bindings);
    }
  },
};
