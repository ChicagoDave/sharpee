/**
 * Safe Opening Interceptor
 *
 * Blocks OPEN action on the safe when it is rusted shut (before explosion).
 * After the brick explosion blows the door off, the safe can be opened normally.
 * Also blocks CLOSE after explosion (no door to close).
 *
 * MDL: SAFE-FUNCTION (act2.mud:636-644)
 * - Before explosion: "The box is rusted and will not open."
 * - After explosion: "The box has no door!" (for both open and close)
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  IFEntity,
  WorldModel,
} from '@sharpee/world-model';

export const SafeOpeningMessages = {
  RUSTED_SHUT: 'dungeo.safe.rusted_shut',
  NO_DOOR: 'dungeo.safe.no_door',
} as const;

export const SafeOpeningInterceptor: ActionInterceptor = {
  preValidate(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    if (entity.attributes.rustedShut === true) {
      return {
        valid: false,
        error: SafeOpeningMessages.RUSTED_SHUT
      };
    }
    return null;
  }
};

export const SafeClosingInterceptor: ActionInterceptor = {
  preValidate(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    // Before explosion: rusted shut (not open, so close would fail anyway)
    // After explosion: no door to close
    if (entity.attributes.safeBlownOpen === true) {
      return {
        valid: false,
        error: SafeOpeningMessages.NO_DOOR
      };
    }
    return null;
  }
};
