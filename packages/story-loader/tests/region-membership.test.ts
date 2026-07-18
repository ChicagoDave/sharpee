/**
 * region-membership.test.ts — ADR-236 D1–D3 through the REAL loader
 * (AC-1): a Chord story with a nested region tree loads onto the platform
 * seam — region entities exist (RegionTrait), every member room's
 * `RoomTrait.regionId` is set via `assignRoom`, child regions carry
 * `parentRegionId`, and `world.isInRegion` is transitive through nesting.
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
    expect(regionTrait.parentRegionId).toBeUndefined();
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

  it('wires nesting: the child region carries parentRegionId (D3)', () => {
    const { world, worldId } = load();
    const mines = world.getEntity(worldId('mines'))!;
    expect((mines.get(TraitType.REGION) as RegionTrait).parentRegionId).toBe(worldId('underground'));
  });

  it('membership is transitive through nesting (isInRegion ancestry walk)', () => {
    const { world, worldId } = load();
    expect(world.isInRegion(worldId('coal-seam'), worldId('mines'))).toBe(true);
    expect(world.isInRegion(worldId('coal-seam'), worldId('underground'))).toBe(true);
    // Direct member of the parent, not of the child.
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
    expect(world.isInRegion(player.id, worldId('underground'))).toBe(true);
  });

  it('keeps region blocks composable: aka and description land on IdentityTrait (D1)', () => {
    const { world, worldId } = load();
    const identity = world.getEntity(worldId('underground'))!.get(TraitType.IDENTITY) as IdentityTrait;
    expect(identity.description).toContain('sunless country');
    expect(identity.aliases).toContain('the deep places');
  });

  it('is declaration-order independent: a child region declared before its parent still wires (pass-0 topo order)', () => {
    const { world, worldId } = load(`story "Order" by "T"
  id: order
  version: 0.0.1

create the Mines
  a region
  containing the Coal Seam

create the Coal Seam
  a room

  Coal.

create the Underground
  a region
  containing the Mines

create the player
  starts in the Coal Seam

  You.
`);
    const mines = world.getEntity(worldId('mines'))!;
    expect((mines.get(TraitType.REGION) as RegionTrait).parentRegionId).toBe(worldId('underground'));
    expect(world.isInRegion(worldId('coal-seam'), worldId('underground'))).toBe(true);
  });

  it('refuses rogue IR carrying a containment cycle with a LoadError (compiler gate bypassed)', () => {
    const ir = compileSource(FIXTURE);
    // Hand-corrupt the IR: make the child contain its own parent.
    const mines = ir.entities.find((e) => e.id === 'mines')!;
    mines.containing.push({ id: 'underground', span: mines.span });
    const story = createStory(ir, { seed: 11 });
    const world = new WorldModel();
    expect(() => story.initializeWorld(world)).toThrow(LoadError);
    expect(() => story.initializeWorld(world)).toThrow(/cycle/i);
  });
});
