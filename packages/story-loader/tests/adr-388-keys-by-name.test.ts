/**
 * adr-388-keys-by-name.test.ts — ADR-388 D3: chapters, timers, landings and
 * scheduler daemons persist by name. AC-1 over the key builders and AC-5 on
 * the REAL PATH: a save written by one compile of a story restores into a
 * later compile that inserted a chapter and a named turn AHEAD of the saved
 * positions, and both resume at the same named position. Real engine, real
 * parser, real `SaveRestoreService` through the engine's own save and load;
 * no doubles.
 *
 * Behavior Statement — chapter current, timer position, landing record,
 * daemon ids under ADR-388 D3
 *   DOES: `chord.chapter.current` holds the chapter's name; the timer
 *         record holds `turn: <name>`; the landing record carries
 *         `authored`; every-turn daemons are keyed by the clause id — so a
 *         chapter, a named turn or a clause inserted ahead of a saved one
 *         changes nothing a save depends on.
 *   WHEN: a save from compile A is loaded into an engine running compile B,
 *         where B inserts a chapter, a named turn and an every-turn clause
 *         earlier than A's.
 *   BECAUSE: an ordinal or an index names a different thing in B; a name
 *            names the same thing in both (ADR-388 D1, D3).
 *   REJECTS WHEN: never on this path — a name B no longer declares is left
 *                 in place for the reconciler (Phase 5), never guessed at.
 *
 * Public interface: none — a test module. Owner context: `@sharpee/story-loader`.
 */
import { describe, expect, it } from 'vitest';
import type { ISaveData, ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { CHAPTER_ANNOUNCED_KEY, CHAPTER_CURRENT_KEY } from '@sharpee/ext-chapters';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { nextNamedTurn } from '../src/runtime/timers';
import { IDLE_TIMER_RECORD, clauseOccurrenceKey, counterKey, landingKey, selectOccurrenceKey, timerKey, type TimerRecord } from '../src/state-keys';
import { compileSource } from './helpers/boot-engine';

/** The story; `chapter`, `turn` and `clause` are the slots compile B fills ahead of A's rows. */
const SOURCE = ({ chapter = '', turn = '', clause = '' } = {}) => `story
  title: Names
  authors:
    T
  id: names
  story-version: 0.0.1
  states: calm, waiting, chase
  use chapters

define chapters
  market - Chapter I: The Market
    begins when the game starts
${chapter}
  street - Chapter II: The Street
    begins when the player visits the Street for the first time
end chapters

define timer search for the guards
${turn}
  arriving
  lingering
end timer

define phrases en-US
  in-market:
    Still the market.
  in-street:
    The street now.
  search-arriving:
    They are arriving.
  search-lingering:
    They are lingering.
  tick:
    Tick.
  tock:
    Tock.

define action checking
  grammar
    check
  phrase in-market when during market
  phrase in-street when during street
  phrase search-arriving when the guards' search is arriving
  phrase search-lingering when the guards' search is lingering

define action starting
  grammar
    begin search
  start the guards' search

define action restarting
  grammar
    restart search
  restart the guards' search

define action resetting
  grammar
    reset search
  reset the guards' search

create the Market
  a room
  east to the Street

  A market.

create the Street
  a room
  west to the Market

  A street.

create the guards
  a person, plural
  in the Market

  Guards.
${clause}
  on every turn
    phrase tock
  end on

create Alex
  a person
  playable
  starts in the Market

  You.

before the game starts
  change the player to Alex
end before
`;

const INSERTED_CHAPTER = `  waiting - Chapter: Waiting
    begins when the story becomes waiting`;
const INSERTED_TURN = `  prowling`;
const INSERTED_CLAUSE = `
  on every turn
    phrase tick
  end on
`;

type EnginePrivate = { createSaveData(): ISaveData; loadSaveData(data: ISaveData): void };
interface SchedulerDaemonState { id: string; runCount: number }

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
  story.extendParser(parser);
  await engine.start();
  /** The message ids a turn emitted, read off the engine's own stream (which carries the action's events and the plugins' alike, once each). */
  const play = async (command: string): Promise<string[]> => {
    stream.length = 0;
    await engine.executeTurn(command);
    return stream.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter((id): id is string => typeof id === 'string');
  };
  /** The scheduler's persisted per-daemon records, as the save carries them. */
  const daemonStates = (): SchedulerDaemonState[] => {
    const states = engine.getPluginRegistry().getStates();
    return Object.values(states).flatMap((s) => (s as { daemons?: SchedulerDaemonState[] }).daemons ?? []);
  };
  return { engine, world, play, daemonStates, saver: engine as unknown as EnginePrivate };
}

