/**
 * adr-409-forms-runtime.test.ts — the runtime reads the forms the compiler
 * wrote (ADR-409 D3, D8, AC-4, AC-5).
 *
 * Through the real compiler, loader and engine: a declared thing's IR forms
 * land on IdentityTrait (`singular`, `plural`, `nameFormOrigin`, `akaForms`),
 * `isPlural` follows the declaration, the loader works nothing out, and a
 * player's `examine candle` reaches the examined event for a bare-`plural`
 * "candles". Rooms and undeclared people carry no forms.
 *
 * Owner context: @sharpee/story-loader — tests.
 */
import { describe, expect, it } from 'vitest';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { IdentityTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';
import { compileSource } from './helpers/boot-engine';

const SOURCE = `story
  title: Refectory
  authors:
    Nobody
  id: refectory
  story-version: 0.0.1

create the Refectory
  a room

  A long room.

create the candles
  aka prickets
  a thing, scenery, plural
  in the Refectory

  Tallow candles on iron prickets.

create the mouse
  a thing, singular of mice
  in the Refectory

  A small grey mouse.

create the cacti
  a thing, scenery, plural of cactus
  in the Refectory

  Potted cacti.

create the lamp
  a thing, singular
  in the Refectory

  A brass lamp.

create Morgan
  a person
  in the Refectory

  A cook.

create Alex
  a person
  playable
  starts in the Refectory

  You.

before the game starts
  change the player to Alex
end before
`;

/** Load the story into a fresh world and return an entity's identity trait. */
function loaded(source = SOURCE): WorldModel {
  const story = createStory(compileSource(source));
  const world = new WorldModel();
  story.initializeWorld(world);
  story.createPlayer(world);
  return world;
}

const identityOf = (world: WorldModel, id: string) => world.getEntity(id)!.get(TraitType.IDENTITY) as IdentityTrait;

describe('ADR-409 AC-4: the forms land on IdentityTrait through the real loader', () => {
  it('fills both forms of a bare-plural thing, marks the singular worked out, and carries the aka forms', () => {
    const candles = identityOf(loaded(), 'candles');
    expect(candles.singular).toBe('candle');
    expect(candles.plural).toBe('candles');
    expect(candles.nameFormOrigin).toBe('worked-out');
    expect(candles.akaForms).toEqual([{ word: 'prickets', form: 'pricket' }]);
    expect(candles.isPlural).toBe(true);
  });

  it('fills a written `singular of` form, marked written, and reads the thing as singular', () => {
    const mouse = identityOf(loaded(), 'mouse');
    expect(mouse.singular).toBe('mouse');
    expect(mouse.plural).toBe('mice');
    expect(mouse.nameFormOrigin).toBe('written');
    expect(mouse.isPlural).toBe(false);
  });

  it('fills a written `plural of` form on a plural thing', () => {
    const cacti = identityOf(loaded(), 'cacti');
    expect(cacti.singular).toBe('cactus');
    expect(cacti.plural).toBe('cacti');
    expect(cacti.nameFormOrigin).toBe('written');
    expect(cacti.isPlural).toBe(true);
  });

  it('works out the plural of a bare-singular thing, which then renders and matches by it', () => {
    const lamp = identityOf(loaded(), 'lamp');
    expect(lamp.singular).toBe('lamp');
    expect(lamp.plural).toBe('lamps');
    expect(lamp.nameFormOrigin).toBe('worked-out');
    expect(lamp.isPlural).toBe(false);
  });

  it('leaves a room and an undeclared person with no forms (ADR-409 D9)', () => {
    const world = loaded();
    for (const id of ['refectory', 'morgan']) {
      const identity = identityOf(world, id);
      expect(identity.singular, id).toBeUndefined();
      expect(identity.plural, id).toBeUndefined();
      expect(identity.akaForms, id).toBeUndefined();
      expect(identity.isPlural, id).toBe(false);
    }
  });

  it('refuses IR whose forms do not include the name, naming the entity', () => {
    const ir = compileSource(SOURCE);
    const candles = ir.entities.find((e) => e.id === 'candles')!;
    candles.forms = { ...candles.forms!, plural: 'tapers' };
    const story = createStory(ir);
    const world = new WorldModel();
    expect(() => story.initializeWorld(world)).toThrow(LoadError);
    expect(() => createStory(ir).initializeWorld(new WorldModel())).toThrow(/`candles`: its forms/);
  });
});

describe('ADR-409 AC-5 in-process: a player names a thing by a form', () => {
  /** Run each input as a turn in one game; the examined target of each, in order. */
  async function examinedTargets(...inputs: string[]): Promise<Array<string | undefined>> {
    const story = createStory(compileSource(SOURCE), { seed: 42 });
    const world = new WorldModel();
    const language = new EnglishLanguageProvider();
    const engine = new GameEngine({
      world,
      parser: new EnglishParser(language, { world }),
      language,
      perceptionService: new PerceptionService(),
      config: { seed: 42 },
    });
    engine.installStory(story);
    await engine.start();
    const targets: Array<string | undefined> = [];
    for (const input of inputs) {
      const result = await engine.executeTurn(input);
      const examined = result.events.find((event) => event.type === 'if.event.examined');
      targets.push((examined?.data as { targetId?: string } | undefined)?.targetId);
    }
    return targets;
  }

  async function examinedTarget(input: string): Promise<string | undefined> {
    return (await examinedTargets(input))[0];
  }

  it('examines the candles by the worked-out `candle` and the aka form `pricket`', async () => {
    expect(await examinedTarget('examine candle')).toBe('candles');
    expect(await examinedTarget('examine pricket')).toBe('candles');
  });

  it('examines the mouse by its written plural `mice`', async () => {
    expect(await examinedTarget('examine mice')).toBe('mouse');
  });

  it('examines the lamp by its worked-out plural `lamps`', async () => {
    expect(await examinedTarget('examine lamps')).toBe('lamp');
  });

  it('makes a plural thing "them" and a singular thing "it" (ADR-409 D8)', async () => {
    expect(await examinedTargets('examine candles', 'examine them')).toEqual(['candles', 'candles']);
    expect(await examinedTargets('examine lamp', 'examine it')).toEqual(['lamp', 'lamp']);
  });
});
