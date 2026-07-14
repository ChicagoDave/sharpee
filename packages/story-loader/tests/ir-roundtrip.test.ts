/**
 * ir-roundtrip.test.ts — ADR-210 AC-10: parse → IR → serialize → load
 * produces identical registry contents to a direct in-process load.
 *
 * "Registry contents" asserted: built entities (names, trait types,
 * placement), chord.* world-state seeds, and the phrase registrations
 * handed to the language provider.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

const garbled = () => ({ kind: 'literal' as const, text: 'swept aside' });
const CLOAK_MODULES = { './extras.ts': { garbled } };

/** Load a story and project its observable registry contents. */
function loadAndProject(ir: StoryIR) {
  const story = createStory(ir, { hatchModules: CLOAK_MODULES });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);

  const entities = world
    .getAllEntities()
    .map((e) => ({
      irId: story.irIdOf(e.id) ?? `<unmapped:${e.type}>`,
      traits: [...e.getTraitTypes()].sort(),
      locationIrId: (() => {
        const loc = world.getLocation(e.id);
        return loc ? (story.irIdOf(loc) ?? '<unmapped>') : null;
      })(),
    }))
    .sort((a, b) => a.irId.localeCompare(b.irId));

  // chord.* seeds that initializeWorld writes for cloak.story
  const chordState = {
    messageState: world.getStateValue('chord.state.message-in-the-sawdust'),
  };

  const phrases = new Map<string, string>();
  story.extendLanguage({ addMessage: (id: string, t: string) => phrases.set(id, t) } as never);

  return { entities, chordState, phrases, playerIrId: story.irIdOf(player.id) };
}

describe('AC-10: IR JSON round-trip', () => {
  it('serialized IR loads to the same registry contents as the in-process IR', () => {
    const source = readFileSync(join(CHORD_FIXTURES, 'cloak.story'), 'utf8');
    const direct = compile(source);
    expect(direct.ok).toBe(true);

    // The wire trip: IR → JSON string → parsed IR.
    const wire = JSON.parse(JSON.stringify(direct.ir)) as StoryIR;

    const fromDirect = loadAndProject(direct.ir);
    const fromWire = loadAndProject(wire);

    expect(fromWire.entities).toEqual(fromDirect.entities);
    expect(fromWire.chordState).toEqual(fromDirect.chordState);
    expect(fromWire.playerIrId).toEqual(fromDirect.playerIrId);
    expect([...fromWire.phrases.entries()].sort()).toEqual(
      [...fromDirect.phrases.entries()].sort(),
    );
    // The trip is lossless at the IR level too.
    expect(wire).toEqual(direct.ir);
  });
});
