/**
 * adr-328-npc-dialogue-scene.test.ts — the conversation-scene path keyed on
 * the ACTOR (ADR-328 Phase 4): a non-player actor addressing an NPC through
 * the real execution entry opens a scene seated on the speaker and the
 * addressee, never on the player, and its later moves stamp that scene's
 * clock. REAL-PATH: compiled Chord, the loader's world with the character
 * package's scene runtime bound, the real stdlib `talking` under a real
 * `CommandExecutor`. Assertions are on the scene store (participants,
 * opener, move clock) and on event payloads.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { CommandExecutor, EngineRandomService, type GameContext } from '@sharpee/engine';
import { EventProcessor } from '@sharpee/event-processor';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { IFActions, StandardActionRegistry, standardActions } from '@sharpee/stdlib';
import { WorldModel, sceneWith } from '@sharpee/world-model';
import type { IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const CHARACTER_TURN_KEY = 'character.turn';

/** The Phase 8 fixture: Alex (player) and Aemilia in the Hall, Bram in the Cell. */
const SOURCE =
  'story\n  title: T\n  authors:\n    N\n  id: npc-dialogue\n  story-version: 0.0.1\n\n' +
  'create the Hall\n  a room\n  east to the Yard\n\n  A hall.\n\n' +
  'create the Yard\n  a room\n  west to the Hall\n\n  A yard.\n\n' +
  'create the Cell\n  a room\n\n  A cell.\n\n' +
  'create Alex\n  a person\n  playable\n  in the Hall\n\n  Me.\n\nbefore the game starts\n  change the player to Alex\nend before\n\n' +
  'create Aemilia\n' +
  '  a person, proper\n' +
  '  in the Hall\n' +
  '  mood cheerful\n' +
  '  spreads chatty to anyone\n\n' +
  '  The gossip.\n\n' +
  'create Bram\n' +
  '  a person, proper\n' +
  '  in the Cell\n' +
  '  mood calm\n' +
  '  spreads nothing\n\n' +
  '  The stagehand.\n\n' +
  'define topics for Aemilia\n' +
  '  about "the tour":\n' +
  '    phrase aemilia-tour\n' +
  'end topics\n\n' +
  'define phrase aemilia-tour\n  "A grand tour."\nend phrase\n';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  entity: (irId: string) => IFEntity;
  /** Run `talk to <target>` as `actorId` through the real execution entry. */
  talk: (actorId: string, target: IFEntity) => ReturnType<CommandExecutor['executeAsActor']>;
}

function load(): Loaded {
  const story = createStory(compileSource(SOURCE), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  // The story's engine-ready hook binds the character layer the way the
  // engine would; the scene runtime this test drives is the real one.
  story.onEngineReady({ getPluginRegistry: () => ({ register: () => undefined }) });
  expect(world.getSceneRuntime()).toBeDefined();
  world.setStateValue(CHARACTER_TURN_KEY, 1);

  const language = new EnglishLanguageProvider();
  const registry = new StandardActionRegistry();
  for (const action of standardActions) registry.register(action);
  registry.setLanguageProvider(language);
  const executor = new CommandExecutor(
    world,
    registry,
    new EventProcessor(world),
    new EnglishParser(language, { world }),
    undefined,
    new EngineRandomService(7),
  );
  const gameContext: GameContext = {
    currentTurn: 1,
    player,
    history: [],
    metadata: { started: new Date(), lastPlayed: new Date() },
  };

  const entity = (irId: string) => world.getEntity(story.entityId(irId)!)!;
  return {
    story,
    world,
    player,
    entity,
    talk: (actorId, target) =>
      executor.executeAsActor({ actionId: IFActions.TALKING, actorId, directObject: target }, world, gameContext),
  };
}

describe('an NPC addressing an NPC opens the scene as itself (ADR-328 Phase 4)', () => {
  it('seats the speaker and the addressee, opened by the speaker — the player is nowhere in it', () => {
    const l = load();
    const bram = l.entity('bram');
    const aemilia = l.entity('aemilia');
    l.world.moveEntity(bram.id, l.story.entityId('hall')!);
    expect(sceneWith(l.world, bram.id)).toBeUndefined();

    const result = l.talk(bram.id, aemilia);

    expect(result.success).toBe(true);
    const scene = sceneWith(l.world, bram.id);
    expect(scene).toBeDefined();
    expect(scene!.participantIds).toEqual([bram.id, aemilia.id]);
    expect(scene!.openedBy).toEqual({ kind: 'address', openerId: bram.id });
    expect(sceneWith(l.world, l.player.id)).toBeUndefined();

    const talked = result.events.find((e) => e.type === 'if.event.talked');
    expect(talked).toBeDefined();
    expect(talked!.entities.actor).toBe(bram.id);
  });

  it("a later move by the speaker stamps its own scene's clock", () => {
    const l = load();
    const bram = l.entity('bram');
    const aemilia = l.entity('aemilia');
    l.world.moveEntity(bram.id, l.story.entityId('hall')!);

    l.talk(bram.id, aemilia);
    const opened = sceneWith(l.world, bram.id)!;
    // The dialogue clock is the turn being played: character.turn + 1.
    expect(opened.lastMoveTurn).toBe(2);

    l.world.setStateValue(CHARACTER_TURN_KEY, 4);
    l.talk(bram.id, aemilia);

    const moved = sceneWith(l.world, bram.id)!;
    expect(moved.id).toBe(opened.id);
    expect(moved.lastMoveTurn).toBe(5);
    expect(moved.participantIds).toEqual([bram.id, aemilia.id]);
    expect(sceneWith(l.world, l.player.id)).toBeUndefined();
  });

  it('the player addressing the same NPC through the same entry still opens the player\'s scene', () => {
    const l = load();
    const aemilia = l.entity('aemilia');

    const result = l.talk(l.player.id, aemilia);

    expect(result.success).toBe(true);
    const scene = sceneWith(l.world, l.player.id);
    expect(scene).toBeDefined();
    expect(scene!.participantIds).toEqual([l.player.id, aemilia.id]);
    expect(scene!.openedBy).toEqual({ kind: 'address', openerId: l.player.id });
    expect(sceneWith(l.world, l.entity('bram').id)).toBeUndefined();
  });
});
