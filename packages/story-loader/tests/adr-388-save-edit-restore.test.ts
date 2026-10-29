/**
 * adr-388-save-edit-restore.test.ts — ADR-388 AC-2, REAL-PATH: a save written
 * by one compile of a story restores into a later compile that inserted a
 * clause ahead of the counted ones, and every `, once` clause keeps its
 * count. Real engine, real parser, real `SaveRestoreService` through the
 * engine's own save and load; no doubles.
 *
 * Behavior Statement — the clause-occurrence key under ADR-388 D2
 *   DOES: keeps `chord.occurrence.clause.<clause-id>` addressable across a
 *         story edit that inserts a clause before the counted one, so a
 *         fired `, once` clause stays fired and an unfired one stays unfired
 *         after restore.
 *   WHEN: a save from compile A is loaded into an engine running compile B,
 *         where B adds a clause earlier in the same entity's block.
 *   BECAUSE: a key derived from the head names the same clause in both
 *            compiles; the position-derived key it replaces named a
 *            different clause after the insert (ADR-388 Context).
 *   REJECTS WHEN: never on this path — a stale save is reconciled, not
 *                 refused (that is Phase 5's work; here the keys simply map).
 *
 * Public interface: none — a test module. Owner context: `@sharpee/story-loader`.
 */
import { describe, expect, it } from 'vitest';
import type { ISaveData, ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { clauseOccurrenceKey } from '../src/state-keys';
import { compileSource } from './helpers/boot-engine';

/** The story, with a slot ahead of the lamp's counted clauses for the edit. */
const SOURCE = (inserted = '') => `story
  title: Keys
  authors:
    T
  id: keys
  story-version: 0.0.1

define phrases en-US
  first-look:
    The lamp gleams, just this once.
  first-touch:
    Warm, just this once.
  sniffed:
    Lamp oil.

create the Hall
  a room

  A hall.

create the lamp
  a thing
  in the Hall

  A lamp.
${inserted}
  on the player examining, once
    phrase first-look
  end on

  on the player touching, once
    phrase first-touch
  end on

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

const INSERTED = `
  on the player smelling
    phrase sniffed
  end on
`;

type EnginePrivate = { createSaveData(): ISaveData; loadSaveData(data: ISaveData): void };

async function boot(source: string) {
  const story = createStory(compileSource(source), { seed: 3 });
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
  engine.installStory(story);
  await engine.start();
  /** The message ids a turn emitted — a clause's phrase rides the action's own event (`if.event.examined`), a plugin's the stream. */
  const play = async (command: string): Promise<string[]> => {
    stream.length = 0;
    const result = await engine.executeTurn(command);
    return [...result.events, ...stream].map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter((id): id is string => typeof id === 'string');
  };
  return { engine, world, play, saver: engine as unknown as EnginePrivate };
}

const LOOK = clauseOccurrenceKey('lamp.on-examining-by-player');
const TOUCH = clauseOccurrenceKey('lamp.on-touching-by-player');

describe('ADR-388 AC-2 — a clause inserted ahead of a counted one keeps its count across save and restore', () => {
  it('a fired `, once` stays fired and an unfired one still fires, through the real engine save and load', async () => {
    // Compile A: examine the lamp once, so its first clause is spent; save.
    const a = await boot(SOURCE());
    const looked = await a.play('examine lamp');
    expect(a.world.getStateValue(LOOK)).toBe(1);
    expect(a.world.getStateValue(TOUCH)).toBeUndefined();
    expect(looked).toContain('first-look');
    const save = a.saver.createSaveData();

    // Compile B inserts a clause AHEAD of both counted clauses, then restores A's save.
    const b = await boot(SOURCE(INSERTED));
    b.saver.loadSaveData(save);
    expect(b.world.getStateValue(LOOK)).toBe(1);

    // The spent clause does not refire: its counter stays at 1 and no phrase lands.
    expect(await b.play('examine lamp')).not.toContain('first-look');
    expect(b.world.getStateValue(LOOK)).toBe(1);

    // The unfired one still fires exactly once.
    expect(await b.play('touch lamp')).toContain('first-touch');
    expect(b.world.getStateValue(TOUCH)).toBe(1);

    // And the inserted clause works under its own key, untouched by the save.
    expect(await b.play('smell lamp')).toContain('sniffed');
    expect(b.world.getStateValue(clauseOccurrenceKey('lamp.on-smelling-by-player'))).toBe(1);
  });

  it('the same edit under a position-derived key would have named the wrong clause (the defect this closes)', () => {
    // Documentary, not a test of code that no longer exists: compile A's
    // first clause is `examining`, compile B's is `smelling`. A key `lamp.1`
    // would carry A's count onto B's inserted clause. The head-derived ids
    // differ by name, so no such transfer is possible.
    const a = compileSource(SOURCE()).entities.find((e) => e.id === 'lamp')!.onClauses.map((c) => c.id);
    const b = compileSource(SOURCE(INSERTED)).entities.find((e) => e.id === 'lamp')!.onClauses.map((c) => c.id);
    expect(a).toEqual(['lamp.on-examining-by-player', 'lamp.on-touching-by-player']);
    expect(b).toEqual(['lamp.on-smelling-by-player', 'lamp.on-examining-by-player', 'lamp.on-touching-by-player']);
  });
});
