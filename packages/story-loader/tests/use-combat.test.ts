/**
 * use-combat.test.ts — ADR-215 AC-1/AC-3 through the REAL loader: `use
 * combat` registers `registerBasicCombat` at load, `combatant`/`weapon`
 * compose real traits (health on the REQUIRED HealthTrait per ADR-226,
 * stats on CombatantTrait), and a real stdlib attacking action resolves
 * through the extension's BasicCombatInterceptor with an asserted health
 * mutation. REAL-PATH per Integration Reality: real @sharpee/chord
 * compile of the use-combat.story fixture, real createStory/
 * initializeWorld, real attackingAction — no stubs of any owned
 * dependency. Rogue-IR backstops (`uses` stripped/unknown) are LoadErrors.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { attackingAction } from '@sharpee/stdlib';
import { CombatantTrait, HealthTrait, IFEntity, TraitType, WeaponTrait, WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'use-combat.story'),
  'utf8',
);

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const load = (mutate?: (ir: StoryIR) => void) => {
  const ir = compileSource(FIXTURE);
  mutate?.(ir);
  const story = createStory(ir, { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const entity = (slug: string): IFEntity => world.getEntity(story.entityId(slug)!)!;
  return { story, world, player, entity };
};

describe('use combat through the real loader (ADR-215 AC-1/AC-3)', () => {
  it('composes CombatantTrait + the required HealthTrait from `combatant with …` (ADR-226 split)', () => {
    const { entity } = load();
    const troll = entity('troll');
    const combatant = troll.get(TraitType.COMBATANT) as CombatantTrait;
    expect(combatant).toBeDefined();
    expect(combatant.skill).toBe(40);
    expect(combatant.hostile).toBe(true);
    const health = troll.get(TraitType.HEALTH) as HealthTrait;
    expect(health).toBeDefined();
    expect(health.health).toBe(20);
    expect(health.maxHealth).toBe(20);
  });

  it('composes WeaponTrait from `weapon with …`', () => {
    const { entity } = load();
    const weapon = entity('elvish-sword').get(TraitType.WEAPON) as WeaponTrait;
    expect(weapon).toBeDefined();
    expect(weapon.damage).toBe(5);
    expect(weapon.skillBonus).toBe(2);
  });

  it('AC-1 REAL-PATH: a real attack resolves through the BasicCombatInterceptor and mutates health', () => {
    const { world, player, entity } = load();
    const troll = entity('troll');
    const sword = entity('elvish-sword');
    world.moveEntity(sword.id, player.id);
    const initial = (troll.get(TraitType.HEALTH) as HealthTrait).health;

    const attackOnce = (): ISemanticEvent[] => {
      const context: any = {
        world,
        player,
        action: attackingAction,
        currentLocation: world.getContainingRoom(player.id),
        command: {
          parsed: { action: 'attack', extras: {}, structure: {} },
          directObject: { entity: troll },
          indirectObject: { entity: sword },
        },
        sharedData: {},
        requireScope: () => ({ ok: true }),
        canSee: () => true,
        canReach: () => true,
        requireCarriedOrImplicitTake: () => ({ ok: true }),
        event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
          ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
      };
      const validation = attackingAction.validate(context);
      expect(validation.valid, JSON.stringify(validation)).toBe(true);
      context.validationResult = validation;
      attackingAction.execute(context);
      return attackingAction.report(context);
    };

    // Combat hit rolls ride the extension's seeded stream — a few swings
    // guarantee at least one hit without touching story randomness.
    let health = initial;
    for (let swing = 0; swing < 12 && health >= initial; swing++) {
      attackOnce();
      health = (troll.get(TraitType.HEALTH) as HealthTrait).health;
    }
    expect(health).toBeLessThan(initial); // the interceptor's CombatService applied real damage
  });

  it('rogue IR without `uses` → LoadError naming `use combat` (loader backstop)', () => {
    expect(() => load((ir) => void (ir.uses = []))).toThrow(LoadError);
    expect(() => load((ir) => void (ir.uses = []))).toThrow(/use combat/);
  });

  it('rogue IR with an unknown use → LoadError naming the trusted set (AC-3)', () => {
    expect(() => load((ir) => void (ir.uses = ['foo']))).toThrow(LoadError);
    expect(() => load((ir) => void (ir.uses = ['foo']))).toThrow(/no trusted extension/);
  });
});
