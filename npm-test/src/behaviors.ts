/**
 * Capability behaviors for the regression test story.
 *
 * Public interface: inspectBehavior, INSPECT_ACTION_ID
 * Owner: npm regression test suite
 */

import {
  IFEntity,
  WorldModel,
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilitySharedData,
  CapabilityEffect,
  createEffect,
} from '@sharpee/world-model';
import { InspectableTrait } from './traits';

export const INSPECT_ACTION_ID = 'regression.action.inspecting';

export const inspectBehavior: CapabilityBehavior = {
  validate(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityValidationResult {
    return { valid: true };
  },
  execute(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): void {
    // No state change — inspect is read-only
  },
  report(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityEffect[] {
    const inspectable = entity.get(InspectableTrait);
    const detail = inspectable?.detail ?? 'Nothing notable.';
    return [
      createEffect('regression.event.inspected', {
        messageId: 'regression.inspect.result',
        params: { target: entity.attributes.name || 'it', detail },
      }),
    ];
  },
  blocked(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _error: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityEffect[] {
    return [
      createEffect('regression.event.inspect_blocked', {
        messageId: 'regression.inspect.blocked',
        params: { target: entity.attributes.name || 'it' },
      }),
    ];
  },
};
