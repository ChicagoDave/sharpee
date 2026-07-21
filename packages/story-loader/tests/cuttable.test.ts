/**
 * cuttable.test.ts — ADR-230 D3c: the `cuttable` trait adjective, tool
 * name → WORLD id resolution (forward references legal, no raw-string
 * config), the load-time implementation check (dual-surface re-pin:
 * exactly one `on cutting it` clause or capability behavior), and the
 * REAL-PATH cut: a Chord-compiled story drives stdlib's cuttingAction
 * end-to-end — real compiler, real loader, real registered interceptor,
 * no hand-rolled stand-in for any owned dependency.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { cuttingAction } from '@sharpee/stdlib';
import { IFEntity, TraitType, WorldModel, CuttableTrait } from '@sharpee/world-model';
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

const storyWith = (body: string) => `story "Cut" by "T"
  id: cut
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

create the knife
  in the Shed

  A knife.
`;

const CUTTABLE_ROPE = `create the rope
  in the Shed
  cuttable with the knife

  A rope.

  on cutting it
    phrase rope-severed
    move the rope to the Bin
  end on

define phrase rope-severed
  The rope parts with a snap.
end phrase`;

describe('cuttable trait adjective (ADR-230 D3c)', () => {
  it('loads clean and stamps the tool as a resolved WORLD id, not a raw name', () => {
    const { story, world } = loadStory(storyWith(CUTTABLE_ROPE));
    const rope = world.getEntity(story.entityId('rope')!)!;
    const knifeWorldId = story.entityId('knife')!;

    const cuttable = rope.get(TraitType.CUTTABLE) as CuttableTrait;
    expect(cuttable).toBeDefined();
    // The lockable-bug class: config must NOT be the display-name string.
    expect(cuttable.toolId).toBe(knifeWorldId);
    expect(cuttable.toolId).not.toBe('knife');
  });

  it('rejects a cuttable with no cutting implementation at load time', () => {
    const source = storyWith(`create the rope
  in the Shed
  cuttable with the knife

  A rope.`);
    expect(() => loadStory(source)).toThrowError(LoadError);
    expect(() => loadStory(source)).toThrowError(/registers no cutting implementation/);
  });

  it('rejects a tool name that matches no entity', () => {
    const source = storyWith(`create the rope
  in the Shed
  cuttable with the chainsaw

  A rope.

  on cutting it
    phrase nope
  end on

define phrase nope
  Snip.
end phrase`);
    expect(() => loadStory(source)).toThrowError(/`chainsaw` \(config `tool`\) names no entity/);
  });

  it('diggable rides the same machinery, and `carries` lands start inventory (ADR-230 Phase 6)', () => {
    const source = `story "Dig" by "T"
  id: dig
  version: 0.0.1

create the Beach
  a room

  A beach.

create the player
  starts in the Beach
  carries the shovel

  You.

create the shovel

  A shovel.

create the sand
  in the Beach
  diggable with the shovel

  Sand.

  on digging it
    phrase sand-shifts
  end on

define phrase sand-shifts
  The sand shifts.
end phrase
`;
    const { story, world, player } = loadStory(source);
    const sand = world.getEntity(story.entityId('sand')!)!;
    const shovelWorldId = story.entityId('shovel')!;

    // Diggable trait stamped with the resolved WORLD id.
    const diggable = sand.get('diggable' as never) as { toolId?: string };
    expect(diggable).toBeDefined();
    expect(diggable.toolId).toBe(shovelWorldId);

    // `carries the shovel` actually lands in the player's inventory —
    // previously this line compiled silently and did nothing.
    expect(world.getLocation(shovelWorldId)).toBe(player.id);
  });

  it('rejects a diggable with no digging implementation at load time', () => {
    const source = storyWith(`create the sand
  in the Shed
  diggable

  Sand.`);
    expect(() => loadStory(source)).toThrowError(/registers no digging implementation/);
  });

  it('rejects TWO cutting implementations (entity clause + composed trait clause)', () => {
    const source = storyWith(`define trait severable
  phrases en-US
    trait-snip:
      Snip.

  on cutting it
    phrase trait-snip
  end on
end trait

create the rope
  in the Shed
  severable, cuttable with the knife

  A rope.

  on cutting it
    phrase entity-snip
  end on

define phrase entity-snip
  Snap.
end phrase`);
    expect(() => loadStory(source)).toThrowError(/has 2 cutting implementations/);
  });

  it('REAL-PATH: the Chord on-cutting clause implements the cut through stdlib cuttingAction', () => {
    const { story, world, player } = loadStory(storyWith(CUTTABLE_ROPE));
    const rope = world.getEntity(story.entityId('rope')!)!;
    const knife = world.getEntity(story.entityId('knife')!)!;

    // Chord has no carries-at-start surface (IR carries only `wears`) —
    // hand the player the knife as world setup, not as a stub.
    world.moveEntity(knife.id, player.id);
    expect(world.getLocation(knife.id)).toBe(player.id);

    // Structural ActionContext (dispatch.test.ts precedent) over the REAL
    // loader-built world — the interceptor consulted is the one the loader
    // registered from the story source.
    const context: any = {
      world,
      player,
      action: cuttingAction,
      command: {
        directObject: { entity: rope },
        indirectObject: { entity: knife },
        preposition: 'with'
      },
      sharedData: {},
      requireScope: () => ({ ok: true }),
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
    };

    const validation = cuttingAction.validate(context);
    context.validationResult = validation;
    expect(validation.valid, JSON.stringify(validation)).toBe(true);

    // PRECONDITION: rope starts in the Shed.
    expect(world.getLocation(rope.id)).toBe(story.entityId('shed')!);

    cuttingAction.execute(context);
    const events = cuttingAction.report(context);

    // THE state assertion: the story clause's mutation landed in the world —
    // the rope moved to the Bin.
    expect(world.getLocation(rope.id)).toBe(story.entityId('bin')!);
    // The cut event fired (the clause's phrase rides the interceptor).
    expect(events.some((e) => e.type === 'if.event.cut')).toBe(true);
  });
});
