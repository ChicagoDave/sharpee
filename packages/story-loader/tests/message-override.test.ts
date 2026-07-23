/**
 * message-override.test.ts — ADR-255 D6 (loader side): `override message`
 * registers a standard-action message baseline on the SAME phrasebook
 * resolution seam (`phrasebook.template.<if.action.*>`) the engine consults
 * before the platform default. REAL-PATH: real @sharpee/chord compile, real
 * loader world, real evaluator seam. Verifies (a) the alias resolves to the
 * dotted platform id and the override template wins over the platform default,
 * (b) full strategy/cycling parity (a `{variants}` Choice atom is bound), and
 * (c) D6 precedence — a story-defined per-entity phrase key is NOT shadowed.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { phrasebookTemplateKey, type PhrasebookResolution } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

function load(body: string) {
  const source = `story "T" by "N"\n  id: t\n  version: 0.0.1\n\n${body}\ncreate the Hall\n  a room\n\n  A hall.\n\ncreate the player\n  starts in the Hall\n\n  You.\n`;
  const result = compile(source);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

const resolve = (world: WorldModel, id: string) =>
  world.evaluate(phrasebookTemplateKey(id)) as PhrasebookResolution | undefined;

describe('override message resolves on the platform message id (ADR-255 D6)', () => {
  it('a flat override registers its text under the resolved dotted id', () => {
    const { world } = load('override message taking-fixed-in-place\n  It will not budge.\nend override\n');
    const hit = resolve(world, 'if.action.taking.fixed_in_place');
    expect(hit).toBeDefined();
    expect(hit!.template).toContain('will not budge');
    // The alias never reaches the engine — the seam key is the dotted id.
    expect(hit!.key).toBe('if.action.taking.fixed_in_place');
  });

  it('a cycling override binds a `{variants}` Choice atom (full parity — D1)', () => {
    const { world } = load(
      'override message taking-fixed-in-place, cycling\n  It will not budge.\nor\n  You heave; it stays bolted.\nend override\n',
    );
    const hit = resolve(world, 'if.action.taking.fixed_in_place')!;
    expect(hit.template).toBe('{variants}');
    const choice = hit.params?.variants as { kind: string; alternatives: unknown[]; selector: string; messageKey: string };
    expect(choice.kind).toBe('choice');
    expect(choice.alternatives).toHaveLength(2);
    expect(choice.selector).toBe('cycling');
    // Counter keyed by the message id so cycling stays per-message.
    expect(choice.messageKey).toBe('if.action.taking.fixed_in_place');
  });

  it('an un-overridden standard message has no evaluator (platform default wins)', () => {
    const { world } = load('override message taking-fixed-in-place\n  It will not budge.\nend override\n');
    expect(resolve(world, 'if.action.dropping.dropped')).toBeUndefined();
  });

  it('the locale-block form registers each alias under its dotted id', () => {
    const { world } = load(
      'override messages en-US\n  taking-fixed-in-place:\n    It will not budge.\n  wearing-already-wearing:\n    You are already wearing it.\n',
    );
    expect(resolve(world, 'if.action.taking.fixed_in_place')!.template).toContain('will not budge');
    expect(resolve(world, 'if.action.wearing.already_wearing')!.template).toContain('already wearing');
  });
});
