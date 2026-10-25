/**
 * @file Pronoun context follows the command's roles (ADR-385 D7)
 * @description After a command, `it` (or the animate pronoun) is set from
 *   the direct object; only when there is none, from the indirect object,
 *   and then the instrument. A list sets `them` to every entity in
 *   `directObjects`. Entity references carry no turn number.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PronounContextManager } from '../src/pronoun-context';
import type { IValidatedCommand, IValidatedObjectReference } from '@sharpee/world-model';

/** A validated reference to a plain inanimate thing. */
const ref = (id: string, text: string): IValidatedObjectReference =>
  ({ entity: { id, getTrait: () => undefined } as unknown as IValidatedObjectReference['entity'], parsed: { text } });

const command = (parts: Partial<IValidatedCommand>): IValidatedCommand =>
  ({ parsed: { rawInput: '', tokens: [], structure: { verb: { tokens: [0], text: 'x', head: 'x' } }, pattern: 'VERB_ONLY', action: 'a' }, actionId: 'a', ...parts }) as IValidatedCommand;

describe('pronoun context follows the command roles (ADR-385 D7)', () => {
  let manager: PronounContextManager;
  const world = { getEntity: () => undefined };

  beforeEach(() => {
    manager = new PronounContextManager();
  });

  it('`it` is the direct object when there is one, whatever else the command names', () => {
    manager.updateFromCommand(command({ directObject: ref('door', 'door'), instrument: ref('key', 'key') }), world);
    expect(manager.resolve('it')![0]).toEqual({ entityId: 'door', text: 'door' });
  });

  it('`it` is the indirect object only when there is no direct object', () => {
    manager.updateFromCommand(command({ indirectObject: ref('box', 'box'), instrument: ref('key', 'key') }), world);
    expect(manager.resolve('it')![0].entityId).toBe('box');
  });

  it('`it` is the instrument only when there is nothing else', () => {
    manager.updateFromCommand(command({ instrument: ref('key', 'key') }), world);
    expect(manager.resolve('it')![0].entityId).toBe('key');
  });

  it('a list sets `them` to every entity in directObjects', () => {
    manager.updateFromCommand(command({ directObjects: [ref('sword', 'sword'), ref('lantern', 'lantern')] }), world);
    expect(manager.resolve('them')!.map((r) => r.entityId)).toEqual(['sword', 'lantern']);
  });

  it('an entity reference carries only the id and the text', () => {
    manager.registerEntity('lamp', 'the lamp', { getEntity: () => ({ get: () => undefined }) });
    expect(manager.resolve('it')).toEqual([{ entityId: 'lamp', text: 'the lamp' }]);
  });
});
