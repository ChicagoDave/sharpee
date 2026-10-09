/**
 * hatches.test.ts — what remains of the Phase B hatch contract once Chord's
 * hatches were removed (ADR-361): every story is pure IR, so a story loads
 * and builds its world as plain data, with no module to supply and no
 * profile to choose. The binding half (action exports, shape validation, the
 * pure-IR refusal) went with the hatches themselves.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('a story loads as plain data', () => {
  it('builds the world and its dispatch actions from the IR alone', () => {
    const ir = compileFixture('zoo-actions.story');
    const story = createStory(ir);
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);

    const builtIds = world.getAllEntities().map((e) => story.irIdOf(e.id)).filter((id): id is string => id !== undefined);
    expect(builtIds.sort()).toEqual(ir.entities.map((e) => e.id).sort());
    const actionIds = (story.getCustomActions() as Array<{ id: string }>).map((a) => a.id);
    expect(actionIds.length).toBe(ir.actions.length);
    expect(actionIds.length).toBeGreaterThan(0);
  });
});
