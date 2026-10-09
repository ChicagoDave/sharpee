/**
 * region-membership.test.ts — ADR-236 D1 and ADR-360 D4/D5 through the
 * REAL loader: a Chord story whose rooms name their regions with `in` lines
 * loads onto the platform seam — region entities exist (RegionTrait), every
 * member room's `RoomTrait.regionId` is set via `assignRoom`, and
 * `world.isInRegion` answers for the room's one region. Rogue IR naming a
 * member that is not a room (another region, or nothing) is the loader's
 * backstop, since regions do not nest (ADR-360 D5).
 * REAL-PATH per Integration Reality: real @sharpee/chord compile of the
 * region-nesting.story fixture, real createStory/initializeWorld — no
 * stubs; every assertion reads loaded world trait state.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { IdentityTrait, RegionTrait, RoomTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { LoadError } from '../src/errors';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'region-nesting.story'),
  'utf8',
);

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const load = (source: string = FIXTURE) => {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const worldId = (slug: string): string => story.entityId(slug)!;
  return { story, world, player, worldId };
};

describe('region loading (ADR-236 AC-1, REAL-PATH)', () => {
  it('creates region entities with RegionTrait on the loaded world', () => {
    const { world, worldId } = load();
    const underground = world.getEntity(worldId('underground'))!;
    const regionTrait = underground.get(TraitType.REGION) as RegionTrait;
    expect(regionTrait).toBeDefined();
    expect(regionTrait.name).toBe('Underground');
  });

  it('sets every member room regionId through the assignRoom seam', () => {
    const { world, worldId } = load();
    const roomRegion = (slug: string) =>
      (world.getEntity(worldId(slug))!.get(TraitType.ROOM) as RoomTrait).regionId;
    expect(roomRegion('round-room')).toBe(worldId('underground'));
    expect(roomRegion('shaft-top')).toBe(worldId('mines'));
    expect(roomRegion('coal-seam')).toBe(worldId('mines'));
    // The control room joined no region.
    expect(roomRegion('surface-camp')).toBeUndefined();
  });

  // ADR-360 D5: regions do not nest, so membership never reaches through
  // one region to another. Each room is in at most one region.
  it('a room is in its own region and in no other', () => {
    const { world, worldId } = load();
    expect(world.isInRegion(worldId('coal-seam'), worldId('mines'))).toBe(true);
    expect(world.isInRegion(worldId('coal-seam'), worldId('underground'))).toBe(false);
    expect(world.isInRegion(worldId('round-room'), worldId('underground'))).toBe(true);
    expect(world.isInRegion(worldId('round-room'), worldId('mines'))).toBe(false);
    expect(world.isInRegion(worldId('surface-camp'), worldId('underground'))).toBe(false);
  });

  it('resolves the player through their containing room (the D4 presence substrate)', () => {
    const { world, player, worldId } = load();
    // Starts in the Surface Camp — outside every region.
    expect(world.isInRegion(player.id, worldId('underground'))).toBe(false);
    world.moveEntity(player.id, worldId('coal-seam'));
    expect(world.isInRegion(player.id, worldId('mines'))).toBe(true);
    expect(world.isInRegion(player.id, worldId('underground'))).toBe(false);
  });

  it('keeps region blocks composable: aka and description land on IdentityTrait (D1)', () => {
    const { story, world, worldId } = load();
    const identity = world.getEntity(worldId('underground'))!.get(TraitType.IDENTITY) as IdentityTrait;
    // ADR-333 D1a: the trait carries the description key; the text is registered under it.
    const registered = new Map<string, string>();
    story.extendLanguage({ addMessage: (id: string, t: string) => registered.set(id, t) } as never);
    expect(identity.descriptionId).toBe('underground.description');
    expect(registered.get(identity.descriptionId!)).toContain('sunless country');
    expect(identity.aliases).toContain('the deep places');
  });

  it('is declaration-order independent: a member room declared before its region still wires', () => {
    const { world, worldId } = load(`story
  title: Order
  authors:
    T
  id: order
  story-version: 0.0.1

create the Coal Seam
  a room
  in the Mines

  Coal.

create the Mines
  a region

create Alex
  a person
  playable
  starts in the Coal Seam

  You.

before the game starts
  change the player to Alex
end before

`);
    const coalSeam = world.getEntity(worldId('coal-seam'))!;
    expect((coalSeam.get(TraitType.ROOM) as RoomTrait).regionId).toBe(worldId('mines'));
    expect(world.isInRegion(worldId('coal-seam'), worldId('mines'))).toBe(true);
  });

  it('refuses rogue IR listing a region as another region\'s member with a LoadError (regions do not nest)', () => {
    const ir = compileSource(FIXTURE);
    // Hand-corrupt the IR: the compiler cannot produce a region member.
    const mines = ir.entities.find((e) => e.id === 'mines')!;
    mines.containing.push({ id: 'underground', span: mines.span });
    const story = createStory(ir, { seed: 11 });
    const world = new WorldModel();
    let thrown: unknown;
    try {
      story.initializeWorld(world);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(LoadError);
    expect((thrown as LoadError).message).toMatch(/`underground` is listed as a member of .* but is not a room/);
  });

  it('refuses rogue IR listing a member id no entity carries with a LoadError', () => {
    const ir = compileSource(FIXTURE);
    const mines = ir.entities.find((e) => e.id === 'mines')!;
    mines.containing.push({ id: 'nowhere', span: mines.span });
    const story = createStory(ir, { seed: 11 });
    const world = new WorldModel();
    expect(() => story.initializeWorld(world)).toThrow(/`nowhere` is listed as a member of .* but is not a room/);
  });
});
