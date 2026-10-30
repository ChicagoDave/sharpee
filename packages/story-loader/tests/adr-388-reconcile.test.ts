/**
 * adr-388-reconcile.test.ts — ADR-388 AC-6 and AC-7, REAL-PATH: a save
 * written by one compile of a story restores, through the real engine's
 * restore turn, into an edited compile that added a room, an exit, an
 * entity and a landing room, removed a clause and renamed a chapter. The
 * reconciler adds, drops, re-seeds and reports; equal stamps skip it.
 * Real engine, real parser, real `SaveRestoreService`, the real platform
 * dispatcher; no doubles.
 *
 * Behavior Statement — `ChordStory.onWorldRestored` → `reconcileRestoredWorld`
 *   DOES: builds and places every entity the manifest declares and the
 *         save lacks; wires every exit a held room lacks; removes the
 *         `chord.*` keys the manifest declares no identity for; re-seeds an
 *         un-authored landing list from the current story; and returns a
 *         report naming each, plus every stored value it could not map and
 *         left in place. The engine delivers the report as
 *         `platform.save_reconciled` after `platform.restore_completed`,
 *         and a `game.message` under `core.save_reconciled` only when
 *         something was unmappable.
 *   WHEN: the save's `identityStamp` differs from the installed story's.
 *   BECAUSE: a player's save must survive an author's update (ADR-388
 *            Context), with new content present and nothing guessed.
 *   REJECTS WHEN: never — a mismatched save is reconciled, not refused;
 *                 matching stamps run no reconciler and deliver no report.
 *
 * Public interface: none — a test module. Owner context: `@sharpee/story-loader`.
 */
