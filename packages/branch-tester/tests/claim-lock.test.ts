/**
 * claim-lock.test.ts — the lock on the claim-bits fixture against a REAL
 * game (ADR-367 D1, D2, D4, D5; AC-1, AC-2): the offer at a card, the set
 * proposed from the line and trimmed by the cone, the rendered block, the
 * fragment splice, the fresh fragment, and the pin. The story is compiled
 * by `@sharpee/chord`, loaded by `@sharpee/story-loader`, assembled by
 * `@sharpee/bootstrap`; every replayed command runs through the real
 * parser and engine. No stub of any owned dependency.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, compileClaims, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { freshFragmentWith, pinLockOnCard, proposeLock, spliceLockIntoFragment, type LockGame } from '../src/claims/claim-lock.js';
import { emptyTreeDocument, segmentTree, assembleTree, turnOfCard, type TreeDocument } from '../src/tree-document.js';
import { flattenTreeLines } from '../src/tree-walker.js';

const SEED = 1209;
const SOURCE = readFileSync(resolve(__dirname, 'fixtures/claims/claim-bits-fixture.story'), 'utf8');

function compileFixture(): StoryIR {
  const result = compile(SOURCE);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}
const IR = compileFixture();

async function loadGame(): Promise<LockGame> {
  const story = createStory(compileFixture(), { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileFixture(), { seed: SEED }) }) as unknown as LockGame;
}

/**
 * Main line: opening, boot, `read note` (turn 1), `north` (turn 2). A branch
 * at `read note`: `north` (turn 2), `south` (turn 3).
 */
function tree(): TreeDocument {
  return {
    ...emptyTreeDocument('claim-bits-fixture', SEED, 'mainline'),
    cards: [
      { id: 'card0000', type: 'opening' },
      { id: 'card0001', type: 'boot' },
      {
        id: 'card0002', type: 'turn', command: 'read note', continuation: 'contin00',
        branches: [{ id: 'branch01', cards: [{ id: 'card0010', type: 'turn', command: 'north' }, { id: 'card0011', type: 'turn', command: 'south' }] }],
      },
      { id: 'card0003', type: 'turn', command: 'north' },
    ],
  };
}

const compileCandidate = (block: string) => compileClaims(SOURCE, block, { claimsFile: 'claim-bits-fixture.claims.chord' });
const request = (line: string, extra: { turn?: number; fact?: string; name?: string; needs?: { rooms?: string[]; things?: string[]; verbs?: string[] } } = {}) =>
  proposeLock({ ir: IR, document: tree(), line, loadGame, compileCandidate, date: '2026-10-20', ...extra });

describe('the lines of the tree carry their prefix turn counts', () => {
  it('a branch from the first typed turn starts after one prefix turn', () => {
    const { lines } = flattenTreeLines(tree());
    expect(lines.map((line) => [line.id, line.prefixTurns])).toEqual([['mainline', 0], ['branch01', 1]]);
  });
});