const SEARCH = timerKey('guards.search');
/** What `check` said — only its own four phrases, the turn's other events (the guards' `tock`, the action's own) aside. */
const CHECKED = ['in-market', 'in-street', 'search-arriving', 'search-lingering'];
const said = (ids: string[]) => ids.filter((id) => CHECKED.includes(id));

describe('ADR-388 AC-1 — no key builder takes a position', () => {
  it('every builder takes string identities, and the timer record has no numeric position', () => {
    expect(clauseOccurrenceKey('troll.on-attacking-by-player')).toBe('chord.occurrence.clause.troll.on-attacking-by-player');
    expect(selectOccurrenceKey('troll.on-attacking-by-player.select#1')).toBe('chord.occurrence.select.troll.on-attacking-by-player.select#1');
    expect(counterKey('coins', 'troll')).toBe('chord.counter.troll.coins');
    expect(timerKey('guards.search')).toBe('chord.timer.guards.search');
    expect(landingKey('market')).toBe('chord.landing.market');
    const idle: TimerRecord = IDLE_TIMER_RECORD;
    expect(idle).toEqual({ phase: 'idle', turn: null, startedTurn: -1 });
    expect(Object.entries(idle).filter(([k, v]) => typeof v === 'number').map(([k]) => k)).toEqual(['startedTurn']);
  });

  it('the next named turn is found by name, not by index; a name the definition lacks is unmappable', () => {
    const def = { states: ['arriving', 'lingering'] };
    expect(nextNamedTurn(def, null)).toBe('arriving');
    expect(nextNamedTurn(def, 'arriving')).toBe('lingering');
    expect(nextNamedTurn(def, 'lingering')).toBeNull();
    expect(nextNamedTurn({ states: [] }, null)).toBeNull();
    expect(nextNamedTurn(def, 'prowling')).toBeUndefined();
  });
});

describe('ADR-388 AC-5 — chapter and timer resume by name across a save, an edit and a restore', () => {
  it('a chapter and a named turn inserted ahead of the saved positions change nothing the save depends on', async () => {
    // Compile A: reach the Street (chapter `street`), start the search and
    // step it onto `arriving`; save mid-chapter and mid-timer.
    const a = await boot(SOURCE());
    await a.play('east');
    expect(a.world.getStateValue(CHAPTER_CURRENT_KEY)).toBe('street');
    expect(a.world.getStateValue(CHAPTER_ANNOUNCED_KEY)).toBe('street');
    await a.play('begin search');
    expect(a.world.getStateValue(SEARCH)).toMatchObject({ phase: 'running', turn: null });
    await a.play('wait');
    expect(a.world.getStateValue(SEARCH)).toMatchObject({ phase: 'running', turn: 'arriving' });
    // Save on `arriving`; the check that follows reads it and then, being a
    // turn, ticks A's timer on — which is why the save comes first.
    const save = a.saver.createSaveData();
    expect(said(await a.play('check'))).toEqual(['in-street', 'search-arriving']);

    // Compile B inserts a chapter before `street` and a turn before `arriving`.
    const b = await boot(SOURCE({ chapter: INSERTED_CHAPTER, turn: INSERTED_TURN }));
    const rows = compileSource(SOURCE({ chapter: INSERTED_CHAPTER, turn: INSERTED_TURN }));
    expect(rows.chapters!.map((c) => [c.name, c.ordinal])).toEqual([['market', 0], ['waiting', 1], ['street', 2]]);
    expect(rows.timers!.find((t) => t.qualified === 'guards.search')!.states).toEqual(['prowling', 'arriving', 'lingering']);
    b.saver.loadSaveData(save);

    // The saved NAMES still name the same chapter and turn in B.
    expect(b.world.getStateValue(CHAPTER_CURRENT_KEY)).toBe('street');
    expect(b.world.getStateValue(SEARCH)).toMatchObject({ phase: 'running', turn: 'arriving' });
    expect(said(await b.play('check'))).toEqual(['in-street', 'search-arriving']);

    // Nothing re-announces, and the timer steps on from `arriving` to
    // `lingering` — not back onto B's second entry as an index would have.
    expect(b.world.getStateValue(SEARCH)).toMatchObject({ phase: 'running', turn: 'lingering' });
    expect(said(await b.play('check'))).toEqual(['in-street', 'search-lingering']);
    expect(b.world.getStateValue(SEARCH)).toMatchObject({ phase: 'expired' });
  });
});