import { describe, expect, it } from 'vitest';
import type { ISaveData, ISemanticEvent } from '@sharpee/core';
import { CHAPTER_CURRENT_KEY, CHAPTER_FIRED_PREFIX } from '@sharpee/ext-chapters';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { type RoomTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { clauseOccurrenceKey, landingKey, type LandingRecord } from '../src/state-keys';
import { compileSource } from './helpers/boot-engine';

interface Edit {
  /** The name of the chapter the Yard begins; the edit renames it. */
  yardChapter: string;
  landing: string;
  hallExits: string;
  blocks: string;
  lampClause: string;
}

const ORIGINAL: Edit = {
  yardChapter: 'yard',
  landing: 'landing, cycling: the Hall, the Yard',
  hallExits: '  east to the Yard',
  // The bell exists only in the original: the edit removes it.
  blocks: `
create the bell
  a thing
  in the Hall

  A bell.
`,
  lampClause: `
  on the player examining, once
    phrase gleam
  end on
`,
};

const EDITED: Edit = {
  yardChapter: 'lane',
  landing: 'landing, cycling: the Hall, the Yard, the Attic',
  hallExits: '  east to the Yard\n  north to the Attic',
  blocks: `
create the Attic
  a room
  in the Market

  An attic.

create the coin
  a thing
  in the Attic

  A coin.
`,
  lampClause: '',
};

const SOURCE = (e: Edit) => `story
  title: Reconcile
  authors:
    T
  id: reconcile
  story-version: 0.0.1
  use chapters

define phrases en-US
  gleam:
    The lamp gleams, just this once.

define chapters
  market - Chapter I
    begins when the game starts
  ${e.yardChapter} - Chapter II
    begins when the player visits the Yard for the first time
end chapters

create the Market
  a region
  ${e.landing}

create the Hall
  a room
  in the Market
${e.hallExits}

  A hall.

create the Yard
  a room
  in the Market

  A yard.

  after the player entering
    move the lamp to the Market
  end after
${e.blocks}
create the lamp
  a thing
  in the Hall
  states: dull, bright

  A lamp.
${e.lampClause}
create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

type EnginePrivate = { createSaveData(): ISaveData };

async function boot(edit: Edit) {
  const ir = compileSource(SOURCE(edit));
  const story = createStory(ir, { seed: 3 });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const stream: ISemanticEvent[] = [];
  const engine = new GameEngine({
    world,
    parser,
    language,
    perceptionService: new PerceptionService(),
    config: { seed: 3, onEvent: (e) => stream.push(e) },
  });
  engine.on('event', (e) => stream.push(e as ISemanticEvent));
  engine.installStory(story);
  await engine.start();
  /** The turn's events, from the result and the event listener, each once (a platform event reaches both). */
  const play = async (command: string): Promise<ISemanticEvent[]> => {
    stream.length = 0;
    const result = await engine.executeTurn(command);
    const byId = new Map<string, ISemanticEvent>();
    for (const event of [...result.events, ...stream]) byId.set(event.id, event);
    return [...byId.values()];
  };
  /**
   * The real restore turn: the `restore` command's action requests the
   * restore, and the turn's platform dispatcher loads the save and delivers
   * the completion events. The action's gate wants a listed user save, as
   * a client lists them; the hook supplies the save itself.
   */
  const restore = async (save: ISaveData): Promise<ISemanticEvent[]> => {
    world.registerCapability('sharedData', { initialData: { saves: { test: { timestamp: Date.now() } } } });
    engine.registerSaveRestoreHooks({ onRestoreRequested: async () => save });
    return play('restore');
  };
  return { ir, story, engine, world, play, restore, saver: engine as unknown as EnginePrivate };
}

const LAMP_LOOK = clauseOccurrenceKey('lamp.on-examining-by-player');
const types = (events: ISemanticEvent[]) => events.map((e) => e.type);
const reconciledEvent = (events: ISemanticEvent[]) =>
  events.find((e) => e.type === 'platform.save_reconciled') as (ISemanticEvent & { payload: Record<string, unknown> }) | undefined;
const playerLine = (events: ISemanticEvent[]) =>
  events.filter((e) => e.type === 'game.message' && (e.data as { messageId?: string } | undefined)?.messageId === 'core.save_reconciled');

/** Play the original to a state worth keeping: the lamp looked at once, the landing drawn, Alex in the Yard. */
async function playedSave() {
  const a = await boot(ORIGINAL);
  await a.play('examine lamp');
  expect(a.world.getStateValue(LAMP_LOOK)).toBe(1);
  await a.play('east');
  expect(a.world.getLocation('alex')).toBe('yard');
  const landing = a.world.getStateValue(landingKey('market')) as LandingRecord;
  expect(landing.rooms).toEqual(['hall', 'yard']);
  expect(landing.authored).toBe(false);
  expect(a.world.getStateValue(CHAPTER_CURRENT_KEY)).toBe('yard');
  return { a, save: a.saver.createSaveData() };
}

describe('ADR-388 AC-6 — a save restores into an edited story through the real restore turn', () => {
  it('adds the new room, exit and entity; drops the removed clause; re-seeds the landing; reports the renamed chapter and leaves its key', async () => {
    const { a, save } = await playedSave();
    expect(save.metadata.identityStamp).toBe(a.ir.identity.stamp);

    const b = await boot(EDITED);
    expect(b.ir.identity.stamp).not.toBe(a.ir.identity.stamp);
    const events = await b.restore(save);

    // The restore turn: completion, then the report, then the player's one line.
    expect(types(events)).toContain('platform.restore_completed');
    const report = reconciledEvent(events);
    expect(report).toBeDefined();
    expect(report!.payload.savedStamp).toBe(a.ir.identity.stamp);
    expect(report!.payload.currentStamp).toBe(b.ir.identity.stamp);
    expect(playerLine(events)).toHaveLength(1);

    // Added: the attic and the coin exist, the coin at its start placement.
    expect(report!.payload.addedEntities).toEqual(['attic', 'coin']);
    expect(b.world.getEntity('attic')).toBeDefined();
    expect(b.world.getLocation('coin')).toBe('attic');

    // Added: the exit on a room the save already held, walkable.
    expect(report!.payload.addedExits).toEqual(['hall north -> attic']);
    expect(b.world.getLocation('alex')).toBe('yard');
    await b.play('west');
    await b.play('north');
    expect(b.world.getLocation('alex')).toBe('attic');

    // Dropped: the removed clause's counter and the renamed chapter's fired mark; the opener's mark stays.
    expect(report!.payload.droppedKeys).toEqual(expect.arrayContaining([LAMP_LOOK, CHAPTER_FIRED_PREFIX + 'yard']));
    expect(b.world.getStateValue(LAMP_LOOK)).toBeUndefined();
    expect(Object.keys(b.world.getState())).not.toContain(LAMP_LOOK);
    expect(b.world.getStateValue(CHAPTER_FIRED_PREFIX + 'market')).toBe(true);

    // Re-seeded: the un-authored landing draws the added room.
    expect(report!.payload.reseededLandings).toEqual(['market']);
    expect((b.world.getStateValue(landingKey('market')) as LandingRecord).rooms).toEqual(['hall', 'yard', 'attic']);

    // Reported and left: the chapter name the edited story no longer declares.
    // The reconciler touched nothing; the chapters plugin's own turn phase
    // then read the unknown name as none begun (ADR-388 D3) and began the
    // renamed row, whose trigger — the Yard visited — the save already holds.
    expect(report!.payload.unmappable).toEqual([{ key: CHAPTER_CURRENT_KEY, saved: 'yard', declared: ['market', 'lane'] }]);
    expect(b.world.getStateValue(CHAPTER_CURRENT_KEY)).toBe('lane');
    expect(b.world.getStateValue(CHAPTER_FIRED_PREFIX + 'lane')).toBe(true);

    // Not touched: the bell the edit removed is still in the restored world, where the save left it.
    expect(b.world.getEntity('bell')).toBeDefined();
    expect(b.world.getLocation('bell')).toBe('hall');
    expect(report!.payload.droppedKeys).not.toContain('chord.state.bell');

    // Reconciling the same world a second time changes nothing more: the
    // report is empty and the world is what the first pass left.
    const entityCount = b.world.getAllEntities().length;
    const hallExits = { ...(b.world.getEntity('hall')!.get(TraitType.ROOM) as RoomTrait).exits };
    const landing = b.world.getStateValue(landingKey('market')) as LandingRecord;
    const again = b.story.onWorldRestored(b.world, save.metadata.turnCount, {
      savedStamp: save.metadata.identityStamp,
      currentStamp: b.ir.identity.stamp,
      matches: false,
    });
    expect(again).toMatchObject({ addedEntities: [], addedExits: [], droppedKeys: [], reseededLandings: [], unmappable: [] });
    expect(b.world.getAllEntities().length).toBe(entityCount);
    expect((b.world.getEntity('hall')!.get(TraitType.ROOM) as RoomTrait).exits).toEqual(hallExits);
    expect(b.world.getStateValue(landingKey('market'))).toEqual(landing);
  });

  it('the reconciler itself leaves an unmappable value exactly as saved; only the next turn phase moves it', async () => {
    const { save } = await playedSave();
    const b = await boot(EDITED);
    // The engine's own load, with no turn after it: the hook runs, the chapters plugin does not.
    (b.engine as unknown as { loadSaveData(data: ISaveData): void }).loadSaveData(save);
    expect(b.world.getStateValue(CHAPTER_CURRENT_KEY)).toBe('yard');
    expect(b.world.getStateValue(CHAPTER_FIRED_PREFIX + 'yard')).toBeUndefined();
    expect(b.world.getEntity('attic')).toBeDefined();
  });

  it('an authored landing list is left alone', async () => {
    // The original, with the landing `set` by the author's clause before the save.
    const a = await boot({ ...ORIGINAL, lampClause: `${ORIGINAL.lampClause}\n  on the player touching\n    set the Market's landing to the Yard\n  end on\n` });
    await a.play('touch lamp');
    const authored = a.world.getStateValue(landingKey('market')) as LandingRecord;
    expect(authored).toMatchObject({ rooms: ['yard'], authored: true });
    const save = a.saver.createSaveData();

    const b = await boot(EDITED);
    const events = await b.restore(save);
    expect(reconciledEvent(events)!.payload.reseededLandings).toEqual([]);
    expect(b.world.getStateValue(landingKey('market'))).toEqual(authored);
  });

  it('a reconcile that maps everything reports to the author and says nothing to the player', async () => {
    const { save } = await playedSave();
    // The same story with one more exit: nothing stored becomes unmappable.
    const b = await boot({ ...ORIGINAL, hallExits: '  east to the Yard\n  west to the Yard' });
    const events = await b.restore(save);
    const report = reconciledEvent(events);
    expect(report).toBeDefined();
    expect(report!.payload.addedExits).toEqual(['hall west -> yard']);
    expect(report!.payload.unmappable).toEqual([]);
    expect(playerLine(events)).toHaveLength(0);
  });
});

describe('ADR-388 AC-7 — equal stamps skip the reconciler', () => {
  it('a save restored into the same story delivers no report and runs no reconcile', async () => {
    const { save } = await playedSave();
    const same = await boot(ORIGINAL);
    const events = await same.restore(save);
    expect(types(events)).toContain('platform.restore_completed');
    expect(reconciledEvent(events)).toBeUndefined();
    expect(playerLine(events)).toHaveLength(0);
    expect(same.world.getStateValue(LAMP_LOOK)).toBe(1);
  });
});
