/**
 * identity.test.ts — ADR-388 D4 and AC-7's compiler half: the identity
 * manifest enumerates every persistable identity, and the stamp is a hash
 * over names and structure only — identical across compiles of one
 * source, unchanged by a prose edit or a reordered block, changed by a
 * structural edit.
 *
 * Behavior Statement — `buildIdentity` (the `emitIdentity` pass)
 *   DOES: writes `ir.identity` with every entity (id, first kind, states,
 *         start place), every resolved exit, every clause id with `once`,
 *         every select id, the chapter names in order, each timer's turns,
 *         each landing's rooms, each counter with its owner, and `stamp`,
 *         the SHA-256 of the JSON of those fields.
 *   WHEN: the last analysis pass runs, after every pass that builds an
 *         identity it lists.
 *   BECAUSE: a restore must know what a save can hold a key for, and must
 *            tell a save of this story from one written before an edit,
 *            without trusting the author's version line (ADR-388 D4, Q-1).
 *   REJECTS WHEN: never — an unresolved exit is omitted, every other
 *                 family is emitted as found; the loader is the backstop.
 *
 * Public interface: none — a test module. Owner context: `@sharpee/chord`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { compile } from '../src';
import { ANALYSIS_PASSES } from '../src/analyzer';
import { buildIdentity } from '../src/identity';
import type { IRIdentity } from '../src/ir';
import { sha256Hex } from '../src/sha256';

const ALLEY = `create the Alley
  a room

  An alley.
`;

const LAMP = (clauses: string, states = 'dull, bright') => `create the lamp
  a thing
  glowing
  in the Stall
  states: ${states}

  A lamp.
${clauses}`;

const LAMP_CLAUSES = `
  on the player examining, once
    select cycling
      phrase one
    or
      phrase two
    end select
  end on
`;

/** The fixture: one of every family, with slots for the edits the tests make. */
const CHAPTER_ROWS = [
  `  market - Chapter I\n    begins when the game starts`,
  `  alley - Chapter II\n    begins when the player visits the Alley for the first time`,
  `  stall - Chapter III\n    begins when the player visits the Stall for the first time`,
];

const SOURCE = (
  opts: {
    stallProse?: string;
    stallExtraExit?: string;
    blocks?: string[];
    lampClauses?: string;
    lampStates?: string;
    chapterRows?: string[];
    counterName?: string;
  } = {},
) => `story
  title: Identity
  authors:
    T
  id: identity
  story-version: 0.0.1
  use chapters

  on every turn
    select cycling
      phrase hum
    or
      phrase one
    end select
  end on

define phrases en-US
  hum:
    Hum.
  one:
    One.
  two:
    Two.
  nope:
    Nope.

define counter ${opts.counterName ?? 'madness'} starts 0 between 0 and 100

define timer bell for the player
  ringing
  fading
end timer

define chapters
${(opts.chapterRows ?? CHAPTER_ROWS).join('\n')}
end chapters

define action kicking
  grammar
    kick the target
  the target must be reachable
  otherwise refuse nope

  select stopping
    phrase one
  or
    phrase two
  end select

define trait glowing
  on the player rubbing
    phrase one
  end on
end trait

create the Market
  a region
  landing the Stall

create the Stall
  a room
  in the Market
  east to the Alley
${opts.stallExtraExit ?? ''}

  ${opts.stallProse ?? 'A stall.'}

${(opts.blocks ?? [ALLEY, LAMP(opts.lampClauses ?? LAMP_CLAUSES, opts.lampStates)]).join('\n')}
create Alex
  a person
  playable
  starts in the Alley
  counter suspicion starts 0 between 0 and 5

  You.

before the game starts
  change the player to Alex
end before
`;

function identityOf(source: string): IRIdentity {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors).toEqual([]);
  return result.ir.identity;
}

describe('sha256Hex — the published vectors', () => {
  it('hashes the empty string and `abc` to the FIPS 180-4 digests', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('hashes a multi-block input (more than 55 bytes) correctly', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });
});

