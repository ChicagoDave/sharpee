/**
 * description-id.test.ts — ADR-107 id mode through ADR-333 D1a: a description
 * id resolves to the RAW registered template (braced words untouched), and the
 * room handler stamps the blocks it realizes from an id with that id.
 *
 * Owner context: engine prose pipeline tests.
 */

import { describe, it, expect } from 'vitest';
import type { LanguageProvider } from '@sharpee/if-domain';
import { resolveDescriptionId, stampDescriptionSource } from '../../../src/prose-pipeline/handlers/description-id';
import { handleRoomDescription } from '../../../src/prose-pipeline/handlers/room';
import { makeEvent, makeProvider, makeContext } from '../test-helpers';

/** A provider whose substituted message differs from its raw template. */
function templateProvider(map: Record<string, string>): LanguageProvider {
  return {
    languageCode: 'en-us',
    getMessage: (id: string) => (map[id] ? map[id].replace(/\{trapdoor\}/g, 'MANGLED') : id),
    getTemplate: (id: string) => map[id],
  } as unknown as LanguageProvider;
}

describe('resolveDescriptionId (ADR-333 D1a)', () => {
  it('returns the raw template, leaving a braced word exactly as the author wrote it', () => {
    const lp = templateProvider({ 'cellar.description': 'A cellar. {trapdoor}' });
    expect(resolveDescriptionId(lp, 'cellar.description')).toBe('A cellar. {trapdoor}');
  });

  it('falls back to the substituted message on a provider without getTemplate', () => {
    const lp = makeProvider({ 'cellar.description': 'A plain cellar.' });
    expect(resolveDescriptionId(lp, 'cellar.description')).toBe('A plain cellar.');
  });

  it('returns undefined for an absent id, an unregistered id, or no provider', () => {
    const lp = templateProvider({});
    expect(resolveDescriptionId(lp, undefined)).toBeUndefined();
    expect(resolveDescriptionId(lp, 'nope.description')).toBeUndefined();
    expect(resolveDescriptionId(makeProvider({}), 'nope.description')).toBeUndefined();
    expect(resolveDescriptionId(undefined, 'cellar.description')).toBeUndefined();
  });
});

describe('stampDescriptionSource', () => {
  it('rewrites every block\'s source to the description id, and is a no-op without one', () => {
    const blocks = [
      { key: 'room.description', content: ['a'], source: { messageId: 'if.room.description_body' } },
      { key: 'room.description', content: ['b'] },
    ];
    expect(stampDescriptionSource(blocks, 'cellar.description').map((b) => b.source)).toEqual([
      { messageId: 'cellar.description' },
      { messageId: 'cellar.description' },
    ]);
    expect(stampDescriptionSource(blocks, undefined)).toBe(blocks);
  });
});

describe('handleRoomDescription in id mode (ADR-333 D1a)', () => {
  it('realizes the raw template and stamps the description block with the room\'s id', () => {
    const lp = templateProvider({ 'cellar.description': 'A cellar. {trapdoor}' });
    const event = makeEvent('if.event.room.description', {
      verbose: true,
      room: { id: 'cellar', name: 'Cellar', descriptionId: 'cellar.description', description: 'stale literal' },
    });

    const blocks = handleRoomDescription(event, makeContext(lp));

    expect(blocks).toHaveLength(2);
    expect(blocks[0].key).toBe('room.name');
    expect(blocks[0].source).toBeUndefined();
    expect(blocks[1].content).toEqual(['A cellar. {trapdoor}']);
    expect(blocks[1].source).toEqual({ messageId: 'cellar.description' });
  });

  it('leaves a literal-text description unstamped', () => {
    const event = makeEvent('if.event.room.description', {
      verbose: false,
      roomDescription: 'A dark cave.',
    });
    const blocks = handleRoomDescription(event, makeContext(makeProvider({})));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toBeUndefined();
  });
});
