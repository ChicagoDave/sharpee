/**
 * ir-id-attribute.test.ts — GH #355: every world entity the loader creates
 * carries its IR entity id in `attributes[CHORD_IR_ID_ATTRIBUTE]`, so a
 * consumer holding only the world (the tree-document runner) can reach the
 * entity's `chord.state.<ir-id>` value.
 *
 * REAL-PATH: real compile → real loader → real WorldModel; the attribute is
 * read back off the created entities and the state key it points at is
 * read from the same world.
 *
 * Owner context: story-loader tests
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { CHORD_IR_ID_ATTRIBUTE, CHORD_STATE_PREFIX } from '../src/state-keys';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join('; '));
  return result.ir;
}

const STORY = `story
  title: Stamp
  authors:
    T
  id: stamp
  story-version: 0.0.1
  states: calm, alarmed

create the Hall
  a room

  A hall.

create the brass lamp
  scenery
  aka lamp
  states, reversible: dark, lit
  in the Hall

  A lamp.

create the oak chest
  a container
  in the Hall

  A chest.

create the table
  a supporter
  in the Hall

  A table.

create the pebble
  in the Hall

  A pebble.

create the first partner
  a person
  states, reversible: waiting, dancing
  in the Hall

  A partner.

create Alex
  a person, proper
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

function build(): WorldModel {
  const story = createStory(compileSource(STORY));
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return world;
}

function byName(world: WorldModel, name: string) {
  return world.getAllEntities().find((e) => e.name === name);
}

describe('GH #355 — the loader stamps the IR id on every entity it creates', () => {
  it('rooms, scenery, containers, supporters, plain objects, and people all carry it', () => {
    const world = build();
    const expected: Record<string, string> = {
      Hall: 'hall',
      'brass lamp': 'brass-lamp',
      'oak chest': 'oak-chest',
      table: 'table',
      pebble: 'pebble',
      'first partner': 'first-partner',
      Alex: 'alex',
    };
    for (const [name, irId] of Object.entries(expected)) {
      const entity = byName(world, name);
      expect(entity, name).toBeDefined();
      expect(entity!.attributes[CHORD_IR_ID_ATTRIBUTE], name).toBe(irId);
    }
  });

  it('the playable person is stamped too — the player is a created entity like any other', () => {
    const world = build();
    const player = world.getPlayer()!;
    expect(player.attributes[CHORD_IR_ID_ATTRIBUTE]).toBe('alex');
  });

  it('the stamped id reaches the entity\'s own state key in the same world', () => {
    const world = build();
    const lamp = byName(world, 'brass lamp')!;
    const irId = lamp.attributes[CHORD_IR_ID_ATTRIBUTE] as string;
    expect(world.getStateValue(CHORD_STATE_PREFIX + irId)).toBe('dark');
    const partner = byName(world, 'first partner')!;
    expect(world.getStateValue(CHORD_STATE_PREFIX + (partner.attributes[CHORD_IR_ID_ATTRIBUTE] as string))).toBe('waiting');
  });

  it('an entity that declares no states is stamped but has no state key', () => {
    const world = build();
    const pebble = byName(world, 'pebble')!;
    expect(pebble.attributes[CHORD_IR_ID_ATTRIBUTE]).toBe('pebble');
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'pebble')).toBeUndefined();
  });
});