describe('the offer (D1) — facts true at the card and not at boot', () => {
  it('after reading the note and walking north, the room, the flag and the fired clause are offered', async () => {
    const proposal = await request('mainline');
    expect(proposal.turn).toBe(2);
    expect(proposal.cardId).toBe('card0003');
    expect(proposal.line).toEqual({ id: 'mainline', label: 'opening-hall' });
    expect(proposal.offer.map((o) => o.sentence)).toEqual(['the player is in the Landing', 'the note is read', 'the note has been read']);
    expect(proposal.block).toBeUndefined();
  });

  it('at turn 1 the room has not changed, so only the note is offered', async () => {
    const proposal = await request('mainline', { turn: 1 });
    expect(proposal.offer.map((o) => o.sentence)).toEqual(['the note is read', 'the note has been read']);
  });

  it('every offered sentence compiles as a claim', async () => {
    const proposal = await request('mainline');
    for (const offer of proposal.offer) {
      const compiled = compileCandidate(`claims\n  claim x\n    ${offer.sentence}\nend claims\n`);
      expect(compiled.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    }
  });
});

describe('the set from the line (D2, D8) and the block (D4)', () => {
  it('a room claim: rooms entered, the note trimmed by the cone, the typed verb, no verb for a direction', async () => {
    const proposal = await request('mainline', { fact: 'the player is in the Landing' });
    expect(proposal.rooms).toEqual(['the Hall', 'the Landing']);
    expect(proposal.trimmed).toEqual(['the note']);
    expect(proposal.things).toEqual([]);
    expect(proposal.verbs).toEqual(['read']);
    expect(proposal.name).toBe('the player is in the Landing');
    expect(proposal.block).toBe(
      '  claim the player is in the Landing\n    the player is in the Landing\n    needs rooms: the Hall, the Landing\n    needs verbs: read\n',
    );
  });

  it('a flag claim on the note keeps the note, since the predicate names it', async () => {
    const proposal = await request('mainline', { turn: 1, fact: 'the note is read', name: 'the note gets read' });
    expect(proposal.rooms).toEqual(['the Hall']);
    expect(proposal.things).toEqual(['the note']);
    expect(proposal.trimmed).toEqual([]);
    expect(proposal.kept).toEqual([{ thing: 'the note', reason: "the claim's predicate" }]);
    expect(proposal.block).toContain('  claim the note gets read\n    the note is read\n');
  });

  it('a branch line reads its prefix too: the note was read before the fork', async () => {
    const proposal = await request('branch01', { turn: 3, fact: 'the player is in the Hall' });
    expect(proposal.line).toEqual({ id: 'branch01', label: 'hall · north' });
    expect(proposal.cardId).toBe('card0011');
    expect(proposal.rooms).toEqual(['the Hall', 'the Landing']);
    expect(proposal.verbs).toEqual(['read']);
  });

  it('a line is also found by its first typed command when that names one line', async () => {
    const proposal = await request('north', { turn: 2 });
    expect(proposal.line.id).toBe('branch01');
  });
});

describe('what the lock refuses, by name', () => {
  it('a line that does not exist, listing the lines', async () => {
    await expect(request('nowhere0')).rejects.toThrow(/no line "nowhere0"[\s\S]*mainline  read note[\s\S]*branch01  north/);
  });

  it('a turn off the line', async () => {
    await expect(request('branch01', { turn: 1 })).rejects.toThrow(/runs from turn 2 to turn 3; turn 1 is not on it/);
    await expect(request('mainline', { turn: 3 })).rejects.toThrow(/turn 3 is not on it/);
  });

  it('a fact that does not compile, in the compiler\'s words', async () => {
    await expect(request('mainline', { fact: 'the note is purple' })).rejects.toThrow(/does not compile as a claim: .*never `purple`/);
  });

  it('a fact that is false at the card — nothing rendered', async () => {
    await expect(request('mainline', { turn: 1, fact: 'the player is in the Landing' })).rejects.toThrow(/does not hold at turn 1 of line mainline; nothing written/);
  });
});

describe('the writer (D4) and the pin (D5)', () => {
  const BLOCK = '  claim the player is in the Landing\n    the player is in the Landing\n    needs rooms: the Hall, the Landing\n    needs verbs: read\n';

  it('splices before `end claims` after one blank line, and moves no other byte', () => {
    const fragment = '## header\n\nclaims\n  needs rooms: the Hall\n\n  claim a\n    the note is read\nend claims\n';
    const spliced = spliceLockIntoFragment(fragment, BLOCK);
    expect(spliced).toBe('## header\n\nclaims\n  needs rooms: the Hall\n\n  claim a\n    the note is read\n\n' + BLOCK + 'end claims\n');
    expect(spliced.startsWith(fragment.slice(0, fragment.indexOf('end claims')))).toBe(true);
    const compiled = compileCandidate(spliced);
    expect(compiled.ok).toBe(true);
    expect(compiled.claims?.claims.map((c) => c.name)).toEqual(['a', 'the player is in the Landing']);
  });

  it('refuses a fragment with no `end claims`', () => {
    expect(() => spliceLockIntoFragment('claims\n', BLOCK)).toThrow(/no `end claims` line/);
  });

  it('a fresh fragment compiles with its one claim and an empty shared set', () => {
    const fragment = freshFragmentWith('Claim Bits Fixture', BLOCK);
    const compiled = compileCandidate(fragment);
    expect(compiled.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(compiled.claims?.rooms).toEqual([]);
    expect(compiled.claims?.claims[0].needs?.rooms).toEqual(['hall', 'landing']);
    expect(fragment.startsWith("## Claim Bits Fixture's claims")).toBe(true);
  });

  it('pins the name on the card once, and the tree writes and reads it back', () => {
    const document = tree();
    expect(pinLockOnCard(document, 'card0003', 'the player is in the Landing')).toBe(true);
    expect(pinLockOnCard(document, 'card0003', 'the player is in the Landing')).toBe(false);
    expect(document.cards[3].locks).toEqual(['the player is in the Landing']);
    const files = segmentTree(document);
    expect(files['contin00.json']).toContain('"locks": [\n        "the player is in the Landing"\n      ]');
    const read = assembleTree(files);
    expect(read.status).toBe('ok');
    if (read.status === 'ok') expect(read.document.cards[3].locks).toEqual(['the player is in the Landing']);
    expect(() => pinLockOnCard(document, 'nocard00', 'x')).toThrow(/no card nocard00/);
  });
});

describe('turnOfCard — a card\'s turn as a player counts it (ADR-367)', () => {
  it('counts typed turns from the root through the card on its own line; the boot look and the opening have none', () => {
    const document = tree();
    expect(turnOfCard(document, 'card0002')).toBe(1);
    expect(turnOfCard(document, 'card0003')).toBe(2);
    expect(turnOfCard(document, 'card0010')).toBe(2);
    expect(turnOfCard(document, 'card0011')).toBe(3);
    expect(turnOfCard(document, 'card0001')).toBeUndefined();
    expect(turnOfCard(document, 'card0000')).toBeUndefined();
    expect(turnOfCard(document, 'nowhere0')).toBeUndefined();
  });
});

describe('the author\'s lists (D7): `needs` replaces the proposal\'s lists, written as given', () => {
  it('writes the given rooms, things and verbs, names what the cone would trim, and refuses a thing the story lacks', async () => {
    const proposal = await request('mainline', { fact: 'the player is in the Landing', needs: { rooms: ['the Hall', 'the Landing'], things: ['the note'], verbs: ['read', 'look'] } });
    expect(proposal.rooms).toEqual(['the Hall', 'the Landing']);
    expect(proposal.things).toEqual(['the note']);
    expect(proposal.trimmed).toEqual(['the note']);
    expect(proposal.verbs).toEqual(['read', 'look']);
    expect(proposal.block).toBe('  claim the player is in the Landing\n    the player is in the Landing\n    needs rooms: the Hall, the Landing\n    needs things: the note\n    needs verbs: read, look\n');
    await expect(request('mainline', { fact: 'the player is in the Landing', needs: { things: ['the unicorn'] } } as never)).rejects.toThrow(/does not compile as a claim/);
  });
});
