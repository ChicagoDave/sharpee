/**
 * messages.test.ts — `buildMessageCatalog` (ADR-333 D4a) against the REAL
 * alias map and the REAL language pack: every alias appears once with the
 * pack's own template, and the payload satisfies the wire guard.
 */
import { describe, it, expect } from 'vitest';
import { isMessageCatalog, MESSAGE_CATALOG_SCHEMA_VERSION } from '@sharpee/ide-protocol';
import { MESSAGE_ALIAS_TO_ACTION_ID } from '@sharpee/story-loader';
import { buildMessageCatalog } from './messages.js';

// The pack is required the way the command requires it (a static ESM import
// of the CJS pack under vitest's interop recurses on construction).
const { LanguageProvider } = require('@sharpee/lang-en-us') as {
  LanguageProvider: new () => { languageCode: string; getTemplate(id: string): string | undefined };
};

describe('buildMessageCatalog', () => {
  const catalog = buildMessageCatalog();

  it('is a MessageCatalog at the current schema version', () => {
    expect(isMessageCatalog(catalog)).toBe(true);
    expect(catalog.schemaVersion).toBe(MESSAGE_CATALOG_SCHEMA_VERSION);
    expect(catalog.locale).toBe(new LanguageProvider().languageCode);
  });

  it('carries every alias of the ADR-255 map exactly once, with its id', () => {
    const aliases = catalog.messages.map((m) => m.alias);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(aliases.sort()).toEqual(Object.keys(MESSAGE_ALIAS_TO_ACTION_ID).sort());
    for (const m of catalog.messages) {
      expect(MESSAGE_ALIAS_TO_ACTION_ID[m.alias]).toBe(m.id);
    }
  });

  it("each template is the pack's registered template for the id — taking-taken is the pack's Taken.", () => {
    const pack = new LanguageProvider();
    for (const m of catalog.messages) {
      expect(m.template).toBe(pack.getTemplate(m.id));
    }
    const taken = catalog.messages.find((m) => m.alias === 'taking-taken');
    expect(taken).toEqual({ id: 'if.action.taking.taken', alias: 'taking-taken', template: 'Taken.' });
  });

  it('is sorted by id', () => {
    const ids = catalog.messages.map((m) => m.id);
    expect(ids).toEqual([...ids].sort());
  });
});