describe('ADR-388 D3 — what a name the current compile does not declare reads as', () => {
  it('a timer on a turn the definition no longer lists holds its record and is never stepped', async () => {
    const b = await boot(SOURCE());
    await b.play('begin search');
    await b.play('wait');
    const stored = { ...(b.world.getStateValue(SEARCH) as TimerRecord), turn: 'gone' };
    b.world.setStateValue(SEARCH, stored);
    expect(said(await b.play('wait'))).toEqual([]);
    expect(b.world.getStateValue(SEARCH)).toEqual(stored);
    expect(said(await b.play('check'))).toEqual(['in-market']);
    expect(b.world.getStateValue(SEARCH)).toEqual(stored);
  });

  it('a current chapter no row carries reads as no chapter begun, and the next row still begins', async () => {
    const b = await boot(SOURCE());
    b.world.setStateValue(CHAPTER_CURRENT_KEY, 'removed');
    expect(said(await b.play('check'))).toEqual([]);
    expect(b.world.getStateValue(CHAPTER_CURRENT_KEY)).toBe('removed');
    await b.play('east');
    expect(b.world.getStateValue(CHAPTER_CURRENT_KEY)).toBe('street');
    expect(said(await b.play('check'))).toEqual(['in-street']);
  });

  it('`restart` and `reset` clear a stepped timer back to no named turn', async () => {
    const b = await boot(SOURCE());
    await b.play('begin search');
    await b.play('wait');
    expect(b.world.getStateValue(SEARCH)).toMatchObject({ phase: 'running', turn: 'arriving' });
    await b.play('restart search');
    expect(b.world.getStateValue(SEARCH)).toMatchObject({ phase: 'running', turn: null });
    await b.play('wait');
    expect(b.world.getStateValue(SEARCH)).toMatchObject({ phase: 'running', turn: 'arriving' });
    await b.play('reset search');
    expect(b.world.getStateValue(SEARCH)).toMatchObject({ phase: 'idle', turn: null });
  });
});

describe('ADR-388 D3 — scheduler daemons persist by clause id', () => {
  it('an every-turn clause inserted ahead does not take over the counted clause\'s scheduler record', async () => {
    const a = await boot(SOURCE());
    await a.play('wait');
    await a.play('wait');
    const tock = 'chord.entity-turn.guards.on-every-turn';
    expect(a.daemonStates().find((d) => d.id === tock)?.runCount).toBe(2);
    const save = a.saver.createSaveData();

    const b = await boot(SOURCE({ clause: INSERTED_CLAUSE }));
    const ids = b.daemonStates().map((d) => d.id).filter((id) => id.startsWith('chord.entity-turn.'));
    expect(ids).toEqual(['chord.entity-turn.guards.on-every-turn#1', 'chord.entity-turn.guards.on-every-turn#2']);
    b.saver.loadSaveData(save);
    // Identical heads are numbered in B (ADR-388 D2, Q-3), so A's single
    // `on-every-turn` has no twin in B: its record is reset, never moved
    // onto the inserted clause by position. The reconciler reports it (D5).
    expect(b.daemonStates().find((d) => d.id === 'chord.entity-turn.guards.on-every-turn#1')?.runCount).toBe(0);
    expect(b.daemonStates().find((d) => d.id === 'chord.entity-turn.guards.on-every-turn#2')?.runCount).toBe(0);
  });

  it('a clause inserted ahead with a DIFFERENT head leaves the counted clause\'s record on it', async () => {
    const a = await boot(SOURCE());
    await a.play('wait');
    await a.play('wait');
    const save = a.saver.createSaveData();

    const b = await boot(SOURCE({ clause: '\n  on the player examining\n    phrase tick\n  end on\n' }));
    b.saver.loadSaveData(save);
    expect(b.daemonStates().find((d) => d.id === 'chord.entity-turn.guards.on-every-turn')?.runCount).toBe(2);
  });
});

describe('ADR-388 D3 — the landing record says whether its list was authored', () => {
  const LANDING = `story
  title: Landing
  authors:
    T
  id: landing
  story-version: 0.0.1

define phrases en-US
  done:
    Done.

define action placing
  grammar
    place monkey
  move the monkey to the Market
  phrase done

define action choosing
  grammar
    choose stall
  set the Market's landing to the Hat Stall
  phrase done

create the Market
  a region
  landing, cycling: the East Gate, the Hat Stall

create the East Gate
  a room
  in the Market

  A gate.

create the Hat Stall
  a room
  in the Market

  A stall.

create the monkey
  a thing
  in the Hat Stall

  A monkey.

create Alex
  a person
  playable
  starts in the East Gate

  You.

before the game starts
  change the player to Alex
end before
`;

  it('is seeded from the IR as not authored, and a `set` marks it authored', async () => {
    const b = await boot(LANDING);
    expect(b.world.getStateValue(landingKey('market'))).toBeUndefined();
    await b.play('place monkey');
    expect(b.world.getStateValue(landingKey('market'))).toMatchObject({ authored: false, cursor: 1 });
    await b.play('choose stall');
    expect(b.world.getStateValue(landingKey('market'))).toMatchObject({ authored: true, cursor: 0 });
  });
});
