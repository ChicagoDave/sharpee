/**
 * The `settable` adjective (ADR-371 D3): a thing whose reversible states are
 * a dial. The platform's setting action finds an implementation on the
 * target; this section supplies it — one ADR-090 capability behavior shared
 * by every settable thing, keyed on a marker trait this section adds to each.
 *
 * The behavior reads the thing's own `states` from the IR, accepts a typed
 * value that names one of them (spaces and hyphens equal), writes the same
 * world-state entry `change <thing> to <state>` writes, and reports
 * `if.event.set`. Refusals are fully-qualified message ids (stdlib CLAUDE.md
 * capability-effect rule) with the values as a list phrase for lang-en-us.
 *
 * Public interface: SettableSection, ChordSettableTrait.
 * Owner context: @sharpee/story-loader / runtime
 */

import type { Phrase } from '@sharpee/if-domain';
import {
  type CapabilityBehavior,
  type CapabilityEffect,
  type CapabilitySharedData,
  type CapabilityValidationResult,
  type IFEntity,
  type ITrait,
  WorldModel
} from '@sharpee/world-model';
import { nounPhraseFor } from '@sharpee/stdlib';
import { CHORD_STATE_PREFIX } from '../state-keys.js';
import type { RuntimeCore } from './core.js';

/** The setting action's id, as the platform declares it. */
const SETTING_ACTION_ID = 'if.action.setting';

/** Marker trait carried by every `settable` thing; claims the setting capability. */
export class ChordSettableTrait implements ITrait {
  static readonly type = 'chord.settable';
  static readonly capabilities = [SETTING_ACTION_ID] as const;
  readonly type = ChordSettableTrait.type;
}

/** A typed value in the state register: lowercased, spaces as hyphens. */
function normalizeValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().toLowerCase().replace(/\s+/g, '-');
  return text ? text : undefined;
}

/** A noun-phrase-free list of the state words, for the `{values}` param. */
function valuesPhrase(states: readonly string[]): Phrase {
  return {
    kind: 'list',
    conj: 'or',
    items: states.map((s) => ({ kind: 'literal', text: s } as Phrase)),
  } as Phrase;
}

export class SettableSection {
  constructor(private readonly core: RuntimeCore) {}

  /**
   * Mark every settable thing and register the shared behavior (once per
   * world — the registry is idempotent, last wins).
   * @param world the world the loader built
   */
  bindSettable(world: WorldModel): void {
    const settable = this.core.ir.entities.filter((e) => e.traits.some((t) => t.name === 'settable'));
    if (settable.length === 0) return;
    for (const irEntity of settable) {
      const worldId = this.core.host.entityId(irEntity.id);
      const entity = worldId ? world.getEntity(worldId) : undefined;
      if (entity && !entity.has(ChordSettableTrait.type)) entity.add(new ChordSettableTrait());
    }
    world.registerCapabilityBehavior(ChordSettableTrait.type, SETTING_ACTION_ID, this.buildBehavior());
  }

  /** The thing's own states (the IR merges trait states after them; `settable` reads the own line). */
  private statesOf(entity: IFEntity): string[] {
    const irId = this.core.host.irIdOf(entity.id);
    const irEntity = irId ? this.core.ir.entities.find((e) => e.id === irId) : undefined;
    return irEntity?.states ?? [];
  }

  private buildBehavior(): CapabilityBehavior {
    const section = this;
    return {
      validate(entity: IFEntity, _world: WorldModel, _actorId: string, shared: CapabilitySharedData): CapabilityValidationResult {
        const states = section.statesOf(entity);
        // The setting action seeds the typed value (ADR-371 D3).
        const typed = shared.value;
        if (typed === undefined) {
          return { valid: false, error: `${SETTING_ACTION_ID}.no_value`, params: { target: section.nounPhrase(entity) } };
        }
        const value = normalizeValue(typed);
        if (!value || !states.includes(value)) {
          return {
            valid: false,
            error: `${SETTING_ACTION_ID}.not_a_setting`,
            params: { target: section.nounPhrase(entity), values: valuesPhrase(states) },
          };
        }
        shared.resolvedValue = value;
        return { valid: true };
      },

      execute(entity: IFEntity, world: WorldModel, _actorId: string, shared: CapabilitySharedData): void {
        const irId = section.core.host.irIdOf(entity.id);
        if (irId && typeof shared.resolvedValue === 'string') {
          // The same entry `change <thing> to <state>` writes; `settable`
          // requires a reversible set, so no forward-march check applies.
          world.setStateValue(CHORD_STATE_PREFIX + irId, shared.resolvedValue);
        }
      },

      report(entity: IFEntity, _world: WorldModel, actorId: string, shared: CapabilitySharedData): CapabilityEffect[] {
        return [{
          type: 'if.event.set',
          payload: {
            messageId: `${SETTING_ACTION_ID}.set`,
            params: { target: section.nounPhrase(entity), value: shared.resolvedValue },
            targetId: entity.id,
            targetName: entity.name,
            actorId,
            value: shared.resolvedValue,
          },
        }];
      },

      blocked(entity: IFEntity, _world: WorldModel, _actorId: string, error: string, shared: CapabilitySharedData): CapabilityEffect[] {
        return [{
          type: 'if.event.set_blocked',
          payload: {
            messageId: error,
            params: { target: section.nounPhrase(entity), values: valuesPhrase(section.statesOf(entity)), value: shared.value },
            targetId: entity.id,
            targetName: entity.name,
            reason: error,
          },
        }];
      },
    };
  }

  /** The target as an entity-valued param (ADR-158), through stdlib's bridge. */
  private nounPhrase(entity: IFEntity): unknown {
    return nounPhraseFor(entity);
  }
}