describe('ADR-388 D4 — the manifest enumerates every persistable identity', () => {
  let identity: IRIdentity;
  beforeAll(() => {
    identity = identityOf(SOURCE());
  });

  it('entities carry id, first kind, declared states and start place; rooms and regions start nowhere', () => {
    expect(identity.entities).toContainEqual({ id: 'lamp', kind: 'thing', states: ['dull', 'bright'], startsIn: 'stall' });
    expect(identity.entities).toContainEqual({ id: 'alex', kind: 'person', states: [], startsIn: 'alley' });
    expect(identity.entities).toContainEqual({ id: 'stall', kind: 'room', states: [], startsIn: null });
    expect(identity.entities).toContainEqual({ id: 'market', kind: 'region', states: [], startsIn: null });
  });

  it('exits carry room, direction and destination', () => {
    expect(identity.exits).toContainEqual({ room: 'stall', direction: 'east', destination: 'alley' });
  });

  it('clauses carry the head-derived id with `once`; a trait clause is listed once under its prefix', () => {
    expect(identity.clauses).toContainEqual({ id: 'lamp.on-examining-by-player', once: true });
    expect(identity.clauses).toContainEqual({ id: 'story.on-every-turn', once: false });
    expect(identity.clauses).toContainEqual({ id: 'trait.glowing.on-rubbing-by-player', once: false });
    expect(identity.clauses.filter((c) => c.id.startsWith('trait.glowing.'))).toHaveLength(1);
  });

  it('selects under every root are listed — an entity clause, a story clause, and an action body', () => {
    expect(identity.selects).toContain('lamp.on-examining-by-player.select#1');
    expect(identity.selects).toContain('story.on-every-turn.select#1');
    const actionSelect = identity.selects.filter((id) => !id.startsWith('lamp.') && !id.startsWith('story.'));
    expect(actionSelect).toHaveLength(1);
    expect(actionSelect[0]).toMatch(/kicking/);
    expect(identity.selects).toHaveLength(3);
  });

  it('chapters, timers, landings and counters are listed by their runtime identities', () => {
    expect(identity.chapters).toEqual(['market', 'alley', 'stall']);
    expect(identity.timers).toEqual([{ qualified: 'alex.bell', turns: ['ringing', 'fading'] }]);
    expect(identity.landings).toEqual([{ region: 'market', rooms: ['stall'] }]);
    expect(identity.counters).toEqual([
      { name: 'madness', owner: null },
      { name: 'suspicion', owner: 'alex' },
    ]);
  });

  it('every unordered family is sorted by its identity', () => {
    const ids = identity.entities.map((e) => e.id);
    expect(ids).toEqual([...ids].sort());
    const clauseIds = identity.clauses.map((c) => c.id);
    expect(clauseIds).toEqual([...clauseIds].sort());
  });

  it('the stamp is the SHA-256 of the other fields in their emitted order', () => {
    const { stamp, ...content } = identity;
    expect(stamp).toBe(sha256Hex(JSON.stringify(content)));
    expect(stamp).toMatch(/^[0-9a-f]{64}$/);
  });

  it('`emitIdentity` is the last analysis pass, and `buildIdentity` over the finished IR reproduces the emitted manifest', () => {
    expect(ANALYSIS_PASSES[ANALYSIS_PASSES.length - 1].name).toBe('emitIdentity');
    const ir = compile(SOURCE()).ir;
    expect(buildIdentity(ir)).toEqual(ir.identity);
  });
});

describe('ADR-388 AC-7 (compiler half) — the stamp moves with structure and nothing else', () => {
  it('two compiles of one source give byte-identical manifests and stamps', () => {
    const a = identityOf(SOURCE());
    const b = identityOf(SOURCE());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.stamp).toBe(b.stamp);
  });

  it('a prose edit leaves the stamp unchanged', () => {
    expect(identityOf(SOURCE({ stallProse: 'A busy stall, loud with haggling.' })).stamp).toBe(identityOf(SOURCE()).stamp);
  });

  it('reordering two blocks leaves the stamp unchanged', () => {
    const reordered = identityOf(SOURCE({ blocks: [LAMP(LAMP_CLAUSES), ALLEY] }));
    expect(reordered.stamp).toBe(identityOf(SOURCE()).stamp);
  });

  it('a new exit changes the stamp', () => {
    const edited = identityOf(SOURCE({ stallExtraExit: '  north to the Alley' }));
    expect(edited.exits).toContainEqual({ room: 'stall', direction: 'north', destination: 'alley' });
    expect(edited.stamp).not.toBe(identityOf(SOURCE()).stamp);
  });

  it('a changed state list changes the stamp', () => {
    expect(identityOf(SOURCE({ lampStates: 'dull, bright, broken' })).stamp).not.toBe(identityOf(SOURCE()).stamp);
  });

  it('reordering chapters changes the stamp — their order is their meaning', () => {
    const reordered = identityOf(SOURCE({ chapterRows: [CHAPTER_ROWS[0], CHAPTER_ROWS[2], CHAPTER_ROWS[1]] }));
    expect(reordered.chapters).toEqual(['market', 'stall', 'alley']);
    expect(reordered.stamp).not.toBe(identityOf(SOURCE()).stamp);
  });

  it('renaming a counter changes the stamp', () => {
    expect(identityOf(SOURCE({ counterName: 'dread' })).stamp).not.toBe(identityOf(SOURCE()).stamp);
  });

  it('a new clause changes the stamp', () => {
    const edited = identityOf(SOURCE({ lampClauses: `${LAMP_CLAUSES}\n  on the player touching\n    phrase two\n  end on\n` }));
    expect(edited.clauses).toContainEqual({ id: 'lamp.on-touching-by-player', once: false });
    expect(edited.stamp).not.toBe(identityOf(SOURCE()).stamp);
  });
});
