/**
 * gh-275-subject-change-occasion.test.ts — GH #275 on the REAL path: a
 * subject change the PLAYER makes (asking a different topic) seizes an
 * authored `when the subject changes:` initiative row on the same turn's
 * tick. The action-side stamp and the tick's clock read are on one scale
 * (`character.turn` is written as the tick completes, not as it starts).
 *
 * Harness: the adr-320-phase8 shape — compiled Chord through the real
 * loader, the real stdlib asking action over the live world, the engine's
 * own actor phase driven by hand with the engine's call shape.
 *
 * Owner context: story-loader tests (secret-letter-port-platform-defects
 * plan Phase 2, P-6 case d).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { createSeededRandom, deriveStreamSeed, type ChoicePoint, type RandomService, type SeededRandom } from '@sharpee/core';
import type { ISound } from '@sharpee/if-domain';
import { askingAction, talkingAction } from '@sharpee/stdlib';
import { sceneWith, type IFEntity } from '@sharpee/world-model';
import { bootEngine } from './helpers/boot-engine';

const SOURCE =
  'story\n  title: T\n  authors:\n    N\n  id: gh275\n  story-version: 0.0.1\n\n' +
  'create the Hall\n  a room\n\n  A hall.\n\n' +
  'create Alex\n  a person\n  playable\n  in the Hall\n\n  Me.\n\nbefore the game starts\n  change the player to Alex\nend before\n\n' +
  'create Aemilia\n' +
  '  a person, proper\n' +
  '  in the Hall\n' +
  '  mood cheerful\n' +
  '  spreads nothing\n\n' +
  '  The gossip.\n\n' +
  'define topics for Aemilia\n' +
  '  about "the tour":\n' +
  '    phrase aemilia-tour\n' +
  '  about "the weather":\n' +
  '    phrase aemilia-weather\n' +
  'end topics\n\n' +
  'define initiative for Aemilia\n' +
  '  when the subject changes:\n' +
  '    phrase aemilia-marks-the-turn\n' +
  'end initiative\n\n' +
  'define phrase aemilia-tour\n  "A grand tour."\nend phrase\n' +
  'define phrase aemilia-weather\n  "Fine, for the season."\nend phrase\n' +
  'define phrase aemilia-marks-the-turn\n  "You do change the subject quickly."\nend phrase\n';

function fixtureRandom(masterSeed = 12345): RandomService {
  const streams = new Map<string, SeededRandom>();
  const streamFor = (name: string): SeededRandom => {
    let s = streams.get(name);
    if (!s) {
      s = createSeededRandom(deriveStreamSeed(masterSeed, name));
      streams.set(name, s);
    }
    return s;
  };
  return {
    chance: (p: ChoicePoint<'yes' | 'no'>, probability: number) => streamFor(p.name).chance(probability),
    int: (p: ChoicePoint, min: number, max: number) => streamFor(p.name).int(min, max),
    pick: <T>(p: ChoicePoint, items: readonly T[]) => streamFor(p.name).pick([...items]),
    resolve: <C extends string, R>(p: ChoicePoint<C>, sample: (draw: SeededRandom) => { cls: C; value: R }) =>
      sample(streamFor(p.name)),
  } as RandomService;
}

function load() {
  const { story, world, player, phase } = bootEngine(SOURCE, 7);
  const sounds: ISound[] = [];
  const entity = (irId: string): IFEntity => world.getEntity(story.entityId(irId)!)!;
  /** One NPC turn through the engine's actor phase (the engine's own call shape). */
  const tick = (turn: number): ISemanticEvent[] =>
    phase.onAfterAction({
      world,
      turn,
      playerId: player.id,
      playerLocation: world.getLocation(player.id)!,
      random: fixtureRandom(),
      actionEvents: [],
      emitSound: (s) => sounds.push(s),
    });
  /** The player converses, through a real conversation action's four phases over the live world. */
  const run = (action: typeof askingAction, npcIrId: string, text?: string): ISemanticEvent[] => {
    const currentLocation = world.getContainingRoom(player.id) ?? world.getEntity(world.getLocation(player.id)!)!;
    const context = {
      world,
      player,
      actor: player,
      action,
      currentLocation,
      command: { directObject: { entity: entity(npcIrId) }, ...(text !== undefined ? { topic: { text } } : {}) },
      sharedData: {},
      canSee: (target: IFEntity) => world.getVisible(player.id).some((e) => e.id === target.id),
      requireScope: (target: IFEntity) =>
        world.getInScope(player.id).some((e) => e.id === target.id)
          ? { ok: true }
          : { ok: false, error: { valid: false, error: 'not_in_scope' } },
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: { actor: player.id }, data }) as ISemanticEvent,
    } as never;
    const validation = action.validate(context);
    (context as { validationResult?: unknown }).validationResult = validation;
    if (!validation.valid) throw new Error(`${action.id} refused: ${validation.error}`);
    action.execute(context);
    return action.report(context);
  };
  /** `talk to <npc>` — the address that opens the player's scene with the NPC. */
  const talk = (npcIrId: string) => run(talkingAction, npcIrId);
  /** `ask <npc> about <text>` — a topic move on the open scene. */
  const ask = (npcIrId: string, text: string) => run(askingAction, npcIrId, text);
  return { story, world, player, sounds, entity, tick, talk, ask };
}

describe('GH #275: a player-made subject change seizes `when the subject changes:`', () => {
  it('the action-side stamp and the tick’s clock agree, so the row fires on that turn’s tick', () => {
    const l = load();
    const aemilia = l.entity('aemilia');

    l.talk('aemilia'); // turn 1's action: the address opens the scene
    l.tick(1);
    l.ask('aemilia', 'the tour'); // turn 2's action: the thread is `tour`
    l.tick(2); // two completed ticks: the mirror reads 2, the player acts in turn 3
    l.ask('aemilia', 'the weather'); // turn 3's action: `tour` is abandoned
    const scene = sceneWith(l.world, aemilia.id);
    expect(scene).toBeDefined();
    expect(scene!.currentTopic).toBe('weather');
    expect(scene!.abandonedTopic).toBe('tour');
    // The stamp is turn 3 — the turn the player acted in.
    expect(scene!.subjectChangedTurn).toBe(3);

    const events = l.tick(3); // the same turn's tick reads 3 too

    const utterance = events.find(
      (e) => e.type === 'character.scene.utterance' && (e.data as { messageId?: string }).messageId === 'aemilia-marks-the-turn',
    );
    expect(utterance).toBeDefined();
    expect(l.sounds.some((s) => s.content?.messageId === 'aemilia-marks-the-turn')).toBe(true);
  });

  it('the same topic again is not a change: the row stays quiet', () => {
    const l = load();
    l.talk('aemilia');
    l.tick(1);
    l.ask('aemilia', 'the tour');
    l.tick(2);
    l.ask('aemilia', 'the tour');
    const events = l.tick(3);
    expect(events.some((e) => e.type === 'character.scene.utterance' && (e.data as { messageId?: string }).messageId === 'aemilia-marks-the-turn')).toBe(false);
    expect(l.sounds.some((s) => s.content?.messageId === 'aemilia-marks-the-turn')).toBe(false);
  });
});
