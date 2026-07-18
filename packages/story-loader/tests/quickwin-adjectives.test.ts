/**
 * quickwin-adjectives.test.ts — chord go-live G1 mechanical shortlist
 * (2026-07-17, ratchet G1-G4 + defect fixes D1/D3):
 *
 *   - D1: `pushable`/`pullable` loader cases (catalog↔loader contract break)
 *   - G1: `drinkable` → EdibleTrait liquid marker, order-independent with `edible`
 *   - G2: `concealed` → IdentityTrait.concealed marker
 *   - G3: `hiding-spot` → ConcealmentTrait (bare = all positions; narrowed)
 *   - G4/D3: `openable with the <tool>` (keyless per R3) resolved to a WORLD id (was silently dropped)
 *   - turning: REAL-PATH — a Chord `on turning it` clause drives stdlib's
 *     rewritten turningAction end-to-end (real compiler, real loader, real
 *     registered interceptor; the ADR-228 D5 registry row is what un-deads
 *     the gerund)
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { turningAction } from '@sharpee/stdlib';
import {
  ConcealmentTrait,
  EdibleTrait,
  IdentityTrait,
  IFEntity,
  OpenableTrait,
  TraitType,
  WorldModel
} from '@sharpee/world-model';
import { ChordStory, createStory, LoadError } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

function loadStory(source: string): { story: ChordStory; world: WorldModel; player: IFEntity } {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

const storyWith = (body: string) => `story "Quickwin" by "T"
  id: quickwin
  version: 0.0.1

create the Shed
  a room

  A shed.

create the Bin
  a room

  A bin room.

${body}

create the player
  starts in the Shed

  You.
`;

describe('D1: pushable/pullable loader cases', () => {
  it('loads a pushable entity (previously a misleading LoadError) and stamps the trait', () => {
    const { story, world } = loadStory(storyWith(`create the boulder
  in the Shed
  pushable

  A boulder.`));
    const boulder = world.getEntity(story.entityId('boulder')!)!;
    expect(boulder.has(TraitType.PUSHABLE)).toBe(true);
  });

  it('loads a pullable entity and stamps the trait', () => {
    const { story, world } = loadStory(storyWith(`create the lever
  in the Shed
  pullable

  A lever.`));
    const lever = world.getEntity(story.entityId('lever')!)!;
    expect(lever.has(TraitType.PULLABLE)).toBe(true);
  });
});

describe('G1: drinkable liquid marker', () => {
  it('composes EdibleTrait with liquid=true', () => {
    const { story, world } = loadStory(storyWith(`create the potion
  in the Shed
  drinkable

  A potion.`));
    const potion = world.getEntity(story.entityId('potion')!)!;
    const edible = potion.get(TraitType.EDIBLE) as EdibleTrait;
    expect(edible).toBeDefined();
    expect(edible.liquid).toBe(true);
  });

  it('is order-independent with `edible` (both orders keep the liquid flag)', () => {
    for (const composition of ['edible, drinkable', 'drinkable, edible']) {
      const { story, world } = loadStory(storyWith(`create the broth
  in the Shed
  ${composition}

  Broth.`));
      const broth = world.getEntity(story.entityId('broth')!)!;
      const edible = broth.get(TraitType.EDIBLE) as EdibleTrait;
      expect(edible.liquid, composition).toBe(true);
    }
  });
});

describe('G2: concealed marker', () => {
  it('sets IdentityTrait.concealed so searching has something to reveal', () => {
    const { story, world } = loadStory(storyWith(`create the key
  in the Shed
  concealed

  A key.`));
    const key = world.getEntity(story.entityId('key')!)!;
    const identity = key.get(TraitType.IDENTITY) as IdentityTrait;
    expect(identity).toBeDefined();
    expect(identity.concealed).toBe(true);
  });
});

describe('G3: hiding-spot adjective', () => {
  it('bare form supports every hiding position', () => {
    const { story, world } = loadStory(storyWith(`create the curtain
  in the Shed
  hiding-spot

  A curtain.`));
    const curtain = world.getEntity(story.entityId('curtain')!)!;
    const concealment = curtain.get(ConcealmentTrait.type) as ConcealmentTrait;
    expect(concealment).toBeDefined();
    expect(concealment.positions.sort()).toEqual(['behind', 'inside', 'on', 'under']);
  });

  it('`with position behind` narrows to exactly that position', () => {
    const { story, world } = loadStory(storyWith(`create the curtain
  in the Shed
  hiding-spot with position behind

  A curtain.`));
    const curtain = world.getEntity(story.entityId('curtain')!)!;
    const concealment = curtain.get(ConcealmentTrait.type) as ConcealmentTrait;
    expect(concealment.positions).toEqual(['behind']);
  });

  it('rejects a word that is not a hiding position at load time', () => {
    const source = storyWith(`create the curtain
  in the Shed
  hiding-spot with position sideways

  A curtain.`);
    expect(() => loadStory(source)).toThrowError(LoadError);
    expect(() => loadStory(source)).toThrowError(/not a hiding position/);
  });
});

describe('G4/D3: openable tool config', () => {
  it('stamps the tool as a resolved WORLD id, not a raw name (was silently dropped)', () => {
    const { story, world } = loadStory(storyWith(`create the crate
  in the Shed
  openable with the crowbar

  A crate.

create the crowbar
  in the Shed

  A crowbar.`));
    const crate = world.getEntity(story.entityId('crate')!)!;
    const crowbarWorldId = story.entityId('crowbar')!;
    const openable = crate.get(TraitType.OPENABLE) as OpenableTrait;
    expect(openable).toBeDefined();
    expect(openable.toolId).toBe(crowbarWorldId);
    expect(openable.toolId).not.toBe('crowbar');
  });

  it('rejects a tool name that matches no entity', () => {
    const source = storyWith(`create the crate
  in the Shed
  openable with the ghostbar

  A crate.`);
    expect(() => loadStory(source)).toThrowError(/`ghostbar` \(config `tool`\) names no entity/);
  });
});

describe('turning: `on turning it` through stdlib turningAction (REAL-PATH)', () => {
  it('loads the clause (dead-gerund gate passes) and the turn mutates the world', () => {
    const { story, world, player } = loadStory(storyWith(`create the crank
  in the Shed
  scenery

  A crank.

  on turning it
    phrase crank-groans
    move the prize to the Shed
  end on

create the prize
  in the Bin

  A prize.

define phrase crank-groans
  The crank groans and something drops nearby.
end phrase`));
    const crank = world.getEntity(story.entityId('crank')!)!;
    const prize = world.getEntity(story.entityId('prize')!)!;

    // Structural ActionContext (cuttable.test.ts precedent) over the REAL
    // loader-built world — the interceptor consulted is the one the loader
    // registered from the story source.
    const context: any = {
      world,
      player,
      action: turningAction,
      command: {
        directObject: { entity: crank }
      },
      sharedData: {},
      requireScope: () => ({ ok: true }),
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent
    };

    const validation = turningAction.validate(context);
    context.validationResult = validation;
    expect(validation.valid, JSON.stringify(validation)).toBe(true);

    // PRECONDITION: prize starts in the Bin.
    expect(world.getLocation(prize.id)).toBe(story.entityId('bin')!);

    turningAction.execute(context);
    const events = turningAction.report(context);

    // THE state assertion: the clause's mutation landed — prize moved.
    expect(world.getLocation(prize.id)).toBe(story.entityId('shed')!);
    expect(events.some((e) => e.type === 'if.event.turned')).toBe(true);
  });

  it('an entity with no turning implementation refuses with cant_turn_that', () => {
    const { story, world, player } = loadStory(storyWith(`create the statue
  in the Shed

  A statue.`));
    const statue = world.getEntity(story.entityId('statue')!)!;

    const context: any = {
      world,
      player,
      action: turningAction,
      command: { directObject: { entity: statue } },
      sharedData: {},
      requireScope: () => ({ ok: true }),
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent
    };

    const validation = turningAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('cant_turn_that');
  });
});
