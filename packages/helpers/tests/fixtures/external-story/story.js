/**
 * External-story fixture for the @sharpee/helpers bundle-boundary real-path test.
 *
 * The harness (`external-story-boundary.test.ts`) copies this file to
 * `<tmp>/dist/index.js` and symlinks `<tmp>/node_modules/@sharpee/{helpers,
 * world-model}` at the workspace packages, then runs the copy through
 * `dist/cli/sharpee.js`. The CLI bundle inlines its *own* copy of
 * @sharpee/world-model, so the world this story is handed is an instance of a
 * different class object than the one resolved here — the exact condition that
 * broke the retired `world.helpers()` prototype patch (issue #146).
 *
 * Two jobs, both load-bearing:
 *  1. Build a world through `createHelpers(world)` across that boundary.
 *  2. Emit `[boundary] ...` diagnostics so the harness can assert the boundary
 *     is real. Without (2) the test could pass vacuously if the fixture ever
 *     ended up sharing one module graph with the bundle.
 *
 * Owner context: @sharpee/helpers (test fixture — not shipped)
 */
const { createHelpers } = require('@sharpee/helpers');
const storySideWorldModel = require('@sharpee/world-model').WorldModel;

class HelpersBoundaryStory {
  constructor() {
    this.config = {
      id: 'helpers-boundary-fixture',
      title: 'Helpers Boundary Fixture',
      authors: ['Sharpee'],
      version: '1.0.0',
      description: 'External story exercising @sharpee/helpers across the bundle boundary.',
    };
  }

  createPlayer(world) {
    const { actor } = createHelpers(world);

    const player = actor('yourself')
      .description('As good-looking as ever.')
      .aliases('self', 'me')
      .properName()
      .build();

    // ADR-327 D10: setStory builds the world FIRST, so the hall exists by the
    // time this runs — the player is placed here, not in initializeWorld.
    if (this.hallId) world.moveEntity(player.id, this.hallId);
    return player;
  }

  initializeWorld(world) {
    // Boundary diagnostics — asserted on by the harness.
    console.log('[boundary] sameWorldModelClass=' + (world instanceof storySideWorldModel));
    console.log('[boundary] prototypeHelpers=' + typeof storySideWorldModel.prototype.helpers);
    console.log('[boundary] worldHelpers=' + typeof world.helpers);

    const { room, object } = createHelpers(world);

    const hall = room('Marble Hall')
      .description('A cool marble hall.')
      .build();

    object('brass lamp')
      .description('A well-polished brass lamp.')
      .in(hall)
      .build();

    this.hallId = hall.id;
  }
}

module.exports.createStory = () => new HelpersBoundaryStory();
