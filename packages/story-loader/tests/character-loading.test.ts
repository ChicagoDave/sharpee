/**
 * character-loading.test.ts — ADR-310/318 Phase 5 through the REAL loader:
 * compiled character blocks instantiate onto entities at load (world-id
 * refs, passive NpcTrait composition, D7 no-model-no-change), the
 * character-model tick phase registers and runs through the real
 * NpcPlugin (observe sub-step, oracle-evaluated goal activation and
 * wait-for over the loader's evaluator), and the full trait rides the
 * REAL engine SaveRestoreService (gzip snapshot → loadJSON → rehydrator)
 * — ADR-310 Acceptance 7 and ADR-318 Acceptance 5's save/restore leg,
 * asserted on trait state after restore.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { EngineRandomService, SaveRestoreService, type GameContext } from '@sharpee/engine';
import { createSemanticEventSource, type ISemanticEvent } from '@sharpee/core';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { PluginRegistry } from '@sharpee/plugins';
import { CharacterModelTrait, IFEntity, NpcTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const SOURCE =
  'story\n  title: T\n  authors:\n    N\n  id: char-phase5\n  story-version: 0.0.1\n\n' +
  'define fact the killer\n  the Duke, nobody\nend fact\n\n' +
  'create the Parlor\n  a room\n\n  A parlor.\n\n' +
  'create the Cellar\n  a room\n\n  A cellar.\n\n' +
  'create the player\n  in the Parlor\n\n  Me.\n\n' +
  'create the Duke\n  a person\n  in the Parlor\n\n  Him.\n\n' +
  'create the Maid\n' +
  '  a person\n' +
  '  in the Parlor\n' +
  '  mood nervous\n' +
  '  feels wary of the Duke\n' +
  '  knows the secret, witnessed, confided\n' +
  '  thinks the killer is the Duke, suspects\n' +
  // The trailing player-in-Cellar wait never completes, so goal progress
  // stays observable (a goal whose last step completes deactivates).
  '  goal confess, high\n' +
  '    active when the Maid knows the secret\n' +
  '    wait for the Duke is in the Cellar\n' +
  '    wait for the player is in the Cellar\n' +
  '  end goal\n' +
  '\n' +
  '  Her.\n';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('Phase 5 — character blocks through the real loader', () => {
  let story: ChordStory;
  let world: WorldModel;
  let player: IFEntity;
  let npcPlugin: NpcPlugin;
  let turn: number;
  const random = new EngineRandomService(7);

  const maid = () => world.getEntity(story.entityId('maid')!)!;
  const duke = () => world.getEntity(story.entityId('duke')!)!;
  const maidTrait = () => maid().get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

  const tick = (actionEvents: ISemanticEvent[] = []) => {
    turn += 1;
    return npcPlugin.onAfterAction({
      world,
      turn,
      random,
      playerLocation: world.getLocation(player.id)!,
      playerId: player.id,
      actionEvents,
    } as never);
  };

  beforeEach(() => {
    story = createStory(compileSource(SOURCE), { seed: 11 });
    world = new WorldModel();
    story.initializeWorld(world);
    player = story.createPlayer(world);
    world.setPlayer(player.id);
    const plugins: unknown[] = [];
    story.onEngineReady({ getPluginRegistry: () => ({ register: (p: unknown) => plugins.push(p) }) });
    npcPlugin = plugins.find((p): p is NpcPlugin => p instanceof NpcPlugin)!;
    turn = 0;
  });

  it('instantiates the character block onto the entity with world-id refs', () => {
    const trait = maidTrait();
    expect(trait).toBeDefined();
    expect(trait.getMood()).toBe('nervous');
    // feels target keyed by the DUKE's WORLD id, not the IR id `duke`
    expect(trait.getDispositionWord(duke().id)).toBe('wary of');
    expect(Object.keys(trait.dispositions)).toEqual([duke().id]);
    // knowledge and valued belief land as authored
    expect(trait.knowledge['secret']).toMatchObject({ source: 'witnessed', confided: true });
    expect(trait.factBeliefs['killer']).toMatchObject({ value: 'duke', confidence: 'suspects' });
  });

  it('composes a passive NpcTrait on a character-model person without a behavior adjective', () => {
    const npcTrait = maid().get(TraitType.NPC) as NpcTrait;
    expect(npcTrait).toBeDefined();
    expect(npcTrait.behaviorId).toBe('passive');
    expect(npcTrait.canMove).toBe(false);
  });

  it('D7: a person without a character block gets no trait and no synthesized NpcTrait', () => {
    expect(duke().has(TraitType.CHARACTER_MODEL)).toBe(false);
    expect(duke().has(TraitType.NPC)).toBe(false);
  });

  it('the tick phase runs through the real NpcPlugin: observation mutates the trait', () => {
    const threatBefore = maidTrait().threatValue;
    tick([{ id: 'e1', type: 'if.event.attacked', timestamp: 0, entities: { actor: player.id }, data: {} }]);
    expect(maidTrait().threatValue).toBeGreaterThan(threatBefore);
    // ADR-310 D10: the raw wire type never becomes knowledge; the witnessed
    // attack lands only as act detection's derived topic (stable player name).
    expect(maidTrait().knowledge['if.event.attacked']).toBeUndefined();
    expect(maidTrait().knowledge['the player harmed']).toMatchObject({ source: 'witnessed' });
  });

  it('compiled goal conditions evaluate through the story oracle: knows-topic activates, wait-for gates on world state', () => {
    tick();
    // `active when the Maid knows the secret` held (knows-topic through the
    // loader's evaluator); `wait for the Duke is in the Cellar` did not.
    expect(maidTrait().goalState['confess']).toMatchObject({ active: true, currentStep: 0 });

    world.moveEntity(duke().id, story.entityId('cellar')!);
    tick();
    expect(maidTrait().goalState['confess']).toMatchObject({ active: true, currentStep: 1 });
  });

  describe('save/restore through the real SaveRestoreService (AC7 + ADR-318 AC5 leg)', () => {
    function provider(pluginRegistry: PluginRegistry) {
      const eventSource = createSemanticEventSource();
      return {
        getWorld: () => world,
        getContext: () =>
          ({ currentTurn: turn + 1, player, history: [], metadata: { started: new Date() } }) as unknown as GameContext,
        getStory: () => story,
        getEventSource: () => eventSource,
        getPluginRegistry: () => pluginRegistry,
        getParser: () => undefined,
        getRandomService: () => random,
      };
    }

    it('a belief/mood/goal-step change and a pinned lie survive save and restore on the trait', () => {
      // Reach a mid-story state: goal active (turn 1), then step advanced (turn 2).
      tick();
      world.moveEntity(duke().id, story.entityId('cellar')!);
      tick();
      const trait = maidTrait();
      // Belief change, mood change, and a minted-and-pinned claim (the lie
      // ledger's restored-liar leg — ADR-318 AC5).
      trait.factBeliefs['killer'] = { value: 'nobody', confidence: 'certain', source: 'inferred', turnLearned: turn, resistance: 'none' };
      trait.adjustMood(-0.4, 0.4);
      trait.ledger.push({ kind: 'claim', audience: player.id, factId: 'killer', claimedValue: 'nobody', turnMinted: turn, pinned: true });
      const savedMood = trait.getMood();
      const savedGoalState = JSON.parse(JSON.stringify(trait.goalState));

      const svc = new SaveRestoreService();
      const registry = new PluginRegistry();
      const saveData = svc.createSaveData(provider(registry));

      // Mutate PAST the save point — restore must roll all of it back.
      trait.factBeliefs['killer'] = { value: 'duke', confidence: 'uncertain', source: 'told', turnLearned: turn + 1, resistance: 'none' };
      trait.setMood('cheerful');
      trait.ledger.length = 0;
      trait.goalState['confess'].currentStep = 0;

      svc.loadSaveData(saveData, provider(registry));

      // Same world instance, wholesale-replaced state: re-fetch the entity.
      const restored = maidTrait();
      expect(restored.factBeliefs['killer']).toMatchObject({ value: 'nobody', confidence: 'certain', source: 'inferred' });
      expect(restored.getMood()).toBe(savedMood);
      expect(restored.goalState).toEqual(savedGoalState);
      // The restored liar is still pinned (ADR-318 AC5 save/restore leg).
      expect(restored.ledger).toEqual([
        { kind: 'claim', audience: player.id, factId: 'killer', claimedValue: 'nobody', turnMinted: 2, pinned: true },
      ]);
      // And the restored trait evaluates predicates — the rehydrated
      // instance rebuilds its transient predicate registry.
      expect(restored.evaluate('not threatened')).toBe(true);
      expect(Object.keys(restored.dispositions)).toEqual([duke().id]);
    });
  });
});
