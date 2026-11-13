/**
 * claim-identity.test.ts — the claims walk's state identity is the world's
 * snapshot minus a written ignore list (ADR-365 D2, the 2026-11-12 note).
 *
 * Two halves. The first hands `necessaryIdentity` pairs of snapshots that
 * differ in one part and asserts which pairs are one state: a part nobody
 * listed tells two worlds apart, and each listed part does not. The second
 * runs the walk on a REAL game (compiled by `@sharpee/chord`, loaded by
 * `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`) whose only
 * moving part is a Chord counter: the third reading of a plaque drops the
 * player into the Crypt, and a walk that merges two counts never gets there.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { CHORD_OCCURRENCE_PREFIX, CHORD_RNG_KEY, counterKey, createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { IDENTITY_IGNORES, necessaryIdentity } from '../src/claims/claim-identity.js';
import { normalizeClaimSet, type NecessarySet } from '../src/claims/claim-set.js';
import { runClaims, type ClaimsRunOptions } from '../src/claims/claims-runner.js';
import type { ClaimsGame, SnapshotValue, WorldSnapshot } from '../src/claims/claims-game.js';

const SET: NecessarySet = { rooms: ['hall'], things: ['lamp'], verbs: ['take'] };

interface TestRow { id: string; entity: { type: string; attributes: { chordIrId: string }; traits: Array<{ [field: string]: SnapshotValue }> } }
interface TestCapability { name: string; data: { [field: string]: SnapshotValue }; schema: { [field: string]: SnapshotValue } }
interface TestWorld {
  playerId: string;
  entities: TestRow[];
  state: { [key: string]: SnapshotValue };
  spatialIndex: { parentToChildren: Array<{ parent: string; children: string[] }>; childToParent: string[][] };
  relationships: SnapshotValue[];
  idCounters: Array<[string, number]>;
  scoreLedger: SnapshotValue[];
  scoreMaxScore: number;
  capabilities: TestCapability[];
  /** A part the serializer does not write today. */
  weather?: string;
}

/** A small world: the player and a lamp in the hall, a vase the set does not name. */
function world(): TestWorld {
  return {
    playerId: 'a01',
    entities: [
      { id: 'r01', entity: { type: 'room', attributes: { chordIrId: 'hall' }, traits: [{ type: 'room', visited: true }] } },
      { id: 'a01', entity: { type: 'actor', attributes: { chordIrId: 'nobody' }, traits: [{ type: 'actor' }] } },
      { id: 'i01', entity: { type: 'item', attributes: { chordIrId: 'lamp' }, traits: [{ type: 'readable', hasBeenRead: false }] } },
      { id: 'i02', entity: { type: 'item', attributes: { chordIrId: 'vase' }, traits: [{ type: 'openable', isOpen: false }] } },
    ],
    state: { 'chord.state.lamp': 'dark', [counterKey('rings')]: 0, [CHORD_RNG_KEY]: 11, [`${CHORD_OCCURRENCE_PREFIX}clause.story.on-every-turn`]: 1 },
    spatialIndex: {
      parentToChildren: [{ parent: 'r01', children: ['a01', 'i01', 'i02'] }],
      childToParent: [['a01', 'r01'], ['i01', 'r01'], ['i02', 'r01']],
    },
    relationships: [],
    idCounters: [['i', 2]],
    scoreLedger: [],
    scoreMaxScore: 0,
    capabilities: [
      { name: 'commandHistory', data: { entries: [{ originalText: 'look', timestamp: 1 }] }, schema: { entries: { default: [] } } },
      { name: 'textState', data: { chord: { drip: 1 } }, schema: {} },
      { name: 'scoring', data: { moves: 0 }, schema: { moves: { default: 0 } } },
    ],
  };
}

/** The identity of the small world after one edit to its JSON. */
function identityAfter(edit: (snapshot: TestWorld) => void): string {
  const snapshot = world();
  edit(snapshot);
  return necessaryIdentity(JSON.parse(JSON.stringify(snapshot)) as WorldSnapshot, SET);
}
const BASE = identityAfter(() => {});


