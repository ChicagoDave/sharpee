/**
 * reconcile.test.ts — the pure half of the restore reconciler (ADR-388 D5).
 *
 * Behavior Statement — `orphanedKeys` / `unmappableValues` / `reseedLandingRecord`
 *   DOES: names the persisted keys whose identity the manifest does not
 *         declare, family by family, leaving unknown families alone; names
 *         the stored chapter, story state, entity state and timer turn the
 *         manifest does not declare, with what it declares instead; and
 *         rebuilds a landing record from the current room list with the
 *         cursor clamped and the seed kept, or reports no change.
 *   WHEN: a restore's stamp differed from the story's.
 *   BECAUSE: a key with no identity is ADR-289 D2's retired key in general
 *            form; a value with no identity is left for the author to see,
 *            never coerced (D5 rule 4).
 *   REJECTS WHEN: never — pure functions over the manifest and a reader.
 *
 * Public interface: none — a test module. Owner context: `@sharpee/story-loader`.
 */
import { describe, expect, it } from 'vitest';
import type { IRIdentity } from '@sharpee/chord';
import { CHAPTER_CURRENT_KEY, CHAPTER_FIRED_PREFIX } from '@sharpee/ext-chapters';
import { orphanedKeys, reseedLandingRecord, unmappableValues } from '../src/reconcile';
import { CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, clauseOccurrenceKey, counterKey, landingKey, selectOccurrenceKey, timerKey } from '../src/state-keys';

const MANIFEST: IRIdentity = {
  stamp: 'abc',
  entities: [
    { id: 'hall', kind: 'room', states: [], startsIn: null },
    { id: 'lamp', kind: 'thing', states: ['dull', 'bright'], startsIn: 'hall' },
    { id: 'bell', kind: 'thing', states: [], startsIn: 'hall' },
  ],
  exits: [],
  clauses: [
    { id: 'lamp.on-examining-by-player', once: true },
    { id: 'trait.glowing.on-rubbing-by-player', once: false },
  ],
  selects: ['lamp.on-examining-by-player.select#1'],
  chapters: ['bazaar', 'yard'],
  timers: [{ qualified: 'alex.bell', turns: ['ringing', 'fading'] }],
  landings: [{ region: 'market', rooms: ['hall'] }],
  counters: [
    { name: 'madness', owner: null },
    { name: 'suspicion', owner: 'alex' },
  ],
};

describe('orphanedKeys — a key with no identity in its family is dropped, every other key is kept', () => {
  it('keeps keys the manifest declares, including per-carrier trait clauses and per-owner selects', () => {
    const kept = [
      CHORD_STATE_PREFIX + 'lamp',
      clauseOccurrenceKey('lamp.on-examining-by-player'),
      clauseOccurrenceKey('trait.glowing.on-rubbing-by-player', 'bell'),
      selectOccurrenceKey('lamp.on-examining-by-player.select#1'),
      selectOccurrenceKey('lamp.on-examining-by-player.select#1', 'bell'),
      counterKey('madness'),
      counterKey('suspicion', 'alex'),
      timerKey('alex.bell'),
      landingKey('market'),
      'chord.adjacent.lamp',
      CHAPTER_FIRED_PREFIX + 'bazaar',
    ];
    expect(orphanedKeys(MANIFEST, kept)).toEqual([]);
  });

  it('drops keys whose identity is gone from the manifest', () => {
    const gone = [
      CHORD_STATE_PREFIX + 'candle',
      clauseOccurrenceKey('lamp.on-touching-by-player'),
      clauseOccurrenceKey('trait.glowing.on-rubbing-by-player', 'candle'),
      selectOccurrenceKey('lamp.on-touching-by-player.select#1'),
      counterKey('dread'),
      counterKey('suspicion', 'bob'),
      timerKey('alex.gong'),
      landingKey('stalls'),
      'chord.adjacent.candle',
      CHAPTER_FIRED_PREFIX + 'market',
    ];
    expect(orphanedKeys(MANIFEST, gone)).toEqual(gone);
  });

  it('leaves families it does not know alone', () => {
    const unknown = ['chord.visited.hall', 'chord.gone.lamp', 'chord.rng', 'chord.occurrence.thread.alex.gossip.beat.1', CHAPTER_CURRENT_KEY, CHORD_STORY_STATE_KEY, 'someone.elses.key'];
    expect(orphanedKeys(MANIFEST, unknown)).toEqual([]);
  });
});

describe('unmappableValues — a stored value the manifest does not declare is reported with what it declares', () => {
  const reader = (values: Record<string, unknown>) => (key: string) => values[key];

  it('reports a chapter, a story state, an entity state and a timer turn the story no longer declares', () => {
    const found = unmappableValues(
      MANIFEST,
      ['dawn', 'dusk'],
      reader({
        [CHAPTER_CURRENT_KEY]: 'market',
        [CHORD_STORY_STATE_KEY]: 'noon',
        [CHORD_STATE_PREFIX + 'lamp']: 'broken',
        [timerKey('alex.bell')]: { phase: 'running', turn: 'tolling', startedTurn: 3 },
      }),
    );
    expect(found).toEqual([
      { key: CHAPTER_CURRENT_KEY, saved: 'market', declared: ['bazaar', 'yard'] },
      { key: CHORD_STORY_STATE_KEY, saved: 'noon', declared: ['dawn', 'dusk'] },
      { key: CHORD_STATE_PREFIX + 'lamp', saved: 'broken', declared: ['dull', 'bright'] },
      { key: timerKey('alex.bell'), saved: 'tolling', declared: ['ringing', 'fading'] },
    ]);
  });

  it('reports nothing when every stored value is declared, and ignores an unstarted timer', () => {
    const found = unmappableValues(
      MANIFEST,
      ['dawn'],
      reader({
        [CHAPTER_CURRENT_KEY]: 'yard',
        [CHORD_STORY_STATE_KEY]: 'dawn',
        [CHORD_STATE_PREFIX + 'lamp']: 'bright',
        [timerKey('alex.bell')]: { phase: 'idle', turn: null, startedTurn: -1 },
      }),
    );
    expect(found).toEqual([]);
  });
});

describe('reseedLandingRecord — the current list replaces the stored one, cursor clamped, seed kept', () => {
  it('returns the re-seeded record when the lists differ', () => {
    const next = reseedLandingRecord({ rooms: ['hall', 'yard'], cursor: 1, seed: 77, authored: false }, ['hall']);
    expect(next).toEqual({ rooms: ['hall'], cursor: 0, seed: 77, authored: false });
  });

  it('keeps the cursor when it still fits', () => {
    const next = reseedLandingRecord({ rooms: ['hall'], cursor: 0, seed: 5, authored: false }, ['hall', 'yard', 'attic']);
    expect(next).toEqual({ rooms: ['hall', 'yard', 'attic'], cursor: 0, seed: 5, authored: false });
  });

  it('reports no change when the stored list already matches', () => {
    expect(reseedLandingRecord({ rooms: ['hall', 'yard'], cursor: 1, seed: 5, authored: false }, ['hall', 'yard'])).toBeUndefined();
  });
});
