/**
 * gatehouse.test.ts — the ADR-215/216 elegance-parity fixture (Phase 7):
 * the FULL S3 stack in one coherent story — `use combat` +
 * `use state-machines`, a guard combatant, a patrol NPC, a role-bound
 * drawbridge machine, payloaded emits feeding a custom channel, media
 * sugar behind `client has sound` — proving the whole surface composes in
 * ~90 lines of Chord that would take several hand-written TS files
 * (elegance parity, both directions). Each subsystem's deep coverage
 * lives in its own suite; this is the composition smoke over the REAL
 * loader, plugins, and channels.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { createSeededRandom } from '@sharpee/core';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { StateMachinePlugin } from '@sharpee/plugin-state-machine';
import { StdlibChannelRegistry } from '@sharpee/stdlib';
import { TraitType, WorldModel, CombatantTrait, HealthTrait } from '@sharpee/world-model';
import { createStory } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'gatehouse.story'),
  'utf8',
);

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('the gatehouse — full S3 stack in one story (elegance parity)', () => {
  it('compiles pure-IR and loads every subsystem together', () => {
    const ir = compileSource(FIXTURE);
    expect(ir.hasHatches).toBe(false); // the ENTIRE stack is pure IR
    expect(ir.uses.sort()).toEqual(['combat', 'state-machines']);

    const story = createStory(ir, { seed: 11 });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    const plugins: unknown[] = [];
    story.onEngineReady({
      getPluginRegistry: () => ({ register: (p: unknown) => plugins.push(p) }),
      getClientCapabilities: () => ({ text: true, sound: true }),
    });
    const registry = new StdlibChannelRegistry();
    story.registerChannels(registry);

    // Combat: real traits composed, real interceptor registered.
    const ogre = world.getEntity(story.entityId('ogre')!)!;
    expect((ogre.get(TraitType.COMBATANT) as CombatantTrait).skill).toBe(45);
    expect((ogre.get(TraitType.HEALTH) as HealthTrait).health).toBe(24);

    // NPC core + state-machines both auto-registered their real plugins.
    const npcPlugin = plugins.find((p) => p instanceof NpcPlugin) as NpcPlugin;
    const smPlugin = plugins.find((p) => p instanceof StateMachinePlugin) as StateMachinePlugin;
    expect(npcPlugin).toBeDefined();
    expect(smPlugin).toBeDefined();
    expect(smPlugin.getRegistry().getMachineState('chord.machine.drawbridge')).toBe('raised');

    // The patrol keeper actually walks (real NpcPlugin tick).
    const keeperStart = world.getLocation(story.entityId('keeper')!);
    npcPlugin.onAfterAction({
      world,
      turn: 1,
      random: createSeededRandom(7),
      playerLocation: world.getLocation(player.id)!,
      playerId: player.id,
      actionEvents: [],
    } as never);
    expect(world.getLocation(story.entityId('keeper')!)).not.toBe(keeperStart);

    // The machine transitions on the role-bound action and runs its body
    // (phrase + capability-gated sound sugar → real events).
    const fired = smPlugin.onAfterAction({
      world,
      turn: 2,
      playerId: player.id,
      playerLocation: world.getLocation(player.id)!,
      actionResult: { actionId: 'if.action.turning', success: true, targetId: story.entityId('rusty-winch')! },
      actionEvents: [],
    } as never);
    expect(smPlugin.getRegistry().getMachineState('chord.machine.drawbridge')).toBe('lowering');
    expect(fired.some((e) => e.type === 'media.sound.play')).toBe(true); // client has sound

    // The story daemon's payloaded emit feeds the declared channel.
    const daemons = story.runtime.buildSchedulerDaemons();
    const events = daemons.flatMap((d) => d.run({ world, turn: 3 }));
    const watch = registry.get('watch')!;
    const packet = watch.produce({ events } as never) as Record<string, unknown>;
    expect(packet.post).toBe(world.getLocation(player.id));
    expect(packet.alarm).toBe('quiet');
  });
});
