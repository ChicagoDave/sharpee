/**
 * Custom traits for the regression test story.
 *
 * Public interface: InspectableTrait (capability dispatch test)
 * Owner: npm regression test suite
 */

import { ITrait } from '@sharpee/world-model';

/**
 * A custom trait that registers the INSPECT capability.
 * When a player "inspects" an entity with this trait, the capability dispatch
 * system routes to the registered behavior.
 */
export class InspectableTrait implements ITrait {
  static readonly type = 'regression.trait.inspectable' as const;
  static readonly capabilities = ['regression.action.inspecting'] as const;
  readonly type = InspectableTrait.type;
  readonly detail: string;
  constructor(detail: string) {
    this.detail = detail;
  }
}
