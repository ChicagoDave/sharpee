/**
 * lock.test.ts — the lock gesture's two seams (ADR-367 D7): the argument
 * list each step hands the host, and the decode of the CLI's one object
 * through the wire's own guard.
 *
 * Derived from the Behavior Statement: no fact asks for the offer; a fact
 * alone asks for the proposal and writes nothing; a fact with lists writes
 * the fragment only; a name is passed only when it differs from the fact;
 * anything the CLI prints that is not one of the four shapes decodes as an
 * error naming what arrived.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import { decodeLockResult, lockArgumentsOf } from '../src/lock';

describe('lockArgumentsOf — one spelling of the CLI\'s flags', () => {
  it('the offer: line, turn, --json, nothing else', () => {
    expect(lockArgumentsOf({ line: 'mainline', turn: 2 })).toEqual(['claim', 'mainline', '--at', '2', '--json']);
  });

  it('the proposal: the fact after the line, --propose, and --name only when it differs', () => {
    expect(lockArgumentsOf({ line: 'mainline', turn: 2, fact: 'the player is in the Landing' }))
      .toEqual(['claim', 'mainline', 'the player is in the Landing', '--at', '2', '--json', '--propose']);
    expect(lockArgumentsOf({ line: 'mainline', turn: 2, fact: 'f', name: 'f' })).not.toContain('--name');
    expect(lockArgumentsOf({ line: 'mainline', turn: 2, fact: 'f', name: 'the landing is reached' })).toContain('--name');
  });

  it('the write: the three lists comma-joined and --fragment-only, never --propose', () => {
    const args = lockArgumentsOf({
      line: 'branch01', turn: 3, fact: 'the note is read', name: 'the note gets read',
      needs: { rooms: ['the Hall', 'the Landing'], things: [], verbs: ['read'] },
    });
    expect(args).toEqual([
      'claim', 'branch01', 'the note is read', '--at', '3', '--json', '--name', 'the note gets read',
      '--rooms', 'the Hall, the Landing', '--things', '', '--verbs', 'read', '--fragment-only',
    ]);
    expect(args).not.toContain('--propose');
  });
});

describe('decodeLockResult — the CLI\'s one object through the guard', () => {
  it('decodes each of the four shapes, skipping stray lines before the object', () => {
    const offer = { kind: 'offer', line: { id: 'mainline', label: 'opening-hall' }, turn: 2, cardId: 'card0003', offer: ['the player is in the Landing'] };
    expect(decodeLockResult(`${JSON.stringify(offer)}\n`)).toEqual(offer);
    const error = { kind: 'error', message: 'no line "nowhere0"' };
    expect(decodeLockResult(`warning: something\n${JSON.stringify(error)}`)).toEqual(error);
  });

  it('anything else is an error naming what arrived', () => {
    expect(decodeLockResult('')).toEqual({ kind: 'error', message: 'the lock command printed nothing' });
    expect(decodeLockResult('claim: the tree is malformed')).toEqual({ kind: 'error', message: 'claim: the tree is malformed' });
    expect(decodeLockResult('{ not json')).toMatchObject({ kind: 'error' });
    const unrecognised = decodeLockResult('{"kind":"offer","turn":2}');
    expect(unrecognised.kind).toBe('error');
    if (unrecognised.kind === 'error') expect(unrecognised.message).toContain('does not recognise');
  });
});
