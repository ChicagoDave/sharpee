/**
 * snippet-validation-id-mode.test.ts — ADR-333 D1a: a room whose descriptions
 * ride as ids (ADR-107) is validated and linted against the texts the
 * language provider registered, exactly as a literal-text room is.
 *
 * Owner context: engine story-load validation tests.
 */

import { describe, it, expect } from 'vitest';
import type { LanguageProvider } from '@sharpee/if-domain';
import { validateRoomSnippets, lintUnusedSnippetEntries, SnippetValidationError } from '../../src/snippet-validation';
import { WorldModel, RoomTrait, IdentityTrait, EntityType } from '@sharpee/world-model';
import type { SnippetMap } from '@sharpee/world-model';

function provider(map: Record<string, string>): LanguageProvider {
  return {
    languageCode: 'en-us',
    getMessage: (id: string) => map[id] ?? id,
    getTemplate: (id: string) => map[id],
  } as unknown as LanguageProvider;
}

function idModeRoom(world: WorldModel, snippets: SnippetMap, initialDescriptionId?: string) {
  const room = world.createEntity('Lab', EntityType.ROOM);
  room.add(new RoomTrait({ snippets, initialDescriptionId }));
  room.add(new IdentityTrait({ name: 'Lab', descriptionId: 'lab.description' }));
  return room;
}

describe('validateRoomSnippets in id mode (ADR-333 D1a)', () => {
  it('passes when every marker in the registered texts has an entry', () => {
    const world = new WorldModel();
    idModeRoom(world, { note: 'a cat glares' }, 'lab.initial-description');
    const lp = provider({
      'lab.description': 'Shelves{snippet:note}.',
      'lab.initial-description': 'First time{snippet:note}.',
    });
    expect(() => validateRoomSnippets(world, lp)).not.toThrow();
  });

  it('names the unbound marker it finds in a registered text', () => {
    const world = new WorldModel();
    idModeRoom(world, { note: 'a cat glares' }, 'lab.initial-description');
    const lp = provider({
      'lab.description': 'Shelves{snippet:note}.',
      'lab.initial-description': 'First time{snippet:lamp}.',
    });
    let caught: unknown;
    try {
      validateRoomSnippets(world, lp);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SnippetValidationError);
    expect((caught as SnippetValidationError).unbound).toEqual([{ room: 'Lab', marker: 'lamp' }]);
  });

  it('without a provider an id-mode room has no text to scan and passes', () => {
    const world = new WorldModel();
    idModeRoom(world, { note: 'a cat glares' });
    expect(() => validateRoomSnippets(world)).not.toThrow();
  });
});

describe('lintUnusedSnippetEntries in id mode (ADR-333 D1a)', () => {
  it('sees the markers in the registered texts, so a used entry is not reported', () => {
    const world = new WorldModel();
    idModeRoom(world, { note: 'a cat glares', lamp: 'a lamp burns' });
    const lp = provider({ 'lab.description': 'Shelves{snippet:note}.' });
    expect(lintUnusedSnippetEntries(world, lp)).toEqual([{ room: 'Lab', entry: 'lamp' }]);
  });
});
