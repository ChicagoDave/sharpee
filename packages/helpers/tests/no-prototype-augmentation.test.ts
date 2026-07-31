/**
 * Regression guard for ADR-140 Amendment 1 — @sharpee/helpers must not patch
 * WorldModel.prototype.
 *
 * The retired `import '@sharpee/helpers'` + `world.helpers()` form mutated
 * whichever copy of @sharpee/world-model the *importer* resolved. Wherever the
 * story and the engine resolved different copies — every `dist/cli/sharpee.js
 * --story <external>` load, since the CLI bundle inlines its own copy — the
 * patched class and the instantiated class were different objects and the
 * method never reached the engine's world (issue #146).
 *
 * These tests fail if the side effect is reintroduced, whether by restoring
 * augment.ts or by any other module in the package reaching for the prototype.
 *
 * Owner context: @sharpee/helpers
 */

import { describe, it, expect } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { createHelpers } from '../src/index';

describe('@sharpee/helpers does not augment WorldModel.prototype', () => {
  it('leaves WorldModel.prototype without a helpers method after import', () => {
    // The import above is the side effect under test — if the package still
    // patched the prototype, loading this module would have done it by now.
    expect('helpers' in WorldModel.prototype).toBe(false);
    expect((WorldModel.prototype as Record<string, unknown>).helpers).toBeUndefined();
  });

  it('leaves a constructed world without a helpers method', () => {
    const world = new WorldModel();

    expect((world as unknown as Record<string, unknown>).helpers).toBeUndefined();
  });

  it('still supplies the builders through createHelpers(world)', () => {
    const world = new WorldModel();
    const helpers = createHelpers(world);

    // The replacement path must actually build into the world it was handed,
    // not merely return an object of functions.
    const hall = helpers.room('Marble Hall').description('A cool marble hall.').build();

    expect(world.getEntity(hall.id)).toBeDefined();
    expect(world.getEntity(hall.id)!.has('room')).toBe(true);
  });
});