describe('the identity counts every part of the snapshot nobody listed', () => {
  it('a Chord counter tells two worlds apart', () => {
    expect(identityAfter((snapshot) => { snapshot.state[counterKey('rings')] = 1; })).not.toBe(BASE);
  });

  it('so does a trait field the old include list never named', () => {
    expect(identityAfter((snapshot) => { snapshot.entities[2].entity.traits[0].hasBeenRead = true; })).not.toBe(BASE);
  });

  it('so does a room of the set being visited, and a thing of the set changing state', () => {
    expect(identityAfter((snapshot) => { snapshot.entities[0].entity.traits[0].visited = false; })).not.toBe(BASE);
    expect(identityAfter((snapshot) => { snapshot.state['chord.state.lamp'] = 'lit'; })).not.toBe(BASE);
  });

  it('so does a capability nobody listed, and a part of the snapshot added tomorrow', () => {
    expect(identityAfter((snapshot) => { snapshot.capabilities[2].data.moves = 1; })).not.toBe(BASE);
    expect(identityAfter((snapshot) => { snapshot.weather = 'rain'; })).not.toBe(identityAfter((snapshot) => { snapshot.weather = 'sun'; }));
    expect(identityAfter((snapshot) => { snapshot.weather = 'rain'; })).not.toBe(BASE);
  });

  it('where a thing of the set is counts', () => {
    expect(identityAfter((snapshot) => {
      snapshot.spatialIndex = { parentToChildren: [{ parent: 'r01', children: ['a01', 'i02'] }, { parent: 'a01', children: ['i01'] }], childToParent: [] };
    })).not.toBe(BASE);
  });
});

describe('the identity leaves out exactly what the ignore list names', () => {
  it('an entity outside the set: its traits and its place', () => {
    expect(identityAfter((snapshot) => { snapshot.entities[3].entity.traits[0].isOpen = true; })).toBe(BASE);
    expect(identityAfter((snapshot) => {
      snapshot.spatialIndex = { parentToChildren: [{ parent: 'r01', children: ['a01', 'i01'] }, { parent: 'a01', children: ['i02'] }], childToParent: [] };
    })).toBe(BASE);
  });

  it('the id counters, the mirrored index, and the order children and keys were written in', () => {
    expect(identityAfter((snapshot) => { snapshot.idCounters = [['i', 9]]; })).toBe(BASE);
    expect(identityAfter((snapshot) => {
      snapshot.spatialIndex = { childToParent: [['i01', 'r01']], parentToChildren: [{ children: ['i02', 'i01', 'a01'], parent: 'r01' }] };
    })).toBe(BASE);
  });

  it('the command history, the text state, and every capability\'s schema', () => {
    expect(identityAfter((snapshot) => { snapshot.capabilities[0].data.entries = [{ originalText: 'wait', timestamp: 99 }]; })).toBe(BASE);
    expect(identityAfter((snapshot) => { snapshot.capabilities[1].data.chord = { drip: 7 }; })).toBe(BASE);
    expect(identityAfter((snapshot) => { snapshot.capabilities[2].schema.moves = { default: 5 }; })).toBe(BASE);
  });

  it('the random cursor and the clause firing counters', () => {
    expect(identityAfter((snapshot) => { snapshot.state[CHORD_RNG_KEY] = 9999; })).toBe(BASE);
    expect(identityAfter((snapshot) => { snapshot.state[`${CHORD_OCCURRENCE_PREFIX}clause.story.on-every-turn`] = 40; })).toBe(BASE);
  });

  it('every entry of the list says why, and the list is the eight parts above', () => {
    expect(IDENTITY_IGNORES.map((entry) => `${entry.part}:${entry.name}`)).toEqual([
      'entity:outside the set',
      'snapshot:idCounters',
      'spatial-index:childToParent',
      'capability:commandHistory',
      'capability:textState',
      'capability-field:schema',
      `state-key:${CHORD_RNG_KEY}`,
      `state-prefix:${CHORD_OCCURRENCE_PREFIX}`,
    ]);
    for (const entry of IDENTITY_IGNORES) expect(entry.why.length).toBeGreaterThan(40);
  });
});

describe('REAL-PATH — a walk whose only moving part is a Chord counter', () => {
  const SEED = 1209;
  const SOURCE = readFileSync(resolve(__dirname, 'fixtures/claims/counter-fixture.story'), 'utf8');
  const compileFixture = (): StoryIR => {
    const result = compile(SOURCE);
    if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
    return result.ir;
  };
  const loadGame = async (): Promise<ClaimsGame> => {
    const story = createStory(compileFixture(), { seed: SEED });
    return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileFixture(), { seed: SEED }) });
  };
  const OPTIONS: ClaimsRunOptions = { seed: SEED, maxStates: 5000, maxSeconds: 30, maxDepth: 40 };

  it('reaches the state three readings deep, and reports the claim the story breaks as violated', async () => {
    const claims = normalizeClaimSet({
      rooms: ['belfry', 'crypt'], things: ['plaque'], verbs: ['read'],
      claims: [{ name: 'the Crypt is reached', never: true, room: 'crypt' }],
    }, 'the plaque');
    const run = await runClaims(compileFixture(), claims, loadGame, OPTIONS);
    expect(run.claims[0].verdict).toBe('violated');
    expect(run.claims[0].witness).toEqual(['read plaque', 'read plaque', 'read plaque']);
    expect(run.walks[0].statesDiscovered).toBe(4);
    expect(run.walks[0].roomsReached).toEqual(['belfry', 'crypt']);
  }, 30_000);
});
